<!--
  @file

  ORIGINAL SOURCE: src/components/FieldGeo.vue@3.8
  ORIGINAL SOURCE: src/components/GlobalGeo.vue@3.8

  @example <g3w-input mode="read" _legacy="g3w-field" _type="geo" />

  @since 3.9.0
-->

<template>
  <g3w-input :state="state">
    <template #field-value>
      <div class="geo-content">
        <span
          @click.stop = "_showLayer()"
          class       = "show-hide-geo"
          :class      = "[ g3wtemplate.font[visible ? 'eye-close' : 'eye'] ]"
        ></span>
      </div>
    </template>
  </g3w-input>
</template>

<script>

export default {

  /** @since 3.9.0 */
  name: 'input-geo',

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      visible: false,
    }
  },

  methods: {

    /**
     * ORIGINAL SOURCE: src/mixins/geo.js@3.8
     * 
     * @since 3.9.0
     */
     _showLayer() {
      this.visible = !this.visible;
      if (this.layer) {
        this.layer.setVisible(this.visible);
      }
    },

  },

  /**
   * ORIGINAL SOURCE: src/components/GlobalGeo.vue@3.8
   */
  created() {
    const mapService = GUI.getComponent('map').getService();
    let style;
    switch (this.$attrs.data.type) {
      case 'Point':
      case 'MultiPoint':
        style = [
          new ol.style.Style({
            image: new ol.style.Circle({
              radius: 6,
              fill:   new ol.style.Fill({ color: [255, 255, 255, 1.0] }),
              stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
            })
          }),
          new ol.style.Style({
            image: new ol.style.Circle({
              radius: 2,
              fill:   new ol.style.Fill({ color: [255, 255, 255, 1.0] }),
              stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
            })
          })
        ];
        break;
      case 'Line':
      case 'MultiLineString':
      case 'Polygon':
      case 'MultiPolygon':
        style = new ol.style.Style({
          fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)' }),
          stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
        });
        break;
    }
    const features = new ol.format.GeoJSON().readFeatures(
      this.$attrs.data,
      { featureProjection: mapService.getProjection().getCode() }
    );
    this.layer = new ol.layer.Vector({
      source: new ol.source.Vector({ features }),
      visible: !!this.visible,
      style: style
    });
    mapService.getMap().addLayer(this.layer);
  },

};
</script>