/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const { t, tPlugin } = require('core/i18n/i18n.service');

const attr = 'g3w-v-t-title-id';

export default {
  bind(el, binding) {
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.language,
        () => {
          const title = ('plugin' === binding.arg ? tPlugin : t)(binding.value);
          el.setAttribute('title', title);
          el.setAttribute('data-original-title', title)
        }
      ] });
  },
  unbind: el => unwatch({ el, attr })
}