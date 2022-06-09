import Input  from 'gui/inputs/input';
import template from './sliderrange.html';

const RangeInput = Vue.extend({
  mixins: [Input],
  template,
  watch:{
    'state.input.options.min'(){
      this.service.changeInfoMessage()
    },
    'state.input.options.max'(){
      this.service.changeInfoMessage()
    }
  }
});

export default  RangeInput;
