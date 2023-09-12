<!--
  @file
  @since v3.7
-->

<template>

  <div
    role="tabpanel"
    id="legend"
    class="tab-pane"
    :class="{active:active}"
  >

    <layerslegend-items
      :active="active"
      :legend="legend"
      :layers="visiblelayers"
    />

  </div>

</template>

<script>
export default {
  
  /** @since 3.8.6 */
  name: 'catalog-layers-legend',
  
  props: [
    'layerstree',
    'legend',
    'active'
  ],
  data() {
    return {}
  },
  computed: {
    visiblelayers() {
      let _visiblelayers = [];
      let traverse = obj => {
        for (const layer of obj) {
          if (!_.isNil(layer.id) && layer.visible && layer.geolayer && !layer.exclude_from_legend) {
            _visiblelayers.push(layer);
          }
          if (!_.isNil(layer.nodes)) {
            traverse(layer.nodes);
          }
        }
      };
      traverse(this.layerstree.tree);
      return _visiblelayers;
    }
  },
  watch: {
    'layerstree': {
      handler(val, old) {},
      deep: true
    },
    'visiblelayers'(visibleLayers) {
      this.$emit('showlegend', visibleLayers.length > 0);
    }
  },
  created() {
    this.$emit('showlegend', this.visiblelayers.length > 0);
  }
};
</script>