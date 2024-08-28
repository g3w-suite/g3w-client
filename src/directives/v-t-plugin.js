/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const { tPlugin } = require('core/i18n/i18n.service');

const attr = 'g3w-v-t-plugin-id';

export default {
  bind(el, binding) {
    const innerHTML = el.innerHTML;
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.language,
        () => {
          const value = null !== binding.value ? tPlugin(binding.value) : '';
          switch(binding.arg ? binding.arg : 'post') {
            case 'pre':  el.innerHTML = `${value} ${innerHTML}`; break;
            case 'post': el.innerHTML = `${innerHTML} ${value}`; break;
          }
        }
      ]
    });
  },
  unbind: el => unwatch({ el, attr })
};