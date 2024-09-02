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
import { noop }                              from './noop';
import { resolve }                           from './resolve';
import { reject }                            from './reject';
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

const utils = {
  getUniqueDomId,
  uniqueId: getUniqueDomId,
  basemixin,
  mixin,
  merge,
  hasOwn,
  inherit,
  base,
  noop,
  truefnc() { return true },
  /** @FIXME broken implementation, maybe unused? */
  falsefnc() { return true }, 
  resolve,
  reject,
  /** @TODO remove if unused */
  getValueFromG3WObjectEvent() { },
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
