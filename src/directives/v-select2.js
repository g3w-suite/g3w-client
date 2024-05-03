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
      indexItem, /** @since 3.9.1 */
      createTag = false, /**@since v3.10.0 used to create a new value option dynamically */
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
        minimumResultsForSearch: !search ? -1 : undefined,
        createTag(params) {
          const value = params.term.trim();
          if (!value) { return null; }
          return {
            id:     value,
            text:   value,
            newTag: true // add additional value
          }
        },
      })
      .on('select2:select', (e) => {
        if (binding.value) {
          //get value
          const value = e.params.data.id;
          //check is can have multiple value
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
              //take in an account text binding value single world or object (e.s state.name)
              const attrs = `${binding.value}`.split('.');
              const last = attrs.pop();
              (attrs.reduce((acc, a) => { acc = acc[a]; return acc; }, vnode.context))[last] = value;
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