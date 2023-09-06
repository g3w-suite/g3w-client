<!--
  @file
  @since 3.9.0

  @version 2.0 ADD SOURCE FROM: src/mixins/fields.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/Field.vue@3.8
  @version 1.0 ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
-->

<template>

  <!--
    Legacy FieldG3W component

    @example <g3w-field _legacy="g3w-field" />

    ORIGINAL SOURCE: src/components/G3WField.vue@3.8

    @since 3.7
  -->
  <component
    v-if="__isField"
    :is      = "type"
    :feature = "feature"
    :state   = "state"
  />

  <!--
    Base Field component

    @example <g3w-field :state />

    ORIGINAL SOURCE: src/components/Field.vue@3.8

    @since 3.9.0
  -->
  <div
    v-else
    class  = "field"
    :style = "{ fontSize: isMobile() && '0.8em' }"
  >

    <div v-if="state.label" class="col-sm-6  field_label">
      <slot name="label">{{state.label}}</slot>
    </div>

    <div :class="[state.label ? 'col-sm-6' : null ]" class="field_value">
      <slot name="field">
        <span style="word-wrap: break-word;" v-html="state.value"></span>
      </slot>
    </div>

  </div>

</template>

<script>
import CatalogLayersStoresRegistry from 'store/catalog-layers';

import text_field   from 'components/FieldText.vue';
import link_field   from 'components/FieldLink.vue';
import image_field  from 'components/FieldImage.vue'
import geo_field    from 'components/FieldGeo.vue';
import media_field  from 'components/FieldMedia.vue';
import vue_field    from 'components/FieldVue.vue';

const { toRawType } = require('core/utils/utils');

Object
  .entries({
    CatalogLayersStoresRegistry,
    text_field,
    link_field,
    image_field,
    geo_field,
    media_field,
    vue_field,
    toRawType,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const URLPattern    = /^(https?:\/\/[^\s]+)/g;
const PhotoPattern  = /[^\s]+.(png|jpg|jpeg|gif)$/g;
const FieldType     = {
  SIMPLE:    'simple',
  GEO:       'geo',
  LINK:      'link',
  PHOTO:     'photo',
  PHOTOLINK: 'photolink',
  IMAGE:     'image',
  POINTLINK: 'pointlink',
  ROUTE:     'route',
  VUE:       'vue',
};

/******************************************************* */

/**
 * ORIGINAL SOURCE: src/gui/fields/fieldsservice.js@3.8
 */
const fieldsservice = {

  /**
   * Get Type field from field value
   * 
   * @param field object containing the value of the field
   * 
   * @returns {string}
   */
  getType(field) {
    if ('vue' === field.type) {
      return `${field.type}_field`;
    }

    const GIVE_ME_A_NAME = field.value && 'Object' === toRawType(field.value) && !field.value.coordinates && !field.value.vue;

    const value = GIVE_ME_A_NAME
      ? field.value.value
      : field.value;

    const is_simple   = !value;
    const is_geo      = (value && typeof 'object' == value) && value.coordinates;
    const is_vue      = (value && typeof 'object' == value) && !value.coordinates && value.vue;
    const is_photo    = (value && Array.isArray(value)) && value.length && value[0].photo;
    const is_simple_2 = (value && Array.isArray(value)) && !(value.length && value[0].photo);
    const is_photo_2  = value && value.toString().toLowerCase().match(PhotoPattern);
    const is_link     = value && value.toString().match(URLPattern);

    if (is_simple)   return `${FieldType.SIMPLE}_field`;
    if (is_geo)      return `${FieldType.GEO}_field`;
    if (is_vue)      return `${FieldType.VUE}_field`;
    if (is_photo)    return `${FieldType.PHOTO}_field`;
    if (is_simple_2) return `${FieldType.SIMPLE}_field`;
    if (is_photo_2)  return `${FieldType.PHOTO}_field`;
    if (is_link)     return `${FieldType.LINK}_field`;

    return `${FieldType.SIMPLE}_field`;

  },

  isSimple(field) {
    return `${FieldType.SIMPLE}_field` === this.getType(field);
  },

  isLink(field) {
    return `${FieldType.LINK}_field` === this.getType(field);
  },

  isImage(field) {
    return `${FieldType.IMAGE}_field` === this.getType(field);
  },

  isPhoto(field) {
    return `${FieldType.PHOTO}_field` === this.getType(field);
  },

  isVue(field) {
    return `${FieldType.VUE}_field` === this.getType(field);
  },

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

  props: {

    /**
     * ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
     */
    state: {
      required: true
    },

    /**
     * ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
     */
    feature: {
      type: Object,
      default: {},
    },

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
    text_field,
    link_field,
    image_field,
    geo_field,
    media_field,
    vue_field,
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

  },

  methods: {

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    getType(field) {
      return this.getFieldService().getType(field);
    },

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
    getFieldType(field) {
      return this.getFieldService().getType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isSimple(field) {
      return this.getFieldService().isSimple(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isLink(field) {
      return this.getFieldService().isLink(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isImage(field) {
      return this.getFieldService().isImage(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isPhoto(field) {
      return this.getFieldService().isPhoto(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isVue(field) {
      return this.getFieldService().isVue(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    sanitizeFieldValue(value) {
      return (Array.isArray(value) && !value.length) ? '' : value;
    },

  },

  /**
   * ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
   */
  created() {
    if (this.__isField) {
      this.type = this.getType(this.state);
    }
  },

};

/**
 * BACKCOMP
 */
vm.components['simple_field'] = vm.components['text_field'];
vm.components['photo_field']  = vm.components['image_field'];
vm.components['g3w_link']     = vm.components['link_field']; // see: components/QueryResultsTableAttributeFieldValue.vue
vm.components['g3w_vue']      = vm.components['vue_field'];  // see: components/QueryResultsTableAttributeFieldValue.vue

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
</style>