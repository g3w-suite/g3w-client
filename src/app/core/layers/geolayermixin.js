const Projections = require('g3w-ol/projection/projections');
const { getScaleFromResolution } = require('core/utils/ol');
const { createFeatureFromFeatureObject } = require('core/utils/geo');
const { XHR, sanitizeUrl } = require('core/utils/utils');
const GUI = require('gui/gui');
const RESERVERDPARAMETRS = {
  wms: ['VERSION', 'REQUEST', 'BBOX', 'LAYERS', 'WIDTH', 'HEIGHT', 'DPI', 'FORMAT', 'CRS']
};

function GeoLayerMixin(config={}) {}

const proto = GeoLayerMixin.prototype;

proto.setup = function(config={}, options={}) {
  if (!this.config) {
    console.log("GeoLayerMixin must be used from a valid (geo) Layer instance");
    return;
  }
  const { project } = options;
  this.config.map_crs = project.getProjection().getCode();
  this.config.multilayerid = config.multilayer;
  this.legendCategories = {};
  // Features that contain
  this.olSelectionFeatures = {}; // key id / fid of feature and values is an object with feature and added
  // state extend of layer setting geolayer property to true
  // and adding information of bbox
  _.extend(this.state, {
    geolayer: config.geometrytype !== "NoGeometry",
    legend: {
      url: null,
      loading: false,
      error: false,
     /**
      * @deprecated since 3.8. Will be removed in 4.x. Use expanded attribute instead
      */
      show: true
    },
    external: config.source && config.source.external || false,
    bbox: config.bbox || null,
    visible: config.visible || false,
    checked: config.visible || false,
    epsg: config.crs.epsg,
    hidden: config.hidden || false,
    scalebasedvisibility: config.scalebasedvisibility || false,
    minscale: config.minscale,
    maxscale: config.maxscale,
    ows_method: config.ows_method,
    exclude_from_legend: (typeof config.exclude_from_legend == 'boolean') ? config.exclude_from_legend : true,
    categories: false, // has more than one categories legend,
    /**
     *  Expand or collapse legend item in catalog layers (TOC)
     *
     * @since v3.8
     */
    expanded: config.expanded
  });
  if (config.projection) this.config.projection = config.projection.getCode() === config.crs.epsg ? config.projection :  Projections.get(config.crs);
  if (config.attributions) this.config.attributions = config.attributions;
  config.source && config.source.url && this._sanitizeSourceUrl()
};

/**
 * Legend Graphic section
 */
proto.getLegendGraphic = function({all=true}={}){
  const ApplicationService = require('core/applicationservice');
  const legendParams = ApplicationService.getConfig().layout ? ApplicationService.getConfig().layout.legend : {};
  const legendurl = this.getLegendUrl(legendParams, {
    categories: true,
    all // true meaning no bbox no filter just all referred to
  });
  return XHR.get({
    url: legendurl
  });
};

/**
 * Set layer categories legend
 * @param categories
 */
proto.setCategories = function(categories=[]) {
  this.legendCategories[this.getCurrentStyle().name] = categories;
  //set categories state attribute to true only if exist at least a rule key
  // meaning that layer has at least more than one has a
  this.state.categories = categories.length > 1 && categories.filter(category => category.ruleKey).length > 1;
};

/**
 * Return eventually categories of layers legend
 * @returns {string[] | string | [] | *[] | boolean | {default: {level: *, appenders: string[]}}}
 */
proto.getCategories = function(){
  return this.legendCategories[this.getCurrentStyle().name];
};

proto.clearCategories = function(){
  this.legendCategories = {};
  this.state.categories = false;
};

/**
 * End Legend Graphic section
 */

/**
 * Clear all selection openlayer features
 */
proto.clearOlSelectionFeatures = function(){
  this.olSelectionFeatures = null;
};

/**
 * Get openlayer selection feature by feature id
 * @param id
 * @returns {*}
 */
