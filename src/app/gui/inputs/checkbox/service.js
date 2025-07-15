const Service           = require('gui/inputs/service');
module.exports = class CheckBoxService extends Service {
  constructor(opts = {}) {
    opts.validatorOptions = {
      values: opts.state.input.options.values.map(v => v)
    };
    super(opts);
  }
}
