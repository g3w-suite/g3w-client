<!--
  @file need some inspiration for other geocoding providers?

  👉 https://github.com/Dominique92/ol-geocoder
  👉 https://github.com/perliedman/leaflet-control-geocoder

  @since 3.9.0
-->
<template>
  <div class="ol-geocoder gcd-txt-container">

    <!-- SEARCH INPUT -->
    <div class="gcd-txt-control">
      <input
        ref             = "input"
        type            = "text"
        id              = "gcd-input-query"
        autocomplete    = "off"
        class           = "gcd-txt-input"
        v-t-placeholder = "placeholder"
        @keyup          = "_onQuery"
        @input          = "_onValue"
      />
      <!-- RESET RESULTS -->
      <button
        ref         = "reset"
        type        = "button"
        id          = "gcd-input-reset"
        class       = "gcd-txt-reset gcd-hidden"
        @click.stop = "_onReset"
      ></button>
      <!-- search query button -->
      <button
        type            = "button"
        id              = "search_nominatim"
        class           = "btn"
        @click.stop     = "() => query($refs.input.value)"
      >
        <i
          :class      = "g3wtemplate.getFontClass('search')"
          style       = "color: #ffffff"
          aria-hidden = "true"
        ></i>
      </button>
      <!-- DELETE ALL RESULTS AND MARKERS ADDED --->
      <button
        v-if="$data._markers.length > 0"
        type            = "button"
        id              = "trash_nominatim"
        class           = "btn skin-background-color"
        @click.stop     = "clearMarkers"
      >
        <i
          :class      = "g3wtemplate.getFontClass('trash')"
          style       = "color:red"
          aria-hidden = "true"
        ></i>
      </button>

      <!-- SHOW MARKERS ON RESULT CONTENT -->
      <button
        v-if          = "showMarkerResultsButton"
        type          = "button"
        id            = "show-markers-results"
        class         = "btn skin-background-color"
        @click.stop   = "_showMarkerResults"
      >
        <i
          :class      = "g3wtemplate.getFontClass('list')"
          aria-hidden = "true"
        ></i>
      </button>
      <!-- SHOW/HIDE MARKER LAYER ON MAP -->
      <button
        v-if          = "$data._markers.length > 0"
        type          = "button"
        id            = "markers-visibility-layer"
        class         = "btn skin-background-color"
        @click.stop   = "_toggleLayerVisibility"
      >
        <i
        :class      = "g3wtemplate.getFontClass($data._visible ? 'eye-close': 'eye')"
        aria-hidden = "true"
        ></i>
      </button>

    </div>

    <!-- SEARCH RESULTS -->
    <ul
      ref   = "result"
      class = "gcd-txt-result"
    >
      <li
        v-for   = "(item, i) in $data._results"
        :class  = "[
          item.provider,
          item.__heading ? 'skin-background-color' : '',
          item.__no_results ? 'nominatim-noresult' : '',
        ]"
        :key         = "item.__uid"
        @click.stop = "_onItemClick($event, item)"
      >
        <!-- GEOCODING PROVIDER (eg. "Nominatim OSM") -->
        <div
          v-if  = "item.__heading"
          style = "display: flex; justify-content: space-between; padding: 5px"
        >
          <span style="color: #FFFFFF; font-weight: bold">{{ item.label }}</span>
        </div>
        <!-- NO RESULTS -->
        <span
          v-else-if = "item.__no_results"
          v-t       = "noresults"
        ></span>
        <!-- NO RESULTS -->
        <template v-else>
          <span
            style       = "color: #000000; padding: 5px;"
            :class      = "g3wtemplate.getFontClass(item.add ? 'check' : 'uncheck')">
          </span>
          <i
            v-if        = "'nominatim' === item.provider"
            class       = "fa fa-road"
            style       = "color:black"
            aria-hidden = "true"
          ></i>
          <img
            v-else
            class  = "gcd-icon"
            src    = "/static/client/images/pushpin.svg"
            width  = "24"
            height = "24"
          />
          <!-- TODO: remove outer link (which is used only for styling purposes..) -->
          <a href="" draggable="false">
            <div v-if="item.type" class="gcd-type">{{ item.type }}</div>
            <div v-if="item.name" class="gcd-name">{{ item.name }}</div>
            <template v-if="item.address">
              <div
                v-if   = "item.address.name"
                class = "gcd-road"
              >{{ item.address.name }}</div>
              <div
                v-if  = "item.address.road || item.address.building || item.address.house_number"
                class = "gcd-road"
              >{{ item.address.building }} {{ item.address.road }} {{ item.address.house_number }}</div>
              <div
                v-if  = "item.address.city || item.address.town || item.address.village"
                class = "gcd-city"
              >{{ item.address.postcode }} {{ item.address.city }} {{ item.address.town }} {{ item.address.village }}</div>
              <div
                v-if  = "item.address.state || item.address.country"
                class = "gcd-country"
              >{{ item.address.state }} {{ item.address.country }}</div>
            </template>
          </a>
        </template>
      </li>
    </ul>

  </div>
