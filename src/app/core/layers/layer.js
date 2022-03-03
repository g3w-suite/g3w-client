import ApplicationState from 'core/applicationstate';
import {DOWNLOAD_FORMATS} from './../../constant';
const {t} = require('core/i18n/i18n.service');
const {inherit, base, XHR} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const {geometryFields, parseAttributes} =  require('core/utils/geo');
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
  this.config.search_endpoint = project.getSearchEndPoint();
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
    this.config.urls.gpkg = `${vectorUrl}gpkg/${suffixUrl}`;
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
    infoformat: this.getInfoFormat(),
    infoformats: this.config.infoformats || [],
    projectLayer: true,
    geolayer: false,
    selection: {
      active: false
    },
    filter: {
      active: false
    },
    attributetable: {
      pageLength: null
    },
    visible: config.visible || false,
    tochighlightable: false
  };

  // add selectionFids
  this.selectionFids = new Set();

  // referred to (layersstore);
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
  // used to store last proxy params (useful for repeat request info formats for wms external layer)
  this.proxyData = {
    wms: null // at the moment only wms data from server
  };
  base(this);
}

inherit(Layer, G3WObject);

const proto = Layer.prototype;

/**
 * Proxyparams
 */

proto.getProxyData = function(type){
  return type ? this.proxyData[type] : this.proxyData;
};

proto.setProxyData= function(type, data={}){
  this.proxyData[type] = data;
};

proto.clearProxyData = function(type){
  this.proxyData[type] = null;
};

proto.getDataProxyFromServer = async function(type= 'wms', proxyParams={}){
  const DataRouterService = require('core/data/routerservice');
  try {
    const {response, data} = await DataRouterService.getData(`proxy:${type}`, {
      inputs: proxyParams,
      outputs: false
    });
    this.setProxyData(type, JSON.parse(data));
    return response;
  } catch(err){
    return;
  }
};

proto.changeProxyDataAndReloadFromServer = function(type='wms', changes={}) {
  Object.keys(changes).forEach(changeParam =>{
    Object.keys(changes[changeParam]).forEach(param =>{
      const value = changes[changeParam][param];
      this.proxyData[type][changeParam][param] = value;
    })
  });
  return this.getDataProxyFromServer(type, this.proxyData[type]);
};

/**
 * end proxy params
 */

proto.getSearchParams = function(){
  return this.config.searchParams;
};

/**
 *
 * @returns {*}
 */
proto.getSearchEndPoint = function(){
  return this.getType() !== Layer.LayerTypes.TABLE ? this.config.search_endpoint : "api";
};

//relations
proto._createRelations = function(projectRelations) {
  const layerId = this.getId();
  const relations = projectRelations.filter(relation => [relation.referencedLayer, relation.referencingLayer].indexOf(layerId) !== -1);
  return new Relations({
    relations
  });
};

// return relations of layer
proto.getRelations = function() {
  return this._relations
};

proto.getRelationById = function(id) {
  return this._relations.getArray().find(relation => relation.getId() === id);
};

proto.getRelationAttributes = function(relationName) {
  const relation = this._relations.find(relation => relation.name === relationName);
  return relation ? relation.fields : [];
};

proto.getRelationsAttributes = function() {
  const fields = {};
  this.state.relations.forEach(relation => fields[relation.name] = relation.fields);
  return fields;
};

proto.isChild = function() {
  if (!this.getRelations()) return false;
  return this._relations.isChild(this.getId());
};

proto.isFather = function() {
  if (!this.getRelations()) return false;
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

/**
 *
 * DOWNLOAD METHODS
 */

proto.getDownloadFilefromDownloadDataType = function(type, {data, options}){
  let promise;
  switch (type) {
    case 'shapefile':
      promise = this.getShp({data, options});
      break;
    case 'xls':
      promise  = this.getXls({data, options});
      break;
    case 'csv':
      promise  = this.getCsv({data, options});
      break;
    case 'gpx':
      promise = this.getGpx({data, options});
      break;
    case 'gpkg':
      promise = this.getGpkg({data, options});
      break;
  }
  return promise;
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

proto.getGpkg = function({data}={}){
  const url = this.getUrl('gpkg');
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

proto.getDataTable = function({page = null, page_size=null, ordering=null, search=null, field, suggest=null, formatter=0 , in_bbox, custom_params={}} = {}) {
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
        const data = response.data;
        const count = response.count;
        const title = this.getTitle();
        const features = data.features && data.features || [];
        let headers = features.length ? features[0].properties : [];
        headers = parseAttributes(this.getAttributes(), headers);
        const dataTableObject = {
          headers,
          features,
          title,
          count
        };
        d.resolve(dataTableObject)
      })
      .fail(err => d.reject(err))
  }
  return d.promise();
};

