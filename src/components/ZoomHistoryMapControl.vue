<template>
  <div
    style="display:flex; flex-direction: column"
    class="ol-zoom-history ol-unselectable ol-control">
    <button
      @click.stop.prevent="history.index-=1"
      type="button"
      v-disabled="history.index === 0"
      v-t-tooltip="'Back'"
    >
      <i :class="g3wtemplate.getFontClass('arrow-left')"></i>
    </button>
    <button
      @click.stop.prevent="history.index+=1"
      type="button"
      v-disabled="(
        (history.index === 0 && history.items.length === 1) ||
        (history.index === history.items.length - 1)
      )"
      v-t-tooltip="'Forward'"
    >
      <i :class="g3wtemplate.getFontClass('arrow-right')"></i>
    </button>
  </div>
</template>


<script>
  import GUI from 'services/gui';
  const {debounce} = require('core/utils/utils');

  export default {
    name: "ZoomHistoryMapControl",
    data(){
      return {
        history: {
          index: 0,
          items: []
        }
      }
    },
    created(){
      const map = GUI.getService('map').getMap();
      this.history.items.push(map.getView().calculateExtent(map.getSize()));
      this.changeKeyEvent = map.getView().on('change' , debounce(evt => {
        const extent = evt.target.calculateExtent(map.getSize());
        if (this.history.index !== this.history.items.length -1)
          this.history.items.splice((this.history.index - this.history.items.length) + 1);
        this.history.items.push(extent);
        this.history.index+=1;
      }, 600))
    },
    watch: {
      'history.index': {
        immediate: false,
        handler(index) {
          GUI.getService('map').getMap().getView().fit(this.history.items[index])
        }
      }
    },
    beforeDestroy() {
      ol.Object.unByKey(this.changeKeyEvent);
    }
  }
</script>

<style scoped>

</style>