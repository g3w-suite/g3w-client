const Service           = require('gui/inputs/service');
module.exports = class CheckBoxService extends Service {
  constructor(opts = {}) {
    const value = opts.state.input.options.values.find(v => false === v.checked);
    opts.validatorOptions = {
      values: opts.state.input.options.values.map(v => v)
    };
    if (null === opts.state.value && !opts.state.forceNull) {
      opts.state.value = value.value
    }
    super(opts);
  }

  convertCheckedToValue(checked) {
    checked          = [null, undefined].includes(checked) ? false : checked;
    this.state.value = (this.state.input.options.values.find(v => checked === v.checked) || {}).value;

    return this.state.value;
  };

  convertValueToChecked() {
    const valueToCheck = this.state.value;
    if ([null, undefined].includes(valueToCheck)) { return false }
    let option = this.state.input.options.values.find(value => valueToCheck == value.value);
    if (undefined === option) {
      option = this.state.input.options.values.find(value => false === value.checked);
      this.state.value = option.value;
    }
    return option.checked;
  };
}
