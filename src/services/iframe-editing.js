/**
 * ORIGINAL SOURCE: src/app/core/iframe/services/plugins/editing/service.js@v3.4
 */

const BasePluginService = require('core/iframe/services/plugins/service');
const {base, inherit} = g3wsdk.core.utils;
const GUI = require('gui/gui');

function EditingService() {
  base(this);
  this.pluginName = 'editing';
  this.subscribevents = [];
  this.isRunning = false;
  this.responseObject = {
    cb: null, // resolve or reject promise method
    qgs_layer_id : null,
    error: null
  };
  this.config =  {
    tools: {
      add: {
        disabled:[
          {
            id: 'deletefeature'
          },
          {
            id: 'copyfeatures'
          },
          {
            id: 'editmultiattributes'
          },
          {
            id: 'deletePart'
          },
          {
            id: 'splitfeature'
          },
          {
            id: 'mergefeatures'
          }
        ]
      },
      update: {
        disabled: [
          {
            id: 'addfeature'
          },
          {
            id: 'copyfeatures'
          },
          {
            id: 'deletefeature'
          },
          {
            id: 'editmultiattributes'
          },
          {
            id: 'deletePart'
          },
          {
            id: 'splitfeature'
          },
          {
            id: 'mergefeatures'
          }
        ]
      },
      delete: {
        enabled: [
          {
            id:'deletefeature',
            options: {
              active:true
            }
          }
        ]
      }
    }
  };

  // METHODS CALLED FROM EACH ACTION METHOD
  // run before each action
  this.startAction = async function({toolboxes, resolve, reject}){
    this.responseObject.cb = reject;
    // set same mode autosave
    this.dependencyApi.setSaveConfig({
      cb: {
        done: toolbox => {
          //set toolbox id
          this.responseObject.cb = resolve;
          this.responseObject.qgs_layer_id = toolbox.getId();
          this.responseObject.error = null;
          // close panel that fire closeediting panel event
          this.dependencyApi.hidePanel();
        }, // called when commit changes is done successuffly
        error: (toolbox, error) => {
          this.responseObject.cb = reject;
          this.responseObject.qgs_layer_id = toolbox.getId();
          this.responseObject.error = error;
        } // called whe commit change receive an error
      }
    });
    // set toolboxes visible base on value of qgs_layer_id
    this.dependencyApi.showPanel({
      toolboxes
    });
    this.isRunning = true;
  };

  //run after each action
  this.stopAction = async function(options={}){
    const {qgs_layer_id} = options;
    qgs_layer_id && await this.stopEditing(qgs_layer_id);
  };

  //// subscribers handlers
  this.subscribersHandlers = {
    canUndo:({activeTool, disableToolboxes=[]}) => bool => {
      //set currenttoolbocx id in editing to null
     if (bool === false) {
       this.responseObject.qgs_layer_id = null;
       this.responseObject.error = null;
     }
      activeTool.setEnabled(!bool);
      disableToolboxes.forEach(toolbox => toolbox.setEditing(!bool))
    },
    canRedo:() =>{},
    cancelform:cb=> ()=>{cb()},//run callback
    addfeature: ({properties, toolboxes}={}) => feature => {
      Object.keys(properties).forEach(property => feature.set(property, properties[property]));
      let activeTool;
      const disableToolboxes = [];
      toolboxes.forEach(toolbox => {
        const addFeatureTool = toolbox.getToolById('addfeature');
        if (addFeatureTool.isActive()){
          addFeatureTool.setEnabled(false);
          activeTool = addFeatureTool;
        } else {
          toolbox.setEditing(false);
          disableToolboxes.push(toolbox)
        }
      });
      //just one time
      if (this.subscribevents.find(eventObject => eventObject.event !== 'canUndo')) {
        const handler = this.addSubscribeEvents('canUndo', {
          activeTool,
          disableToolboxes
        });
        this.addSubscribeEvents('cancelform', handler);
      }
    },
    closeeditingpanel: ({qgs_layer_id})=> () => {
      // response to router service
      this.responseObject.cb({
        qgs_layer_id: this.responseObject.qgs_layer_id,
        error: this.responseObject.error
      });
      // stop action
      this.stopAction({qgs_layer_id})
    }
  };

  // method to add subscribe refenrence
  this.addSubscribeEvents = function(event, options={}){
    const handler = this.subscribersHandlers[event](options);
    this.dependencyApi.subscribe(event, handler);
    this.subscribevents.push({
      event,
      handler
    });
    return handler;
  };

  /**
   * Reset subscriber editing plugin events
   */
  this.resetSubscribeEvents = function(){
    this.subscribevents.forEach(({event, handler}) =>{
      this.dependencyApi.unsubscribe(event, handler);
    })
  };

  /**
   * Method called whe we want add a feature
   * @param options
   * @returns {Promise<void>}
   */
  this.add =  function(config={}){
    return new Promise(async (resolve, reject) => {
      if (this.isRunning){
        reject();
      } else {
        // extract qgslayerid from configuration message
        const {qgs_layer_id:configQglLayerId, ...data} = config;
        const { properties } = data;
        const qgs_layer_id = this.getQgsLayerId({
          qgs_layer_id: configQglLayerId,
          noValue: this.dependencyApi.getEditableLayersId()
        });
        //call method common
        await this.startAction({
          toolboxes: qgs_layer_id,
          resolve,
          reject
        });

        // create options
        const options = {
          tools: this.config.tools.add,
          startstopediting: false,
          action : 'add',
          selected: qgs_layer_id.length === 1
        };
        // return all toolboxes
        let toolboxes = await this.startEditing(qgs_layer_id, options);
        toolboxes = toolboxes.filter(toolboxPromise => toolboxPromise.status === 'fulfilled').map(toolboxPromise => toolboxPromise.value);
        !GUI.isSidebarVisible() && GUI.showSidebar();
        const toolbox = toolboxes.length === 1 && toolboxes[0];
        toolbox && toolbox.setActiveTool(toolbox.getToolById('addfeature'));
        // // in case of no feature add avent subscribe
        this.addSubscribeEvents('addfeature', {properties, toolboxes});
        this.addSubscribeEvents('closeeditingpanel', {qgs_layer_id})
      }
    })
  };

  /**
   * Method called when we want update a know feature field
   * @param config
   * @returns {Promise<unknown>}
   */
  this.update = async function(config={}){
    return new Promise(async (resolve, reject)=>{
      if (this.isRunning){
        reject();
      } else {
        const {qgs_layer_id: configQglLayerId, ...data} = config;
        const {feature} = data;
        const qgs_layer_id = this.getQgsLayerId({
          qgs_layer_id: configQglLayerId,
          noValue: this.dependencyApi.getEditableLayersId()
        });
        const response = await this.findFeaturesWithGeometry({
          qgs_layer_id,
          feature,
          zoom: true,
          highlight: true,
          selected: qgs_layer_id.length === 1 // set selected toolbox
        });
        const {found} = response;
        if (found) {
          await this.startAction({
            toolboxes: [response.qgs_layer_id],
            resolve,
            reject
          });

          // create options
          const options = {
            feature,
            tools: this.config.tools.update,
            startstopediting: false,
            action: 'update'
          };

          // return all toolboxes
          await this.startEditing([response.qgs_layer_id], options);
          !GUI.isSidebarVisible() && GUI.showSidebar();
          this.addSubscribeEvents('closeeditingpanel', {
            qgs_layer_id: [response.qgs_layer_id]
          })
        } else reject();
      }
    })
  };

  this.delete = function(){};

  /**
   * Start editing called when we want to start editing
   * @param qgs_layer_id
   * @param options
   * @returns {Promise<unknown|void>}
   */
  this.startEditing = async function(qgs_layer_id=[], options={}) {
    const {action= 'add', feature} = options;
    const filter = {};
    options.filter = filter;
    switch (action) {
      case 'add':
        filter.nofeatures = true;
        break;
      case 'update':
        filter.field = `${feature.field}|eq|${feature.value}`;
        break;
    }
    const startEditingPromise = [];
    qgs_layer_id.forEach(layerid =>{
      startEditingPromise.push(this.dependencyApi.startEditing(layerid, options))
    });
    return await Promise.allSettled(startEditingPromise);
  };

  /**
   * Stop editing
   * @param qgs_layer_id
   * @returns {Promise<unknown>}
   */
  this.stopEditing = async function(qgs_layer_id) {
    const stopEditingPromises = [];
    qgs_layer_id.forEach(layerid =>{
      stopEditingPromises.push(this.dependencyApi.stopEditing(layerid))
    });
    await Promise.allSettled(stopEditingPromises);
    this.clear();
  };

  this.stop = function(){
    return new Promise((resolve, reject)=>{
      this.dependencyApi.hidePanel();
      GUI.hideSidebar();
      this.once('clear', resolve);
    })
  };

  /**
   * Method called wen we want to reset default editing plugin behaviour
   *
   * */
  this.clear = function(){
    this.dependencyApi.resetDefault();
    this.isRunning = false;
    this.responseObject = {
      cb: null, // resolve or reject promise method
      qgs_layer_id : null,
      error: null
    };
    this.resetSubscribeEvents();
    this.emit('clear');
  }
}

inherit(EditingService, BasePluginService);

export default new EditingService();