import { toRawType } from 'utils/toRawType';
import { gettext as _ }    from 'g3w-i18n';

const Validators = {

  validators: {

    float: (options = {}) => ({
      options,
      validate: (value) => !Number.isNaN(Number(1 * value))
    }),

    /**
     * @since v3.10.0
     * @param options
     */
    bigint: (options = {}) => ({
      options,
      validate(value) {
        value = 1 * value;
        return !Number.isNaN(value) ? value <= Number.MAX_SAFE_INTEGER : false;
      }
    }),

    integer: (options = {}) => ({
      options,
      validate(value) {
        const integer = 1 * value;
        return !Number.isNaN(integer) ? Number.isSafeInteger(integer) && (integer <= 2147483647) : false;
      }
    }),

    checkbox: (options = {}) => ({
      options,
      validate: (value) => (this.options.values || []).includes(value)
    }),

    datetimepicker: (options = {}) => ({
      options,
      validate: (value, options) => moment(value, options.fielddatetimeformat, true).isValid()
    }),

    /**
     * @since 3.10.0
     * @param options
     */
    char: (options) => ({
      options,
      validate: (value) => value && 1 === `${value}`.length
    }),

    /**
     * @since 3.10.0
     * @param options
     */
    varchar: (options = {}) => ({ options, validate: () => true }),
    text:    (options = {}) => ({ options, validate: () => true }),
    string:  (options = {}) => ({ options, validate: () => true }),
    radio:   (options = {}) => ({ options, validate: () => true }),
    default: (options = {}) => ({ options, validate: () => true }),

    range: (options = {}) => ({
      options,
      validate(value) {
        value = 1 * value;
        return value >= options.min && value <= options.max;
      }
    }),

  },

  get(type, options = {}) {
    return (this.validators[type] || this.validators.default)(options);
  }

};

module.exports = class Service {
  
  constructor(options = {}) {
    // set state of input
    this.state = options.state || {};
    // type of input
    //this.state.validate.required && this.setValue(this.state.value);
    /*
    * set starting value of input based on value or default value on options
     */
    this.setValue(this.state.value);
    this.setEmpty(this.state.value);
    const type = this.state.type;
    const validatorOptions = (options.validatorOptions || this.state.input.options) || {};
    // useful for the validator to validate input
    this._validator = Validators.get(type, validatorOptions);
    this.setErrorMessage();
  }

  getState() {
    return this.state;
  };

  getValue() {
    return this.state.value;
  };

  /**
   * @param value
   *
   * @returns {void}
   */
  setValue(value) {
    if (![null, undefined].includes(value)) { return }

    const { options }   = this.state.input;
    let default_value   = options.default;

    /** @TODO (maybe need to removed in v3.9.0) double check G3W-ADMIN server configuration. */
    if (Array.isArray(options)) {
      if (options[0].default) { default_value = options[0].default }
      else if (Array.isArray(options.values) && options.values.length > 0) {
        default_value = options.values[0] && (options.values[0].value || options.values[0]);
      }
    }

    // check if the default value is set
    const get_default_value = (
      this.state.get_default_value && // ref: core/layers/tablelayer.js::getFieldsWithValues()
      undefined !== default_value &&
      null !== default_value
    );

    // check if we can state.check get_default_value from input.options.default is set
    if (get_default_value && undefined === options.default_expression) {
      this.state.value = default_value;
    }

    this.state.value_from_default_value = get_default_value;

  };

  addValueToValues(value) {
    this.state.input.options.values.unshift(value)
  };

  _getValidatorType() {
    return this.state.type;
  };

  setState(state = {}) {
    this.state = 'Object' === toRawType(state) ? state : {};
  };

// return validator
  getValidator() {
    return this._validator;
  };

  setValidator(validator) {
    this._validator = validator;
  };

  /**
   * set input empty '', null, undefined or []
   */
  setEmpty() {
    this.state.validate.empty = (null === this.state.value || '' === `${this.state.value}`.trim());
  };

// the general method to check the value of the state is valid or not
  validate() {
    if (this.state.validate.empty) {
      this.state.value           = null; //force to null
      // check if you require or check validation
      this.state.validate.valid  = !this.state.validate.required;
    } else {
      //check exclude_values state.validate.unique (QGIS field property [x] Enforce unique constraint)
      if (this.state.validate.unique && this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
        //need to convert this.state.value to string because editing store exclude_values items as string
        this.state.validate.valid = !this.state.validate.exclude_values.has(`${this.state.value}`);
      } else {
        this.state.validate.valid = this._validator.validate(this.state.value);
      }
    }

    return this.state.validate.valid;
  };

  setErrorMessage() {
    //in vase of
    if (this.state.validate.error) {
      this.state.validate.message = _(this.state.validate.error);
      return;
    }
    let message;
    if (this.state.validate.mutually && !this.state.validate.mutually_valid) {
      this.state.validate.message =  `${_("sdk.form.inputs.input_validation_mutually_exclusive")} ( ${this.state.validate.mutually.join(',')} )`;
    } else if (this.state.validate.max_field) {
      this.state.validate.message = `${_("sdk.form.inputs.input_validation_max_field")} (${this.state.validate.max_field})`;
    } else if (this.state.validate.min_field) {
      this.state.validate.message = `${_("sdk.form.inputs.input_validation_min_field")} (${this.state.validate.min_field})`;
    } else if (('unique' === this.state.input.type || this.state.validate.unique) && this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
      this.state.validate.message = `${_("sdk.form.inputs.input_validation_exclude_values")}`;
    } else if (this.state.validate.required) {
      message = `${_("sdk.form.inputs.input_validation_error")} ( ${_("sdk.form.inputs." + this.state.type)} )`;
      if (this.state.info) {
        message = `${message}
                 <div>
                  <b>${this.state.info}</b>
                 </div>         
      `;
      }
      this.state.validate.message = this.state.info || message;
    } else {
      //@since 3.11.0
      // in case of state.validate.valid false and not required need to show a right message (info or type)
      this.state.validate.message = this.state.info || `${_("sdk.form.inputs.input_validation_error_type")} ( ${_("sdk.form.inputs." + this.state.type)} )`;
    }
  };
  /**
   * Method to set update
   */
  setUpdate() {
    const {value, _value} = this.state;
    if ('media' === this.state.input.type && 'Object' !== toRawType(value) && 'Object' !== toRawType(_value)) {
      this.state.update = value.value != _value.value;
    } else if ("datetimepicker" === this.state.input.type) {
      //check
      this.state.update = (null !== value ? value.toUpperCase(): value) != (_value ? _value.toUpperCase(): _value);
    } else {
      this.state.update = value != _value;
    }
  };
}
