/**
 * ORIGINAL SOURCE: src/app/gui/vue/directives/v-select2.js@v3.6
 */
export default {
  inserted(el, binding, vnode){
    const {
      templateResult,
      templateSelection,
      multiple=false,
      search=true,
      select2_value
    } = vnode.data.attrs || {};
    $(el)
      .select2({
        width: '100%',
        dropdownCssClass: 'skin-color',
        templateResult,
        templateSelection,
        minimumResultsForSearch: !search ? -1 : undefined
      })
      .on('select2:select', (e) => {
        if (binding.value) {
          const value = e.params.data.id;
          if (multiple && vnode.context[binding.value].filter(d => value === d).length === 0) {
            vnode.context[binding.value].push(value);
          } else {
            vnode.context[binding.value] = value;
          }
        }
      })
      .on('select2:unselect', (e) => {
        if (binding.value && multiple) {
          vnode.context[binding.value] = vnode.context[binding.value].filter(d => e.params.data.id !== d);
        }
      });

      if (binding.value && select2_value) {
        $(el).val(select2_value).trigger('change');
      }
  },
  unbind: (el) => { $(el).select2('destroy'); }
};