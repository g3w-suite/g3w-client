import Validators from 'core/validators/inputs/validators';
import { t } from 'core/i18n/i18n.service';

class Service {
  constructor(options = {}) {
    // set state of input
    this.state = options.state || {};
    // type of input
    this.state.validate.required && this.setValue(this.state.value);
    this.setEmpty(this.state.value);
    const { type } = this.state;
    const validatorOptions = (options.validatorOptions || this.state.input.options) || {};
    // useful for the validator to validate input
    this._validator = Validators.get(type, validatorOptions);
    this.setErrorMessage(options.state);
  }

  getState() {
    return this.state;
  }

  getValue() {
    return this.state.value;
  }

  setValue(value) {
    if (value === null || value === undefined) {
      if (Array.isArray(this.state.input.options)) {
        if (this.state.input.options[0].default) this.state.value = this.state.input.options[0].default;
        else if (Array.isArray(this.state.input.options.values)) {
          if (this.state.input.options.values.length) {
            this.state.value = this.state.input.options.values[0]
              && this.state.input.options.values[0].value
              || this.state.input.options.values[0];
          }
        }
      } else this.state.value = this.state.input.options.default;
    }
  }

  addValueToValues(value) {
    this.state.input.options.values.unshift(value);
  }

  _getValidatorType() {
    return this.state.type;
  }

  setState(state = {}) {
    this.state = _.isObject(state) ? state : {};
  }

  // return validator
  getValidator() {
    return this._validator;
  }

  setValidator(validator) {
    this._validator = validator;
  }

  setEmpty() {
    this.state.validate.empty = !((Array.isArray(this.state.value) && this.state.value.length) || !_.isEmpty(_.trim(this.state.value)));
  }

  // general method to check the value of the state is valid or not
  validate() {
    if (this.state.validate.empty) {
      this.state.validate.empty = true;
      this.state.value = null;
      this.state.validate.unique = true;
      // check if require or check validation
      this.state.validate.valid = this.state.validate.required ? false : this._validator.validate(this.state.value);
    } else {
      if (this.state.input.type === 'integer' || this.state.input.type === 'float') {
        if (+this.state.value < 0) {
          this.state.value = null;
          this.state.validate.empty = true;
          this.state.validate.valid = !this.state.validate.required;
        } else this.state.validate.valid = this._validator.validate(this.state.value);
      }
      if (this.state.validate.exclude_values && this.state.validate.exclude_values.length) {
        if (this.state.validate.exclude_values.indexOf(this.state.value) !== -1) {
          this.state.validate.valid = false;
          this.state.validate.unique = false;
        } else this.state.validate.unique = true;
      } else this.state.validate.valid = this._validator.validate(this.state.value);
    }
    return this.state.validate.valid;
  }

  setErrorMessage(input) {
    let message;
    if (input.validate.mutually && !input.validate.mutually_valid) this.state.validate.message = `${t('sdk.form.inputs.input_validation_mutually_exclusive')} ( ${input.validate.mutually.join(',')} )`;
    else if (input.validate.max_field) this.state.validate.message = `${t('sdk.form.inputs.input_validation_max_field')} (${input.validate.max_field})`;
    else if (input.validate.min_field) this.state.validate.message = `${t('sdk.form.inputs.input_validation_min_field')} (${input.validate.min_field})`;
    else if (!input.validate.unique && input.validate.exclude_values) this.state.validate.message = `${t('sdk.form.inputs.input_validation_exclude_values')}`;
    else if (input.validate.required) {
      message = `${t('sdk.form.inputs.input_validation_error')} ( ${t(`sdk.form.inputs.${input.type}`)} )`;
      if (this.state.info) {
        message = `${message}
                 <div>
                  <b>${this.state.info}</b>
                 </div>         
      `;
      }
      this.state.validate.message = this.state.info || message;
    } else this.state.validate.message = this.state.info;
  }
}

export default Service;
