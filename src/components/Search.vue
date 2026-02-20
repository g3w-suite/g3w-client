<!--
  @file
  @since v3.7
-->

<template>
  <ul
    id    = "g3w-search"
    class = "treeview-menu g3w-search g3w-tools menu-items"
  >

    <!-- SAVED SEARCHES (from g3w-admin) -->
    <li
      v-for  = "search in state.searches"
      class  = "menu-item"
      @click = "showPanel(search)"
    >
      <i aria-hidden = "true" class = "far fa-circle"></i>
      <span>{{ search.name }}</span>
    </li>

    <li v-for = "searchtool in state.tools">
      <g3w-tool :tool = "searchtool" />
    </li>

    <!-- ORIGINAL SOURCE: src/components/QueryBuilderSearch.vue@v3.9.3 -->
    <li
      v-for = "(search, i) in state.querybuildersearches"
      :key  = "search.id"
    >
      <div style = "position:relative" @click = "edit(search)">
        <bar-loader :loading = "search.qbloading"/>
        <div class = "search-tools">
          <button
            type           = "button"
            class          = "fas fa-trash"
            title          = "Delete"
            data-placement = "bottom"
            @click.stop    = "remove(search, i)"
            style          = "color: red;margin-right: 5px;"
          ></button>
          <span>{{ search.name }}</span>
          <button
            type           = "button"
            class          = "fas fa-play"
            title          = "Run"
            data-placement = "bottom"
            @click.stop    = "run(search)"
            style          = "color: green;margin-left: auto;"
          ></button>
        </div>
      </div>
    </li>

    <!-- QUERY BUILDER -->
    <li class = "menu-item" @click.stop = "showQueyBuilderPanel">
       <i aria-hidden = "true" class = "fas fa-calculator"></i>
      <span v-t = "'Advanced search'"></span>
    </li>

  </ul>
</template>

<script>
import Panel                       from 'g3w-panel';
import ApplicationState            from 'g3w-state'
import GUI                         from 'g3w-app';
import { createFilterFromString }  from 'utils/createFilterFromString';
import { getCatalogLayerById }     from 'utils/getCatalogLayerById';

import G3WTool                     from 'components/Tool.vue';
import vueComp                     from 'components/QueryBuilder.vue';
import { gettext as _ }            from 'g3w-i18n';

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

  methods: {
    /**@since 4.1.0  ORIGINAL SOURCE: src/g3w-app.js@v4.0.0*/
    showQueyBuilderPanel() {
      GUI.closeContent();
      GUI.closeSideBar();
      return new Panel({
        title: _('Advanced search'),
        show: true,
        vueComponentObject: vueComp
      });
    },

    showPanel(config = {}) {
      this.$options.service.showPanel(config);
    },

    /**
     * ORIGINAL SOURCE: src/services/querybuilder.js@v3.9.3
     */
    async remove(search, index) {
      const ok = await GUI.confirm(_('Do you want delete it?'));

      if (!ok) {
        return;
      }

      const item     = window.localStorage.getItem('QUERYBUILDERSEARCHES');
      const items    = item ? JSON.parse(item) : undefined;
      const pid      = ApplicationState.project.getId();
      const searches = (items ? items[pid] || [] : []).filter(item => search.id !== item.id);

      if (searches.length) {
        items[pid] = searches;
      } else {
        delete items[pid];
      }

      try {
        if (Object.keys(items).length) {
          window.localStorage.setItem('QUERYBUILDERSEARCHES', JSON.stringify(items));
        } else {
          window.localStorage.removeItem('QUERYBUILDERSEARCHES');
        }
      } catch(e) {
        console.warn(e);
      }

      this.state.querybuildersearches.splice(index, 1); // remove item
    },

    edit(search) {
      const opts = {
        id:            search.id,
        name:          search.name,
        layerId:       search.layerId,
        filter:        search.filter,
        title:         _('Advanced search'),
        show:          true,
      };
      opts.internalPanel = new (Vue.extend(vueComp))({ options: opts });
      new Panel(opts);
    },

    /**
     * ORIGINAL SOURCE: src/services/querybuilder.js@v3.9.3
     */
    async run(search) {
      search.qbloading = true;
      try {
        const layer = getCatalogLayerById(search.layerId);
        await GUI.getData('search:features', {
          inputs: {
            layer,
            filter: createFilterFromString({ layer, filter: search.filter }),
            feature_count: 100,
          },
          outputs: true,
        });
      } catch(e) {
        console.warn(e);
        GUI.showUserMessage({ type: 'alert', message: 'An error occurs. Please check the query', autoclose: true });
      }
      search.qbloading = false;
    },

  },

};
</script>

<style scoped>
li.menu-item {
  padding-right: 20px !important;
}
li.menu-item span {
  display: inline-flex;
  white-space: pre-wrap;
}
#g3w-search li i {
  width: 20px;
}
.search-tools {
  display:flex;
  align-items: baseline;
}
.search-tools > span {
  white-space: pre-wrap;
}
.search-tools > button {
  text-shadow: 0 2px 5px rgba(0,0,0,.3);
  padding: 0 4px;
  border: none;
  background-color: unset;
}
</style>