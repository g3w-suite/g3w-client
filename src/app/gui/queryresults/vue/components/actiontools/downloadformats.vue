<template>
  <div class="g3w-download-formats-content" style="width: 100%; display: flex" @click.prevent.stop="">
    <select  style="flex-grow: 1" v-select2="'download_format'" :search="false" class="form-control">
      <option v-for="action in config.actions" :key="action.id" v-t-download :value="action.format">
        <span style="font-weight: bold">{{action.format}}</span>
      </option>
    </select>
    <button style="border-radius: 0 3px 3px 0;" class="btn skin-button" @click.stop=download v-download>
      <span :class="g3wtemplate.getFontClass('download')">
      </span>
    </button>
  </div>
</template>

<script>
  import ApplicationState from 'core/applicationstate';
  export default {
    name: "downloadformats",
    data(){
      const download_format = this.config.actions[0].format;
      return {
        download_format
      }
    },
    props: {
      featureIndex: {
        type: Number,
      },
      feature: {
        type: Object
      },
      layer: {
        type: Object
      },
      config: {
        type: Object,
        default: null
      },
    },
    methods: {
      async download(){
        try {
          const action = this.config.actions.find(action => action.format === this.download_format);
          await action.cbk(this.layer, this.feature ? this.feature : this.layer.features, action, this.featureIndex);
        }
        catch(err){}
      }
    }
  }
</script>

<style scoped>
</style>