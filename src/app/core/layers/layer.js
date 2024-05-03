import { GEOMETRY_FIELDS as geometryFields } from 'app/constant';
import ApplicationState                      from 'store/application-state';
import DataRouterService                     from 'services/data';
import ProjectsRegistry                      from 'store/projects';
import DownloadMixin                         from 'core/layers/mixins/download';
import SelectionMixin                        from 'core/layers/mixins/selection';
import { SELECTION as SELECTION_STATE }      from 'core/layers/mixins/selection';
import RelationsMixin                        from 'core/layers/mixins/relations';
import { parseAttributes }                   from 'utils/parseAttributes';

const { t }                 = require('core/i18n/i18n.service');
const {
  inherit,
  base,
  XHR,
}                           = require('utils');
const G3WObject             = require('core/g3wobject');
const Providers             = require('core/layers/providersfactory');
const deprecate             = require('util-deprecate');

// Base Class of all Layer
function Layer(config={}, options={}) {

  this.config = config;

  // assign some attribute
  config.id        = config.id || 'Layer';
  config.title     = config.title || config.name;
  config.download  = !!config.download;
  config.geolayer  = false;
  config.baselayer = !!config.baselayer;
  config.fields    = config.fields || {};
  config.urls      = {
    query: (config.infourl && '' !== config.infourl ? config.infourl : config.wmsUrl),
    ...(config.urls || {})
  };

  //get current project object
  const {
    project = ProjectsRegistry.getCurrentProject()
  } = options;

  /** @deprecated since 3.10.0. Will be removed in v.4.x. */
  this.config.search_endpoint = 'api';

  // create relations
  this._relations = this._createRelations(project.getRelations());

  // set URLs to get varios type of data
  if (!this.isBaseLayer()) {
    //suffix url
    const suffixUrl = `${project.getType()}/${project.getId()}/${config.id}/`;
    //get vector url
    const vectorUrl = project.getVectorUrl();
    //get raster url
    const rasterUrl = project.getRasterUrl();

    this.config.urls.filtertoken = `${vectorUrl}filtertoken/${suffixUrl}`;
    this.config.urls.data        = `${vectorUrl}data/${suffixUrl}`;
    this.config.urls.shp         = `${vectorUrl}shp/${suffixUrl}`;
    this.config.urls.csv         = `${vectorUrl}csv/${suffixUrl}`;
    this.config.urls.xls         = `${vectorUrl}xls/${suffixUrl}`;
    this.config.urls.gpx         = `${vectorUrl}gpx/${suffixUrl}`;
    this.config.urls.gpkg        = `${vectorUrl}gpkg/${suffixUrl}`;
    this.config.urls.geotiff     = `${rasterUrl}geotiff/${suffixUrl}`;
    this.config.urls.editing     = `${vectorUrl}editing/${suffixUrl}`;
    this.config.urls.commit      = `${vectorUrl}commit/${suffixUrl}`;
    this.config.urls.config      = `${vectorUrl}config/${suffixUrl}`;
    this.config.urls.unlock      = `${vectorUrl}unlock/${suffixUrl}`;
    this.config.urls.widget      = {
      unique: `${vectorUrl}widget/unique/data/${suffixUrl}`
    };

    /**
     * Store feature count url to get features count of a layer
     *
     * @since 3.8.0
     */
    this.config.urls.featurecount = project.getUrl('featurecount');
    
    /**
     * Custom parameters based on project qgis version
     */
    this.config.searchParams = { I: 0, J: 0 };
  }

  // dinamic layer values useful for layerstree
  const defaultstyle = config.styles && config.styles.find(style => style.current).name;

  this.state = {

    id: config.id,

    title: config.title,

    selected: config.selected || false,

    disabled: config.disabled || false,

    metadata: config.metadata,

    metadata_querable: this.isBaseLayer() ? false: this.isQueryable({onMap:false}),

    openattributetable: this.isBaseLayer() ? false: this.canShowTable(),

    removable: config.removable || false,

    downloadable: this.isDownloadable(),

    source: config.source,

    styles: config.styles,

    defaultstyle,

    /**
     * state of if is in editing (setted by editing plugin)
     */
    inediting: false,

    infoformat: this.getInfoFormat(),

    infoformats: this.config.infoformats || [],

    projectLayer: true,

    geolayer: false,

    /**
     * Reactive selection attribute 
     */
    selection: {
      active: false
    },

    /**
     * Reactive filter attribute 
     */
    filter: {
      active: false,

      /**
       * @since 3.9.0 whether filter is set from a previously saved filter
       */
      current: null,
    },

    /**
     * @type { Array<{{ id: string, name: string }}> } array of saved filters
     *
     * @since 3.9.0
     */
    filters: config.filters || [],

    attributetable: {
      pageLength: null
    },


    visible: config.visible || false,

    tochighlightable: false,

    /**
     * @type {number}
     * 
     * @since 3.8.0
     */
    featurecount: config.featurecount,

    /**
     * @type { boolean | Object<number, number> }
     * 
     * @since 3.8.0
     */
    stylesfeaturecount: config.featurecount && defaultstyle && {
      [defaultstyle]: config.featurecount
    },
    name: config.name, /** since 3.10.0 **/
    expanded: config.expanded,  /** since 3.10.0 **/

  };

  /**
   * Store all selections feature `fids`
   */
  this.selectionFids = new Set();

  // referred to (layersstore);
  this._layersstore = config.layersstore || null;

  const layerType = `${this.config.servertype} ${this.config.source && this.config.source.type}`;

  /**
   * Layer providers used to retrieve data from server
   * 
   * 1 - data: raw layer data (editing)
   * 2 - filter
   * 3 - filtertoken
   * 4 - query
   * 5 - search
   */
  this.providers = {

    data: () => {
      if ([
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
        'QGIS wfs',
      ].includes(layerType)) {
        return new Providers.qgis({ layer: this });
      }
      if ('G3WSUITE geojson' === layerType) {
        return new Providers.geojson({ layer: this });
      }
    },

    filter: [
      'QGIS virtual',
      'QGIS postgres',
      'QGIS oracle',
      'QGIS mssql',
      'QGIS spatialite',
      'QGIS ogr',
      'QGIS delimitedtext',
      'QGIS wfs',
      'QGIS wmst',
      'QGIS wcs',
      'QGIS wms',
    ].includes(layerType) && new Providers.wfs({ layer: this }),

    filtertoken: [
      'QGIS virtual',
      'QGIS postgres',
      'QGIS oracle',
      'QGIS mssql',
      'QGIS spatialite',
      'QGIS ogr',
      'QGIS delimitedtext',
    ].includes(layerType) && new Providers.qgis({ layer: this }),

    query: () => {
      if ([
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
        'QGIS wfs',
        'QGIS wmst',
        'QGIS wcs',
        'QGIS wms',
        'QGIS gdal',
        /** @since 3.9.0 */
        'QGIS postgresraster',
        'QGIS vector-tile',
        'QGIS vectortile',
        'QGIS arcgismapserver',
        'QGIS mdal',
        'OGC wms',
      ].includes(layerType)) {
        return new Providers.wms({ layer: this });
      }
      if ('G3WSUITE geojson' === layerType) {
        return new Providers.geojson({ layer: this });
      }
    },

    search: [
      'QGIS virtual',
      'QGIS postgres',
      'QGIS oracle',
      'QGIS mssql',
      'QGIS spatialite',
      'QGIS ogr',
      'QGIS delimitedtext',
      'QGIS wfs',
    ].includes(layerType) && new Providers.qgis({ layer: this }),

  };

  /**
   * Store last proxy params (useful for repeat request info formats for wms external layer)
   */
  this.proxyData = {
    wms: null // at the moment only wms data from server
  };

  base(this);

}

