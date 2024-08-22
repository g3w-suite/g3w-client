const Validators    = require('utils/validators');
const { toRawType } = require('utils');
const { t }         = require('core/i18n/i18n.service');

module.exports = class Service {
  constructor(opts = {}) {
    // set state of input
    this.state = opts.state || {};
    // type of input
    //this.state.validate.required && this.setValue(this.state.value);
    /*
    * set starting value of input based on value or default value on options
     */
    this.setValue(this.state.value);
    this.setEmpty(this.state.value);
    const type = this.state.type;
    // useful for the validator to validate input
    this._validator = Validators.get(type, (opts.validatorOptions || this.state.input.options) || {});
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
    this.state = ('object' === typeof state && null !== state && !Array.isArray(state)) ? state : {};
  };

  // return validator
  getValidator() {
    return this._validator;
  };

  setValidator(validator) {
    this._validator = validator;
  };

  setEmpty() {
    this.state.validate.empty = !((Array.isArray(this.state.value) && this.state.value.length) || !_.isEmpty(_.trim(this.state.value)));
  };

  // the general method to check the value of the state is valid or not
  validate() {
    if (this.state.validate.empty) {
      this.state.validate.empty  = true;
      this.state.value           = null;
      this.state.validate.unique = true;
      // check if you require or check validation
      this.state.validate.valid  = this.state.validate.required ? false : this._validator.validate(this.state.value);
    } else {
      if (['integer', 'float'].includes(this.state.input.type)) {
        if (+this.state.value < 0) {
          this.state.value               = null;
          this.state.validate.empty      = true;
          this.state.validate.valid      = !this.state.validate.required;
        } else this.state.validate.valid = this._validator.validate(this.state.value);
      }
      if (this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
        this.state.validate.valid = !this.state.validate.exclude_values.has(this.state.value);
      } else {
        this.state.validate.valid = this._validator.validate(this.state.value);
      }
    }
    return this.state.validate.valid;
  };

  setErrorMessage() {
    //in vase of
    if (this.state.validate.error) {
      this.state.validate.message = t(this.state.validate.error);
      return;
    }
    let message;
    if (this.state.validate.mutually && !this.state.validate.mutually_valid) {
      this.state.validate.message =  `${t("sdk.form.inputs.input_validation_mutually_exclusive")} ( ${this.state.validate.mutually.join(',')} )`;
    } else if (this.state.validate.max_field) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_max_field")} (${this.state.validate.max_field})`;
    } else if (this.state.validate.min_field) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_min_field")} (${this.state.validate.min_field})`;
    } else if (this.state.validate.unique && this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_exclude_values")}`;
    } else if (this.state.validate.required) {
      message = `${t("sdk.form.inputs.input_validation_error")} ( ${t("sdk.form.inputs." + this.state.type)} )`;
      if (this.state.info) {
        message = `${message}
                 <div>
                  <b>${this.state.info}</b>
                 </div>         
      `;
      }
      this.state.validate.message = this.state.info || message;
    } else {
      this.state.validate.message = this.state.info;
    }
  };

  /**
   * Method to set update
   */
  setUpdate() {
    const { value, _value } = this.state;
    if ('media' === this.state.input.type && 'Object' !== toRawType(value) && 'Object' !== toRawType(_value)) {
      this.state.update = value.value != _value.value;
    } else if ("datetimepicker" === this.state.input.type) {
      //check
      this.state.update = (null !== value ? value.toUpperCase(): value) != (_value ? _value.toUpperCase(): _value);
    } else {
      this.state.update = value != _value;
    }
  };

};
