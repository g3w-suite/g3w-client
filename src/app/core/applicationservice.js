import appConfig from 'config'
import ApplicationState from './applicationstate';
const i18ninit = require('core/i18n/i18n.service').init;
const inherit = require('core/utils/utils').inherit;
const XHR = require('core/utils/utils').XHR;
const base = require('core/utils/utils').base;
const changeLanguage = require('core/i18n/i18n.service').changeLanguage;
const G3WObject = require('core/g3wobject');
const ApiService = require('core/apiservice');
const {uniqueId} = require('core/utils/utils');
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
  this.download_caller_id = null;
  // store all services sidebar etc..
  this._applicationServices = {};
  this.config = {};
  this._initConfigUrl = null;
  this._initConfig = null;
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
    },
    setFilterToken(filtertoken){
      this._setFilterToken(filtertoken)
    }
  };
  base(this);
  // init application
  this.init = async function() {
    try {
      const config = await this.createApplicationConfig();
      this.setConfig(config);
      return await this.bootstrap();
    } catch(error) {
      const browserLng = navigator && navigator.language || 'en';
      const language = appConfig.supportedLng.find(lng => {
        return browserLng.indexOf(lng) !== -1;
      });
      return Promise.reject({
        error,
        language
      })
    }
  };

  this.setupI18n = function() {
    const lngConfig = this._config._i18n;
    this.setApplicationLanguage(lngConfig.lng);
    //setup internalization for translation
    i18ninit(lngConfig);
    this._groupId = this._config.group.slug || this._config.group.name.replace(/\s+/g, '-').toLowerCase();
    // set accept-language reuest header based on config language
    const userLanguage = this._config.user.i18n || 'en';
    $.ajaxSetup({
      beforeSend: function (jqXHR) {
        jqXHR.setRequestHeader('Accept-Language', userLanguage);
      }
    });
  };

  this.getCurrentProject = function() {
    return ProjectsRegistry.getCurrentProject();
  };

  this.setDownload = function(bool=false, download_caller_id){
    if (!bool && download_caller_id && this.download_caller_id === download_caller_id) {
      ApplicationState.download = false;
      this.download_caller_id = null;
    } else if (bool && this.download_caller_id === null) {
      ApplicationState.download = bool;
      this.download_caller_id = uniqueId();
    }
    return this.download_caller_id;
  };

  this.getDownload = function(){
    return ApplicationState.download;
  };

  this.loadingPlugin = function(plugin){
    ApplicationState.plugins.push(plugin);
  };

  /*
  * plugin: name of plugin
  * ready: Boolen - true if loaded and ready otherwise non ready - TO DO
  * */
  this.loadedPlugin = function(plugin, ready) {
    ApplicationState.plugins = ApplicationState.plugins.filter(_plugin => _plugin !== plugin);
  };

  this._setFilterToken = function(filtertoken){
    ApplicationState.tokens.filtertoken = filtertoken;
  };

  this.getFilterToken = function(){
    return ApplicationState.tokens.filtertoken;
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

  this.getBaseLayerId = function(){
    return ApplicationState.baseLayerId;
  };

  this.setBaseLayerId = function(baseLayerId) {
    ApplicationState.baseLayerId = baseLayerId;
  };

  this.registerLeavePage = function({bool=false, message=''}={}){
    const _return = !bool ? undefined : bool;
    window.onbeforeunload = function(event) {
      return _return;
    };
  };

  this.unregisterOnlineOfflineEvent = function() {
    window.removeEventListener('online');
    window.removeEventListener('offline');
  };

  this.getState = function(){
    return ApplicationState;
  };

  this.setApplicationLanguage = function(lng='en') {
    ApplicationState.lng = lng;
  };

  this.getApplicationLanguage = function() {
    return ApplicationState.lng;
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

  this.setConfig = function(config={}){
    this._config = config;
  };

  // router service
  this.getRouterService = function() {
    return RouterService;
  };

  // clipboard service
  this.getClipboardService = function() {
    return ClipboardService;
  };

  this.createApplicationConfig = async function(initConfig) {
    const config = {
      ...appConfig
    };
    try {
      initConfig =   initConfig ? initConfig :  await this.obtainInitConfig({
        initConfigUrl:  appConfig.server.urls.initconfig
      });
      // write urls of static files and media url (base url and vector url)
      config.server.urls.baseurl = initConfig.baseurl;
      config.server.urls.frontendurl = initConfig.frontendurl;
      config.server.urls.staticurl = initConfig.staticurl;
      config.server.urls.clienturl = initConfig.staticurl+initConfig.client;
      config.server.urls.mediaurl = initConfig.mediaurl;
      config.server.urls.vectorurl = initConfig.vectorurl;
      config.main_map_title = initConfig.main_map_title;
      config.group = initConfig.group;
      config.user = initConfig.user;
      config.credits = initConfig.credits;
      config.i18n = initConfig.i18n;
      // get language from server
      config._i18n.lng = config.user.i18n;
      // create application configuration
      // check if is inside a iframe
      config.group.layout.iframe = window.top !== window.self;
      return  {
        apptitle: config.apptitle || '',
        logo_img: config.group.header_logo_img,
        logo_link: config.group.header_logo_link,
        terms_of_use_text: config.group.header_terms_of_use_text,
        terms_of_use_link: config.group.terms_of_use_link,
        header_custom_links: config.group.header_custom_links,
        debug: config.client.debug || false,
        group: config.group,
        urls: config.server.urls,
        mediaurl: config.server.urls.mediaurl,
        resourcesurl: config.server.urls.clienturl,
        vectorurl:config.server.urls.vectorurl,
        projects: config.group.projects,
        initproject: config.group.initproject,
        overviewproject: (config.group.overviewproject && config.group.overviewproject.gid) ? config.group.overviewproject : null,
        baselayers: config.group.baselayers,
        mapcontrols: config.group.mapcontrols,
        background_color: config.group.background_color,
        crs: config.group.crs,
        minscale: config.group.minscale,
        maxscale: config.group.maxscale,
        main_map_title: config.main_map_title,
        credits: config.credits,
        _i18n: config._i18n,
        i18n: config.i18n,
        layout: config.group.layout || {},
        // needed by ProjectService
        getWmsUrl: function(project) {
          return `${config.server.urls.baseurl+config.server.urls.ows}/${config.group.id}/${project.type}/${project.id}/`;
        },
        // needed by ProjectsRegistry to get informations about project configuration
        getProjectConfigUrl: function(project) {
          return `${config.server.urls.baseurl+config.server.urls.config}/${config.group.id}/${project.type}/${project.id}`;
        },
        plugins: config.group.plugins,
        tools: config.tools,
        views: config.views || {},
        user: config.user || null
      };
    } catch(error) {
      return Promise.reject(error);
    }
  };

  this.obtainInitConfig = async function({initConfigUrl, url, host}={}) {
    if (!this._initConfigUrl) this._initConfigUrl = initConfigUrl;
    else this.clearInitConfig();
    // if exist a global initiConfig (in production)
    if (window.initConfig) {
      production = true;
      this._initConfig = window.initConfig;
      this.setInitVendorKeys(initConfig);
      return window.initConfig;
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
        const url =  `${host || ''}/${this._initConfigUrl}/${projectPath}`;
        // get configuration from server (return a promise)
        try {
          const initConfig =  await this.getInitConfig(url);
          //group, mediaurl, staticurl, user
          initConfig.staticurl = "../dist/"; // in development force  asset
          initConfig.clienturl = "../dist/"; // in development force  asset
          this._initConfig = initConfig;
          // set initConfig
          window.initConfig = initConfig;
          this.setInitVendorKeys(initConfig);
          return initConfig;
        } catch(error) {
          return Promise.reject(error);
        }
      }
    }
  };

  // method to get initial application configuration
  this.getInitConfig = function(url) {
    return new Promise((resolve, reject) => {
      if (this._initConfig) resolve(this._initConfig);
      else XHR.get({
        url
      })
        .then(initConfig => resolve(initConfig))
        .catch(error => reject(error));
    })
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
  this.bootstrap = function() {
    return new Promise((resolve, reject) => {
      // setup All i18n configuration
      this.setupI18n();
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
          this.registerOnlineOfflineEvent();
          this.emit('ready');
          ApplicationState.ready = this.initialized = true;
          resolve(true);
        }).fail((error) => {
          reject(error);
        })
      }
    });
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

  this.getApplicationService = function(type){
    return this._applicationServices[type];
  };

  this.getService = function(element) {
    return this._applicationServices[element];
  };

  this.errorHandler = function(error) {};

  this.clearInitConfig = function() {
    window.initConfig = null;
    this._initConfig = null;
  };

  this.setInitVendorKeys = function(config={}){
   const vendorkeys = config.group.vendorkeys || {};
   config.group.baselayers.forEach(baselayer =>{
     if (baselayer.apikey) {
       const type = baselayer.servertype ? baselayer.servertype.toLowerCase() : null;
       vendorkeys[type] = baselayer.apikey
     }
   });
   this.setVendorKeys(vendorkeys);
  };

  this.setVendorKeys = function(keys={}){
    Object.keys(keys).forEach(key =>{
      ApplicationState.keys.vendorkeys[key] = keys[key];
    })
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
    }).then(initConfig => {
        ProjectsRegistry.setProjects(initConfig.group.projects);
        ProjectsRegistry.getProject(gid)
          .then((project) => {
            GUI.closeUserMessage();
            GUI.closeContent()
              .then(() => {
                // remove all toos
                ProjectsRegistry.onceafter('setCurrentProject', ()=>{
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
                });
                // change current project project
                ProjectsRegistry.setCurrentProject(project);
                ApplicationState.download = false;
              })
              .fail(err => {
                console.log(err);
              })
          })
          .fail(() => {
            d.reject();
          });
      })
      .catch((error) => {
        d.reject(error);
      });
    return d.promise();
  };
  this.clear = function(){
    this.unregisterOnlineOfflineEvent();
  }
};

inherit(ApplicationService, G3WObject);

module.exports = new ApplicationService;
