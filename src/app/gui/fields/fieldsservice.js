const Fields = require('./fields');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const URLPattern = /^(https?:\/\/[^\s]+)/g;
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
   * field : Object contain the value of the field
   * @param field
   * @returns {string}
   */
  getType(field){
    const value = field && typeof field === 'object' && !field.coordinates && !field.vue ? field.value : field;
    if (!value) type = FieldType.SIMPLE;
    else if (value && typeof value == 'object') {
      if (value.coordinates) type = FieldType.GEO;
      else if (value.vue) type = FieldType.VUE;
    } else if(value && Array.isArray(value)) {
      if (value.length && value[0].photo) type = FieldType.PHOTO;
      else type = FieldType.SIMPLE
    } else if (value.toString().toLowerCase().match(PhotoPattern)) {
      type = FieldType.PHOTO;
    } else if (value.toString().match(URLPattern)) {
      type = FieldType.LINK;
    } else type = FieldType.SIMPLE;
    return `${type}_field`;
  },
  /**
   * Method to add a new field type to Fields
   * @param type
   * @param field
   */
  add({type, field}){
    Fields[type] = field;
  },
  /**
   * Remove field from Fields list
   * @param type
   */
  remove(type){
    delete Fields[type];
  },
  changeConfigFieldType({layerId, field={}}){
    const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
    layer.changeConfigFieldType(field);
  }
};