const BasePluginService = require('../service');
const {base, inherit} = g3wsdk.core.utils;

function EditingService() {
  base(this);
  this.pluginName = 'editing';

  this.subscribevents = [];
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

  // METHODS CALLD FROM EACH ACTION METHOD

  // run beafore each action
  this.startAction = async function({qgis_layer_id}){
    this.dependencyApi.showPanel({
      toolboxes: [qgis_layer_id]
    });
  };

  //run after each action
  this.stopAction = async function(){
    this.resetSubscribeEvents()
  };
  ////

  this.subscribersHandlers = {
    addfeature: ({properties}={}) => feature => Object.keys(properties).forEach(property => feature.set(property, properties[property])),
    savedfeature: ({toolbox, qgis_layer_id}={}) => ()=> {
      this.commitChanges(qgis_layer_id, {toolbox})
    },
    cancelform: ({qgis_layer_id}) => () => this.stopEditing(qgis_layer_id),
    closeeditingpanel: ()=> () => this.stopAction()
  };

  // method to add subscribe refenrence
  this.addSubscribeEvents = function(event, options={}){
    const handler = this.subscribersHandlers[event](options);
    this.dependencyApi.subscribe(event, handler);
    this.subscribevents.push({
      event,
      handler
    })
  };

  this.resetSubscribeEvents = function(){
    this.subscribevents.forEach(({event, handler}) =>{
      this.dependencyApi.unsubscribe(event, handler);
    })
  };

  //add function
  this.add = async function(options={}){
    const {qgis_layer_id, geometry, properties} = options;
    //call method common
    await this.startAction({
      qgis_layer_id
    });
    //body of function
    const feature = geometry && this.dependencyApi.addNewFeature(qgis_layer_id, {
      geometry,
      properties
    });

    options.feature = feature;
    options.tools =  [feature ? this.config.tools.update.attributes : this.config.tools.add];
    options.action = 'add';
    const toolbox = await this.startEditing(qgis_layer_id, options);
    // in case of no feature add avent subscribe
    !feature && this.addSubscribeEvents('addfeature', {properties});
    // add all event required
    this.addSubscribeEvents('savedfeature', {toolbox, qgis_layer_id});
    this.addSubscribeEvents('cancelform', {qgis_layer_id});
    this.addSubscribeEvents('closeeditingpanel')
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
    return new Promise((resolve, reject) =>{
      this.stopAction();
      this.dependencyApi.stopEditing(qgis_layer_id)
        .then(()=> {
          this.dependencyApi.resetDefault();
          this.dependencyApi.hidePanel();
          resolve();
        })
    })

  };

  this.commitChanges = function(qgis_layer_id, options={}){
    return new Promise( (resolve, reject) =>{
      const {toolbox} = options;
      this.dependencyApi.commitChanges({
        toolbox,
        modal: false
      }).then(async ()=>
        await this.stopEditing(qgis_layer_id));
        resolve();
    })

  };

  this.clear = function(){
    this.dependencyApi.resetDefault();
  }
}

inherit(EditingService, BasePluginService);

module.exports = new EditingService;



