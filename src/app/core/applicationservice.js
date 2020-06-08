import ApplicationState from './applicationstate';
const inherit = require('core/utils/utils').inherit;
const XHR = require('core/utils/utils').XHR;
const base = require('core/utils/utils').base;
const changeLanguage = require('core/i18n/i18n.service').changeLanguage;
const G3WObject = require('core/g3wobject');
const ApiService = require('core/apiservice');
const RouterService = require('core/router');
const ProjectsRegistry = require('core/project/projectsregistry');
const PluginsRegistry = require('core/plugin/pluginsregistry');
const ClipboardService = require('core/clipboardservice');
const GlobalComponents = require('gui/vue/vue.globalcomponents');
const GlobalDirective = require('gui/vue/vue.directives');
const GUI = require('gui/gui');
const G3W_VERSION = "{G3W_VERSION}";

// install global components
Vue.use(GlobalComponents);
// install gloabl directive
Vue.use(GlobalDirective);

//Manage Application
const ApplicationService = function() {
  let production = false;
  this.version = G3W_VERSION.indexOf("G3W_VERSION") === -1 ? G3W_VERSION  : "";
  ApplicationState.iframe = window.top !== window.self;
  ApplicationState.online = navigator.onLine;
  ApplicationState.ismobile= isMobile.any;
  this.complete = false;
  // store all services sidebar etc..
  this._applicationServices = {};
  this.config = {};
  this._initConfigUrl = null;
  this._initConfig = {};
  this._groupId = null;
  this._gid = null;
  this.setters = {
    changeProject({gid, host}={}){
      return this._changeProject({gid, host})
    },
    online() {
      this.setOnline();
    },
    offline(){
      this.setOffline();
    }
  };
  base(this);
  // init from server
  this.init = function(config={}) {
    ApplicationState.lng = config._i18n.lng;
    this._config = config;
    this._groupId = this._config.group.slug || this._config.group.name.replace(/\s+/g, '-').toLowerCase();
    return this._bootstrap();
  };

  this.getCurrentProject = function() {
    return ProjectsRegistry.getCurrentProject();
  };

  this.changeLanguage = function(lng){
    changeLanguage(lng);
    ApplicationState.lng = lng;
    const pathname = window.location.pathname;
    const pathArray = pathname.split('/');
    pathArray[1] = lng;
    history.replaceState(null, null, pathArray.join('/'));
  };

  this.registerOnlineOfflineEvent = function() {
    this.registerWindowEvent({
      evt: 'online',
      cb:()=> this.online()
    });
    
    this.registerWindowEvent({
      evt: 'offline',
      cb:() => this.offline()
    })
  };

  this.unregisterOnlineOfflineEvent = function() {
    window.removeEventListener('online');
    window.removeEventListener('offline');
  };

  this.getState = function(){
    return ApplicationState;
  };

  this.setOnline = function() {
    ApplicationState.online = true;
  };

  this.setOffline = function(){
    ApplicationState.online = false;
  };

  this.isOnline = function(){
    return ApplicationState.online;
  };

  this.setOfflineItem = async function(id, data={}){
    this.setLocalItem({
      id,
      data
    })
  };

  this.setLocalItem = function({id, data}={}){
    try {
      const item = JSON.stringify(data);
      window.localStorage.setItem(id, item);
    } catch(error) {
      return error;
    }
  };

  this.removeLocalItem = function(id){
    window.localStorage.removeItem(id);
  };

  this.getLocalItem = function(id){
    const item = window.localStorage.getItem(id);
    if (item) return JSON.parse(item);
    else return undefined;
  };

  this.getOfflineItem = function(id) {
    return this.getLocalItem(id);
  };

  this.removeOfflineItem = function(id){
    this.removeLocalItem(id);
  };

  //check if is in Iframe
  this.isIframe = function() {
    return ApplicationState.iframe;
  };

  // get config
  this.getConfig = function() {
    return this._config;
  };

  // router service
  this.getRouterService = function() {
    return RouterService;
  };

  // clipboard service
  this.getClipboardService = function() {
    return ClipboardService;
  };

  this.obtainInitConfig = function({initConfigUrl, url, host}={}) {
    const d = $.Deferred();
    if (!this._initConfigUrl) this._initConfigUrl = initConfigUrl;
    else this.clearInitConfig();
    // if exist a global initiConfig (in production)
    if (window.initConfig) {
      production = true;
      this._initConfig = window.initConfig;
      return d.resolve(window.initConfig);
      // case development need to ask to api
    } else {
      let projectPath;
      let queryTuples;
      const locationsearch = url ? url.split('?')[1] : location.search ? location.search.substring(1) : null;
      if (locationsearch) {
        queryTuples = locationsearch.split('&');
        queryTuples.forEach((queryTuple) => {
          //check if exist project in url
          if( queryTuple.indexOf("project") > -1) {
            projectPath = queryTuple.split("=")[1];
          }
        });
      } else {
        const type_id = this._gid.split(':').join('/');
        projectPath = `${this._groupId}/${type_id}`;
      }
      if (projectPath) {
        const initUrl =  `${host || ''}/${this._initConfigUrl}/${projectPath}`;
        // get configuration from server (return a promise)
        XHR.get({
          url: initUrl
        }).then((initConfig) => {
          //initConfig conatin mai configuration
          //group, mediaurl, staticurl, user
          initConfig.staticurl = "../dist/"; // in development force  asset
          initConfig.clienturl = "../dist/"; // in development force  asset
          this._initConfig = initConfig;
          // set initConfig
          window.initConfig = initConfig;
          d.resolve(initConfig);
        }).catch((error) => {
          d.reject(error);
        });
      }
    }
    return d.promise();
  };

  this.getInitConfig = function() {
    return this._initConfig;
  };

  this.getInitConfigUrl = function() {
    return this._initConfigUrl;
  };

  this.setInitConfigUrl = function(initConfigUrl) {
    this._initConfigUrl = initConfigUrl;
  };

  // post boostratp
  this.postBootstrap = async function() {
    if (!this.complete) {
      try {
        RouterService.init();
        // once the projects are inizilized and also api service
        // register  plugins
        await this._bootstrapPlugins()
      } catch(err) {
      } finally {
        this.complete = true;
        this.emit('complete');
      }
    }
  };

  //boostrap plugins
  this._bootstrapPlugins = function() {
    return PluginsRegistry.init({
      pluginsBaseUrl: this._config.urls.staticurl,
      pluginsConfigs: this._config.plugins,
      otherPluginsConfig: ProjectsRegistry.getCurrentProject().getState()
    });
  };

  //  bootstrap (when called init)
  this._bootstrap = function() {
    const d = $.Deferred();
    //first time l'application service is not ready
    if (!ApplicationState.ready) {
      // LOAD DEVELOPMENT CONFIGURATION
      if (!production) require('../dev/index');
      $.when(
        // register project
        ProjectsRegistry.init(this._config),
        // inizialize api service
        ApiService.init(this._config)
      ).then(() => {
        //rigistern online event
        this.registerOnlineOfflineEvent();
        this.emit('ready');
        ApplicationState.ready = this.initialized = true;
        d.resolve();
      }).fail((error) => {
        d.reject(error);
      })
    }
    return d.promise();
  };

  this.registerWindowEvent = function({evt, cb} ={}) {
    window.addEventListener(evt, cb);
  };

  this.unregisterWindowEvent = function({evt, cb}={}){
    window.removeEventListener(evt, cb)
  };

  this.registerService = function(element, service) {
    this._applicationServices[element] = service;
  };

  this.unregisterService = function(element) {
    delete this._applicationServices[element];
  };

  this.getService = function(element) {
    return this._applicationServices[element];
  };

  this.errorHandler = function(error) {};

  this.clearInitConfig = function() {
    window.initConfig = null;
  };

  this._changeProject = function({gid, host}={}) {
    const d = $.Deferred();
    this._gid = gid;
    const aliasUrl = ProjectsRegistry.getProjectAliasUrl(gid);
    const mapUrl = ProjectsRegistry.getProjectUrl(gid);
    // change url using history
    (production && aliasUrl) && history.replaceState(null, null, aliasUrl) || history.replaceState(null, null, mapUrl);
    //remove tools
    this.obtainInitConfig({
      host
    }).then((initConfig) => {
        ProjectsRegistry.setProjects(initConfig.group.projects);
        ProjectsRegistry.getProject(gid)
          .then((project) => {
            GUI.closeUserMessage();
            GUI.closeContent()
              .then(() => {
                // change current project project
                ProjectsRegistry.setCurrentProject(project);
                // remove all toos
                GUI.getComponent('tools').getService().reload();
                // reload metadati
                GUI.getComponent('metadata').getService().reload();
                // reload plugins
                PluginsRegistry.reloadPlugins(initConfig, project)
                  .then(()=>{})
                  .catch(()=>{})
                  .finally(()=> {
                  // reload components
                  GUI.reloadComponents();
                  d.resolve(project);
                })

              })
              .fail((err) => {
                console.log(err);
              })
          })
          .fail(() => {
            d.reject();
          });
      })
      .fail((err) => {
        //TODO
      });
    return d.promise();
  };
  this.clear = function(){
    this.unregisterOnlineOfflineEvent();
  }
};

inherit(ApplicationService, G3WObject);


module.exports = new ApplicationService;
