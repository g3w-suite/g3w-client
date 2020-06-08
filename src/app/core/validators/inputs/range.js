const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Validator = require('./validator');

function RangeValidator(options={}) {
  base(this, options);
  const {min, max} = options;
  this.validate = function(value) {
    value = 1*value;
    return value >= min && value <= max;
  }
}

inherit(RangeValidator, Validator);

module.exports =  RangeValidator;
