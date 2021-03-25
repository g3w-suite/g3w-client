//SERVICES
const iFrameServices = require('./services/index');
////
const { t } = require('core/i18n/i18n.service');
const GUI = require('gui/gui');

function IframePluginService(options={}) {

  this.init = async function() {
    //this.setPluginsDepenciesApi();
    console.log(iFrameServices)
    await GUI.isReady();
    if (window.addEventListener) window.addEventListener("message", this.getMessage, false);
    else window.attachEvent("onmessage", this.getMessage);
  };

  //METHODS
  this.setPluginsDepenciesApi = function(){
    const pluginNames = Object.keys(this.pluginsDependeciesApiServices);
    pluginNames.forEach(pluginName => {
      const plugin = PluginsRegistry.getPlugin(pluginName);
      if (plugin) {
        this.pluginsDependeciesApiServices[pluginName].service.init(plugin.getApi());
        this.pluginsDependeciesApiServices[pluginName].ready = true;
      } else {
        PluginsRegistry.onafter('registerPlugin', async plugin =>{
          await plugin.isReady();
          if (pluginNames.indexOf(plugin.getName()) !== -1) {
            this.pluginsDependeciesApiServices[pluginName].service.init(plugin.getApi());
            this.pluginsDependeciesApiServices[pluginName].ready = true;
          }
        })
      }
    });
  };

  this._handleQueryResponse = function(responses) {
    this.postMessage({});
  };

  this.postMessage = function (message={}) {
    if (window.parent) {
      window.parent.postMessage(message, "*")
    }
  };

  this._changeProjectModalWindow = function({projects=[]}) {
    const message = GUI.getProjectMenuDOM({
      projects,
      host: this._host
    });

    this.projectsDialog = GUI.showModalDialog({
      className: "dialogFullScreen",
      title: t('changemap'),
      message
    });
  };

  this.filterProjectName = function(name) {
    if (name){
      name = name || this._project.getName();
      name = name.split('.qgs')[0].split('/');
      return  name[name.length-1]
    }
  };




  // method to handle all message from window
  this.getMessage = async evt => {
    if (evt && evt.data) {
      const { id, action, params } = evt.data;

      const [context, func] = action.split(':');
      let result;
      let data;
      try {
        data = await this.actionsHandlers[context][func](params);
        result = true;
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
