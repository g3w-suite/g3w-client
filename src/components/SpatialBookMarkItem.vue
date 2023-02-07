<template>
  <li @click.stop="gotoSpatialBookmark(bookmark)" class="spatial-bookmark">
    <div>
      <span :class="g3wtemplate.getFontClass('bookmark')" style="margin-right: 5px; font-size: 0.7em;"></span>
      <span class="g3w-long-text">{{bookmark.name}}</span>
    </div>
    <span v-if="bookmark.removable"
       @click.stop="$emit('remove-bookmark', bookmark.id)"
       style="color: red; margin: 5px; cursor: pointer">
      <i :class="g3wtemplate.getFontClass('trash')"></i>
    </span>
  </li>
</template>

<script>
  import GUI from 'services/gui';

  const Projections = require('g3w-ol/projection/projections');

  export default {
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
      removeBookMark(){},
      async gotoSpatialBookmark({extent, crs}){
        if (GUI.getService('map').getEpsg().split('EPSG:')[1] !== crs.epsg) {
          const projection = await Projections.registerProjection(`EPSG:${crs.epsg}`);
          extent = ol.proj.transformExtent(extent, projection, GUI.getService('map').getProjection())
        }
        GUI.getService('map').zoomToExtent(extent)
      }
    },
    async mounted() {}
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