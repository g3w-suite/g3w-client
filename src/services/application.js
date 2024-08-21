/**
 * @file
 * @since v3.6
 */

import appConfig         from 'config';
import {
  TIMEOUT,
  APP_VERSION,
  LOCAL_ITEM_IDS,
  API_BASE_URLS
}                        from 'app/constant';
import ApplicationState  from 'store/application-state';
import DataRouterService from 'services/data';
import PluginsRegistry   from 'store/plugins';
import ProjectsRegistry  from 'store/projects';
import ApiService        from 'services/api';
import GUI               from 'services/gui';

const { init: i18ninit, changeLanguage } = require('core/i18n/i18n.service');
const { XHR, uniqueId }                  = require('utils');
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
   * init application
   */
  async init() {
    try {
      const config = await this.createApplicationConfig();
      this.setConfig(config);
      this.setLayout('app', config.layout);
      return await this.bootstrap();
    } catch(error) {
      console.warn(error);
      const browserLanguage = navigator && navigator.language || 'en';
      const language        = appConfig.supportedLanguages.find(l => browserLanguage.includes(l));
      return Promise.reject({ error, language })
    }
  };

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
  };

  /**
   * @TODO check if deprecated
   */
  getCurrentProject() {
    return ProjectsRegistry.getCurrentProject();
  };

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
    this.download_caller_id   = download_caller_id ? null : uniqueId();

    return this.download_caller_id;
  };

  getDownload() {
    return ApplicationState.download;
  };

  /**
   * @param {string} plugin name of plugin
   */
  loadingPlugin(plugin) {
    ApplicationState.plugins.push(plugin);
  };

  /**
   * @param {string} plugin name of plugin
   */
  loadedPlugin(plugin) {
    //remove from list loading plugin
    ApplicationState.plugins = ApplicationState.plugins.filter(p => plugin !== p);
  };

  /**
   * @param {string} filtertoken a string passed by server and used as parameter in XHR request
   */
  _setFilterToken(filtertoken) {
    ApplicationState.tokens.filtertoken = filtertoken;
  };

  getFilterToken() {
    return ApplicationState.tokens.filtertoken;
  };

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
  };

  registerOnlineOfflineEvent() {
    this.registerWindowEvent({ evt: 'online',  cb:() => this.online() });
    this.registerWindowEvent({ evt: 'offline', cb:() => this.offline() });
  };

  getBaseLayerId() {
    return ApplicationState.baseLayerId;
  };

  /**
   * @param {string} baseLayerId
   */
  setBaseLayerId(baseLayerId) {
    ApplicationState.baseLayerId = baseLayerId;
  };

  /**
   * @FIXME weird parameter name (`bool`)
   * @FIXME unsued function paramater (`message`)
   */
  registerLeavePage({ bool=false, message='' } = {}) {
    const _return = !bool ? undefined : bool;
    window.onbeforeunload = function() {
      return _return;
    };
  };

  unregisterOnlineOfflineEvent() {
    window.removeEventListener('online');
    window.removeEventListener('offline');
  };

  getState() {
    return ApplicationState;
  };

  /**
   * @FIXME weird parameter name (`bool`)
   */
  disableApplication(bool = false) {
    ApplicationState.gui.app.disabled = bool;
  };

  /**
   * @param {string} language
   */
  setApplicationLanguage(language = 'en') {
    /**
     * @deprecated Since v3.8. Will be deleted in v4.x. Use ApplicationState.language instead
     */
    ApplicationState.lng      = language;
    ApplicationState.language = language;
  };

  getApplicationLanguage() {
    return ApplicationState.language;
  };

  setOnline() {
    ApplicationState.online = true;
  };

  setOffline() {
    ApplicationState.online = false;
  };

  isOnline() {
    return ApplicationState.online;
  };

  /**
   * @param {string} id
   * @param {Object} data
   */
  async setOfflineItem(id, data = {}) {
    this.setLocalItem({ id, data });
  };

  setLocalItem({ id, data } = {}) {
    try { window.localStorage.setItem(id, JSON.stringify(data)); }
    catch(e) { console.warn(e); return e; }
  };

  /**
   * @param {string} id
   */
  removeLocalItem(id) {
    window.localStorage.removeItem(id);
  };

  /**
   * @param {string} id
   */
  getLocalItem(id) {
    const item = window.localStorage.getItem(id);
    return item ? JSON.parse(item) : undefined;
  };

  /**
   * @param {string} id
   */
  getOfflineItem(id) {
    return this.getLocalItem(id);
  };

  /**
   * @param {string} id
   */
  removeOfflineItem(id) {
    this.removeLocalItem(id);
  };

  /**
   * @returns {boolean} whether application is loaded within an <iframe>
   */
  isIframe() {
    return ApplicationState.iframe;
  };

  /**
   * get config
   */
  getConfig() {
    return this._config;
  };

  /**
   * @param {Object} config
   */
  setConfig(config = {}) {
    this._config = config;
  };

  /**
   * @returns {string} application proxy url
   */
  getProxyUrl() {
    return `${this._initConfig.proxyurl}`;
  };

  /**
   * Get Interface OWS Url
   */
  getInterfaceOwsUrl() {
    return `${this._initConfig.interfaceowsurl}`;
  };

  /**
   * Create an application config object
   * @param initConfig
   * @returns {Promise<string|{terms_of_use_link, projects: ([{gid: string, layers: [{qgs_layer_id: string, fields: [string, string, string]}], type: string}, {gid: string, layers: [{qgs_layer_id: string, fields: [string, string, string]}, {qgs_layer_id: string, fields: [string]}, {qgs_layer_id: string, fields: [string]}], type: string}, {gid: string, layers: [{qgs_layer_id: string, fields: [string, string, string]}, {qgs_layer_id: string, fields: [string]}], type: string}]|{gid: string, layers: [{qgs_layer_id: string, fields: [string, string, string]}], type: string}|[]), maxscale: (null|ProjectsRegistry.setProjects.config.maxscale), mediaurl: *, plugins: *, mapcontrols: *, tools: *, resourcesurl: *, initproject, urls: *, credits: *, getWmsUrl(*): string, _i18n: ({resources: {se: {translation: {cancel: string, no: string, error_map_loading: string, data: string, catalog: string, legend: string, copy_form_data: string, check_internet_connection_or_server_admin: string, show: string, save: string, back: string, server_error: string, mapcontrols: {area: {tooltip: string}, nominatim: {noresults: string, placeholder: string, notresponseserver: string}, add_layer_control: {select_csv_separator: string, select_csv_y_field: string, select_field_to_show: string, select_projection: string, header: string, select_color: string, select_csv_x_field: string, drag_layer: string}, query: {input_relation: string}, length: {tooltip: string}, screenshot: {error: string}, geolocations: {error: string}}, no_results: string, tools: string, changemap: string, default: string, logout: string, search: string, copy_form_data_from_feature: string, credits: {g3wSuiteFramework: string, productOf: string, g3wSuiteDescription: string}, sidebar: {}, close: string, exitnosave: string, sign_in: string, info: {link_button: string, open_link: string, server_error: string, title: string, no_results: string}, add: string, backto: string, yes: string, create_print: string, server_saver_error: string, tree: string, paste_form_data: string, no_other_projects: string, dosearch: string, baselayers: string, component: string, print: string, hide: string, annul: string, layer_selection_filter: {tools: {filter: string, nofilter: string, invert: string, show_features_on_map: string, clear: string}}, layer_is_added: string, catalog_items: {helptext: string, contextmenu: {vector_color_menu: string, show_metadata: string, open_attribute_table: string, styles: string, zoomtolayer: string}}, dataTable: {next: string, nodatafilterd: string, previous: string, no_data: string, infoFiltered: string, lengthMenu: string, info: string}, nobaselayer: string, could_not_load_vector_layers: string, street_search: string, sdk: {search: {all: string, layer_not_querable: string, error_loading: string, autocomplete: {inputshort: {pre: string, post: string}}, searching: string, layer_not_searchable: string, no_results: string}, print: {fids_instruction: string, help: string, no_layers: string, rotation: string, format: string, scale: string, fids_example: string, download_image: string}, metadata: {groups: {general: {title: string, fields: {fees: string, keywords: string, subfields: {contactinformation: {contactperson: string, contactvoicetelephone: string, personprimary: string, contactorganization: string, ContactOrganization: string, ContactPosition: string, contactposition: string, contactelectronicmailaddress: string, ContactPerson: string}}, accessconstraints: string, name: string, description: string, contactinformation: string, wms_url: string, abstract: string, title: string}}, layers: {groups: {general: string, spatial: string}, title: string, fields: {subfields: {dataurl: string, metadataurl: string, keywords: string, crs: string, bbox: string, name: string, attribution: string, attributes: string, source: string, abstract: string, title: string, geometrytype: string}, layers: string}}, spatial: {title: string, fields: {extent: string, crs: string}}}, title: string}, form: {footer: {required_fields: string}, inputs: {date: string, input_validation_exclude_values: string, input_validation_max_field: string, string: string, varchar: string, textarea: string, input_validation_min_field: string, integer: string, float: string, input_validation_error: string, messages: {errors: {picklayer: string}}, input_validation_mutually_exclusive: string, text: string, bigint: string, tooltips: {picklayer: string, lonlat: string}, table: string}, messages: {qgis_input_widget_relation: string}, loading: string}, catalog: {menu: {download: {gpkg: string, csv: string, shp: string, gpx: string, xls: string}, wms: {copied: string, copy: string, title: string}}}, querybuilder: {search: {edit: string, run: string, delete: string, info: string}, additem: string, messages: {changed: string, number_of_features: string}, panel: {button: {all: string, test: string, save: string, clear: string, run: string, manual: string}, expression: string, operators: string, values: string, layers: string, fields: string}, error_run: string, delete: string, error_test: string}, mapcontrols: {querybypolygon: {help: string, tooltip: string, no_geometry: string}, measures: {area: {help: string, tooltip: string}, length: {help: string, tooltip: string}}, querybybbox: {help: string, tooltip: string, nolayers_visible: string}, addlayer: {tooltip: string, messages: {csv: {warning: string}}}, query: {tooltip: string, actions: {add_features_to_results: {hint: string}, download_features_csv: {hint: string}, atlas: {hint: string}, download_xls: {hint: string}, relations_charts: {hint: string}, zoom_to_feature: {hint: string}, download_features_gpkg: {hint: string}, zoom_to_features_extent: {hint: string}, download_csv: {hint: string}, download_features_shapefile: {hint: string}, download_features_xls: {hint: string}, download_shapefile: {hint: string}, add_selection: {hint: string}, download_gpx: {hint: string}, remove_feature_from_results: {hint: string}, download_features_gpx: {hint: string}, relations: {hint: string}, download_gpkg: {hint: string}}}, scale: {no_valid_scale: string}, geolocation: {tooltip: string}}, wps: {list_process: string, tooltip: string}, relations: {no_relations_found: string, relation_data: string, back_to_relations: string, list_of_relations_feature: string, error_missing_father_field: string}, errors: {add_external_layer: string, layers: {load: string}, unsupported_format: string}, tooltips: {download_csv: string, download_shapefile: string, atlas: string, copy_map_extent_url: string, download_gpx: string, download_xls: string, relations: {row_to_form: string, form_to_row: string}, download_gpkg: string, show_chart: string}}}}, fi: {translation: {cancel: string, no: string, error_map_loading: string, data: string, catalog: string, legend: string, copy_form_data: string, check_internet_connection_or_server_admin: string, show: string, save: string, back: string, server_error: string, mapcontrols: {area: {tooltip: string}, nominatim: {noresults: string, placeholder: string, notresponseserver: string}, add_layer_control: {select_csv_separator: string, select_csv_y_field: string, select_field_to_show: string, select_projection: string, header: string, select_color: string, select_csv_x_field: string, drag_layer: string}, query: {input_relation: string}, length: {tooltip: string}, screenshot: {error: string}, geolocations: {error: string}}, no_results: string, tools: string, changemap: string, default: string, logout: string, search: string, copy_form_data_from_feature: string, credits: {g3wSuiteFramework: string, productOf: string, g3wSuiteDescription: string}, sidebar: {}, close: string, exitnosave: string, sign_in: string, info: {link_button: string, open_link: string, server_error: string, title: string, no_results: string}, add: string, backto: string, yes: string, create_print: string, server_saver_error: string, tree: string, paste_form_data: string, no_other_projects: string, dosearch: string, baselayers: string, component: string, print: string, hide: string, annul: string, layer_selection_filter: {tools: {filter: string, nofilter: string, invert: string, show_features_on_map: string, clear: string}}, layer_is_added: string, catalog_items: {helptext: string, contextmenu: {vector_color_menu: string, show_metadata: string, open_attribute_table: string, styles: string, zoomtolayer: string}}, dataTable: {next: string, nodatafilterd: string, previous: string, no_data: string, infoFiltered: string, lengthMenu: string, info: string}, nobaselayer: string, could_not_load_vector_layers: string, street_search: string, sdk: {search: {all: string, layer_not_querable: string, error_loading: string, autocomplete: {inputshort: {pre: string, post: string}}, searching: string, layer_not_searchable: string, no_results: string}, print: {fids_instruction: string, help: string, no_layers: string, rotation: string, format: string, scale: string, fids_example: string, download_image: string}, metadata: {groups: {general: {title: string, fields: {fees: string, keywords: string, subfields: {contactinformation: {contactperson: string, contactvoicetelephone: string, personprimary: string, contactorganization: string, ContactOrganization: string, ContactPosition: string, contactposition: string, contactelectronicmailaddress: string, ContactPerson: string}}, accessconstraints: string, name: string, description: string, contactinformation: string, wms_url: string, abstract: string, title: string}}, layers: {groups: {general: string, spatial: string}, title: string, fields: {subfields: {dataurl: string, metadataurl: string, keywords: string, crs: string, bbox: string, name: string, attribution: string, attributes: string, source: string, abstract: string, title: string, geometrytype: string}, layers: string}}, spatial: {title: string, fields: {extent: string, crs: string}}}, title: string}, workflow: {next: string, steps: {title: string}}, form: {footer: {required_fields: string}, inputs: {date: string, input_validation_exclude_values: string, input_validation_max_field: string, string: string, varchar: string, textarea: string, input_validation_min_field: string, integer: string, float: string, input_validation_error: string, messages: {errors: {picklayer: string}}, input_validation_mutually_exclusive: string, text: string, bigint: string, tooltips: {picklayer: string, lonlat: string}, table: string}, messages: {qgis_input_widget_relation: string}, loading: string}, catalog: {menu: {download: {gpkg: string, csv: string, shp: string, gpx: string, xls: string}, wms: {copied: string, copy: string, title: string}}}, querybuilder: {search: {edit: string, run: string, delete: string, info: string}, additem: string, messages: {changed: string, number_of_features: string}, panel: {button: {all: string, test: string, save: string, clear: string, run: string, manual: string}, expression: string, operators: string, values: string, layers: string, fields: string}, error_run: string, delete: string, error_test: string}, mapcontrols: {querybypolygon: {help: string, tooltip: string, no_geometry: string}, measures: {area: {help: string, tooltip: string}, length: {help: string, tooltip: string}}, querybybbox: {help: string, tooltip: string, nolayers_visible: string}, addlayer: {tooltip: string, messages: {csv: {warning: string}}}, query: {tooltip: string, actions: {add_features_to_results: {hint: string}, download_features_csv: {hint: string}, atlas: {hint: string}, download_xls: {hint: string}, relations_charts: {hint: string}, zoom_to_feature: {hint: string}, download_features_gpkg: {hint: string}, zoom_to_features_extent: {hint: string}, download_csv: {hint: string}, download_features_shapefile: {hint: string}, download_features_xls: {hint: string}, download_shapefile: {hint: string}, add_selection: {hint: string}, download_gpx: {hint: string}, remove_feature_from_results: {hint: string}, download_features_gpx: {hint: string}, relations: {hint: string}, download_gpkg: {hint: string}}}, scale: {no_valid_scale: string}, geolocation: {tooltip: string}}, wps: {list_process: string, tooltip: string}, relations: {no_relations_found: string, relation_data: string, back_to_relations: string, list_of_relations_feature: string, error_missing_father_field: string}, errors: {add_external_layer: string, layers: {load: string}, unsupported_format: string}, tooltips: {download_csv: string, download_shapefile: string, atlas: string, copy_map_extent_url: string, download_gpx: string, download_xls: string, relations: {row_to_form: string, form_to_row: string}, download_gpkg: string, show_chart: string}}}}, en: {translation: {cancel: string, no: string, error_map_loading: string, data: string, catalog: string, legend: string, copy_form_data: string, check_internet_connection_or_server_admin: string, show: string, save: string, back: string, server_error: string, mapcontrols: {area: {tooltip: string}, nominatim: {noresults: string, placeholder: string, notresponseserver: string}, add_layer_control: {select_csv_separator: string, select_csv_y_field: string, select_field_to_show: string, select_projection: string, header: string, select_color: string, select_csv_x_field: string, drag_layer: string}, query: {input_relation: string}, length: {tooltip: string}, screenshot: {error: string}, geolocations: {error: string}}, no_results: string, tools: string, changemap: string, default: string, logout: string, search: string, copy_form_data_from_feature: string, credits: {g3wSuiteFramework: string, productOf: string, g3wSuiteDescription: string}, sidebar: {}, close: string, exitnosave: string, sign_in: string, info: {link_button: string, open_link: string, server_error: string, title: string, no_results: string}, add: string, backto: string, yes: string, create_print: string, server_saver_error: string, tree: string, paste_form_data: string, no_other_projects: string, dosearch: string, baselayers: string, component: string, print: string, hide: string, annul: string, layer_selection_filter: {tools: {filter: string, nofilter: string, invert: string, show_features_on_map: string, clear: string}}, layer_is_added: string, catalog_items: {helptext: string, contextmenu: {vector_color_menu: string, show_metadata: string, open_attribute_table: string, styles: string, zoomtolayer: string}}, dataTable: {next: string, nodatafilterd: string, previous: string, no_data: string, infoFiltered: string, lengthMenu: string, info: string}, nobaselayer: string, could_not_load_vector_layers: string, street_search: string, sdk: {search: {all: string, layer_not_querable: string, error_loading: string, autocomplete: {inputshort: {pre: string, post: string}}, searching: string, layer_not_searchable: string, no_results: string}, print: {fids_instruction: string, help: string, no_layers: string, rotation: string, format: string, scale: string, fids_example: string, download_image: string}, metadata: {groups: {general: {title: string, fields: {fees: string, keywords: string, subfields: {contactinformation: {contactperson: string, contactvoicetelephone: string, personprimary: string, contactorganization: string, ContactOrganization: string, ContactPosition: string, contactposition: string, contactelectronicmailaddress: string, ContactPerson: string}}, accessconstraints: string, name: string, description: string, contactinformation: string, wms_url: string, abstract: string, title: string}}, layers: {groups: {general: string, spatial: string}, title: string, fields: {subfields: {dataurl: string, metadataurl: string, keywords: string, crs: string, bbox: string, name: string, attribution: string, attributes: string, source: string, abstract: string, title: string, geometrytype: string}, layers: string}}, spatial: {title: string, fields: {extent: string, crs: string}}}, title: string}, workflow: {next: string, steps: {title: string}}, form: {footer: {required_fields: string}, inputs: {date: string, input_validation_exclude_values: string, input_validation_max_field: string, string: string, varchar: string, textarea: string, input_validation_min_field: string, integer: string, float: string, input_validation_error: string, messages: {errors: {picklayer: string}}, input_validation_mutually_exclusive: string, text: string, bigint: string, tooltips: {picklayer: string, lonlat: string}, table: string}, messages: {qgis_input_widget_relation: string}, loading: string}, catalog: {menu: {download: {gpkg: string, csv: string, shp: string, gpx: string, xls: string}, wms: {copied: string, copy: string, title: string}}}, querybuilder: {search: {edit: string, run: string, delete: string, info: string}, additem: string, messages: {changed: string, number_of_features: string}, panel: {button: {all: string, test: string, save: string, clear: string, run: string, manual: string}, expression: string, operators: string, values: string, layers: string, fields: string}, error_run: string, delete: string, error_test: string}, mapcontrols: {querybypolygon: {help: string, tooltip: string, no_geometry: string}, measures: {area: {help: string, tooltip: string}, length: {help: string, tooltip: string}}, querybybbox: {help: string, tooltip: string, nolayers_visible: string}, addlayer: {tooltip: string, messages: {csv: {warning: string}}}, query: {tooltip: string, actions: {add_features_to_results: {hint: string}, download_features_csv: {hint: string}, atlas: {hint: string}, download_xls: {hint: string}, relations_charts: {hint: string}, zoom_to_feature: {hint: string}, download_features_gpkg: {hint: string}, zoom_to_features_extent: {hint: string}, download_csv: {hint: string}, download_features_shapefile: {hint: string}, download_features_xls: {hint: string}, download_shapefile: {hint: string}, add_selection: {hint: string}, download_gpx: {hint: string}, remove_feature_from_results: {hint: string}, download_features_gpx: {hint: string}, relations: {hint: string}, download_gpkg: {hint: string}}}, scale: {no_valid_scale: string}, geolocation: {tooltip: string}}, wps: {list_process: string, tooltip: string}, relations: {no_relations_found: string, relation_data: string, back_to_relations: string, list_of_relations_feature: string, error_missing_father_field: string}, errors: {add_external_layer: string, layers: {load: string}, unsupported_format: string}, tooltips: {download_csv: string, download_shapefile: string, atlas: string, copy_map_extent_url: string, download_gpx: string, download_xls: string, relations: {row_to_form: string, form_to_row: string}, download_gpkg: string, show_chart: string}}}}, it: {translation: {cancel: string, no: string, error_map_loading: string, data: string, catalog: string, legend: string, copy_form_data: string, check_internet_connection_or_server_admin: string, show: string, save: string, back: string, server_error: string, mapcontrols: {area: {tooltip: string}, nominatim: {noresults: string, placeholder: string, notresponseserver: string}, add_layer_control: {select_csv_separator: string, select_csv_y_field: string, select_field_to_show: string, select_projection: string, header: string, select_color: string, select_csv_x_field: string, drag_layer: string}, query: {input_relation: string}, length: {tooltip: string}, screenshot: {error: string}, geolocations: {title: string, error: string}}, no_results: string, tools: string, changemap: string, default: string, logout: string, search: string, copy_form_data_from_feature: string, credits: {g3wSuiteFramework: string, productOf: string, g3wSuiteDescription: string}, sidebar: {}, close: string, exitnosave: string, sign_in: string, info: {link_button: string, open_link: string, server_error: string, title: string, no_results: string}, add: string, backto: string, yes: string, create_print: string, server_saver_error: string, tree: string, paste_form_data: string, no_other_projects: string, dosearch: string, baselayers: string, component: string, print: string, hide: string, annul: string, layer_selection_filter: {tools: {filter: string, nofilter: string, invert: string, show_features_on_map: string, clear: string}}, layer_is_added: string, catalog_items: {helptext: string, contextmenu: {vector_color_menu: string, show_metadata: string, open_attribute_table: string, styles: string, zoomtolayer: string}}, dataTable: {next: string, nodatafilterd: string, previous: string, infoFiltered: string, lengthMenu: string, info: string}, nobaselayer: string, could_not_load_vector_layers: string, street_search: string, sdk: {search: {all: string, layer_not_querable: string, error_loading: string, autocomplete: {inputshort: {pre: string, post: string}}, searching: string, layer_not_searchable: string, no_results: string}, print: {fids_instruction: string, help: string, no_layers: string, rotation: string, format: string, scale: string, fids_example: string, download_image: string}, metadata: {groups: {general: {title: string, fields: {fees: string, keywords: string, subfields: {contactinformation: {contactperson: string, contactvoicetelephone: string, personprimary: string, contactorganization: string, ContactOrganization: string, ContactPosition: string, contactposition: string, contactelectronicmailaddress: string, ContactPerson: string}}, accessconstraints: string, name: string, description: string, contactinformation: string, wms_url: string, abstract: string, title: string}}, layers: {groups: {general: string, spatial: string}, title: string, fields: {subfields: {dataurl: string, metadataurl: string, keywords: string, crs: string, bbox: string, name: string, attribution: string, attributes: string, source: string, abstract: string, title: string, geometrytype: string}, layers: string}}, spatial: {title: string, fields: {extent: string, crs: string}}}, title: string}, workflow: {next: string, steps: {title: string}}, form: {footer: {required_fields: string}, inputs: {date: string, input_validation_exclude_values: string, input_validation_max_field: string, string: string, varchar: string, textarea: string, input_validation_min_field: string, integer: string, float: string, input_validation_error: string, messages: {errors: {picklayer: string}}, input_validation_mutually_exclusive: string, text: string, bigint: string, tooltips: {picklayer: string, lonlat: string}, table: string}, messages: {qgis_input_widget_relation: string}, loading: string}, catalog: {menu: {download: {gpkg: string, csv: string, shp: string, gpx: string, xls: string}, wms: {copied: string, copy: string, title: string}}}, querybuilder: {search: {edit: string, run: string, delete: string, info: string}, additem: string, messages: {changed: string, number_of_features: string}, panel: {button: {all: string, test: string, save: string, clear: string, run: string, manual: string}, expression: string, operators: string, values: string, layers: string, fields: string}, error_run: string, delete: string, error_test: string}, mapcontrols: {querybypolygon: {help: string, tooltip: string, no_geometry: string}, measures: {area: {help: string, tooltip: string}, length: {help: string, tooltip: string}}, querybybbox: {help: string, tooltip: string, nolayers_visible: string}, addlayer: {tooltip: string, messages: {csv: {warning: string}}}, query: {tooltip: string, actions: {add_features_to_results: {hint: string}, download_features_csv: {hint: string}, atlas: {hint: string}, download_xls: {hint: string}, relations_charts: {hint: string}, zoom_to_feature: {hint: string}, download_features_gpkg: {hint: string}, zoom_to_features_extent: {hint: string}, download_csv: {hint: string}, download_features_shapefile: {hint: string}, download_features_xls: {hint: string}, download_shapefile: {hint: string}, add_selection: {hint: string}, download_gpx: {hint: string}, remove_feature_from_results: {hint: string}, download_features_gpx: {hint: string}, relations: {hint: string}, download_gpkg: {hint: string}}}, scale: {no_valid_scale: string}, geolocation: {tooltip: string}}, wps: {list_process: string, tooltip: string}, relations: {no_relations_found: string, relation_data: string, back_to_relations: string, list_of_relations_feature: string, error_missing_father_field: string}, errors: {add_external_layer: string, layers: {load: string}, unsupported_format: string}, tooltips: {zoom_to_features_extent: string, download_csv: string, download_shapefile: string, atlas: string, copy_map_extent_url: string, download_gpx: string, download_xls: string, relations: {row_to_form: string, form_to_row: string}, download_gpkg: string, show_chart: string}}}}}}|{resources: *}), views: (*|{}), group: *, vectorurl: *, debug: boolean, crs: *, apptitle: (string), header_custom_links, i18n: *, overviewproject: (*|null), layout: (*|{}), logo_img: *, baselayers: (string|vueComponentOptions.computed.baselayers|{count: number}|*), logo_link: *, background_color, terms_of_use_text: *, main_map_title: *, getProjectConfigUrl(*): string, user: (*|null), minscale: ProjectsRegistry.setProjects.config.minscale}>}
   */
  async createApplicationConfig(initConfig) {
    const config = { ...appConfig };
    try {

      initConfig = initConfig ? initConfig : await this.obtainInitConfig({
        initConfigUrl:  `${appConfig.server.urls.initconfig}`
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
  };

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
  };

  async obtainInitConfig({ initConfigUrl, url, host } = {}) {
    if (this._initConfigUrl) {
      this.clearInitConfig();
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
      if (projectPath) {
        // get configuration from server
        this._initConfig = await this.getInitConfig(`${host || ''}${this.baseurl}${this._initConfigUrl}/${projectPath}`);
      }
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    } finally {
      window.initConfig = this._initConfig;
      this.emit('initconfig', this._initConfig);
      this.setInitVendorKeys(this._initConfig);
    }
    return this._initConfig;
  };

  // method to get initial application configuration
  getInitConfig(url) {
    return new Promise((resolve, reject) => {
      if (this._initConfig) { resolve(this._initConfig) }
      else {
        XHR.get({url})
          .then(initConfig => resolve(initConfig))
          .catch(e => { console.warn(e); reject(e) });
      }
    })
  };

  /**
   * Fetch configuration from server
   */
  getInitConfigUrl() {
    return this._initConfigUrl;
  };

  setInitConfigUrl(initConfigUrl) {
    this._initConfigUrl = initConfigUrl;
  };

  /**
   * set EPSG of Application (e.g., during a WMS request for table layer)
   */
  setEPSGApplication(project) {
    ApplicationState.map.epsg = project.state.crs.epsg;
  };

  /**
   * Set application User
   */
  setApplicationUser(user) {
    ApplicationState.user = user;
  };

  /**
   * Get application User
   */
  getApplicationUser() {
    return ApplicationState.user;
  };

  /**
   * Bootstrap application (when called init)
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
   * 10 - initialize DataRouterService
   */
  bootstrap() {
    return new Promise((resolve, reject) => {
      this.setupI18n();
      const timeout = setTimeout(() => { reject('Timeout') }, TIMEOUT);
      if (!ApplicationState.ready) {
        $.when(
          ProjectsRegistry.init(this._config),
          ApiService.init(this._config)
        ).then(() => {
          clearTimeout(timeout);
          this.registerOnlineOfflineEvent();
          this.emit('ready');

          ApplicationState.ready = this.initialized = true;
          const project          = ProjectsRegistry.getCurrentProject();
          this._gid              = project.getGid();

          this.setEPSGApplication(project);
          if (ApplicationState.iframe) { this.startIFrameService({ project }) }
          DataRouterService.init();
          this.initLocalItems();
          resolve(true);
        }).fail(e => { console.warn(e); reject(e) })
      }
    })
  };

  /**
   * Run the following tasks after boostrap:
   *
   * 1 - check for `this.complete`
   * 3 - initialize PluginsRegistry (once and after ProjectsRegistry and ApiService are initialized)
   * 4 - trigger 'complete' event
   */
  async postBootstrap() {
    if (!this.complete) {
      try {
        await PluginsRegistry.init({
          project:            ProjectsRegistry.getCurrentProject(),
          pluginsBaseUrl:     this._config.urls.staticurl,
          pluginsConfigs:     this._config.plugins,
          otherPluginsConfig: ProjectsRegistry.getCurrentProject().getState()
        });
      } catch(e) {
        console.warn(e);
      } finally {
        this.complete = true;
        this.emit('complete');
      }
    }
  };

  /**
   * iframeservice
   */
  startIFrameService({ project } = {}) {
    const iframeService = require('services/iframe').default;
    iframeService.init({ project });
  };

  registerWindowEvent({ evt, cb } = {}) {
    window.addEventListener(evt, cb);
  };

  unregisterWindowEvent({ evt, cb } = {}) {
    window.removeEventListener(evt, cb)
  };

  registerService(el, service) {
    this._applicationServices[el] = service;
  };

  unregisterService(el) {
    delete this._applicationServices[el];
  };

  getApplicationService(type) {
    return this._applicationServices[type];
  };

  getService(el) {
    return this._applicationServices[el];
  };

  errorHandler(error) {};

  /**
   * clear initConfig
   */
  clearInitConfig() {
    window.initConfig = this._initConfig = null;
  };

  setInitVendorKeys(config = {}) {
    const vendorkeys = config.group.vendorkeys || {};
    config.group.baselayers
        .forEach(baselayer => {
          if (baselayer.apikey) {
            vendorkeys[baselayer.servertype ? baselayer.servertype.toLowerCase() : null] = baselayer.apikey
          }
        });
    this.setVendorKeys(vendorkeys);
  };

  setVendorKeys(keys = {}) {
    Object.keys(keys).forEach(k => ApplicationState.keys.vendorkeys[k] = keys[k])
  };

  /**
   * change View
   * @param { Boolean } bool
   */
  changeProjectView(bool) {
    ApplicationState.changeProjectview = bool;
  };

  isProjectViewChanging() {
    return ApplicationState.changeProjectview;
  };

  /**
   * It used by plugin https://github.com/g3w-suite/g3w-client-plugin-openrouteservice
   */
  reloadCurrentProject() {
    return this.changeProject({ gid: ProjectsRegistry.getCurrentProject().getGid() });
  };

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
    const d          = $.Deferred();
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
    d.resolve();
    return d.promise();
  };

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

  };

  removeLayout(who) {
    if (who) { delete ApplicationState.gui.layout[who] }
  };

  setCurrentLayout(who = 'app') {
    ApplicationState.gui.layout.__current = who;
  };

  getCurrentLayout() {
    return ApplicationState.gui.layout[ApplicationState.gui.layout.__current];
  };

  getCurrentLayoutName() {
    return ApplicationState.gui.layout.__current;
  };

  cloneLayout(which = 'app') {
    return _cloneDeep(ApplicationState.gui.layout[which])
  };

  clear() {
    this.unregisterOnlineOfflineEvent();
  };

  /**
   * Initialize each local item if not yet initialized
   *
   * @since v3.8
   */
  initLocalItems() {
    Object
      .keys(LOCAL_ITEM_IDS)
      .forEach(id => { if (undefined === this.getLocalItem(id)) { this.setLocalItem({ id, data: LOCAL_ITEM_IDS[id].value }); } })
  };

});