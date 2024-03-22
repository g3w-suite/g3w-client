/**
 * @file
 * @since v3.7
 */

export default {

  data() {
    return {
      valid: false
    };
  },

  methods: {

    addToValidate(input) {
      this.tovalidate.push(input);
    },

    changeInput(input) {
      this.isValid(input);
    },

    // Every input send to form it valid value that will change the genaral state of form
    isValid(input) {

      const is_mutually = input && input.validate.mutually && !input.validate.required; 
      const is_min_max  = input && !input.validate.mutually && !input.validate.empty && (input.validate.min_field || input.validate.max_field);

      // check mutually (not empty)
      if (is_mutually && !input.validate.empty) {
            input.validate._valid         = input.validate.valid;
            input.validate.mutually_valid = input.validate.mutually.reduce((prev, name) => prev && this.tovalidate[name].validate.empty, true);
            input.validate.valid          = input.validate.mutually_valid && input.validate.valid;
      }

      // check mutually (empty)
      if (is_mutually && input.validate.empty) {
        input.value                   = null;
        input.validate.mutually_valid = true;
        input.validate.valid          = true;
        input.validate._valid         = true;

        let no_empty_inputs = [];
        const inputs        = input.validate.mutually;
        for (let i = inputs.length; i--;) {
          if (!this.tovalidate[inputs[i]].validate.empty) {
            no_empty_inputs.push(inputs[i]); // push input name.
          }
        }

        if (no_empty_inputs.length < 2) {
          no_empty_inputs.forEach((name) => {
            this.tovalidate[name].validate.mutually_valid = true;
            this.tovalidate[name].validate.valid          = true;
            setTimeout(() => {
              this.tovalidate[name].validate.valid = this.tovalidate[name].validate._valid;
              this.state.valid                     = this.state.valid && this.tovalidate[name].validate.valid;
            })
          })
        }

      }

      // check if min_field or max_field is set
      if (is_min_max) {
        const min = input.validate.min_field;
        const max = input.validate.max_field;
        input.validate.valid = min
          ? this.tovalidate[min].validate.empty || 1 * input.value > 1 * this.tovalidate[min].value
          : this.tovalidate[max].validate.empty || 1 * input.value < 1 * this.tovalidate[max].value;
        if (input.validate.valid) {
          this.tovalidate[min || max].validate.valid = true;
        }
      }

      this.valid = Object.values(this.tovalidate).reduce((prev, input) => prev && input.validate.valid, true);

    },

  },

  created() {
    this.tovalidate = [];
  },

  destroyed() {
    this.tovalidate = null;
  }

};