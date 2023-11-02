<!--
  @file need some inspiration for other geocoding providers?

  👉 https://github.com/Dominique92/ol-geocoder
  👉 https://github.com/perliedman/leaflet-control-geocoder

  @since 3.9.0
-->
<template>
  <div class="ol-geocoder" v-disabled="$data._disabled">

    <div class="gcd-txt-control">

      <!-- INPUT SEARCH -->
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

      <!-- RESET SEARCH -->
      <button
        ref         = "reset"
        type        = "button"
        id          = "gcd-input-reset"
        class       = "gcd-txt-reset gcd-hidden"
        @click.stop = "_onReset"
      ></button>

      <!-- SUBMIT SEARCH -->
      <button
        type            = "button"
        id              = "gcd-search"
        class           = "btn"
        @click.stop     = "() => query($refs.input.value)"
      >
        <i
          :class      = "g3wtemplate.getFontClass('search')"
          style       = "color: #fff"
          aria-hidden = "true"
        ></i>
      </button>

      <!-- CLEAR MARKERS SELECTION --->
      <button
        v-if="$data._markers.length > 0"
        type            = "button"
        id              = "gcd-trash"
        class           = "btn skin-background-color"
        @click.stop     = "clearMarkers"
      >
        <i
          :class      = "g3wtemplate.getFontClass('trash')"
          aria-hidden = "true"
        ></i>
      </button>

      <!-- TOGGLE MARKERS VISIBLITY -->
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

      <!-- TOGGLE SIDEBAR PANEL -->
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
          item.__heading    ? 'skin-background-color' : '',
          item.__no_results ? 'gcd-noresult' : '',
          item.add          ? 'selected' : '',
        ]"
        :key         = "item.__uid"
        @click.stop = "_onItemClick($event, item)"
      >
        <!-- GEOCODING PROVIDER (eg. "Nominatim OSM") -->
        <div
          v-if  = "item.__heading"
          style = "display: flex; justify-content: space-between; padding: 5px"
        >
          <span style="color: #FFF; font-weight: bold">{{ item.label }}</span>
        </div>
        <!-- NO RESULTS -->
        <span
          v-else-if = "item.__no_results"
          v-t       = "noresults"
        ></span>
        <!-- NO RESULTS -->
        <template v-else>
          <span
            style       = "color: #000; padding: 5px;"
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
import GUI                           from 'services/gui';
import ApplicationState              from 'store/application-state';
import nominatim                     from 'utils/search_from_nominatim';
import bing                          from 'utils/search_from_bing';
import google                        from 'utils/search_from_google';
import QueryResultsActionChooseLayer from 'components/QueryResultsActionChooseLayer.vue';
import { PluginsRegistry }           from "store";
import CatalogLayersStoresRegistry   from 'store/catalog-layers';
import { toRawType }                 from 'utils';

const {
  Geometry,
  singleGeometriesToMultiGeometry,
}                                   = require('utils/geo');

const Projections                    = require('g3w-ol/projection/projections');

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
      _visible                 : true,   //set visibility of layer
      _disabled                : false, //disabled boolean control
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
      return this.$data._markers.length > 0;
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
     *
     * @since 3.9.0
     */
    _toggleLayerVisibility() {
      this.$data._visible = !this.$data._visible;
      layer.setVisible(this.$data._visible);
    },

    /**
     * Clear Result list only
     *
     * @since 3.9.0
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
          this.$refs.reset.classList.add("gcd-spin");

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
          this.$refs.reset.classList.remove("gcd-spin");
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
     * @param uid
     * 
     * @since 3.9.0
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
     * Create an OL ffeature from item result
     *
     * @param item
     * 
     * @returns {*}
     *
     * @since 3.9.0
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
       * Show only markers on
       * @private
       */
    _showMarkerResults() {
      if (is_results_panel_open) {
        GUI.closeContent();
      } else {
        //check if is already open right panel
        if (GUI.getCurrentContent()) {
          GUI.closeContent();
        }
        GUI.showQueryResults('Geocoding', { data: [{ layer, features: layer.getSource().getFeatures() }] });
        is_results_panel_open = true;
      }
    },

  },

  created() {
    const queryresults = GUI.getService('queryresults');

    //Add marker layer on
    const mapService = GUI.getService('map');
    const map        = mapService.getMap();

    //add layer
    /**
     * @TODO take in account to change zIndex in case of add layer (wms external, vector layer)
     */
    map.addLayer(layer);

    //register vector layer for query results
    queryresults.registerVectorLayer(layer);

    /**
     * Register events on right content panel
     */
    //Close content
    GUI.on('closecontent', () => {
      is_results_panel_open = false;
    })

    GUI.onafter('setContent', () => {
      if (is_results_panel_open) {
        is_results_panel_open = false;
      }
    });

    queryresults.onafter('removeFeatureLayerFromResult', (layer, feature) => {
      if ('__g3w_marker' === layer.id) {
        this._removeItem(feature.attributes.__uid);
      }
    });

    // TODO: delegate attaching listener to addCurrentActionToolsLayer
    queryresults.onafter('addActionsForLayers', (actions, layers) => {

      const layer = layers.find(layer => '__g3w_marker' === layer.id);

      if (!layer) {
        return;
      }

      //Get editing layers that has Point/MultiPoint Geometry type
      const pointEditingLayers =  CatalogLayersStoresRegistry
          .getLayers({ EDITABLE: true, GEOLAYER: true })
          .filter(l => Geometry.isPointGeometryType(l.getGeometryType()))
          .map((l)=>({ id: l.getId(), name: l.getName() }));

      if (pointEditingLayers.length === 0) {
          return;
      }
      // Add
      queryresults.addCurrentActionToolsLayer({
        id: QueryResultsActionChooseLayer.name,
        layer,
        config: {
          // editable point layers for the project
          layers: pointEditingLayers,
          // create new feature on layer point geometry
          icon: 'pencil',
          label: 'Choose a layer where to add this feature',
          cbk: (layerId, feature) => {
            const editing = PluginsRegistry.getPlugin('editing');
            // skip on missing plugin dependency
            if (!editing) {
              return;
            }
            editing
              .getApi()
              .addLayerFeature({
                layerId: layerId,
                feature: new ol.Feature({
                  //check if is Multi Geometry (MultiPoint)
                  geometry:  Geometry.isMultiGeometry(CatalogLayersStoresRegistry.getLayerById(layerId).getGeometryType())
                    ? singleGeometriesToMultiGeometry([feature.geometry])
                    : feature.geometry,
                  ...feature.attributes
                })
              });
          },
        },
        action: {
          id: 'choose_layer',
          class: GUI.getFontClass('pencil'),
          state: queryresults.createActionState({ layer }),
          toggleable: true,
          hint: 'Choose a layer',
          cbk: (layer, feature, action, index) => {
            action.state.toggled[index] = !action.state.toggled[index];
              queryresults.setCurrentActionLayerFeatureTool({
              layer,
              index,
              action,
              component: (action.state.toggled[index] ? QueryResultsActionChooseLayer : null),
            });
          },
        },
      });

    });

  },


  async mounted() {
    await this.$nextTick();
    const q = document.querySelector.bind(document);
    q('#gcd-input-query').value = /*'via sallustio 10'*/ 'cafe';
    q('#gcd-search').click();
  },

  destroyed() {
    GUI.getService('queryresults')
      .unregisterVectorLayer(layer);
  }

};
</script>

