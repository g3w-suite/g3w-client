/**
 * @file
 * @since v3.7
 */

export default {
  inserted(el, binding, vnode){
    const {
      templateResult,
      templateSelection,
      multiple=false,
      search=true,
      select2_value,
      indexItem, /** @since 3.9.1 */
    } = vnode.data.attrs || {};
    const isArray = binding.value && Array.isArray(vnode.context[binding.value]); //check if is an array
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
          if (multiple && (
            (isArray
              ? vnode.context[binding.value][indexItem].value
              : vnode.context[binding.value]
            ).filter(d => value === d).length === 0)
          ) {
            (isArray
              ? vnode.context[binding.value][indexItem].value
              : vnode.context[binding.value]
            ).push(value);
          } else {
            if (isArray) {
              vnode.context[binding.value][indexItem].value = value;
            } else {
              vnode.context[binding.value] = value;
            }
          }
        }
      })
      .on('select2:unselect', (e) => {
        if (binding.value && multiple) {
          if (isArray) {
            vnode.context[binding.value][indexItem].value = vnode.context[binding.value][indexItem].value.filter(d => e.params.data.id !== d);
          } else {
            vnode.context[binding.value] = vnode.context[binding.value].filter(d => e.params.data.id !== d);
          }
        }
      });
      if (binding.value && select2_value) {
        $(el).val(select2_value).trigger('change');
      }
  },
  unbind: (el) => { $(el).select2('destroy'); }
};