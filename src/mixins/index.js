/**
 * @file
 * @since v3.7
 */

import autocompleteMixin from 'mixins/autocomplete';
import fieldsMixin       from 'mixins/fields';
import mediaMixin        from 'mixins/media';
import geoMixin          from 'mixins/geo';
import resizeMixin       from 'mixins/resize';
import selectMixin       from 'mixins/select';
import select2Mixin      from 'mixins/select2';
import formInputsMixins  from 'mixins/form-inputs';
import widgetMixins      from 'mixins/widget';
import metadataMixin     from 'mixins/metadata';

const mixins = {
  autocompleteMixin,
  fieldsMixin,
  mediaMixin,
  geoMixin,
  resizeMixin,
  selectMixin,
  select2Mixin,
  formInputsMixins,
  widgetMixins,
  metadataMixin,
};
export {fieldsMixin};
export {mediaMixin};
export {geoMixin};
export {resizeMixin};
export {selectMixin};
export {select2Mixin};
export {formInputsMixins};
export {widgetMixins};
export {metadataMixin};
export {autocompleteMixin};

export {mixins};
export default mixins;