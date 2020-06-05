const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Validator = require('./validator');

function CheckBoxValidator(options) {
  base(this, options);
  this.validate = function(value) {
    const values = this.options.values || [];
    return values.indexOf(value) !== -1;
  }
}

inherit(CheckBoxValidator, Validator);

module.exports =  CheckBoxValidator;
