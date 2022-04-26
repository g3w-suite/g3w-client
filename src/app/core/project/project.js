import {QUERY_POINT_TOLERANCE, TOC_LAYERS_INIT_STATUS, TOC_THEMES_INIT_STATUS} from "../../constant";
const {base, inherit, XHR} = require('core/utils//utils');
const {crsToCrsObject} = require('core/utils/geo');
const G3WObject = require('core/g3wobject');
const LayerFactory = require('core/layers/layerfactory');
const LayersStore = require('core/layers/layersstore');
const Projections = require('g3w-ol/src/projection/projections');
function Project(config={}, options={}) {
  /* structure 'project' object
  {
    id,
    type,
    gid,
    name,
    crs,
    extent,
    initextent,
    layers,
    layerstree,
    overviewprojectgid,
    baselayers,
    initbaselayer,
    filtertoken,
    context_base_legend
    ows_method <POST or GET>
    wms_use_layer_ids: <TRUE OR FALSE>
    search_endpoint : 'ows', 'api'
    legend_position: 'tab', 'toc'
    query_point_tolerance
    wps: [] // array of wps service
  }
  */
  // for future implementation catalog tab actived
  config.catalog_tab = config.toc_tab_default || config._catalog_tab || 'layers'; // values : layers, baselayers, legend
  config.ows_method = config.ows_method || 'GET';
  config.toc_layers_init_status = config.toc_layers_init_status || TOC_LAYERS_INIT_STATUS;
  config.toc_themes_init_status = config.toc_themes_init_status || TOC_THEMES_INIT_STATUS;
  config.query_point_tolerance = config.query_point_tolerance || QUERY_POINT_TOLERANCE;
  this.state = config;
  /**
   * View
   *
   */
  //information about api project
  this.urls = {
    map_themes: `/${this.getType()}/api/prjtheme/${this.getId()}/`,
    expression_eval: `/api/expression_eval/${this.getId()}/`,
    vector_data: `${this.getVectorUrl()}data/${this.getType()}/${this.getId()}/`,
};
  /*
   *
   * End View
   *
   */
  // process layers
  this._processLayers();
  // set the project projection to object crs
  this.state.crs = crsToCrsObject(this.state.crs);
  this._projection = Projections.get(this.state.crs);
  // build a layersstore of the project
  this._layersStore = this._buildLayersStore();
  ///
  this.setters = {
    setBaseLayer(id) {
      this.state.baselayers.forEach(baseLayer => {
        this._layersStore.getLayerById(baseLayer.id).setVisible(baseLayer.id === id);
        baseLayer.visible = (baseLayer.id === id);
      })
    }
  };
  this.setSearchEndPoint();
  base(this);
}

inherit(Project, G3WObject);

const proto = Project.prototype;

//get search end point value (ows or api)
proto.getSearchEndPoint = function(){
  return this.state.search_endpoint;
};

proto.setSearchEndPoint = function(){
  const {search_endpoint, search=[]} = this.state;
  search.forEach(search => search.search_endpoint = search_endpoint);
};

proto.getAliasUrl = function() {
  return this.state.aliasUrl;
};

proto.getActiveCatalogTab = function() {
  return this.state.catalog_tab;
};

proto.setActiveCatalogTab = function(tab='layers') {
  this.state.catalog_tab = tab;
};

proto.isWmsUseLayerIds = function() {
  return this.state.wms_use_layer_ids;
};

proto.getContextBaseLegend = function(){
  return this.state.context_base_legend;
};

proto.getQueryPointTolerance = function(){
  return this.state.query_point_tolerance;
};

// check if multi
proto.getQueryFeatureCount = function() {
  return this.state.feature_count || 5;
};

proto.isQueryMultiLayers = function(mapcontrol) {
  return this.state.querymultilayers && this.state.querymultilayers.indexOf(mapcontrol) !== -1;
};

