<!--
  @file
  @since v3.7
-->

<template>
  <div id = "query_builder" class = "form-group">

    <!-- SEARCH LAYER -->
    <div
      id    = "query_builder_layers"
      class = "margin-between-element">
      <label
        class = "querybuilder-title"
        v-t   = "'sdk.querybuilder.panel.expression'">
      </label>
      <a
        :href  = "`https://g3w-suite.readthedocs.io/en/v3.7.x/g3wsuite_client.html#search-and-query-builder`"
        target = "_blank"
        style  = "float: right;"
        title  = "Docs"
      >
        <i :class = "g3wtemplate.getFontClass('external-link')"></i>
      </a>
      <select id = "query_builder_layers_select" class = "form-control">
        <option
          v-for  = "(layer, i) in layers"
          :key   = "layer.label"
          :value = "i"
          class  = "bold"
        >{{ layer.label }}</option>
      </select>
    </div>

    <!-- SEARCH EXPRESSION -->
    <textarea id = "query_builder_expression_content" v-model = "filter"></textarea>

    <bar-loader :loading = "loading.test"/>

    <b
      class   = "skin-color"
      v-show  = "message"
    ><span v-t = "'sdk.querybuilder.messages.number_of_features'"></span>{{ message }}</b>

    <div class = "content-end">
      <button
        class     = "query_builder_button btn btn-secondary bold"
        @click    = "run"
        :disabled = "disabled"
        v-t       = "'sdk.querybuilder.panel.button.run'"
      ><i :class = "g3wtemplate.getFontClass('run')" style = "color: green;"></i></button>
      <button
        class     = "query_builder_button btn btn-secondary bold"
        @click    = "reset"
        v-t       = "'sdk.querybuilder.panel.button.clear'"
      ><i :class = "g3wtemplate.getFontClass('clear')"></i></button>
      <button
        class     = "query_builder_button btn btn-secondary bold"
        @click    = "save"
        :disabled = "disabled"
        v-t       = "'sdk.querybuilder.panel.button.save'"
      ><i :class = "g3wtemplate.getFontClass('save')"></i></button>
    </div>

    <hr>

    <label v-t = "'sdk.querybuilder.panel.fields'"></label>

    <!-- SEARCH FIELDS -->
    <select ref = "search_fields" size = "4" class = "margin-between-element">
      <option selected hidden></option>
      <option
        v-for     = "field in fields"
        :key      = "field.name"
        @click    = "select.field = field.name; addToExpression({ value: field.name, type: 'field' })"
      >{{ field.label }}</option>
    </select>

    <!-- SEARCH OPERATORS -->
    <div class = "content-wrap margin-between-element">
      <button
        v-for  = "operator in operators"
        @click = "addToExpression({ value: operator, type: 'operator' })"
        :key   = "operator"
        class  = "query_builder_button btn btn-secondary bold"
      >{{ operator }}</button>
    </div>

    <bar-loader :loading = "loading.values" />

    <!-- SEARCH VALUES -->
    <select v-if = "!manual" ref = "search_values" size = "4" class = "margin-between-element">
      <option selected hidden></option>
      <option
        v-for     = "[key, value] in values"
        @click    = "select.value = key; addToExpression({ value: key, type: 'value' })"
        :key      = "key"
      >{{ value }}</option>
    </select>

    <button
      v-if      = "select.field !== null && !values.length"
      class     = "btn btn-secondary bold"
      @click    = "all"
      :class    = "{'skin-border-color' : !manual }"
      style     = "color: #000;"
    >
      <i :class = "g3wtemplate.getFontClass('search')"></i>
      <span v-t = "'sdk.querybuilder.panel.button.all'"></span>
    </button>

  </div>

</template>

<script>
import { FILTER_OPERATORS }        from 'g3w-constants';
import ApplicationState            from 'store/application-state';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry            from 'store/projects';
import DataRouterService           from 'services/data';
import GUI                         from 'services/gui';
import { getUniqueDomId }          from 'utils/getUniqueDomId';
import { createFilterFromString }  from 'utils/createFilterFromString';
import { XHR }                     from 'utils/XHR';

