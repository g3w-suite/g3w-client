const { getUniqueDomId } = require('core/utils/utils');
const Input = require('gui/inputs/input');

const FloatInput = Vue.extend({
  mixins: [Input],
  template: require('./lonlat.html'),
  data(){
    return {
      lonId: getUniqueDomId(),
      latId: getUniqueDomId()
    }
  },
  methods: {
    changeLon(){
      this.change();
      this.setValue();
    },
    changeLat(){
      this.change();
      this.setValue();
    },
    setValue(){
      this.state.value = [[1*this.state.values.lon, 1*this.state.values.lat]]
    }
  },
  created(){
    this.state.values = this.state.values || {lon:0, lat:0};
    this.setValue();
  }
});

module.exports = FloatInput;
