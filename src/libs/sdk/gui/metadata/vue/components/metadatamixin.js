export default {
  methods: {
    findAttributeFormMetadataAttribute(name) {
      return this.state.metadata ? this.state.metadata[name] !== undefined : false;
    },
    findMetadataAttribute(name) {
      return this.state[name] !== undefined;
    }
  }
}
