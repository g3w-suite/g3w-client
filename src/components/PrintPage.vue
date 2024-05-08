<!--
  @file
  @since v3.7
-->

<template>
  <div id="print-output">
    <transition :duration="500" name="fade">
      <bar-loader :loading="state.loading && state.layers" />
    </transition>

    <template v-if="state.layers">

      <!-- PRINT as PDF or GEOPDF-->
      <iframe
        v-if  = "['pdf', 'geopdf'].includes(format)"
        ref   = "out"
        :src = "state.url"
      ></iframe>

      <!-- PRINT as PNG -->
      <div
        v-else
        class     = "g3w-print-png-output"
      >
        <div id="g3w-print-header">
          <div :class="{ 'g3w-disabled': !!(state.downloading && state.layers) }">
            <a :href="state.url" :download="`download.${format}`">
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
            ref  = "out"
            :src = "state.url"
          >
        </div>
      </div>

    </template>

    <!---NO PRINT LAYERS-->
    <h4
      v-else
      v-t="'sdk.print.no_layers'">
    </h4>

  </div>
</template>

<script>
import ProjectsRegistry   from 'store/projects';
import GUI                from 'services/gui';
import { imageToDataURL } from 'utils/imageToDataURL';

export default {

  /** @since 3.8.6 */
  name: 'print-page',

  data() {
    const state = this.$options.service.state || {};
    return {
      state,
      // extract `state.format` so it doesnt' react to Print.vue changes
      format: state.format,
    }
  },

  methods: {

    async downloadImage() {
      try {
        GUI.disableSideBar(true);
        this.state.downloading = true;
        if (['jpg', 'png'].includes(this.format)) {
          await imageToDataURL({ src: this.state.url, type: `image/${this.format}` });
          setTimeout(() => {
            GUI.disableSideBar(false);
            this.state.downloading = false;
          });
        }
      } catch (e) {
        console.warn(e);
      }
    },

  },

  beforeDestroy() {
    if (this.state.url && 'POST' === ProjectsRegistry.getCurrentProject().getOwsMethod()) {
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
.g3w-print-png-output {
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