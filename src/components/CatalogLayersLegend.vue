<!--
  @file
  @since v3.7
-->

<template>
  <div role="tabpanel" class="tab-pane" :class="{active:active}" id="legend">
    <layerslegend-items :active="active" :legend="legend" :layers="visiblelayers"></layerslegend-items>
  </div>
</template>

<script>
export default {
  props: ['layerstree', 'legend', 'active'],
  data() {
    return {}
  },
  computed: {
    visiblelayers(){
      let _visiblelayers = [];
      const layerstree = this.layerstree.tree;
      let traverse = obj => {
        for (const layer of obj) {
          if (!_.isNil(layer.id) && layer.visible && layer.geolayer && !layer.exclude_from_legend) _visiblelayers.push(layer);
          if (!_.isNil(layer.nodes)) traverse(layer.nodes);
        }
      };
      traverse(layerstree);
      return _visiblelayers;
    }
  },
  watch: {
    'layerstree': {
      handler(val, old){},
      deep: true
    },
    'visiblelayers'(visibleLayers) {
      const show = !!visibleLayers.length;
      this.$emit('showlegend', show);
    }
  },
  created() {
    const show = !!this.visiblelayers.length;
    this.$emit('showlegend', show);
  }
};
</script>