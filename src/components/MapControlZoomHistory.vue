<!--
  @file
  @since v3.8
-->

<template>
  <div
    style="display:flex; flex-direction: column"
    class="ol-zoom-history ol-unselectable ol-control">
    
    <!-- STEP BACK -->
    <button
      @click.stop.prevent="history.index--"
      type="button"
      v-disabled="history.index === 0"
      v-t-tooltip="'sdk.mapcontrols.zoomhistory.zoom_last'"
    >
      <i :class="g3wtemplate.getFontClass('arrow-left')"></i>
    </button>

    <!-- STEP FORWARD -->
    <button
      @click.stop.prevent="history.index++"
      type="button"
      v-disabled="hasEmptyHistory"
      v-t-tooltip="'sdk.mapcontrols.zoomhistory.zoom_next'"
    >
      <i :class="g3wtemplate.getFontClass('arrow-right')"></i>
    </button>

  </div>
</template>


<script>
  import GUI from 'services/gui';
  const { debounce } = require('core/utils/utils');

  export default {
    name: "MapControlZoomHistory",
    data() {
      return {
        history: {
          index: 0,
          items: []
        }
      }
    },

    watch: {
      'history.index': {
        immediate: false,
        handler(index) {
          GUI.getService('map').getMap().getView().fit(this.history.items[index])
        }
      }
    },

    computed: {
      hasEmptyHistory() {
        return (0 === this.history.index && 1 === this.history.items.length) || (this.history.items.length - 1 === this.history.index);
      }
    },

    /**
     * @listens ol.View~change
     */
    created() {
      const map = GUI.getService('map').getMap();
      const view = map.getView();

      this.history.items.push(view.calculateExtent(map.getSize()));

      this.changeKeyEvent = view.on('change' , debounce(evt => {
        if (this.history.index !== this.history.items.length -1) {
          this.history.items.splice((this.history.index - this.history.items.length) + 1);
        }
        this.history.items.push(evt.target.calculateExtent(map.getSize()));
        this.history.index +=1;
      }, 600))
    },

    beforeDestroy() {
      ol.Object.unByKey(this.changeKeyEvent);
    }
    
  }
</script>

<style scoped>

</style>