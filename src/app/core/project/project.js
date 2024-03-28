import {
  QUERY_POINT_TOLERANCE,
  TOC_LAYERS_INIT_STATUS,
  TOC_THEMES_INIT_STATUS,
}                         from 'app/constant';
import ApplicationState   from 'store/application-state';
import ApplicationService from 'services/application';
import { crsToCrsObject } from 'utils/crsToCrsObject';
import G3WObject          from 'core/g3wobject';

const { base, inherit, XHR } = require('utils');
const LayerFactory           = require('core/layers/layerfactory');
const LayersStore            = require('core/layers/layersstore');
const Projections            = require('g3w-ol/projection/projections');

/**
 * @FIXME options param appears to be unused
 * 
 * @param config.id
 * @param config.type
 * @param config.gid
 * @param config.name
 * @param config.crs
 * @param config.extent
 * @param config.initextent
 * @param config.layers
 * @param config.layerstree
 * @param config.overviewprojectgid
 * @param config.baselayers
 * @param config.initbaselayer
 * @param config.filtertoken
 * @param config.context_base_legend
 * @param config.query_point_tolerance
 * @param config.wps                           array of wps service
 * @param config.bookmarks                     array of bookmarks
 * @param { 'POST' | 'GET' }                   config.ows_method
 * @param { boolean }                          config.wms_use_layer_ids
 * @param { 'ows' | 'api' }                    config.search_endpoint 
 * @param { 'tab' | 'toc' }                    config.legend_position 
 * @param { 'layers', 'baselayers', 'legend' } config.catalog_tab
 * 
 * @param options
 */
function Project(config = {}, options={}) {
  /**
   * For future implementation catalog tab actived
   */
  config.catalog_tab            = config.toc_tab_default || config._catalog_tab || 'layers';

  config.ows_method             = config.ows_method || 'GET';

  config.toc_layers_init_status = config.toc_layers_init_status || TOC_LAYERS_INIT_STATUS;
  
  config.toc_themes_init_status = config.toc_themes_init_status || TOC_THEMES_INIT_STATUS;
  
  config.query_point_tolerance  = config.query_point_tolerance || QUERY_POINT_TOLERANCE;
  
  this.state = config;

  const type   = this.getType();
  const id     = this.getId();
  const vector = this.getVectorUrl();

  /**
   * View information about project APIs 
   */
  this.urls = {
    map_themes:      `/${type}/api/prjtheme/${id}/`,
    expression_eval: `/api/expression_eval/${id}/`,
    vector_data:     `${vector}data/${type}/${id}/`,
    featurecount:    `${vector}featurecount/${type}/${id}/`,
  };

  this._processLayers();

  /**
   * Set the project projection to object crs
   */
  this.state.crs    = crsToCrsObject(this.state.crs);

  this._projection  = Projections.get(this.state.crs);

  /**
   * Build a layersstore of the project
   */
  this._layersStore = this._buildLayersStore();

  /**
   * Hook methods
   */
  this.setters = {

    setBaseLayer(id) {
      this.state.baselayers.forEach(baseLayer => {
        this._layersStore.getLayerById(baseLayer.id).setVisible(baseLayer.id === id);
        baseLayer.visible = (baseLayer.id === id);
      })
    },

  };

  this.setSearchEndPoint();

  base(this);
}

inherit(Project, G3WObject);

const proto = Project.prototype;

/**
 * @returns `wms_getmap_format` attribute from server (project settings) 
 *
 * @since 3.9.0
 */

proto.getWmsGetmapFormat = function() {
  return this.state.wms_getmap_format;
}

/**
 * Get search end point value (ows or api)
 */
proto.getSearchEndPoint = function() {
  return this.state.search_endpoint;
};

proto.setSearchEndPoint = function() {
  (this.state.search || []).forEach(search => search.search_endpoint = this.state.search_endpoint);
};

proto.getAliasUrl = function() {
  return this.state.aliasUrl;
};

proto.getActiveCatalogTab = function() {
  return this.state.catalog_tab;
};

proto.setActiveCatalogTab = function(tab = 'layers') {
  this.state.catalog_tab = tab;
};

proto.isWmsUseLayerIds = function() {
  return this.state.wms_use_layer_ids;
};