inherit(Layer, G3WObject);

Object.assign(Layer.prototype, DownloadMixin);
Object.assign(Layer.prototype, RelationsMixin);
Object.assign(Layer.prototype, SelectionMixin);

const proto = Layer.prototype;

/**
 * Proxy params data
 */
proto.getProxyData = function(type) {
  return type ? this.proxyData[type] : this.proxyData;
};

/**
 * Set proxy data
 *
 * @param type
 * @param data
 */
proto.setProxyData= function(type, data = {}) {
  this.proxyData[type] = data;
};

/**
 * Clear proxy data
 *
 * @param type
 */
proto.clearProxyData = function(type) {
  this.proxyData[type] = null;
};

/**
 * Get a proxy request
 *
 * @param type
 * @param proxyParams
 *
 * @returns {Promise<*>}
 */
proto.getDataProxyFromServer = async function(type = 'wms', proxyParams = {}) {
  try {
    const { response, data } = await DataRouterService.getData(`proxy:${type}`, {
      inputs: proxyParams,
      outputs: false,
    });
    this.setProxyData(type, JSON.parse(data));
    return response;
  } catch(err) {
    console.warn(err);
  }
};

/**
 * @TODO Add description
 *
 * @param type
 * @param changes
 *
 * @returns {Promise<*>}
 */
