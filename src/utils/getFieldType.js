import { toRawType } from 'utils/toRawType';

const URLPattern    = /^(https?:\/\/[^\s]+)/g;
const PhotoPattern  = /[^\s]+.(png|jpg|jpeg|gif)$/g;

/**
 * Get Type field from field value
 * 
 * ORIGINAL SOURCE: src/mixins/fields.js@3.8
 * 
 * @param field object containing the value of the field
 * 
 * @returns { 'vue_field' | 'geo_field' | 'photo_field' | 'link_field' | 'simple_field' }
 * 
 * @since 3.10.0
 */
export function getFieldType(field = {}) {

  const is_nested = (
    field.value &&
    'Object' === toRawType(field.value) &&
    !field.value.coordinates &&
    !field.value.vue
  );

  const value = is_nested ? field.value.value : field.value;
  const text  = (value || '').toString().toLowerCase();

  const is_geo      = 'Object' === toRawType(value) && value.coordinates;
  const is_vue      = 'vue' === field.type || ('Object' === toRawType(value) && !value.coordinates && value.vue);
  const is_photo    = (Array.isArray(value) && value.length && value[0].photo) || text.match(PhotoPattern);
  const is_link     = text.match(URLPattern);

  if (is_vue)   return 'vue_field';
  if (is_geo)   return 'geo_field';
  if (is_photo) return 'photo_field';
  if (is_link)  return 'link_field';

  return 'simple_field';

};