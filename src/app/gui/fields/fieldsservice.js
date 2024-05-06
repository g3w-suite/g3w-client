import CatalogLayersStoresRegistry from 'store/catalog-layers';

const Fields        = require('./fields');
const { toRawType } = require('utils');

const URLPattern   = /^(https?:\/\/[^\s]+)/g;
const PhotoPattern = /[^\s]+.(png|jpg|jpeg|gif)$/g;

const FieldType = {
  SIMPLE:'simple',
  GEO:'geo',
  LINK:'link',
  PHOTO: 'photo',
  PHOTOLINK: "photolink",
  IMAGE:'image',
  POINTLINK:'pointlink',
  ROUTE: 'route',
  VUE: 'vue'
};

module.exports  = {
  /**
   * Get Type field from field value
   * field: Object contains the value of the field
   * @param field
   * @returns {string}
   */
  getType(field) {
    let type = field.type;
    if (type !== 'vue'){
      const fieldValue = field.value;
      const value = fieldValue && toRawType(fieldValue) === 'Object' && !fieldValue.coordinates && !fieldValue.vue ? fieldValue.value : fieldValue;
      if (!value) {
        type = FieldType.SIMPLE;
      } else if (value && typeof value == 'object') {
        if (value.coordinates) {
          type = FieldType.GEO;
        } else if (value.vue) {
          type = FieldType.VUE;
        }
      } else if (value && Array.isArray(value)) {
        if (value.length && value[0].photo) {
          type = FieldType.PHOTO;
        } else {
          type = FieldType.SIMPLE
        }
      } else if (value.toString().toLowerCase().match(PhotoPattern)) {
        type = FieldType.PHOTO;
      } else if (value.toString().match(URLPattern)) {
        type = FieldType.LINK;
      } else {
        type = FieldType.SIMPLE;
      }
    }
    return `${type}_field`;
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
   * Method to add a new field type to Fields
   * @param type
   * @param field
   */
  add({type, field}) {
    Fields[type] = field;
  },
  /**
   * Remove field from a Fields list
   * @param type
   */
  remove(type) {
    delete Fields[type];
  },
  /**
   * change type of field (example to set vue type)
   * @param layerId
   * @param field
   */
  changeConfigFieldType({layerId, field={}}) {
    CatalogLayersStoresRegistry.getLayerById(layerId).changeConfigFieldType(field);
  },
  /**
   * Reset origin type
   * @param layerId
   * @param field
   */
  resetConfigFieldType({layerId, field={}}) {
    CatalogLayersStoresRegistry.getLayerById(layerId).resetConfigField(field);
  }
};