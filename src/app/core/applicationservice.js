import appConfig from 'config';
import utils from 'core/utils/utils';
// LOAD DEVELOPMENT CONFIGURATION
import dev from 'dev/index';
import {TIMEOUT} from "constant";
import ApplicationState from './applicationstate';
import G3WObject from 'core/g3wobject';
import GUI from 'gui/gui';
import iframeService from 'core/iframe/routerservice';
import {init as i18ninit, changeLanguage}  from 'core/i18n/i18n.service';
import ApiService from 'core/apiservice';
import RouterDataService from 'core/data/routerservice';
import ProjectsRegistry from 'core/project/projectsregistry';
import PluginsRegistry from 'core/plugin/pluginsregistry';
const G3W_VERSION = "{G3W_VERSION}";
let production = false;

//Manage Application
class ApplicationService extends G3WObject {
  constructor() {
    super({
      setters: {
        changeProject({gid, host}={}) {
          return this._changeProject({gid, host})
        },
        online() {
          this.setOnline();
        },
        offline() {
          this.setOffline();
        },
        setFilterToken(filtertoken) {
          this._setFilterToken(filtertoken)
        }
      }
    });
    this.version = G3W_VERSION.indexOf("G3W_VERSION") === -1 ? G3W_VERSION  : "";
    ApplicationState.iframe = window.top !== window.self;
    ApplicationState.online = navigator.onLine;
    ApplicationState.ismobile= isMobile.any;
    this.complete = false;
    this.baseurl = '/'; // set base url
    this.download_caller_id = null;
    // store all services sidebar etc..
    this._applicationServices = {};
    this.config = {};
    this._initConfigUrl = null;
    this._initConfig = null;
    this._groupId = null;
    this._gid = null;
    // on obtain init config (also for change project)
    this.on('initconfig', ()=>{
      // can put the configuration project here
      this.setApplicationUser(initConfig.user);
    });
  }
  // init application
  async init() {
    try {
      dev.init({
        ApplicationService: this
      });
      const config = await this.createApplicationConfig();
      this.setConfig(config);
      this.setLayout('app', config.layout);
      return await this.bootstrap();
    } catch(error) {
      const browserLng = navigator && navigator.language || 'en';
      const language = appConfig.supportedLng.find(lng => browserLng.indexOf(lng) !== -1);
      return Promise.reject({
        error,
        language
      })
    }
  };


  /**
   * setup Internalization
   */
  setupI18n() {
    const lngConfig = this._config._i18n;
    lngConfig.appLanguages = this._config.i18n.map(lngLabel => lngLabel[0]);
    this.setApplicationLanguage(lngConfig.lng);
    //setup internalization for translation
    i18ninit(lngConfig);
    this._groupId = this._config.group.slug || this._config.group.name.replace(/\s+/g, '-').toLowerCase();
    // set accept-language reuest header based on config language
    const userLanguage = this._config.user.i18n || 'en';
    $.ajaxSetup({
      beforeSend(jqXHR) {
        jqXHR.setRequestHeader('Accept-Language', userLanguage);
      }
    });
  };

  getCurrentProject() {
    return ProjectsRegistry.getCurrentProject();
  };

  /**
   *
   * @param bool
   * @param download_caller_id
   * @returns {null}
   */
  setDownload(bool=false, download_caller_id) {
    if (download_caller_id) {
      if (!bool && download_caller_id && this.download_caller_id === download_caller_id) {
        ApplicationState.download = false;
        this.download_caller_id = null;
      } else if (bool && this.download_caller_id === null) {
        ApplicationState.download = bool;
        this.download_caller_id = uniqueId();
      }
    } else ApplicationState.download = bool;
    return this.download_caller_id;
  };

  getDownload() {
    return ApplicationState.download;
  };

  loadingPlugin(plugin) {
    ApplicationState.plugins.push(plugin);
  };

  /*
  * plugin: name of plugin
  * ready: Boolen - true if loaded and ready otherwise non ready - TO DO
  * */
  loadedPlugin(plugin, ready) {
    ApplicationState.plugins = ApplicationState.plugins.filter(_plugin => _plugin !== plugin);
  };

  _setFilterToken(filtertoken) {
    ApplicationState.tokens.filtertoken = filtertoken;
  };

  getFilterToken() {
    return ApplicationState.tokens.filtertoken;
  };

  changeLanguage(lng) {
    changeLanguage(lng);
    ApplicationState.lng = lng;
    const pathname = window.location.pathname;
    const pathArray = pathname.split('/');
    pathArray[1] = lng;
    history.replaceState(null, null, pathArray.join('/'));
  };

  registerOnlineOfflineEvent() {
    this.registerWindowEvent({
      evt: 'online',
      cb:() => this.online()
    });

    this.registerWindowEvent({
      evt: 'offline',
      cb:() => this.offline()
    })
  };

