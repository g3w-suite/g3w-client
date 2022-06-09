import Input  from 'gui/inputs/input';
import utils  from 'core/utils/utils';
import template from './radio.html';

const RadioInput = Vue.extend({
  mixins: [Input],
  template,
  data() {
    return {
      ids: [utils.getUniqueDomId(), utils.getUniqueDomId()],
      name: `name_${utils.getUniqueDomId()}`,
      radio_value: this.state.value
    }
  },
  watch: {
    'radio_value'() {
      this.state.value = this.radio_value;
      this.change()
    }
  }

});

export default  RadioInput;
