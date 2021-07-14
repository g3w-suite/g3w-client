const {base, inherit}= require('core/utils/utils');
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
