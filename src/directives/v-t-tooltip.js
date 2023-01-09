import ApplicationState from 'store/application-state';
import { watch, unwatch, trigger } from 'directives/utils';

const { t, tPlugin } = require('core/i18n/i18n.service');

const attr = 'g3w-v-t-tooltip-id';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(_el, binding) {
    // Automatically create tooltip
    if (binding.modifiers.create) {
      if (binding.arg) {
        _el.setAttribute('data-placement', binding.arg);
        _el.classList.add('skin-color', `skin-tooltip-${binding.arg}`);
      }
      $(_el)
        .tooltip({ trigger : ApplicationState.ismobile ? 'click': 'hover', html: true })
        // hide tooltip on mobile  after click
        .on('shown.bs.tooltip', () => { ApplicationState.ismobile && setTimeout(()=>$(_el).tooltip('hide'), 600) });
    }
    watch({
      el: _el,
      attr,
      watcher: [
        () => ApplicationState.lng,
        ({el = _el}) => {
          let value = el.getAttribute('current-tooltip');
          if (value === null) { value = binding.value; }
          el.setAttribute('data-original-title', binding.modifiers.text ? value : (binding.arg === 'plugin' ? tPlugin : t)(value));
        }
      ]
    });
  },
  componentUpdated(el, oldVnode) {
    const value = el.getAttribute('current-tooltip');
    if (value != null && value !== oldVnode.oldValue) {
      trigger({ el, attr, data: {el}});
    }
  },
  unbind: (el) => { $(el).tooltip('hide'); unwatch({ el, attr }); }
};