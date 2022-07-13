import { createCompiledTemplate } from 'gui/vue/utils';

const compiledTemplate = createCompiledTemplate(require('./header.html'));

const HeaderFormComponent = Vue.extend({
  ...compiledTemplate,
  props: {
    headers: {
      type: Array,
      default: [],
    },
    currentid: {
      type: String,
    },
  },
  methods: {
    click(id) {
      if (this.currentid !== id) { this.$emit('clickheader', id); }
    },
    resizeForm(perc) {
      this.$emit('resize-form', perc);
    },
  },
});

module.exports = HeaderFormComponent;
