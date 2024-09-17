/**
 * @file ORIGINAL SOURCE: src/app/core/layers/vectorlayer.js@v3.10.2
 * @since 3.11.0
 */

import G3WObject                      from 'g3w-object';
import GUI                            from 'services/gui';
import { getAllPointGeometryTypes }   from "utils/getAllPointGeometryTypes";
import { getAllLineGeometryTypes }    from "utils/getAllLineGeometryTypes";
import { getAllPolygonGeometryTypes } from "utils/getAllPolygonGeometryTypes";
import GeoLayerMixin                  from 'map/layers/geo-mixin'
import { $promisify, promisify }      from 'utils/promisify';


import { Layer }          from 'map/layers/layer';
import { TableLayer }     from 'map/layers/tablelayer';

export class VectorLayer extends GeoLayerMixin(TableLayer) {

  constructor(config = {}, opts = {}) {
    super(config, opts);
    this._mapLayer = null; // later tah will be added to the map
    this.type      = Layer.LayerTypes.VECTOR;

    const layerType = `${config.servertype} ${config.source && config.source.type}`;

    // need an ol layer for adding to the map
    this.setup(config, opts);

    if ('G3WSUITE geojson' === layerType) {
      this._g3w_geojson = true;
      this.config.style = config.style;
      this.setup(config);
    }

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

  /**
   * ORIGINAL SOURCE: src/app/core/layers/map/vectorlayer.js@v3.10.1
   */
  getMapLayer() {
    if (this._mapLayer) {
      return this._mapLayer;
    }

    this._mapLayer = new G3WObject;

    const style = this._g3w_geojson ? this.get('style') : (this.config.editing ? this.config.editing.style : this.getCustomStyle());

    let olStyle = style ? new ol.style.Style(
      Object
        .entries(style || {})
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
        )
    : null;
  
    // create ol layer to add to map
    this._mapLayer._olLayer = new ol.layer.Vector({
      id: this.getId(),
      source: new ol.source.Vector({ features: (this._editor && this._editor.getEditingSource().getFeaturesCollection() || []) || new ol.Collection() })
    });
  
    if (!olStyle && getAllPointGeometryTypes().includes(this.getGeometryType())) {
      olStyle = new ol.style.Style({
        image: new ol.style.Circle({
          fill:   new ol.style.Fill({ color: this.getColor() }),
          radius: 5,
        }),
      });
    }
  
    if (!olStyle && getAllLineGeometryTypes().includes(this.getGeometryType())) {
      olStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({ color: this.getColor(), width: 3 })
      });
    }
  
    if (!olStyle && getAllPolygonGeometryTypes().includes(this.getGeometryType())) {
      olStyle =  new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#000000', width: 1 }),
        fill:   new ol.style.Fill({ color: this.getColor() }),
      });
      this._mapLayer._olLayer.setOpacity(0.6);
    }

    console.log(this._mapLayer.geometryType, style, olStyle);

    this._mapLayer._olLayer.setStyle(olStyle);

    Object.assign(this._mapLayer, {
      _olLayer:      this._mapLayer._olLayer,
      mapService:    GUI.getService('map'),
      geometryType:  this.getGeometryType(),
      geometrytype:  null,
      type:          null,
      crs:           null,
      id:            this.getId(),
      name:          this._g3w_geojson && this.getName() || '',
      style,
      color:         this.getColor(),
      projection:    this._g3w_geojson ? this.getProjection().getCode() : GUI.getService('map').getProjection().getCode(),
      url:           this._g3w_geojson ? this.get('source').url : undefined,
      provider:      this.getProvider('data'),
      getProvider:   ()           => this._mapLayer.provider,
      resetSource:   (feats = []) => this._mapLayer.setSource(new ol.source.Vector({ features: feats })),
      getFeatures:   (opts = {})  => $promisify(async () => this._mapLayer.addFeatures(await promisify(this._mapLayer.provider.getFeatures(opts)))),
      addFeatures:   (feats = []) => this._mapLayer.getSource().addFeatures(feats),
      addFeature:    feat         => feat && this.getSource().addFeature(feat),
      getOLLayer:    ()           => this._mapLayer._olLayer,
      getSource:     ()           => this._mapLayer._olLayer.getSource(),
      setSource:     source       => this._mapLayer._olLayer.setSource(source),
      setStyle:       style       => this._mapLayer._olLayer.setStyle(style),
      getFeatureById:    id       => id ? this._mapLayer._olLayer.getSource().getFeatureById(id) : null,
      isVisible:         ()       => this._mapLayer._olLayer.getVisible(),
      setVisible:      bool       => this._mapLayer._olLayer.setVisible(bool),
      clear:             ()       => this._mapLayer.getSource().clear(),
      addToMap:         map       => map.addLayer(this._mapLayer._olLayer),

    });

    if (this._g3w_geojson) {
      this._mapLayer.getFeatures({
        url:           this.get('source').url,
        mapProjection: GUI.getService('map').getProjection().getCode()
      });
    }

    return this._mapLayer;
  }

}