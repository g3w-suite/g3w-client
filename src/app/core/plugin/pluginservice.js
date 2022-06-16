import ApplicationService from 'core/applicationservice';
import G3WObject from 'core/g3wobject';
import ApplicationState from '../applicationstate';

class PluginService extends G3WObject {
  constructor() {
    super();
    this.plugin;
    this._api = {
      own: null,
      dependencies: {},
    };
    this._pluginEvents = {};
    this._appEvents = [];
    this.currentLayout = ApplicationService.getCurrentLayoutName();
    this.vm = new Vue();
    this.unwatch = this.vm.$watch(
      () => ApplicationState.gui.layout.__current,
      (currentLayoutName) => this.currentLayout = currentLayoutName !== this.getPlugin().getName() ? currentLayoutName : this.currentLayout,
    );
  }

  // set dafault init method (overwrite by each plugin
  init(config) {
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

  /**
   * Get Current Project
   */
  getCurrentProject() {
    return ApplicationService.getCurrentProject();
  }

  getGid() {
    const { gid } = this.config;
    return gid && gid.split(':')[1];
  }

  getConfig() {
    return this.config;
  }

  setConfig(config) {
    this.config = config;
  }

  setApi({ dependency, api } = {}) {
    if (!dependency) this._api.own = api;
    else this._api.dependencies[dependency] = api;
  }

  getApi({ dependency } = {}) {
    return dependency && this._api.dependencies[dependency] || this._api.own;
  }

  initEvents(events = []) {
    for (const i in events) {
      const name = events[i];
      this._pluginEvents[name] = {};
    }
  }

  registerWindowEvent({ evt, cb } = {}) {
    ApplicationService.registerWindowEvent({
      evt,
      cb,
    });
  }

  unregisterWindowEvent({ evt, cb }) {
    ApplicationService.unregisterWindowEvent({
      evt,
      cb,
    });
  }

  subscribeEvent({
    name, once = false, owner, listener,
  }) {
    this._pluginEvents[name] = this._pluginEvents[name] ? this._pluginEvents[name] : {};
    this._pluginEvents[name][owner] = listener;
    once ? this.once(name, listener) : this.on(name, listener);
  }

  triggerEvent({ name, params = {} }) {
    this.fire(name, params);
  }

  unsubscribeEvent({ name, owner }) {
    const listener = this._pluginEvents[name][owner];
    this.removeEvent(name, listener);
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
    this.vm = null;
    this._pluginEvents = null;
  }

  // to owerwrite if we need some condition to load or not the plugin
  loadPlugin() {
    return true;
  }

  // Called when plugin is removed to clear events and memory
  clear() {
    // to overwrite
  }
}

export default PluginService;
