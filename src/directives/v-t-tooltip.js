/**
 * @file
 * @since v3.7
 */

import ApplicationState from 'store/application';
import GUI              from 'services/gui';
import { t }            from 'g3w-i18n';

// show tooltip as "popover" (ie. always on top over other DOM elements) 
$(document).on('shown.bs.tooltip', function (e) {
  const tip = $(e.target).data('bs.tooltip').tip()[0];
  tip.popover = 'manual';
  tip.style.margin = tip.style.border = tip.style.background= 'unset';
  tip.showPopover();
});

const update = (el, binding) => {
  let value = el.getAttribute('current-tooltip') ?? binding.value;
  value = binding.modifiers.text ? value : t('plugin' === binding.arg ? `plugins.${value}` : value);
  if ([null, ''].includes(value)) {
    $(el).tooltip('hide');
  } else {
    el.setAttribute('data-original-title', value);
  }
  // unlisten for "i18nReady" event
  if (!el.isConnected) {
    return true;
  }
};

export default {
  bind(el, binding) {
    if (binding.arg) {
      el.setAttribute('data-placement', binding.arg);
      el.classList.add(`skin-tooltip-${binding.arg}`);
    }
    // Automatically create tooltip
    if (binding.modifiers.create) {
      el.setAttribute('data-container', "body");
      $(el)
        .tooltip({ trigger : ApplicationState.ismobile ? 'click': 'hover', html: true, })
        .on('shown.bs.tooltip', function() {
          // hide tooltip on mobile after click
          if (ApplicationState.ismobile) {
            setTimeout(()=>$(el).tooltip('hide'), 600)
          }
        });
    }
    GUI.on('i18nReady', update.bind(null, el, binding));
  },
  unbind: el => {
    $(el).tooltip('hide');
  }
};