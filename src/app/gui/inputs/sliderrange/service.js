import Service  from 'gui/inputs/service';
import ValidatorClass  from 'core/validators/inputs/range';

class SliderRangeService extends Service {
  constructor(options={}) {
    const {state} = options;
    options.state.info = `[MIN: ${state.input.options.min} - MAX: ${state.input.options.max}]`;
    super(options);
    const validator = new ValidatorClass({
      min: 1*state.input.options.min,
      max: 1*state.input.options.max
    });
    this.setValidator(validator);
  }

  validate(){
    this.state.value = 1*this.state.value;
    this.state.validate.valid = this.state.value >= this.state.input.options.min || this.state.value <= this.state.input.options.max;
  }

  changeInfoMessage(){
    this.state.info = `[MIN: ${this.state.input.options.min} - MAX: ${this.state.input.options.max}]`;
  };
}

export default  SliderRangeService;