proto.changeProxyDataAndReloadFromServer = function(type = 'wms', changes = {}) {
  Object.keys(changes).forEach(changeParam => {
    Object.keys(changes[changeParam]).forEach(param => {
      this.proxyData[type][changeParam][param] = changes[changeParam][param];
    })
  });
  return this.getDataProxyFromServer(type, this.proxyData[type]);
};

/**
 * [EDITING PLUGIN] Check if layer is in editing
 *
 * @returns { boolean }
 */
proto.isInEditing = function() {
  return this.state.inediting;
};

/**
 * [EDITING PLUGIN] Set editing state
 *
 * @param {boolean} bool
 */
proto.setInEditing = function(bool=false) {
  this.state.inediting = bool;
};

/**
 * @TODO Add description here
 *
 * @returns {*}
 */
proto.getSearchParams = function() {
  return this.config.searchParams;
};

/**
 * @deprecated since 3.10.0. Will be removed in v.4.x.
 */
proto.getSearchEndPoint = function() {
  return 'api';
};

/**
 * @TODO Add description
 *
 * @param pageLength
 */
proto.setAttributeTablePageLength = function(pageLength) {
  this.state.attributetable.pageLength = pageLength
};

/**
 * @TODO add description
 *
 * @returns {null}
 */
proto.getAttributeTablePageLength = function() {
  return this.state.attributetable.pageLength;
};

/**
 * @returns { string } wms layer name for wms request
 */
proto.getWMSLayerName = function() {
  return this.isWmsUseLayerIds() ? this.getId() : this.getName()
};

/**
 * @returns { boolean | *} whether request need to use `layer.id` or `layer.name`
 */
proto.isWmsUseLayerIds = function() {
  return this.config.wms_use_layer_ids;
};

/**
 * @returns {*|null} source type of layer
 */
proto.getSourceType = function() {
  return this.config.source ? this.config.source.type : null;
};

/**
 * @returns {boolean} whether it is a layer with geometry
 */
proto.isGeoLayer = function() {
  return this.state.geolayer;
};

/**
 * @TODO Add description
 *
 * @param { Object } opts
 * @param opts.page
 * @param opts.page_size
 * @param opts.ordering
 * @param opts.search
 * @param opts.suggest
 * @param opts.formatter
 * @param opts.custom_params
 * @param opts.field
 * @param opts.in_bbox
 *
 * @returns {*}
 */
proto.getDataTable = function({
  page          = null,
  page_size     = null,
  ordering      = null,
  search        = null,
  suggest       = null,
  formatter     = 0,
  custom_params = {},
  field,
  in_bbox,
} = {}) {
  const d = $.Deferred();
  let provider;
  const params = {
    ...custom_params,
    field,
    page,
    page_size,
    ordering,
    search,
    formatter,
    suggest,
    in_bbox,
    filtertoken: ApplicationState.tokens.filtertoken
  };
  if (!(this.getProvider('filter') || this.getProvider('data'))) {
   d.reject();
  } else {
    provider = this.getProvider('data');
    provider.getFeatures({editing: false}, params)
      .done(response => {
        const features = response.data.features && response.data.features || [];
        d.resolve(({
          headers: parseAttributes(this.getAttributes(), (features.length ? features[0].properties : [])),
          features,
          title: this.getTitle(),
          count: response.count
        }));
      })
      .fail(err => d.reject(err))
  }
  return d.promise();
};

/**
 * Search layer feature by fids
 *
 * @param fids formatter
 */
proto.getFeatureByFids = async function({
  fids      = [],
  formatter = 0,
} = {}) {
  const url = this.getUrl('data');
  try {
    const response = await XHR.get({
      url,
      params: {
        fids: fids.toString(),
        formatter
      }
    });
    if (response && response.result && response.vector && response.vector.data) {
      return response.vector.data.features;
    }
  } catch(err) {}
};

