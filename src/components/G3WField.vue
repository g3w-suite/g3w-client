<!--
  @file
  @since 3.9.0

  @version 2.0 ADD SOURCE FROM: src/mixins/fields.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/Field.vue@3.8
  @version 1.0 ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
-->

<template>

  <!--
    Legacy QueryResultsTableAttributeFieldValue component

    @example <g3w-field _legacy="g3w-query" />

    ORIGINAL SOURCE: src/components/QueryResultsTableAttributeFieldValue.vue@3.8

    @since 3.9.0
  -->
  <g3w-vue   v-if     ="__isQuery && isVue(field)"                        :feature="feature" :state="field"/>
  <span      v-else-if="__isQuery && isSimple(field)"                     v-html="field.value"></span>
  <g3w-image v-else-if="__isQuery && (isPhoto(field) || isImage(field))"  :value="field.value"/>
  <g3w-link  v-else-if="__isQuery && isLink(field)"                       :state="{ value: field.value }"/>

  <!--
    Legacy FieldG3W component

    @example <g3w-field _legacy="g3w-field" />

    ORIGINAL SOURCE: src/components/G3WField.vue@3.8

    @since 3.7
  -->
  <component
    v-else-if = "__isField"
    :is       = "type"
    v-bind    = "$attrs"
  />

  <!--
    Like a "fieldsMixin" wrapper just for: `this.$parent`

    @example

      <g3w-field _legacy="mixin">
        <g3w-field id="field-1" :state="state" />
        <g3w-field id="field-2" :state="state" />
        ...
      </g3w-field>

    @since 3.9.0
  -->
  <div v-else-if="__isMixin">
    <slot></slot>
  </div>

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

    <div v-if="state.label" class="col-sm-6 field_label">
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

const { getFieldType } = require('core/utils/utils');

Object
  .entries({
    CatalogLayersStoresRegistry,
    text_field,
    link_field,
    image_field,
    geo_field,
    media_field,
    vue_field,
    getFieldType,
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
     * ORIGINAL SOURCE: src/components/QueryResultsTableAttributeFieldValue.vue@3.8
     */
    field: {
      type: Object,
       default: {},
    },

    /**
     * ORIGINAL SOURCE: src/components/Relation.vue@3.8
     */
    layer: {
      type: Object,
      default: undefined,
    },

    /**
     * ORIGINAL SOURCE: src/components/Relation.vue@3.8
     */
    config: {
      type: Object,
      default: undefined,
    },

    type: {
      type: String,
      default: '',
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

    /**
     * Whether this is a Legacy QueryResultsTableAttributeFieldValue component
     * 
     * @example <g3w-field _legacy="g3w-query" />
     * 
     * @since 3.9.0
     */
     __isQuery() {
      return 'g3w-query' === this._legacy;
    },

    /**
     * Whether this is a fieldsMixin wrapper
     * 
     * @example
     * 
     *  <g3w-field _legacy="mixin">
     *    <g3w-field id="input-1" :state="state" />
     *    <g3w-field id="input-2" :state="state" />
     *    ...
     *  </g3w-field>
     * 
     * @since 3.9.0
     */
     __isMixin() {
      return 'mixin' === this._legacy;
    },

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
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isVue(field) {
      return 'vue_field' === getFieldType(field);
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
    if (this.is) {
      this.type = this.is;
    } else if (this.__isField && !this.type) {
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
</style>