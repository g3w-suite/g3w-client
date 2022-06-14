import Service  from 'gui/inputs/service';
import ValidatorClass  from 'core/validators/inputs/range';

class RangeService extends Service {
  constructor(options={}) {
    const {min, max} = options.state.input.options.values[0];
    options.state.info = `[MIN: ${min} - MAX: ${max}]`;
    super(options);
    const validator = new ValidatorClass({
      min: 1*min,
      max: 1*max
    });
    this.setValidator(validator);
  }
  isValueInRange(value, min, max) {
    return value <= max && value >= min;
  };
}

export default  RangeService;
