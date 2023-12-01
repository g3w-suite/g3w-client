<!--
  @file
  @since v3.7
-->

<template>
  <ul class="treeview-menu g3w-tools menu-items">

    <!-- LOADING INDICATOR -->
    <li v-if="loading">
      <bar-loader :loading="loading"/>
    </li>

    <li style="
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: transparent !important;
      margin-bottom: 10px;
    ">

      <!-- WMS NAME -->
      <div class="wms_url_input_content">
        <label
          for = "add_custom_name_url_wms_input"
          v-t = "'sidebar.wms.panel.label.name'">
        </label>
        <input
          id      = "add_custom_name_url_wms_input"
          v-model = "id"
          class   = "form-control"
          style   = "width: 100%; color:#000000;">
      </div>

      <!-- WMS URL -->
      <div class="wms_url_input_content">
        <label for="add_custom_url_wms_input">URL</label>
        <input
          id      = "add_custom_url_wms_input"
          v-model = "url"
          class   = "form-control"
          style   = "width: 100%; color:#000000;">
      </div>

      <!-- SUBMIT BUTTON -->
      <div>
        <button
          v-disabled          = "!inputswmsurlvalid"
          style               = "width: 100%;"
          @click.prevent.stop = "addwmsurl"
          class               = "btn btn-block skin-background-color"
        >
          <i :class="g3wtemplate.getFontClass('plus-square')"></i>
        </button>
      </div>

    </li>

    <!-- ERROR NOTICE -->
    <li v-if="status.error">
      <div
        class = "g3w-add-wms-url-message g3w-wmsurl-error"
        v-t   = "'server_error'">
      </div>
    </li>

    <!-- ERROR NOTICE: "WMS LAYER ALREADY ADDED" -->
    <li v-else-if="status.added">
      &#x26A0;&#xFE0F;
      <div
        class = "g3w-add-wms-url-message g3w-wmsurl-already-added"
        v-t   = "'sidebar.wms.url_already_added'">
      </div>
    </li>

    <li class="skin-border-color" style="background: transparent !important; border-top: 2px solid">
      <div style="max-height: 200px; overflow-y: auto;">

        <!-- LIST OF WMS LAYERS (STORED ON SERVER) -->
        <div
          v-for = "({id, url}) in state.adminwmsurls"
          :key  = "wmsurl"
          style = "
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 3px;
          ">
          <span
            style = "flex-grow: 1; margin-right: 15px;"
            class = "g3w-long-text">{{ id }}
          </span>
          <span
            class       = "skin-color"
            style       = "padding: 5px;"
            @click.stop = "showWmsLayersPanel(id)"
          >
            <i
              style  = "font-weight: bold; font-size: 1.3em;"
              :class = "g3wtemplate.getFontClass('plus-square')">
            </i>
          </span>

        </div>

        <!-- LIST OF WMS LAYERS (STORED ON LOCAL STORAGE) -->
        <div
          v-for = "({id, url}) in state.localwmsurls"
          :key  = "id"
          style = "border-bottom: 1px solid #cccccc; padding-bottom: 3px;"
        >
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 3px">
            <!-- WMS NAME -->
            <span
              class = "g3w-long-text"
              style = "flex-grow: 1; margin-right: 15px; font-weight: bold"
            >{{ id }}</span>
            <!-- EDIT WMS -->
            <span
              class                  = "skin-color"
              style                  = "padding: 3px; margin: 2px;"
              @click.stop            = "showWmsLayersPanel(url)"
              v-t-tooltip:top.create = "'sidebar.wms.add_wms_layer'"
            >
              <i
                class  = "wms-icon-action"
                :class = "g3wtemplate.getFontClass('plus-square')">
              </i>
            </span>
            <!-- DELETE WMS -->
            <span
              style                  = "color: red; padding: 3px; margin: 2px;"
              @click.stop            = "deleteWmsUrl(id)"
              v-t-tooltip:top.create = "'sidebar.wms.delete_wms_url'"
            >
              <i
                style  = "color: red"
                class  = "wms-icon-action"
                :class = "g3wtemplate.getFontClass('trash')">
              </i>
            </span>
          </div>

          <!-- WMS URL -->
          <div
            style = "font-size: 0.7em; "
            class = "g3w-long-text" :title="url"
          >{{url}}</div>

        </div>

      </div>
    </li>

  </ul>
</template>

<script>
  const { isURL } = require('utils');

  export default {

    /** @since 3.8.6 */
    name: "wms",

    data() {
      return {
        url: null,
        id: null,
        loading: false,
        status: {
          error: false,
          added: false,
        }
      }
    },

    computed: {

      /**
       * @returns {false|*|boolean}
       */
      inputswmsurlvalid() {
        return (
          (
            this.url !== null &&
            this.url.trim() &&
            isURL(this.url)
          ) &&
          (
            this.id !== null &&
            this.id.trim()
          )
        )
      },

    },

    methods: {

      /**
       * @returns { Promise<void> }
       */
      async addwmsurl() {
        this.loading           = true;
        const { error, added } = await this.$options.service.addNewUrl({ url: this.url, id: this.id });
        this.status.error      = error;
        this.status.added      = added;
        this.loading           = false;
      },

      /**
       * @param id
       */
      deleteWmsUrl(id) {
        this.$options.service.deleteWmsUrl(id)
      },

      /**
       * @param url
       * 
       * @returns { Promise<void> }
       */
      async showWmsLayersPanel(url) {
        try {
          this.loading           = true;
          const { error, added } = await this.$options.service.loadWMSDataAndShowWmsLayersPanel(url);
          this.status.error      = error;
          this.status.added      = added;
          this.loading           = false;
        } catch(err) {
          console.warn(err);
        }
      },

    },

  }
</script>

<style scoped>
  .g3w-add-wms-url-message{
    font-weight: bold;
    color: #000000;
  }
  .g3w-wmsurl-error {
    background-color: red;
  }
  .g3w-wmsurl-already-added {
    color: inherit;
    font-weight: normal;
    display: inline-block;
  }
  .wms_url_input_content{
    margin-bottom: 5px;
  }
  .wms-icon-action {
    font-weight: bold;
    font-size: 1.3em;
    box-shadow: 0 5px 10px #1e282c;
  }
  .wms-icon-action:hover {
    box-shadow: none;
  }
</style>