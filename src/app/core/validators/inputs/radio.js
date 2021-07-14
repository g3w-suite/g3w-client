const {base, inherit}= require('core/utils/utils');
const Validator = require('./validator');

function RadioValidator(options) {
  base(this, options);
}

inherit(RadioValidator, Validator);

module.exports = RadioValidator;