</template>

<script>
import GUI               from 'services/gui';
import ApplicationState  from 'store/application-state';
import nominatim         from 'utils/search_from_nominatim';
import bing              from 'utils/search_from_bing';
import google            from 'utils/search_from_google';
import MarkersResult     from "./MarkersResult.vue";
import { MarkersEventBus } from "eventbus";

const ComponentsFactory = require('gui/component/componentsfactory');

const {
  uniqueId,
  toRawType
}                        = require('utils');

const Projections        = require('g3w-ol/projection/projections');

const providers = [ nominatim, bing, google ];

const pushpin_icon = new ol.style.Icon({
  opacity: 1,
  src: '/static/client/images/pushpin.svg',
  scale: 0.8
});

/**
 * Search results layer (marker)
 * 
 * @TODO move to parent `Control` class (duplicated also in GEOLOCATION CONTROL)
 */
const layer = new ol.layer.Vector({
  id: '__g3w_marker',
  name: 'Geocoding',
  source: new ol.source.Vector(),
  style: new ol.style.Style({ image: pushpin_icon }),
});


/**
 * @TODO add a server option to let user choose geocoding extent, eg:
 * 
 * - "dynamic": filter search results based on current map extent
 * - "initial": filter search results based on initial map extent
 */
const DYNAMIC_MAP_EXTENT = false;

/**
 * Show current location/place on map as marker icon
 */

/**
 * @since 3.9.0
 */
function _getExtentForProvider(provider, { viewbox, mapCrs }) {
  return ol.proj.transformExtent(
    provider === bing ? GUI.getService('map').getMapExtent() : viewbox,
    mapCrs,
    'EPSG:4326'
  )
}

/**
 * @TODO make use of `GUI.isSomething()` ?
 */
let is_results_panel_open = false;