/**
 * @TODO deprecate `search_endpoint = 'ows'`
 *
 * Search Features
 * 
 * @param { Object }        opts
 * @param { 'ows' | 'api' } options.search_endpoint
 * @param { boolean }       options.raw
 * @param { 0 | 1 }         options.formatter
 * @param options.filter
 * @param options.suggest
 * @param options.unique
 * @param options.queryUrl
 * @param options.ordering
 * @param { Object }        params - OWS search params
 * 
 * @returns { Promise }
 */
proto.searchFeatures = function(options = {}, params = {}) {
  const {
    search_endpoint = this.config.search_endpoint,
  } = options;

  return new Promise(async (resolve, reject) => {
    switch (search_endpoint) {

      case 'ows':
        this
          .search(options, params)
          .then(results => { resolve(({ data: results })); })
          .fail(reject);
        break;

      case 'api':
        try {
          resolve(
            await this.getFilterData({
              queryUrl:  options.queryUrl,
              field:     options.filter,
              ordering:  options.ordering,
              unique:    options.unique,
              raw:       undefined !== options.raw       ? options.raw       : false,
              suggest:   options.suggest,
              /** @since 3.9.0 */
              formatter: undefined !== options.formatter ? options.formatter : 1,
            })
          );
        } catch(err) {
          reject(err);
        }
        break;
    }
  })
};

/**
 * Get feature data based on `field` and `suggests`
 * 
 * @param { Object }    opts
 * @param { boolean }   opts.raw
 * @param { Object }    opts.suggest   - (mandatory): object with key is a field of layer and value is value of the field to filter
 * @param { 0 | 1 }     opts.formatter
 * @param { Array }     opts.field     - Array of object with type of suggest (see above)
 * @param opts.unique
 * @param opts.fformatter
 * @param opts.ffield
 * @param opts.queryUrl
 * @param opts.ordering

 */
proto.getFilterData = async function({
  raw       = false,
  suggest,
  field,
  unique,
  fformatter, //@since v3.9
  ffield,     //@since 3.9.1
  formatter = 1,
  queryUrl,
  ordering,
} = {}) {
  return await this
    .getProvider('data')
    .getFilterData({
      queryUrl,
      field,
      raw,
      ordering,
      suggest,
      formatter,
      unique,
      fformatter,
      ffield,
    });
};

/**
 * search method 
 */
proto.search = function(options={}, params={}) {
  // check option feature_count
  options.feature_count = options.feature_count || 10;
  options = {
    ...options,
    ...this.config.searchParams,
    ...params
  };
  const d = $.Deferred();
  const provider = this.getProvider('search');
  if (provider) {
    provider.query(options)
      .done(response => d.resolve(response))
      .fail(err => d.reject(err));
  } else {
    d.reject(t('sdk.search.layer_not_searchable'));
  }
  return d.promise();
};

/**
 * Info from layer (only for querable layers) 
 */
proto.query = function(options={}) {
  const d = $.Deferred();
  const provider = this.getProvider(options.filter ? 'filter' : 'query');
  if (provider) {
    provider.query(options)
      .done(response => d.resolve(response))
      .fail(err => d.reject(err));
  } else {
    d.reject(t('sdk.search.layer_not_querable'));
  }
  return d.promise();
};

/**
 * General way to get an attribute 
 */
proto.get = function(property) {
  return this.config[property] ? this.config[property] : this.state[property];
};

/**
 * @returns { * | {} } layer fields
 */
proto.getFields = function() {
  return this.config.fields
};

/**
 * Get field by name
 * 
 * @param fieldName
 *
 * @returns {*}
 */
proto.getFieldByName = function(fieldName) {
  return this.getFields().find(field => field.name === fieldName)
};

/**
 * @returns { Array } editing fields
 */
proto.getEditingFields = function() {
  return this.config.editing.fields;
};

/**
 * @returns { Array } only show fields
 */
proto.getTableFields = function() {
  return (this.config.fields || []).filter(field => field.show);
};

/**
 * @returns { Array } table fields exclude geometry field
 */
proto.getTableHeaders = function() {
  return this.getTableFields().filter(field => -1 === geometryFields.indexOf(field.name));
};

