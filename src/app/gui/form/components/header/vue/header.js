import template from './header.html';

const HeaderFormComponent = Vue.extend({
  template,
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
      if (this.currentid !== id) this.$emit('clickheader', id);
    },
    resizeForm(perc) {
      this.$emit('resize-form', perc);
    },
  },
});

export default HeaderFormComponent;
