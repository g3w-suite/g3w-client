import {createCompiledTemplate} from 'gui/vue/utils';
import G3wFormInputs from '../../../../inputs/g3w-form-inputs.vue';
const compiledTemplate = createCompiledTemplate(require('./body.html'));

const BodyFormComponent = Vue.extend({
  ...compiledTemplate,
  props: ['state', 'handleRelation'],
  data() {
    return {
      show: true
    }
  },
  components: {
    G3wFormInputs
  },
  methods: {
    addToValidate(input) {
      this.$emit('addtovalidate', input);
    },
    removeToValidate(input){
      this.$emit('removetovalidate', input);
    },
    changeInput(input) {
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
