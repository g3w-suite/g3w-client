<!--
  @file
  @since 3.9.0

  @version 2.0 ADD SOURCE FROM: src/components/GlobalGeo.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/GlobalGallery.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/GlobalImage.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldImage.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldGeo.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldLink.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldMedia.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldText.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldVue.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/mixins/fields.js@3.8
  @version 2.0 ADD SOURCE FROM: src/mixins/media.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/Field.vue@3.8
  @version 1.0 ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
-->

<template>

<!--
  ORIGINAL SOURCE: src/components/G3WField.vue@3.8

  @example <g3w-field _legacy="g3w-field" />

  @since 3.7
-->
<component
  v-if   = "__isField"
  :is    = "type"
  v-bind = "{...$attrs, state }"
/>

<!--
  ORIGINAL SOURCE: src/components/Field.vue@3.8

  @example <g3w-field :state />

  @since 3.9.0
-->
<fragment v-else>
  <slot name="default">

    <span
      v-if   = "_legacy && isSimple(field)"
      v-html = "field.value"
    ></span>

    <!--
      ORIGINAL SOURCE: src/components/G3WField.vue@3.8
      ORIGINAL SOURCE: src/components/GlobalGallery.vue@3.8

      @example <g3w-field _legacy="g3w-galleryfield" />

      @since 3.9.0
    -->
    <div v-else-if="__isGalleryField" class="container-fluid">
      <div class="row">
        <div v-for="(img, index) in values" class="g3w-image col-md-6 col-sm-12">
          <img
            class  = "img-thumbnail"
            @click = "_showGallery(index)"
            :src   = "_getSrc(img)"
          />
        </div>
      </div>
      <div
        class           = "modal gallery fade modal-fullscreen force-fullscreen"
        ref             = "gallery"
        :id             = "'gallery_' + time"
        tabindex        = "-1"
        role            = "dialog"
        aria-labelledby = ""
        aria-hidden     = "true"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-body">
              <div :id="'carousel_' + time" class="carousel slide" data-interval="false">
                <div class="carousel-inner">
                  <div v-for="(img, index) in images" class="item" :class="active == index ? 'active' : ''">
                    <img style="margin:auto" :src="_imgSrc(img.src)">
                  </div>
                </div>
                <a v-if="images.length > 1" class="left carousel-control" :href="'carousel_' + time" role="button" data-slide="prev">
                  <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
                </a>
                <a v-if="images.length > 1" class="right carousel-control" :href="'carousel_' + time" role="button" data-slide="next">
                  <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!--
      ORIGINAL SOURCE: src/components/FieldGeo.vue@3.8
      ORIGINAL SOURCE: src/components/GlobalGeo.vue@3.8

      @example <g3w-field _legacy="g3w-geofield" />

      @since 3.9.0
    -->
    <div v-else-if="__isGeoField || isGeo(field)" class="geo-content">
      <span
        @click.stop = "_showLayer()"
        class       = "show-hide-geo"
        :class      = "[ g3wtemplate.font[visible ? 'eye-close' : 'eye'] ]"
      ></span>
    </div>

    <div
      v-else
      class  = "field"
      :style = "{ fontSize: isMobile() && '0.8em' }"
    >

      <div v-if="state.label" class="col-sm-6 field_label">
        <slot name="label">{{state.label}}</slot>
      </div>

      <div :class="[state.label ? 'col-sm-6' : null ]" class="field_value">

        <slot name="field">

          <!--
            ORIGINAL SOURCE: src/components/FieldVue.vue@3.8

            @example <g3w-field _legacy="g3w-vuefield" />

            @since 3.9.0
          -->
          <div v-if="__isVueField || isVue(field)">
            <component
              :feature = "feature"
              :value   = "undefined === field.value       ? null        : field.value"
              :is      = "(undefined === field.vueoptions ? {}          : field.vueoptions.component) || {}"
              v-html   = "__isVueField                    ? undefined   : field.value"
            />
          </div>

          <!--
            ORIGINAL SOURCE: src/components/FieldLink.vue@3.8

            @example <g3w-field _legacy="g3w-linkfield" />

            @since 3.9.0
          -->
          <button
            v-else-if = "__isLinkField || isLink(field)"
            class     = "btn skin-button field_link"
            v-t       = "'info.link_button'"
            @click    = "() => window.open(
              (__isLinkField ? ((state.value && 'object' === typeof state.value) ? state.value.value : state.value) : (field.value)),
              '_blank'
            )"
          ></button>

          <!--
            ORIGINAL SOURCE: src/components/FieldMedia.vue@3.8

            @example <g3w-field _legacy="g3w-mediafield" />

            @since 3.9.0
          -->
          <div v-else-if="__isMediaField">
            <div v-if="state.value" class="preview">
              <a :href="state.value" target="_blank">
                <div class="previewtype" :class="getMediaType(state.mime_type)">
                  <i class="fa-2x" :class="g3wtemplate.font[getMediaType(state.mime_type)]"></i>
                </div>
              </a>
              <div class="filename">{{ state.value ? state.value.split('/').pop() : state.value }}</div>
              <slot></slot>
            </div>
          </div>

          <!--
            ORIGINAL SOURCE: src/components/FieldImage.vue@3.8
            ORIGINAL SOURCE: src/components/GlobalGallery.vue@3.8

            @example <g3w-field _legacy="g3w-imagefield" />

            @since 3.9.0
          -->
          <div v-else-if="__isImageField || isPhoto(field) || isImage(field)" style = "text-align: left">
            <img
              v-for  = "(img, index) in values"
              class  = "img-responsive"
              style  = "max-height: 50px;"
              @click = "_showGallery(index)"
              :src   = "_getSrc(img)"
            />
            <div
              class           = "modal gallery fade modal-fullscreen force-fullscreen"
              ref             = "gallery"
              :id             = "'gallery_' + time"
              tabindex        = "-1"
              role            = "dialog"
              aria-labelledby = ""
              aria-hidden     = "true"
            >
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-body">
                    <div :id="'carousel_' + time" class="carousel slide" data-interval="false">
                      <div class="carousel-inner">
                        <div v-for="(img, index) in images" class="item" :class="active == index ? 'active' : ''">
                          <img style="margin:auto" :src="_imgSrc(img.src)">
                        </div>
                      </div>
                      <a v-if="images.length > 1" class="left carousel-control" :href="'carousel_' + time" role="button" data-slide="prev">
                        <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
                      </a>
                      <a v-if="images.length > 1" class="right carousel-control" :href="'carousel_' + time" role="button" data-slide="next">
                        <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!--
            ORIGINAL SOURCE: src/components/FieldText.vue@3.8

            @example <g3w-field :state />

            @since 3.9.0
          -->
          <span
            v-else
            style  = "word-wrap: break-word;"
            v-html = "state.value"
          ></span>

        </slot>
      </div>

    </div>

  </slot>
  </fragment>

