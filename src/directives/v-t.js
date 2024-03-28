/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const { t } = require('core/i18n/i18n.service');

const attr = 'g3w-v-t-id';

/**
 * @since 3.8.7
 */
const handleInnerHTML = ({el}) => {
  const value = el.__currentBinding.value !== null ? t(el.__currentBinding.value) : '';
  switch(el.__currentBinding.arg ? el.__currentBinding.arg : 'post') {
    case 'pre': el.innerHTML = `${value} ${el.__innerHTML}`; break;
    case 'post': el.innerHTML = `${el.__innerHTML} ${value}`; break;
  }
}

export default {
  bind(el, binding) {
    /**
     * @since 3.8.7
     */
    // set init innerHTML value of element
    el.__innerHTML = el.innerHTML;
    //set current binging
    el.__currentBinding = binding;
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.language,
        () => handleInnerHTML({
          el,
        })
      ]
    });
  },
  /**
   * @since 3.8.7
   */
  componentUpdated(el, binding) {
    //reset currentBinding to get last value;
    el.__currentBinding = binding;
    handleInnerHTML({
      el,
    })
  },

  unbind: (el) => unwatch({ el, attr })
}