/**
 * @file
 * @since v3.7
 */

import GUI   from 'services/gui';
import { t } from 'g3w-i18n';

const update = (el) => {
  const value  = t(el.__currentBinding.value ?? '');
  el.innerHTML = 'pre' === el.__currentBinding.arg ? `${value} ${el.__innerHTML}` : `${el.__innerHTML} ${value}`;
  // unlisten for "i18nReady" event
  if (!el.isConnected) {
    return true;
  }
}

export default {
  bind(el, binding) {
    el.__innerHTML      = el.innerHTML; // set init innerHTML value of element
    el.__currentBinding = binding;      // set current binging
    update(el);
    GUI.on('i18nReady', update.bind(null, el));
  },
  unbind: el => {
    update(el);
  }
}