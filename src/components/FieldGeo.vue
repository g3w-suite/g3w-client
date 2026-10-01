<!--
  @file
  @since v3.7
-->

<template>
  <div class = "geo-content">
    <span
      @click.stop = "showLayer()"
      class       = "show-hide-geo"
      :class      = "[visible ? g3wtemplate.font['eye-close'] : g3wtemplate.font['eye']]">
    </span>
  </div>
</template>

<script>
import GUI from 'g3w-app';

export default {
  name: "g3w-geospatial",
  props: {
    data: {},
  },
  data() {
    return {
      layerId: `table_layer_${Date.now()}`,
      visible: false,
      id:      `geo_table_${Date.now()}`
    }
  },
  methods: {
    showLayer() {
      this.visible = !this.visible;
      this.layer.setVisible(this.visible);
    }
  },
  created() {
    const data          = this.data;
    const mapProjection = GUI.getProjection().getCode();
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
    GUI.getMap().addLayer(this.layer);
  },
  beforeDestroy() {
    GUI.getMap().removeLayer(this.layer);
  }
};
</script>

<style scoped>
  .show-hide-geo {
    color: #3C8DBC;
    cursor: pointer;
    font-size: 1.2em;
  }

</style>
