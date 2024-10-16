const Service           = require('gui/inputs/service');
module.exports = class CheckBoxService extends Service {
  constructor(opts = {}) {
    opts.validatorOptions = {
      values: opts.state.input.options.values.map(v => v)
    };
    super(opts);
  }

  convertCheckedToValue(checked) {
    checked          = [null, undefined].includes(checked) ? false : checked;
    this.state.value = [true, false].includes(this.state.value) //check if is a boolean value
      ? (this.state.input.options.values.find(v => checked === v.checked) || {}).value //get boolean value
      : `${(this.state.input.options.values.find(v => checked === v.checked) || {}).value}`; // Need to convert it to string because server return always string value
    return this.state.value;
  };

  convertValueToChecked() {
    if ([null, undefined].includes(this.state.value)) { return false }
    let option = this.state.input.options.values.find(v => this.state.value == v.value);
    if (undefined === option) {
      option = this.state.input.options.values.find(v => false === v.checked);
      this.state.value = option.value;
    }
    return option.checked;
  };
}