/**
 * @returns {*} current project
 */
proto.getProject = function() {
  return this.config.project;
};

/**
 * @returns { Object } layer config
 */
proto.getConfig = function() {
  return this.config;
};

/**
 * @param fields
 *
 * @returns { Array } form structure to show on form editing
 */
proto.getLayerEditingFormStructure = function(fields) {
  return this.config.editor_form_structure;
};

/**
 * @TODO Add description
 *
 * @returns {*|*[]}
 */
proto.getFieldsOutOfFormStructure = function() {
  return this.config.editor_form_structure ? this.config.editor_form_structure.filter(structure => structure.field_name) : []
};

/**
 * @returns { boolean } whether it has form structure
 */
proto.hasFormStructure = function() {
  return !!this.config.editor_form_structure;
};

/**
 * @returns custom style (for future implementation)
 */
proto.getCustomStyle = function() {
  return this.config.customstyle;
};

/**
 * Get state layer
 *
 * @returns {*|{metadata, downloadable: *, attributetable: {pageLength: null}, defaultstyle: *, source, title: *, infoformats: ((function(): *)|*|*[]), tochighlightable: boolean, featurecount: number, stylesfeaturecount: (number|string|*|{[p: number]: *}), projectLayer: boolean, infoformat: (string|default.watch.infoformat|*), geolayer: boolean, inediting: boolean, disabled: boolean, id: (*|string), selected: boolean, openattributetable: (boolean|boolean), metadata_querable: (boolean|boolean), visible: boolean, filters: *[], filter: {current: null, active: boolean}, selection: {active: boolean}, removable: (boolean|*), styles}}
 */
proto.getState = function() {
  return this.state;
};

/**
 * @returns {*} layer source (ex. ogr, spatialite, etc..)
 */
proto.getSource = function() {
  return this.state.source;
};

/**
 * @returns {*} editing version of layer
 */
proto.getEditingLayer = function() {
  return this._editingLayer;
};

/**
 * Set editing layer
 *
 * @param editingLayer
 */
proto.setEditingLayer = function(editingLayer) {
  this._editingLayer = editingLayer;
};

/**
 * @returns {string|string[]|boolean|string|*} whether is hidden
 */
proto.isHidden = function() {
  return this.state.hidden;
};

/**
 * Set hidden
 *
 * @param bool
 */
proto.setHidden = function(bool=true) {
  this.state.hidden = bool;
};

/**
 * @returns {boolean} whether it was modified (by editing)
 */
proto.isModified = function() {
  return this.state.modified;
};

/**
 * @returns {*|string} id
 */
proto.getId = function() {
  return this.config.id;
};

/**
 * @returns {*} metadata
 */
proto.getMetadata = function() {
  return this.state.metadata
};

/**
 * @returns {*} title
 */
proto.getTitle = function() {
  return this.config.title;
};

/**
 * @returns {*} name
 */
proto.getName = function() {
  return this.config.name;
};

/**
 * @returns {*} origin name
 */
proto.getOrigName = function() {
  return this.config.origname;
};

/**
 * Get Server type
 *
 * @returns {*|string|{wmst: {filter: Providers.WFSDataProvider, search: null, data: null, query: Providers.WMSDataProvider}, virtual: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, oracle: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, delimitedtext: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, wfs: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider}, wcs: {filter: Providers.WFSDataProvider, search: null, data: null, query: Providers.WMSDataProvider}, arcgismapserver: {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, mdal: {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, vectortile: {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, "vector-tile": {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, gdal: {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, ogr: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, wms: {filter: Providers.WFSDataProvider, search: null, data: null, query: Providers.WMSDataProvider}, postgres: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, mssql: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, spatialite: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}}}
 */
proto.getServerType = function() {
  return (this.config.servertype && this.config.servertype !== '') ?
    this.config.servertype :
    ServerTypes.QGIS;
};

/**
 * @returns {*} type
 */
proto.getType = function() {
  return this.type;
};

/**
 * Set Type
 *
 * @param type
 */
proto.setType = function(type) {
  this.type = type;
};

/**
 * Check if layer is a type passed
 *
 * @param type
 *
 * @returns {boolean}
 */
proto.isType = function(type) {
  return this.getType() === type;
};

/**
 * Set disabled
 *
 * @param bool
 */