proto.getRelations = function() {
  return this.state.relations;
};

proto.getRelationById = function(relationId){
  return this.state.relations.find(relation => relation.id === relationId);
};

proto.getRelationsByLayerId = function({layerId, type}={}){
  return this.state.relations.filter(relation => relation.referencedLayer === layerId && (type ? relation.type === type : true))
};

proto.getOwsMethod = function() {
  return this.state.ows_method;
};

// process layerstree and baselayers of the project
proto._processLayers = function() {
  //info useful for catalog
  const traverse = tree => {
    for (let i = 0; i < tree.length; i++) {
      const layer = tree[i];
      let layer_name_originale;
      //check if layer (node) of folder
      if (layer.id !== undefined) {
        this.state.layers.forEach(_layer => {
          layer_name_originale = _layer.name;
          if (layer.id === _layer.id) {
            layer.name = _layer.name;
            _layer.wmsUrl = this.getWmsUrl();
            _layer.project = this;
            tree[i] = Object.assign(_layer, layer);
            return false
          }
        });
      }
      if (Array.isArray(layer.nodes)) {
        //add title to tree
        layer.title = layer.name;
        traverse(layer.nodes);
      }
    }
  };
  // call trasverse function to
  traverse(this.state.layerstree);
  const ApplicationService = require('core/applicationservice');
  const baseLayerId = ApplicationService.getBaseLayerId();
  for (let i=0; i < this.state.baselayers.length; i++) {
    const baseLayerConfig = this.state.baselayers[i];
    const baseLayerVisibleId = baseLayerId !== null ? baseLayerId : this.state.initbaselayer;
    const visible = baseLayerVisibleId && (baseLayerConfig.id === baseLayerVisibleId) || !!baseLayerConfig.fixed;
    baseLayerConfig.visible = visible;
    baseLayerConfig.baselayer = true;
  }
};

// build layersstore and create layersstree
proto._buildLayersStore = function() {
  // create a layersStore object
  const layersStore = new LayersStore();
  //check if we have owerview project
  const overviewprojectgid = this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null;
  layersStore.setOptions({
    id: this.state.gid,
    projection: this._projection,
    extent: this.state.extent,
    initextent: this.state.initextent,
    wmsUrl: this.state.WMSUrl,
    catalog: this.state.gid !== overviewprojectgid
  });

  // instance each layer ad area added to layersstore
  const layers = this.getLayers();
  layers.forEach(layerConfig => {
    //check and set crs in objectformat
    layerConfig.crs = crsToCrsObject(layerConfig.crs);
    // add projection
    layerConfig.projection = layerConfig.crs ? Projections.get(layerConfig.crs) : this._projection;
    //add ows_method
    layerConfig.ows_method = this.getOwsMethod();
    layerConfig.wms_use_layer_ids = this.state.wms_use_layer_ids;
    const layer = LayerFactory.build(layerConfig, {
      project: this
    });
    layer && layersStore.addLayer(layer);
  });
  // create layerstree from layerstore
  layersStore.createLayersTree(this.state.name, {
    layerstree: this.state.layerstree,
    expanded: this.state.toc_layers_init_status === 'not_collapsed' // config to show layerstrees toc expanded or not
  });
  return layersStore;
};

proto.getLayerById = function(layerId) {
  return this._layersStore.getLayerById(layerId);
};

proto.getLayers = function() {
  return [...this.state.layers, ...this.state.baselayers];
};

proto.getBaseLayers = function() {
  return this.state.baselayers;
};

/**
 * Get configuration layers array from server config
 * @param filter property layer config to filter
 * @returns {*}
 */
proto.getConfigLayers = function({key}={}) {
  return key ? this.state.layers.filter(layer => layer[key] !== undefined) : this.state.layers;
};

/**
 * Legend Position
 */

proto.setLegendPosition = function(legend_position='tab'){
  this.state.legend_position = legend_position;
};

