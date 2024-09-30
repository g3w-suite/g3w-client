/**
 * @file
 * @since v3.7
 */

import { fieldsService } from 'g3w-field';

export default {
  methods: {
    getFieldService() {
      if (undefined === this._fieldsService) {
        this._fieldsService = fieldsService;
      }
      return this._fieldsService;
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
    }
  }
};