<!--
  @file
  @since v3.7
-->

<template>
  <div id="print-output" style="height:100%; position: relative;">
    <transition :duration="500" name="fade">
      <bar-loader :loading="loading"/>
    </transition>
    <iframe  v-if="format === 'pdf'" :type="state.mime_type" ref="printoutput"  style="border:0;width:100%;height:100%;" :src="state.url"></iframe>
    <div v-else-if="format === 'png'" class="g3w-print-png-output" style="display: flex; flex-direction: column; position: relative; height: 100%">
      <div id="g3w-print-header" style="display: flex; justify-content: flex-end; align-items: flex-end; margin-top: 5px; margin-bottom: 5px;">
        <div :class="{'g3w-disabled': disableddownloadbutton}">
          <a :href="state.url" :download="downloadImageName">
            <button
              @click="downloadImage"
              class="btn skin-button skin-tooltip-left"
              style="font-weight: bold;"
              data-placement="left"
              data-toggle="tooltip"
              data-container="body"
              v-t-tooltip.create="'sdk.print.download_image'"
              :class="g3wtemplate.getFontClass('download')"
              role="button"></button>
          </a>
        </div>
      </div>
      <div v-show="format==='png' && state.url" style="height: 100%; width: 100%; position: relative; overflow-y: auto" >
        <img style="height:auto; max-width: 100%" ref="printoutput" :src="state.url">
      </div>
    </div>
    <h4 style="font-weight: bold" v-if="!state.layers" v-t="'sdk.print.no_layers'"></h4>
  </div>
</template>

<script>
import { TIMEOUT } from 'app/constant';
import GUI from 'services/gui';

const { imageToDataURL } = require('utils');

export default {

  /** @since 3.8.6 */
  name: 'print-page',

  data() {
    return {
      state: null,
      disableddownloadbutton: true,
      downloadImageName: '',
      format: null
    }
  },
  computed: {
    loading() {
      return this.state.loading && this.state.layers;
    }
  },
  methods: {
    setLoading(bool=false){
      GUI.disableSideBar(bool);
      this.state.loading = bool;
      this.disableddownloadbutton = bool;
    },
    downloadImage(){
      this.setLoading(true);
      if (this.format === 'jpg' || this.format === 'png' ) {
        this.downloadImageName = `download.${this.state.format}`;
        imageToDataURL({
          src: this.state.url,
          type: `image/${this.state.format}`,
          callback: url => setTimeout(() => this.setLoading(false))
        })
      }
    }
  },
  watch: {
    'state.url': async function(url) {
      if (url) {
        this.format = this.state.format;
        await this.$nextTick();
        // add timeout
        const timeOut = setTimeout(()=>{
          this.setLoading(false);
          GUI.showUserMessage({
            type: 'alert',
            message: 'timeout'
          })
        }, TIMEOUT);

        $(this.$refs.printoutput).load(url, (response, status) => {
          this.$options.service.stopLoading();
          status === 'error' && this.$options.service.showError();
          clearTimeout(timeOut);
          this.setLoading(false);
        });
      }
    }
  },
  async mounted() {
    await this.$nextTick();
    this.state.layers && this.$options.service.startLoading();
  },
  beforeDestroy() {
    (this.state.url && this.state.method === 'POST') && window.URL.revokeObjectURL(this.state.url);
  }
};
</script>