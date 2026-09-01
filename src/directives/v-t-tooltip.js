/**
 * @file
 * @since v3.7
 */

import GUI              from 'g3w-app';
import { gettext as _ } from 'g3w-i18n';

// show tooltip as "popover" (ie. always on top over other DOM elements) 
$(document).on('shown.bs.tooltip', function (e) {
  console.warn('[G3W-CLIENT] $.fn.tooltip is deprecated');
  const tip = $(e.target).data('bs.tooltip').tip()[0];
  tip.popover = 'manual';
  tip.style.margin = tip.style.border = tip.style.background= 'unset';
  tip.showPopover();
  // hide tooltip on mobile after click
  if (GUI.isMobile()) {
    setTimeout(() => $(e.target).tooltip('hide'), 600);
  }
});

document.head.insertAdjacentHTML('beforeend', `<style>
  #tooltip {
    margin: unset;
    inset: unset;
    font-weight: 700;
    color: #fff;
    background-color: #222;
    border: none;
    border-radius: 4px;
    padding: 5px;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 12.5px;
    opacity: 0.9;
    padding: 8px;
    overflow: visible;
  }
  #tooltip[data-placement]:after {
    content: '';
    position: absolute;
    border-color: transparent;
    border-style: solid;
  }
  #tooltip[data-placement="left"]:after {
    top: 50%;
    right: -8px;
    margin-top: -5px;
    border-left-color: #000;
    border-width: 4px;
  }
  #tooltip[data-placement="top"]:after {
    left: 50%;
    bottom: -6px;
    margin-left: -5px;
    border-top-color: #000;
    border-width: 5px 5px 0;
  }
  #tooltip[data-placement="right"]:after {
    top: 50%;
    left: -6px;
    margin-top: -5px;
    border-right-color: #000;
    border-width: 5px 5px 5px 0;
  }
  #tooltip[data-placement="bottom"]:after {
    left: 50%;
    top: -5px;
    margin-left: -5px;
    border-bottom-color: #000;
    border-width: 0 5px 5px;
  }
</style>`);

const tooltip = Object.assign(document.createElement('template'), {
  innerHTML: /* html */`
    <div popover="manual" id="tooltip"></div>
  `.trim()
}).content.firstChild;

document.querySelector('#app').insertAdjacentElement('afterend', tooltip);
document.addEventListener('mousemove', showTooltip);
document.addEventListener('mousedown', showTooltip);
document.addEventListener('mouseover', showTooltip);
document.addEventListener('focusin',   showTooltip);
document.addEventListener('focusout', () => tooltip.hidePopover());

function showTooltip(e) {
  const element = ('focusin' === e.type ? e.target : document.elementFromPoint(e.clientX, e.clientY))?.closest('[data-i18n-title], [title]');
  const title   = element?.getAttribute('data-i18n-title') ?? element?.getAttribute('title');

  if (!element || !title || element?.closest('.select2')) {
    tooltip.hidePopover();
    return;
  }

  tooltip.addEventListener('toggle',e => {
    if (e.newState === "closed") {
      element.removeAttribute('aria-describedby');
    }
  }, { once: true });

  element.removeAttribute('title');
  element.setAttribute('aria-describedby', "tooltip");
  element.setAttribute('data-i18n-title', title);

  let value = element.getAttribute('current-tooltip') ?? title;
  value = element.hasAttribute('data-i18n-raw') ? value : _(element.hasAttribute('data-i18n-plugin') ? `plugins.${value}` : value);

  tooltip.innerHTML = value;
  tooltip.showPopover();


  let position = element.getAttribute('data-placement') || 'left';

  const rect = element.getBoundingClientRect();
  const pad = 4;
  let left, top, attempts = 0;

  do {
    if ('top' === position) {
      top  = (rect.top + window.scrollY - tooltip.clientHeight - pad);
      left = (rect.left + window.scrollX + (rect.width / 2) - (tooltip.clientWidth / 2));
    }
    if ('bottom' === position) {
      top  = (rect.bottom + window.scrollY + pad);
      left = (rect.left + window.scrollX + (rect.width / 2) - (tooltip.clientWidth / 2));
    }
    if ('left' === position) {
      top  = (rect.top + window.scrollY + (rect.height / 2) - (tooltip.clientHeight / 2));
      left = (rect.left + window.scrollX - tooltip.clientWidth - pad);
    }
    if ('right' === position) {
      top  = (rect.top + window.scrollY + (rect.height / 2) - (tooltip.clientHeight / 2));
      left = (rect.right + window.scrollX + pad);
    }
    if (top < 0) {
      position = 'bottom';
    }
    if (top > window.innerHeight) {
      position = 'top';
    }
    if (left > window.innerWidth) {
      position = 'left';
    }
    if (left < 0) {
      position = 'right';
    }
    attempts++;
  } while (attempts < 10 && (left < 0 || top < 0 || top > window.innerHeight || left > window.innerWidth));

  tooltip.setAttribute('data-placement', position);

  Object.assign(tooltip.style, { top: top + 'px', left: left + 'px' });

  // hide tooltip on mobile after click
  if (GUI.isMobile()) {
    setTimeout(() => tooltip.hidePopover(), 600);
  }
}

export default function(el, binding) {
  if (binding.arg) {
    el.setAttribute('data-placement', binding.arg);
  }
  if ([null, '', undefined].includes(binding.value)) {
    el.removeAttribute('data-i18n-title');
  } else {
    el.setAttribute('data-i18n-title', binding.value);
  }
  if (binding.modifiers.text) {
    el.setAttribute('data-i18n-raw', '');
  }
  if ('plugin' === binding.arg) {
    el.setAttribute('data-i18n-plugin', '');
  }
};