<template>
  <div style="padding: 2px; display:flex; justify-content: space-between;" class="skin-background-color">
    <select  v-select2="'download_format'" :search="false" class="form-control">
      <option v-for="action in formats.actions" :key="action.id" v-t-download="action.download" :value="action.format">
        <span style="font-weight: bold">{{action.format}}</span>
      </option>
    </select>
    <button style="border-radius: 0;" class="btn skin-button" @click.stop=download v-disabled="loading"><span :class="g3wtemplate.getFontClass('download')"></span></button>
  </div>
</template>

<script>
  import ApplicationState from 'core/applicationstate';
  export default {
    name: "downloadformats",
    data(){
      const download_format = this.formats.actions[0].format;
      return {
        download_format,
        loading: false
      }
    },
    props: {
      feature: {
        type: Object
      },
      layer: {
        type: Object
      },
      formats: {
        type: Object,
        default: {
          show: false,
          actions: []
        }
      },
    },
    methods: {
      async download(){
        try {
          const action = this.formats.actions.find(action => action.format === this.download_format);
          this.$watch(()=> ApplicationState.download, bool=>{
            this.loading = bool;
          });
          await action.cbk(this.layer, [this.feature]);
        }
        catch(err){}
        this.formats.show = false;
      }
    }
  }
</script>

<style scoped>
</style>