const { t } = require('g3w-i18n');

export default {

  /** @since 3.8.6 */
  name: 'query-builder',

  data() {
    return {
      edit:         undefined !== this.$options.options,
      currentlayer: null,
      message:      '',
      filter:       (undefined !== this.$options.options ? this.$options.options.filter : ''),
      loading: {
        test:   false,
        values: false
      },
      values:      [],
      manual:      true,
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
    },

  },

  watch: {

    'select.field'() {
      this.values = [];
      this.manual = true;
    },

  },

  methods: {

    addToExpression({ value, type } = {}) {
      switch(type) {
        case 'operator': value = ` ${value} `; break;
        case 'field':    value = `"${value}"`; break;
        case 'value':    value = `'${value}'`; break;
      }
      if (value) this.filter = (`${this.filter}${value}`);
    },

    /**
     * ORIGINAL SOURCE: src/services/querybuilder.js@v3.9.3
     */
    async all() {
      this.loading.values = true;
      try {
        let layerId    = this.currentlayer.id;
        let field      = this.select.field;
        let CACHE      = ApplicationState.querybuilder.cache;
        CACHE[layerId] = CACHE[layerId] || {};
        if (undefined !== CACHE[layerId][field]) {
          this.values = CACHE[layerId][field];
        } else {
          const response = await XHR.get({
            url: CatalogLayersStoresRegistry.getLayerById(layerId).getUrl('data'),
            params: { ordering: field, formatter: 1, fformatter: field }
          });
          if (response.result) {
            CACHE[layerId][field] = CACHE[layerId][field] || response.data;
          }
          this.values = CACHE[layerId][field] || [];
        }
      } catch(e) {
        console.warn(e);
      }
      this.loading.values = false;
      await this.$nextTick();
      this.manualvalue    = null;
      this.manual         = false;
    },

    reset() {
      this.filter                 = '';
      this.message                = '';
      this.filterElement.previous = null;
      this.filterElement.current  = null;
      this.filterElement.operator = null;
      this.select.field           = null;
      if (this.$refs.search_fields) { this.$refs.search_fields.selectedIndex = -1 }
      if (this.$refs.search_values) { this.$refs.search_values.selectedIndex = -1 }
    },

    /**
     * ORIGINAL SOURCE: src/services/querybuilder.js@v3.9.3
     */
    async run() {
      try {
        this.loading.test = true;
        const layer = CatalogLayersStoresRegistry.getLayerById(this.currentlayer.id);
        const { data } = await DataRouterService.getData('search:features', {
          inputs: {
            layer,
            filter: createFilterFromString({ layer, filter: this.filter }),
            feature_count: 100,
          },
          outputs: true,
        });
        const n         = data.length && data[0].features.length; // number of features
        this.message    = undefined !== n ? ` ${n}` : '';
        return data;
      } catch(e) {
        console.warn(e);
      } finally {
        this.loading.test = false;
      }
      
    },

    /**
     * ORIGINAL SOURCE: src/services/querybuilder.js@v3.9.3
     */
    async save() {
      const id      = this.projectId || ProjectsRegistry.getCurrentProject().getId();
      const edit_id = this.edit && this.$options.options.id;
      const item   = window.localStorage.getItem('QUERYBUILDERSEARCHES');
      let searches = item ? JSON.parse(item) : undefined;

      let query;

      try {
        query = {
          layerId:   this.currentlayer.id,
          filter:    this.filter,
          layerName: CatalogLayersStoresRegistry.getLayerById(this.currentlayer.id).getName(),
          name:      edit_id ? (this.edit && this.$options.options.name) : await (new Promise((res, rej) => { GUI.dialog.prompt(t('sdk.querybuilder.additem'), d => d ? res(d) : rej()) })),
          id:        edit_id || getUniqueDomId(),
        };

        // edit local item
        if (edit_id) {
          const i = searches[id].findIndex(s => s.id === query.id);
          if (-1 !== i) {
            searches[id][i] = query;
          }
        }

        // add local item
        else {
          GUI.getService('search').addQueryBuilderSearch(query);
          if (undefined === searches) {
            searches     = { [id]: [query] };
          } else {
            searches[id] = [...(searches[id] || []), query];
          }
        }
      } catch (e) {
        console.warn(e);
        return;
      }

      // reset items
      const ITEMS = ApplicationState.querybuilder.searches;
      
      try {
        window.localStorage.setItem('QUERYBUILDERSEARCHES', JSON.stringify(searches));
      } catch(e) {
        console.warn(e);
      }

      setTimeout(() => { searches[id].forEach(q => ITEMS[id].push(q)); }, 0);
      ITEMS[id].splice(0);
      GUI.showUserMessage({ type: 'success', message: t("sdk.querybuilder.messages.changed"), autoclose: true });
    },

  },

  created() {

    this.filterElement = {
      current:  null,
      previous: null,
      operator: null
    };

    const project = ProjectsRegistry.getCurrentProject();

    this.layers = project
      .getLayers()
      .filter(l => !l.baselayer && Array.isArray(l.fields))
      .map(layer => {
        // exclude join fields
        let exclude = [];
        project.state.relations
          .filter(r => layer.id === r.referencedLayer && 'ONE' === r.type) // get relations by layerId
          .forEach( r => {
            const l = project.getLayerById(r.referencingLayer);
            r.customPrefix = r.customPrefix === undefined ? `${l.getName()}_` : r.customPrefix;
            exclude = [...exclude, ...l.getFields().map(field => `${r.customPrefix}${field.name}`)];
          });
        return {
          id:     layer.id,
          label:  layer.title,
          fields: layer.fields.filter(f => f.show).map(f => ({ label: f.label, name: f.name })).filter(f => !exclude.includes(f))
        }
      });

    this.operators    = Object.values(FILTER_OPERATORS);

    this.currentlayer = this.edit ? this.layers.find(l => l.id === this.$options.options.layerId) : this.layers[0];

  },

  async mounted() {
    await this.$nextTick();

    this.select2 = $('#query_builder_layers_select').select2({ width: '100%' });

    if (this.edit) {
      this.select2.val(this.layers.indexOf(this.currentlayer));
      this.select2.trigger('change');
    }

    this.select2.on('select2:select', e => {
      this.currentlayer = this.layers[e.params.data.id];
      this.select.field = null;
      this.select.value = null;
      this.reset();
    });
  },

  beforeDestroy() {
    this.select2.select2('destroy');
    this.select2 = null;
  },

};
</script>

<style scoped>
#query_builder {
  font-family: monospace;
  margin-bottom: 0;
  height: 100%;
  display: flex;
  flex-wrap: nowrap;
  flex-direction: column;
}
#query_builder .select2.select2-container {
  font-weight: bold;
}
.querybuilder-title {
  color: #fff;
  font-weight: bold;
}
select {
  background-color: #fff;
  color: #000;
  border: none;
}
option {
  padding: 8px;
  cursor: pointer;
}
option:checked {
  background: var(--skin-color) linear-gradient(0deg, var(--skin-color) 0%, var(--skin-color) 100%);
  color: #fff;
}
option:nth-of-type(2n+1) {
  background-color: #f9f9f9;
}
.query_builder_button {
  margin: 1px;
  flex-basis: 78px;
  flex-grow: 1;
  color: #000;
}
.content-wrap {
  display: flex;
  flex-wrap: wrap;
}
.content-end {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 5px;
}
.margin-between-element {
  margin-bottom: 5px;
}
#query_builder_expression_content {
  width: 100%;
  resize: none;
  height: 100px;
  color:#000;
}
</style>