proto.getContextBaseLegend = function() {
  return this.state.context_base_legend;
};

proto.getQueryPointTolerance = function() {
  return this.state.query_point_tolerance;
};

// check if multi
proto.getQueryFeatureCount = function() {
  return this.state.feature_count || 5;
};

proto.isQueryMultiLayers = function(mapcontrol) {
  return this.state.querymultilayers && -1 !== this.state.querymultilayers.indexOf(mapcontrol);
};

proto.getRelations = function() {
  return this.state.relations;
};

proto.getRelationById = function(relationId) {
  return this.state.relations.find(relation => relation.id === relationId);
};

proto.getRelationsByLayerId = function({layerId, type}={}) {
  return this.state.relations.filter(relation => relation.referencedLayer === layerId && (type ? relation.type === type : true))
};

proto.getOwsMethod = function() {
  return this.state.ows_method;
};

/**
 * Process layerstree and baselayers of the project
 */
proto._processLayers = function() {

  // useful info for catalog
  const traverse = nodes => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let layer_name_originale;
      //check if layer (node) of folder
      if (undefined !== node.id) {
        this.state.layers.forEach(layer => {
          layer_name_originale = layer.name;
          if (node.id === layer.id) {
            node.name = layer.name;
            layer.wmsUrl = this.getWmsUrl();
            layer.project = this;
            node[i] = Object.assign(layer, node);
            return false
          }
        });
      }
      if (Array.isArray(node.nodes)) {
        //add title to tree
        node.title = node.name;
        traverse(node.nodes);
      }
    }
  };

  traverse(this.state.layerstree);
  const baseLayerId = ApplicationService.getBaseLayerId();

  // Remove bing base layer when no vendor API Key is provided
  this.state.baselayers = this.state.baselayers.filter(baselayer => (baselayer.servertype === 'Bing' ? ApplicationState.keys.vendorkeys.bing : true));

  for (let i=0; i < this.state.baselayers.length; i++) {
    const baseLayerConfig = this.state.baselayers[i];
    const baseLayerVisibleId = (null !== baseLayerId) ? baseLayerId : this.state.initbaselayer;
    baseLayerConfig.visible = baseLayerVisibleId && (baseLayerConfig.id === baseLayerVisibleId) || !!baseLayerConfig.fixed;
    baseLayerConfig.baselayer = true;
  }
};

/**
 * Build layersstore and create layersstree 
 */
