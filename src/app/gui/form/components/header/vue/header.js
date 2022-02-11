import { createCompiledTemplate } from 'gui/vue/utils';
const compiledTemplate = createCompiledTemplate(require('./header.html'));
const HeaderFormComponent = Vue.extend({
  ...compiledTemplate,
  props: {
    headers: {
      type: Array,
      default:[]
    },
    currentindex: {
      type: Number,
      default:0
    }
  },
  methods: {
    click(index) {
      if (this.currentindex !== index)
        this.$emit('clickheader', index);
    },
    resizeForm(perc){
      this.$emit('resize-form', perc);
    }
  }
});

module.exports = HeaderFormComponent;
