<!--
  @file
  @since v3.7
-->

<template>
  <ul id="g3w-search" class="treeview-menu g3w-search g3w-tools menu-items" v-if="show">
    <li v-for="search in state.searches" class="menu-item" @click="showPanel(search)">
      <i :class="g3wtemplate.getFontClass('empty-circle')"></i>
      <span>{{ search.name }}</span>
    </li>
    <li v-for="searchtool in state.searchtools">
      <g3w-tool :tool="searchtool"></g3w-tool>
    </li>
    <g3w-search-querybuilder v-for="(querybuildersearch, index) in state.querybuildersearches" :key="querybuildersearch.id"
      :querybuildersearch="querybuildersearch"  @delete="removeItem({type:'querybuilder', index:index})">
    </g3w-search-querybuilder>
  </ul>
</template>

<script>
import G3WTool from 'components/Tool.vue';
import G3WSearchQuerybuilder from 'components/QueryBuilderSearch.vue';

export default {

  /** @since 3.8.6 */
  name: 'search',

  data() {
    return {
      state: null
    }
  },
  components: {
    'g3w-tool': G3WTool,
    'g3w-search-querybuilder': G3WSearchQuerybuilder
  },
  computed: {
    show(){
      return this.state.searches.length + this.state.searchtools.length + this.state.querybuildersearches.length > 0;
    }
  },
  methods: {
    showPanel(config={}) {
      this.$options.service.showPanel(config);
    },
    removeItem({type, index}){
      this.$options.service.removeItem({
        type,
        index
      })
    }
  },
  async mounted() {
    await this.$nextTick();
    $('.icon-search-action').tooltip();
  }
};
</script>