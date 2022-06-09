import geoutils  from 'core/utils/geo';
import GUI  from 'gui/gui';
import G3WObject from 'core/g3wobject';
import {Vector as OLVectorLayer} from "ol/layer";
import {Vector as VectorSource} from "ol/source";
import {Style, Fill, Stroke, Icon} from "ol/style";

class VectorLayer extends G3WObject{
  constructor (options = {}) {
    super();
    this.mapService = GUI.getComponent('map').getService();
    this.geometrytype = options.geometrytype || null;
    this.type = options.type || null;
    this.crs = options.crs  || null;
    this.id = options.id;
    this.name = options.name || "";
    this.style = options.style;
    this.color = options.color;
    this.geometryType = options.geometryType;
    this.mapProjection = this.mapService.getProjection().getCode();
    this.projection = options.projection || this.mapProjection;
    this.url = options.url;
    this.provider = options.provider;
    this._features = options.features || [];
    this._olLayer = options.olLayer || this.getOLLayer();
  }

  setProvider(provider) {
    this._provider = provider;
  };

  getProvider() {
    return this._provider;
  };

  resetSource(features=[]){
    const source = new VectorSource({
      features
    });
    this.setSource(source);
  };

  _makeOlLayer({style} = {}) {
    const _style = this._makeStyle(style);
    this._olLayer = new OLVectorLayer({
      name: this.name,
      id: this.id,
      style: _style,
      source: new VectorSource({})
    })
  };

  _makeStyle(styleConfig) {
    let style;
    const styles = {};
    if (styleConfig) {
      Object.entries(styleConfig).forEach(([type, config]) => {
        switch (type) {
          case 'point':
            if (config.icon) {
              styles.image = new Icon({
                src: config.icon.url,
                imageSize: config.icon.width
              })
            }
            break;
          case 'line':
            styles.stroke = new Stroke({
              color: config.color,
              width: config.width
            });
            break;
          case 'polygon':
            styles.fill = new Fill({
              color: config.color
            });
            break
        }
      });
      style = new Style(styles);
    }
    return style
  };

  getFeatures(options={}) {
    const d = $.Deferred();
    this.provider.getFeatures(options)
      .then(features => {
        this.addFeatures(features);
        d.resolve(features);
      })
      .fail(err => d.reject(err));
    return d.promise()
  };

  addFeatures(features=[]) {
    this.getSource().addFeatures(features)
  };

  addFeature(feature) {
    feature && this.getSource().addFeature(feature)
  };

  getOLLayer() {
    if (this._olLayer) return this._olLayer;
    else {
      const id = this.id;
      const geometryType =  this.geometryType;
      const color = this.color;
      const style = this.style ? geoutils.createLayerStyle(this.style) : null;
      this._olLayer = geoutils.createOlLayer({
        id,
        geometryType,
        color,
        style,
        features: this._features
      })
    }
    return this._olLayer;
  };

  setOLLayer(olLayer) {
    this._olLayer = olLayer;
  };

  getSource() {
    !this._olLayer && this.getOLLayer();
    return this._olLayer.getSource();
  };

  setSource(source) {
    this._olLayer.setSource(source);
  };

  setStyle(style) {
    this._olLayer.setStyle(style);
  };

  getFeatureById(fid){
    return fid ? this._olLayer.getSource().getFeatureById(fid) : null;
  };

  isVisible() {
    return this._olLayer.getVisible();
  };

  setVisible(bool) {
    this._olLayer.setVisible(bool);
  };

  clear(){
    this.getSource().clear();
  };

  addToMap(map){
    map.addLayer(this._olLayer);
  };
}

export default  VectorLayer;





