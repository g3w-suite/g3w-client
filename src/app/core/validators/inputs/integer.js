import Validator from './validator';

class IntegerValidator extends Validator {
  constructor(options = {}) {
    super(options);
  }

  validate(value) {
    const integer = 1 * value;
    return !_.isNaN(integer) ? Number.isSafeInteger(integer) && (integer <= 2147483647) : false;
  }
}

export default IntegerValidator;
