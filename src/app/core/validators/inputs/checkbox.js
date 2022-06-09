import Validator  from './validator';

class CheckBoxValidator extends Validator{
  constructor(options={}) {
    super(options);
  }

  validate(value) {
    const values = this.options.values || [];
    return values.indexOf(value) !== -1;
  }
}

export default CheckBoxValidator;


