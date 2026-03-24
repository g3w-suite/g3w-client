<!--
  @file
  @since v3.7
-->

<template>
  <div id = "query_builder" class = "form-group">

    <!-- SEARCH LAYER -->
    <div
      id    = "query_builder_layers"
      class = "mb-5">
      <label>{{ $t('EXPRESSION') }}</label>
      <a
        :href           = "`https://g3w-suite.readthedocs.io/en/v3.9.x/g3wsuite_client.html#search-and-query-builder`"
        target          = "_blank"
        style           = "float: right;"
        data-i18n-title = "Docs"
        data-placement  = "right"
      >
        <i aria-hidden = "true" class = "fa fa-external-link-alt"></i>
      </a>
      <x-select
        :value     = "Math.max(layers.indexOf(currentlayer), 0)"
        @change    = "onCurrentlayerChange"
        style      = "color: #000;"
        searchable
      >
        <x-option v-for = "(layer, i) in layers" :key = "layer.label" :value = "i">{{ layer.label }}</x-option>
      </x-select>
    </div>

    <!-- SEARCH EXPRESSION -->
    <textarea id = "query_builder_expression_content" v-model = "filter"></textarea>

    <bar-loader :loading = "loading.test"/>

    <b
      class   = "skin-color"
      v-show  = "message"
    >{{ $t('Features found:') }} {{ message }}</b>

    <div style="display: flex; flex-wrap: wrap; justify-content: flex-end; margin-top: 5px;">
      <button
        class     = "query_builder_button btn btn-secondary bold"
        @click    = "run"
        :disabled = "disabled"
      >
        <i aria-hidden = "true" class = "fas fa-play" style = "color: green;"></i>
        {{ $t('RUN') }}
      </button>
      <button
        class     = "query_builder_button btn btn-secondary bold"
        @click    = "reset"
      >
        <i aria-hidden = "true" class = "fas fa-broom"></i>
        {{ $t('CLEAR') }}
      </button>
      <button
        class     = "query_builder_button btn btn-secondary bold"
        @click    = "save"
        :disabled = "disabled"
      >
        <i aria-hidden = "true" class = "far fa-save"></i>
        {{ $t('SAVE') }}
      </button>
    </div>

    <hr>

    <label>{{ $t('FIELDS') }}</label>

    <!-- SEARCH FIELDS -->
    <select ref = "search_fields" size = "4" class = "mb-5">
      <option selected hidden></option>
      <option
        v-for     = "field in fields"
        :key      = "field.name"
        @click    = "select.field = field.name; addToExpression({ value: field.name, type: 'field' })"
      >{{ field.label }}</option>
    </select>

    <!-- SEARCH OPERATORS -->
    <div class = "mb-5" style = "display: flex; flex-wrap: wrap;">
      <button
        v-for  = "operator in ['>=', '<=', '!=', '=', '>', '<', 'IN', 'LIKE', 'ILIKE', 'AND', 'OR' ]"
        @click = "addToExpression({ value: operator, type: 'operator' })"
        :key   = "operator"
        class  = "query_builder_button btn btn-secondary bold"
      >{{ operator }}</button>
    </div>

    <bar-loader :loading = "loading.values" />

    <!-- SEARCH VALUES -->
    <select v-if = "!manual" ref = "search_values" size = "4" class = "mb-5">
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
      <i aria-hidden = "true" class = "fas fa-search"></i>
      {{ $t('SEARCH A VALUE') }}
    </button>

  </div>

</template>

<script>
import ApplicationState            from 'g3w-state';
import GUI                         from 'g3w-app';
import { getUniqueDomId }          from 'utils/getUniqueDomId';
import { createFilterFromString }  from 'utils/createFilterFromString';
import { XHR }                     from 'utils/XHR';
import { getCatalogLayerById }     from 'utils/getCatalogLayerById';
import { gettext as _ }            from 'g3w-i18n';

