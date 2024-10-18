const Service           = require('gui/inputs/service');
module.exports = class CheckBoxService extends Service {
  constructor(opts = {}) {
    opts.validatorOptions = {
      values: opts.state.input.options.values.map(v => v)
    };
    super(opts);
  }

  getValuesItem(checked = false) {
    checked = null === checked ? false : checked;
    return (this.state.input.options.values.find(v => checked === v.checked) || {});
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