proto.setDisabled = function(bool) {
  this.state.disabled = bool;
};

/**
 * @returns {boolean} whether it is disabled
 */
proto.isDisabled = function() {
  return this.state.disabled;
};

/**
 * @returns {boolean} whether is visible
 */
proto.isVisible = function() {
  return this.state.visible;
};

/**
 * Set visibility
 *
 * @param bool
 */
proto.setVisible = function(bool) {
  this.state.visible = bool;
};

/**
 * @param { Object } param
 * @param param.map check if request from map point of view or just a capabilities info layer
 */
proto.isQueryable = function({ onMap } = { onMap: false }) {
  let queryEnabled = false;
  const queryableForCababilities = !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.QUERYABLE));
  if (!onMap) return queryableForCababilities;
  // if querable check if is visible or disabled
  if (queryableForCababilities) {
    queryEnabled = this.isVisible() && !this.isDisabled();
    if (this.config.infowhennotvisible !== undefined && this.config.infowhennotvisible === true) queryEnabled = true;
  }
  return queryEnabled;
};

/**
 * @TODO Add description
 *
 * @returns {string|string|*}
 */
proto.getOws = function() {
  return this.config.ows;
};

/**
 * @TODO Description
 *
 * @returns {boolean}
 */
proto.getTocHighlightable = function() {
  return this.state.tochighlightable;
};

/**
 * @TODO Description
 *
 * @param bool
 */
proto.setTocHighlightable = function(bool=false) {
  this.state.tochighlightable = bool;
};

/**
 * @param conditions plain object with configuration layer attribute and value
 */
proto.isFilterable = function(conditions=null) {
  let isFiltrable = !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.FILTERABLE));
  if (isFiltrable && conditions) {
    const conditionalFiltrable = Object.keys(conditions).reduce((bool, attribute) => {
      const layer_config_value = this.get(attribute);
      const condition_attribute_values = conditions[attribute];
      return bool && Array.isArray(layer_config_value) ?
        layer_config_value.indexOf(condition_attribute_values) !== -1 :
        condition_attribute_values === layer_config_value;
    }, true);
    isFiltrable = isFiltrable && conditionalFiltrable;
  }
  return isFiltrable;
};

/**
 * @returns { boolean } whether layer is set up as time series
 */
proto.isQtimeseries = function() {
  return this.config.qtimeseries;
};

/**
 * @returns { boolean } whether is editable
 */
proto.isEditable = function() {
  return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.EDITABLE));
};

/**
 * @returns {*|boolean} whether is a base layer
 */
proto.isBaseLayer = function() {
  return this.config.baselayer;
};

/**
 * @param type get url by type (data, shp, csv, xls, editing, ...)
 */
proto.getUrl = function(type) {
  return this.config.urls[type];
};

/**
 * Set config url
 * 
 * @param { Object } url
 * @param url.type
 * @param url.url
 */
proto.setUrl = function({type, url}={}) {
  this.config.urls[type] = url;
};

/**
 * @returns config.urls
 */
proto.getUrls = function() {
  return this.config.urls;
};

/**
 * Set editing url
 */
proto.setEditingUrl = function(url) {
  this.config.urls.editing = url || this.config.urls.editing;
};

/**
 * @returns {*} query url
 */
proto.getQueryUrl = function() {
  return this.config.urls.query;
};

/**
 * Set query url
 *
 * @param queryUrl
 */
proto.setQueryUrl = function(queryUrl) {
  this.config.urls.query = queryUrl;
};

/**
 * @returns {*}
 */
proto.getQueryLayerName = function() {
  return (this.config.infolayer && this.config.infolayer !== '') ? this.config.infolayer : this.getName();
};

/**
 * @TODO Description
 *
 * @returns {*}
 */
proto.getQueryLayerOrigName = function() {
  return this.state.infolayer && this.config.infolayer !== '' ? this.config.infolayer :  this.config.origname;
};

/**
 * @TODO Description
 *
 * @param ogcService
 *
 * @returns { default.watch.infoformat | * | string }
 */
proto.getInfoFormat = function(ogcService) {
  // In case of NETCDF (qtime series)
  if (this.config.qtimeseries === true || this.getSourceType() === 'gdal') {
    return 'application/json';
  }
  if (this.config.infoformat && '' !== this.config.infoformat  && 'wfs' !== ogcService) {
    return this.config.infoformat;
  }
  return 'application/vnd.ogc.gml';
};