proto.getOlSelectionFeature = function(id){
  return this.olSelectionFeatures[id];
};

proto.updateOlSelectionFeature = function({id, feature}={}){
  const featureObject = this.getOlSelectionFeature(id);
  if (featureObject) {
    featureObject.feature = feature;
    const mapService = GUI.getService('map');
    mapService.setSelectionFeatures('update', {
      feature
    })
  }
};

/**
 * Delete openlayer feature selection by feature id
 * @param id
 */
proto.deleteOlSelectionFeature = function(id){
  const featureObject = this.olSelectionFeatures[id];
  if (featureObject) {
    mapService.setSelectionFeatures('remove', {
      feature: featureObject.feature
    });
    delete this.olSelectionFeatures[id];
  }
};

/**
 * Get all openlyare feature selection
 * @returns {{}|null}
 */
proto.getOlSelectionFeatures = function(){
  return this.olSelectionFeatures;
};

proto.addOlSelectionFeature = function({id, feature}={}){
  this.olSelectionFeatures[id] = this.olSelectionFeatures[id] || {
    feature: createFeatureFromFeatureObject({id, feature}),
    added: false
  };
  return this.olSelectionFeatures[id];
};

proto.showAllOlSelectionFeatures = function(){
  const mapService = GUI.getService('map');
  Object.values(this.olSelectionFeatures).forEach(featureObject =>{
    !featureObject.added && mapService.setSelectionFeatures('add', {
      feature: featureObject.feature
    });
    featureObject.added = true;
  })
};

proto.setInversionOlSelectionFeatures = function(){
  const mapService = GUI.getComponent('map').getService();
  Object.values(this.olSelectionFeatures).forEach(featureObject => {
    mapService.setSelectionFeatures(featureObject.added ? 'remove': 'add', {
      feature: featureObject.feature
    });
    featureObject.added = !featureObject.added
  });
};

proto.setOlSelectionFeatureByFid = function(fid, action){
  const feature = this.olSelectionFeatures[fid] && this.olSelectionFeatures[fid].feature;
  return feature && this.setOlSelectionFeatures({id:fid, feature}, action);
};

proto.setOlSelectionFeatures = function(feature, action='add'){
  const mapService = GUI.getComponent('map').getService();
  if (!feature) {
    Object.values(this.olSelectionFeatures).forEach(featureObject => {
      featureObject.added && mapService.setSelectionFeatures('remove', {
        feature: featureObject.feature
      });
      featureObject.added = false
    });
  } else {
    const featureObject = this.olSelectionFeatures[feature.id] || this.addOlSelectionFeature(feature);
    if (action === 'add') {
      if (!featureObject.added) {
        /**
         * add a property of feature __layerId used whe we work with selected Layer features
         */
        featureObject.feature.__layerId = this.getId();
        mapService.setSelectionFeatures(action, {
          feature: featureObject.feature,
        });
        featureObject.added = true;
      }
    } else {
      mapService.setSelectionFeatures(action, {
        feature: featureObject.feature
      });
      featureObject.added = false;
    }
  }
  return !Object.values(this.olSelectionFeatures).find(featureObject=> featureObject.added);
};

/**
 * Create a get parameter url right
 * @param type
 * @private
 */
proto._sanitizeSourceUrl = function(type='wms'){
  const sanitizedUrl = sanitizeUrl({
    url: this.config.source.url,
    reserverParameters: RESERVERDPARAMETRS[type]
  });
  this.config.source.url = sanitizedUrl;
};

proto.isLayerCheckedAndAllParents = function(){
  let checked = this.isChecked();
  if (checked) {
    let parentGroup = this.state.parentGroup;
    while(checked && parentGroup){
      checked = checked && parentGroup.checked;
      parentGroup = parentGroup.parentGroup;
    }
  }
  return checked;
};

proto.setChecked = function(bool) {
  this.state.checked = bool;
};

proto.isChecked = function() {
  return this.state.checked;
};

