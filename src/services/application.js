/**
 * @file
 * @since v3.6
 */
import {
  TIMEOUT,
  APP_VERSION,
  LOCAL_ITEM_IDS,
  API_BASE_URLS,
  APP_CONFIG,
}                         from 'app/constant';
import ApplicationState   from 'store/application-state';
import ProjectsRegistry   from 'store/projects';
import ApiService         from 'services/api';
import GUI                from 'services/gui';

import { XHR }            from 'utils/XHR';
import { getUniqueDomId } from 'utils/getUniqueDomId';
import { $promisify }     from 'utils/promisify';

const { init: i18ninit, changeLanguage } = require('core/i18n/i18n.service');
const G3WObject                          = require('core/g3wobject');


/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

/**
 * Manage Application 
 */

export default new (class ApplicationService extends G3WObject {
  constructor(opts = {}) {
    super(opts);

    this.version              = APP_VERSION;

    ApplicationState.iframe   = window.top !== window.self;

    ApplicationState.online   = navigator.onLine;

    ApplicationState.ismobile = isMobile.any;

    this.complete             = false;

    /**
     * set base url
     */
    this.baseurl              = '/';

    this.download_caller_id   = null;

    /**
     * store all services sidebar etc..
     */
    this._applicationServices = {};

    this.config               = {};

    this._initConfigUrl       = null;

    this._initConfig          = null;

    this._groupId             = null;

    this._gid                 = null;

    this.setters = {

      changeProject({ gid, host } = {}) {
        return this._changeProject({gid, host})
      },

      /**
       * @since 3.8.0
       */
      changeMapProject({ url, epsg } = {}) {
        url = GUI.getService('map').addMapExtentUrlParameterToUrl(url, epsg);
        history.replaceState(null, null, url);
        location.replace(url);
      },

      online() {
        this.setOnline();
      },

      offline() {
        this.setOffline();
      },

      setFilterToken(filtertoken) {
        this._setFilterToken(filtertoken)

      },

    };

    /**
     * Set application user from intiConfig (passed as parameter)
     */
    this.on('initconfig', ({ user } = {}) => { this.setApplicationUser(user); });
  }

    /**
     * Bootstrap application
     *
     * 1 - load translations (i18n languages)
     * 2 - skip loading on `ApplicationState.ready` (ie. already initialized) --> automatically reject after Timeout
     * 3 - initialize ProjectsRegistry
     * 4 - initialize ApiService
     * 5 - attach DOM events ('online' and 'offline')
     * 6 - trigger 'ready' event
     * 7 - set current project `gid` (group id)
     * 8 - set current project EPSG (coordinate system)
     * 9 - check if application is loaded within an <IFRAME>
     */
  async init() {
    const config = await this.createApplicationConfig();
    this.setConfig(config);
    this.setLayout('app', config.layout);
    return await (new Promise((resolve, reject) => {
      this.setupI18n();
      const timeout = setTimeout(() => { reject('Timeout') }, TIMEOUT);
      if (!ApplicationState.ready) {
        Promise.allSettled([
          ProjectsRegistry.init(this._config),
          ApiService.init(this._config)
        ]).then(() => {
          clearTimeout(timeout);
          this.registerOnlineOfflineEvent();
          this.emit('ready');

          ApplicationState.ready = this.initialized = true;
          const project          = ProjectsRegistry.getCurrentProject();
          this._gid              = project.getGid();

          this.setEPSGApplication(project);
          if (ApplicationState.iframe) {
            require('services/iframe').default.init({ project });
          }
          // init local items
          Object.keys(LOCAL_ITEM_IDS).forEach(id => {
            if (undefined === this.getLocalItem(id)) {
              this.setLocalItem({ id, data: LOCAL_ITEM_IDS[id].value });
            }
          });
          resolve(true);
        }).catch(e => { console.warn(e); reject(e) })
      }
    }));
  }

  /**
   * Load application translations (i18n languages)
   */
  setupI18n() {
    this._config._i18n.appLanguages = (this._config.i18n || []).map(l => l[0]);
    this.setApplicationLanguage(this._config._i18n.language);
    i18ninit(this._config._i18n);
    this._groupId = this._config.group.slug || this._config.group.name.replace(/\s+/g, '-').toLowerCase();
    // set Accept-Language request header based on config language
    $.ajaxSetup({
      beforeSend: (xhr) => { xhr.setRequestHeader('Accept-Language', this._config.user.i18n || 'en'); }
    });
  }

  /**
   * @TODO check if deprecated
   */
  getCurrentProject() {
    return ProjectsRegistry.getCurrentProject();
  }

  /**
   * Only one caller can set download application to true
   * @param {boolean} bool
   * @param {string | null} download_caller_id
   *
   * @returns {null | string}
   */
  setDownload(bool = false, download_caller_id = null) {
    //set the current application download state
    ApplicationState.download = bool;
    //Set this.download caller id. If download_caller_id is provided, reset to null (start value)
    this.download_caller_id   = download_caller_id ? null : getUniqueDomId();

    return this.download_caller_id;
  }

  getDownload() {
    return ApplicationState.download;
  }

  /**
   * @param {string} plugin name of plugin
   */
  loadingPlugin(plugin) {
    ApplicationState.plugins.push(plugin);
  }

  /**
   * @param {string} plugin name of plugin
   */
  loadedPlugin(plugin) {
    //remove from list loading plugin
    ApplicationState.plugins = ApplicationState.plugins.filter(p => plugin !== p);
  }

  /**
   * @param {string} filtertoken a string passed by server and used as parameter in XHR request
   */
  _setFilterToken(filtertoken) {
    ApplicationState.tokens.filtertoken = filtertoken;
  }

  getFilterToken() {
    return ApplicationState.tokens.filtertoken;
  }

  /**
   * @param {string} language
   */
  changeLanguage(language) {
    changeLanguage(language);
    /**
     * @deprecated Since v3.8. Will be deleted in v4.x. Use ApplicationState.language instead
     */
    ApplicationState.lng      = language;
    ApplicationState.language = language;
    const pathArray           = window.location.pathname.split('/');
    pathArray[1]              = language;

    history.replaceState(null, null, pathArray.join('/'));
  }

  registerOnlineOfflineEvent() {
    window.addEventListener('online', () => this.online());
    window.addEventListener('offline', () => this.offline());
  }

  getBaseLayerId() {
    return ApplicationState.baseLayerId;
  }

  /**
   * @param {string} baseLayerId
   */
  setBaseLayerId(baseLayerId) {
    ApplicationState.baseLayerId = baseLayerId;
  }

  /**
   * @FIXME weird parameter name (`bool`)
   * @FIXME unsued function paramater (`message`)
   */
  registerLeavePage({ bool=false, message='' } = {}) {
    const _return = !bool ? undefined : bool;
    window.onbeforeunload = function() {
      return _return;
    };
  }


  getState() {
    return ApplicationState;
  }

  /**
   * @FIXME weird parameter name (`bool`)
   */
  disableApplication(bool = false) {
    ApplicationState.gui.app.disabled = bool;
  }

  /**
   * @param {string} language
   */
  setApplicationLanguage(language = 'en') {
    /**
     * @deprecated Since v3.8. Will be deleted in v4.x. Use ApplicationState.language instead
     */
    ApplicationState.lng      = language;
    ApplicationState.language = language;
  }

  getApplicationLanguage() {
    return ApplicationState.language;
  }

  setOnline() {
    ApplicationState.online = true;
  }

  setOffline() {
    ApplicationState.online = false;
  }

  isOnline() {
    return ApplicationState.online;
  }

  /**
   * @param {string} id
   * @param {Object} data
   */
  async setOfflineItem(id, data = {}) {
    this.setLocalItem({ id, data });
  }

  setLocalItem({ id, data } = {}) {
    try { window.localStorage.setItem(id, JSON.stringify(data)); }
    catch(e) { console.warn(e); return e; }
  }

  /**
   * @param {string} id
   */
  removeLocalItem(id) {
    window.localStorage.removeItem(id);
  }

  /**
   * @param {string} id
   */
  getLocalItem(id) {
    const item = window.localStorage.getItem(id);
    return item ? JSON.parse(item) : undefined;
  }

  /**
   * @param {string} id
   */
  getOfflineItem(id) {
    return this.getLocalItem(id);
  }

  /**
   * @param {string} id
   */
  removeOfflineItem(id) {
    this.removeLocalItem(id);
  }

  /**
   * @returns {boolean} whether application is loaded within an <iframe>
   */
  isIframe() {
    return ApplicationState.iframe;
  }

  /**
   * get config
   */
  getConfig() {
    return this._config;
  }

  /**
   * @param {Object} config
   */
  setConfig(config = {}) {
    this._config = config;
  }

  /**
   * @returns {string} application proxy url
   */
  getProxyUrl() {
    return `${this._initConfig.proxyurl}`;
  }

  /**
   * Get Interface OWS Url
   */
  getInterfaceOwsUrl() {
    return `${this._initConfig.interfaceowsurl}`;
  }

  /**
   * Create an application config object
   * @param initConfig
   */
  async createApplicationConfig(initConfig) {
    const config = { ...APP_CONFIG };
    try {

      initConfig = initConfig ? initConfig : await this.obtainInitConfig({
        initConfigUrl:  `${APP_CONFIG.server.urls.initconfig}`
      });

      // write urls of static files and media url (base url and vector url)
      this.baseurl = initConfig.baseurl;

      /**
       * @type {{ macrogroups: * | [], groups: * | [] }}
       */
      const {
        macrogroups,
        groups
      } = await this.getMacrogroupsGroups();

      /**
       * write urls of static files and media url (base url and vector url)
       */
      config.server.urls.baseurl         = initConfig.baseurl;
      config.server.urls.frontendurl     = initConfig.frontendurl;
      config.server.urls.staticurl       = initConfig.staticurl;
      config.server.urls.clienturl       = initConfig.staticurl+initConfig.client;
      config.server.urls.mediaurl        = initConfig.mediaurl;
      config.server.urls.vectorurl       = initConfig.vectorurl;
      config.server.urls.proxyurl        = initConfig.proxyurl;
      config.server.urls.rasterurl       = initConfig.rasterurl;
      config.server.urls.interfaceowsurl = initConfig.interfaceowsurl;
      config.main_map_title              = initConfig.main_map_title;
      config.group                       = initConfig.group;
      config.user                        = initConfig.user;
      config.credits                     = initConfig.credits;
      config.i18n                        = initConfig.i18n;

      /**
       * get language from server
       */
      config._i18n.language              = config.user.i18n;

      /**
       * check if is inside a iframe
       */
      config.group.layout.iframe         = window.top !== window.self;

      /**
       * create application configuration
       */
      return  {
        apptitle:            config.apptitle || '',
        logo_img:            config.group.header_logo_img,
        logo_link:           config.group.header_logo_link,
        terms_of_use_text:   config.group.header_terms_of_use_text,
        terms_of_use_link:   config.group.terms_of_use_link,
        header_custom_links: config.group.header_custom_links,
        debug:               config.client.debug || false,
        group:               config.group,
        urls:                config.server.urls,
        mediaurl:            config.server.urls.mediaurl,
        resourcesurl:        config.server.urls.clienturl,
        vectorurl:           config.server.urls.vectorurl,
        rasterurl:           config.server.urls.rasterurl,
        interfaceowsurl:     config.server.urls.interfaceowsurl,
        projects:            config.group.projects,
        initproject:         config.group.initproject,
        overviewproject:     (config.group.overviewproject && config.group.overviewproject.gid) ? config.group.overviewproject : null,
        baselayers:          config.group.baselayers,
        mapcontrols:         config.group.mapcontrols,
        background_color:    config.group.background_color,
        crs:                 config.group.crs,
        minscale:            config.group.minscale,
        maxscale:            config.group.maxscale,
        main_map_title:      config.main_map_title,
        credits:             config.credits,
        _i18n:               config._i18n,
        i18n:                config.i18n,
        layout:              config.group.layout || {},
        /**
         * needed by ProjectService
         */
        getWmsUrl(project) {
          return `${config.server.urls.baseurl}${config.server.urls.ows}/${config.group.id}/${project.type}/${project.id}/`;
        },
        /**
         * needed by ProjectsRegistry to get information about project configuration
         */
        getProjectConfigUrl(project) {
          return `${config.server.urls.baseurl}${config.server.urls.config}/${config.group.id}/${project.type}/${project.id}?_t=${project.modified}`;
        },
        plugins: config.group.plugins,
        tools:   config.tools,
        views:   config.views || {},
        user:    config.user || null,
        /**
         * @since 3.8.0
         */
        groups,
        macrogroups,
      };
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }
  }

  /**
   * @returns { Promise<{ macrogroups: * | [], groups: * | [] }> }
   *
   * @since 3.8.0
   */
  async getMacrogroupsGroups() {
    let macrogroups = [];
    let groups      = [];
    try {
      macrogroups = await XHR.get({ url: `/${this.getApplicationUser().i18n}${API_BASE_URLS.ABOUT.macrogroups}` })
    } catch(e) { console.warn(e); }
    try {
      groups = await XHR.get({ url: `/${this.getApplicationUser().i18n}${API_BASE_URLS.ABOUT.nomacrogoups}` })
    } catch(e) { console.warn(e); }
    return {
      macrogroups,
      groups
    }
  }

  async obtainInitConfig({ initConfigUrl, url, host } = {}) {
    if (this._initConfigUrl) {
      window.initConfig = this._initConfig = null;
    } else {
      this._initConfigUrl = initConfigUrl;
    }

    // if exist a global initConfig
    this._initConfig = window.initConfig;

    let projectPath;

    // DEPRECATED: will be removed after v4.0
    const locationsearch = url ? url.split('?')[1] : location.search.substring(1);

    if (locationsearch) {
      //check an if exist project in url
      /**
       * The way to extract a project group,type and id
       * Example http:localhost:3000/?project=3003/qdjango/1
       * is deprecated
       */
      locationsearch.split('&').forEach(qt => {
        projectPath = qt.indexOf("project") > -1 ? qt.split("=")[1] : projectPath;
      });

      ///////////////////////////////////////////////////////////////////
    } else if (this._gid) {
      projectPath = `${this._groupId}/${this._gid.split(':').join('/')}`;
    }

    try {
      if (projectPath && !this._initConfig) {
        // get configuration from server
         this._initConfig = await(new Promise((resolve, reject) => {
            XHR
              .get({url: `${host || ''}${this.baseurl}${this._initConfigUrl}/${projectPath}`})
              .then(initConfig => resolve(initConfig))
              .catch(e => { console.warn(e); reject(e) });
        }));
      }
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    } finally {
      window.initConfig = this._initConfig;
      this.emit('initconfig', this._initConfig);
      const vendorkeys = this._initConfig.group.vendorkeys || {};
      this._initConfig.group.baselayers
          .forEach(baselayer => {
            if (baselayer.apikey) {
              vendorkeys[baselayer.servertype ? baselayer.servertype.toLowerCase() : null] = baselayer.apikey
            }
          });
      this.setVendorKeys(vendorkeys);
    }
    return this._initConfig;
  }

  /**
   * set EPSG of Application (e.g., during a WMS request for table layer)
   */
  setEPSGApplication(project) {
    ApplicationState.map.epsg = project.state.crs.epsg;
  }

  /**
   * Set application User
   */
  setApplicationUser(user) {
    ApplicationState.user = user;
  }

  /**
   * Get application User
   */
  getApplicationUser() {
    return ApplicationState.user;
  }


  registerService(el, service) {
    this._applicationServices[el] = service;
  }

  getService(el) {
    return this._applicationServices[el];
  }

  errorHandler(error) {};

  setVendorKeys(keys = {}) {
    Object.keys(keys).forEach(k => ApplicationState.keys.vendorkeys[k] = keys[k])
  }

  /**
   * It used by plugin https://github.com/g3w-suite/g3w-client-plugin-openrouteservice
   */
  reloadCurrentProject() {
    return this.changeProject({ gid: ProjectsRegistry.getCurrentProject().getGid() });
  }

  /**
   * @TODO check if deprecated
   *
   * Perform again all requests and rebuild interface on change project
   *
   * @param project.gid
   * @param project.host
   * @param project.crs
   *
   * @returns {JQuery.Promise<any, any, any>}
   */
  _changeProject({ gid, host, crs } = {}) {
    return $promisify(async () => {
      this._gid        = gid;
      const projectUrl = ProjectsRegistry.getProjectUrl(gid);
      const url        = GUI.getService('map').addMapExtentUrlParameterToUrl(projectUrl, crs);
      /**
       * @since 3.7.15
       */
      // in case of url with the same origin (CORS issue) trigger an error
      try {
        history.replaceState(null, null, url);
      } catch (e) {
        console.warn(e);
      }
      location.replace(url);
    })
  }

  /**
   * Updates panels sizes when showing content (eg. bottom "Attribute Table" panel, right "Query Results" table)
   */
  setLayout(who = 'app', config = {}) {

    const default_config = config.rightpanel || {
      width:          50, // ie. width == 50%
      height:         50, // ie. height == 50%
      width_default:  50,
      height_default: 50,
      width_100:      false,
      height_100:     false,
    };

    config.rightpanel = Object.assign(
      default_config,
      {
        width:          config.rightpanel.width  || default_config.width,
        height:         config.rightpanel.height || default_config.width,
        width_default:  config.rightpanel.width  || default_config.width,
        height_default: config.rightpanel.height || default_config.width,
        width_100:      false,
        height_100:     false,
      }
    );

    ApplicationState.gui.layout[who] = config;

  }

  removeLayout(who) {
    if (who) { delete ApplicationState.gui.layout[who] }
  }

  setCurrentLayout(who = 'app') {
    ApplicationState.gui.layout.__current = who;
  }

  getCurrentLayout() {
    return ApplicationState.gui.layout[ApplicationState.gui.layout.__current];
  }

  getCurrentLayoutName() {
    return ApplicationState.gui.layout.__current;
  }

  cloneLayout(which = 'app') {
    return _cloneDeep(ApplicationState.gui.layout[which])
  }

  clear() {
    window.removeEventListener('online');
    window.removeEventListener('offline');
  }

});