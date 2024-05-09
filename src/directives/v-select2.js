/**
 * @file
 * @since v3.7
 */

export default {
  inserted(el, binding, vnode){
    const {
      templateResult,
      templateSelection,
      multiple  = false,
      search    = true,
      select2_value,
      /** @since 3.9.1 */
      indexItem,
      /**@since 3.10.0 whether to dynamically create a new "<option>" value */
      createTag = false,
    } = vnode.data.attrs || {};
    const isArray = binding.value
      && Array.isArray(vnode.context[binding.value]) // check if is an array
      && undefined !== indexItem                     // check if indexItem is defined
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
      .on('select2:select', (e) => {
        if (!binding.value) { return; }
        //get value
        const value = e.params.data.id;
        const arr = (isArray ? vnode.context[binding.value][indexItem].value : vnode.context[binding.value]);
        // check is can have multiple value
        if (multiple && arr.every(d => value !== d)) {
          arr.push(value);
        } else if (isArray) {
          vnode.context[binding.value][indexItem].value = value;
        } else {
          // take in an account text binding value single world or object (eg. state.name)
          const attrs = `${binding.value}`.split('.');
          const last = attrs.pop();
          (attrs.reduce((acc, a) => { acc = acc[a]; return acc; }, vnode.context))[last] = value;
        }
        //dispatch change event as base select element change option
        el.dispatchEvent(new Event("change"))
      })
      .on('select2:unselect', (e) => {
        if (!binding.value || !multiple) { return; }
        if (isArray) {
          vnode.context[binding.value][indexItem].value = vnode.context[binding.value][indexItem].value.filter(d => e.params.data.id !== d);
        } else {
          vnode.context[binding.value] = vnode.context[binding.value].filter(d => e.params.data.id !== d);
        }
        //dispatch change event as base select element change option
        el.dispatchEvent(new Event("change"))
      });

      if (binding.value && undefined !== select2_value) {
        $(el).val(select2_value).trigger('change');
        /** @since v3.10.0 Need to listen eventually select2_value attribute changes to reflect select2 current value*/
        vnode.g3w_observer = new MutationObserver((mutations) => {
          mutations.find((mutation) => {
            if ("select2_value" === mutation.attributeName) {
              $(el).val(mutation.target.getAttribute("select2_value")).trigger('change');
              return true;
            }
          })
        });
        vnode.g3w_observer.observe(el, {attributes: true});
      }
  },
  unbind: (el, vnode) => { (vnode.g3w_observer && vnode.g3w_observer.disconnect()); $(el).select2('destroy'); }
};