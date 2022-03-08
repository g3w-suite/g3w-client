<template>
  <ul class="treeview-menu g3w-tools menu-items">
    <li style="display: flex; justify-content: space-between; background: transparent !important; margin-bottom: 10px;">
      <input v-model="newwmsurl" class="form-control" style="flex-grow: 1; color:#000000;"></input>
      <button v-disabled="!newwmsurlvalid" style="width: 50px; border-radius: 0" @click.stop="addNewWmsUrl" class="btn btn-block skin-background-color">
        <i :class="g3wtemplate.getFontClass('plus-square')"></i>
      </button>
    </li>
    <li style="background: transparent !important;">
      <div style="max-height: 200px; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cccccc; padding-bottom: 3px;" v-for="wmsurl in state.wmsurls">
          <span style="flex-grow: 1; margin-right: 15px;" class="new_line_too_long_text" :title="wmsurl">{{ wmsurl }}</span>
          <span class="skin-color" style="padding: 5px;" @click.stop="showWmsLayersPanel(wmsurl)">
            <i style="font-weight: bold; font-size: 1.3em;" :class="g3wtemplate.getFontClass('plus-square')"></i>
          </span>
          <span style="color: red; padding: 5px;" @click.stop="deleteWmsUrl(wmsurl)">
            <i style="font-weight: bold; font-size: 1.3em;" :class="g3wtemplate.getFontClass('trash')"></i>
          </span>
        </div>
      </div>
    </li>
  </ul>
</template>

<script>
  export default {
    name: "sidebaritem",
    data(){
      return {
        newwmsurl: null
      }
    },
    computed: {
      newwmsurlvalid() {
        return this.newwmsurl !== null && this.newwmsurl.trim();
      }
    },
    methods: {
      addNewWmsUrl(){
        this.$options.service.addNewWmsUrl(this.newwmsurl)
      },
      deleteWmsUrl(wmsurl) {
        this.$options.service.deleteWmsUrl(wmsurl)
      },
      async showWmsLayersPanel(wmsurl){
        await this.$options.service.showWmsLayersPanel(wmsurl);
      }
    }
  }
</script>

<style scoped>

</style>