/**
 * @file
 * @since v3.7
 */

export default {
  methods: {
    getFieldService() {
      if (undefined === this._fieldsService) {
        this._fieldsService = require('gui/fields/fieldsservice');
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