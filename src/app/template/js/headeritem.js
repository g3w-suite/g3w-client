const compiledTemplate = Vue.compile(require('../html/headeritem.html'));
const HeaderItemComponent = {
  props: ['state'],
  ...compiledTemplate,
  methods: {
    showCustomModal(id) {
      this.$emit('show-custom-modal-content', id)
    }
  },
  created() {
    this.state.type = this.state.type || 'link';
  }
};

module.exports = HeaderItemComponent;
