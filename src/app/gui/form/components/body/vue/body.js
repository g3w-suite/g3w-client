import { createCompiledTemplate } from 'gui/vue/utils';
import G3wFormInputs from '../../../../inputs/g3w-form-inputs.vue';
import template from './body.html';

const BodyFormComponent = Vue.extend({
  template,
  props: ['state', 'handleRelation'],
  data() {
    return {
      show: true,
    };
  },
  components: {
    G3wFormInputs,
  },
  methods: {
    addToValidate(input) {
      this.$emit('addtovalidate', input);
    },
    changeInput(input) {
      this.$emit('changeinput', input);
    },
  },
  computed: {
    hasFormStructure() {
      return !!this.state.formstructure;
    },
  },
});

export default BodyFormComponent;
