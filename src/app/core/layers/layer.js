import ApplicationState from 'core/applicationstate';
const t = require('core/i18n/i18n.service').t;
const {inherit, base, XHR } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const Filter = require('core/layers/filter/filter');
const { geometryFields } =  require('core/utils/geo');
const Relations = require('core/relations/relations');
const ProviderFactory = require('core/layers/providers/providersfactory');

// Base Class of all Layer
function Layer(config={}, options={}) {
  const ProjectsRegistry = require('core/project/projectsregistry');
  this.config = config;
  // assign some attribute
  config.id = config.id || 'Layer';
  config.title = config.title || config.name;
  config.download = !!config.download;
  config.geolayer = false;
  config.baselayer = !!config.baselayer;
  config.fields = config.fields || {};
  config.urls = {
    query: config.infourl && config.infourl !== '' ? config.infourl : config.wmsUrl,
    ...(config.urls || {})
  };
  const {project=ProjectsRegistry.getCurrentProject()} = options;
  const projectRelations = project.getRelations();
  // create relations
  this._relations = this._createRelations(projectRelations);
  if (!this.isBaseLayer()) {
    //filtertoken
    //set url to get varios type of data
    const projectType = project.getType();
    const projectId = project.getId();
    const suffixUrl = `${projectType}/${projectId}/${config.id}/`;
    const vectorUrl = project.getVectorUrl();
    this.config.urls.filtertoken = `${vectorUrl}filtertoken/${suffixUrl}`;
    this.config.urls.data = `${vectorUrl}data/${suffixUrl}`;
    this.config.urls.shp = `${vectorUrl}shp/${suffixUrl}`;
    this.config.urls.csv = `${vectorUrl}csv/${suffixUrl}`;
    this.config.urls.xls = `${vectorUrl}xls/${suffixUrl}`;
    this.config.urls.gpx = `${vectorUrl}gpx/${suffixUrl}`;
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
    metadata_querable: this.isBaseLayer() ? false: this.isQueryable({onMap:false}),
    openattributetable: this.isBaseLayer() ? false: this.canShowTable(),
    removable: config.removable || false,
    source: config.source,
    infoformat: this.getInfoFormat(),
    geolayer: false,
    selection: {
      active: false
    },
    filter: {
      active: false
    },
    attributetable: {
      pageLength: null,
    },
    visible: config.visible || false,
    tochighlightable: false
  };

  // add selectionFids
  this.selectionFids = new Set();

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
      filtertoken: ProviderFactory.build('filtertoken', serverType, sourceType, {
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
//relations
proto._createRelations = function(projectRelations) {
  const relations = [];
  const layerId = this.getId();
  projectRelations.forEach(relation => {
    if ([relation.referencedLayer, relation.referencingLayer].indexOf(layerId) !== -1)
      relations.push(relation);
  });
  return new Relations({
    relations
  });
};

// retunr relations of layer
proto.getRelations = function() {
  return this._relations
};

proto.getRelationById = function(id) {
  return this._relations.getArray().find(relation => {
    relation.getId() === id;
  })
};

proto.getRelationAttributes = function(relationName) {
  let fields = [];
  this._relations.forEach(relation => {
    if (relation.name === relationName) {
      fields = relation.fields;
      return false
    }
  });
  return fields;
};

proto.getRelationsAttributes = function() {
  const fields = {};
  this.state.relations.forEach(relation => {
    fields[relation.name] = relation.fields;
  });
  return fields;
};

proto.isChild = function() {
  if (!this.getRelations())
    return false;
  return this._relations.isChild(this.getId());
};

proto.isFather = function() {
  if (!this.getRelations())
    return false;
  return this._relations.isFather(this.getId());
};

proto.getChildren = function() {
  if (!this.isFather()) return [];
  return this._relations.getChildren(this.getId());
};

proto.getFathers = function() {
  if (!this.isChild()) return [];
  return this._relations.getFathers(this.getId());
};

proto.hasChildren = function() {
  if (!this.hasRelations()) return false;
  return this._relations.hasChildren(this.getId());
};

proto.hasFathers = function() {
  if (!this.hasRelations()) return false;
  return this._relations.hasFathers(this.getId());
};

proto.hasRelations = function() {
  return !!this._relations;
};
//end relations


// global state
proto.setAttributeTablePageLength = function(pageLength){
  this.state.attributetable.pageLength = pageLength
};

proto.getAttributeTablePageLength = function(){
  return this.state.attributetable.pageLength;
};

// end global state

//filter token
proto.setFilter = function(bool=false){
  this.state.filter.active = bool;
};

proto.getFilterActive = function(){
  return this.state.filter.active;
};

proto.toggleFilterToken = async function(){
  this.state.filter.active = !this.state.filter.active;
  await this.activeFilterToken(this.state.filter.active);
  return this.state.filter.active;
};

proto.activeFilterToken = async function(bool){
  await bool ? this.createFilterToken() : this.deleteFilterToken();
};

proto.deleteFilterToken = async function(){
  const ApplicationService = require('core/applicationservice');
  if (this.providers['filtertoken']){
    try {
      await this.providers['filtertoken'].deleteFilterToken();
      ApplicationService.setFilterToken(null);
      this.emit('filtertokenchange', {
        layerId: this.getId()
      });
    } catch(err) {
      console.log('Error deleteing filtertoken')
    }
  }
};

proto.createFilterToken = async function(){
  const ApplicationService = require('core/applicationservice');
  if (this.providers['filtertoken']){
    let filtertoken = null;
    try {
      if (this.selectionFids.size > 0) {
        // create filter token
        if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) {
          await this.providers['filtertoken'].deleteFilterToken();
        } else {
          const params = {};
          if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE))
            params.fidsout = Array.from(this.selectionFids).filter(id => id !== Layer.SELECTION_STATE.EXCLUDE).join(',');
          else params.fidsin = Array.from(this.selectionFids).join(',');
          filtertoken = await this.providers['filtertoken'].getFilterToken(params);
        }
        ApplicationService.setFilterToken(filtertoken);
        this.emit('filtertokenchange', {
          layerId: this.getId()
        });
      }
    } catch(err){
      console.log('Error create update token');
    }
  }
};
// end filter token
//selection Ids layer methods

