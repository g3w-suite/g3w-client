/**
 * @file
 * @since v3.7
 */

import ApplicationState       from 'store/application';
import { watch, unwatch }     from 'directives/utils';
import { t, languageIsReady } from 'g3w-i18n';


const attr = 'g3w-v-t-html-id';

export default {
  bind(el, binding) {
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.language,
        async (lang) => { await languageIsReady(lang); el.innerHTML = `${t(binding.value)}`; }
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