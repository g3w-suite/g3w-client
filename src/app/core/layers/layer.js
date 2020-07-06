const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const t = require('core/i18n/i18n.service').t;
const XHR = require('core/utils/utils').XHR;
const G3WObject = require('core/g3wobject');
const Filter = require('core/layers/filter/filter');
const { geometryFields } =  require('core/utils/geo');
const ProviderFactory = require('core/layers/providers/providersfactory');

// Base Class of all Layer
function Layer(config={}, options={}) {
  this.config = config;
  // assign some attribute
  config.id = config.id || 'Layer';
  config.title = config.title || config.name;
  config.download = !!config.download;
  config.geolayer = false;
  config.baseLayer =  false;
  config.fields = config.fields || {};
  config.urls = {
    query: config.infourl && config.infourl !== '' ? config.infourl : config.wmsUrl,
    ...(config.urls || {})
  };
  const {project} = options;
  if (!this.isBaseLayer()) {
    //set url to get varios type of data
    const projectType = project.getType();
    const projectId = project.getId();
    const suffixUrl = `${projectType}/${projectId}/${config.id}/`;
    const vectorUrl = project.getVectorUrl();
    this.config.urls.data = `${vectorUrl}data/${suffixUrl}`;
    this.config.urls.shp = `${vectorUrl}shp/${suffixUrl}`;
    this.config.urls.xls = `${vectorUrl}xls/${suffixUrl}`;
    this.config.urls.editing = `${vectorUrl}editing/${suffixUrl}`;
    this.config.urls.commit = `${vectorUrl}commit/${suffixUrl}`;
    this.config.urls.config = `${vectorUrl}config/${suffixUrl}`;
    this.config.urls.unlock = `${vectorUrl}unlock/${suffixUrl}`;
    this.config.urls.widget = {
      unique: `${vectorUrl}widget/unique/data/${suffixUrl}`
    };
    //set custom parameters based on project qgis version
    this.config.searchParams = {
      I: 0,
      J: 0
    };
  }

  // dinamic layer values
  this.state = {
    id: config.id,
    title: config.title,
    selected: config.selected || false,
    disabled: config.disabled || false,
    metadata: config.metadata,
    metadata_querable: this.isQueryable({onMap:false}),
    openattributetable: this.canShowTable(),
    removable: config.removable || false,
    source: config.source,
    infoformat: this.getInfoFormat(),
    geolayer: false,
    visible: config.visible || false
  };


  // refferred to (layersstore);
  this._layersstore = config.layersstore || null;
  /*
    Providers that layer can use

    Three type of provider:
      1 - query
      2 - filter
      3 - data -- raw data del layer (editing)
   */
  // server type
  const serverType = this.config.servertype;
  // source layer
  const sourceType = this.config.source ? this.config.source.type : null;
  if (serverType && sourceType) {
    this.providers = {
      query: ProviderFactory.build('query', serverType, sourceType, {
        layer: this
      }),
      filter: ProviderFactory.build('filter', serverType, sourceType, {
        layer: this
      }),
      search: ProviderFactory.build('search', serverType, sourceType, {
        layer: this
      }),
      data: ProviderFactory.build('data', serverType, sourceType, {
        layer: this
      })
    };
  }
  base(this);
}

inherit(Layer, G3WObject);

const proto = Layer.prototype;


proto.getWMSLayerName = function() {
  return this.isWmsUseLayerIds() ? this.getId() : this.getName()
};

proto.isWmsUseLayerIds = function() {
  return this.config.wms_use_layer_ids;
};

proto.getXls = function({fid}={}){
  const url = this.getUrl('xls');
  return XHR.fileDownload({
    url,
    httpMethod: "GET"
  })
};

proto.getShp = function({fid}={}) {
  const url = this.getUrl('shp');
  return XHR.fileDownload({
    url,
    httpMethod: "GET"
  })
};

proto.getGpx = function({fid}={}){
  const url = this.getUrl('gpx');
  return XHR.fileDownload({
    url,
    httpMethod: "GET"
  })
};

proto.getSourceType = function() {
  return this.config.source ? this.config.source.type : null;
};

proto.isGeoLayer = function() {
  return this.state.geolayer;
};

