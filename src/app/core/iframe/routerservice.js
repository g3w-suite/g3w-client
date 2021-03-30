const GUI = require('gui/gui');

function IframePluginService(options={}) {
  this.init = async function() {
    await GUI.isReady();
    this.services = require('./services/index');
    //initialize all service
    const serviceNames = Object.keys(this.services);
    for (let i=0; i < serviceNames.length; i++){
      await this.services[serviceNames[i]].init();
    }

    this.postMessage({
      id:null,
      action:"app:ready",
      response: {
        result: true
      }
    });
    if (window.addEventListener) window.addEventListener("message", this.getMessage, false);
    else window.attachEvent("onmessage", this.getMessage);
  };

  this.outputDataPlace = function(data, options={}){
    console.log(data);
  };

  // method to post message to parent
  this.postMessage = function (message={}) {
    if (window.parent) {
      window.parent.postMessage(message, "*")
    }
  };


  // method to handle all message from window
  this.getMessage = async evt => {
    if (evt && evt.data) {
      const { id, action, data:params } = evt.data;
      const [context, func] = action.split(':');
      let result = false;
      let data;
      try {
        if (this.services[context].getReady()) {
          data = await this.services[context][func](params);
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
      })
    }
  };

  this.clear = function() {
    if (window.removeEventListener) window.removeEventListener("message", this.getMessage, false);
    else window.detachEvent("onmessage", this.getMessage);
  }
}

module.exports = new IframePluginService;
