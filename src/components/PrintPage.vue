<!--
  @file
  @since v3.7
-->

<template>
  <div id="print-output">

    <transition :duration="500" name="fade">
      <bar-loader :loading="state.downloading && state.layers"/>
    </transition>

    <!-- PRINT as PDF -->
    <iframe
      v-if  = "'pdf' === state.format"
      ref   = "out"
      :src = "state.url"
    ></iframe>
  
    <!-- PRINT as PNG -->
    <div
      v-else-if = "'png' === state.format"
      class     = "g3w-print-png-output"
    >
      <div id="g3w-print-header">
        <div :class="{ 'g3w-disabled': !!(state.downloading && state.layers) }">
          <a :href="state.url" :download="`download.${state.format}`">
            <button
              @click             = "downloadImage"
              class              = "btn skin-button skin-tooltip-left"
              data-placement     = "left"
              data-toggle        = "tooltip"
              data-container     = "body"
              v-t-tooltip.create = "'sdk.print.download_image'"
              :class             = "g3wtemplate.getFontClass('download')"
              role               = "button"
            ></button>
          </a>
        </div>
      </div>
      <div v-show="state.url" class="g3w-print-url">
        <img ref="out" :src="state.url">
      </div>
    </div>

    <h4 v-if="!state.layers" v-t="'sdk.print.no_layers'"></h4>

  </div>
</template>

<script>
import { TIMEOUT }        from 'app/constant';
import ProjectsRegistry   from 'store/projects';
import GUI                from 'services/gui';
import { imageToDataURL } from 'utils/imageToDataURL';

export default {

  /** @since 3.8.6 */
  name: 'print-page',

  data() {
    console.log(this);
    return {
      state: {},
    }
  },

  methods: {

    async downloadImage() {
      try {
        GUI.disableSideBar(true);
        this.state.downloading = true;
        if (['jpg', 'png'].includes(this.state.format)) {
          await imageToDataURL({ src: this.state.url, type: `image/${this.state.format}` });
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

  watch: {
    'state.url': async function(url) {
      if (!url) {
        return;
      }
      let timeout;

      try {

        await this.$nextTick();

        // add timeout
        timeout = setTimeout(() => {
          GUI.disableSideBar(false);
          this.state.downloading = false;
          GUI.showUserMessage({ type: 'alert', message: 'timeout' });
        }, TIMEOUT);

        const response = await fetch(url);

        if (!response.ok) {
          throw response.statusText;
        }
      } catch (e) {
        console.warn(e);
        GUI.notify.error(e || t("info.server_error"));
        GUI.closeContent();
      } finally {
        clearTimeout(timeout);
        GUI.disableSideBar(false);
        this.state.downloading = false;
      }

    }
  },

  async mounted() {
    await this.$nextTick();
    if (this.state.layers) {
      this.state.loading = true;
    }
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