const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
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
    proj4,
    extent,
    initextent,
    layers,
    layerstree,
    overviewprojectgid,
    baselayers,
    initbaselayer,
    context_base_legend
    ows_method <POST or GET>
    wms_use_layer_ids: <TRUE OR FALSE>
    search_endpoint : 'ows', 'api'
    wps: [] // array of wps service
  }
  */
  // for future implementation catalog tab actived
  config.catalog_tab = config._catalog_tab || 'layers'; // values : layers, baselayers, legend
  config.ows_method = config.ows_method || 'GET';
  this.state = config;
  // process layers
  this._processLayers();
  // set the project projection
  this._projection = Projections.get(this.state.crs, this.state.proj4);
  // build a layerstore of the project
  this._layersStore = this._buildLayersStore();
  this.setters = {
    setBaseLayer: function(id) {
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

proto.setSearchEndPoint = function(){
  const {search_endpoint, search=[]} = this.state;
  search.forEach(search => {
    search.search_endpoint = search_endpoint;
  });
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
  return this.state.relations.find((relation) => {
    return relation.id === relationId
  })
};

proto.getRelationsByLayerId = function({layerId, type}={}){
  return this.state.relations.filter(relation => {
    return relation.referencedLayer === layerId && (type ? relation.type === type : true);
  })
};

proto.getOwsMethod = function() {
  return this.state.ows_method;
};

// process layerstree and baselayers of the project
proto._processLayers = function() {
  //info useful for catalog
  const traverse = (tree) => {
    for (let i = 0; i < tree.length; i++) {
      const layer = tree[i];
      let layer_name_originale;
      //check if layer (node) of folder
      if (layer.id !== undefined) {
        this.state.layers.forEach((_layer) => {
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
  for (let i=0; i < this.state.baselayers.length; i++) {
    const baseLayerConfig = this.state.baselayers[i];
    baseLayerConfig.visible = this.state.initbaselayer && (baseLayerConfig.id === this.state.initbaselayer) || !!baseLayerConfig.fixed ;
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
    // add projection
    layerConfig.projection = layerConfig.crs ? Projections.get(layerConfig.crs, layerConfig.proj4) : this._projection;
    //add ows_method
    layerConfig.ows_method = this.getOwsMethod();
    layerConfig.wms_use_layer_ids = this.state.wms_use_layer_ids;
    const layer = LayerFactory.build(layerConfig, {
      project: this
    });
    layersStore.addLayer(layer);
  });
  // create layerstree from layerstore
  layersStore.createLayersTree(this.state.name, {
    layerstree: this.state.layerstree
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

proto.getConfigLayers = function() {
  return this.state.layers;
};

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
  return index === -1 ? this.state.qgis_version:  +this.state.qgis_version.split('.')[index];
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

module.exports = Project;
