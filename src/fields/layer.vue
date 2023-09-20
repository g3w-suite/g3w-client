<!--
  @file

  ORIGINAL SOURCE: src/components/InputPickLayer.vue@3.8
  ORIGINAL SOURCE: src/components/FieldGeo.vue@3.8
  ORIGINAL SOURCE: src/components/GlobalGeo.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      @example <g3w-field mode="input" _type="layer" />
    -->
    <template #input-body="{ change, tabIndex, editable, notvalid }">
      <div>
        <span
          :class = "g3wtemplate.font['crosshairs']"
          class  = "skin-color icon-picklayer"
        ></span>
        <input
          @input     = "change"
          @click     = "pickLayer"
          @blur      = "unpick"
          style      = "width: 100%;"
          :style     = "{ cursor: (editable ? 'pointer': null) }"
          class      = "form-control"
          readonly   = "readonly"
          :tabIndex  = "tabIndex"
          v-disabled = "!editable"
          :class     = "{ 'input-error-validation' : notvalid }"
          v-model    = "state.value"
        >
      </div>
    </template>

    <!--
        @example <g3w-field mode="input" _type="layer" />
    -->
    <template #field-value>
      <div class="geo-content">
        <span
          @click.stop = "_showLayer()"
          class       = "show-hide-geo"
          :class      = "[ g3wtemplate.font[visible ? 'eye-close' : 'eye'] ]"
        ></span>
      </div>
    </template>

  </g3w-field>
</template>

<script>
import GUI      from 'services/gui';
import G3WField from 'components/G3WField.vue';

Object
    .entries({
      GUI,
      G3WField,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.8.6 */
  // name: 'input-picklayer',

  components: {
    'g3w-field': G3WField,
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  /**
   * ORIGINAL SOURCE: src/components/FieldGeo.vue@3.8
   * ORIGINAL SOURCE: src/components/GlobalGeo.vue@3.8
   *
   * @example <g3w-field mode="read" _type="geo" />
   * 
   * @since 3.9.0
   */
  data() {
    return {
      visible: false,
    }
  },

  methods: {

    pickLayer() {
      this.pickservice
        .pick()
        .then(value => this.state.value = value)
        .catch(console.warn)
    },

    unpick() {
      setTimeout(() => !this._isPicked() && this.pickservice.unpick(), 200)
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8::isPicked()
     * 
     * @since 3.9.0
     */
    _isPicked() {
      return this.pickservice.ispicked;
    },

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

  created() {
    this.pickservice = this.$parent.createInputService('picklayer', this.state.input.options);

    /**
     * ORIGINAL SOURCE: src/components/GlobalGeo.vue@3.8
     */
    if ('read' === this.$parent.mode) {
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
    }

  },

  beforeDestroy() {
    if (this.pickservice) {
      this.pickservice.clear();
      this.pickservice = null;
    }
  },

};
</script>

<style scoped>
  .icon-picklayer {
    left: 0;
    top: 7px;
    position: absolute;
  }
</style>