</template>

<script>
import { Fragment }                from 'vue-fragment';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry            from 'store/projects';
import GUI                         from 'services/gui';

const { getFieldType, getMediaFieldType, toRawType } = require('core/utils/utils');

Object
  .entries({
    CatalogLayersStoresRegistry,
    ProjectsRegistry,
    GUI,
    getFieldType,
    getMediaFieldType,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));


/******************************************************* */

/**
 * ORIGINAL SOURCE: src/gui/fields/fieldsservice.js@3.8
 */
const fieldsservice = {

  /**
   * Add a new field type to Fields
   * 
   * @param type
   * @param field
   */
  add({ type, field }) {
    vm.components[type] = field;
  },

  /**
   * Remove field from Fields list
   * 
   * @param type
   */
  remove(type) {
    delete vm.components[type];
  },

  /**
   * Change type of field (example to set vue type)
   * 
   * @param layerId
   * @param field
   */
  changeConfigFieldType({layerId, field={}}) {
    CatalogLayersStoresRegistry.getLayerById(layerId).changeConfigFieldType(field);
  },

  /**
   * Reset origin type
   * 
   * @param layerId
   * @param field
   */
  resetConfigFieldType({layerId, field={}}) {
    CatalogLayersStoresRegistry.getLayerById(layerId).resetConfigField(field);
  },

};

/******************************************************* */

