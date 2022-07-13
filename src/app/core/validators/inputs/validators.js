const Validators = {
  validators: {
    float: require('./float'),
    integer: require('./integer'),
    checkbox: require('./checkbox'),
    datetimepicker: require('./datetimepicker'),
    text: require('./validator'),
    string: require('./validator'),
    radio: require('./radio'),
    default: require('./validator'),
    range: require('./range'),
  },

  get(type, options = {}) {
    const Validator = this.validators[type] || this.validators.default;
    return new Validator(options);
  },

};

module.exports = Validators;
