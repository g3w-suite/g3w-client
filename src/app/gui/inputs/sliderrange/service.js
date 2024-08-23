const Service           = require('gui/inputs/service');
const Validators        = require('utils/validators');

class SliderRangeService extends Service {
  constructor(opts = {}) {
    const { state } = opts;
    opts.state.info = `[MIN: ${state.input.options.min} - MAX: ${state.input.options.max}]`;
    super(opts);

    const validator = Validators.get('range', {
      min: 1 * state.input.options.min,
      max: 1 * state.input.options.max
    });

    this.setValidator(validator);
  }

  validate() {
    this.state.value          = 1*this.state.value;
    this.state.validate.valid = this.state.value >= this.state.input.options.min || this.state.value <= this.state.input.options.max;
  }

  changeInfoMessage() {
    this.state.info =  `[MIN: ${this.state.input.options.min} - MAX: ${this.state.input.options.max}]`;
  };
}

module.exports = SliderRangeService;