<style scoped>
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

  #gcd-search {
    z-index: 1;
    width: 2.5em;
    height: 100%;
    border-radius: 0;
    background-color: var(--skin-color, #fff);
  }

  #gcd-trash,
  #show-markers-results,
  #markers-visibility-layer {
    z-index: 1;
    border-radius: 0 !important;
    color: #FFF;
    border-left: 1px solid #fff;
  }

  #gcd-trash {
    color: #f00;
  }

  #gcd-input-query {
    font-weight: bold;
  }

  .gcd-txt-reset::after {
    content: "\d7";
    display: inline-block;
    font-weight: bold;
    font-size: 2em;
    cursor: pointer;
    color: var(--skin-color);
  }

  .gcd-txt-reset {
    z-index: 1;
    width: 2.5em;
    height: 100%;
    line-height: 100%;
    border: none;
    background-color: transparent;
    display: inline-block;
    vertical-align: middle;
    outline: 0;
    cursor: pointer;
  }

  .gcd-txt-input:focus {
    outline: none;
  }

  .gcd-txt-input {
    z-index: 1;
    border: 0;
    width: 100%;
    height: 100%;
    padding: 5px 5px 5px 5px;
    text-indent: 6px;
    background-color: transparent;
    font-family: inherit;
    font-size: 1em;
  }

  .gcd-txt-control {
    position: relative;
    display: flex;
    justify-content: flex-end;
    height: 40px;
    background-color: #fff;
    overflow: hidden;
    border-radius: 2px;
    margin-left: 2px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    width: 100%;
    border: 2px solid var(--skin-color)
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .gcd-road {
    font-size: 0.875em;
    font-weight: 500;
  }

  .gcd-city {
    font-size: 1em;
    font-weight: bold;
  }

  .gcd-country {
    font-size: 0.75em;
  }

  .gcd-spin::after {
    animation: spin .7s linear infinite;
  }

  .gcd-hidden {
    display: none !important;
  }

  li.skin-background-color {
    position: sticky;
    top: 0;
  }

  li.selected {
    background-color: #f7fabf !important;
  }

  li.gcd-noresult:hover {
    background-color: transparent !important;
  }

  li.gcd-noresult {
    font-weight: bold;
    color: #384247;
    margin: 10px;
    border-bottom: 0 !important;
  }
</style>

<style>
  /* Geocoder */
  .ol-geocoder {
    box-sizing: border-box;
    position: absolute;
    max-width: 300px;
    height: 4.375em;
    top: 7px;
    left: 45px;
    width: 50%;
    height: 6px;
  }

  @media (max-width: 767px) {
    .ol-geocoder {
      left: 10px;
    }
  }

  .ol-geocoder > ul > li:hover {
    background-color: #eee;
  }

  .ol-geocoder > ul > li {
    width: 100%;
    overflow: hidden;
    padding: 0;
    line-height: 1rem;
    color: #fff;
    min-height: 30px;
    padding-left: 3px;
    border-bottom: 2px solid var(--skin-color);
    min-height: 20px;
    padding: 10px;
    font-size: 1.1em;
  }

  .ol-geocoder > ul {
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.3);
    border-radius: 3px !important;
    margin-left: 3px;
    width: 100%;
    max-height: 200px;
    white-space: normal;
    list-style: none;
    padding: 0;
    margin-top: 3px;
    background-color: white;
    border-top: none;
    overflow-x: hidden;
    overflow-y: auto;
    transition: max-height 300ms ease-in;
  }

  .ol-geocoder > ul > li > a {
    display: block;
    text-decoration: none;
    padding: 3px 5px;
    color: #000;
  }

  .ol-geocoder > ul > li > a > *:not(:last-of-type) {
    margin-bottom: 10px;
  }

  .ol-geocoder > ul > li:last-child {
    border-bottom: 0 !important;
  }
</style>