const { truefnc } = require('core/utils/utils');

const InputValidators = {
  validators: {

    float(options = {}) {
      this.options = options;
      this.validate = function(value) {
        const float = Number(1 * value);
        return !Number.isNaN(float) && float <= 2147483647;
      }
    },

    integer(options = {}) {
      this.options = options;
      this.validate = function(value) {
        const integer = 1 * value;
        return !_.isNaN(integer) ? Number.isSafeInteger(integer) && (integer <= 2147483647) : false;
      }
    },

    checkbox(options = {}) {
      this.options = options;
      this.validate = function(value) {
        const values = this.options.values || [];
        return values.indexOf(value) !== -1;
      }
    },

    datetimepicker(options = {}) {
      this.options = options;
      this.validate = function(value, options) {
        const fielddatetimeformat = options.fielddatetimeformat;
        return moment(value, fielddatetimeformat, true).isValid();
      }
    },

    text(options = {}) {
      this.options = options;
      this.validate = truefnc;
    },

    string(options = {}) {
      this.options = options;
      this.validate = truefnc;
    },

    radio(options = {}) {
      this.options = options;
      this.validate = truefnc;
    },

    default(options = {}) {
      this.options = options;
      this.validate = truefnc;
    },

    range(options = {}) {
      const { min, max } = options;
      this.validate = function(value) {
        value = 1 * value;
        return value >= min && value <= max;
      }
    },

  },

  get(type, options={}) {
    const Validator = this.validators[type] || this.validators.default;
    return new Validator(options);
  }

};

module.exports = InputValidators;
