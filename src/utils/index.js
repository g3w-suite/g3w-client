/**
 * @file ORIGINAL SOURCE: src/app/core/utils/utils.js@3.8
 * 
 * @since 3.9.0
 */

import { getUniqueDomId }                    from './getUniqueDomId';
import { mixin }                             from './mixin';
import { merge }                             from './merge';
import { hasOwn }                            from './hasOwn';
import { inherit }                           from './inherit';
import { base }                              from './base';
import { noop }                              from './noop';
import { resolve }                           from './resolve';
import { reject }                            from './reject';
import { Base64 }                            from './Base64';
import { toRawType }                         from './toRawType';
import { throttle }                          from './throttle';
import { debounce }                          from './debounce';
import { XHR }                               from './XHR';
import { createFilterFormInputs }            from './createFilterFormInputs';
import { colorHEXToRGB }                     from './colorHEXToRGB';
import { sameOrigin }                        from './sameOrigin';

const utils = {
  getUniqueDomId,
  uniqueId: getUniqueDomId,
  mixin,
  merge,
  hasOwn,
  inherit,
  base,
  noop,
  truefnc() { return true },
  resolve,
  reject,
  Base64,
  toRawType,
  throttle,
  debounce,
    XHR,
  createFilterFormInputs,
  colorHEXToRGB,
  /** @since 3.8.0 */
  sameOrigin,
};

module.exports = utils;
