<!--
  @file
  @since v3.8
-->

<template>
  <li
    @click.stop = "gotoSpatialBookmark(bookmark)"
    class       = "spatial-bookmark"
  >
    <div>
      <span :class="g3wtemplate.getFontClass('bookmark')" style="margin-right: 5px; font-size: 0.7em;"></span>
      <span class="g3w-long-text">{{bookmark.name}}</span>
    </div>
    <span
      v-if        = "bookmark.removable"
      @click.stop = "$emit('remove-bookmark', bookmark.id)"
      class       = "sidebar-button sidebar-button-icon"
      style       = "color: red; margin: 5px; cursor: pointer"
    >
      <i :class="g3wtemplate.getFontClass('trash')"></i>
    </span>
  </li>
</template>

<script>
  import GUI from 'services/gui';

  const Projections = require('g3w-ol/projection/projections');

  export default {

    /** @since 3.8.6 */
    name: 'spatial-bookmark-item',

    props: {
      bookmark: {
        type: Object,
        /**
         * {
         *   id: <String> Unique id identifier
         *   name: <Sting>,
         *   extent: <Array> [minX, minY, maxX, maxY] Bounding Box Extent
         *   crs: <Object> {
         *     epsg: <Number> Epsg code ex. 3857
         *   }
         * }
         */
        required: true
      }
    },
    methods: {
      removeBookMark() {},
      async gotoSpatialBookmark({ extent, crs }) {
        if (crs.epsg !== GUI.getService('map').getEpsg().split('EPSG:')[1]) {
          const projection = await Projections.registerProjection(`EPSG:${crs.epsg}`);
          extent = ol.proj.transformExtent(extent, projection, GUI.getService('map').getProjection())
        }
        // make use of `force: true` parameter to get resolution from computed `extent`
        GUI.getService('map').zoomToExtent(extent, { force: true });
      }
    },
  };
</script>

<style scoped>
  .spatial-bookmark {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 5px !important;
  }
</style>