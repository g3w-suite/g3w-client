<!-- ORIGINAL SOURCE: -->
<!-- gui/wms/vue/wms.vue@v3.4 -->

<template>
  <ul class="treeview-menu g3w-tools menu-items">
    <li v-if="loading">
      <bar-loader :loading="loading"></bar-loader>
    </li>
    <li style="display: flex; flex-direction: column; justify-content: space-between; background: transparent !important; margin-bottom: 10px;">
      <div class="wms_url_input_content">
        <label for="add_custom_name_url_wms_input">Name</label>
        <input id="add_custom_name_url_wms_input" v-model="name_newwmsurl" class="form-control" style="width: 100%; color:#000000;">
      </div>
      <div class="wms_url_input_content">
        <label for="add_custom_url_wms_input">URL</label>
        <input id="add_custom_url_wms_input" v-model="newwmsurl" class="form-control" style="width: 100%; color:#000000;">
      </div>
      <div>
        <button v-disabled="!inputsnewwmsurlvalid" style="width: 100%;" @click.stop="addNewWmsUrl" class="btn btn-block skin-background-color">
          <i :class="g3wtemplate.getFontClass('plus-square')"></i>
        </button>
      </div>
    </li>
    <li v-if="status.error">
      <div class="g3w-add-wms-url-message g3w-wmsurl-error" v-t="'server_error'"></div>
    </li>
    <li v-else-if="status.added">
      <div class="g3w-add-wms-url-message g3w-wmsurl-already-added" v-t="'sidebar.wms.url_already_added'"></div>
    </li>
    <li style="background: transparent !important;">
      <div style="max-height: 200px; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cccccc; padding-bottom: 3px;" v-for="wmsurl in state.adminwmsurls" :key="wmsurl">
          <span style="flex-grow: 1; margin-right: 15px;" class="new_line_too_long_text" :title="wmsurl">{{ wmsurl }}</span>
          <span class="skin-color" style="padding: 5px;" @click.stop="showWmsLayersPanel(wmsurl)">
            <i style="font-weight: bold; font-size: 1.3em;" :class="g3wtemplate.getFontClass('plus-square')"></i>
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cccccc; padding-bottom: 3px;" v-for="wmsurl in state.localwmsurls" :key="wmsurl">
          <span style="flex-grow: 1; margin-right: 15px;" class="new_line_too_long_text" :title="wmsurl">{{ wmsurl }}</span>
          <span class="skin-color" style="padding: 5px;" @click.stop="showWmsLayersPanel(wmsurl)" v-t-tooltip:top.create="'sidebar.wms.add_wms_layer'">
            <i style="font-weight: bold; font-size: 1.3em;" :class="g3wtemplate.getFontClass('plus-square')"></i>
          </span>
          <span style="color: red; padding: 5px;" @click.stop="deleteWmsUrl(wmsurl)" v-t-tooltip:top.create="'sidebar.wms.delete_wms_url'">
            <i style="font-weight: bold; font-size: 1.3em; color:red" :class="g3wtemplate.getFontClass('trash')" ></i>
          </span>
        </div>
      </div>
    </li>
  </ul>
</template>

<script>
  const {isURL} = require('core/utils/utils');

  export default {
    name: "sidebaritem",
    data(){
      return {
        newwmsurl: null,
        name_newwmsurl: null,
        loading: false,
        status: {
          error: false,
          added: false
        }
      }
    },
    computed: {
      inputsnewwmsurlvalid() {
        return (this.newwmsurl !== null && this.newwmsurl.trim() && isURL(this.newwmsurl)) && (this.name_newwmsurl !== null && this.name_newwmsurl.trim());
      }
    },
    methods: {
      async addNewWmsUrl(){
        this.loading = true;
        const {error, added} = await this.$options.service.addNewWmsUrl(this.newwmsurl);
        this.status.error = error;
        this.status.added = added;
        this.loading = false;
      },
      deleteWmsUrl(wmsurl) {
        this.$options.service.deleteWmsUrl(wmsurl)
      },
      async showWmsLayersPanel(wmsurl){
        try {
          this.loading = true;
          const {error, added} = await this.$options.service.loadWMSDataAndShowWmsLayersPanel(wmsurl);
          this.status.error = error;
          this.status.added = added;
          this.loading = false;
        } catch(err){
          console.log(err)
        }
      }
    }
  }
</script>

<style scoped>
  .g3w-add-wms-url-message{
    font-weight: bold;
    color: #000000;
  }
  .g3w-wmsurl-error{
    background-color: red;
  }
  .g3w-wmsurl-already-added {
    background-color: orange;
  }
  .wms_url_input_content{
    margin-bottom: 5px;
  }
</style>