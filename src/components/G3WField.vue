<!--
  @file
  @since 3.9.0

  @version 2.0 ADD SOURCE FROM: src/mixins/media.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldLink.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldMedia.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldText.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldVue.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/mixins/fields.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/Field.vue@3.8
  @version 1.0 ORIGINAL SOURCE: src/components/FieldG3W.vue@3.8
-->

<template>

  <!--
    Legacy QueryResultsTableAttributeFieldValue component

    @example <g3w-field _legacy="g3w-layer-attrs" />

    ORIGINAL SOURCE: src/components/QueryResultsTableAttributeFieldValue.vue@3.8

    @since 3.9.0
  -->
  <table v-if="__isLayerAttrs" class="feature_attributes">
    <tr v-for="attr in layer.attributes.filter(attr => attr.show)">
      <td class="attr-label">{{ attr.label }}</td>
      <td class="attr-value" :attribute="attr.name">
        <g3w-field
          v-bind  = "$attrs"
          :field  = "$attrs.getLayerField({ layer, feature, fieldName: attr.name })"
          _legacy = "g3w-query"
        />
      </td>
    </tr>
  </table>

  <!--
    Legacy QueryResultsTableAttributeFieldValue component

    @example <g3w-field _legacy="g3w-query" />

    ORIGINAL SOURCE: src/components/QueryResultsTableAttributeFieldValue.vue@3.8

    @since 3.9.0
  -->
  <span      v-else-if = "__isQuery && isSimple(field)"                     v-html="field.value"></span>
  <g3w-image v-else-if = "__isQuery && (isPhoto(field) || isImage(field))"  :value="field.value"/>

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

        <!--
          Legacy FieldVue component

          @example <g3w-field _legacy="g3w-vuefield" />

          ORIGINAL SOURCE: src/components/FieldVue.vue@3.8

          @since 3.9.0
        -->
        <div v-if="__isVueField || (__isQuery && isVue(field))">
          <component
            :feature = "feature"
            :value   = "undefined === field.value       ? null        : field.value"
            :is      = "(undefined === field.vueoptions ? {}          : field.vueoptions.component) || {}"
            v-html   = "__isVueField                    ? undefined   : field.value"
          />
        </div>

        <!--
          Legacy FieldLink component

          @example <g3w-field _legacy="g3w-linkfield" />

          ORIGINAL SOURCE: src/components/FieldLink.vue@3.8

          @since 3.9.0
        -->
        <button
          v-else-if = "__isLinkField || (__isQuery && isLink(field))"
          class     = "btn skin-button field_link"
          v-t       = "'info.link_button'"
          @click    = "() => window.open(
            (__isLinkField ? ((state.value && 'object' === typeof state.value) ? state.value.value : state.value) : (field.value)),
            '_blank'
          )"
        ></button>

        <!--
          Legacy FieldMedia component

          @example <g3w-field _legacy="g3w-mediafield" />

          ORIGINAL SOURCE: src/components/FieldMedia.vue@3.8

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
          Base FieldText component

          @example <g3w-field :state />

          ORIGINAL SOURCE: src/components/FieldText.vue@3.8

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

</template>

<script>
import CatalogLayersStoresRegistry from 'store/catalog-layers';

import image_field  from 'components/FieldImage.vue'
import geo_field    from 'components/FieldGeo.vue';

const { getFieldType, getMediaFieldType } = require('core/utils/utils');

Object
  .entries({
    CatalogLayersStoresRegistry,
    image_field,
    geo_field,
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
    }
  },

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
    image_field,
    geo_field,
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
     * Whether this is a Legacy QueryResultsTableAttributeFieldValue component
     * 
     * @example <g3w-field _legacy="g3w-table" />
     * 
     * @since 3.9.0
     */
     __isLayerAttrs() {
      return 'g3w-layer-attrs' === this._legacy;
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
    console.log(this);
    if (this._type) {                          // TODO: replace static `_type` calls with `getFieldType(field)` ?
      this.type = this._type;
    } else if (this.__isField && !this.type) {
      this.type = this.getType(this.state);
    }
  },

};

/**
 * BACKCOMP
 */
vm.components['text_field']   = vm;
vm.components['link_field']   = {
  functional: true,
  render(h, { data, children }) {
    return h(
      vm,
      {
        ...data,
        props: {
          ...data.props,
          _legacy: "g3w-linkfield",
        },
      },
      children
    );
  },
};
vm.components['media_field']   = {
  functional: true,
  render(h, { data, children }) {
    return h(
      vm,
      {
        ...data,
        props: {
          ...data.props,
          _legacy: "g3w-mediafield",
        },
      },
      children
    );
  },
};
vm.components['vue_field']    = {
  functional: true,
  render(h, { data, children }) {
    return h(
      vm,
      {
        ...data,
        props: {
          ...data.props,
          _legacy: "g3w-vuefield",
        },
      },
      children
    );
  },
};
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
</style>