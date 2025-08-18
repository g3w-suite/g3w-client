/**
 * @file
 * @since v3.7
 */

import GUI              from 'g3w-app';
import { gettext as _ } from 'g3w-i18n';

const update = (el, binding) => {
  let value = '';

  // v-t-plugin
  if ('t-plugin' === binding.name && null !== el.__currentBinding.value) {
    value = _(`plugins.${el.__currentBinding.value}`);
  }
  
  // v-t
  if ('t' === binding.name) {
    value = _(el.__currentBinding.value ?? '');
  }

  el.innerHTML = 'pre' === el.__currentBinding.arg ? `${value} ${el.__innerHTML}` : `${el.__innerHTML} ${value}`;

  // unlisten for "i18n-ready" event
  if (!el.isConnected) {
    return true;
  }
}

export default {
  bind(el, binding) {
    el.__innerHTML      = el.innerHTML; // set init innerHTML value of element
    el.__currentBinding = binding;      // set current binging
    update(el, binding);
    GUI.on('i18n-ready', update.bind(null, el, binding));
  },
  update(el, binding) {
    update(el, binding);
  }
};