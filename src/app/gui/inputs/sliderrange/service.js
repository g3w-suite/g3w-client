const Service           = require('gui/inputs/service');

class SliderRangeService extends Service {
  constructor(opts = {}) {
    const { state } = opts;
    opts.state.info = `[MIN: ${state.input.options.min} - MAX: ${state.input.options.max}]`;
    super(opts);
    this.setValidator({
      validate(value) {
        value = 1 * value;
        return value >= (1 * opts.state.input.options.min) && value <= (1 * opts.state.input.options.max);
      }
    });
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