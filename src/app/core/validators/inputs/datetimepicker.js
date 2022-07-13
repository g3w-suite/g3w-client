const { base, inherit } = require('core/utils/utils');
const Validator = require('./validator');

function DateTimePickerValidator(options) {
  base(this, options);
  this.validate = function (value, options) {
    const { fielddatetimeformat } = options;
    return moment(value, fielddatetimeformat, true).isValid();
  };
}
inherit(DateTimePickerValidator, Validator);

module.exports = DateTimePickerValidator;
