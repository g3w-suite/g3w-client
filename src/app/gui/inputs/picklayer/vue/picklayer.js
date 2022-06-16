import Input from 'gui/inputs/input';
import Service from '../service';
import template from './picklayer.html';

const PickLayerInput = Vue.extend({
  mixins: [Input],
  template,
  methods: {
    pickLayer() {
      this.pickservice.pick()
        .then((value) => this.state.value = value).catch(() => {});
    },
    unpick() {
      setTimeout(() => !this.pickservice.isPicked() && this.pickservice.unpick(), 200);
    },
  },
  created() {
    this.pickservice = new Service(this.state.input.options);
  },
  beforeDestroy() {
    this.pickservice.clear();
    this.pickservice = null;
  },
});

export default PickLayerInput;
