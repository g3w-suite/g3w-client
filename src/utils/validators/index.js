/**
 * @file ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
 * 
 * @since 3.9.0
 */

const { truefnc } = require('utils');

//List of type inputs from server

// FIELD_TYPE_INTEGER      = 'integer'
// FIELD_TYPE_BIGINTEGER   = 'bigint'
// FIELD_TYPE_SMALLINTEGER = 'integer'
// FIELD_TYPE_FLOAT        = 'float'
// FIELD_TYPE_STRING       = 'string'
// FIELD_TYPE_TEXT         = 'text'
// FIELD_TYPE_BOOLEAN      = 'boolean'
// FIELD_TYPE_DATE         = 'date'
// FIELD_TYPE_TIME         = 'time'
// FIELD_TYPE_DATETIME     = 'datetime'
// FIELD_TYPE_IMAGE        = 'image'
// FIELD_TYPE_FILE         = 'file'
// FIELD_TYPE_VARCHAR      = 'varchar'
// FIELD_TYPE_CHAR         = 'char'

const InputValidators = {

  validators: {

    float(options = {}) {
      this.options = options;
      this.validate = function(value) {
        const float = Number(1 * value);
        return !Number.isNaN(float);
      }
    },

    /**
     * @since v3.10.0
     * @param options
     */
    bigint(options = {}) {
      this.options = options;
      this.validate = function(value) {
        value = 1 * value;
        return !Number.isNaN(value) ? value <= Number.MAX_SAFE_INTEGER : false;
      }
    },

    integer(options = {}) {
      this.options = options;
      this.validate = function(value) {
        const integer = 1 * value;
        return !Number.isNaN(integer) ? Number.isSafeInteger(integer) && (integer <= 2147483647) : false;
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

    /**
     * @since 3.10.0
     * @param options
     */
    chart(options) {
      this.options = options;
      this.validate = function(value) {
        return value && 1 === `${value}`.length;
      }
    },

    /**
     * @since 3.10.0
     * @param options
     */
    varchar(options = {}) {
      this.options = options;
      this.validate = truefnc;
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
