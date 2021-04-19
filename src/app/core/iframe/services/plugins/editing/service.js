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

  // run before each action
  this.startAction = async function({qgs_layer_id}){
    // set same mode autosave
    this.dependencyApi.setSaveConfig({
      mode: 'autosave'
    });

    this.dependencyApi.showPanel({
      toolboxes: [qgs_layer_id]
    });
  };

  //run after each action
  this.stopAction = async function(options={}){
    const {qgs_layer_id}  = options;
    qgs_layer_id && await this.stopEditing(qgs_layer_id);
    this.resetSubscribeEvents();
  };
  ////

  this.subscribersHandlers = {
    addfeature: ({properties}={}) => feature => Object.keys(properties).forEach(property => feature.set(property, properties[property])),
    cancelform: ({qgs_layer_id}) => () => this.stopAction({qgs_layer_id}),
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
    const {qgs_layer_id, geometry, properties} = options;
    //call method common
    await this.startAction({
      qgs_layer_id
    });
    //body of function
    const feature = geometry && this.dependencyApi.addNewFeature(qgs_layer_id, {
      geometry,
      properties
    });

    options.feature = feature;
    options.tools =  [feature ? this.config.tools.update.attributes : this.config.tools.add];
    options.action = 'add';
    const toolbox = await this.startEditing(qgs_layer_id, options);
    // in case of no feature add avent subscribe
    !feature && this.addSubscribeEvents('addfeature', {properties});
    // add all event required
    this.addSubscribeEvents('cancelform', {qgs_layer_id});
    this.addSubscribeEvents('closeeditingpanel')
  };


  this.update = function(){};


  this.delete = function(){};


  this.startEditing = async function(qgs_layer_id, options={}) {
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
    const toolbox = await this.dependencyApi.startEditing(qgs_layer_id, {
      tools,
      feature,
      startstopediting: true, // set ednabel disable editing
      filter
    });
    return toolbox;
  };


  this.stopEditing = function(qgs_layer_id) {
    return new Promise((resolve, reject) =>{
      this.stopAction();
      this.dependencyApi.stopEditing(qgs_layer_id)
        .then(()=> {
          this.dependencyApi.resetDefault();
          this.dependencyApi.hidePanel();
          resolve();
        })
    })

  };

  //commit changes editing
  this.commitChanges = function(qgs_layer_id, options={}){
    return new Promise( (resolve, reject) =>{
      const {toolbox} = options;
      this.dependencyApi.commitChanges({
        toolbox,
        modal: false
      }).then(async ()=>
        await this.stopEditing(qgs_layer_id));
        resolve();
    })

  };

  this.clear = function(){
    this.dependencyApi.resetDefault();
  }
}

inherit(EditingService, BasePluginService);

module.exports = new EditingService;



