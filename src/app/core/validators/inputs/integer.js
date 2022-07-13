const { base, inherit } = require('core/utils/utils');
const Validator = require('./validator');

function IntegerValidator(options) {
  base(this, options);
  this.validate = function (value) {
    const integer = 1 * value;
    return !_.isNaN(integer) ? Number.isSafeInteger(integer) && (integer <= 2147483647) : false;
  };
}

inherit(IntegerValidator, Validator);

module.exports = IntegerValidator;
