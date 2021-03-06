# importsm - standard imports
import os
import re
import json

# imports - third-party imports
import addict
import numpy  as np
import pandas as pd, arff
from rpy2.robjects.packages import importr
from rpy2                   import robjects

# imports - module imports
from candis.config   import CONFIG
from candis.resource import R
from candis.util     import assign_if_none
from candis.ios      import json as JSON

ATTRIBUTE_TYPES = JSON.read(os.path.join(R.Path.DATA, 'attribute-types.json'))

def get_attribute_pattern():
    wrapper     = '({regex})?'
    regex       = '|'.join([attt['tag'] for attt in ATTRIBUTE_TYPES])

    pattern     = re.compile(wrapper.format(regex = regex))

    return pattern

ATTRIBUTE_PATTERN = get_attribute_pattern()

def get_attribute_type(attr, data):
    kind          = None
    dtype         = data.dtype
    for attt in ATTRIBUTE_TYPES:
        if attt['tag'] in attr:
            kind  = attt['name']

    if not kind:
        # TODO: check attribute type using data provided
        if dtype is np.dtype('O'):
            kind  = 'nominal'
        if np.issubdtype(dtype, np.number):
            kind  = 'numeric'

    return kind

def sanitize_attribute(attr):
    name = re.sub(ATTRIBUTE_PATTERN, '', attr)
    name = name.strip()

    return name

def get_attribute_metadata(attr, data):
    kind = get_attribute_type(attr, data)
    name = sanitize_attribute(attr)

    meta = addict.Dict()
    meta.type = kind
    meta.name = name

    return meta

class CData(object):
    CONFIG = CONFIG.Pipeline.Preprocess

    def load(path, delimiter = ','):
        # NOTE - Let pandas check for file exists.
        data         = pd.read_csv(path, sep = delimiter)

        abspath      = os.path.abspath(path)
        head, tail   = os.path.split(abspath)

        columns      = list(data.columns)
        cclass       = [col for col in columns if '!class' in col]

        if len(cclass) == 0:
            raise ValueError('No class attribute found.')
        if len(cclass) != 1:
            raise ValueError('More than one class attribute found.')

        cclass       = cclass[0]

        # NOTE - Lets normalize paths.
        for column in columns:
            if any(tag in column for tag in ('!file', '!cel')):
                paths = data[column]

                for i, p in enumerate(paths):
                    path     = paths[i]

                    if not os.path.isabs(p):
                        path = os.path.normpath(os.path.join(head, p))

                    if not os.path.exists(path) and not os.path.isfile(path):
                        raise ValueError('{path} is not a valid file.'.format(path = path))

                    paths[i] = path


        cdat         = CData()
        cdat.data    = data
        cdat.clss    = cdat.data[cclass]
        cdat.iclss   = columns.index(cclass)

        return cdat

    def toARFF(self, path, express_config = { }, verbose = False):
        # NOTE - This is assuming a single !cel input vector only.
        for column in self.data.columns:
            if any(tag in column for tag in ('!cel')):
                paths = list(self.data[column])

                break

        if not paths:
            raise ValueError('No valid DNA microarray found.')
        else:
            head, tail = os.path.split(path)

            importr('affy')

            robj = robjects.r('read.affybatch')
            cels = robj(*paths)

            para = CData.CONFIG
            para.update(express_config)

            robj = robjects.r('expresso')
            eset = robj(cels,
              normalize_method = para.NORMALIZATION,
              bgcorrect_method = para.BACKGROUND_CORRECTION,
              pmcorrect_method = para.PHENOTYPE_MICROARRAY_CORRECTION,
                summary_method = para.SUMMARY,
                       verbose = verbose
            )

            name = os.path.join(head, '.tmp_eset')
            robj = robjects.r('write.exprs')
            robj(eset, file = name)
              
            eset = pd.read_csv(name, sep = '\t')
            AIDs = eset.ix[:, 0] # Affymetrix IDs
            data = eset.ix[:,1:].T

            meta = addict.Dict()
            meta.relation    = 'affy'
            attrs            = [(ID, 'NUMERIC') for ID in AIDs]

            for column in self.data.columns:
                attr         = get_attribute_metadata(column, self.data[column])
                if not attr.type in ('file', 'cel', 'class'):

                    if attr.type is 'nominal':
                        vals = list(self.data[column].unique())
                        form = [(attr.name, vals)]
                    
                    if attr.type is 'numeric':
                        form = [(attr.name, 'NUMERIC')]
                    
                    attrs   += form
                    data     = data.assign(**{ attr.name: self.data[column].values })


            cvals            = list(self.clss.unique())

            attrs           += [('CLASS', cvals)]
            data             = data.assign(label = self.clss.values)

            meta.attributes  = attrs
            meta.data        = list(data.values)

            with open(path, mode = 'w') as f:
                arff.dump(meta, f)

            os.remove(name)

    def to_dict(self):
        data       = self.data.copy()

        meta       = addict.Dict()
        meta.attrs = list()
        for column in data.columns:
            attr   = get_attribute_metadata(column, data[column])
            data   = data.rename(columns = { column: attr.name })
            meta.attrs.append(attr)

        records    = json.loads(data.to_json(orient = 'records'))
        meta.data  = records

        return meta

    def __repr__(self):
        string = self.data.to_string()

        return string