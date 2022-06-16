import Validator from './validator';

class FloatValidator extends Validator {
  // constructor(options = {}) {
  //   super(options);
  // }

  validate(value) {
    const float = Number(1 * value);
    return !Number.isNaN(float) && float <= 2147483647;
  }
}

export default FloatValidator;
