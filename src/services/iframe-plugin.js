/**
 * @file
 * @since v3.6
 */

import GUI from 'services/gui';

const { splitContextAndMethod, uniqueId } = require('utils');

function IframePluginService(options={}) {
  //project is current project send by application service
  this.pendingactions = {};
  this.init = async function({project}={}) {
    await GUI.isReady();
    this.services = {
      app: require('services/iframe-app').default,
      editing: require('services/iframe-editing').default,
    };
    //set eventResponse handler to alla services
    this.eventResponseServiceHandler = ({action, response}) => {
      this.postMessage({
        id: null,
        action,
        response
      })
    };
    /*
    get layer attributes from project layers state
     */
    const layers = project.state.layers.map(layer =>({
      id: layer.id,
      name: layer.name
    }));
    //initialize all service
    const serviceNames = Object.keys(this.services);
    for (let i=0; i < serviceNames.length; i++){
      const service = this.services[serviceNames[i]];
      // set common layer attribute service just one time
      service.getLayers() === undefined && service.setLayers(layers);
      await service.init();
      service.on('response', this.eventResponseServiceHandler);
    }
    /**
     * Send post message is ready
     */
    this.postMessage({
      id:null,
      action:"app:ready",
      response: {
        result: true,
        data: {
          layers
        }
      }
    });

    if (window.addEventListener) window.addEventListener("message", this.getMessage, false);
    else window.attachEvent("onmessage", this.getMessage);
  };

  /**
   * Outputplace iframe get by DataRouteService
   * @param dataPromise
   * @param options
   * @returns {Promise<void>}
   */
  this.outputDataPlace = async function(dataPromise, options={}){
    const {action='app:results'} = options;
    let {result, data=[]} = await dataPromise;
    const parser = new ol.format.GeoJSON();
    let outputData = [];
    try {
      outputData = data.map(({layer, features})=>({
        [layer.getId()]: {
          features: parser.writeFeatures(features)
        }
      }));
    } catch(err){
      result: false;
      outputData: err;
    }
    this.postMessage({
      id: null,
      action,
      response: {
        result,
        data: outputData
      }
    })
  };

  // method to post message to parent
  this.postMessage = function (message={}) {
    if (window.parent) window.parent.postMessage(message, "*")
  };

  this.stopPendingActions = async function(){
    const promises = [];
    Object.keys(this.pendingactions).forEach(id => {
      const {context} = this.pendingactions[id];
      promises.push(this.services[context].stop());
      delete this.pendingactions[id];
    });
    return Promise.allSettled(promises)
  };

  // method to handle all message from window
  this.getMessage = async evt => {
    if (evt && evt.data) {
      const { id = uniqueId(), single=true, action, data:params } = evt.data;
      const {context, method} = splitContextAndMethod(action);
      let result = false;
      let data;
      try {
        if (this.services[context].getReady()) {
          single && await this.stopPendingActions();
          this.pendingactions[id] = {
            context
          };
          data = await this.services[context][method](params);
          result = true;
        }
      } catch(err){
        result = false;
        data = err;
      }
      this.postMessage({
        id,
        action,
        response: {
          result,
          data
        }
      });
      delete this.pendingactions[id];
    }
  };

  // Called when change map or clear
  this.clear = function() {
    const serviceNames = Object.keys(this.services);
    for (let i=0; i < serviceNames.length; i++) {
      const service = this.services[serviceNames[i]];
      service.off('response', this.eventResponseServiceHandler)
    }
    this.stopPendingActions();
    if (window.removeEventListener) window.removeEventListener("message", this.getMessage, false);
    else window.detachEvent("onmessage", this.getMessage);
  }
}

export default new IframePluginService();