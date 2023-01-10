<!-- ORIGINAL SOURCE: -->
<!-- gui/relations/vue/relations.html@v3.4 -->
<!-- gui/relations/vue/relations.js@v3.4 -->

<template>
  <div class="query-relations" style="overflow-y:auto">
    <div class="header skin-background-color lighten"  style="margin-bottom: 10px; border-radius: 4px; padding: 5px;">
      <div class="skin-color-dark">
        <span style="font-size: 1.1em;" v-t:pre="'sdk.relations.list_of_relations_feature'"> </span>
        <span v-for="info in featureInfo()"><b>{{ info.key }}</b>: {{ info.value }} </span>
      </div>
    </div>
    <div class="query-relations-content" style="display: grid; grid-template-columns: repeat(2, auto); grid-column-gap: 5px; grid-row-gap: 5px;">
      <div @click="showRelation(relation)" v-for="relation in relations" class="skin-border-color relation-grid-item">
        <span style="font-weight: bold; padding: 5px;" class="skin-color g3w-long-text">{{ relation.name }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['relations', 'feature', 'loading'],
  methods: {
    async showRelation(relation) {
      await this.$parent.showRelation(relation);
    },
    featureInfo() {
      let infoFeatures = [];
      let index = 0;
      Object.entries(this.feature.attributes).forEach(([key, value]) => {
        if (index > 2) return false;
        if (value && _.isString(value) && value.indexOf('/') === -1 ) {
          infoFeatures.push({
            key: key,
            value: value
          });
          index+=1;
        }
      });
      return infoFeatures
    }
  },
  async mounted() {
    if (this.relations.length === 1) {
      const relation = this.relations[0];
      relation.noback = true;
      await this.showRelation(relation);
    }
  },
  beforeDestroy() {
    if (this.relations.length === 1) {
      delete this.relations[0].noback;
    }
  }
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

</style>