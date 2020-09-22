const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const ApplicationService = require('core/applicationservice');
const G3WObject = require('core/g3wobject');

function PluginService(options={}) {
  base(this, options);
  this._api = {
    own: null,
    dependencies: {}
  };
  this._pluginEvents = {};
  this._appEvents = [];
  this.init = function(config) {
    this.config = config;
  }
}

inherit(PluginService, G3WObject);

const proto = PluginService.prototype;

proto.isIframe = function() {
  return ApplicationService.isIframe();
};

proto.getGid = function(){
  const {gid} = this.config;
  return gid && gid.split(':')[1];
};

proto.getConfig = function() {
  return this.config;
};

proto.setConfig = function(config) {
  this.config = config;
};

proto.setApi = function({dependency, api} = {}) {
  if (!dependency)
    this._api.own = api;
  else
    this._api.dependencies[dependency] = api;
};

proto.getApi = function({dependency} = {}) {
  return dependency && this._api.dependencies[dependency] || this._api.own;
};

proto.initEvents = function(events=[]) {
  for (let i in events) {
    const name = events[i];
    this._pluginEvents[name] = {};
  }
};

proto.registerWindowEvent = function({evt, cb}={}) {
  ApplicationService.registerWindowEvent({
    evt,
    cb
  })
};

proto.unregisterWindowEvent = function({evt, cb}) {
  ApplicationService.unregisterWindowEvent({
    evt,
    cb
  })
};

proto.subscribeEvent = function({name, once=false, owner, listener}) {
  this._pluginEvents[name] = this._pluginEvents[name] ? this._pluginEvents[name] : {};
  this._pluginEvents[name][owner] = listener;
  once ? this.once(name, listener): this.on(name, listener);
};

proto.triggerEvent = function({name, params={}}) {
  this.emit(name, params);
};

proto.unsubscribeEvent = function({name, owner}) {
  const listener = this._pluginEvents[name][owner];
  this.removeEvent(name, listener);
  delete this._pluginEvents[name][owner];
};

proto.unsubscribeAllEvents = function() {
  for (const name in this._pluginEvents) {
    this.removeEvent(name);
    delete this._pluginEvents[name];
  }
};

proto.clearAllEvents = function() {
  this.unsubscribeAllEvents();
  this._pluginEvents = null
};


module.exports = PluginService;
