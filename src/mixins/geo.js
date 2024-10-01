/**
 * @file
 * @since v3.7
 */

import GUI from 'services/gui';

export default {
  methods: {
    showLayer() {
      this.visible = !this.visible;
      this.layer.setVisible(this.visible);
    }
  },
  created() {
    const data          = this.data;
    const mapProjection = GUI.getService('map').getProjection().getCode();
    let style;
    switch (data.type) {
      case 'Point':
      case 'MultiPoint':
        style = [new ol.style.Style({
          image: new ol.style.Circle({
            radius: 6,
            fill:   new ol.style.Fill({ color: [255,255,255,1.0] }),
            stroke: new ol.style.Stroke({ color: [0,0,0,1.0], width: 2, })
          })
        }),
          new ol.style.Style({
            image: new ol.style.Circle({
              radius: 2,
              fill:   new ol.style.Fill({ color: [255,255,255,1.0] }),
              stroke: new ol.style.Stroke({ color: [0,0,0,1.0], width: 2, })
            })
          })];
        break;
      case 'Line':
      case 'MultiLineString':
      case 'Polygon':
      case 'MultiPolygon':
        style = new ol.style.Style({
          fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)', }),
          stroke: new ol.style.Stroke({ color: [0,0,0,1.0], width: 2, })
        });
        break;
    }
    this.layer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(data, { featureProjection: mapProjection })
      }),
      visible: !!this.visible,
      style:   style
    });
    GUI.getService('map').getMap().addLayer(this.layer);
  },
  beforeDestroy() {
    GUI.getService('map').getMap().removeLayer(this.layer);
  }
};