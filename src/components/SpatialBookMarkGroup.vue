<!--
  @file
  @since v3.8
-->

<template>
  <li>
    <div style="font-weight: bold; width: 100%;" :style="{borderBottom: group.expanded ? '2px solid #2c3b41' : 'none'}"
      @click.stop="group.expanded = !group.expanded">
      <span
        :class="[g3wtemplate.getFontClass(group.expanded ? 'caret-down' : 'caret-right')]"
        style="margin-right: 5px;"
      >
      </span>
      <span>{{group.name}}</span>
    </div>
    <ul style="margin-left: 10px;" v-show="group.expanded">
      <spatial-book-mark-item v-for="node in group.nodes" :bookmark="node"/>
    </ul>
  </li>
</template>

<script>
  import SpatialBookMarkItem from "components/SpatialBookMarkItem.vue";

  export default {
    props: {
      group: {
        type: Object,
        /**
         * {
         *  name: <String>
         *  nodes: <Array [spatial bookmark items]> see -> SpatialBookMarkItem.vue
         * }
         */
        required: true
      }
    },
    components: {
      SpatialBookMarkItem
    },
    methods: {},
    async mounted() {}
  };
</script>

<style scoped>
</style>