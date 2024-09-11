/**
 * @file ORIGINAL SOURCE: src/app/core/layers/vectorlayer.js@v3.10.2
 * @since 3.11.0
 */

import G3WObject                      from 'g3w-object';
import GUI                            from 'services/gui';
import { getAllPointGeometryTypes }   from "utils/getAllPointGeometryTypes";
import { getAllLineGeometryTypes }    from "utils/getAllLineGeometryTypes";
import { getAllPolygonGeometryTypes } from "utils/getAllPolygonGeometryTypes";
import GeoLayerMixin                  from 'map/layers/mixins/geo'
import { $promisify, promisify }      from 'utils/promisify';


const Layer          = require('map/layers/layer');
const TableLayer     = require('map/layers/tablelayer');

/**
 * @returns { ol.style.Style | undefined } style
 */
function createLayerStyle(styleObj) {
  // skip when no style object is passed
  if (!styleObj) {
    return;
  }

  return new ol.style.Style(
    Object
    .entries(styleObj)
    .reduce((styles, [type, config]) => {
      if ('point' === type && config.icon) {
        styles.image = new ol.style.Icon({ src: config.icon.url, imageSize: config.icon.width });
      }
      if ('line' === type) {
        styles.stroke = new ol.style.Stroke({ color: config.color, width: config.width });
      }
      if ('polygon' === type) {
        styles.fill = new ol.style.Fill({ color: config.color });
      }
      return styles;
    }, {})
  );
}


/**
 * @param { Object } layer options
 * @param layer.id
 * @param layer.features
 * @param layer.geometryType
 * @param layer.color
 * @param layer.style
 * @param layer.source
 * 
 * @returns { ol.layer.Vector } ol layer 
 */
function createOlLayer(layer = {}) {
  const color    = layer.color;
  let style      = layer.style;

  // create ol layer to add to map
  const olSource = layer.source || new ol.source.Vector({ features: layer.features || new ol.Collection() });
  const olLayer  = new ol.layer.Vector({ id: layer.id, source: olSource });

  if (!style && getAllPointGeometryTypes().includes(layer.geometryType)) {
    style = new ol.style.Style({
      image: new ol.style.Circle({
        fill:   new ol.style.Fill({ color }),
        radius: 5,
      }),
    });
  }

  if (!style && getAllLineGeometryTypes().includes(layer.geometryType)) {
    style = new ol.style.Style({
      stroke: new ol.style.Stroke({ color, width: 3 })
    });
  }

  if (!style && getAllPolygonGeometryTypes().includes(layer.geometryType)) {
    style =  new ol.style.Style({
      stroke: new ol.style.Stroke({ color: '#000000', width: 1 }),
      fill:   new ol.style.Fill({ color }),
    });
    olLayer.setOpacity(0.6);
  }

  olLayer.setStyle(style);
  return olLayer;
}

/**
 * @TODO merge "VectorMapLayer" class into "VectorLayer"
 * 
 * ORIGINAL SOURCE: src/app/core/layers/map/vectorlayer.js@v3.10.1
 */
class VectorMapLayer extends G3WObject {

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
    this._provider     = options.provider;
    this._features     = options.features || [];
    this._olLayer      = options.olLayer || this.getOLLayer();
  }

  getProvider() {
    return this._provider;
  }

  resetSource(features = []) {
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

  _makeStyle(styleConfig = {}) {
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

  getFeatures(opts = {}) {
    return $promisify(async () => this.addFeatures(await promisify(this.provider.getFeatures(opts))));
  }

  addFeatures(features = []) {
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

  getFeatureById(id) {
    return id ? this._olLayer.getSource().getFeatureById(id) : null;
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

}

class VectorLayer extends GeoLayerMixin(TableLayer) {
  
  constructor(config = {}, opts = {}) {
    super(config, opts);
    this._mapLayer = null; // later tah will be added to the map
    this.type      = Layer.LayerTypes.VECTOR;
    // need an ol layer for adding to the map
    this.setup(config, opts);
    this.onafter('setColor', color => {});
  }

  getEditingLayer() {
    return this.getMapLayer().getOLLayer();
  }

  resetEditingSource(features = []) {
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
        style:        this.config.editing ? this.config.editing.style : this.getCustomStyle(),
        provider:     this.getProvider('data'),
        features:     this._editor && this._editor.getEditingSource().getFeaturesCollection()
      });
    }
    return this._mapLayer;
  }

}

module.exports = {
  VectorLayer,
  VectorMapLayer
};