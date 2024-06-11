<!--
  @file
  @since v3.7
-->

<template>
  <div id="query_builder" class="form-group">

    <!-- SEARCH HEADER -->
    <div id="query_builder_header"></div>

    <!-- SEARCH LAYER -->
    <div
      id    = "query_builder_layers"
      class = "margin-between-element">
      <label
        class = "querybuilder-title"
        v-t   = "'sdk.querybuilder.panel.expression'">
      </label>
      <a :href="`https://g3w-suite.readthedocs.io/en/v3.7.x/g3wsuite_client.html#search-and-query-builder`" target="_blank" style="float: right;" title="Docs">
        <i :class="g3wtemplate.getFontClass('external-link')"></i>
      </a>
      <select id="query_builder_layers_select" class="form-control">
        <option
          v-for  = "(layer, i) in layers"
          :key   = "layer.label"
          :value = "i"
          class  = "bold"
        >{{ layer.label }}</option>
      </select>
    </div>

    <!-- SEARCH EXPRESSION -->
    <div id="query_builder_footer">
      <div id="query_builder_expression">
        <div id="query_builder_expression_content">
          <textarea v-model="filter"></textarea>
        </div>
      </div>
      <div
        id    = "query_builder_message"
        class = "margin-between-element"
      >
        <bar-loader :loading="loading.test"/>
        <span
          class  = "bold skin-color"
          v-show = "message"
          v-t    = "'sdk.querybuilder.messages.number_of_features'"
        ></span>
        <span class="bold skin-color">{{ message }}</span>
      </div>
      <div
        id    = "query_builder_footer_buttons"
        class = "content-end margin-between-element"
      >
        <button
          class     = "query_builder_button btn btn-secondary bold"
          @click    = "run"
          :disabled = "disabled"
          v-t       = "'sdk.querybuilder.panel.button.run'"
        ><i :class="g3wtemplate.getFontClass('run')" style="color: green;"></i></button>
        <button
          class     = "query_builder_button btn btn-secondary bold"
          @click    = "reset"
          v-t       = "'sdk.querybuilder.panel.button.clear'"
        ><i :class="g3wtemplate.getFontClass('clear')"></i></button>
        <button
          class     = "query_builder_button btn btn-secondary bold"
          @click    = "save"
          :disabled = "disabled"
          v-t       = "'sdk.querybuilder.panel.button.save'"
        ><i :class="g3wtemplate.getFontClass('save')"></i></button>
      </div>
    </div>

    <hr>

    <label v-t="'sdk.querybuilder.panel.fields'"></label>

    <!-- SEARCH FIELDS -->
    <div
      id    = "query_builder_fields"
      class = "margin-between-element"
    >
      <div
        id    = "query_builder_fields_content"
        class = "querybuilder-content"
      >
        <table class="table table-striped content-table">
          <tbody>
            <tr
              v-for     = "field in fields"
              :key      = "field.name"
              @click    = "select.field = field.name; addToExpression({ value: field.name, type: 'field' })"
              :class    = "{ 'skin-background-color lighten': select.field===field.name }"
              style     = "cursor: pointer"
            >
              <th scope="row">{{ field.label }}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SEARCH OPERATORS -->
    <div
      id    = "query_builder_operators"
      class = "margin-between-element"
    >
      <div
        id    = "query_builder_operators_content"
        class = "content-wrap"
      >
        <button
          v-for  = "operator in operators"
          @click = "addToExpression({ value: operator, type: 'operator' })"
          :key   = "operator"
          class  = "query_builder_button btn btn-secondary skin-color bold"
          >{{ operator }}</button>
      </div>
    </div>

    <!-- SEARCH VALUES -->
    <div
      id    = "query_builder_values"
      class = "margin-between-element"
    >
      <div
        v-if  = "!manual"
        id    = "query_builder_values_content"
        class = "querybuilder-content margin-between-element"
      >
        <bar-loader :loading="loading.values"/>

        <table class="table table-striped content-table">
          <tbody>
            <tr
              v-for     = "[key, value] in values"
              @click    = "select.value = key; addToExpression({ value: key, type: 'value' })"
              :class    = "{ 'skin-background-color lighten': select.value === key }"
              :key      = "key"
              style     = "cursor: pointer"
            >
              <th scope="row">{{ value }}</th>
            </tr>
            <tr>
              <th scope="row"></th>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        id    = "query_builder_values_buttons"
        class = "content-end skin-color"
      >
        <button
          v-if      = "select.field !== null && !values.length"
          id        = "query_builder_values_buttons_all"
          class     = "query_builder_button btn btn-secondary bold"
          @click    = "all"
          :class    = "{'skin-border-color' : !manual }"
        >
          <i :class = "g3wtemplate.getFontClass('search')"></i>
          <span v-t="'sdk.querybuilder.panel.button.all'"></span>
        </button>
      </div>
    </div>

  </div>
</template>

<script>
import { FILTER_OPERATORS }        from 'app/constant';
import ApplicationState            from 'store/application-state';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry            from 'store/projects';
import ApplicationService          from 'services/application';
import DataRouterService           from 'services/data';
import GUI                         from 'services/gui';
import { getUniqueDomId }          from 'utils/getUniqueDomId';
import { createFilterFromString }  from 'utils/createFilterFromString';
import { XHR }                     from 'utils/XHR';

const { t } = require('core/i18n/i18n.service');

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

    reset(){
      this.filter                 = '';
      this.message                = '';
      this.filterElement.previous = null;
      this.filterElement.current  = null;
      this.filterElement.operator = null;
      this.select.field           = null;
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
      let searches  = ApplicationService.getLocalItem('QUERYBUILDERSEARCHES');
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
      ApplicationService.setLocalItem({ id: 'QUERYBUILDERSEARCHES', data: searches });
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
        project
          .getRelationsByLayerId({ layerId: layer.id, type: 'ONE' })
          .forEach( r => {
            const l = project.getLayerById(r.referencingLayer);
            r.customPrefix = r.customPrefix === undefined ? `${l.getName()}_` : r.customPrefix;
            exclude = [...exclude, ...l.getFields().map(field => `${r.customPrefix}${field.name}`)];
          });
          console.log(layer);
        return {
          id:     layer.id,
          label:  layer.title,
          fields: layer.fields.filter(f => f.show).map(f => ({ label: f.label, name: f.name })).filter(f => -1 === exclude.indexOf(f))
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

  beforeDestroy(){
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
.querybuilder-content {
  max-height: 150px;
  min-height: 30px;
  background-color: #fff;
  overflow-y: auto;
}
.querybuilder-content .content-table {
  background-color: #fff;
  color: #000000;
  margin-bottom: 0;
  user-select: none;
}
.query_builder_button {
  margin: 1px;
  flex-basis: 78px;
  flex-grow: 1;
  color: #000000;
}
.content-wrap {
  display: flex;
  flex-wrap: wrap;
}
.content-end {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.margin-between-element {
  margin-bottom: 5px;
}
#query_builder_operators {
  margin-top: auto !important;
}
#query_builder_expression_content > textarea {
  width: 100%;
  resize: none;
  height: 100px;
  color:#000;
}
</style>