import ApplicationState from 'core/applicationstate';
import { createDirectiveObj, unbindWatch, getDirective } from 'directives/utils';
const {t, tPlugin} = require('core/i18n/i18n.service');

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(_el, binding) {
    // handle automatic creation of tooltip
    if (binding.modifiers.create) {
      if (binding.arg){
        _el.setAttribute('data-placement', binding.arg);
        _el.classList.add(`skin-tooltip-${binding.arg}`);
        _el.classList.add('skin-color');
      }
      const domelement = $(_el);
      domelement.tooltip({
        trigger : ApplicationState.ismobile ? 'click': 'hover',
        html: true
      });
      // in case of mobile hide tooltip after click
      ApplicationState.ismobile && domelement.on('shown.bs.tooltip', function(){
        setTimeout(()=>$(this).tooltip('hide'), 600);
      });
    }
    const handler = ({el=_el}={}) =>{
      const current_tooltip = el.getAttribute('current-tooltip');
      const value = current_tooltip !== null ? current_tooltip:  binding.value;
      const dir = getDirective(el.getAttribute('g3w-v-t-tooltip-id'));
      if (dir) {
        const title = dir.modifiers.text  ? value : (binding.arg === 'plugin' ? tPlugin : t)(value);
        el.setAttribute('data-original-title', title);
      }
    };
    handler();
    createDirectiveObj({
      el:_el,
      attr: 'g3w-v-t-tooltip-id',
      modifiers: binding.modifiers,
      handler: handler,
      watcher: [() => ApplicationState.lng, handler]
    });
  },
  componentUpdated(el, oldVnode) {
    const attr_value = el.getAttribute('current-tooltip');
    if (attr_value != null && attr_value !== oldVnode.oldValue) {
      getDirective(el.getAttribute('g3w-v-t-tooltip-id')).handler({el});
    }
  },
  unbind: (el) => { $(el).tooltip('hide'); unbindWatch({ attr:'g3w-v-t-tooltip-id', el }) }
};