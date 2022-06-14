import Service from "../service";
import {OPERATORS} from 'core/layers/filter/operators';
import template from './querybuilder.html';
import ProjectsRegistry  from 'core/project/projectsregistry';
const operators = Object.values(OPERATORS);

const QueryBuilder = Vue.extend({
  template,
  data() {
    const options = this.$options.options;
    const edit = options !== undefined;
    return {
      edit,
      currentlayer: null,
      message: '',
      filter: edit ? options.filter : '',
      loading: {
        test: false,
        values: false
      },
      values: [],
      manual: true,
      manualvalue: null,
      select: {
        field: null,
        value: null
      }
    }
  },
  computed:{
    fields() {
      return this.currentlayer ? this.currentlayer.fields : [];
    },
    disabled() {
      return !this.filter;
    }
  },
  watch: {
    'select.field'() {
      this.values = [];
      this.manual = true;
    }
  },
  methods: {
    addToExpression({value, type}={}) {
      switch(type) {
        case 'operator':
          value = ` ${value} `;
          break;
        case 'field':
          value = `"${value}"`;
          break;
        case 'value':
          value = `'${value}'`;
          break;
      }
      if (value) this.filter = (`${this.filter}${value}`);
    },
    async all() {
      this.loading.values = true;
      try {
        this.values = await Service.getValues({
          layerId: this.currentlayer.id,
          field: this.select.field
        });
      } catch(err) {}
      this.loading.values = false;
      await this.$nextTick();
      this.manualvalue = null;
      this.manual = false;
    },
    reset() {
      this.filter = '';
      this.message = '';
      this.filterElement.previous = null;
      this.filterElement.current = null;
      this.filterElement.operator =null;
    },
    async test() {
      const layerId = this.currentlayer.id;
      this.loading.test = true;
      let number_of_features;
      try {
        number_of_features = await Service.test({
          layerId,
          filter: this.filter
        });
        this.message = number_of_features !== undefined ? ` ${number_of_features}` : ''
      } catch(err) {
        this.message = err;
      }
      this.loading.test = false;
      await this.$nextTick();
    },
    async run() {
      const layerId = this.currentlayer.id;
      this.loading.test = true;
      try {
        const response = await Service.run({
          layerId,
          filter: this.filter
        });
      } catch(err) {}
      this.loading.test = false;
    },
    save() {
      Service.save({
        layerId: this.currentlayer.id,
        filter: this.filter,
        projectId: this.projectId,
        name: this.edit && this.$options.options.name,
        id: this.edit && this.$options.options.id,
      });
    }
  },
  created() {
    this.filterElement = {
      current: null,
      previous: null,
      operator: null
    };
    const project = ProjectsRegistry.getCurrentProject();
    this.layers = project.getLayers().filter(layer => {
      return !layer.baselayer && layer.geometrytype && layer.geometrytype !== 'NoGeometry' && Array.isArray(layer.fields);
    }).map(layer => {
      const relations = project.getRelationsByLayerId({
        layerId: layer.id,
        type: 'ONE'
      });
      let excludejoinfields = [];
      relations.forEach( relation => {
        let {customPrefix} = relation;
        const joinLayer = project.getLayerById(relation.referencingLayer);
        customPrefix = customPrefix === undefined ? `${joinLayer.getName()}_` : customPrefix;
        const joinLayerFields = joinLayer.getFields().map(field => `${customPrefix}${field.name}`);
        excludejoinfields = [...excludejoinfields, ...joinLayerFields];
      });
      return {
        id: layer.id,
        label: layer.name,
        fields: layer.fields.map(field => ({
          label:field.label,
          name: field.name
        })).filter(field => excludejoinfields.indexOf(field) === -1)
      }
    });
    this.operators = operators;
    this.currentlayer = this.edit ? this.layers.find(layer => layer.id === this.$options.options.layerId) : this.layers[0];
  },
  async mounted() {
    await this.$nextTick();
    this.select2 = $('#query_builder_layers_select').select2({
      width: '100%',
    });
    if (this.edit) {
      const index = this.layers.indexOf(this.currentlayer);
      this.select2.val(index);
      this.select2.trigger('change');
    }
    this.select2.on('select2:select', (evt) => {
      this.currentlayer = this.layers[evt.params.data.id];
      this.select.field = null;
      this.select.value = null;
      this.reset();
    });
  },
  beforeDestroy() {
    this.select2.select2('destroy');
    this.select2 = null;
  }
});

export default  QueryBuilder;
