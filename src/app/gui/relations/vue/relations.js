import template from './relations.html';

export default {
  template,
  props: ['relations', 'feature', 'loading'],
  methods: {
    showRelation(relation) {
      this.$parent.showRelation(relation);
    },
    featureInfo() {
      const infoFeatures = [];
      let index = 0;
      Object.entries(this.feature.attributes).forEach(([key, value]) => {
        if (index > 2) return false;
        if (value && _.isString(value) && value.indexOf('/') === -1) {
          infoFeatures.push({
            key,
            value,
          });
          index += 1;
        }
      });
      return infoFeatures;
    },
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
  },
};
