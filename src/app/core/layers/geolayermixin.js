import Projections from 'g3w-ol/projection/projections';
import g3w_ol_utils from 'g3w-ol/utils/utils';
import utils from 'core/utils/utils';
import geoutils from 'core/utils/geo';
import GUI from 'gui/gui';
import geom from 'ol/geom';

const RESERVERDPARAMETRS = {
  wms: ['VERSION', 'REQUEST', 'BBOX', 'LAYERS', 'WIDTH', 'HEIGHT', 'DPI', 'FORMAT', 'CRS'],
};

const GeoLayerMixin = {
  setup(config = {}, options = {}) {
    if (!this.config) {
      console.log('GeoLayerMixin must be used from a valid (geo) Layer instance');
      return;
    }
    const { project } = options;
    this.config.map_crs = project.getProjection().getCode();
    this.config.multilayerid = config.multilayer;
    // Features that contain
    this.olSelectionFeatures = {}; // key id / fid of feature and values is an object with feature and added
    // state extend of layer setting geolayer property to true
    // and adding informations of bbox
    _.extend(this.state, {
      geolayer: config.geometrytype !== 'NoGeometry',
      legend: {
        url: null,
        loading: false,
        error: false,
        show: true,
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
      exclude_from_legend: (typeof config.exclude_from_legend === 'boolean') ? config.exclude_from_legend : true,
    });
    if (config.projection) this.config.projection = config.projection.getCode() === config.crs.epsg ? config.projection : Projections.get(config.crs);
    if (config.attributions) this.config.attributions = config.attributions;
    config.source && config.source.url && this._sanitizeSourceUrl();
  },

  /**
   * Clear all selection openlayer features
   */
  clearOlSelectionFeatures() {
    this.olSelectionFeatures = null;
  },

  /**
   * Get openlayer selection feature by feature id
   * @param id
   * @returns {*}
   */
  getOlSelectionFeature(id) {
    return this.olSelectionFeatures[id];
  },

  updateOlSelectionFeature({ id, geometry } = {}) {
    const featureObject = this.getOlSelectionFeature(id);
    if (featureObject) {
      geometry = new geom[geometry.type](geometry.coordinates);
      const { feature } = featureObject;
      const mapService = GUI.getService('map');
      feature.setGeometry(geometry);
      mapService.setSelectionFeatures('update', {
        feature,
      });
    }
  },

  /**
   * Delete openlayer feature selection by feature id
   * @param id
   */
  deleteOlSelectionFeature(id) {
    const featureObject = this.olSelectionFeatures[id];
    if (featureObject) {
      mapService.setSelectionFeatures('remove', {
        feature: featureObject.feature,
      });
      delete this.olSelectionFeatures[id];
    }
  },

  /**
   * Get all openlyare feature selection
   * @returns {{}|null}
   */
  getOlSelectionFeatures() {
    return this.olSelectionFeatures;
  },

  addOlSelectionFeature({ id, geometry } = {}) {
    this.olSelectionFeatures[id] = this.olSelectionFeatures[id] || {
      feature: geoutils.createFeatureFromGeometry({ id, geometry }),
      added: false,
    };
    return this.olSelectionFeatures[id];
  },

  showAllOlSelectionFeatures() {
    const mapService = GUI.getComponent('map').getService();
    Object.values(this.olSelectionFeatures).forEach((featureObject) => {
      !featureObject.added && mapService.setSelectionFeatures('add', {
        feature: featureObject.feature,
      });
      featureObject.added = true;
    });
  },

  setInversionOlSelectionFeatures() {
    const mapService = GUI.getComponent('map').getService();
    Object.values(this.olSelectionFeatures).forEach((featureObject) => {
      mapService.setSelectionFeatures(featureObject.added ? 'remove' : 'add', {
        feature: featureObject.feature,
      });
      featureObject.added = !featureObject.added;
    });
  },

  setOlSelectionFeatureByFid(fid, action) {
    const feature = this.olSelectionFeatures[fid] && this.olSelectionFeatures[fid].feature;
    return feature && this.setOlSelectionFeatures({ id: fid, feature }, action);
  },

  setOlSelectionFeatures(feature, action = 'add') {
    const mapService = GUI.getComponent('map').getService();
    if (!feature) {
      Object.values(this.olSelectionFeatures).forEach((featureObject) => {
        featureObject.added && mapService.setSelectionFeatures('remove', {
          feature: featureObject.feature,
        });
        featureObject.added = false;
      });
    } else {
      const featureObject = this.olSelectionFeatures[feature.id] || this.addOlSelectionFeature(feature);
      if (action === 'add') {
        !featureObject.added && mapService.setSelectionFeatures(action, {
          feature: featureObject.feature,
        });
        featureObject.added = true;
      } else {
        mapService.setSelectionFeatures(action, {
          feature: featureObject.feature,
        });
        featureObject.added = false;
      }
    }
    return !Object.values(this.olSelectionFeatures).find((featureObject) => featureObject.added);
  },

  /**
   * Create a get parameter url right
   * @param type
   * @private
   */
  _sanitizeSourceUrl(type = 'wms') {
    const sanitizedUrl = utils.sanitizeUrl({
      url: this.config.source.url,
      reserverParameters: RESERVERDPARAMETRS[type],
    });
    this.config.source.url = sanitizedUrl;
  },

  isLayerCheckedAndAllParents() {
    let checked = this.isChecked();
    if (checked) {
      let { parentGroup } = this.state;
      while (checked && parentGroup) {
        checked = checked && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
    }
    return checked;
  },

  setChecked(bool) {
    this.state.checked = bool;
  },

  isChecked() {
    return this.state.checked;
  },

  /**
   * Is a method that check for visiblitity dissabled (based on scalevisibility) and checked on toc
   * @param bool
   * @returns {*}
   */
  setVisible(bool) {
    // check if is changed
    const oldVisibile = this.state.visible;
    this.state.visible = bool && this.isChecked(); // bool and is checked
    const changed = oldVisibile !== this.state.visible;
    // if changed call change
    changed && this.change();
    return this.state.visible;
  },

  isVisible() {
    return this.state.visible;
  },

  isDisabled() {
    return this.state.disabled;
  },

  isPrintable({ scale } = {}) {
    return this.isLayerCheckedAndAllParents() && (!this.state.scalebasedvisibility || (scale >= this.state.maxscale && scale <= this.state.minscale));
  },

  // get style form layer
  getStyles() {
    return this.config.source.external ? this.config.source.styles : this.config.styles;
  },

  getStyle() {
    return this.config.source.external ? this.config.source.styles : this.config.styles ? this.config.styles.find((style) => style.current).name : '';
  },

  /**
   * Method to change current style  of layer
   * @param currentStyleName
   * @returns {boolean}
   */
  setCurrentStyle(currentStyleName) {
    let changed = false;
    this.config.styles.forEach((style) => {
      if (style.name === currentStyleName) changed = !style.current;
      style.current = style.name === currentStyleName;
    });
    return changed;
  },

  /**
   * Disable layer by check scalevisibility configuration value
   * @param resolution
   * @param mapUnits
   */
  setDisabled(resolution, mapUnits = 'm') {
    if (this.state.scalebasedvisibility) {
      const mapScale = g3w_ol_utils.getScaleFromResolution(resolution, mapUnits);
      this.state.disabled = !(mapScale >= this.state.maxscale && mapScale <= this.state.minscale);
      this.state.disabled = this.state.minscale === 0 ? !(mapScale >= this.state.maxscale) : this.state.disabled;
      // needed to check if call setVisible if change disable property
      // looping through parentfolter checked
      let setVisible = true;
      let { parentGroup } = this.state;
      while (parentGroup) {
        setVisible = setVisible && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
      setVisible && this.setVisible(!this.state.disabled);
      // change toc highlight property based on disabled otr not
      this.isFilterable() && this.setTocHighlightable(!this.state.disabled);
    } else this.state.disabled = false;
  },

  getMultiLayerId() {
    return this.config.multilayerid;
  },

  getGeometryType() {
    return this.config.geometrytype;
  },

  getOwsMethod() {
    return this.config.ows_method;
  },

  setProjection(crs = {}) {
    this.config.projection = Projections.get(crs);
  },

  getProjection() {
    return this.config.projection;
  },

  getEpsg() {
    return this.config.crs.epsg;
  },

  getCrs() {
    return this.config.projection && this.config.projection.getCode() || null;
  },

  getMapCrs() {
    return this.config.map_crs;
  },

  isCached() {
    return this.config.cache_url && this.config.cache_url !== '';
  },

  getCacheUrl() {
    if (this.isCached()) return this.config.cache_url;
  },

  // return if layer has inverted axis
  hasAxisInverted() {
    const projection = this.getProjection();
    const axisOrientation = projection.getAxisOrientation ? projection.getAxisOrientation() : 'enu';
    return axisOrientation.substr(0, 2) === 'ne';
  },

  setMapProjection(mapProjection) {
    this._mapProjection = mapProjection;
  },

  getMapProjection() {
    return this._mapProjection;
  },
};

export default GeoLayerMixin;
