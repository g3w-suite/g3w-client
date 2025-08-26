/**
 * @file
 * @since v3.7
 */
import { FieldsService } from 'components/g3w-fields';

export default {
  methods: {
    getFieldType(field) {
      return FieldsService.getType(field);
    },
    isSimple(field) {
      return FieldsService.isSimple(field);
    },
    isLink(field) {
      return FieldsService.isLink(field);
    },
    isImage(field) {
      return FieldsService.isImage(field);
    },
    isPhoto(field) {
      return FieldsService.isPhoto(field);
    },
    isVue(field) {
      return FieldsService.isVue(field);
    },
    sanitizeFieldValue(value) {
      return (Array.isArray(value) && !value.length) ? '' : value;
    }
  }
};