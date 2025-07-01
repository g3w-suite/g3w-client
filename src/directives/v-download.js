/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application';
import { getUniqueDomId } from 'utils/getUniqueDomId';

/** internal state */
const directives = {};

export default {
  bind(el, binding) {
    if (false !== binding.value) {
      const id = getUniqueDomId();
      el.setAttribute('g3w-v-download-id', id);
      Object.assign(directives, {
        [id]: {
          unwatch: Vue.watch(
            () => ApplicationState.download, bool => {
              const className = binding.modifiers && binding.modifiers.show && 'hide' || 'disabled';
              el.classList.toggle(`g3w-${className}`, 'hide' === className ? !bool : bool)
            },
            { immediate: true }
          ),
        }
      });
    }
  },
  unbind: el => {
    const id = el.getAttribute('g3w-v-download-id');
    if (id) {
      directives[id].unwatch();
      delete directives[id];
    }
  }
};