/**
 * @file
 * @since v3.7
 */

export default {
  methods: {
    findAttributeFormMetadataAttribute(name) {
      return this.state.metadata ? undefined !== this.state.metadata[name] : false;
    },
    findMetadataAttribute(name) {
      return this.state[name] !== undefined;
    }
  }
};