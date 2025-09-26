<!--
  @file
  @since v3.7
-->

<template>
  <div class = "query-relations">
    <div class = "header skin-background-color lighten">
      <span
        style   = "font-size: 1.1em;"
        v-t:pre = "'List of relations of feature'"
      > </span>
      <ul style="padding: 1em 0 0 15px; list-style: square;">
        <li v-for = "info in featureInfo()"><b>{{ info.key }}</b>: {{ info.value }}</li>
      </ul>
    </div>
    <div style = "display: grid; grid-template-columns: repeat(2, auto); grid-column-gap: 5px;grid-row-gap: 5px;">
      <div
        v-for       = "relation in relations"
        @click.stop = "showRelation(relation)"
        class       = "skin-border-color relation-grid-item"
      >
        <i class="fas fa-sitemap" style="padding: 6px;"></i>
        <b style = "padding: 5px; overflow: hidden; white-space: normal; overflow-wrap: break-word;">{{ relation.name }}</b>
      </div>
    </div>
  </div>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: 'relations',

  props: [
    'relations',
    'feature',
    'loading',
  ],

  methods: {

    /**
     * @param relation 
     */
    async showRelation(relation) {
      await this.$parent.showRelation(relation);
    },

    /**
     * Array of parent feature attributes [max three attributes]
     */
    featureInfo() {
      return Object
        .entries(this.feature.attributes)
        .filter(([_, value]) => (value && 'string' === typeof value && !value.includes('/')))
        .map(([key, value]) => ({key, value})).slice(0,3)
    },

  },

  /**
   * @FIXME add description
   */
  async mounted() {
    if (1 === this.relations.length) {
      this.relations[0].noback = true;
      await this.showRelation(this.relations[0]);
    }
  },

  /**
   * @FIXME add description
   */
  beforeDestroy() {
    if (1 === this.relations.length) {
      delete this.relations[0].noback;
    }
  },

};
</script>
<style scoped>
  .relation-grid-item {
    min-width: 0;
    min-height: 80px;
    border: 2px solid;
    cursor:pointer;
    border-radius: 4px;
    background-color: #ffffff;
    display: flex;
    align-items: center;
  }
  .relation-grid-item:hover {
    background-color: transparent;
  }
  .query-relations {
    overflow-y: auto;
  }
  .header {
    margin: 5px 0 10px 0;
    padding: 5px;
  }
</style>