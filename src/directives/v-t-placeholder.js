/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const { t, tPlugin } = require('core/i18n/i18n.service');

const attr = 'g3w-v-t-placeholder-id';

export default {
  bind(el, binding) {
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.language,
        () => { el.setAttribute('placeholder', ('plugin' === binding.arg ? tPlugin : t)(binding.value)); }
      ]
    });
  },
  unbind: el => unwatch({ el, attr })
}