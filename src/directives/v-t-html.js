/**
 * @file
 * @since v3.7
 */

import GUI   from 'services/gui';
import { t } from 'g3w-i18n';

const update = (el, binding) => {
  if (binding && binding.value !== binding.oldValue) {
    el.innerHTML = `${t(binding.value)}`;
  }
  // unlisten for "i18nReady" event
  if (!el.isConnected) {
    return true;
  }
}

export default {
  bind(el, binding) {
    GUI.on('i18nReady', update.bind(null, el, binding));
  },
  update(el, binding) {
    update(el, binding);
  },
  unbind: el => {
    update(el);
  }
};