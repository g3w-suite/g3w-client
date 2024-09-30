import { toRawType } from 'utils/toRawType';

import Text          from 'components/FieldText.vue';
import Link          from 'components/FieldLink.vue';
import Image         from 'components/FieldImage.vue'
import Geo           from 'components/FieldGeo.vue';
import Media         from 'components/FieldMedia.vue';
import VueField      from 'components/FieldVue.vue';

export const Fields = {
  simple_field: Text,
  text_field:   Text,
  link_field:   Link,
  image_field:  Image,
  geo_field:    Geo,
  photo_field:  Image,
  media_field:  Media,
  vue_field:    VueField
};

export const fieldsService = {
  /**
   * Get Type field from field value
   * field: Object contains the value of the field
   * @param field
   * @returns {string}
   */
  getType(field) {
    let type = field.type;
    if ('vue' !== type) {
      const fieldValue = field.value;
      const value = fieldValue && 'Object' === toRawType(fieldValue) && !fieldValue.coordinates && !fieldValue.vue ? fieldValue.value : fieldValue;
      if (!value) {
        type = 'simple';
      } else if (value && 'object' === typeof value) {
        if (value.coordinates) {
          type = 'geo';
        } else if (value.vue) {
          type = 'vue';
        }
      } else if (value && Array.isArray(value)) {
        if (value.length && value[0].photo) {
          type = 'photo';
        } else {
          type = 'simple'
        }
      } else if (value.toString().toLowerCase().match(/[^\s]+.(png|jpg|jpeg|gif)$/g)) {
        type = 'photo';
      } else if (value.toString().match(/^(https?:\/\/[^\s]+)/g)) {
        type = 'link';
      } else {
        type = 'simple';
      }
    }
    return `${type}_field`;
  },
  isSimple(field) {
    return 'simple_field' === this.getType(field);
  },
  isLink(field) {
    return 'link_field' === this.getType(field);
  },
  isImage(field) {
    return 'image_field' === this.getType(field);
  },
  isPhoto(field) {
    return 'photo_field' === this.getType(field);
  },
  isVue(field) {
    return 'vue_field' === this.getType(field);
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
};

export default {
  Fields,
  fieldsService,
}