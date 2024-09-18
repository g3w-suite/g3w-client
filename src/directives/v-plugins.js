/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application';
import { watch, unwatch } from 'directives/utils';

const attr = 'g3w-v-plugins-id';

export default {
  bind(el) {
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.plugins,
        (plugins = []) => { el.classList.toggle('g3w-hide', 0 === plugins.length) }
      ]
    });
  },
  unbind: el => unwatch({ el, attr })
};