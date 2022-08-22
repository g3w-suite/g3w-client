export default {
  inserted(el, binding, vnode){
    const { templateResult, templateSelection, multiple=false, search=true, select2_value} = vnode.data.attrs || {};
    const selectDOMElement = $(el);
    selectDOMElement.select2({
      width: '100%',
      dropdownCssClass: 'skin-color',
      templateResult,
      templateSelection,
      minimumResultsForSearch: !search ? -1 : undefined
    });
    if (binding.value){
      selectDOMElement.on('select2:select', evt =>{
        const value = evt.params.data.id;
        if (multiple) {
          const alreadyinside = vnode.context[binding.value].filter(addedvalue => value === addedvalue);
          alreadyinside.length === 0 && vnode.context[binding.value].push(value);
        } else vnode.context[binding.value] = value;
      });
      if (multiple)
        selectDOMElement.on('select2:unselect', evt =>{
          const value = evt.params.data.id;
          vnode.context[binding.value] = vnode.context[binding.value].filter(addedvalue => value !== addedvalue);
        });
      if (select2_value) selectDOMElement.val(select2_value).trigger('change');
    }
  },
  unbind(el, binding, vnode){
    $(el).select2('destroy');
  }
};