/**
 * @TODO Description
 *
 * @returns {(function(): *)|*|*[]}
 */
proto.getInfoFormats = function() {
  return this.state.infoformats;
};

/**
 * @TODO Description
 *
 * @returns {*}
 */
proto.getInfoUrl = function() {
  return this.config.infourl;
};

/**
 * @TODO Description
 *
 * @param infoFormat
 */
proto.setInfoFormat = function(infoFormat) {
  this.config.infoformat = infoFormat;
};

/**
 * @TODO Description
 *
 * @returns {*|{}}
 */
proto.getAttributes = function() {
  return this.config.fields;
};

/**
 * @TODO Description
 *
 * @param attribute
 * @param type
 * @param options
 */
proto.changeAttribute = function(attribute, type, options) {
  for (const field of this.config.fields) {
    if (field.name === attribute) {
      field.type = type;
      field.options = options;
      break;
    }
  }
};

/**
 * @TODO Description
 *
 * @param name
 *
 * @returns {*}
 */
proto.getAttributeLabel = function(name) {
  const field = this.getAttributes().find(field=> field.name === name);
  return field && field.label;
};

/**
 * Return provider by type
 *
 * @param type
 *
 * @returns {*}
 */
proto.getProvider = function(type) {
  return this.providers[type];
};

/**
 * Return all providers
 *
 * @returns {*|{filter: null, search: null, data: null, query: null, filtertoken: null}}
 */
proto.getProviders = function() {
  return this.providers;
};

/**
 * @TODO Description
 *
 * @returns {*}
 */
proto.getLayersStore = function() {
  return this._layersstore;
};

/**
 * @TODO Description
 *
 * @param layerstore
 */
proto.setLayersStore = function(layerstore) {
  this._layersstore = layerstore;
};

/**
 * Return if it is possible to show table of attribute
 *
 * @returns {boolean}
 */
proto.canShowTable = function() {
  if (this.config.not_show_attributes_table) {
    return false;
  }

  if (this.getServerType() === Layer.ServerTypes.QGIS && ([
      Layer.SourceTypes.POSTGIS,
      Layer.SourceTypes.ORACLE,
      Layer.SourceTypes.WFS,
      Layer.SourceTypes.OGR,
      Layer.SourceTypes.MSSQL,
      Layer.SourceTypes.SPATIALITE
    ].indexOf(this.config.source.type) > -1) && this.isQueryable()) {
    return this.getTableFields().length > 0;
  }
  
  if (this.getServerType() === Layer.ServerTypes.G3WSUITE && "geojson" === this.get('source').type) {
    return true
  }

  if (this.getServerType() !== Layer.ServerTypes.G3WSUITE && this.isFilterable()) {
    return true;
  }

  return false;
};

/**
 * @TODO Description
 *
 * @param { Object } field
 * @param field.name
 * @param field.type
 * @param field.options
 * @param field.reset
 *
 * @returns {*}
 */
proto.changeFieldType = function({
  name,
  type,
  options = {},
  reset   = false,
} = {}) {
  const field = this.getFields().find(field => field.name === name);
  
  if (field && reset) {
    field.type = field._type;
    delete field._type;
    delete field[`${type}options`];
    return field.type;
  }

  if (field && !reset) {
    field._type = field.type;
    field.type = type;
    field[`${type}options`] = options;
    return field._type;
  }

};

/**
 * @TODO Description
 *
 * @param { Object } config
 * @param config.name
 * @param config.type
 * @param config.options
 * @param config.reset
 *
 * @returns {*}
 */
proto.changeConfigFieldType = function({
  name,
  type,
  options = {},
  reset   = false,
}) {
  return this.changeFieldType({ name, type, options, reset });
};

/**
 * @TODO Description
 *
 * @param name
 */
proto.resetConfigField = function({name}) {
  this.changeConfigFieldType({ name, reset: true });
};

/**
 * Function called in case of change project to remove all stored information 
 */
proto.clear = function() {};

/**
 * @returns {boolean} whether is a vector layer
 */
proto.isVector = function() {
  return this.getType() === Layer.LayerTypes.VECTOR;
};

/**
 * @returns {boolean} whether is a table layer
 */
