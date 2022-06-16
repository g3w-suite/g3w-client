import Input from 'gui/inputs/input';
import utils from 'core/utils/utils';
import WidgetMixins from 'gui/inputs/widgetmixins';
import checkBoxTemplate from './checkbox.html';

const CheckBoxInput = Vue.extend({
  mixins: [Input, WidgetMixins],
  template: checkBoxTemplate,
  data() {
    return {
      value: null,
      label: null,
      id: utils.getUniqueDomId(), // new id
    };
  },
  methods: {
    setLabel() {
      // convert label
      this.label = this.service.convertCheckedToValue(this.value);
    },
    setValue() {
      this.value = this.service.convertValueToChecked();
    },
    changeCheckBox() {
      // convert label
      this.setLabel();
      this.widgetChanged();
    },
    stateValueChanged() {
      this.setValue();
      this.setLabel();
    },
  },
  created() {
    this.value = this.state.forceNull ? this.value : this.service.convertValueToChecked();
  },
  mounted() {
    if (!this.state.forceNull) {
      this.setLabel();
      this.change();
    }
  },
});

export default CheckBoxInput;
