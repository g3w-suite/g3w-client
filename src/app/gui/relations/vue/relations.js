import { createCompiledTemplate } from 'gui/vue/utils';
const compiledTemplate = createCompiledTemplate(require('./relations.html'));
module.exports =  {
  ...compiledTemplate,
  props: ['relations', 'feature','loading'],
  methods: {
    showRelation: function(relation) {
      this.$parent.showRelation(relation);
    },
    featureInfo: function() {
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