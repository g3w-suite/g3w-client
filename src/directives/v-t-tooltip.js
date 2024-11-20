/**
 * @file
 * @since v3.7
 */

import ApplicationState            from 'store/application';
import { watch, unwatch, trigger } from 'directives/utils';
import { t, tPlugin }              from 'g3w-i18n';

const attr = 'g3w-v-t-tooltip-id';

export default {
  bind(_el, binding) {
    // Automatically create tooltip
    if (binding.modifiers.create) {
      if (binding.arg) {
        _el.setAttribute('data-placement', binding.arg);
        _el.classList.add(`skin-tooltip-${binding.arg}`);
      }
      _el.setAttribute('data-container',"body");
      $(_el)
        .tooltip({ trigger : ApplicationState.ismobile ? 'click': 'hover', html: true })
        // hide tooltip on mobile after click
        .on('shown.bs.tooltip', () => { ApplicationState.ismobile && setTimeout(()=>$(_el).tooltip('hide'), 600) });
    }
    watch({
      el: _el,
      attr,
      watcher: [
        () => ApplicationState.language,
        ({el = _el}) => {
          let value = el.getAttribute('current-tooltip');
          if (null === value) { value = binding.value; }
          el.setAttribute('data-original-title', binding.modifiers.text ? value : ('plugin' === binding.arg ? tPlugin : t)(value));
        }
      ]
    });
  },
  componentUpdated(el, oldVnode) {
    const value = el.getAttribute('current-tooltip');
    //in case of null or empty value, need to hide tooltip
    if ([null, ''].includes(value)) {
      $(el).tooltip('hide');
    }
    if (null != value && value !== oldVnode.oldValue) {
      trigger({ el, attr, data: { el } });
    }
  },
  unbind: el => { $(el).tooltip('hide'); unwatch({ el, attr }); }
};