proto.getDataTable = function({ page = null, page_size=null, ordering=null, search=null, suggest=null, formatter=0 } = {}) {
  const d = $.Deferred();
  let provider;
  const params = {
    page,
    page_size,
    ordering,
    search,
    formatter,
    suggest
  };
  if (!(this.getProvider('filter')  || this.getProvider('data'))) {
   d.reject();
  } else {
    if (this.state.openattributetable) {
      provider = this.getProvider('data');
      provider.getFeatures({editing: false}, params)
        .done((response) => {
          const data = response.data;
          const count = response.count;
          const title = this.getTitle();
          const features = data.features && data.features || [];
          let headers = features.length ? features[0].properties : [];
          headers = provider._parseAttributes(this.getAttributes(), headers);
          const dataTableObject = {
            headers,
            features,
            title,
            count
          };
          d.resolve(dataTableObject)
        })
        .fail((err) => {
          d.reject(err)
        })
    } else if (this.isFilterable()) {
      provider = this.getProvider('filter');
      const filter = new Filter();
      filter.getAll();
      provider.query({
        filter
      })
        .done((response) => {
          const data = provider.digestFeaturesForLayers(response.data);
          const dataTableObject = {
            headers: data[0].attributes,
            features: data[0].features,
            title: this.getTitle()
          };
          d.resolve(dataTableObject)
        })
        .fail((err) => {
          d.reject(err)
        })
    } else {
      d.reject()
    }
  }
  return d.promise();
};

// search method
proto.search = function(options={}, params={}) {
  // check option feature_count
  options.feature_count = options.feature_count || 10;
  //for qgis 2 / 3 purpose
  options = {
    ...options,
    ...this.config.searchParams,
    ...params
    };
  const d = $.Deferred();
  const provider = this.getProvider('search');
  if (provider) {
    provider.query(options)
      .done(function(response) {
        d.resolve(response);
      })
      .fail(function(err) {
        d.reject(err);
      });
  } else {
    d.reject(t('sdk.search.layer_not_searchable'));
  }
  return d.promise();
};

//Info from layer (only for querable layers)
proto.query = function(options={}) {
  const d = $.Deferred();
  let provider = this.getProvider('query');
  // in case filter
  if (options.filter) {
    provider = this.providers.filter;
  }
  // if is intanced provider
  if (provider) {
    provider.query(options)
      .done(function(response) {
        d.resolve(response);
      })
      .fail(function(err) {
        d.reject(err);
      });
  } else {
    d.reject('Il layer non è interrogabile');
  }
  return d.promise();
};

// generel way to get an attribute
proto.get = function(property) {
  return this.config[property] ? this.config[property] : this.state[property];
};

proto.getFields = function() {
  return this.config.fields
};

proto.getEditingFields = function() {
  return this.config.editing.fields;
};

proto.getTableFields = function() {
  return this.config.fields.filter((field) => {
    return field.show
  })
};

proto.getTableHeaders = function(){
  return this.getTableFields().filter((field) => {
    return geometryFields.indexOf(field.name) === -1
  });
};

proto.getProject = function() {
  return this.config.project;
};

proto.getConfig = function() {
  return this.config;
};

proto.getEditorFormStructure = function({all=false}={}) {
  return this.config.editor_form_structure && !all ? this.config.editor_form_structure.filter((structure) => {
    return !structure.field_name;
  }) : this.config.editor_form_structure;
};

proto.getFieldsOutOfFormStructure = function() {
  return this.config.editor_form_structure ? this.config.editor_form_structure.filter((structure) => {
    return structure.field_name;
  }) : []
};

proto.hasFormStructure = function() {
  return !!this.config.editor_form_structure;
};

proto.getState = function() {
  return this.state;
};

proto.getSource = function() {
  return this.state.source;
};

proto.getSourceType = function() {
  return this.state.source ? this.state.source.type : null;
};

proto.isShpDownlodable = function() {
  return this.config.download;
};

proto.isXlsDownlodable = function(){
  return this.config.download_xls;
};

proto.isGpxDownlodable = function(){
  return this.config.download_gpx;
};

proto.getEditingLayer = function() {
  return this._editingLayer;
};

proto.setEditingLayer = function(editingLayer) {
  this._editingLayer = editingLayer;
};

proto.isHidden = function() {
  return this.state.hidden;
};

proto.setHidden = function(bool) {
  this.state.hidden = _.isBoolean(bool) ? bool: true;
};

proto.isModified = function() {
  return this.state.modified;
};

proto.getId = function() {
  return this.config.id;
};

proto.getMetadata = function() {
  return this.state.metadata
};

proto.getTitle = function() {
  return this.config.title;
};

proto.getName = function() {
  return this.config.name;
};

proto.getOrigName = function() {
  return this.config.origname;
};

proto.getServerType = function() {
  return (this.config.servertype && this.config.servertype !== '') ? this.config.servertype : ServerTypes.QGIS;
};

proto.getType = function() {
  return this.type;
};

proto.isType = function(type) {
  return this.getType() === type;
};

proto.setType = function(type) {
  this.type = type;
};

proto.isSelected = function() {
  return this.state.selected;
};

proto.setSelected = function(bool) {
  this.state.selected = bool;
};