proto.setSelectionFidsAll = function(){
  this.selectionFids.clear();
  this.selectionFids.add(Layer.SELECTION_STATE.ALL);
  this.isGeoLayer() && this.showAllOlSelectionFeatures();
  this.setSelection(true);
  this.state.filter.active && this.createFilterToken();
};

proto.getSelectionFids = function(){
  return this.selectionFids;
};

proto.invertSelectionFids = function(){
  if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) this.selectionFids.delete(Layer.SELECTION_STATE.EXCLUDE);
  else if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) this.selectionFids.delete(Layer.SELECTION_STATE.ALL);
  else if (this.selectionFids.size > 0) this.selectionFids.add(Layer.SELECTION_STATE.EXCLUDE);
  this.isGeoLayer() && this.setInversionOlSelectionFeatures();
  this.state.filter.active && this.createFilterToken();
  this.setSelection(this.selectionFids.size > 0);
};

proto.hasSelectionFid = function(fid){
  if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) return true;
  else if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) return !this.selectionFids.has(fid);
  else return this.selectionFids.has(fid) ;
};

proto.includeSelectionFid = async function(fid, createToken=true){
  if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE) && this.selectionFids.has(fid)) {
    this.selectionFids.delete(fid);
    this.selectionFids.size === 1 && this.setSelectionFidsAll();
  } else {
    this.selectionFids.add(fid);
    !this.isSelectionActive() && this.setSelection(true);
  }
  this.isGeoLayer() && this.setOlSelectionFeatureByFid(fid, 'add');
  createToken && this.state.filter.active && await this.createFilterToken();
};

proto.includeSelectionFids = function(fids=[]){
  fids.forEach(fid => this.includeSelectionFid(fid));
};

proto.excludeSelectionFid = async function(fid) {
  if (this.selectionFids.has(Layer.SELECTION_STATE.ALL) || this.selectionFids.size === 0) {
    this.selectionFids.clear();
    this.selectionFids.add(Layer.SELECTION_STATE.EXCLUDE);
  }
  this.selectionFids[this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE) ? 'add' : 'delete'](fid);
  if (this.selectionFids.size === 1 && this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) this.setselectionFidsAll();
  const isLastFeatureSelected  = this.isGeoLayer() && this.setOlSelectionFeatureByFid(fid, 'remove');
  this.state.filter.active && await this.createFilterToken();
  if (this.selectionFids.size === 0 || isLastFeatureSelected) {
    this.selectionFids.clear();
    this.setSelection(false);
  }
};

proto.excludeSelectionFids = function(fids=[]) {
  fids.forEach(fid => this.excludeSelectionFid(fid));
};

proto.clearSelectionFids = function(){
  this.selectionFids.clear();
  this.isGeoLayer() && this.setOlSelectionFeatures();
  this.setSelection(false);
};
// end selection ids methods

proto.getWMSLayerName = function() {
  return this.isWmsUseLayerIds() ? this.getId() : this.getName()
};

proto.isWmsUseLayerIds = function() {
  return this.config.wms_use_layer_ids;
};

proto.getXls = function({data}={}){
  const url = this.getUrl('xls');
  return XHR.fileDownload({
    url,
    data,
    httpMethod: "GET"
  })
};

proto.getShp = function({data}={}) {
  const url = this.getUrl('shp');
  return XHR.fileDownload({
    url,
    data,
    httpMethod: "GET"
  })
};

proto.getGpx = function({data}={}){
  const url = this.getUrl('gpx');
  return XHR.fileDownload({
    url,
    data,
    httpMethod: "GET"
  })
};

proto.getCsv = function({data}={}){
  const url = this.getUrl('csv');
  return XHR.fileDownload({
    url,
    data,
    httpMethod: "GET"
  })
};

proto.getSourceType = function() {
  return this.config.source ? this.config.source.type : null;
};

proto.isGeoLayer = function() {
  return this.state.geolayer;
};

