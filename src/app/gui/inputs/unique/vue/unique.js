import { createCompiledTemplate } from 'gui/vue/utils';
const Input = require('gui/inputs/input');
const selectMixin = require('gui/inputs/select/vue/selectmixin');
const getUniqueDomId = require('core/utils/utils').getUniqueDomId;
const compiledTemplate = createCompiledTemplate(require('./unique.html'));

const UniqueInput = Vue.extend({
  mixins: [Input, selectMixin],
  ...compiledTemplate,
  data: function() {
    const id = `unique_${getUniqueDomId()}`;
    return {id}
  },
  watch: {
    async 'state.input.options.values'(values) {
      this.state.value = this.state.value ? this.state.value: null;
      this.state.value !== null && values.indexOf(this.state.value) === -1 && this.service.addValueToValues(this.state.value);
      await this.$nextTick();
      this.state.value && this.select2.val(this.state.value).trigger('change');
    }
  },
  async mounted() {
    await this.$nextTick()
    if (this.state.input.options.editable) {
      this.select2 = $(`#${this.id}`).select2({
        dropdownParent: $('#g3w-view-content'),
        tags: true,
        language: this.getLanguage()
      });
      this.select2.val(this.state.value).trigger('change');
      this.select2.on('select2:select', event => {
        const value = event.params.data.$value ? event.params.data.$value : event.params.data.id;
        this.changeSelect(value);
      })
    }
  }
});

module.exports = UniqueInput;
