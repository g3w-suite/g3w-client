/**
 * @file ORIGINAL SOURCE: src/app/core/utils/utils.js@3.8
 * 
 * @since 3.9.0
 */

import { getUniqueDomId }                    from './getUniqueDomId';
import { basemixin }                         from './basemixin';
import { mixin }                             from './mixin';
import { merge }                             from './merge';
import { hasOwn }                            from './hasOwn';
import { inherit }                           from './inherit';
import { base }                              from './base';
import { resolve }                           from './resolve';
import { reject }                            from './reject';
import { getAjaxResponses }                  from './getAjaxResponses';
import { trimValue }                         from './trimValue';
import { isURL }                             from './isURL';
import { sanitizeUrl }                       from './sanitizeUrl';
import { convertObjectToUrlParams }          from './convertObjectToUrlParams';
import { appendParams }                      from './appendParams';
import { imageToDataURL }                    from './imageToDataURL';
import { capitalize_first_letter }           from './capitalize_first_letter';
import { Base64 }                            from './Base64';
import { toRawType }                         from './toRawType';
import { isEmptyObject }                     from './isEmptyObject';
import { throttle }                          from './throttle';
import { debounce }                          from './debounce';
import { getRandomColor }                    from './getRandomColor';
import { copyUrl }                           from './copyUrl';
import { downloadFile }                      from './downloadFile';
import { downloadCSVLayerFeatures }          from './downloadCSVLayerFeatures';
import { downloadCSV }                       from './downloadCSV';
import { getTimeoutPromise }                 from './getTimeoutPromise';
import { XHR }                               from './XHR';
import { createSingleFieldParameter }        from './createSingleFieldParameter';
import { createFilterFormInputs }            from './createFilterFormInputs';
import { createFilterFromString }            from './createFilterFromString';
import { createFilterFormField }             from './createFilterFormField';
import { splitContextAndMethod }             from './splitContextAndMethod';
import { colorHEXToRGB }                     from './colorHEXToRGB';
import { convertQGISDateTimeFormatToMoment } from './convertQGISDateTimeFormatToMoment';
import { sortAlphabeticallyArray }           from './sortAlphabeticallyArray';
import { sortNumericArray }                  from './sortNumericArray';
import { sameOrigin }                        from './sameOrigin';

/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment.
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number} The adjusted value.
 */
function decimalAdjust(type, value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) return Math[type](value);
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

// Decimal round
if (!Math.round10) {
  /** @TODO deprecate (unusued code + bad practice) */
  Math.round10 = function(value, exp) {
    return decimalAdjust('round', value, exp);
  };
}
// Decimal floor
if (!Math.floor10) {
  /** @TODO deprecate (unusued code + bad practice) */
  Math.floor10 = function(value, exp) {
    return decimalAdjust('floor', value, exp);
  };
}

// Decimal ceil
if (!Math.ceil10) {
  /** @TODO deprecate (unusued code + bad practice) */
  Math.ceil10 = function(value, exp) {
    return decimalAdjust('ceil', value, exp);
  };
}

/** @TODO deprecate (unusued code + bad practice) */
String.prototype.hashCode = function() {
  let hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

const utils = {
  getUniqueDomId,
  uniqueId: getUniqueDomId,
  basemixin,
  mixin,
  merge,
  hasOwn,
  inherit,
  base,
  noop() {},
  truefnc() { return true },
  /** @FIXME broken implementation, maybe unusued? */
  falsefnc() { return true }, 
  resolve,
  reject,
  /** @TODO remove if unusued */
  getValueFromG3WObjectEvent() { },
  getAjaxResponses,
  trimValue,
  isURL,
  sanitizeUrl,
  convertObjectToUrlParams,
  appendParams,
  imageToDataURL,
  capitalize_first_letter,
  Base64,
  toRawType,
  isEmptyObject,
  throttle,
  debounce,
  getRandomColor,
  copyUrl,
  downloadFile,
  downloadCSVLayerFeatures,
  downloadCSV,
  getTimeoutPromise,
  XHR,
  /** @since 3.8.7 */
  createSingleFieldParameter,
  createFilterFromString,
  createFilterFormInputs,
  createFilterFormField,
  splitContextAndMethod,
  colorHEXToRGB,
  convertQGISDateTimeFormatToMoment,
  /** @since 3.8.0 */
  sortAlphabeticallyArray,
  /** @since 3.8.0 */
  sortNumericArray,
  /** @since 3.8.0 */
  sameOrigin,
};

module.exports = utils;
