const Service           = require('gui/inputs/service');
const Validators        = require('utils/validators');

module.exports = class RangeService extends Service {
  constructor(opts = {}) {
    const { min, max } = opts.state.input.options.values[0];
    opts.state.info = `[MIN: ${min} - MAX: ${max}]`;
    super(opts);
    const validator = Validators.get('range', {
      min: 1*min,
      max: 1*max
    });
    this.setValidator(validator);
  }
  isValueInRange(value, min, max) {
    return value <= max && value >= min;
  };
};
