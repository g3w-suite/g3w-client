/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.mixins.js@v3.6
 */
export default {
  methods: {
    findAttributeFormMetadataAttribute(name) {
      return this.state.metadata ? this.state.metadata[name] !== undefined : false;
    },
    findMetadataAttribute(name) {
      return this.state[name] !== undefined;
    }
  }
};