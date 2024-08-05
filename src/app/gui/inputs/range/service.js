const { inherit, base } = require('utils');
const Service           = require('gui/inputs/service');
const Validators        = require('utils/validators');

function RangeService(options = {}) {
  const { min, max } = options.state.input.options.values[0];
  options.state.info = `[MIN: ${min} - MAX: ${max}]`;
  base(this, options);
  const validator = Validators.get('range', {
    min: 1*min,
    max: 1*max
  });
  this.setValidator(validator);
}

inherit(RangeService, Service);

const proto = Service.prototype;

proto.isValueInRange = function(value, min, max) {
  return value <= max && value >= min;
};

module.exports = RangeService;