export default {

  data() {
    return {
      /** @since 3.9.0 */
      _results                 : [],
      _markers                 : [],
      _show_marker_info_content: false,  //Boolean if marker info are show on right content
      _visible                 : true,   //set visibility of layer
    };
  },

  props: {

    placeholder: {
      type: String,
      required: true,
    },

    /**
     * @since 3.9.0
     */
    noresults: {
      type: String,
      required: true,
    },

    /**
     * @since 3.9.0
     */
     limit: {
      type: Number,
      required: true,
    },

    /**
     * @since 3.9.0
     */
    viewbox: {
      required: true,
    },

    /**
     * @since 3.9.0
     */
    mapCrs: {
      required: true,
    },

  },

  computed: {
    showMarkerResultsButton() {
      return this.$data._markers.length > 0 && !this.$data._show_marker_info_content;
    }
  },

  methods: {
    /**
     *
     * @param coordinates
     * @param options
     * @private
     */
    _showMarker(coordinates, options = { transform: true }) {
      const mapService = GUI.getService('map');
      coordinates = options.transform
        ? ol.proj.transform(
          coordinates,
          'EPSG:4326',
          mapService.getEpsg()
        )
        : coordinates;
      const geometry =  new ol.geom.Point(coordinates);
      mapService.zoomToGeometry(geometry);
    },

    /**
     * Remove marker from map
     */
    _hideMarker() {
      //clear layer features marker
      layer.getSource().clear();
      //need to force to set visible tru otherwise
      // when add new marker need to click on visibility button
      // if last state are not visible
      if (false === this.$data._visible) {
        this._toggleLayerVisibility();
      }
    },

      /**
     * Toggle marker layer visibility
     * @since v3.9
     * @private
     */
    _toggleLayerVisibility() {
      this.$data._visible = !this.$data._visible;
      layer.setVisible(this.$data._visible);
    },
    /**
     * Clear Result list only
    * @since v3.9
    */
    clearResults() {
      this.$data._results.splice(0);
    },
    clearMarkers() {
      this.$data._markers.splice(0);
      this._hideMarker();
      //set false to add
      this.$data._results.forEach(i => i.add = false);
    },
    /**
     * Clear all
     * 
     * @since 3.9.0
     */
    clear() {
      this.clearResults();
      this.clearMarkers();
    },
    
    /**
     * Run geocoding request
     * 
     * @param { string } q query string in this format: "XCoord,YCoord,EPSGCode"
     * 
     * @since 3.9.0
     */
    query(q) {

      return new Promise(async (resolve, reject) => {
        const isNumber     = value => 'Number' === toRawType(value) && !Number.isNaN(value);
        let coordinates    = null;
        let transform      = false;
        const [x, y, epsg] = (q || '').split(',');
        //get projection of coordinates is pass as third value
        const projection         = epsg && Projections.get({
          epsg: `EPSG:${epsg.trim()}`
        });

        // extract xCoord and yCoord
        if (isNumber(1 * x) && isNumber(1 * y)) {
          coordinates = [1 * x, 1 * y];
        }

        // whether EPSGCode is allowed on this project
        try {
          if (projection) {
            coordinates = ol.proj.transform(coordinates, projection.getCode(), 'EPSG:4326');
            transform = true;
          }
        } catch (err) {
          console.warn(err);
        }

        // request is for a single point (XCoord,YCoord)
        if (coordinates) {
          this._showMarker(coordinates, { transform });
          resolve(coordinates);
        }

        // request is for a place (Address, Place, etc..)
        if (!coordinates) {

          // clear previous result
          this.clearResults();
          this.$refs.reset.classList.add("gcd-pseudo-rotate");

          // request data
          const results = await Promise.allSettled(
            providers
              .map(p => p({
                query:        q,
                lang:         ApplicationState.language || 'it-IT',
                // countrycodes: _options.countrycodes,             // <-- TODO ?
                limit:        this.limit,
                extent:       _getExtentForProvider(p, { mapCrs: this.mapCrs, viewbox: this.viewbox }),
              }))
          );

          // update search results
          this._showResults(results.filter(p => 'fulfilled' === p.status));
          this.$refs.reset.classList.remove("gcd-pseudo-rotate");
        }

      });
    },

    /**
     * @since 3.9.0 
     */
    _showResults(results=[]) {

      // Loop through providers results
      results.forEach((p) => {

        // heading
        this.$data._results.push({
          __heading: true,
          provider: p.value.provider,
          label: p.value.label,
        });

        // no results
        if (!(p.value.results && p.value.results.length)) {
          this.$data._results.push({
            __no_results: !(p.value.results && p.value.results.length),
          });
          return;
        }

        // results
        p.value.results.forEach(item => {
          this.$data._results.push({
            provider: p.value.provider,
            ...item,
            add: false,
          });
        });
      });
    },

    /**
     * @since 3.9.0
     */
    _onQuery(evt) {
      if ('Enter' === evt.key || 13 === evt.which || 13 === evt.keyCode) {
        evt.preventDefault();
        this.query(evt.target.value.trim());
      }
    },

    /**
     * @since 3.9.0 
     */
    _onValue(evt) {
      const value = evt.target.value.trim();
      this.$refs.reset.classList.toggle("gcd-hidden", value.length === 0);
    },

    /**
     * @since 3.9.0
     */
    _onReset() {
      this.$refs.input.focus();
      this.$refs.input.value = '';
      this.$refs.reset.classList.add("gcd-hidden");
      this.clearResults();
    },

    /**
     *
      * @param uid
     * @private
     */
    _removeItem(uid) {
      //remove feature marker
      layer.getSource().removeFeature(layer.getSource().getFeatureById(uid));
      this.$data._markers.splice(this.$data._markers.findIndex(i => uid === i.__uid), 1);
      //check if is open result list
      if (this.$data._results.length > 0) {
        this.$data._results.find(r => uid === r.__uid).add = false
      }
      //if no markers are on map
      if (this.$data._markers.length === 0){
        this._hideMarker();
      }
    },

    /**
     *  Create an OL ffeature from item result
      * @param item
     * @returns {*}
     * @private
     */
    _createOlMarker(item) {
      const coords = ol.proj.transform([
        parseFloat(item.lon),
        parseFloat(item.lat)],
        'EPSG:4326',
        GUI.getService('map').getEpsg()
      );
      //create Point geometry
      const geometry   = new ol.geom.Point(coords);
      //create OL Feture
      const feature = new ol.Feature({
          geometry,
          ...item //set properties
      });
      //set id of the feature
      feature.setId(item.__uid);
      return feature;
    },

    zoomToMarker(item) {

    },

    /**
     * @since 3.9.0
     */
    _onItemClick(evt, item) {
      if (!item.lat || !item.lon) {
        return;
      }
      evt.preventDefault();
      try {
        //in case of already add marker
        if (layer.getSource().getFeatureById(item.__uid)) {
          this._removeItem(item.__uid);
        } else {
          //add feature marker and zoom on it
          const feature = this._createOlMarker(item);
          layer.getSource().addFeature(feature);
          GUI.getService('map').zoomToFeatures([feature])
          this.$data._markers.push(item);
          item.add = true;
        }

      } catch (e) {
        console.log(e);
      }
    },
      /**
       *
       * @private
       */
    _showMarkerResults() {

      if (is_results_panel_open) {
        GUI.closeContent();
      } else {
        GUI.showQueryResults('Geocoding', {
          data: [{
            features: layer.getSource().getFeatures(),
            layer,
          }]
        });
      }

      is_results_panel_open = !is_results_panel_open;

      // GUI.showContent({
      //   content: ComponentsFactory.build({
      //     vueComponentObject: MarkersResult,
      //     propsData: {
      //       markers: this.$data._markers,
      //     },
      //   }),
      //   title: 'Markers',
      //   id: '__g3w_marker_component'
      // });
    },
  },

  created() {
    //Add marker layer on
    const mapService = GUI.getService('map');
    const map        = mapService.getMap();

    //add layer
    /**
     * @TODO take in account to change zIndex in case of add layer (wms external, vector layer)
     */
    map.addLayer(layer);
    //register vector layer for query results
    GUI.getService('queryresults')
      .registerVectorLayer(layer);

    /**
     * Register events on right content panel
     */
    //Close content
    GUI.on('closecontent', () => {
      this.$data._show_marker_info_content = false;
    });

    //Open
    GUI.onafter('setContent', content => {
      this.$data._show_marker_info_content = '__g3w_marker_component' === content.id;
    });

    MarkersEventBus.$on('remove-marker', (uid) => this._removeItem(uid));
    MarkersEventBus.$on('remove-all-markers', () => this.clearMarkers());

  },

  // watch: {
  //   '$data._markers'(items, olditems) {
  //     if (items.length === 0) {
  //       GUI.closeContent();
  //       return;
  //     }
  //     if (
  //       (null === GUI.getCurrentContent()) || //no content is show /right panel is hide
  //       (items.length === 1 && olditems.length === 1)
  //     ) {
  //       this._showMarkerResults();
  //     }
  //   }
  // },


  async mounted() {
    await this.$nextTick();
    const q = document.querySelector.bind(document);
    q('#gcd-input-query').value = /*'via sallustio 10'*/ 'cafe';
    q('#search_nominatim').click();
  },

  destroyed() {
    GUI.getService('queryresults')
      .unregisterVectorLayer(layer);
  }

};
</script>

<style scoped>
  .ol-geocoder ul.gcd-txt-result>li>a>*:not(:last-of-type) {
    margin-bottom: 10px;
  }
  li:not(.skin-background-color) {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  li.nominatim .gcd-name,
  li.nominatim .gcd-type,
  li.nominatim .gcd-icon,
  li.bing .gcd-road,
  li.bing .gcd-city,
  li.bing .gcd-country {
    display: none;
  }
  li.add, li.add:hover {
    background-color: #ffe500 !important;
  }
</style>