proto.isTable = function() {
  return this.getType() === Layer.LayerTypes.TABLE;
};

/**
 * @since 3.8.0
 */
proto.getFeatureCount = function() {
  return this.state.featurecount;
};

/**
 * @param style
 * 
 * @returns { Promise<Object | void>}
 * 
 * @since 3.8.0
 */
proto.getStyleFeatureCount = async function(style) {
  // skip when layer hasn't feature count option set on QGIS project
  if (undefined === this.state.stylesfeaturecount) {
    return;
  }
  if (undefined === this.state.stylesfeaturecount[style]) {
    try {
      const { result, data } = await XHR.post({
        url: `${this.config.urls.featurecount}${this.getId()}/`,
        data: JSON.stringify({ style }),
        contentType: 'application/json'
      });
      this.state.stylesfeaturecount[style] = (true === result ? data : {});
    } catch(err) {
      this.state.stylesfeaturecount[style] = {};
    }
  }
  return this.state.stylesfeaturecount[style];
};

/**
 * @returns { string } layer format (eg. 'image/png') 
 * 
 * @since 3.9.1
 */
proto.getFormat = function() {
  return this.config.format ||
    ProjectsRegistry.getCurrentProject().getWmsGetmapFormat() ||
    'image/png'
};

/**
 * [LAYER SELECTION]
 *
 * Base on boolean value create a filter token from server
 * based on selection or delete current filtertoken
 *
 * @param bool
 *
 * @returns {Promise<void>}
 *
 * @deprecated since 3.9.0. Will be removed in 4.x. Use Layer::createFilterToken() and deleteFilterToken(fid) instead
 */
proto.activeFilterToken = deprecate(async function(bool) { await this[bool ? 'createFilterToken' : 'deleteFilterToken'](); }, '[G3W-CLIENT] Layer::activeFilterToken(bool) is deprecated');

/**
 * @deprecated since 3.9.0. Will be removed in 4.x. Use Layer::getLayerEditingFormStructure() instead
 */
proto.getEditorFormStructure = deprecate(proto.getLayerEditingFormStructure, '[G3W-CLIENT] Layer::getEditorFormStructure() is deprecated');

/// LAYER PROPERTIES

/**
 * Layer Types
 */
Layer.LayerTypes = {
  TABLE: "table",
  IMAGE: "image",
  VECTOR: "vector"
};

/**
 * Server Types
 */
Layer.ServerTypes = {
  OGC: "OGC",
  QGIS: "QGIS",
  Mapserver: "Mapserver",
  Geoserver: "Geoserver",
  ARCGISMAPSERVER: "ARCGISMAPSERVER",
  OSM: "OSM",
  BING: "Bing",
  LOCAL: "Local",
  TMS: "TMS",
  WMS: "WMS",
  WMTS: "WMTS",
  G3WSUITE: "G3WSUITE"
  /** 
   * ADD ALSO TO PROVIDER FACTORY (@TODO or already done?) 
   */
};

/**
 * Source Types
 */
Layer.SourceTypes = {
  VIRTUAL:'virtual',
  POSTGIS: 'postgres',
  SPATIALITE: 'spatialite',
  ORACLE: 'oracle',
  MSSQL: 'mssql',
  CSV: 'delimitedtext',
  OGR: 'ogr',
  GDAL: 'gdal',
  WMS: 'wms',
  WMST: "wmst",
  WFS: 'wfs',
  WCS: "wcs",
  MDAL: "mdal",
  "VECTOR-TILE": "vector-tile",
  VECTORTILE: "vectortile",
  ARCGISMAPSERVER: 'arcgismapserver',
  GEOJSON: "geojson",
  /** @since 3.9.0 */
  POSTGRESRASTER: 'postgresraster',
  /**
   * ADD TO PROVIDER FACTORY (@TODO or already done?)
   */
};

/**
 * Layer Capabilities
 */
Layer.CAPABILITIES = {
  QUERYABLE: 1,
  FILTERABLE: 2,
  EDITABLE: 4
};

/**
 * Editing types 
 */
Layer.EDITOPS = {
  INSERT: 1,
  UPDATE: 2,
  DELETE: 4
};

/**
 * BACKOMP v3.x
 */
Layer.SELECTION_STATE = SELECTION_STATE;

module.exports = Layer;
