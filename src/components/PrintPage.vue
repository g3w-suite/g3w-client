<!--
  @file
  @since v3.7
-->

<template>
  <div id = "print-output">
    <transition :duration = "500" name = "fade">
      <bar-loader :loading = "state.loading && state.layers" />
    </transition>

    <template v-if = "state.layers">

      <!-- PRINT as PDF or GEOPDF-->
      <iframe
        v-if   = "['pdf', 'geopdf'].includes(format)"
        ref    = "out"
        :src   = "state.url"
        @load  = "ready = true"
        @error = "ready = true"
      ></iframe>

      <!-- PRINT as PNG, JPG, SVG -->
      <div
        v-else
        class     = "g3w-print-image-output"
      >
        <div id = "g3w-print-header">
          <div :class = "{ 'g3w-disabled': !!(state.downloading && state.layers) }">
            <a :href = "state.url" :download = "`download.${format}`">
              <button
                @click.stop        = "downloadImage"
                class              = "btn skin-button skin-tooltip-left"
                data-placement     = "left"
                data-toggle        = "tooltip"
                data-container     = "body"
                v-t-tooltip.create = "'sdk.print.download_image'"
                :class             = "g3wtemplate.getFontClass('download')"
                role               = "button">
              </button>
            </a>
          </div>
        </div>
        <div
          v-if  = "state.url"
          class = "g3w-print-url"
        >
          <img
            ref    = "out"
            :src   = "state.url"
            @load  = "ready = true"
            @error = "ready = true"
          >
        </div>
      </div>

    </template>

    <!---NO PRINT LAYERS-->
    <h4
      v-else
      v-t = "'sdk.print.no_layers'">
    </h4>

  </div>
</template>

<script>
import ApplicationState from 'store/application'
import GUI              from 'services/gui';

export default {

  /** @since 3.8.6 */
  name: 'print-page',

  data() {
    const state = this.$options.service.state || {};
    return {
      state,
      // extract `state.format` so it doesn't react to Print.vue changes
      format: state.format,
      ready : false,
    }
  },

  methods: {

    async downloadImage() {
      try {
        GUI.disableSideBar(true);
        this.state.downloading = true;
        if (['jpg', 'png', 'svg'].includes(this.format)) {
          await this.imageToDataURL({ src: this.state.url, type: `image/${this.format}` });
          setTimeout(() => {
            GUI.disableSideBar(false);
            this.state.downloading = false;
          });
        }
      } catch (e) {
        console.warn(e);
      }
    },

    imageToDataURL({
      src,
      type     = 'image/jpeg',
      callback = () => {},
    }) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = function() {
          const canvas  = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = this.naturalHeight;
          canvas.width  = this.naturalWidth;
          context.drawImage(this, 0, 0);
          const dataURL = canvas.toDataURL(type);
          callback(dataURL);
          resolve(dataURL);
        };
        image.onerror = reject;
        image.src = src;
      });
    },

  },
  /**
   * @since v3.11.0 To show to user loading bar
   */
  watch: {
    ready: {
      handler(bool) {
        GUI.setLoadingContent(!bool);
      },
      immediate: true,
    }
  },

  beforeDestroy() {
    if (this.state.url && 'POST' === ApplicationState.project.state.ows_method) {
      window.URL.revokeObjectURL(this.state.url);
    }
  },

};
</script>

<style scoped>
#print-output {
  height:100%;
  position: relative;
}
#print-output > iframe {
  border:0;
  width:100%;
  height:100%;
}
.g3w-print-image-output {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
}
#g3w-print-header {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  margin-top: 5px;
  margin-bottom: 5px;
}
#g3w-print-header button {
  font-weight: bold;
}
.g3w-print-url {
  height: 100%;
  width: 100%;
  position: relative;
  overflow-y: auto;
}
.g3w-print-url > img {
  height:auto;
  max-width: 100%;
}
#print-output > h4 {
  font-weight: bold;
}
</style>