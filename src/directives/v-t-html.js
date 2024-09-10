/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const { t } = require('g3w-i18n');

const attr = 'g3w-v-t-html-id';

export default {
  bind(el, binding) {
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.language,
        () => { el.innerHTML = `${t(binding.value)}`; }
      ]
    });
  },
  update(el, binding) {
    if (binding.value !== binding.oldValue) {
      el.innerHTML = `${t(binding.value)}`;
    }
  },
  unbind: el => unwatch({ el, attr })
};