/**
 * Search layer feature by fid
 * @param fid
 */
proto.getFeatureByFid = async function(fid){
  const url = this.getUrl('data');
  let feature;
  try {
    const response = await XHR.get({
      url,
      params: {
        fid
      }
    });
    feature = response && response.result && response.vector && response.vector.data && response.vector.data.features[0];
  } catch(err){}
  return feature
};

//search Features methods
proto.searchFeatures = function(options={}, params={}){
  const {search_endpoint = this.config.search_endpoint} = options;
  return new Promise(async (resolve, reject) =>{
    switch (search_endpoint) {
      case 'ows':
        this.search(options, params)
          .then(results => {
            results = {
              data: results
            };
            resolve(results);
          }).fail(error => reject(error));
        break;
      case 'api':
        const {raw=false, filter:field, suggest={}, unique, queryUrl, ordering} = options;
        try {
          const response = await this.getFilterData({
            queryUrl,
            raw,
            field,
            ordering,
            suggest,
            unique
          });
          resolve(response);
        } catch(err){
          reject(err);
        }
        break;
    }
  })
};

/*
* getFilterData is a function to get data feature based on fields and suggets
* params:
* - suggest (mandatory): object with key is a field of layer and value is value of the field to filter
* - fields: Array of object with type of suggest (see above)
* */
proto.getFilterData = async function({field, raw=false, suggest={}, unique, formatter=1, queryUrl, ordering}={}){
  const provider =  this.getProvider('data');
  const response = await provider.getFilterData({
    queryUrl,
    field,
    raw,
    ordering,
    suggest,
    formatter,
    unique
  });
  return response;
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
  const {filter} = options;
  const provider = this.getProvider(filter ? 'filter' : 'query');
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

/**
 * Get field by name
 * @param fieldName
 * @returns {*}
 */
proto.getFieldByName = function(fieldName){
  return this.getFields().find(field => field.name === fieldName)
};

proto.getEditingFields = function() {
  return this.config.editing.fields;
};

proto.getTableFields = function() {
  return this.config.fields.filter(field => field.show);
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

/**
 * get form structur to show on form editing
 * @param fields
 * @returns {[]}
 */
proto.getLayerEditingFormStructure = function(fields){
  const isInputOrTab = item =>  {
    const isInput = item.field_name !== undefined;
    return  {
      type: isInput && 'input' || 'tab',
      item: isInput && [fields.find(field => field.name ===item.field_name)] || [item]
    }
  };
  let prevtabitems = [];
  const formstructure = [];
  this.config.editor_form_structure.forEach(item => {
    const _item = isInputOrTab(item);
    if (_item.type === 'input') {
      formstructure.push(_item);
      prevtabitems = [];
    } else {
      if (!prevtabitems.length) {
        formstructure.push(_item);
        prevtabitems = _item.item;
      } else prevtabitems.push(_item.item[0]);
    }
  });
  return formstructure;
};

proto.getEditorFormStructure = function({all=false}={}) {
  return this.config.editor_form_structure && !all ? this.config.editor_form_structure.filter(structure => {
    return !structure.field_name;
  }) : this.config.editor_form_structure;
};

proto.getFieldsOutOfFormStructure = function() {
  return this.config.editor_form_structure ? this.config.editor_form_structure.filter(structure => {
    return structure.field_name;
  }) : []
};

proto.hasFormStructure = function() {
  return !!this.config.editor_form_structure;
};

//get custom style for future implementation
proto.getCustomStyle = function(){
  return this.config.customstyle;
};

proto.getState = function() {
  return this.state;
};

proto.getSource = function() {
  return this.state.source;
};

proto.isDownloadable = function(){
  return this.isShpDownlodable() || this.isXlsDownlodable() ||
    this.isGpxDownlodable() || this.isGpkgDownlodable() || this.isCsvDownlodable();
};

proto.getDownloadableFormats = function(){
  return Object.keys(DOWNLOAD_FORMATS).filter(download_format => this.config[download_format]).map(format => DOWNLOAD_FORMATS[format].format);
};

proto.getDownloadUrl = function(format){
  const find = Object.values(DOWNLOAD_FORMATS).find(download_format => download_format.format === format);
  return find && find.url;
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

proto.isGpkgDownlodable = function(){
  return !this.isBaseLayer() && this.config.download_gpkg;
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

proto.setHidden = function(bool=true) {
  this.state.hidden = bool;
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
};

proto.isDisabled = function() {
  return this.state.disabled;
};

proto.isVisible = function() {
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
    queryEnabled = this.isVisible() && !this.isDisabled();
    if (this.config.infowhennotvisible !== undefined && this.config.infowhennotvisible === true) queryEnabled = true;
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

/**
 * Check if layer is setup as time series
 */
proto.isQtimeseries = function(){
  return this.config.qtimeseries;
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

/**
 * Method to set url
 * @param type
 * @param url
 */
proto.setUrl = function({type, url}={}){
  this.config.urls[type] = url;
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
  /**
   * In case of qtime series (NETCDF)
   */
  if (this.config.qtimeseries === true || this.getSourceType() === 'gdal') return 'application/json';
  else return (this.config.infoformat && this.config.infoformat !== '' && ogcService !== 'wfs') ?  this.config.infoformat : 'application/vnd.ogc.gml';
};

proto.getInfoFormats = function(){
  return this.state.infoformats;
};

proto.getInfoUrl = function() {
  return this.config.infourl;
};

proto.setInfoFormat = function(infoFormat) {
  this.config.infoformat = infoFormat;
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
  const field = this.getAttributes().find(field=> field.name === name);
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
  if (!this.config.not_show_attributes_table){
    if (this.getServerType() === Layer.ServerTypes.QGIS) {
      if( ([
        Layer.SourceTypes.POSTGIS,
        Layer.SourceTypes.ORACLE,
        Layer.SourceTypes.WFS,
        Layer.SourceTypes.OGR,
        Layer.SourceTypes.MSSQL,
        Layer.SourceTypes.SPATIALITE
      ].indexOf(this.config.source.type) > -1) && this.isQueryable()) {
        return true
      }
    } else if (this.getServerType() === Layer.ServerTypes.G3WSUITE) {
      if (this.get('source').type === "geojson")
        return true
    } else if (this.isFilterable())
      return true;
    return false;
  } else return false
};

proto.changeFieldType = function({name, type, reset=false}={}){
  const field = this.getFields().find(field => field.name === name);
  if (field){
    if (reset){
      field.type = field._type;
      delete field._type;
      return field.type;
    } else {
      field._type = field.type;
      field.type = type;
      return field._type;
    }
  }
};

proto.changeFieldTypeFromFormStructure = function({name, type, reset=false}={}){
  const traverseStructure = item => {
    if (item.nodes) item.nodes.forEach(node => traverseStructure(node));
    else {
      let field = layer.formStructure.fields.find(field => field.name === item.field_name);
      if (field) {
        if (this.state.type === 'ows'){
          // clone it to avoid to replace original
          field = {...field};
          field.name = field.name.replace(/ /g, '_');
        }
        attributes.add(field);
      }
    }
  };
  layer.formStructure.structure.length && layer.formStructure.structure.forEach(structure => traverseStructure(structure));
  return Array.from(attributes);
};

proto.changeConfigFieldType = function({name, type, reset=false}){
  if (this.hasFormStructure()){

  } else return this.changeFieldType({name, type, reset});
};

proto.resetConfigField = function({name}){
  this.changeConfigFieldType({
    name,
    reset: true
  })
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
  VECTORTILE: "vector-tile",
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
