const { inherit, base } = require('utils');
const Service           = require('gui/inputs/service');

function CheckBoxService(options = {}) {
  options.validatorOptions =  {
    values: options.state.input.options.values.map(value => value)
  };
  base(this, options);
}

inherit(CheckBoxService, Service);

const proto = CheckBoxService.prototype;

proto.convertCheckedToValue = function(checked) {
  checked          = [null, undefined].includes(checked) ? false : checked;
  this.state.value = [true, false].includes(this.state.value) //check if is a boolean value
    ? (this.state.input.options.values.find(v => checked === v.checked) || {}).value //get boolean value
    : `${(this.state.input.options.values.find(v => checked === v.checked) || {}).value}`; // Need to convert it to string because server return always string value
  return this.state.value;
};

proto.convertValueToChecked = function() {
  if ([null, undefined].includes(this.state.value)) { return false }
  let option = this.state.input.options.values.find(v => this.state.value == v.value);
  if (undefined === option) {
    option = this.state.input.options.values.find(v => false === v.checked);
    this.state.value = option.value;
  }
  return option.checked;
};

module.exports = CheckBoxService;
