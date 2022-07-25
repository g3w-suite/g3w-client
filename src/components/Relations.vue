<!-- ORIGINAL SOURCE: -->
<!-- gui/relations/vue/relations.html@v3.4 -->
<!-- gui/relations/vue/relations.js@v3.4 -->

<template>
  <div class="query-relations" style="overflow-y:auto">
    <div class="header">
      <div>
        <span style="font-size: 1.2em;" v-t:pre="'sdk.relations.list_of_relations_feature'"> </span>
        <span v-for="info in featureInfo()"><b>{{ info.key }}</b>: {{ info.value }} </span>
      </div>
    </div>
    <table v-show="!loading" class="table table-striped table-hover relations-table">
      <thead>
      </thead>
      <tbody>
      <tr @click="showRelation(relation)" v-for="relation in relations" style="cursor:pointer">
        <td style="padding: 2px; display: flex; justify-content: space-between; align-items: baseline" class="skin-color">
          <span>{{ relation.name }}</span>
          <span :class="g3wtemplate.getFontClass('arrow-right')" aria-hidden="true"></span>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  props: ['relations', 'feature','loading'],
  methods: {
    showRelation(relation) {
      this.$parent.showRelation(relation);
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
  mounted() {
    if (this.relations.length === 1) {
      const relation = this.relations[0];
      relation.noback = true;
      this.showRelation(relation);
    }
  },
  beforeDestroy() {
    if (this.relations.length === 1) {
      delete this.relations[0].noback;
    }
  }
};
</script>