import G3WObject            from 'core/g3w-object';
import GUI                  from 'services/gui';
import { createOlLayer }    from 'utils/createOlLayer';
import { createLayerStyle } from 'utils/createLayerStyle';
import GeoLayerMixin        from 'core/layers/mixins/geo';

const Layer          = require('core/layers/layer');
const TableLayer     = require('core/layers/tablelayer');

/**
 * ORIGINAL SOURCE: src/app/core/layers/map/vectorlayer.js@v3.10.1
 */
class VectorMapLayer extends  G3WObject{

  constructor(options = {}) {
    super(options);

    this.mapService    = GUI.getService('map');
    this.geometrytype  = options.geometrytype || null;
    this.type          = options.type || null;
    this.crs           = options.crs  || null;
    this.id            = options.id;
    this.name          = options.name || "";
    this.style         = options.style;
    this.color         = options.color;
    this.geometryType  = options.geometryType;
    this.mapProjection = this.mapService.getProjection().getCode();
    this.projection    = options.projection || this.mapProjection;
    this.url           = options.url;
    this.provider      = options.provider;
    this._features     = options.features || [];
    this._olLayer      = options.olLayer || this.getOLLayer();
  }

  setProvider(provider) {
    this._provider = provider;
  }

  getProvider() {
    return this._provider;
  }

  resetSource(features=[]) {
    this.setSource(new ol.source.Vector({ features }));
  }

  _makeOlLayer({ style } = {}) {
    this._olLayer = new ol.layer.Vector({
      name:   this.name,
      id:     this.id,
      style:  this._makeStyle(style),
      source: new ol.source.Vector({}),
    })
  }

  _makeStyle(styleConfig) {
    let style;
    const styles = {};
    if (styleConfig) {
      Object.entries(styleConfig).forEach(([type, config]) => {
        switch (type) {
          case 'point': if (config.icon) { styles.image = new ol.style.Icon({ src: config.icon.url, imageSize: config.icon.width }) } break;
          case 'line':    styles.stroke = new ol.style.Stroke({ color: config.color, width: config.width }); break;
          case 'polygon': styles.fill = new ol.style.Fill({ color: config.color }); break
        }
      });
      style = new ol.style.Style(styles);
    }
    return style
  }

  getFeatures(options={}) {
    const d = $.Deferred();
    this.provider.getFeatures(options)
      .then(features => {
        this.addFeatures(features);
        d.resolve(features);
      })
      .fail(err => d.reject(err));
    return d.promise()
  }

  addFeatures(features=[]) {
    this.getSource().addFeatures(features)
  }

  addFeature(feature) {
    if (feature) {
      this.getSource().addFeature(feature)
    }
  };

  getOLLayer() {
    if (this._olLayer) {
      return this._olLayer;
    }
    this._olLayer = createOlLayer({
      id:           this.id,
      geometryType: this.geometryType,
      color:        this.color,
      style:        this.style ? createLayerStyle(this.style) : null,
      features:     this._features
    })
    return this._olLayer;
  }

  setOLLayer(olLayer) {
    this._olLayer = olLayer;
  };

  getSource() {
    if (!this._olLayer) {
      this.getOLLayer();
    } 
    return this._olLayer.getSource();
  };

  setSource(source) {
    this._olLayer.setSource(source);
  }

  setStyle(style) {
    this._olLayer.setStyle(style);
  }

  getFeatureById(fid){
    return fid ? this._olLayer.getSource().getFeatureById(fid) : null;
  }

  isVisible() {
    return this._olLayer.getVisible();
  }

  setVisible(bool) {
    this._olLayer.setVisible(bool);
  }

  clear() {
    this.getSource().clear();
  }

  addToMap(map) {
    map.addLayer(this._olLayer);
  }

};

class VectorLayer extends GeoLayerMixin(TableLayer) {
  
  constructor(config={}, options) {
    super(config, options);
    this._mapLayer = null; // later tah will be added to map
    this.type = Layer.LayerTypes.VECTOR;
    // need a ol layer for add to map
    this.setup(config, options);
    this.onafter('setColor', color => {});
  }

  getEditingLayer() {
    return this.getMapLayer().getOLLayer();
  }

  resetEditingSource(features=[]){
    this.getMapLayer().resetSource(features)
  }

  getEditingGeometryType() {
    return this.config.editing.geometrytype;
  }

  getMapLayer() {
    if (!this._mapLayer) {
        this._mapLayer = new VectorMapLayer({
        id:           this.getId(),
        geometryType: this.getGeometryType(),
        color:        this.getColor(),
        style:        this.isEditingLayer() ? this.getEditingStyle() : this.getCustomStyle(),
        provider:     this.getProvider('data'),
        features:     this._editor && this._editor.getEditingSource().getFeaturesCollection()
      });
    }
    return this._mapLayer;
  }

};

module.exports = {
  VectorLayer,
  VectorMapLayer
};