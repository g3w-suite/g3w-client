const { inherit, base } = require('utils');
const Service           = require('gui/inputs/service');

function CheckBoxService(options = {}) {
  const value = options.state.input.options.values.find(value => value.checked === false);
  options.validatorOptions =  {
    values: options.state.input.options.values.map(value => value)
  };
  if (options.state.value === null && !options.state.forceNull) { options.state.value = value.value }
  base(this, options);
}

inherit(CheckBoxService, Service);

const proto = CheckBoxService.prototype;

proto.convertCheckedToValue = function(checked) {
  checked          = [null, undefined].includes(checked) ? false : checked;
  const option     = this.state.input.options.values.find(value => checked === value.checked);
  this.state.value = option.value;

  return this.state.value;
};

proto.convertValueToChecked = function() {
  const valueToCheck = this.state.value;
  if ([null, undefined].includes(valueToCheck)) { return false }
  let option = this.state.input.options.values.find(value => valueToCheck == value.value);
  if (undefined === option) {
    option = this.state.input.options.values.find(value => false === value.checked);
    this.state.value = option.value;
  }
  return option.checked;
};


module.exports = CheckBoxService;
