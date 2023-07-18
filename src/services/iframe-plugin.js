/**
 * @file
 * @since v3.6
 */

import GUI from 'services/gui';

const { splitContextAndMethod, uniqueId } = require('core/utils/utils');

class IframePluginService {
  
  constructor(options={}) {

    /**
     * Holds current project provided by `ApplicationService` 
     */
    this.pendingactions = {};

    /**
     * @TODO double check (missing variable assignment?)
     */
    this.getMessage.bind(this);
    this.eventResponseServiceHandler.bind(this);

  }

  async init({ project } = {}) {

    await GUI.isReady();

    this.services = require('core/iframe/services/index');

    /** get layer attributes from project layers state */
    const layers = project.state.layers.map(({id, name}) => ({id, name}));

    // initialize all services
    const names = Object.keys(this.services);
    for (let i = 0; i < names.length; i++){
      const service = this.services[names[i]];
      // set common layer attribute service (once)
      if (undefined === service.getLayers()) {
        service.setLayers(layers);
      }
      await service.init();
      service.on('response', this.eventResponseServiceHandler);
    }

    // Send post message is ready
    this.postMessage({
      id: null,
      action: "app:ready",
      response: {
        result: true,
        data: {
          layers
        },
      },
    });

    if (window.addEventListener) {
      window.addEventListener("message", this.getMessage, false);
    } else {
      window.attachEvent("onmessage", this.getMessage);
    }
  }

  /**
   * handle eventResponse for all services
   */
  eventResponseServiceHandler({ action, response }) {
    this.postMessage({ id: null, action, response });
  };

  /**
   * Outputplace iframe retrieved by `DataRouteService`
   */
  async outputDataPlace(dataPromise, options = {}) {
    const {
      action = 'app:results'
    } = options;

    let {
      result,
      data=[]
    } = await dataPromise;

    const parser = new ol.format.GeoJSON();

    let outputData = [];

    try {
      outputData = data.map(({layer, features}) => ({ [layer.getId()]: { features: parser.writeFeatures(features) } }));
    } catch(err) {
      console.warn(err);
    } finally {
      this.postMessage({
        id: null,
        action,
        response: {
          result,
          data: outputData,
        }
      });
    }
  }

  /**
   * post a message to parent window
   */
  postMessage(message = {}) {
    if (window.parent) {
      window.parent.postMessage(message, '*');
    }
  }

  async stopPendingActions() {
    const promises = [];
    Object
      .keys(this.pendingactions)
      .forEach(id => {
        promises.push(this.services[this.pendingactions[id].context].stop());
        delete this.pendingactions[id];
      });
    return Promise.allSettled(promises)
  };

  /**
   * handle all message from window
   */
  async getMessage(evt) {
    if (evt && evt.data) {
      const {
        id     = uniqueId(),
        single = true,
        action,
        data: params,
      } = evt.data;

      const {
        context,
        method,
      } = splitContextAndMethod(action);

      let result = false;
      let data;

      try {
        const is_ready = this.services[context].getReady();
        if (is_ready && single) {
          await this.stopPendingActions();
        }
        if (is_ready) { 
          this.pendingactions[id] = { context };
          data = await this.services[context][method](params);
          result = true;
        }
      } catch(err) {
        result = false;
        data = err;
      } finally {
        this.postMessage({
          id,
          action,
          response: {
            result,
            data,
          },
        });
        delete this.pendingactions[id];
      }
    }
  };

  /**
   * Called on change map or clear
   */
  clear() {
    const names = Object.keys(this.services);
    for (let i = 0; i < names.length; i++) {
      this.services[names[i]].off('response', this.eventResponseServiceHandler)
    }
    this.stopPendingActions();
    if (window.removeEventListener) {
      window.removeEventListener("message", this.getMessage, false);
    } else {
      window.detachEvent("onmessage", this.getMessage);
    }
  }

}

export default new IframePluginService();