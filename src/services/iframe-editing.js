/**
 * @file
 * @since v3.6
 */

import GUI               from 'services/gui';
import BasePluginService from 'core/iframe/services/plugins/service';

class EditingService extends BasePluginService {

  constructor() {

    super();

    this.pluginName     = 'editing';

    this.subscribevents = [];

    this.isRunning      = false;

    this.responseObject = {
      cb:            null, // resolve or reject promise method
      qgs_layer_id : null,
      error:         null,
    };

    this.config         = {
      tools: {

        add: {
          disabled: [
            { id: 'deletefeature' },
            { id: 'copyfeatures' },
            { id: 'editmultiattributes' },
            { id: 'deletePart' },
            { id: 'splitfeature' },
            { id: 'mergefeatures' }
          ]
        },

        update: {
          disabled: [
            { id: 'addfeature' },
            { id: 'copyfeatures' },
            { id: 'deletefeature' },
            { id: 'editmultiattributes' },
            { id: 'deletePart' },
            { id: 'splitfeature' },
            { id: 'mergefeatures' }
          ]
        },

        delete: {
          enabled: [
            { id:'deletefeature', options: { active: true } }
          ]
        },

      }
    };

    //// subscribers handlers
    this.subscribersHandlers = {

      canUndo: ({
        activeTool,
        disableToolboxes = [],
      }) => (bool) => {
        //set currenttoolbocx id in editing to null
        if (bool === false) {
          this.responseObject.qgs_layer_id = null;
          this.responseObject.error = null;
        }
        activeTool.setEnabled(!bool);
        disableToolboxes.forEach(toolbox => toolbox.setEditing(!bool))
      },

      canRedo: () =>{},

      cancelform: (cb) => () => { cb() }, //run callback

      addfeature: ({
        properties,
        toolboxes,
      } = {}) => (feature) => {
        Object
          .keys(properties)
          .forEach(property => feature.set(property, properties[property]));
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
          const handler = this.addSubscribeEvents('canUndo', { activeTool, disableToolboxes });
          this.addSubscribeEvents('cancelform', handler);
        }
      },

      closeeditingpanel: ({ qgs_layer_id }) => () => {
        // response to router service
        this.responseObject.cb({
          qgs_layer_id: this.responseObject.qgs_layer_id,
          error:        this.responseObject.error,
        });
        // stop action
        this.stopAction({qgs_layer_id})
      },

    };

  }


  // METHODS CALLED FROM EACH ACTION METHOD
  // run before each action
  async startAction({ toolboxes, resolve, reject }) {
    this.responseObject.cb = reject;

    // set same mode autosave
    this.dependencyApi.setSaveConfig({
      cb: {

        // called when commit changes is done successuffly
        done: toolbox => {
          //set toolbox id
          this.responseObject.cb           = resolve;
          this.responseObject.qgs_layer_id = toolbox.getId();
          this.responseObject.error        = null;
          // close panel that fire closeediting panel event
          this.dependencyApi.hidePanel();
        },

        // called whe commit change receive an error
        error: (toolbox, error) => {
          this.responseObject.cb           = reject;
          this.responseObject.qgs_layer_id = toolbox.getId();
          this.responseObject.error        = error;
        } 
      }
    });

    // set toolboxes visible base on value of qgs_layer_id
    this.dependencyApi.showPanel({ toolboxes });
    this.isRunning = true;
  }

  //run after each action
  async stopAction(opts = {}) {
    if (opts.qgs_layer_id) {
      await this.stopEditing(opts.qgs_layer_id);
    }
  };

  // method to add subscribe refenrence
  addSubscribeEvents(event, options = {}) {
    const handler = this.subscribersHandlers[event](options);
    this.dependencyApi.subscribe(event, handler);
    this.subscribevents.push({ event, handler });
    return handler;
  };

  /**
   * Reset subscriber editing plugin events
   */
  resetSubscribeEvents() {
    this.subscribevents.forEach(({event, handler}) => { this.dependencyApi.unsubscribe(event, handler); });
  };

  /**
   * Method called whe we want add a feature
   * 
   * @param options
   * 
   * @returns {Promise<void>}
   */
  add(config = {}) {
    return new Promise(
      async (resolve, reject) => {

        if (this.isRunning) {
          reject();
          return;
        } 

        // extract qgslayerid from configuration message
        const {
          qgs_layer_id: configQglLayerId,
          ...data
        } = config;

        const { properties } = data;

        const qgs_layer_id = this.getQgsLayerId({
          qgs_layer_id: configQglLayerId,
          noValue:      this.dependencyApi.getEditableLayersId()
        });

        //call method common
        await this.startAction({
          toolboxes: qgs_layer_id,
          resolve,
          reject
        });

        // return all toolboxes
        let toolboxes = await this.startEditing(qgs_layer_id, {
          tools:            this.config.tools.add,
          startstopediting: false,
          action :          'add',
          selected:         1 === qgs_layer_id.length,
        });

        toolboxes = toolboxes.filter(tool => 'fulfilled' === tool.status).map(tool => tool.value);

        if (!GUI.isSidebarVisible()) {
          GUI.showSidebar();
        }

        const toolbox = toolboxes.length === 1 && toolboxes[0];

        if (toolbox) {
          toolbox.setActiveTool(toolbox.getToolById('addfeature'));
        }

        // in case of no feature add avent subscribe
        this.addSubscribeEvents('addfeature', { properties, toolboxes });
        this.addSubscribeEvents('closeeditingpanel', { qgs_layer_id });

      }
    );
  };

  /**
   * Method called when we want update a know feature field
   * 
   * @param config
   * 
   * @returns {Promise<unknown>}
   */
  async update(config = {}) {
    return new Promise(
      async (resolve, reject) => {

        if (this.isRunning){
          reject();
          return;
        } 

        const {
          qgs_layer_id: configQglLayerId,
          ...data
        } = config;

        const { feature } = data;

        const qgs_layer_id = this.getQgsLayerId({
          qgs_layer_id: configQglLayerId,
          noValue:      this.dependencyApi.getEditableLayersId()
        });

        const response = await this.findFeaturesWithGeometry({
          qgs_layer_id,
          feature,
          zoom: true,
          highlight: true,
          selected: qgs_layer_id.length === 1 // set selected toolbox
        });

        if (!response.found) {
          return reject;
        }

        await this.startAction({
          toolboxes: [response.qgs_layer_id],
          resolve,
          reject
        });

        // return all toolboxes
        await this.startEditing([response.qgs_layer_id], {
          feature,
          tools: this.config.tools.update,
          startstopediting: false,
          action: 'update'
        });

        if(!GUI.isSidebarVisible()) {
          GUI.showSidebar();
        }

        this.addSubscribeEvents('closeeditingpanel', { qgs_layer_id: [ response.qgs_layer_id ] });

      }
    );
  }

  delete() { }

  /**
   * Start editing called when we want to start editing
   * 
   * @param qgs_layer_id
   * @param options
   * 
   * @returns {Promise<unknown|void>}
   */
  async startEditing(qgs_layer_id = [], options = {}) {

    const {
      action = 'add',
      feature
    } = options;

    const filter = {};

    options.filter = filter;

    switch (action) {
      case 'add':    filter.nofeatures = true;                              break;
      case 'update': filter.field = `${feature.field}|eq|${feature.value}`; break;
    }

    const edits = [];

    qgs_layer_id.forEach(id => { edits.push(this.dependencyApi.startEditing(id, options)); });

    return await Promise.allSettled(edits);
  }

  /**
   * Stop editing
   * 
   * @param qgs_layer_id
   * 
   * @returns {Promise<unknown>}
   */
  async stopEditing(qgs_layer_id) {
    const edits = [];
    qgs_layer_id.forEach(layerid => { edits.push(this.dependencyApi.stopEditing(layerid)); });
    await Promise.allSettled(edits);
    this.clear();
  }

  stop() {
    return new Promise((resolve, reject)=> {
      this.dependencyApi.hidePanel();
      GUI.hideSidebar();
      this.once('clear', resolve);
    });
  }

  /**
   * Called wen we want to reset default editing plugin behaviour
   */
  clear() {
    this.dependencyApi.resetDefault();
    this.isRunning      = false;
    this.responseObject = {
      cb:            null, // resolve or reject promise method
      qgs_layer_id : null,
      error:         null,
    };
    this.resetSubscribeEvents();
    this.emit('clear');
  }

}

export default new EditingService();