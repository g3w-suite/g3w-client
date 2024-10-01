const Service           = require('gui/inputs/service');

module.exports = class RangeService extends Service {
  constructor(opts = {}) {
    const { min, max } = opts.state.input.options.values[0];
    opts.state.info = `[MIN: ${min} - MAX: ${max}]`;
    super(opts);

    this.setValidator({
      validate(value) {
        value = 1 * value;
        return value >= 1*min && value <= 1*max;
      }
    });
  }
  isValueInRange(value, min, max) {
    return value <= max && value >= min;
  };
};
