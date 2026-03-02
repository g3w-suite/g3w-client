/**
 * @file
 * @since v3.7
 */

import GUI from 'g3w-app';

// show select2 dropdowns as "popover" (ie. always on top over other DOM elements) 
$(document).on('select2:open', function(e) {
  const dropdown = document.querySelector('.select2-container--open .select2-dropdown');
  dropdown.popover = true;
  dropdown.parentElement.style.anchorName = '--select2-dropdown-open';
  dropdown.style.margin = dropdown.style.inset = 'unset';
  dropdown.style.top = 'anchor(--select2-dropdown-open bottom)';
  dropdown.style.left = 'anchor(--select2-dropdown-open left)';
  dropdown.showPopover();
});

export default {
  inserted(el, binding, vnode) {
    const {
      templateResult,
      templateSelection,
      multiple  = false,
      search    = true,
      /** @since 3.10.0 listen `select2_value` attribute changes to reflect select2 current value */
      select2_value,
      /** @since 3.9.1 */
      indexItem,
      /**@since 3.10.0 whether to dynamically create a new "<option>" value */
      createTag = false,
      /** @since 3.11.0 */
      dropdownAutoWidth = false,
      /** @since 3.11.0 whether to create dropdown to immediate parent of "<select>" element */
      dropdownParent = false,
      /* @since 3.11.0 Placeholder */
      placeholder = '',
      /** @since 3.11.0*/
      clear = false,

    } = vnode.data.attrs || {};
    const isArray = binding.value
      && Array.isArray(vnode.context[binding.value]) // check if is an array
      && undefined !== indexItem                     // check if indexItem is defined
    //Need in case of change
    const createSelect2 = () => {
      $(el)
        .select2({
          tags:             createTag,
          width:            '100%',
          dropdownAutoWidth,
          dropdownParent: true === dropdownParent ? $(el.parentNode) : undefined,
          templateResult,
          templateSelection,
          minimumResultsForSearch: search ? undefined : -1,
          placeholder,
          allowClear: clear,
          createTag(params) {
            const value = params.term.trim();
            return value ? {
              id:     value,
              text:   value,
              newTag: true // add additional value
            } : null;
          },
        })
        .on('select2:select select2:unselect', e => {
          if (!binding.value) {
            return;
          }

          const value    = binding.value;
          const selected = 'select2:select' === e.type;
          const id       = e.params.data.id;
          const ctx      = vnode.context;
          const arr      = selected && (isArray ? ctx[value][indexItem].value : ctx[value]);

          // selected
          // check is can have multiple value
          if (selected && multiple && arr.every(d => id !== d)) {
            arr.push(id);
          } else if (selected && isArray) {
            ctx[value][indexItem].value = id;
          } else if (selected) {
            // take in an account text binding value single world or object (eg. state.name)
            const attrs = `${value}`.split('.');
            const last = attrs.pop();
            (attrs.reduce((acc, a) => { acc = acc[a]; return acc; }, vnode.context))[last] = id;
          }

          // unselected
          if (!selected && multiple && isArray) {
            ctx[value][indexItem].value = ctx[value][indexItem].value.filter(d => id !== d);
          } else if(!selected && multiple) {
            ctx[value] = ctx[value].filter(d => id !== d);
          }

          // dispatch "change" event to native <select> element
          if (selected || multiple) {
            el.dispatchEvent(new Event("change"));
          }

        });
    }

    createSelect2();

    // listen `select2_value` attribute changes to reflect select2 current value
    if (binding.value && undefined !== select2_value) {
      $(el).val(select2_value).trigger('change');
      vnode.g3w_observer = new MutationObserver(mutations => {
        const target = (mutations.find(m => "select2_value" === m.attributeName) || {}).target
        if (target) {
          $(el).val(target.getAttribute("select2_value")).trigger('change');
        }
      });
      vnode.g3w_observer.observe(el, {attributes: true});
    }

    GUI.on('i18n-ready', () => {
      // unlisten for "i18n-ready" event
      if (!el.isConnected) {
        return true;
      }
      createSelect2();
    });
  },
  unbind: (el, vnode) => {
    if (vnode.g3w_observer) {
      vnode.g3w_observer.disconnect();
    }
    $(el).select2('destroy');
  }
};