<template>
  <span
    v-if="edit"
    @click.stop="editFeature"
    v-t-tooltip:top.create="'sdk.tooltips.editing'"
  >
    <i
      class="action-button skin-color"
      :class="g3wtemplate.getFontClass('pencil')">
    </i>
  </span>
</template>

<script>
import GUI from 'services/gui';

export default {
  name: "TableEditingTool",
  props: {
    edit: {
      type: Boolean
    },
    feature: {
      type: Object
    },
    layer_id: {
      type: String,
    }
  },
  methods: {
    /**
     * @since 3.10.0
     * @param feature
     */
    editFeature() {
      GUI
        .getService('queryresults')
        .editFeature({
          layer: { id: this.layer_id },
          feature: this.feature
        })
    },
  }
}
</script>

<style scoped>

</style>