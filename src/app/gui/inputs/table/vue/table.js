import Input from 'gui/inputs/input';
import InputTableHeader from './components/input-table-header.vue';
import InputTableBody from './components/input-table-body.vue';
import template from './table.html';

const TableInput = Vue.extend({
  mixins: [Input],
  template,
  components: {
    InputTableHeader,
    InputTableBody,
  },
  computed: {
    headers() {
      return this.state.input.options.headers.map((header) => header.name);
    },
    columntypes() {
      return this.state.input.options.headers.map((header) => header.type);
    },
  },
  methods: {
    addRow() {
      this.state.value.push(new Array(this.headers.length));
    },
    deleteRow(index) {},
  },
});

export default TableInput;