/**
 * Is a method that check for visiblitity dissabled (based on scalevisibility) and checked on toc
 * @param bool
 * @returns {*}
 */
proto.setVisible = function(bool) {
  //check if is changed
  const oldVisibile = this.state.visible;
  this.state.visible = bool && this.isChecked(); // bool and is checked
  const changed = oldVisibile !== this.state.visible;
  //if changed call change
  changed && this.change();
  return this.state.visible;
};

proto.isVisible = function() {
  return this.state.visible;
};

proto.isDisabled = function() {
  return this.state.disabled;
};

proto.isPrintable = function({scale}={}) {
  return this.isLayerCheckedAndAllParents() && (!this.state.scalebasedvisibility || (scale >= this.state.maxscale && scale <= this.state.minscale));
};

//get style form layer
proto.getStyles = function(){
  return this.config.source.external ? this.config.source.styles : this.config.styles;
};

proto.getStyle = function(){
  return this.config.source.external ? this.config.source.styles : this.config.styles ? this.config.styles.find(style => style.current).name : '';
};

/**
 * Method to change current style  of layer
 * @param currentStyleName
 * @returns {boolean}
 */
proto.setCurrentStyle = function(currentStyleName){
  let changed = false;
  this.config.styles.forEach(style => {
    if (style.name === currentStyleName)
      changed = !style.current;
    style.current = style.name === currentStyleName;
  });
  return changed;
};

proto.getCurrentStyle = function(){
  return this.config.styles.find(style => style.current);
};

/**
 * Disable layer by check scalevisibility configuration value
 * @param resolution
 * @param mapUnits
 */
proto.setDisabled = function(resolution, mapUnits='m') {
  if (this.state.scalebasedvisibility) {
    const mapScale = getScaleFromResolution(resolution, mapUnits);
    this.state.disabled = !(mapScale >= this.state.maxscale && mapScale <= this.state.minscale);
    this.state.disabled = this.state.minscale === 0 ? !(mapScale >= this.state.maxscale) : this.state.disabled;
    // needed to check if call setVisible if change disable property
    // looping through parentfolter checked
    let setVisible = true;
    let parentGroup = this.state.parentGroup;
    while (parentGroup){
      setVisible = setVisible && parentGroup.checked;
      parentGroup = parentGroup.parentGroup;
    }
    setVisible && this.setVisible(!this.state.disabled);
    // change toc highlight property based on disabled otr not
    this.isFilterable() && this.setTocHighlightable(!this.state.disabled);
  } else this.state.disabled = false;
};

proto.getMultiLayerId = function() {
  return this.config.multilayerid;
};

proto.getGeometryType = function() {
  return this.config.geometrytype;
};

proto.getOwsMethod = function() {
  return this.config.ows_method;
};

proto.setProjection = function(crs={}) {
  this.config.projection = Projections.get(crs);
};

proto.getProjection = function() {
  return this.config.projection;
};

proto.getEpsg = function(){
  return this.config.crs.epsg;
};

proto.getCrs = function() {
  return this.config.projection && this.config.projection.getCode() || null;
};

proto.getMapCrs = function(){
  return this.config.map_crs;
};

proto.isCached = function() {
  return this.config.cache_url && this.config.cache_url !== '';
};

proto.getCacheUrl = function() {
  if (this.isCached()) return this.config.cache_url;
};

// return if layer has inverted axis
proto.hasAxisInverted = function() {
  const projection = this.getProjection();
  const axisOrientation = projection.getAxisOrientation ? projection.getAxisOrientation() : "enu";
  return axisOrientation.substr(0, 2) === 'ne';
};

proto.getMapLayer = function() {
  console.log('overwrite by single layer')
};

proto.setMapProjection = function(mapProjection) {
  this._mapProjection = mapProjection;
};

proto.getMapProjection = function() {
  return this._mapProjection;
};

module.exports = GeoLayerMixin;