const vm = {

  name: "g3w-field",

  data() {
    return {
      /** @since 3.9.0 */
      window: window,
      active: null,   // image field
      visible: false, // geo field
      time: Date.now(),
    }
  },

  props: {

    /**
     * ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
     */
    state: {
      // required: true
      default: {},
    },

    /**
     * ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
     */
    // feature: {
    //   type: Object,
    //   default: {},
    // },

    /**
     * ORIGINAL SOURCE: src/components/QueryResultsTableAttributeFieldValue.vue@3.8
     */
    // field: {
    //   type: Object,
    //    default: {},
    // },

    /**
     * ORIGINAL SOURCE: src/components/Relation.vue@3.8
     */
    // layer: {
    //   type: Object,
    //   default: undefined,
    // },

    /**
     * ORIGINAL SOURCE: src/components/Relation.vue@3.8
     */
    // config: {
    //   type: Object,
    //   default: undefined,
    // },

    /**
     * Legacy field type.
     * 
     * BACKCOMP ONLY (v3.x)
     * 
     * ref: `g3wsdk.gui.vue.Fields`
     * 
     * @since 3.9.0
     */
     _legacy: {
      type: String,
      default: "",
    },

  },

  /**
   * ORIGINAL SOURCE: src/gui/fields/fields.js@3.8
   * 
   * @since 3.9.0
   */
  components: {
    Fragment,
  },

  computed: {

    /**
     * Whether this is a Legacy FieldG3W component
     * 
     * @example <g3w-field _legacy="g3w-field" />
     * 
     * @since 3.9.0
     */
     __isField() {
      return 'g3w-field' === this._legacy;
    },

    /**
     * Whether this is a Legacy FieldVue component
     * 
     * @example <g3w-field _legacy="g3w-vuefield" />
     * 
     * @since 3.9.0
     */
     __isVueField() {
      return 'g3w-vuefield' === this._legacy;
    },

    /**
     * Whether this is a Legacy FieldLink component
     * 
     * @example <g3w-field _legacy="g3w-linkfield" />
     * 
     * @since 3.9.0
     */
     __isLinkField() {
      return 'g3w-linkfield' === this._legacy;
    },

    /**
     * Whether this is a Legacy FieldMedia component
     * 
     * @example <g3w-field _legacy="g3w-mediafield" />
     * 
     * @since 3.9.0
     */
     __isMediaField() {
      return 'g3w-mediafield' === this._legacy;
    },

    /**
     * Whether this is a Legacy GlobalImage component
     * 
     * @example <g3w-field _legacy="g3w-imagefield" />
     * 
     * @since 3.9.0
     */
     __isImageField() {
      return 'g3w-imagefield' === this._legacy;
    },

    /**
     * Whether this is a Legacy GlobalGallery component
     * 
     * @example <g3w-field _legacy="g3w-galleryfield" />
     * 
     * @since 3.9.0
     */
     __isGalleryField() {
      return 'g3w-galleryfield' === this._legacy;
    },

    /**
     * Whether this is a Legacy GlobalGeo component
     * 
     * @example <g3w-field _legacy="g3w-geofield" />
     * 
     * @since 3.9.0
     */
     __isGeoField() {
      return 'g3w-geofield' === this._legacy;
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalImage.vue@3.8
     */
    values() {
      return Array.isArray(this.state.value) ? this.state.value : [this.state.value];
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalGallery.vue@3.8
     */
    images() {
      return this.values.map((img) => ({ src: ('Object' === toRawType(img) ? img.photo: img) }));
    }

  },

  methods: {

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    getFieldService() {
      // if (undefined === this._fieldsService) {
      //   this._fieldsService = fieldsservice;
      // }
      // return this._fieldsService;
      return fieldsservice;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    getType: getFieldType,

    /**
     * @since 3.9.0
     */
    getMediaType(mime_type) {
      return getMediaFieldType(mime_type).type;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    getFieldType: getFieldType,

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isSimple(field) {
      return 'simple_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isLink(field) {
      return 'link_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isImage(field) {
      return 'image_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isPhoto(field) {
      return 'photo_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/media.js@3.8 
     */
    isMedia(value) {
      if (value && typeof  value === 'object' && value.constructor === Object) return !!value.mime_type;
      return false;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isVue(field) {
      return 'vue_field' === getFieldType(field);
    },

    /**
     * @since 3.9.0
     */
     isGeo(field) {
      return 'geo_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    sanitizeFieldValue(value) {
      return (Array.isArray(value) && !value.length) ? '' : value;
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalImage.vue
     * 
     * @since 3.9.0
     */
    _showGallery(idx) {
      this.active = idx;
      if ('Object' === toRawType(this.state.value)) {
        this.state.value.active = true;
      }
      $('#' + this.$refs.gallery.id).modal('show');
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalGallery.vue@3.8
     * 
     * @since 3.9.0
     */
    _imgSrc(url) {
      return (_.startsWith(url,'/') || _.startsWith(url,'http') ? '' : ProjectsRegistry.getConfig().mediaurl) + url;
    },

    /**
     * ORIGINAL SOURCE: src/components/FieldImage.vue@3.8
     * 
     * @since 3.9.0
     */
    _getSrc(img) {
      return 'Object' === toRawType(img) ? img.photo: img;
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

  /**
   * ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
   */
  created() {
    /** @TODO make it a required `$props` instead? */
    if (!this.feature) {
      this.feature = {};
    }

    /** @TODO make it a required `$props` instead? */
    if(!this.field) {
      this.field = this.state;
    }

    /** @TODO make it a required `$props` instead? */
    if (this._type) {                          // TODO: replace static `_type` calls with `getFieldType(field)` ?
      this.type = this._type;
    } else if (this.__isField && !this.type) {
      this.type = this.getType(this.state);
    }

    // ORIGINAL SOURCE: src/components/GlobalGeo.vue@3.8
    if (this.__isGeoField || this.isGeo(this.field)) {
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
    if (this.layer) {
      GUI.getComponent('map').getService().getMap().removeLayer(this.layer);
    }
  },

};

/**
 * BACKCOMP
 */
function _alias(vm, props) {
  return {
    functional: true,
    render(h, { data, children }) {
      return h( vm, { ...data, props: { ...data.props, props } }, children);
    },
  };
}

vm.components['text_field']   = vm;
vm.components['link_field']   = _alias(vm, { _legacy: "g3w-linkfield" });
vm.components['media_field']  = _alias(vm, { _legacy: "g3w-mediafield" });
vm.components['image_field']  = _alias(vm, { _legacy: "g3w-imagefield" });
vm.components['geo_field']    = _alias(vm, { _legacy: "g3w-geofield" });
vm.components['vue_field']    = _alias(vm, { _legacy: "g3w-vuefield" });

vm.components['simple_field'] = vm.components['text_field'];
vm.components['photo_field']  = vm.components['image_field'];
vm.components['g3w_link']     = vm.components['link_field']; // see: components/QueryResultsTableAttributeFieldValue.vue@3.8
vm.components['g3w_vue']      = vm.components['vue_field'];  // see: components/QueryResultsTableAttributeFieldValue.vue@3.8

fieldsservice.getType         = vm.methods.getType;
fieldsservice.isVue           = vm.methods.isVue;
fieldsservice.isPhoto         = vm.methods.isPhoto;
fieldsservice.isLink          = vm.methods.isLink;
fieldsservice.isSimple        = vm.methods.isSimple;
fieldsservice.isImage         = vm.methods.isImage;

export default vm;
</script>

<style scoped>
  .field {
    background-color: transparent !important;
    padding-top: 3px;
    padding-bottom: 3px;
    display: flex;
    align-items: center;
  }
  .value {
    position: relative;
  }
  .field div {
    padding-left: 3px;
    padding-right: 3px;
  }

  .field_value {
    padding-left: 0 !important;
  }

  .field_text_table {
    background-color: transparent !important;
  }
  .field_text_table .field_label {
    font-weight: bold;
  }
  .field_link {
    max-width: 100%;
  }
  .img-responsive {
    cursor: pointer;
  }
  .g3w-image {
    padding-left: 0 !important;
    min-width: 100px;
    max-width: 100%;
    cursor:pointer;
  }
  .modal.gallery .modal-content {
    background: rgba(255, 255, 255, 0.6);
    border-radius: 3px;
  }
  .modal.gallery .modal-dialog {
    display: inline-block;
    text-align: left;
    vertical-align: middle;
  }
  .modal.gallery {
    text-align: center;
    padding: 0!important;
  }
  .modal.gallery:before {
    content: '';
    display: inline-block;
    height: 100%;
    vertical-align: middle;
    margin-right: -4px;
  }
  .modal.gallery .carousel .carousel-control span {
    color: #3c8dbc
  }
  .show-hide-geo {
    color: #3C8DBC;
    cursor: pointer;
    font-size: 1.2em;
  }
</style>