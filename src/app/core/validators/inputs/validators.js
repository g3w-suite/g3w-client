import validator from './validator';
import float from './float';
import integer from './integer';
import checkbox from './checkbox';
import datetimepicker from './datetimepicker';
import radio from './radio';
import range from './range';

const Validators = {
  validators: {
    range,
    radio,
    datetimepicker,
    checkbox,
    integer,
    float,
    string: validator,
    default: validator,
  },

  get(type, options = {}) {
    const Validator = this.validators[type] || this.validators.default;
    return new Validator(options);
  },

};

export default Validators;