export default {

  /** @since 3.8.6 */
  name: 'query-builder',

  data() {
    return {
      edit:         undefined !== this.$options.options,
      currentlayer: null,
      message:      '',
      filter:       this.$options?.options?.filter ?? '',
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
      },
    }
  },

  computed:{

    fields() {
      return this?.currentlayer?.fields ?? [];
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
            url: getCatalogLayerById(layerId).getUrl('data'),
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
        const layer       = getCatalogLayerById(this.currentlayer.id);
        const { data }    = await GUI.getData('search:features', {
          inputs: {
            layer,
            filter:        createFilterFromString({ layer, filter: this.filter }),
            feature_count: 100,
          },
          outputs: true,
        });
        const n           = data.length && data[0].features.length; // number of features
        this.message      = undefined === n ? '' : ` ${n}`;
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
      const id      = this.projectId || ApplicationState.project.getId();
      const edit_id = this.edit && this.$options.options.id;
      const item    = window.localStorage.getItem('QUERYBUILDERSEARCHES');
      //get stored query builder searches
      let searches  = item ? JSON.parse(item) : undefined;

      let query;

      try {
        query = {
          layerId:   this.currentlayer.id,
          filter:    this.filter,
          layerName: getCatalogLayerById(this.currentlayer.id).getName(),
          name:      edit_id ? (this.edit && this.$options.options.name) : (await GUI.prompt(_('Insert the name of the new search'), '')),
          id:        edit_id || getUniqueDomId(),
        };

        // edit local item
        if (edit_id) {
          const i = searches[id].findIndex(s => query.id === s.id);
          if (-1 !== i) {
            searches[id][i] = query;
          }
        }

        // add local item
        else {
          GUI.getService('search').state.querybuildersearches.push(query); // add query builder search
          if (undefined === searches) {
            searches     = { [id]: [query] };
          } else {
            searches[id] = [...(searches[id] || []), query];
          }
        }
      } catch(e) {
        console.warn(e);
        return;
      }

      // reset items
      const ITEMS = ApplicationState.querybuilder.searches;

      ITEMS[id]   = ITEMS[id] ?? [];
      
      try {
        window.localStorage.setItem('QUERYBUILDERSEARCHES', JSON.stringify(searches));
      } catch(e) {
        console.warn(e);
      }

      setTimeout(() => { searches[id].forEach(q => ITEMS[id].push(q)); }, 0);
      ITEMS[id].splice(0);
      GUI.showUserMessage({ type: 'success', message: _('Saved'), autoclose: true });
    },

    /**
     * @since 4.1.0
     */
    onCurrentlayerChange(e) {
      this.currentlayer = this.layers[e.target.value];
      this.select.field = null;
      this.select.value = null;
      this.reset();
    },

  },

  created() {

    this.filterElement = {
      current:  null,
      previous: null,
      operator: null
    };

    const project = ApplicationState.project;

    this.layers   = project
      .getLayers()
      .filter(l => !l.baselayer && Array.isArray(l.fields))
      .map(layer => {
        // exclude join fields
        let exclude = [];
        project.state.relations
          .filter(r => layer.id === r.referencedLayer && 'ONE' === r.type) // get relations by layerId
          .forEach(r => {
            const l = project.getLayerById(r.referencingLayer);
            r.customPrefix = r?.customPrefix ?? `${l.getName()}_`;
            exclude = [...exclude, ...l.getFields().map(({ name }) => `${r.customPrefix}${name}`)];
          });
        return {
          id:     layer.id,
          label:  layer.title,
          fields: layer.fields.filter(f => f.show).map(({ label, name }) => ({ label, name })).filter(f => !exclude.includes(f))
        }
      });

    this.currentlayer = this.edit ? this.layers.find(l => this.$options.options.layerId === l.id) : this.layers[0];

  },

};
</script>

<style scoped>
#query_builder {
  margin-bottom: 0;
  height: 100%;
  display: flex;
  flex-wrap: nowrap;
  flex-direction: column;
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
.mb-5 {
  margin-bottom: 5px;
}
#query_builder_expression_content {
  width: 100%;
  resize: none;
  height: 100px;
  color:#000;
}
</style>