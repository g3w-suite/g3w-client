import { createCompiledTemplate } from 'gui/vue/utils';
import Input  from 'gui/inputs/input';
import selectMixin  from 'gui/inputs/select/vue/selectmixin';
import utils  from 'core/utils/utils';
import template from './unique.html';

const UniqueInput = Vue.extend({
  mixins: [Input, selectMixin],
  template,
  data() {
    const id = `unique_${utils.getUniqueDomId()}`;
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
    await this.$nextTick();
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

export default  UniqueInput;
