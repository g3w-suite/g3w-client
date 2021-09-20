<template>
  <td v-if="actions.length" class="g3w-feature-actions">
    <action v-for="action in actions" :key="action.id" v-bind="$props":action="action">
    </action>
    <div v-if="downloadformats && downloadformats.formats.show">
      <downloadformats :formats="downloadformats.formats" :feature="feature" :layer="layer"></downloadformats>
    </div>
  </td>
</template>

<script>
  import Action from './action.vue';
  import DownloadFormats from './downloadformats.vue'
  export default {
    name: "actions",
    props: {
      featureIndex: {
        type: Number
      },
      feature: {
        type: Object
      },
      layer: {
        type: Object
      },
      trigger: {
        type: Function
      },
      actions: {
        type: Array,
        default: []
      },
    },
    components: {
      action: Action,
      downloadformats: DownloadFormats
    },
    computed: {
      downloadformats(){
        return this.actions.find(action => action.formats);
      }
    }
  }
</script>

<style scoped>

</style>