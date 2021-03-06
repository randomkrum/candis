import axios     from 'axios'
import shortid   from 'shortid'

import config    from '../config'

import Component from '../constant/Component'
import Pipeline  from '../constant/Pipeline'
import modal     from '../action/ModalAction'
import { stage } from '../action/DocumentProcessorAction'

const Compartments = 
[
  {
       name: 'Data',
       icon: `${config.routes.icons}/database.png`,
    tooltip: 'Tools for Source Selection',
      tools: [
        {
             name: 'Create',
             icon: `${config.routes.icons}/edit.png`,
          tooltip: 'Create a new DataSet',
          onClick: (dispatch) => {
            var   name    = null
            var   data    = null
            const dialog  = 
            {
              component: Component.FileEditor,
                  title: 'Create',
                   size: 'lg',
                buttons: 
                [
                  {
                        label: "Ok",
                    className: "btn-primary",
                      onClick: ( ) =>
                      {
                        var action = modal.hide()

                        dispatch(action)
                      } 
                  },
                  {
                        label: "Cancel",
                      onClick: ( ) => 
                      {
                        var action = modal.hide()

                        dispatch(action)
                      }
                  }
                ],
                  props: 
                  {
                    classNames: { root: ['no-background', 'no-border', 'no-shadow', 'no-margin'] },
                      onChange: 
                      {
                        name: (changed) => { name = changed },
                        data: (changed) => { data = changed }
                      }
                  }
            }
            const action  = modal.show(dialog)

            dispatch(action)
          }
        },
        {
             name: 'File',
             icon: `${config.routes.icons}/document.png`,
          tooltip: 'Load a CDATA/CSV file',
          onClick: (dispatch) => {
            const ID      = shortid.generate()
            const meta    = 
            {
                   ID: ID,
                 name: 'File',
                 code: 'dat.fil',
                 icon: `${config.routes.icons}/document.png`,
              onClick: (dispatch) =>
              {
                var   output  = null
                const dialog  = 
                {
                  component: Component.FileViewer,
                      title: 'File',
                       size: 'lg',
                    buttons: 
                    [
                      {
                            label: "Select",
                        className: "btn-primary",
                          onClick: ( ) =>
                          {
                            var action;
                            var update = 
                            {
                               value: output,
                               label: `${output.path}/${output.name}`,
                              status: Pipeline.Status.RESOURCE_READY
                            }

                            action     = stage.update(ID, update)

                            dispatch(action)

                            action     = modal.hide()

                            dispatch(action)
                          } 
                      },
                      {
                            label: "Cancel",
                          onClick: ( ) => 
                          {
                            var action = modal.hide()

                            dispatch(action)
                          }
                      }
                    ], // end dialog.buttons
                      props: 
                      {
                        classNames: { root: ['no-background', 'no-border', 'no-shadow', 'no-margin'] },
                          onSelect: (selected) => { output = selected }
                      } // end dialog.props
                } // end dialog
                const action  = modal.show(dialog)

                dispatch(action)
              } // end meta.onClick
            } // end meta

            const action = stage.set(meta)

            dispatch(action)
          }
        },
        {
             name: 'Download',
             icon: `${config.routes.icons}/cloud-computing.png`,
          tooltip: 'Download a DataSet from a remote host',
          onClick: (dispatch) => {
            bootbox.alert({
              message: '<div class="font-bold">To be implemented</div>',
                 size: "small",
              animate: false,
              buttons: { ok: { label: "Ok", className: "btn-sm btn-primary" } }
            })
          }
        }
      ]
  },
  {
       name: 'Visualize',
       icon: `${config.routes.icons}/pie-chart.png`,
    tooltip: 'Tools for Data Visualization'
  },
  {
       name: 'Preprocess',
       icon: `${config.routes.icons}/gears.png`,
    tooltip: 'Tools for Data Preprocessing',
      tools: [
        {
             name: 'k-Fold Cross-Validation',
             icon: `${config.routes.icons}/cross-validation.png`,
          tooltip: 'Split a dataset into k folds',
          onClick: (dispatch) => {
            const ID     = shortid.generate()
            const meta   = 
            {
                   ID: ID,
                 name: 'k-Fold Cross-Validation',
                 icon: `${config.routes.icons}/cross-validation.png`,
                 code: 'prp.kcv',
              onClick: (dispatch) =>
              {
                bootbox.prompt({
                      title: '<span class="font-bold">Number of Folds</span>',
                  inputType: 'number',
                  className: '#input-k-fold',
                    buttons:
                    {
                       cancel: { label: "Cancel", className: "btn-sm btn-primary" },
                      confirm: { label: "Ok",     className: "btn-sm btn-success" }
                    },
                       size: "small",
                    animate: false,
                   callback: (folds) => {
                     if ( folds !== null ) {
                        const update = { value: folds, label: `${folds} folds`, status: Pipeline.Status.RESOURCE_READY }
                        const action = stage.update(ID, update)

                        dispatch(action)
                     }
                   }
                })

                // HACK
                $(document).ready(() => {
                  $('#input-k-fold').attr('minlength', 0);
                })
              } // end meta.onClick
            } // end meta

            const action = stage.set(meta)

            dispatch(action)
          }
        }
      ],
    fetcher: ( ) =>
    {
      return axios.get(config.routes.api.preprocess.methods).then(({ data }) => {
        const response    = data

        if ( response.status == "success" ) {
          const data      = response.data

          const tools     = data.map((method) => {
            const tool    = 
            {
                 name: method.name,
              onClick: (dispatch) => {
                  const options = method.methods.map((option) => 
                  {
                    return { label: option.name, value: JSON.stringify(option) }
                  })

                  const ID      = shortid.generate()
                  const meta    = {
                         ID: ID,
                       code: method.code,
                       name: method.name,
                    onClick: (dispatch) => {
                      var   option = null
                      const dialog =
                      {
                        component: Component.SelectViewer,
                            title: method.name,
                          buttons: 
                          [
                            {
                                  label: "Select",
                              className: "btn-primary",
                                onClick: ( ) =>
                                {
                                      method = JSON.parse(option.value)
                                  var update = 
                                  {
                                     label: method.name,
                                     value: method.value,
                                    status: Pipeline.Status.RESOURCE_READY
                                  }

                                  var action = stage.update(ID, update)

                                  dispatch(action)

                                  action     = modal.hide()

                                  dispatch(action)
                                } 
                            },
                            {
                                  label: "Cancel",
                                onClick: ( ) => 
                                {
                                  var action = modal.hide()

                                  dispatch(action)
                                }
                            }
                          ], // end dialog.buttons
                            props: 
                            {
                              classNames: { root: ['no-background', 'no-border', 'no-shadow', 'no-margin'] },
                                 options: options,
                                onChange: (changed) => { option = changed }
                            } // end dialog.props
                      }
                      const action = modal.show(dialog)

                      dispatch(action)
                    } // end meta.onClick
                  } // end meta

                  const action = stage.set(meta)

                  dispatch(action)
              } // end tool.onClick
            } // end tool

            return tool
          })

          return tools
        } else {
          return [ ]
        }
      })
    }
  },
  {
       name: 'Feature Selection',
       icon: `${config.routes.icons}/column-select.png`,
    tooltip: 'List of Feature Selection Methods',
    fetcher: ( ) =>
    {
      return axios.get(config.routes.api.featselect.methods).then(({ data }) => {
        const response = data
        var   tools    = [ ]

        if ( response.status == "success" ) {
          const data   = response.data
          tools        = data.map((method) => {
            const desc = method.desc
            const tool = 
            {
                     name: method.name,
                     icon: method.icon,
              description: desc.short,
                  onClick: (dispatch) =>
                  {
                    const ID      = shortid.generate()
                    const stage   = 
                    {
                           ID: ID,
                         name: method.name,
                         code: method.code,
                       status: "READY",
                      onClick: (dispatch) =>
                      {
                        const title    = 
                        `
                        <div class="font-bold">
                          ${method.name}
                        </div>
                        `
                        ,     detail   = desc.long || desc.short
                        ,     message  = 
                        ` 
                        <div class="text-justify">
                          ${detail.replace(/\n/g, '<br/>')}
                        </div>
                        `

                        const dialog   = bootbox.dialog({
                            title: title,
                          message: message,
                          buttons: { ok: { label: "Ok"} },
                             size: 'large',
                          animate: false
                        })

                         dialog.init(() => {
                          setTimeout(() => {
                            var $element = dialog.find('.bootbox-body');

                            MathJax.Hub.Queue(["Typeset", MathJax.Hub, $element[0]]);
                          }, 500)
                        })
                      } // end meta.onClick
                    } // end meta

                    const action = setNode(stage)
                    
                    dispatch(action)
                  }
            }

            return tool
          })
        }

        return tools
      })
    }
  },
  {
       name: 'Model',
       icon: `${config.routes.icons}/network.png`,
    tooltip: 'List of Models',
    fetcher: ( ) => 
    {
      return axios.get(config.routes.api.model.methods).then(({ data }) => {
        const response = data
        var   tools    = [ ]

        if ( response.status == "success" ) {
          const data   = response.data
          tools        = data.map((method) => {
            const desc = method.desc
            const tool = 
            {
                     name: method.name,
                  tooltip: method.type,
                     icon: method.icon,
              description: desc.short || method.type,
                  onClick: (dispatch) =>
                  {
                    // TODO: The following snippet requires a component - LaTeXReader
                    const ID      = shortid.generate()
                    const stage   = 
                    {
                           ID: ID,
                         name: method.name,
                         code: method.code,
                       status: "READY",
                      onClick: (dispatch) =>
                      {
                        const title    = 
                        `
                        <div class="font-bold">
                          ${method.name}
                        </div>
                        `
                        ,     detail   = desc.long || desc.short || method.type
                        ,     message  = 
                        ` 
                        <div class="text-justify">
                          ${detail.replace(/\n/g, '<br/>')}
                        </div>
                        `

                        const dialog   = bootbox.dialog({
                            title: title,
                          message: message,
                          buttons: { ok: { label: "Ok"} },
                             size: 'large',
                          animate: false
                        })

                         dialog.init(() => {
                          setTimeout(() => {
                            var $element = dialog.find('.bootbox-body');

                            MathJax.Hub.Queue(["Typeset", MathJax.Hub, $element[0]]);
                          }, 500)
                        })
                      } // end meta.onClick
                    } // end stage

                    const action = setNode(stage)
                    
                    dispatch(action)
                  }
            }

            return tool
          })
        }

        return tools
      })
    }
  },
  {
       name: 'Evaluate',
       icon: `${config.routes.icons}/clipboard.png`,
    tooltip: 'Tools for Model Evaluation',
      tools: [
        {
             name: 'Predict',
          tooltip: 'Perform a prediction',
          onClick: (dispatch) => {
            bootbox.alert({
              message: '<div class="font-bold">To be implemented</div>',
                 size: "small",
              animate: false,
              buttons: { ok: { label: "Ok", className: "btn-sm btn-primary" } }
            })
          }
        }
      ]
  }
]

export default Compartments
