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
      <button
        ref         = "reset"
        type        = "button"
        id          = "gcd-input-reset"
        class       = "gcd-txt-reset gcd-hidden"
        @click.stop = "_onReset"
      ></button>
    </div>

    <!-- SEARCH RESULTS -->
    <ul
      ref   = "result"
      class = "gcd-txt-result"
    >
      <li
        v-for   = "(item, i) in $data._results"
        :class  = "[
          item.add ? 'add' : '',
          item.provider,
          item.__heading ? 'skin-background-color' : '',
          item.__no_results ? 'nominatim-noresult' : '',
        ]"
        :key         = "item.__uid"
        @click.stop  = "_onItemClick($event, item)"
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

import MapControlGeocodingMarkerItems from "./MapControlGeocodingMarkerItems.vue";


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
    name: 'Geocoding Marker',
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
function _showMarker(coordinates, options = { transform: true }) {
  const mapService = GUI.getService('map');
  const map = mapService.getMap();
  coordinates = options.transform
    ? ol.proj.transform(coordinates, 'EPSG:4326', map.getView().getProjection())
    : coordinates;
  const geometry =  new ol.geom.Point(coordinates);
  mapService.zoomToGeometry(geometry);
};

/**
 * Remove marker from map
 */
function _hideMarker() {
  //clear layer features marker
  layer.getSource().clear();
};

/**
 * @since 3.9.0
 */
function _getExtentForProvider(provider, { viewbox, mapCrs }) {
  // const extent = ol.proj.transformExtent(
  //   DYNAMIC_MAP_EXTENT ? GUI.getService('map').getMapExtent() : this.options.viewbox,
  //   this.options.mapCrs,
  //   'EPSG:4326'
  // );

  return ol.proj.transformExtent(
    provider === bing ? GUI.getService('map').getMapExtent() : viewbox,
    mapCrs,
    'EPSG:4326'
  )
};



export default {

  data() {
    return {
      /** @since 3.9.0 */
      _results: [],
      _markers: []
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

  methods: {
    /**
     * Clear list of results
     * 
     * @since 3.9.0
     */
    clear() {
      this.$data._results.splice(0);
      // this.$data._markers.splice(0);
      // _hideMarker();
    },
    
    /**
     * Run geocoding request
     * 
     * @param { string } q query string in this format: "XCoord,YCoord,EPSGCode"
     * 
     * @since 3.9.0
     */
    query(q) {
      //remove markers
      _hideMarker();

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
          _showMarker(coordinates, { transform });
          resolve(coordinates);
        }

        // request is for a place (Address, Place, etc..)
        if (!coordinates) {

          // clear previous result
          this.clear();
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
          // if ('nominatim' !== p.value.provider) {
          //   try {
          //     const map = GUI.getService('map').getMap();
          //     const coords = ol.proj.transform([parseFloat(item.lon), parseFloat(item.lat)], 'EPSG:4326', map.getView().getProjection())
          //     layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
          //   } catch (e) {
          //     console.log(e);
          //   }
          // }
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
      this.$refs.reset.classList.toggle("gcd-hidden", !value.length);
    },

    /**
     * @since 3.9.0
     */
    _onReset() {
      this.$refs.input.focus();
      this.$refs.input.value = '';
      this.$refs.reset.classList.add("gcd-hidden");
      this.clear();
    },

    /**
     * @since 3.9.0
     */
    _onItemClick(evt, item) {
      if (!item.lat || !item.lon) {
        return;
      }
      evt.preventDefault();
      if (false && 'nominatim' !== item.provider) {
        _showMarker([parseFloat(item.lon), parseFloat(item.lat)]);
      } else {
        try {
          //in case of already add marker
          if (layer.getSource().getFeatureById(item.__uid)) {
            //remove feature marker
            layer.getSource().removeFeature(layer.getSource().getFeatureById(item.__uid));
            this.$data._markers.splice(this.$data._markers.findIndex(i => item.__uid === i.__uid), 1);
            item.add = false;
          } else {
            //add feature marker and zoom on it
            const map    = GUI.getService('map').getMap();
            const coords = ol.proj.transform([parseFloat(item.lon), parseFloat(item.lat)], 'EPSG:4326', map.getView().getProjection());
            const geom   = new ol.geom.Point(coords);
            const feature = new ol.Feature(geom, {
              //Put here property
            });
            //set id of the feature
            feature.setId(item.__uid);
            layer.getSource().addFeature(feature);
            GUI.getService('map').zoomToGeometry(geom);
            this.$data._markers.push(item);
            item.add = true;
          }

        } catch (e) {
          console.log(e);
        }

      }
    },

  },

  created() {
    //Add marker layer on
    const mapService = GUI.getService('map');
    const map        = mapService.getMap();
    //add layer
    map.addLayer(layer);
    //register vector layer for query results
    GUI.getService('queryresults')
      .registerVectorLayer(layer);
    /**
     * @TODO take in account to change zIndex in case of add layer (wms external, vector layer)
     */
  },

  watch: {
    '$data._markers'(items, olditems) {
      if (items.length === 0) {
        GUI.closeContent();
        return;
      }
      if (
        (null === GUI.getCurrentContent()) || //no content is show /right panel is hide
        (items.length === 1 && olditems.length === 1)
      ) {
        GUI.showContent({
          content: ComponentsFactory.build({
            vueComponentObject: MapControlGeocodingMarkerItems,
            propsData: {
              markers: this.$data._markers,
            },
          }),
          title: 'Markers'
        })
      }
    }
  },


  async mounted() {
    await this.$nextTick();
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