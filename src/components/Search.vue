<!--
  @file
  @since v3.7
-->

<template>
  <ul
    v-if  = "show"
    id    = "g3w-search"
    class ="treeview-menu g3w-search g3w-tools menu-items"
  >

    <!-- SAVED SEARCHES (from g3w-admin) -->
    <li
      v-for       = "search in state.searches"
      class       = "menu-item"
      @click.stop = "showPanel(search)"
    >
      <i :class="g3wtemplate.getFontClass('empty-circle')"></i>
      <span>{{ search.name }}</span>
    </li>

    <li v-for="searchtool in state.tools">
      <g3w-tool :tool="searchtool" />
    </li>

    <!-- ORIGINAL SOURCE: src/components/QueryBuilderSearch.vue@v3.9.3 -->
    <li
      v-for = "(search, i) in state.querybuildersearches"
      :key  = "search.id"
    >
      <div style="position:relative">
        <bar-loader :loading="search.qbloading"/>
        <div class="querybuliserch-tools">
          <i :class="g3wtemplate.getFontClass('filter')"></i>
          <span>{{ search.name }}</span>
          <div>
            <span
              class          = "icon-search-action skin-tooltip-bottom"
              data-placement = "bottom"
              data-toggle    = "tooltip"
              data-container = "body"
              v-t-tooltip    = "'sdk.querybuilder.search.run'"
            >
              <i @click.stop="run(search)" style="color: green;" :class="g3wtemplate.getFontClass('run')"></i>
            </span>
            <span
              class          = "icon-search-action skin-tooltip-bottom"
              data-placement = "bottom"
              data-toggle    = "tooltip"
              data-container = "body"
              v-t-tooltip    = "'sdk.querybuilder.search.info'"
            >
              <i @click.stop="search.qbshowinfo=!search.qbshowinfo" style="color: #FFF;" :class="g3wtemplate.getFontClass('info')"></i>
            </span>
            <span
              class          = "icon-search-action skin-tooltip-bottom"
              data-placement = "bottom"
              data-toggle    = "tooltip"
              data-container = "body"
              v-t-tooltip    = "'sdk.querybuilder.search.edit'"
            >
              <i @click.stop="edit(search)" style="color: #307095;" :class="g3wtemplate.getFontClass('pencil')"></i>
            </span>
            <span
              class          = "icon-search-action skin-tooltip-bottom"
              data-placement = "bottom"
              data-toggle    = "tooltip"
              data-container = "body"
              v-t-tooltip    = "'sdk.querybuilder.search.delete'"
            >
              <i @click.stop="remove(search, i)" style="color: red;" :class="g3wtemplate.getFontClass('trash')"></i>
            </span>
          </div>
        </div>
        <div class="querybuildsearch-info" v-show="search.qbshowinfo">
          <div>
            <span style="font-weight: bold; white-space: pre">LAYER: </span>
            <span style="white-space: pre-wrap;">{{ search.layerName }}</span>
          </div>
          <div>
            <span style="font-weight: bold;">EXPRESSION: </span>
            <span style="white-space: pre-wrap;">{{ search.filter }}</span>
          </div>
        </div>
      </div>
    </li>

  </ul>
</template>

<script>
import Panel                       from 'core/g3w-panel';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry            from 'store/projects';
import ApplicationService          from 'services/application';
import DataRouterService           from 'services/data';
import GUI                         from 'services/gui';
import { createFilterFromString }  from 'utils/createFilterFromString';

import G3WTool                     from 'components/Tool.vue';
import * as vueComp                from 'components/QueryBuilder.vue';

const { t } = require('core/i18n/i18n.service');

export default {

  /** @since 3.8.6 */
  name: 'search',

  data() {
    return {
      state: this.state || {},
    };
  },

  components: {
    'g3w-tool': G3WTool,
  },

  computed: {
    show() {
      return this.state.searches.length + this.state.tools.length + this.state.querybuildersearches.length > 0;
    }
  },

  methods: {

    showPanel(config = {}) {
      this.$options.service.showPanel(config);
    },

    /**
     * ORIGINAL SOURCE: src/services/querybuilder.js@v3.9.3
     */
    async remove(search, index) {
      try {
        await (new Promise((res, rej) => { GUI.dialog.confirm(t('sdk.querybuilder.delete'), d => d ? res() : rej()) }));
        const items     = ApplicationService.getLocalItem('QUERYBUILDERSEARCHES');
        const projectId = ProjectsRegistry.getCurrentProject().getId();
        const searches  = (items ? items[projectId] || [] : []).filter(item => item.id !== search.id);
        if (searches.length)           items[projectId] = searches;
        else                           delete items[projectId];
        if (Object.keys(items).length) ApplicationService.setLocalItem({ id: 'QUERYBUILDERSEARCHES', data: items });
        else                           ApplicationService.removeLocalItem('QUERYBUILDERSEARCHES');
        this.$options.service.removeItem({ type: 'querybuilder', index });
      } catch(e) {
        console.warn(e);
      }
    },

    edit(search) {
      const opts = {
        id:            search.id,
        name:          search.name,
        layerId:       search.layerId,
        filter:        search.filter,
        title:         'Query Builder',
        show:          true,
      };
      opts.internalPanel = new (Vue.extend(vueComp))(opts);
      new Panel(opts);
    },

    /**
     * ORIGINAL SOURCE: src/services/querybuilder.js@v3.9.3
     */
    async run(search) {
      search.qbloading = true;
      try {
        const layer = CatalogLayersStoresRegistry.getLayerById(search.layerId);
        await DataRouterService.getData('search:features', {
          inputs: {
            layer,
            filter: createFilterFromString({ layer, filter: search.filter }),
            feature_count: 100,
          },
          outputs: true,
        });
      } catch(e) {
        console.warn(e);
        GUI.showUserMessage({ type: 'alert', message: 'sdk.querybuilder.error_run', autoclose: true });
      }
      search.qbloading = false;
    },

  },

  async mounted() {
    await this.$nextTick();
    $('.icon-search-action').tooltip();
  },

};
</script>

<style scoped>
.querybuliserch-tools {
  display:flex;
  align-items: baseline;
}
.querybuliserch-tools > i {
  margin-right: 14px;
  margin-left: 1px;
}
.querybuliserch-tools > span {
  white-space: pre-wrap;
}
.querybuliserch-tools > div {
  margin-left: auto;
}
.querybuliserch-tools > div i {
  padding: 3px;
  font-size: 1.3em;
}
.querybuildsearch-info {
  margin-top: 5px; 
}
</style>