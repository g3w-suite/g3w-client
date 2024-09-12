/**
 * @file ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
 * 
 * @since 3.9.0
 */
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
        return !Number.isNaN(Number(1 * value));
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
        return (this.options.values || []).includes(value);
      }
    },

    datetimepicker(options = {}) {
      this.options = options;
      this.validate = function(value, options) {
        return moment(value, options.fielddatetimeformat, true).isValid();
      }
    },

    /**
     * @since 3.10.0
     * @param options
     */
    char(options) {
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
      this.options  = options;
      this.validate = () => true;
    },

    text(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    string(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    radio(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    default(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    range(options = {}) {
      const { min, max } = options;
      this.validate = function(value) {
        value = 1 * value;
        return value >= min && value <= max;
      }
    },

  },

  get(type, options = {}) {
    return new (this.validators[type] || this.validators.default)(options);
  }

};

module.exports = InputValidators;
