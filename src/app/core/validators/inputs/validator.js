function InputValidator(options = {}) {
  this.options = options;
  this.validate = function () {
    return true; // always true. Generic validator
  };
}

module.exports = InputValidator;