proto.setDisabled = function(bool) {
  this.state.disabled = bool;
  this.isVisible();
};

proto.isDisabled = function() {
  return this.state.disabled;
};

proto.isVisible = function() {
  this.state.visible = !this.state.groupdisabled && this.state.checked && !this.isDisabled();
  return this.state.visible;
};

proto.setVisible = function(bool) {
  this.state.visible = bool;
};

// set a parametre map to check if request from map point of view or just a capabilities info layer
proto.isQueryable = function({onMap} = {onMap:false}) {
  let queryEnabled = false;
  const queryableForCababilities = !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.QUERYABLE));
  if (!onMap) return queryableForCababilities;
  // if querable check if is visible or disabled
  if (queryableForCababilities) {
       queryEnabled = (this.isVisible() && !this.isDisabled());
    if (!_.isUndefined(this.config.infowhennotvisible) && (this.config.infowhennotvisible === true)) {
      queryEnabled = true;
    }
  }
  return queryEnabled;
};

proto.isFilterable = function() {
  return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.FILTERABLE));
};

proto.isEditable = function() {
  return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.EDITABLE));
};

proto.isBaseLayer = function() {
  return this.config.baselayer;
};

// get url by type ( data, shp, xls,  editing..etc..)
proto.getUrl = function(type) {
  return this.config.urls[type];
};

// return urls
proto.getUrls = function() {
  return this.config.urls;
};

proto.setEditingUrl = function(url) {
  this.config.urls.editing = url || this.config.urls.editing;
};

proto.getQueryUrl = function() {
  return this.config.urls.query;
};

proto.setQueryUrl = function(queryUrl) {
  this.config.urls.query = queryUrl;
};

proto.getQueryLayerName = function() {
  return (this.config.infolayer && this.config.infolayer !== '') ? this.config.infolayer : this.getName();
};

proto.getQueryLayerOrigName = function() {
  let queryLayerName;
  if (this.state.infolayer && this.config.infolayer !== '') {
    queryLayerName = this.config.infolayer;
  }
  else {
    queryLayerName = this.config.origname;
  }
  return queryLayerName;
};

proto.getInfoFormat = function(ogcService) {
  return (this.config.infoformat && this.config.infoformat !== '' && ogcService !== 'wfs') ?  this.config.infoformat : 'application/vnd.ogc.gml';
};

proto.getInfoUrl = function() {
  return this.config.infourl;
};

proto.setInfoFormat = function(infoFormat) {
  this.state.infoformat = infoFormat;
};

proto.getAttributes = function() {
  return this.config.fields;
};

proto.changeAttribute = function(attribute, type, options) {
  for (const field of this.config.fields) {
    if (field.name === attribute) {
      field.type = type;
      field.options = options;
      break;
    }
  }
};

proto.getAttributeLabel = function(name) {
  const field = this.getAttributes().find((field) => {
   return field.name === name;
  });
  return field && field.label;
};

proto.getProvider = function(type) {
  return this.providers[type];
};

proto.getProviders = function() {
  return this.providers;
};

proto.getLayersStore = function() {
  return this._layersstore;
};

proto.setLayersStore = function(layerstore) {
  this._layersstore = layerstore;
};

proto.canShowTable = function() {
  if (this.getServerType() === 'QGIS') {
    if( ([Layer.SourceTypes.POSTGIS, Layer.SourceTypes.OGR, Layer.SourceTypes.MSSQL, Layer.SourceTypes.SPATIALITE].indexOf(this.config.source.type) > -1) && this.isQueryable()) {
      return true
    }
  } else if (this.getServerType() === 'G3WSUITE') {
      if (this.get('source').type === "geojson")
        return true
  } else if (this.isFilterable())
    return true;
  return false
};


/// LAYER PROPERTIES

// Layer Types
Layer.LayerTypes = {
  TABLE: "table",
  IMAGE: "image",
  VECTOR: "vector"
};

// Server Types
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
  WMTS: "WMTS",
  G3WSUITE: "G3WSUITE"

};

// Source Types
Layer.SourceTypes = {
  POSTGIS: 'postgres',
  SPATIALITE: 'spatialite',
  MSSQL: 'mssql',
  CSV: 'delimitedtext',
  OGR: 'ogr',
  GDAL: 'gdal',
  WMS: 'wms',
  GEOJSON: "geojson"
};

// Layer Capabilities
Layer.CAPABILITIES = {
  QUERYABLE: 1,
  FILTERABLE: 2,
  EDITABLE: 4
};

//Editing types
Layer.EDITOPS = {
  INSERT: 1,
  UPDATE: 2,
  DELETE: 4
};


module.exports = Layer;
