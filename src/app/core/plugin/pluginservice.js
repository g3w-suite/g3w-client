import G3WObject          from 'core/g3w-object';
import ApplicationState   from 'store/application-state';
import ApplicationService from 'services/application';

module.exports = class PluginService extends G3WObject {

  constructor(options = {}) {
    super(options);
    this.plugin;
    this._api = {
      own:          null,
      dependencies: {}
    };
    this._pluginEvents = {};
    this._appEvents    = [];
    this.currentLayout = ApplicationService.getCurrentLayoutName();
    this.vm = new Vue();
    this.unwatch = this.vm.$watch(
      () => ApplicationState.gui.layout.__current,
      layoutName => this.currentLayout = layoutName !== this.getPlugin().getName() ? layoutName : this.currentLayout
    );
  }

  /**
   * @param config: plugin configuration object
   * 
   * @virtual method need to be implemented by subclasses
   */
  init(config = {}) {
    this.config = config;
  }

  setCurrentLayout() {
    ApplicationService.setCurrentLayout(this.getPlugin().getName());
  }

  resetCurrentLayout() {
    ApplicationService.setCurrentLayout(this.currentLayout);
  }

  // set owner plugin of the service
  setPlugin(plugin) {
    this.plugin = plugin;
  }

  // return the instance of the plugin owner of the service
  getPlugin() {
    return this.plugin;
  }

  isIframe() {
    return ApplicationService.isIframe();
  }

  getCurrentProject() {
    return ApplicationService.getCurrentProject();
  }

  getGid() {
    return this.config.gid && this.config.gid.split(':')[1];
  }

  getConfig() {
    return this.config;
  }

  setConfig(config) {
    this.config = config;
  }

  setApi({dependency, api} = {}) {
    if (!dependency) { this._api.own = api }
    else { this._api.dependencies[dependency] = api }
  }

  getApi({ dependency } = {}) {
    return dependency && this._api.dependencies[dependency] || this._api.own;
  }

  initEvents(events=[]) {
    for (let i in events) {
      this._pluginEvents[events[i]] = {};
    }
  }

  subscribeEvent({ name, once=false, owner, listener }) {
    this._pluginEvents[name]        = this._pluginEvents[name] ? this._pluginEvents[name] : {};
    this._pluginEvents[name][owner] = listener;
    if (once) {
      this.once(name, listener);
    } else {
      this.on(name, listener);
    }
  }

  triggerEvent({ name, params = {} }) {
    this.emit(name, params);
  }

  unsubscribeEvent({ name, owner }) {
    this.removeEvent(name, this._pluginEvents[name][owner]);
    delete this._pluginEvents[name][owner];
  }

  unsubscribeAllEvents() {
    for (const name in this._pluginEvents) {
      this.removeEvent(name);
      delete this._pluginEvents[name];
    }
  }

  clearAllEvents() {
    this.unsubscribeAllEvents();
    this.unwatch();
    this.vm            = null;
    this._pluginEvents = null
  }

  /**
   * @returns need to load or not the plugin
   * 
   * @virtual method need to be implemented by subclasses 
   */ 
  loadPlugin() {
    return true
  }

  /**
   * Called when plugin is removed to clear events and memory
   * 
   * @virtual method need to be implemented by subclasses
   */
  clear() {}

};
