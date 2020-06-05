import { createCompiledTemplate } from 'gui/vue/utils';
import G3wFormInputs from '../../../../inputs/g3w-form-inputs.vue';
import Tabs from '../../../../tabs/tabs.vue';
const compiledTemplate = createCompiledTemplate(require('./body.html'));

const BodyFormComponent = Vue.extend({
  ...compiledTemplate,
  props: ['state'],
  data() {
    return {
      show: true
    }
  },
  components: {
    Tabs,
    G3wFormInputs
  },
  methods: {
    addToValidate: function(input) {
      this.$emit('addtovalidate', input);
    },
    changeInput: function(input) {
      this.$emit('changeinput', input);
    }
  },
  computed: {
    hasFormStructure() {
      return !!this.state.formstructure;
    }
  }
});

module.exports = BodyFormComponent;
