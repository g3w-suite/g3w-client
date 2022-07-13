const { base, inherit } = require('core/utils/utils');
const Validator = require('./validator');

function FloatValidator(options) {
  base(this, options);
  this.validate = function (value) {
    const float = Number(1 * value);
    return !Number.isNaN(float) && float <= 2147483647;
  };
}

inherit(FloatValidator, Validator);

module.exports = FloatValidator;