proto._buildLayersStore = function() {
  // create a layersStore object
  const layersStore = new LayersStore();

  //check if we have owerview project
  const overviewprojectgid = this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null;

  layersStore.setOptions({
    id:         this.state.gid,
    projection: this._projection,
    extent:     this.state.extent,
    initextent: this.state.initextent,
    wmsUrl:     this.state.WMSUrl,
    catalog:    overviewprojectgid !== this.state.gid,
  });

  // instance each layer ad area added to layersstore
  const layers = this.getLayers();
  
  layers.forEach(layerConfig => {
    //check and set crs in object format
    layerConfig.crs               = crsToCrsObject(layerConfig.crs);
    // add projection
    layerConfig.projection        = layerConfig.crs ? Projections.get(layerConfig.crs) : this._projection;
    //add ows_method
    layerConfig.ows_method        = this.getOwsMethod();
    layerConfig.wms_use_layer_ids = this.state.wms_use_layer_ids;
    const layer                   = LayerFactory.build(layerConfig, { project: this });
    if (layer) { layersStore.addLayer(layer)}
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
 * Get configuration layers an array from server config
 * 
 * @param filter property layer config to filter
 * @returns {*}
 */
proto.getConfigLayers = function({ key } = {}) {
  return key ? this.state.layers.filter(layer => undefined !== layer[key] ) : this.state.layers;
};

/**
 * Legend Position
 */

proto.setLegendPosition = function(legend_position = 'tab') {
  this.state.legend_position = legend_position;
};

proto.getLegendPosition = function() {
  return this.state.legend_position;
};

/**
 * End Legend Position
 */

proto.getThumbnail = function() {
  return this.state.thumbnail;
};

proto.getMetadata = function() {
  return this.state.metadata || {};
};

proto.getState = function() {
  return this.state;
};

proto.getPrint = function() {
  return this.state.print || [];
};

proto.getSearches = function() {
  return this.state.search || [];
};

proto.getVectorUrl = function() {
  return this.state.vectorurl;
};

proto.getRasterUrl = function() {
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

/**
 * @param {'major' | 'minor' | 'patch' } qgis.type 
 */
proto.getQgisVersion = function({ type } = {}) {
  const index = ['major', 'minor', 'patch'].indexOf(type);
  return -1 === index ? this.state.qgis_version : +this.state.qgis_version.split('.')[index];
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
 * Set properties (checked and visible) from view to layerstree
 * 
 * @param map_theme map theme name
 * @param layerstree // current layerstree of TOC
 */
proto.setLayersTreePropertiesFromMapTheme = async function({
  map_theme,
  layerstree = this.state.layerstree
}) {
  /**
   * mapThemeConfig contain map_theme attributes coming from project map_themes attribute config
   * plus layerstree of map_theme get from api map theme
   */
  const mapThemeConfig = await this.getMapThemeFromThemeName(map_theme);
  // extract layerstree
  const { layerstree:mapThemeLayersTree } = mapThemeConfig;
  // create a chages need to apply map_theme changes to map and TOC
  const changes  = {layers: {} }; // key is the layer id and object has style, visibility change (Boolean)
  const promises = [];
  /**
   * Function to traverse current layerstree of toc anche get changes with the new one related to map_theme choose
   * @param mapThemeLayersTree // new mapLayerTree
   * @param layerstree // current layerstree
   */
  const groups = [];
  const traverse = (mapThemeLayersTree, layerstree, checked) => {
    mapThemeLayersTree
      .forEach((node, index) => {
        if (node.nodes) { // case of a group
          groups.push({
            node,
            group: layerstree[index]
          });
          traverse(node.nodes, layerstree[index].nodes, checked && node.checked);
        } else {
          // case of layer
          node.style = mapThemeConfig.styles[node.id]; // set style from map_theme
          if (layerstree[index].checked !== node.visible) {
            changes.layers[node.id] = {
              visibility: true,
              style: false
            };
          }
          layerstree[index].checked = node.visible;
          // if it has a style settled
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
              if (this.getLayersStore()) { setCurrentStyleAndResolvePromise(node) }
              else { (node => setTimeout(() => setCurrentStyleAndResolvePromise(node)))(node) }// case of starting project creation
            });
            promises.push(promise);
          }
        }
    });
  };
  traverse(mapThemeLayersTree, layerstree);
  await Promise.allSettled(promises);
  // all groups checked after layer checked so is set checked but not visible
  groups.forEach(({ group, node: { checked, expanded }}) => {
    group.checked = checked;
    group.expanded = expanded;
  });
  return changes // eventually, information about changes (for example style etc..)
};

/**
 * get map Theme_configuration
 */
proto.getMapThemeFromThemeName = async function(map_theme) {
  // get map theme configuration from map_themes project config
  const mapThemeConfig = this.state.map_themes.find(map_theme_config => map_theme_config.theme === map_theme);
  // check if mapThemeConfig exist and if it has layerstree (property gets from server with a specific api)
  if (mapThemeConfig && undefined === mapThemeConfig.layerstree ) {
    mapThemeConfig.layerstree = await this.getMapThemeConfiguration(map_theme);
  }
  return mapThemeConfig;
};

/**
 * Get map_style from server
 * 
 * @param map_theme
 * 
 * @returns {Promise<*>}
 */
proto.getMapThemeConfiguration = async function(map_theme) {
  try {
    const response = await XHR.get({ url: `${this.urls.map_themes}${map_theme}/` });
    if (response.result) { return response.data }
  } catch(err) {
    console.warn('Error while retreiving map theme configuration', err);
  }
};

proto.getUrl = function(type) {
  return this.urls[type];
};

/**
 * @returns {Array} spatial bookmarks saved on current QGIS project
 * 
 * @since v3.8
 */
proto.getSpatialBookmarks = function() {
  return this.state.bookmarks || [];
};

/**
 * @returns {{ items: Array, info: Object }} project messages at start time 
 * 
 * @since 3.8.0
 */
proto.getMessages = function() {
  return this.state.messages;
};

module.exports = Project;
