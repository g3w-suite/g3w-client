const BasePluginService = require('../service');
const {base, inherit} = g3wsdk.core.utils;

function EditingService() {
  base(this);
  this.pluginName = 'editing';
  //subscribers editing handler
  //set properties used by varius
  this.config =  {
    tools: {
      add: 'addfeature',
      update: {
        attributes: 'editattributes'
      },
      delete: 'deletefeature'
    }
  };

  this.subscribersHandlers = {
    addfeature: properties =>feature => Object.keys(properties).forEach(property => feature.set(property, properties[property])),
    savedfeature: ({toolbox, qgis_layer_id}={}) => ()=> {
      this.commitChanges(qgis_layer_id, {toolbox})
    },
    cancelform: qgis_layer_id => () => this.stopEditing(qgis_layer_id)
  };
  this.run = async function(message={}){
    const {qgis_layer_id, add, update} = message;
    // open Panel
    this.dependencyApi.showPanel({
      toolboxes: [qgis_layer_id]
    });
    if (add) {
      const { geometry, properties} = add;
      await this.addFeature(qgis_layer_id, {
        geometry,
        properties
      });
    } else if (update){

    }
    // always subscribe cancelform
    this.dependencyApi.subscribe('cancelform', this.subscribersHandlers.cancelform(qgis_layer_id));
  };

  //add function
  this.add = async function(qgis_layer_id, options={}){
    const {geometry, properties} = options;
    const feature = geometry && this.dependencyApi.addNewFeature(qgis_layer_id, {
      geometry,
      properties
    });
    options.feature = feature;
    options.tools =  [feature ? this.config.tools.update.attributes : this.config.tools.add];
    options.action = 'add';
    const toolbox = await this.startEditing(qgis_layer_id, options);
    if (!feature) {
      // if no feature meaning no geometry is set to message
      this.dependencyApi.subscribe('addfeature', this.subscribersHandlers.addfeature(properties));
      this.dependencyApi.subscribe('savedfeature', this.subscribersHandlers.savedfeature({toolbox, qgis_layer_id}));
    } else
      this.commitChanges(qgis_layer_id, {
        toolbox
      })
  };


  this.update = function(){};


  this.delete = function(){};


  this.startEditing = async function(qgis_layer_id, options={}) {
    const {action= 'add', feature, tools} = options;
    const filter = {};
    switch (action) {
      case 'add':
        filter.nofeatures = true;
        break;
      case 'update':
        filter.field = Object.entries(feature).reduce((accumulator, [field, value]) =>{
          const filterString =  `${field}|eq|${value}`;
          return accumulator ? `${accumulator}|and,${filterString}` : filterString;
        }, '');
        break;
    }
    const toolbox = await this.dependencyApi.startEditing(qgis_layer_id, {
      tools,
      feature,
      startstopediting: true, // set ednabel disable editing
      filter
    });
    return toolbox;
  };


  this.stopEditing = function(qgis_layer_id) {
    this.dependencyApi.stopEditing(qgis_layer_id)
      .then(()=> {
        this.dependencyApi.resetDefault();
        this.dependencyApi.hidePanel();
      })
  };

  this.commitChanges = function(qgis_layer_id, options={}){
    const {toolbox} = options;
    this.dependencyApi.commitChanges({
      toolbox,
      modal: false
    }).then(()=> this.stopEditing(qgis_layer_id))
  };

  this.clear = function(){
    this.dependencyApi.resetDefault();
  }
}

inherit(EditingService, BasePluginService);

module.exports = new EditingService();



