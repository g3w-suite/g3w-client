/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const attr = 'g3w-v-select2-id';

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
            dropdownCssClass: 'skin-color',
            templateResult,
            templateSelection,
            minimumResultsForSearch: search ? undefined : -1,
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

          // selected
          /** @TODO reduce nesting level */
          if (selected) {
            const arr = (isArray ? ctx[value][indexItem].value : ctx[value]);
            // check is can have multiple value
            if (multiple && arr.every(d => id !== d)) {
              arr.push(id);
            } else if (isArray) {
              ctx[value][indexItem].value = id;
            } else {
              // take in an account text binding value single world or object (eg. state.name)
              const attrs = `${value}`.split('.');
              const last = attrs.pop();
              (attrs.reduce((acc, a) => { acc = acc[a]; return acc; }, vnode.context))[last] = id;
            }
          }

          // unselected
          /** @TODO reduce nesting level */
          if (!selected && multiple) {
            if (isArray) {
              ctx[value][indexItem].value = ctx[value][indexItem].value.filter(d => id !== d);
            } else {
              ctx[value] = ctx[value].filter(d => id !== d);
            }
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
    //@since 3.11.0
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.language,
        () => createSelect2()
      ]
    });
  },
  unbind: (el, vnode) => {
    if (vnode.g3w_observer) {
      vnode.g3w_observer.disconnect();
    }
    $(el).select2('destroy');
    unwatch({ el, attr });
  }
};