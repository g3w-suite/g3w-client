/**
 * @file
 * @since v3.7
 */

export default {
  data() {
    return {
      valid: false
    }
  },
  methods: {
    addToValidate(input) {
      this.tovalidate.push(input);
    },
    changeInput(input) {
      this.isValid(input)
    },
    // Every input sends to form it valid value that will change the genaral state of form
    isValid(input) {
      if (input) {
        // check mutually
        if (input.validate.mutually) {
          if (!input.validate.required) {
            if (!input.validate.empty) {
              input.validate._valid         = input.validate.valid;
              input.validate.mutually_valid = input.validate.mutually.reduce((previous, inputname) => {
                return previous && this.tovalidate[inputname].validate.empty;
              }, true);
              input.validate.valid = input.validate.mutually_valid && input.validate.valid;
            } else {
              input.value                   = null;
              input.validate.mutually_valid = true;
              input.validate.valid          = true;
              input.validate._valid         = true;
              let countNoTEmptyInputName = [];
              for (let i = input.validate.mutually.length; i--;) {
                const name = input.validate.mutually[i];
                if (!this.tovalidate[name].validate.empty) {
                  countNoTEmptyInputName.push(name);
                }
              }
              if (countNoTEmptyInputName.length < 2) {
                countNoTEmptyInputName.forEach(name => {
                  this.tovalidate[name].validate.mutually_valid = true;
                  this.tovalidate[name].validate.valid          = true;
                  setTimeout(() => {
                    this.tovalidate[name].validate.valid = this.tovalidate[name].validate._valid;
                    this.state.valid = this.state.valid && this.tovalidate[name].validate.valid;
                  })
                })
              }
            }
          }
          //check if min_field or max_field is set
        } else if (!input.validate.empty && (input.validate.min_field || input.validate.max_field)) {
          const input_name = input.validate.min_field || input.validate.max_field;
          input.validate.valid = input.validate.min_field
            ? this.tovalidate[input.validate.min_field].validate.empty || 1*input.value > 1*this.tovalidate[input.validate.min_field].value
            : this.tovalidate[input.validate.max_field].validate.empty || 1*input.value < 1*this.tovalidate[input.validate.max_field].value;
          if (input.validate.valid) {
            this.tovalidate[input_name].validate.valid = true
          }
        }
      }
      this.valid = Object.values(this.tovalidate).reduce((bool, input) => {
        return bool && input.validate.valid;
      }, true);
    }
  },
  created() {
    this.tovalidate = [];
  },
  destroyed() {
    this.tovalidate = null;
  }
};