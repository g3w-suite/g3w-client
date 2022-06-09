import template from './footer.html';
const FooterFormComponent = Vue.extend({
  template,
  props: {
    state: {
      type: Object
    },
    backToRoot: {
      type: Function,
      default: ()=>{}
    },
    isRootComponent:{
      type: Function
    }
  },
  data() {
    return {
      id:"footer",
      active: true,
      show: true
    }
  },
  methods: {
    exec(cbk) {
      cbk instanceof Function ? cbk(this.state.fields): (function() { return this.state.fields})();
    },
    btnEnabled(button) {
      const {enabled=true, type} = button;
      return enabled && (type !== 'save' ||  (type === 'save' && this.isValid()));
    },
    isValid() {
      return this.state.valid;
    },
    _enterEventHandler(evt) {
      if (evt.which === 13) {
        evt.preventDefault();
        const domEL = $(this.$el);
        if (domEL.is(':visible') && this.isValid() && this.active) domEL.find('button').click();
      }
    }
  },
  watch: {
    'state.component'(component){
      this.show = this.isRootComponent(component)
    }
  },
  activated(){
    this.active = true;
  },
  deactivated() {
    this.active = false;
  },
  async mounted() {
    await this.$nextTick();
    document.addEventListener('keydown', this._enterEventHandler);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this._enterEventHandler)
  }
});

export default  FooterFormComponent;