  getBaseLayerId() {
    return ApplicationState.baseLayerId;
  };

  setBaseLayerId(baseLayerId) {
    ApplicationState.baseLayerId = baseLayerId;
  };

  registerLeavePage({bool=false, message=''}={}) {
    const _return = !bool ? undefined : bool;
    window.onbeforeunload = function(event) {
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

  disableApplication(bool=false) {
    ApplicationState.gui.app.disabled = bool;
  };

  setApplicationLanguage(lng='en') {
    ApplicationState.lng = lng;
  };

  getApplicationLanguage() {
    return ApplicationState.lng;
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

  async setOfflineItem(id, data={}) {
    this.setLocalItem({
      id,
      data
    })
  };

  setLocalItem({id, data}={}) {
    try {
      const item = JSON.stringify(data);
      window.localStorage.setItem(id, item);
    } catch(error) {
      return error;
    }
  };

  removeLocalItem(id) {
    window.localStorage.removeItem(id);
  };

  getLocalItem(id) {
    const item = window.localStorage.getItem(id);
    if (item) return JSON.parse(item);
    else return undefined;
  };

  getOfflineItem(id) {
    return this.getLocalItem(id);
  };

  removeOfflineItem(id) {
    this.removeLocalItem(id);
  };

  //check if is in Iframe
  isIframe() {
    return ApplicationState.iframe;
  };

  // get config
  getConfig() {
    return this._config;
  };

  setConfig(config={}) {
    this._config = config;
  };

  //application proxy url
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
   * Create application config object
   * @param initConfig
   * @returns {Promise<string|{terms_of_use_link, projects: ([{gid: string, layers: [{qgs_layer_id: string, fields: [string, string, string]}], type: string}, {gid: string, layers: [{qgs_layer_id: string, fields: [string, string, string]}, {qgs_layer_id: string, fields: [string]}, {qgs_layer_id: string, fields: [string]}], type: string}, {gid: string, layers: [{qgs_layer_id: string, fields: [string, string, string]}, {qgs_layer_id: string, fields: [string]}], type: string}]|{gid: string, layers: [{qgs_layer_id: string, fields: [string, string, string]}], type: string}|[]), maxscale: (null|ProjectsRegistry.setProjects.config.maxscale), mediaurl: *, plugins: *, mapcontrols: *, tools: *, resourcesurl: *, initproject, urls: *, credits: *, getWmsUrl(*): string, _i18n: ({resources: {se: {translation: {cancel: string, no: string, error_map_loading: string, data: string, catalog: string, legend: string, copy_form_data: string, check_internet_connection_or_server_admin: string, show: string, save: string, back: string, server_error: string, mapcontrols: {area: {tooltip: string}, nominatim: {noresults: string, placeholder: string, notresponseserver: string}, add_layer_control: {select_csv_separator: string, select_csv_y_field: string, select_field_to_show: string, select_projection: string, header: string, select_color: string, select_csv_x_field: string, drag_layer: string}, query: {input_relation: string}, length: {tooltip: string}, screenshot: {error: string}, geolocations: {error: string}}, no_results: string, tools: string, changemap: string, default: string, logout: string, search: string, copy_form_data_from_feature: string, credits: {g3wSuiteFramework: string, productOf: string, g3wSuiteDescription: string}, sidebar: {}, close: string, exitnosave: string, sign_in: string, info: {link_button: string, open_link: string, server_error: string, title: string, no_results: string}, add: string, backto: string, yes: string, create_print: string, server_saver_error: string, tree: string, paste_form_data: string, no_other_projects: string, dosearch: string, baselayers: string, component: string, print: string, hide: string, annul: string, layer_selection_filter: {tools: {filter: string, nofilter: string, invert: string, show_features_on_map: string, clear: string}}, layer_is_added: string, catalog_items: {helptext: string, contextmenu: {vector_color_menu: string, show_metadata: string, open_attribute_table: string, styles: string, zoomtolayer: string}}, dataTable: {next: string, nodatafilterd: string, previous: string, no_data: string, infoFiltered: string, lengthMenu: string, info: string}, nobaselayer: string, could_not_load_vector_layers: string, street_search: string, sdk: {search: {all: string, layer_not_querable: string, error_loading: string, autocomplete: {inputshort: {pre: string, post: string}}, searching: string, layer_not_searchable: string, no_results: string}, print: {fids_instruction: string, help: string, no_layers: string, rotation: string, format: string, scale: string, fids_example: string, download_image: string}, metadata: {groups: {general: {title: string, fields: {fees: string, keywords: string, subfields: {contactinformation: {contactperson: string, contactvoicetelephone: string, personprimary: string, contactorganization: string, ContactOrganization: string, ContactPosition: string, contactposition: string, contactelectronicmailaddress: string, ContactPerson: string}}, accessconstraints: string, name: string, description: string, contactinformation: string, wms_url: string, abstract: string, title: string}}, layers: {groups: {general: string, spatial: string}, title: string, fields: {subfields: {dataurl: string, metadataurl: string, keywords: string, crs: string, bbox: string, name: string, attribution: string, attributes: string, source: string, abstract: string, title: string, geometrytype: string}, layers: string}}, spatial: {title: string, fields: {extent: string, crs: string}}}, title: string}, workflow: {next: string, steps: {title: string}}, form: {footer: {required_fields: string}, inputs: {date: string, input_validation_exclude_values: string, input_validation_max_field: string, string: string, varchar: string, textarea: string, input_validation_min_field: string, integer: string, float: string, input_validation_error: string, messages: {errors: {picklayer: string}}, input_validation_mutually_exclusive: string, text: string, bigint: string, tooltips: {picklayer: string, lonlat: string}, table: string}, messages: {qgis_input_widget_relation: string}, loading: string}, catalog: {menu: {download: {gpkg: string, csv: string, shp: string, gpx: string, xls: string}, wms: {copied: string, copy: string, title: string}}}, querybuilder: {search: {edit: string, run: string, delete: string, info: string}, additem: string, messages: {changed: string, number_of_features: string}, panel: {button: {all: string, test: string, save: string, clear: string, run: string, manual: string}, expression: string, operators: string, values: string, layers: string, fields: string}, error_run: string, delete: string, error_test: string}, mapcontrols: {querybypolygon: {help: string, tooltip: string, no_geometry: string}, measures: {area: {help: string, tooltip: string}, length: {help: string, tooltip: string}}, querybybbox: {help: string, tooltip: string, nolayers_visible: string}, addlayer: {tooltip: string, messages: {csv: {warning: string}}}, query: {tooltip: string, actions: {add_features_to_results: {hint: string}, download_features_csv: {hint: string}, atlas: {hint: string}, download_xls: {hint: string}, relations_charts: {hint: string}, zoom_to_feature: {hint: string}, download_features_gpkg: {hint: string}, zoom_to_features_extent: {hint: string}, download_csv: {hint: string}, download_features_shapefile: {hint: string}, download_features_xls: {hint: string}, download_shapefile: {hint: string}, add_selection: {hint: string}, download_gpx: {hint: string}, remove_feature_from_results: {hint: string}, download_features_gpx: {hint: string}, relations: {hint: string}, download_gpkg: {hint: string}}}, scale: {no_valid_scale: string}, geolocation: {tooltip: string}}, wps: {list_process: string, tooltip: string}, relations: {no_relations_found: string, relation_data: string, back_to_relations: string, list_of_relations_feature: string, error_missing_father_field: string}, errors: {add_external_layer: string, layers: {load: string}, unsupported_format: string}, tooltips: {download_csv: string, download_shapefile: string, atlas: string, copy_map_extent_url: string, download_gpx: string, download_xls: string, relations: {row_to_form: string, form_to_row: string}, download_gpkg: string, show_chart: string}}}}, fi: {translation: {cancel: string, no: string, error_map_loading: string, data: string, catalog: string, legend: string, copy_form_data: string, check_internet_connection_or_server_admin: string, show: string, save: string, back: string, server_error: string, mapcontrols: {area: {tooltip: string}, nominatim: {noresults: string, placeholder: string, notresponseserver: string}, add_layer_control: {select_csv_separator: string, select_csv_y_field: string, select_field_to_show: string, select_projection: string, header: string, select_color: string, select_csv_x_field: string, drag_layer: string}, query: {input_relation: string}, length: {tooltip: string}, screenshot: {error: string}, geolocations: {error: string}}, no_results: string, tools: string, changemap: string, default: string, logout: string, search: string, copy_form_data_from_feature: string, credits: {g3wSuiteFramework: string, productOf: string, g3wSuiteDescription: string}, sidebar: {}, close: string, exitnosave: string, sign_in: string, info: {link_button: string, open_link: string, server_error: string, title: string, no_results: string}, add: string, backto: string, yes: string, create_print: string, server_saver_error: string, tree: string, paste_form_data: string, no_other_projects: string, dosearch: string, baselayers: string, component: string, print: string, hide: string, annul: string, layer_selection_filter: {tools: {filter: string, nofilter: string, invert: string, show_features_on_map: string, clear: string}}, layer_is_added: string, catalog_items: {helptext: string, contextmenu: {vector_color_menu: string, show_metadata: string, open_attribute_table: string, styles: string, zoomtolayer: string}}, dataTable: {next: string, nodatafilterd: string, previous: string, no_data: string, infoFiltered: string, lengthMenu: string, info: string}, nobaselayer: string, could_not_load_vector_layers: string, street_search: string, sdk: {search: {all: string, layer_not_querable: string, error_loading: string, autocomplete: {inputshort: {pre: string, post: string}}, searching: string, layer_not_searchable: string, no_results: string}, print: {fids_instruction: string, help: string, no_layers: string, rotation: string, format: string, scale: string, fids_example: string, download_image: string}, metadata: {groups: {general: {title: string, fields: {fees: string, keywords: string, subfields: {contactinformation: {contactperson: string, contactvoicetelephone: string, personprimary: string, contactorganization: string, ContactOrganization: string, ContactPosition: string, contactposition: string, contactelectronicmailaddress: string, ContactPerson: string}}, accessconstraints: string, name: string, description: string, contactinformation: string, wms_url: string, abstract: string, title: string}}, layers: {groups: {general: string, spatial: string}, title: string, fields: {subfields: {dataurl: string, metadataurl: string, keywords: string, crs: string, bbox: string, name: string, attribution: string, attributes: string, source: string, abstract: string, title: string, geometrytype: string}, layers: string}}, spatial: {title: string, fields: {extent: string, crs: string}}}, title: string}, workflow: {next: string, steps: {title: string}}, form: {footer: {required_fields: string}, inputs: {date: string, input_validation_exclude_values: string, input_validation_max_field: string, string: string, varchar: string, textarea: string, input_validation_min_field: string, integer: string, float: string, input_validation_error: string, messages: {errors: {picklayer: string}}, input_validation_mutually_exclusive: string, text: string, bigint: string, tooltips: {picklayer: string, lonlat: string}, table: string}, messages: {qgis_input_widget_relation: string}, loading: string}, catalog: {menu: {download: {gpkg: string, csv: string, shp: string, gpx: string, xls: string}, wms: {copied: string, copy: string, title: string}}}, querybuilder: {search: {edit: string, run: string, delete: string, info: string}, additem: string, messages: {changed: string, number_of_features: string}, panel: {button: {all: string, test: string, save: string, clear: string, run: string, manual: string}, expression: string, operators: string, values: string, layers: string, fields: string}, error_run: string, delete: string, error_test: string}, mapcontrols: {querybypolygon: {help: string, tooltip: string, no_geometry: string}, measures: {area: {help: string, tooltip: string}, length: {help: string, tooltip: string}}, querybybbox: {help: string, tooltip: string, nolayers_visible: string}, addlayer: {tooltip: string, messages: {csv: {warning: string}}}, query: {tooltip: string, actions: {add_features_to_results: {hint: string}, download_features_csv: {hint: string}, atlas: {hint: string}, download_xls: {hint: string}, relations_charts: {hint: string}, zoom_to_feature: {hint: string}, download_features_gpkg: {hint: string}, zoom_to_features_extent: {hint: string}, download_csv: {hint: string}, download_features_shapefile: {hint: string}, download_features_xls: {hint: string}, download_shapefile: {hint: string}, add_selection: {hint: string}, download_gpx: {hint: string}, remove_feature_from_results: {hint: string}, download_features_gpx: {hint: string}, relations: {hint: string}, download_gpkg: {hint: string}}}, scale: {no_valid_scale: string}, geolocation: {tooltip: string}}, wps: {list_process: string, tooltip: string}, relations: {no_relations_found: string, relation_data: string, back_to_relations: string, list_of_relations_feature: string, error_missing_father_field: string}, errors: {add_external_layer: string, layers: {load: string}, unsupported_format: string}, tooltips: {download_csv: string, download_shapefile: string, atlas: string, copy_map_extent_url: string, download_gpx: string, download_xls: string, relations: {row_to_form: string, form_to_row: string}, download_gpkg: string, show_chart: string}}}}, en: {translation: {cancel: string, no: string, error_map_loading: string, data: string, catalog: string, legend: string, copy_form_data: string, check_internet_connection_or_server_admin: string, show: string, save: string, back: string, server_error: string, mapcontrols: {area: {tooltip: string}, nominatim: {noresults: string, placeholder: string, notresponseserver: string}, add_layer_control: {select_csv_separator: string, select_csv_y_field: string, select_field_to_show: string, select_projection: string, header: string, select_color: string, select_csv_x_field: string, drag_layer: string}, query: {input_relation: string}, length: {tooltip: string}, screenshot: {error: string}, geolocations: {error: string}}, no_results: string, tools: string, changemap: string, default: string, logout: string, search: string, copy_form_data_from_feature: string, credits: {g3wSuiteFramework: string, productOf: string, g3wSuiteDescription: string}, sidebar: {}, close: string, exitnosave: string, sign_in: string, info: {link_button: string, open_link: string, server_error: string, title: string, no_results: string}, add: string, backto: string, yes: string, create_print: string, server_saver_error: string, tree: string, paste_form_data: string, no_other_projects: string, dosearch: string, baselayers: string, component: string, print: string, hide: string, annul: string, layer_selection_filter: {tools: {filter: string, nofilter: string, invert: string, show_features_on_map: string, clear: string}}, layer_is_added: string, catalog_items: {helptext: string, contextmenu: {vector_color_menu: string, show_metadata: string, open_attribute_table: string, styles: string, zoomtolayer: string}}, dataTable: {next: string, nodatafilterd: string, previous: string, no_data: string, infoFiltered: string, lengthMenu: string, info: string}, nobaselayer: string, could_not_load_vector_layers: string, street_search: string, sdk: {search: {all: string, layer_not_querable: string, error_loading: string, autocomplete: {inputshort: {pre: string, post: string}}, searching: string, layer_not_searchable: string, no_results: string}, print: {fids_instruction: string, help: string, no_layers: string, rotation: string, format: string, scale: string, fids_example: string, download_image: string}, metadata: {groups: {general: {title: string, fields: {fees: string, keywords: string, subfields: {contactinformation: {contactperson: string, contactvoicetelephone: string, personprimary: string, contactorganization: string, ContactOrganization: string, ContactPosition: string, contactposition: string, contactelectronicmailaddress: string, ContactPerson: string}}, accessconstraints: string, name: string, description: string, contactinformation: string, wms_url: string, abstract: string, title: string}}, layers: {groups: {general: string, spatial: string}, title: string, fields: {subfields: {dataurl: string, metadataurl: string, keywords: string, crs: string, bbox: string, name: string, attribution: string, attributes: string, source: string, abstract: string, title: string, geometrytype: string}, layers: string}}, spatial: {title: string, fields: {extent: string, crs: string}}}, title: string}, workflow: {next: string, steps: {title: string}}, form: {footer: {required_fields: string}, inputs: {date: string, input_validation_exclude_values: string, input_validation_max_field: string, string: string, varchar: string, textarea: string, input_validation_min_field: string, integer: string, float: string, input_validation_error: string, messages: {errors: {picklayer: string}}, input_validation_mutually_exclusive: string, text: string, bigint: string, tooltips: {picklayer: string, lonlat: string}, table: string}, messages: {qgis_input_widget_relation: string}, loading: string}, catalog: {menu: {download: {gpkg: string, csv: string, shp: string, gpx: string, xls: string}, wms: {copied: string, copy: string, title: string}}}, querybuilder: {search: {edit: string, run: string, delete: string, info: string}, additem: string, messages: {changed: string, number_of_features: string}, panel: {button: {all: string, test: string, save: string, clear: string, run: string, manual: string}, expression: string, operators: string, values: string, layers: string, fields: string}, error_run: string, delete: string, error_test: string}, mapcontrols: {querybypolygon: {help: string, tooltip: string, no_geometry: string}, measures: {area: {help: string, tooltip: string}, length: {help: string, tooltip: string}}, querybybbox: {help: string, tooltip: string, nolayers_visible: string}, addlayer: {tooltip: string, messages: {csv: {warning: string}}}, query: {tooltip: string, actions: {add_features_to_results: {hint: string}, download_features_csv: {hint: string}, atlas: {hint: string}, download_xls: {hint: string}, relations_charts: {hint: string}, zoom_to_feature: {hint: string}, download_features_gpkg: {hint: string}, zoom_to_features_extent: {hint: string}, download_csv: {hint: string}, download_features_shapefile: {hint: string}, download_features_xls: {hint: string}, download_shapefile: {hint: string}, add_selection: {hint: string}, download_gpx: {hint: string}, remove_feature_from_results: {hint: string}, download_features_gpx: {hint: string}, relations: {hint: string}, download_gpkg: {hint: string}}}, scale: {no_valid_scale: string}, geolocation: {tooltip: string}}, wps: {list_process: string, tooltip: string}, relations: {no_relations_found: string, relation_data: string, back_to_relations: string, list_of_relations_feature: string, error_missing_father_field: string}, errors: {add_external_layer: string, layers: {load: string}, unsupported_format: string}, tooltips: {download_csv: string, download_shapefile: string, atlas: string, copy_map_extent_url: string, download_gpx: string, download_xls: string, relations: {row_to_form: string, form_to_row: string}, download_gpkg: string, show_chart: string}}}}, it: {translation: {cancel: string, no: string, error_map_loading: string, data: string, catalog: string, legend: string, copy_form_data: string, check_internet_connection_or_server_admin: string, show: string, save: string, back: string, server_error: string, mapcontrols: {area: {tooltip: string}, nominatim: {noresults: string, placeholder: string, notresponseserver: string}, add_layer_control: {select_csv_separator: string, select_csv_y_field: string, select_field_to_show: string, select_projection: string, header: string, select_color: string, select_csv_x_field: string, drag_layer: string}, query: {input_relation: string}, length: {tooltip: string}, screenshot: {error: string}, geolocations: {title: string, error: string}}, no_results: string, tools: string, changemap: string, default: string, logout: string, search: string, copy_form_data_from_feature: string, credits: {g3wSuiteFramework: string, productOf: string, g3wSuiteDescription: string}, sidebar: {}, close: string, exitnosave: string, sign_in: string, info: {link_button: string, open_link: string, server_error: string, title: string, no_results: string}, add: string, backto: string, yes: string, create_print: string, server_saver_error: string, tree: string, paste_form_data: string, no_other_projects: string, dosearch: string, baselayers: string, component: string, print: string, hide: string, annul: string, layer_selection_filter: {tools: {filter: string, nofilter: string, invert: string, show_features_on_map: string, clear: string}}, layer_is_added: string, catalog_items: {helptext: string, contextmenu: {vector_color_menu: string, show_metadata: string, open_attribute_table: string, styles: string, zoomtolayer: string}}, dataTable: {next: string, nodatafilterd: string, previous: string, infoFiltered: string, lengthMenu: string, info: string}, nobaselayer: string, could_not_load_vector_layers: string, street_search: string, sdk: {search: {all: string, layer_not_querable: string, error_loading: string, autocomplete: {inputshort: {pre: string, post: string}}, searching: string, layer_not_searchable: string, no_results: string}, print: {fids_instruction: string, help: string, no_layers: string, rotation: string, format: string, scale: string, fids_example: string, download_image: string}, metadata: {groups: {general: {title: string, fields: {fees: string, keywords: string, subfields: {contactinformation: {contactperson: string, contactvoicetelephone: string, personprimary: string, contactorganization: string, ContactOrganization: string, ContactPosition: string, contactposition: string, contactelectronicmailaddress: string, ContactPerson: string}}, accessconstraints: string, name: string, description: string, contactinformation: string, wms_url: string, abstract: string, title: string}}, layers: {groups: {general: string, spatial: string}, title: string, fields: {subfields: {dataurl: string, metadataurl: string, keywords: string, crs: string, bbox: string, name: string, attribution: string, attributes: string, source: string, abstract: string, title: string, geometrytype: string}, layers: string}}, spatial: {title: string, fields: {extent: string, crs: string}}}, title: string}, workflow: {next: string, steps: {title: string}}, form: {footer: {required_fields: string}, inputs: {date: string, input_validation_exclude_values: string, input_validation_max_field: string, string: string, varchar: string, textarea: string, input_validation_min_field: string, integer: string, float: string, input_validation_error: string, messages: {errors: {picklayer: string}}, input_validation_mutually_exclusive: string, text: string, bigint: string, tooltips: {picklayer: string, lonlat: string}, table: string}, messages: {qgis_input_widget_relation: string}, loading: string}, catalog: {menu: {download: {gpkg: string, csv: string, shp: string, gpx: string, xls: string}, wms: {copied: string, copy: string, title: string}}}, querybuilder: {search: {edit: string, run: string, delete: string, info: string}, additem: string, messages: {changed: string, number_of_features: string}, panel: {button: {all: string, test: string, save: string, clear: string, run: string, manual: string}, expression: string, operators: string, values: string, layers: string, fields: string}, error_run: string, delete: string, error_test: string}, mapcontrols: {querybypolygon: {help: string, tooltip: string, no_geometry: string}, measures: {area: {help: string, tooltip: string}, length: {help: string, tooltip: string}}, querybybbox: {help: string, tooltip: string, nolayers_visible: string}, addlayer: {tooltip: string, messages: {csv: {warning: string}}}, query: {tooltip: string, actions: {add_features_to_results: {hint: string}, download_features_csv: {hint: string}, atlas: {hint: string}, download_xls: {hint: string}, relations_charts: {hint: string}, zoom_to_feature: {hint: string}, download_features_gpkg: {hint: string}, zoom_to_features_extent: {hint: string}, download_csv: {hint: string}, download_features_shapefile: {hint: string}, download_features_xls: {hint: string}, download_shapefile: {hint: string}, add_selection: {hint: string}, download_gpx: {hint: string}, remove_feature_from_results: {hint: string}, download_features_gpx: {hint: string}, relations: {hint: string}, download_gpkg: {hint: string}}}, scale: {no_valid_scale: string}, geolocation: {tooltip: string}}, wps: {list_process: string, tooltip: string}, relations: {no_relations_found: string, relation_data: string, back_to_relations: string, list_of_relations_feature: string, error_missing_father_field: string}, errors: {add_external_layer: string, layers: {load: string}, unsupported_format: string}, tooltips: {zoom_to_features_extent: string, download_csv: string, download_shapefile: string, atlas: string, copy_map_extent_url: string, download_gpx: string, download_xls: string, relations: {row_to_form: string, form_to_row: string}, download_gpkg: string, show_chart: string}}}}}}|{resources: *}), views: (*|{}), group: *, vectorurl: *, debug: boolean, crs: *, apptitle: (string), header_custom_links, i18n: *, overviewproject: (*|null), layout: (*|{}), logo_img: *, baselayers: (string|vueComponentOptions.computed.baselayers|{count: number}|*), logo_link: *, background_color, terms_of_use_text: *, main_map_title: *, getProjectConfigUrl(*): string, user: (*|null), minscale: ProjectsRegistry.setProjects.config.minscale}>}
   */
  async createApplicationConfig(initConfig) {
    const config = {
      ...appConfig
    };
    try {
      initConfig = initConfig ? initConfig :  await this.obtainInitConfig({
        initConfigUrl:  `${appConfig.server.urls.initconfig}`
      });
      // write urls of static files and media url (base url and vector url)
      this.baseurl = initConfig.baseurl;
      config.server.urls.baseurl = initConfig.baseurl;
      config.server.urls.frontendurl = initConfig.frontendurl;
      config.server.urls.staticurl = initConfig.staticurl;
      config.server.urls.clienturl = initConfig.staticurl+initConfig.client;
      config.server.urls.mediaurl = initConfig.mediaurl;
      config.server.urls.vectorurl = initConfig.vectorurl;
      config.server.urls.proxyurl = initConfig.proxyurl;
      config.server.urls.rasterurl = initConfig.rasterurl;
      config.server.urls.interfaceowsurl = initConfig.interfaceowsurl;
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
        rasterurl:config.server.urls.rasterurl,
        interfaceowsurl: config.server.urls.interfaceowsurl,
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
        getWmsUrl(project) {
          return `${config.server.urls.baseurl+config.server.urls.ows}/${config.group.id}/${project.type}/${project.id}/`;
        },
        // needed by ProjectsRegistry to get informations about project configuration
        getProjectConfigUrl(project) {
          return `${config.server.urls.baseurl+config.server.urls.config}/${config.group.id}/${project.type}/${project.id}?_t=${project.modified}`;
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

  async obtainInitConfig({initConfigUrl, url, host}={}) {
    if (!this._initConfigUrl) this._initConfigUrl = initConfigUrl;
    else this.clearInitConfig();
    // if exist a global initiConfig (in production)
    if (window.initConfig) {
      production = true;
      this._initConfig = window.initConfig;
      this.setInitVendorKeys(initConfig);
      this.fire('initconfig');
      return window.initConfig;
      // case development need to ask to api
    } else {

      let projectPath;
      let queryTuples;
      const locationsearch = url ? url.split('?')[1] : location.search ? location.search.substring(1) : null;
      if (locationsearch) {
        queryTuples = locationsearch.split('&');
        queryTuples.forEach(queryTuple => {
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
        const url =  `${host || ''}${this.baseurl}${this._initConfigUrl}/${projectPath}`;
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
        } finally {
          this.fire('initconfig')
        }
      }
    }
  };

  // method to get initial application configuration
  getInitConfig(url) {
    return new Promise((resolve, reject) => {
      if (this._initConfig) resolve(this._initConfig);
      else utils.XHR.get({url})
        .then(initConfig => resolve(initConfig))
        .catch(error => reject(error));
    })
  };

  getInitConfigUrl() {
    return this._initConfigUrl;
  };

  setInitConfigUrl(initConfigUrl) {
    this._initConfigUrl = initConfigUrl;
  };

  // post boostratp
  async postBootstrap() {
    if (!this.complete) {
      try {
        // register  plugins
        await this._bootstrapPlugins()
      } catch(err) {
      } finally {
        this.complete = true;
        this.fire('complete');
      }
    }
  };

  //boostrap plugins
  _bootstrapPlugins() {
    return PluginsRegistry.init({
      pluginsBaseUrl: this._config.urls.staticurl,
      pluginsConfigs: this._config.plugins,
      otherPluginsConfig: ProjectsRegistry.getCurrentProject().getState()
    });
  };

  //set EPSG of Application is usefule for example to wms request for table layer
  setEPSGApplication(project) {
    ApplicationState.map.epsg = project.state.crs.epsg;
  };

  //Application User
  setApplicationUser(user) {
    ApplicationState.user = user;
  };

  getApplicationUser() {
    return ApplicationState.user;
  };

  //  bootstrap (when called init)
  bootstrap() {
    return new Promise((resolve, reject) => {
      // setup All i18n configuration
      this.setupI18n();
      // run Timeout
      const timeout = setTimeout(() =>{
        reject('Timeout')
      }, TIMEOUT);
      //first time l'application service is not ready
      if (!ApplicationState.ready) {
        $.when(
          // register project
          ProjectsRegistry.init(this._config),
          // inizialize api service
          ApiService.init(this._config)
        ).then(() => {
          // clear TIMEOUT
          clearTimeout(timeout);
          //clear
          this.registerOnlineOfflineEvent();
          this.fire('ready');
          ApplicationState.ready = true;
          // set current project gid
          const project = ProjectsRegistry.getCurrentProject();
          this._gid = project.getGid();
          //sett
          this.setEPSGApplication(project);
          //IFRAME CHECK
          ApplicationState.iframe && this.startIFrameService({
            project
          });
          // initilize routerdataservice
          RouterDataService.init();
          resolve(true);
        }).fail(error => reject(error))
      }
    });
  };

  //iframeservice
  startIFrameService({project}={}) {
    iframeService.init({project});
  };

  registerWindowEvent({evt, cb} ={}) {
    window.addEventListener(evt, cb);
  };

  unregisterWindowEvent({evt, cb}={}) {
    window.removeEventListener(evt, cb)
  };

  registerService(element, service) {
    this._applicationServices[element] = service;
  };

  unregisterService(element) {
    delete this._applicationServices[element];
  };

  getApplicationService(type) {
    return this._applicationServices[type];
  };

  getService(element) {
    return this._applicationServices[element];
  };

  errorHandler(error) {};

  /**
   * clear initConfig
   */
  clearInitConfig() {
    window.initConfig = null;
    this._initConfig = null;
  };

  setInitVendorKeys(config={}) {
    const vendorkeys = config.group.vendorkeys || {};
    config.group.baselayers.forEach(baselayer =>{
      if (baselayer.apikey) {
        const type = baselayer.servertype ? baselayer.servertype.toLowerCase() : null;
        vendorkeys[type] = baselayer.apikey
      }
    });
    this.setVendorKeys(vendorkeys);
  };

  setVendorKeys(keys={}) {
    Object.keys(keys).forEach(key =>{
      ApplicationState.keys.vendorkeys[key] = keys[key];
    })
  };

  // change View
  changeProjectView(change) {
    ApplicationState.changeProjectview = change;
  };

  isProjectViewChanging() {
    return ApplicationState.changeProjectview;
  };

  reloadCurrentProject() {
    return this.changeProject({
      gid: ProjectsRegistry.getCurrentProject().getGid()
    })
  };

  /**
   * Change project method that do all request and rebuild interface
   * @param gid
   * @param host
   * @returns {JQuery.Promise<any, any, any>}
   * @private
   */
  _changeProject({gid, host}={}) {
    const d = $.Deferred();
    this._gid = gid;
    const projectUrl = ProjectsRegistry.getProjectUrl(gid);
    const url = GUI.getService('map').addMapExtentUrlParameterToUrl(projectUrl);
    history.replaceState(null, null, url);
    location.replace(url);
    d.resolve();
    return d.promise();
  };

  /**
   * Layout section
   */

  setLayout(who='app', config={}) {
    /**
     * Set default height percentage of height when show vertical content (for example show table attribute)
     * @type {{}}
     */
    if (config.rightpanel) {
      config.rightpanel.width = config.rightpanel.width || 50;
      config.rightpanel.height = config.rightpanel.height || 50;
      config.rightpanel.width_default = config.rightpanel.width; // used eventually to reset starting values
      config.rightpanel.height_default = config.rightpanel.height;
      config.rightpanel.width_100 = false;
      config.rightpanel.height_100 = false;
    } else config.rightpanel = {width: 50, height: 50, width_default: 50, height_default: 50, width_100: false, height_100: false};
    ApplicationState.gui.layout[who] = config;
  };

  removeLayout(who) {
    who && delete ApplicationState.gui.layout[who];
  };

  setCurrentLayout(who='app') {
    ApplicationState.gui.layout.__current = who;
  };

  getCurrentLayout() {
    return ApplicationState.gui.layout[ApplicationState.gui.layout.__current];
  };

  getCurrentLayoutName() {
    return ApplicationState.gui.layout.__current;
  };

  cloneLayout(which='app') {
    return JSON.parse(JSON.stringify(ApplicationState.gui.layout[which]))
  };

  /**
   * Layout section
   */

  clear() {
    this.unregisterOnlineOfflineEvent();
  }
}


export default new ApplicationService();
