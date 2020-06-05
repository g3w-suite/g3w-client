const Input = require('gui/inputs/input');
const getUniqueDomId = require('core/utils/utils').getUniqueDomId;
const WidgetMixins = require('gui/inputs/widgetmixins');

const CheckBoxInput = Vue.extend({
  mixins: [Input, WidgetMixins],
  template: require('./checkbox.html'),
  data: function() {
    return {
      value: null,
      label:null,
      id: getUniqueDomId() // new id
    }
  },
  methods: {
    setLabel(){
      // convert label
      this.label = this.service.convertCheckedToValue(this.value);
    },
    setValue() {
      this.value = this.service.convertValueToChecked();
    },
    changeCheckBox: function() {
      // convert label
      this.setLabel();
      this.widgetChanged();
    },
    stateValueChanged() {
      this.setValue();
      this.setLabel();
    }
  },
  created() {
    this.value = this.service.convertValueToChecked();
  },
  mounted: function() {
    this.setLabel();
    this.change();
  }
});

module.exports = CheckBoxInput;
