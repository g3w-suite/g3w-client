<template>
  <div class="marker-results">
    <section class="marker-results-header" v-if="showTools">
      <section class="marker-results-tools">
        <span
          @click.stop="zoom" class="action-button"
          v-t-tooltip:left.create="'sdk.mapcontrols.query.actions.zoom_to_features_extent.hint'"
        >
          <span class="action-button-icon" :class="g3wtemplate.getFontClass('marker')"></span>
        </span>
        <span
          @click.stop="remove" class="action-button"
          v-t-tooltip:left.create="'sdk.mapcontrols.query.actions.zoom_to_features_extent.hint'"
          >
            <span class="action-button-icon" style="color: red" :class="g3wtemplate.getFontClass('trash')"></span>
        </span>
      </section>
      <divider/>
    </section>

    <template v-for="(markers, provider) in providers">
      <span class="skin-color" style="font-weight: bold; font-size: 1.2em">{{provider}}</span>
      <divider/>
      <marker-result-feature :marker="marker" v-for="marker in markers"/>
    </template>
  </div>
</template>

<script>

import MarkerResultFeature from "./MarkerResultFeature.vue";
import GUI                 from 'services/gui';
import { MarkersEventBus } from "eventbus";


export default {
  name: 'MarkerResults',
  components: {
      MarkerResultFeature
  },
  props: {
    markers: {
      type: Array,
      default: []
    }
  },
  computed: {
    providers() {
      return this.markers.reduce((accumulator, marker) => {
        if (undefined === accumulator[marker.provider]) {
          accumulator[marker.provider] = [];
        }
        accumulator[marker.provider].push(marker);
        return accumulator;
      }, {})
    },
    showTools() {
      return Object.values(this.providers).length > 1 ||
        Object.values(this.providers).flat().length > 1
    }
  },
  methods: {
    zoom() {
      const mapService = GUI.getService('map');
      const extent = Object
        .values(this.providers)
        .flat()
        .reduce((accumulator, {lon, lat}) => {
          const coordinates =  ol.proj.transformExtent([
            parseFloat(lon),
            parseFloat(lat),
            parseFloat(lon),
            parseFloat(lat)],
        'EPSG:4326',
            mapService.getEpsg()
          );
          if (accumulator) {
            return ol.extent.extend(accumulator, coordinates);
          } else {
            return coordinates;
          }

      }, null);
      console.log(extent)
      mapService.zoomToExtent(extent);
    },
    remove() {
      MarkersEventBus.$emit('remove-all-markers')
    }
  },
};
</script>

<style scoped>
 .marker-results {
   background-color: #FFFFFF;
   overflow: auto;
   padding: 5px;
 }
 .marker-results-tools {
   display: flex;
   justify-content: flex-end;
   font-size: 1.2em;
 }
</style>
