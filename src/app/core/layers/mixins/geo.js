/**
 * @TODO convert it to ES6 class (or external utils)
 *
 * @file
 * @since 3.9.0
 */

import GUI                                from 'services/gui';
import Projections                        from 'store/projections';
import { createFeatureFromFeatureObject } from 'utils/createFeatureFromFeatureObject';
import { getScaleFromResolution }         from 'utils/getScaleFromResolution';
import { XHR }                            from 'utils/XHR';

/**
 * ORIGINAL SOURCE: src/utils/sanitizeUrl.js@v3.10.2
 */
function sanitizeUrl({
  url,
  reserverParameters = [],
} = {}) {
  const checkUrl = new URL(url);
  reserverParameters.forEach(p => {
    const params = [p.toUpperCase(), p.toLowerCase()];
    for (let i = 0; i < 2; i++) {
      const param = params[i];
      const value = checkUrl.searchParams.get(param);
      if (value) {
        url = url.replace(`${param}=${value}`, '');
        break;
      }
    }
  });
  return url;
}

/**
 * ES6 mixin
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends#mix-ins
 * 
 * @example class ImageLayer extends GeoLayerMixin(Layer) {}
 */
export default BaseClass => class extends BaseClass {

  setup(config = {}, options = {}) {
    if (!this.config) {
      console.log("GeoLayerMixin must be used from a valid (geo) Layer instance");
      return;
    }
  
    Object.assign(this.config, {
      map_crs:      options.project.getProjection().getCode(),
      multilayerid: config.multilayer,
      projection:   config.projection ? (config.projection.getCode() === config.crs.epsg ? config.projection :  Projections.get(config.crs)) : undefined,
      attributions: config.attributions ? config.attributions : undefined,
    });
  
  
    this.legendCategories = {};
  
    // Features that contain
    this.olSelectionFeatures = {}; // key id / fid of feature and values is an object with feature and added
  
    // state extend of layer setting geolayer property to true
    // and adding information of bbox
    Object.assign(this.state, {
      geolayer:             "NoGeometry" !== config.geometrytype,
      legend: {
        url:     null,
        loading: false,
        error:   false,
      /** @deprecated since 3.8. Will be removed in 4.x. Use `expanded` attribute instead */
        show:    true,
        /** used when categories changed (checkbox on TOC) and legend is on TAB */
        change:  false,
      },
      external:             config.source && config.source.external || false,
      bbox:                 config.bbox                             || null,
      visible:              config.visible                          || false,
      checked:              config.visible                          || false,
      epsg:                 config.crs.epsg,
      hidden:               config.hidden                           || false,
      scalebasedvisibility: config.scalebasedvisibility             || false,
      minscale:             config.minscale,
      maxscale:             config.maxscale,
      ows_method:           config.ows_method,
  
      /**
       * @type {boolean}
       */
      exclude_from_legend: ('boolean' === typeof config.exclude_from_legend) ? config.exclude_from_legend : true,
  
      /**
       * Has more than one category's legend
       * 
       * @type {boolean}
       */
      categories: false,
  
      /**
       * Toggle legend item state (expandend or collapsed) in catalog layers (TOC)
       * 
       * @type {number}
       *
       * @since v3.8
       */
      expanded: config.expanded,
  
      /**
       * Layer opacity
       * 
       * @type {number} opacity range = [0, 100]
       * 
       * @since v3.8
       */
      opacity: config.opacity || 100,
    });
  
  
    // sanitize source url
    if (config.source && config.source.url) {
      this.config.source.url = sanitizeUrl({
        url:                this.config.source.url,
        reserverParameters: ['VERSION', 'REQUEST', 'BBOX', 'LAYERS', 'WIDTH', 'HEIGHT', 'DPI', 'FORMAT', 'CRS' ], // reserved WMS params
      });
    }
  }
  
  /**
   * Legend Graphic section
   */
  getLegendGraphic({ all = true } = {}) {
    return XHR.get({
      url: this.getLegendUrl(
        (window.initConfig.layout || ({ legend: {} })).legend,
        {
          categories: true,
          format:     'application/json', // is the format to request categories (icon and label of each category)
          all, // true meaning no bbox no filter just all referred to
        }
      )
    });
  }
  
  /**
   * Set layer categories legend
   * @param { Array }categories
   */
  setCategories(categories = []) {
    this.legendCategories[this.getCurrentStyle().name] = categories;
    //set categories state attribute to true only if exist at least a rule key
    this.state.categories = (categories || []).filter(category => category.ruleKey).length > 0;
  }
  
  /**
   * Return eventually categories of layers legend
   * @returns {string[] | string | [] | *[] | boolean | {default: {level: *, appenders: string[]}}}
   */
  getCategories() {
    return this.legendCategories[this.getCurrentStyle().name];
  }
  
  /**
   * Clear all categories
   */
  clearCategories() {
    this.legendCategories = {};
    this.state.categories = false;
  }
  
  /**
   * End Legend Graphic section
   */
  
  /**
   * [LAYER SELECTION]
   * 
   * Clear all selection Openlayers features
   */
  clearOlSelectionFeatures() {
    this.olSelectionFeatures = {};
  }
  
  /**
   * [LAYER SELECTION]
   * 
   * Get OpenLayer selection feature by feature id
   * 
   * @param id
   * @returns {*}
   */
  getOlSelectionFeature(id) {
    return this.olSelectionFeatures[id];
  }
  
  /**
   * [LAYER SELECTION]
   * 
   * Update selected feature (Case change geometry)
   * 
   * @param id
   * @param feature
   */
  updateOlSelectionFeature({ id, feature } = {}) {
    const selected = this.getOlSelectionFeature(id);
    if (selected) {
      selected.feature = feature;
      GUI.getService('map').setSelectionFeatures('update', { feature });
    }
  }

  /**
   * [LAYER SELECTION]
   * 
   * Delete OpenLayer feature selection by feature id
   * 
   * @param id
   */
  deleteOlSelectionFeature(id) {
    const selected = this.getOlSelectionFeature(id);
    if (selected) {
      /** @FIXME undefined variable */
      GUI.getService('map').setSelectionFeatures('remove', { feature: selected.feature });
      delete this.olSelectionFeatures[id];
    }
  }

  /**
   * [LAYER SELECTION]
   * 
   * Get all OpenLayers feature selections
   * 
   * @returns { {} | null }
   */
  getOlSelectionFeatures() {
    return this.olSelectionFeatures;
  }

  /**
  * [LAYER SELECTION]
  
  * @param id
  * @param feature
  * 
  * @returns {*}
  */
  addOlSelectionFeature({ id, feature } = {}) {
    this.olSelectionFeatures[id] = this.olSelectionFeatures[id] || {
      feature:  createFeatureFromFeatureObject({ id, feature }),
      added:    false,
      selected: false, /** @since 3.9.9 */
    };
    return this.olSelectionFeatures[id];
  }
  
  /**
   * [LAYER SELECTION]
   *
   * Set selection layer on a map not visible
   */
  hideOlSelectionFeatures() {
    GUI.getService('map').toggleSelection(false);
  }
  
  /**
   * [LAYER SELECTION]
   * 
   * Show all selection features
   */
  updateMapOlSelectionFeatures() {
    // Loop `added` features (selected)
    Object
      .values(this.olSelectionFeatures)
      .forEach(f => {
        if (f.selected && !f.added) {
          GUI.getService('map').setSelectionFeatures('add', { feature: f.feature });
          f.added = true;
        }
  
        if (!f.selected && f.added) {
          GUI.getService('map').setSelectionFeatures('remove', { feature: f.feature });
          f.added = false;
        }
      });
    // Ensures visibility of selection layer on a map
    GUI.getService('map').toggleSelection(Object.values(this.olSelectionFeatures).some(f => f.selected));
  }
  
  /**
   * [LAYER SELECTION]
   * 
   * Toggle `added` property on all features
   */
  setInversionOlSelectionFeatures() {
    Object
      .values(this.olSelectionFeatures)
      .forEach(f => {
        //invert select state
        f.selected = !f.selected;
        if (!f.selected && f.added) {
          GUI.getService('map').setSelectionFeatures('remove', { feature: f.feature });
          f.added = false;
        }
        if (f.selected && !f.added) {
          GUI.getService('map').setSelectionFeatures('add', { feature: f.feature });
          f.added = true;
        }
      });
  }

  /**
   * [LAYER SELECTION]
   * 
   * @param fid
   * @param action
   * 
   * @returns {*}
   */
  setOlSelectionFeatureByFid(fid, action) {
    const selected = this.getOlSelectionFeature(fid);
    if (selected && selected.feature) {
      //set selected
      selected.selected = 'add' === action;
      return this.setOlSelectionFeatures({
        id:      fid,
        feature: selected.feature,
      }, action);
    }
  }
  
  /**
   * [LAYER SELECTION]
   * 
   * @param feature
   * @param action
   * 
   * @returns { boolean }
   */
  setOlSelectionFeatures(feature, action = 'add') {

    // select a single feature
    if (feature) {
      const feat             = this.getOlSelectionFeature(feature.id);
      feat.feature.__layerId = ('add' === action && !feat.added) ? this.getId() : undefined; // <-- used when working with selected Layer features
      this.updateMapOlSelectionFeatures();
    }
  
    // select all features
    if (!feature) {
      Object
        .values(this.olSelectionFeatures)
        .forEach(feat => {
          //remove selection feature
          if (feat.added) {
            GUI.getService('map').setSelectionFeatures('remove', { feature: feat.feature });
          }
          feat.added    = false;
          feat.selected = false;
        });
    }
  
    return undefined === Object.values(this.olSelectionFeatures).find(feat => feat.added);
  }
  
  isLayerCheckedAndAllParents() {
    let checked = this.isChecked();
    if (checked) {
      let parentGroup = this.state.parentGroup;
      //loop from bottom to top
      while(checked && parentGroup) {
        checked     = checked && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
    }
    return checked;
  }
  
  /**
   * Set layer legend item `checked` state (TOC)
   * 
   * @param { boolean } bool
   */
  setChecked(bool) {
    this.state.checked = bool;
  }
  
  /**
   * @returns { boolean } whether layer legend item is checked (TOC)
   */
  isChecked() {
    return this.state.checked;
  }
  
  /**
   * Is a method that check for visiblitity dissabled (based on scalevisibility) and checked on toc
   * @param { Boolean } bool
   * @returns {*}
   */
  setVisible(bool) {
    //get current visibility
    const visible  = this.state.visible;
    // set visibility bool and is checked
    this.state.visible = bool && this.isChecked();
    //Check if change the visibility
    if (visible !== this.state.visible) {
      this.change();
    }
    return this.state.visible;
  }

  isVisible() {
    return this.state.visible;
  }
  
  isDisabled() {
    return this.state.disabled;
  }

  /**
   *
   * @param scale
   * @return {boolean}
   */
  isPrintable({ scale } = {}) {
    return this.isLayerCheckedAndAllParents()
      && (
        !this.state.scalebasedvisibility
        || (scale >= this.state.maxscale && scale <= this.state.minscale)
      );
  }
  
  //get style form layer
  getStyles() {
    return this.config.source.external ? this.config.source.styles : this.config.styles;
  }
  
  getStyle() {
    return this.config.source.external ? this.config.source.styles : this.config.styles ? this.config.styles.find(s => s.current).name : '';
  }
  
  /**
   * Get transparency property
   * 
   * @returns {number}
   * 
   * @since v3.8
   */
  
  getOpacity() {
    return this.state.opacity;
  }
  
  /**
   * Method to change the current style of layer
   * @param name
   * @returns { Boolean }
   */
  setCurrentStyle(name) {
    const changed = !(this.config.styles.find(s => name === s.name).current);
    this.config.styles.forEach(s => s.current = name === s.name);
    return changed;
  }
  
  getCurrentStyle() {
    return this.config.styles.find(s => s.current);
  }
  
  /**
   * Disable layer by check scalevisibility configuration value
   * @param resolution
   * @param mapUnits
   */
  setDisabled(resolution, mapUnits = 'm') {
    if (this.state.scalebasedvisibility) {
      const mapScale      = getScaleFromResolution(resolution, mapUnits);
      this.state.disabled = !(mapScale >= this.state.maxscale && mapScale <= this.state.minscale);
      this.state.disabled = this.state.minscale === 0 ? !(mapScale >= this.state.maxscale) : this.state.disabled;
      // needed to check if call setVisible is change disable property
      // looping through parentfolter checked
      let setVisible = true;
      let parentGroup = this.state.parentGroup;
      while (parentGroup) {
        setVisible  = setVisible && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
      if (setVisible) {
        this.setVisible(!this.state.disabled);
      }
      // change toc highlight property based on disabled otr not
      if (this.isFilterable()) {
        this.setTocHighlightable(!this.state.disabled);
      }
    } else {
      this.state.disabled = false;
    }
  }
  
  getMultiLayerId() {
    return this.config.multilayerid;
  }
  
  getGeometryType() {
    return this.config.geometrytype;
  }
  
  getOwsMethod() {
    return this.config.ows_method;
  }
  
  setProjection(crs = {}) {
    this.config.projection = Projections.get(crs);
  }
  
  getProjection() {
    return this.config.projection;
  }
  
  getEpsg() {
    return this.config.crs.epsg;
  }
  
  getCrs() {
    return this.config.projection ? this.config.projection.getCode() : null;
  }
  
  getMapCrs() {
    return this.config.map_crs;
  }
  
  isCached() {
    return this.config.cache_url && '' !== this.config.cache_url;
  }
  
  getCacheUrl() {
    // mapproxy provider → cache_url already contains "{z}/{x}/{-y}.png"
    if (this.isCached() && this.config.cache_provider && 'mapproxy' === this.config.cache_provider) {
      return this.config.cache_url;
    }
    if (this.isCached()) {
      return `${this.config.cache_url}/{z}/{x}/{y}.png`;
    }
  }
  
  // return if layer has inverted axis
  hasAxisInverted() {
    const projection      = this.getProjection();
    const axisOrientation = projection.getAxisOrientation ? projection.getAxisOrientation() : "enu";
    return axisOrientation.substr(0, 2) === 'ne';
  }
  
  /**
   * @virtual method need to be implemented by subclasses
   */
  getMapLayer() {
    console.log('overwrite by single layer')
  }

  /**
   *
   * @param projection
   */
  setMapProjection(projection) {
    this._mapProjection = projection;
  }
  
  getMapProjection() {
    return this._mapProjection;
  }

};