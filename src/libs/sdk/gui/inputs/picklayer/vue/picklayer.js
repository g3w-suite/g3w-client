const Input = require('gui/inputs/input');
const Service = require('../service');


const PickLayerInput = Vue.extend({
  mixins: [Input],
  template: require('./picklayer.html'),
  methods: {
    pickLayer() {
      this.pickservice.pick().then((value) => {
        this.state.value = value;
      })
    },
    unpick() {
      setTimeout(() => {
        this.pickservice.unpick();
      }, 200)
    }
  },
  created() {
    this.pickservice = new Service(this.state.input.options)
  },
  beforeDestroy() {
    this.pickservice.clear();
    this.pickservice = null;
  }
});

module.exports = PickLayerInput;