proto.getLegendPosition = function(){
  return this.state.legend_position;
};

/**
 * End Legend Position
 */

proto.getThumbnail = function() {
  return this.state.thumbnail;
};

proto.getState = function() {
  return this.state;
};

proto.getPrint = function(){
  return this.state.print || [];
};

proto.getSearches = function(){
  return this.state.search || [];
};

proto.getVectorUrl = function() {
  return this.state.vectorurl;
};

proto.getRasterUrl = function(){
  return this.state.rasterurl;
};

proto.getId = function() {
  return this.state.id;
};

proto.getType = function() {
  return this.state.type;
};

proto.getGid = function() {
  return this.state.gid;
};

proto.getName = function() {
  return this.state.name;
};

proto.getOverviewProjectGid = function() {
  return this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null;
};

proto.getCrs = function() {
  return this._projection.getCode();
};

/*
* type: major, minor, patch
* */
proto.getQgisVersion = function({type}={}) {
  const index = ['major', 'minor', 'patch'].indexOf(type);
  return index === -1 ? this.state.qgis_version: +this.state.qgis_version.split('.')[index];
};

proto.getProjection = function() {
  return this._projection;
};

proto.getWmsUrl = function() {
  return this.state.WMSUrl;
};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getLayersStore = function() {
  return this._layersStore;
};

/// Map Themes

/**
 * Method to set properties ( checked and visible) from view to layerstre
 * @param viewlayerstree
 * @param layerstree
 */
proto.setLayersTreePropertiesFromMapTheme = async function({map_theme, layerstree=this.state.layerstree}){
  const mapThemeConfig = await this.getMapThemeFromThemeName(map_theme);
  const {layerstree:mapThemeLayersTree} = mapThemeConfig;
  const changes = {
    layers: {} // key is the layer id and object has style, visibility change (Boolean)
  };
  const promises = [];
  const traverse = (mapThemeLayersTree, layerstree) =>{
    mapThemeLayersTree.forEach((node, index) => {
      if (node.nodes) {
        // case of group
        layerstree[index].checked = node.checked;
        layerstree[index].expanded = node.expanded;
        traverse(node.nodes, layerstree[index].nodes);
      } else {
        node.style = mapThemeConfig.styles[node.id];
        // case of layer
        if (layerstree[index].checked !== node.visible) {
          changes.layers[node.id] = {
            visibility: true,
            style: false
          };
          layerstree[index].checked = node.visible;
        }
        // if has a style settled
        if (node.style) {
          const promise = new Promise((resolve, reject) =>{
            const setCurrentStyleAndResolvePromise = node => {
              if (changes.layers[node.id] === undefined) changes.layers[node.id] = {
                visibility: false,
                style: false
              };
              changes.layers[node.id].style = this.getLayerById(node.id).setCurrentStyle(node.style);
              resolve();
            };
            if (this.getLayersStore()) setCurrentStyleAndResolvePromise(node);
            else// case of starting project creation
              node => setTimeout(() => {
                setCurrentStyleAndResolvePromise(node);
              })(node);
          });
          promises.push(promise);
        }
      }
    });
  };
  traverse(mapThemeLayersTree, layerstree);
  await Promise.allSettled(promises);
  return changes // eventually information about changes (for example style etc..)
};

/**
 * get map Theme_configuration
 */
proto.getMapThemeFromThemeName = async function(map_theme){
  const mapThemeConfig = this.state.map_themes.find(map_theme_config => map_theme_config.theme === map_theme);
  if (mapThemeConfig){
    const {layerstree} = mapThemeConfig;
    if (layerstree === undefined) {
      const url = `${this.urls.map_themes}${map_theme}/`;
      const response = await XHR.get({
        url
      });
      mapThemeConfig.layerstree = response.data;
    }
  }
  return mapThemeConfig;
};

proto.getUrl = function(type){
  return this.urls[type];
};


module.exports = Project;
