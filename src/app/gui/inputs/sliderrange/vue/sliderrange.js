const Input = require('gui/inputs/input');

const RangeInput = Vue.extend({
  mixins: [Input],
  template: require('./sliderrange.html'),
  methods: {
    checkValue() {
      const valid = this.state.validate.required || !_.isEmpty(_.trim(this.state.value)) ? this.service.getValidator().validate(this.state.value) : true;
      this.state.validate.valid = valid;
      this.change();
    }
  },
  watch:{
    'state.input.options.min'(){
      this.service.changeInfoMessage()
    },
    'state.input.options.max'(){
      this.service.changeInfoMessage()
    }
  }
});

module.exports = RangeInput;
