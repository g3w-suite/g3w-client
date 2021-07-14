const {base, inherit}= require('core/utils/utils');
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
