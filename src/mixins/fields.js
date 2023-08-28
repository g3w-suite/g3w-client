/**
 * @file
 * @since v3.7
 */
import CatalogLayersStoresRegistry from 'store/catalog-layers';

import text_field   from 'components/FieldText.vue';
import link_field   from 'components/FieldLink.vue';
import image_field  from 'components/FieldImage.vue'
import geo_field    from 'components/FieldGeo.vue';
import media_field  from 'components/FieldMedia.vue';
import vue_field    from 'components/FieldVue.vue';

const { toRawType } = require('core/utils/utils');

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
 * ORIGINAL SOURCE: src/gui/fields/fields.js@3.8
 */
const Fields = {
  text_field,
  link_field,
  image_field,
  geo_field,
  media_field,
  vue_field,
};

/**
 * BACKCOMP
 */
Fields['simple_field'] = Fields['text_field'];
Fields['photo_field']  = Fields['image_field'];

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
    Fields[type] = field;
  },

  /**
   * Remove field from Fields list
   * 
   * @param type
   */
  remove(type) {
    delete Fields[type];
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

  /**
   * @since 3.9.0
   */
  getFields() {
    return Fields;
  },

};

/******************************************************* */

export default {

  methods: {

    getFieldService() {
      // if (undefined === this._fieldsService) {
      //   this._fieldsService = fieldsservice;
      // }
      // return this._fieldsService;
      return fieldsservice;
    },

    getFieldType(field) {
      return this.getFieldService().getType(field);
    },

    isSimple(field) {
      return this.getFieldService().isSimple(field);
    },

    isLink(field) {
      return this.getFieldService().isLink(field);
    },

    isImage(field) {
      return this.getFieldService().isImage(field);
    },

    isPhoto(field) {
      return this.getFieldService().isPhoto(field);
    },

    isVue(field) {
      return this.getFieldService().isVue(field);
    },

    sanitizeFieldValue(value) {
      return (Array.isArray(value) && !value.length) ? '' : value;
    },

  },

};