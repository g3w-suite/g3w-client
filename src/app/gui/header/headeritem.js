import template from './headeritem.html';

const HeaderItemComponent = {
  props: ['state'],
  template,
  methods: {
    showCustomModal(id) {
      this.$emit('show-custom-modal-content', id);
    },
  },
  created() {
    this.state.type = this.state.type || 'link';
  },
};

export default HeaderItemComponent;
