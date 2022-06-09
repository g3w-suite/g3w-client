import Validator  from './validator';

class RangeValidator extends Validator {
  constructor(options = {}) {
    super(options);
    const {min, max} = options;
    this.min = min;
    this.max = max;
  }

  validate(value) {
    value = 1*value;
    return value >= this.min && value <= this.max;
  }
}

export default RangeValidator;


