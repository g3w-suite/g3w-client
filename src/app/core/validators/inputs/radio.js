const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Validator = require('./validator');

function RadioValidator(options) {
  base(this, options);
}

inherit(RadioValidator, Validator);

module.exports = RadioValidator;
