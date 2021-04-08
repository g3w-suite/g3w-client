const {base, inherit} = require('core/utils/utils');
const Service = require('gui/inputs/service');
const ValidatorClass = require('core/validators/inputs/range');

function SliderRangeService(options={}) {
  const {state} = options;
  options.state.info = `[MIN: ${state.input.options.min} - MAX: ${state.input.options.max}]`;
  base(this, options);
  const validator = new ValidatorClass({
    min: 1*state.input.options.min,
    max: 1*state.input.options.max
  });
  this.setValidator(validator);
}

inherit(SliderRangeService, Service);

const proto = SliderRangeService.prototype;

proto.changeInfoMessage = function(){
  this.state.info =  `[MIN: ${this.state.input.options.min} - MAX: ${this.state.input.options.max}]`;
};

proto.isValueInRange = function(value, min, max) {
  return value <= max && value >= min;
};

module.exports = SliderRangeService;