/*
* getFilterData is a function to get data feature based on fields and suggets
* params:
* - suggest (mandatory): object with key is a field of layer and value is value of the field to filter
* - fields: Array of object with type of suggest (see above)
* */
proto.getFilterData = async function({field, suggest={}, unique}={}){
  const provider =  this.getProvider('data');
  const response = await provider.getFilterData({
    field,
    suggest,
    unique
  });
  return response;
};

proto.getDataTable = function({ page = null, page_size=null, ordering=null, search=null, suggest=null, formatter=0 , in_bbox} = {}) {
  const d = $.Deferred();
  let provider;
  const params = {
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
    if (this.state.openattributetable) {
      provider = this.getProvider('data');
      provider.getFeatures({editing: false}, params)
        .done(response => {
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
        .fail(err => d.reject(err))
    } else if (this.isFilterable()) {
      provider = this.getProvider('filter');
      const filter = new Filter();
      filter.getAll();
      provider.query({
        filter
      })
        .done(response => {
          const data = provider.digestFeaturesForLayers(response.data);
          const dataTableObject = {
            headers: data[0].attributes,
            features: data[0].features,
            title: this.getTitle()
          };
          d.resolve(dataTableObject)
        })
        .fail(err => d.reject(err))
    } else
      d.reject()
  }
  return d.promise();
};

// search method
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
  if (provider)
    provider.query(options)
      .done(response => d.resolve(response))
      .fail(err => d.reject(err));
  else d.reject(t('sdk.search.layer_not_searchable'));
  return d.promise();
};

//Info from layer (only for querable layers)
proto.query = function(options={}) {
  const d = $.Deferred();
  const { filter } = options;
  const provider = this.getProvider(filter? 'filter' : 'query');
  if (provider)
    provider.query(options)
      .done(response => d.resolve(response))
      .fail(err => d.reject(err));
  else d.reject(t('sdk.search.layer_not_querable'));
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
  return this.getTableFields().filter(field => geometryFields.indexOf(field.name) === -1);
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
  return !this.isBaseLayer() && this.config.download;
};

proto.isXlsDownlodable = function(){
  return !this.isBaseLayer() && this.config.download_xls;
};

proto.isGpxDownlodable = function(){
  return !this.isBaseLayer() && this.config.download_gpx;
};

proto.isCsvDownlodable = function(){
  return !this.isBaseLayer() && this.config.download_csv;
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

proto.setSelection = async function(bool=false){
  this.state.selection.active = bool;
  if (!bool) {
    this.state.filter.active && await this.deleteFilterToken();
    this.state.filter.active = bool;
    this.emit('unselectionall', this.getId());
  }
};

proto.isSelectionActive = function(){
  return this.state.selection.active;
};

proto.getSelection = function(){
  return this.state.selection;
};

proto.getFilter = function(){
  return this.state.filter;
};

proto.setDisabled = function(bool) {
  this.state.disabled = bool;
  this.isVisible();
};

proto.isDisabled = function() {
  return this.state.disabled;
};

proto.isVisible = function() {
  this.state.visible = this.isGeoLayer() ? !this.state.groupdisabled && this.state.checked && !this.isDisabled() : this.state.visible;
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

proto.getOws = function(){
  return this.config.ows;
};

proto.getTocHighlightable = function(){
  return this.state.tochighlightable
};

proto.setTocHighlightable = function(bool=false) {
  this.state.tochighlightable = bool;
};

/*
 condition: plain object with configuration layer attribute and value
* */
proto.isFilterable = function(conditions=null) {
  let isFiltrable = !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.FILTERABLE));
  if (isFiltrable && conditions) {
    const conditionalFiltrable = Object.keys(conditions).reduce((bool, attribute) =>{
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

proto.isEditable = function() {
  return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.EDITABLE));
};

proto.isBaseLayer = function() {
  return this.config.baselayer;
};

// get url by type ( data, shp, csv, xls,  editing..etc..)
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
  return this.state.infolayer && this.config.infolayer !== '' ? this.config.infolayer :  this.config.origname;
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
    if( ([
            Layer.SourceTypes.POSTGIS,
            Layer.SourceTypes.ORACLE,
            Layer.SourceTypes.OGR,
            Layer.SourceTypes.MSSQL,
            Layer.SourceTypes.SPATIALITE
          ].indexOf(this.config.source.type) > -1) && this.isQueryable()) {
      return true
    }
  } else if (this.getServerType() === 'G3WSUITE') {
      if (this.get('source').type === "geojson")
        return true
  } else if (this.isFilterable())
    return true;
  return false
};

//function called in case of change project to remove all sored information
proto.clear = function(){};

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
  WMS: "WMS",
  WMTS: "WMTS",
  G3WSUITE: "G3WSUITE"
  /*

 ADD ALSO TO PROVIDER FACTORY

 */
};

// Source Types
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
  WFS: 'wfs',
  ARCGISMAPSERVER: 'arcgismapserver',
  GEOJSON: "geojson"
  /*

 ADD TO PROVIDER FACTORY

 */
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

//selection state
Layer.SELECTION_STATE = {
  ALL: '__ALL__',
  EXCLUDE: '__EXCLUDE__'
};

module.exports = Layer;
