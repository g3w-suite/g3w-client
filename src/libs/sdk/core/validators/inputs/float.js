const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Validator = require('./validator');

function FloatValidator(options) {
  base(this, options);
  this.validate = function(value) {
    const float = Number(1*value);
    return !Number.isNaN(float) && float <= 2147483647;
  }
}

inherit(FloatValidator, Validator);

module.exports =  FloatValidator;
