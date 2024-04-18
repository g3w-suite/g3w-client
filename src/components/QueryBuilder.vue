<!--
  @file
  @since v3.7
-->

<template>
  <div id="query_builder" class="form-group" style="flex-wrap: nowrap !important">
    <div id="query_builder_header"></div>
      <div id="query_builder_layers" class="margin-between-element">
        <label class="querybuilder-title" v-t="'sdk.querybuilder.panel.layers'"></label>
        <select id="query_builder_layers_select" class="form-control">
          <option v-for="(layer, index) in layers" :key="layer.label" :value="index" class="bold">{{ layer.label }}</option>
        </select>
      </div>
      <div id="query_builder_fields" class="margin-between-element">
        <div id="query_builder_fields_title" class="querybuilder-title" v-t="'sdk.querybuilder.panel.fields'"></div>
        <div id="query_builder_fields_content" class="querybuilder-content">
          <table class="table table-striped content-table">
            <tbody>
              <tr v-for="{name, label} in fields" :key="name" @click="select.field = name" @dblclick="addToExpression({value: name, type: 'field'})" :class="{'skin-background-color lighten': select.field===name}" style="cursor: pointer">
                <th scope="row">{{ label }}</th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div id="query_builder_values" class="margin-between-element">
        <div id="query_builder_values_title" class="querybuilder-title" v-t="'sdk.querybuilder.panel.values'"></div>
        <div v-if="!manual" id="query_builder_values_content" class="querybuilder-content margin-between-element">
          <bar-loader :loading="loading.values"/>
          <table class="table table-striped content-table">
            <tbody>
              <tr v-for="value in values" @click="select.value = value" :class="{'skin-background-color lighten': select.value===value}" :key="value" @dblclick="addToExpression({value: value, type: 'value'})" style="cursor: pointer">
                <th scope="row">{{ value }}</th>
              </tr>
              <tr>
                <th scope="row"></th>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else id="querybuilder-manual" class="margin-between-element" style="display:flex; justify-content: space-between; align-items: stretch">
          <input class="form-control" style="" v-model="manualvalue" style="border: 0;">
          <span style="cursor: pointer; font-size: 1.2em; background-color: white; color: #000000; padding: 8px;"
                @click="manualvalue && addToExpression({value: manualvalue, type: 'value'})"
                :class="g3wtemplate.getFontClass('plus')"></span>
        </div>
        <div id="query_builder_values_buttons" class="content-end skin-color">
          <button id="query_builder_values_buttons_sample" class="query_builder_button btn btn-secondary bold " v-t="'sdk.querybuilder.panel.button.manual'" @click="manual = true" :class="{'skin-border-color' : manual}"></button>
          <button id="query_builder_values_buttons_all" class="query_builder_button btn btn-secondary bold " v-t="'sdk.querybuilder.panel.button.all'" @click="all" :disabled="select.field === null" :class="{'skin-border-color' : !manual}"></button>
        </div>
      </div>
      <div id="query_builder_operators" class="margin-between-element" style="margin-top: auto !important">
        <div id="query_builder_operators_title" class="querybuilder-title" v-t="'sdk.querybuilder.panel.operators'"></div>
        <div id="query_builder_operators_content" class="content-wrap">
          <button v-for="operator in operators" @click="addToExpression({value: operator, type: 'operator'})" :key="operator" class="query_builder_button btn btn-secondary skin-color bold">{{ operator }}</button>
        </div>
      </div>
      <div id="query_builder_footer">
        <div id="query_builder_expression">
          <div id="query_builder_expression_title" class="querybuilder-title" v-t="'sdk.querybuilder.panel.expression'"></div>
          <div id="query_builder_expression_content">
            <textarea style="width: 100%; resize: none; height: 100px; color:#000000" v-model="filter"></textarea>
          </div>
        </div>
        <div id="query_builder_message" class="margin-between-element">
          <bar-loader :loading="loading.test"/>
          <span class="bold skin-color" v-show="message" v-t="'sdk.querybuilder.messages.number_of_features'"></span><span class="bold skin-color">{{message}}</span>
        </div>
        <div id="query_builder_footer_buttons" class="content-end margin-between-element">
          <button class="query_builder_button btn btn-secondary  bold" @click="test" :disabled="disabled" v-t="'sdk.querybuilder.panel.button.test'"></button>
          <button class="query_builder_button btn btn-secondary  bold" @click="reset" v-t="'sdk.querybuilder.panel.button.clear'"></button>
          <button class="query_builder_button btn btn-secondary  bold" @click="run" :disabled="disabled" v-t="'sdk.querybuilder.panel.button.run'"></button>
          <button class="query_builder_button btn btn-secondary  bold" @click="save" :disabled="disabled" v-t="'sdk.querybuilder.panel.button.save'"></button>
        </div>
      </div>
  </div>
</template>

<script>
import QueryBuilderService from 'services/querybuilder';
import { FILTER_OPERATORS as OPERATORS } from 'app/constant';
import ProjectsRegistry from 'store/projects';

const operators = Object.values(OPERATORS);

export default {

  /** @since 3.8.6 */
  name: 'query-builder',

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
    'select.field'(){
      this.values = [];
      this.manual = true;
    }
  },
  methods: {
    addToExpression({value, type}={}){
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
    async all(){
      this.loading.values = true;
      try {
        this.values = await QueryBuilderService.getValues({
          layerId: this.currentlayer.id,
          field: this.select.field
        });
      } catch(err){}
      this.loading.values = false;
      await this.$nextTick();
      this.manualvalue = null;
      this.manual = false;
    },
    reset(){
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
        number_of_features = await QueryBuilderService.test({
          layerId,
          filter: this.filter
        });
        this.message = number_of_features !== undefined ? ` ${number_of_features}` : ''
      } catch(err){
        this.message = err;
      }
      this.loading.test = false;
      await this.$nextTick();
    },
    async run(){
      const layerId = this.currentlayer.id;
      this.loading.test = true;
      try {
        const response = await QueryBuilderService.run({
          layerId,
          filter: this.filter
        });
      } catch(err){}
      this.loading.test = false;
    },
    save() {
      QueryBuilderService.save({
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
        fields: layer.fields.filter(field => field.show).map(({label, name}) => ({
          label,
          name
        })).filter(field => excludejoinfields.indexOf(field) === -1)
      }
    });
    this.operators = operators;
    this.currentlayer = this.edit ? this.layers.find(layer => layer.id === this.$options.options.layerId) : this.layers[0];
  },
  async mounted(){
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
  beforeDestroy(){
    this.select2.select2('destroy');
    this.select2 = null;
  }
};
</script>