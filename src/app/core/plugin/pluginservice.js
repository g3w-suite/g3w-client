import ApplicationState from 'store/application-state';
import ApplicationService from 'services/application';

const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');

function PluginService(options={}) {
  base(this, options);
  this.plugin;
  this._api = {
    own: null,
    dependencies: {}
  };
  this._pluginEvents = {};
  this._appEvents = [];
  this.currentLayout = ApplicationService.getCurrentLayoutName();
  this.vm = new Vue();
  this.unwatch = this.vm.$watch(()=> ApplicationState.gui.layout.__current,
      currentLayoutName => this.currentLayout = currentLayoutName !== this.getPlugin().getName() ? currentLayoutName : this.currentLayout);

}

inherit(PluginService, G3WObject);

const proto = PluginService.prototype;

/**
 * Set a default init method. Overwrite by each plugin
 * @param config: plugin configuration object
 */
proto.init = function(config={}) {
  this.config = config;
};

proto.setCurrentLayout = function(){
  ApplicationService.setCurrentLayout(this.getPlugin().getName());
};

proto.resetCurrentLayout = function(){
  ApplicationService.setCurrentLayout(this.currentLayout);
};

// set owner plugin of the service
proto.setPlugin = function(plugin){
  this.plugin = plugin;
};

// return the instance of the plugin owner of the service
proto.getPlugin = function(){
  return this.plugin;
};

proto.isIframe = function() {
  return ApplicationService.isIframe();
};

/**
 * Get Current Project
 */
proto.getCurrentProject = function(){
  return ApplicationService.getCurrentProject();
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
  if (!dependency) this._api.own = api;
  else this._api.dependencies[dependency] = api;
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
  this.unwatch();
  this.vm = null;
  this._pluginEvents = null
};

// to owerwrite if we need some condition to load or not the plugin
proto.loadPlugin = function(){
  return true
};

//Called when plugin is removed to clear events and memory
proto.clear = function(){
  // to overwrite
};


module.exports = PluginService;
