import InputTableHeader from './components/input-table-header.vue';
import InputTableBody from './components/input-table-body.vue';

const Input = require('gui/inputs/input');

const TableInput = Vue.extend({
  mixins: [Input],
  template: require('./table.html'),
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

module.exports = TableInput;
