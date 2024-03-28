/**
 * @file
 * @since v3.7
 */
const { getAppLanguage } = require('core/i18n/i18n.service');

export default {
  methods: {
    getLanguage() {
      return getAppLanguage();
    },
    async changeSelect(value) {
      this.state.value = 'null' === value ? null : value;
      //need to be waited in case of autocomplete
      await this.$nextTick();
      this.change();
    },
    getValue(value) {
      return null === value ? 'null' : value;
    },
    resetValues() {
      this.state.input.options.values.splice(0);
    }
  },
  computed: {
    autocomplete() {
      return 'select_autocomplete' === this.state.input.type && this.state.input.options.usecompleter;
    },

  },
  watch:{
    async notvalid(value) {
      await this.$nextTick();
      if (this.select2) {
       this.select2.data('select2').$container[value ? "addClass" : "removeClass"]("input-error-validation")
      }
    }
  }
};