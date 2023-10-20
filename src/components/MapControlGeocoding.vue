<!--
  @file need some inspiration for other geocoding providers? 👉 https://github.com/Dominique92/ol-geocoder
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
        @click          = "() => query($refs.input.value)"
      >
        <i
          :class      = "g3wtemplate.getFontClass('search')"
          style       = "color: #ffffff"
          aria-hidden = "true"
        ></i>
      </button>
      <button
        ref    = "reset"
        type   = "button"
        id     = "gcd-input-reset"
        class  = "gcd-txt-reset gcd-hidden"
        @click = "_onReset"
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
          item.provider,
          item.__heading ? 'skin-background-color' : '',
          item.__no_results ? 'nominatim-noresult' : '',
        ]"
        :key    = "item.__uid"
        @click  = "_onItemClick(item)"
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

const { toRawType }      = require('utils');
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
    source: new ol.source.Vector(),
    style: new ol.style.Style({ image: pushpin_icon }),
  });

/**
 * @TODO add a server option to let user choose geocoding extent, eg:
 * 
 * - "dynamic": filter search results based on current map extent
 * - "initial": filter search results based on on initial map extent
 */
const DYNAMIC_MAP_EXTENT = false;

/**
 * Show current location/place on map as marker icon
 */
function _showMarker(coordinates, options = { transform: true }) {
  const map = GUI.getService('map').getMap();
  _hideMarker();
  coordinates = options.transform
    ? ol.proj.transform(coordinates, 'EPSG:4326', map.getView().getProjection())
    : coordinates;
  const geometry =  new ol.geom.Point(coordinates);
  layer.getSource().addFeature(new ol.Feature(geometry));
  map.addLayer(layer);
  map.zoomToGeometry(geometry)
};

/**
 * Remove marker from map
 */
function _hideMarker() {
  layer.getSource().clear();
  GUI.getService('map').getMap().removeLayer(layer);
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
      _hideMarker();
    },
    
    /**
     * Run geocoding request
     * 
     * @param { string } q query string in this format: "XCoord,YCoord,EPSGCode"
     * 
     * @since 3.9.0
     */
    query(q) {
      _hideMarker();

      return new Promise(async (resolve, reject) => {
        const isNumber     = value => 'Number' === toRawType(value) && !Number.isNaN(value);
        let coordinates    = null;
        let transform      = false;
        const [x, y, epsg] = (q || '').split(',');
        const code         = epsg && Projections.get(`EPSG:${epsg.trim()}`);

        // extract xCoord and yCoord
        if (isNumber(1 * x) && isNumber(1 * y)) {
          coordinates = [1 * x, 1 * y];
        }

        // whether EPSGCode is allowed on this project
        try {
          if (code) {
            coordinates = ol.proj.transform(coordinates, Projections.get(`EPSG:${epsg.trim()}`), 'EPSG:4326');
            transform = true;
          }
        } catch (err) {
          console.warn(err);
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

        // request is for a single point (XCoord,YCoord)
        if (coordinates) {
          _showMarker(coordinates, { transform });
          resolve(coordinates);
        }

      });
    },

    /**
     * @since 3.9.0 
     */
    _showResults(results) {
      results.forEach((p) => {

        // heading
        this.$data._results.push({
          __uid: Date.now(),
          __heading: true,
          provider: p.value.provider,
          label: p.value.label,
        });

        // no results
        if (!(p.value.results && p.value.results.length)) {
          this.$data._results.push({
            __uid: Date.now(),
            __no_results: !(p.value.results && p.value.results.length),
          });
          return;
        }

        // results
        p.value.results.forEach(item => {
          this.$data._results.push({
            __uid: Date.now(),
            provider: p.value.provider,
            ...item,
          });
          if ('nominatim' !== p.value.provider) {
            try {
              const map = GUI.getService('map').getMap();
              const coords = ol.proj.transform([parseFloat(item.lon), parseFloat(item.lat)], 'EPSG:4326', map.getView().getProjection())
              layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
              map.addLayer(layer);
            } catch (e) {
              console.log(e);
            }
          }
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
    _onItemClick(item) {
      if (!item.lat || !item.lon) {
        return () => { };
      }
      return (evt) => {
        evt.preventDefault();
        if ('nominatim' !== item.provider) {
          _showMarker([parseFloat(item.lon), parseFloat(item.lat)]);
        } else {
          try {
            const map = GUI.getService('map').getMap();
            const coords = ol.proj.transform([parseFloat(item.lon), parseFloat(item.lat)], 'EPSG:4326', map.getView().getProjection())
            layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
            map.addLayer(layer);
          } catch (e) {
            console.log(e);
          }
        }
      };
    },

  },

  /**
   * @DEBUG
   */
  async mounted() {
    await this.$nextTick();
    const q = document.querySelector.bind(document);
    q('#gcd-input-query').value = 'cafe';
    q('#search_nominatim').click();
  },

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
</style>