<!--
  @file
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
        @click          = "() => ctx.query($refs.input.value)"
      >
        <i
          :class      = "fontIcon"
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
          item.__heading ? item.provider + ' skin-background-color' : '',
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
          <!-- TODO: remove outer link (which is used only for styling purposes..) -->
          <a href="" draggable="false">
            <img
              v-if="'nominatim' !== item.provider"
              style="float: right;"
              src="/static/client/images/pushpin.svg"
              width="24"
              height="24"
            />
            <div v-if="item.type && 'nominatim' !== item.provider">{{ item.type }}</div>
            <div v-if="item.name && 'nominatim' !== item.provider">{{ item.name }}</div>
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
const { toRawType } = require('utils');
const Projections = require('g3w-ol/projection/projections');

let timeout;

export default {

  // functional: true,

  data() {
    return {
      document,
      /** @since 3.9.0 */
      _results: [],
    };
  },

  props: {

    fontIcon: {
      type: String,
      required: true
    },

    placeholder: {
      type: String,
      required: true
    },

    ctx: {
      type: Object,
      required: true
    },

    /**
     * @since 3.9.0
     */
    noresults: {
      type: String,
      required: true
    },

  },

  methods: {

    clear() {
      this.$data._results.splice(0);
    },

    /**
     * @since 3.9.0
     */
    query(q) {
      this.ctx.hideMarker();

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
          this.ctx.clearResults();
          this.$refs.reset.classList.add("gcd-pseudo-rotate");

          // request data
          const results = await Promise.allSettled(
            this.ctx.providers
              .map(p => p({
                query:        q,
                lang:         this.ctx.options.lang,
                countrycodes: this.ctx.options.countrycodes,
                limit:        this.ctx.options.limit,
                extent:       this.ctx.getExtentForProvider(p),
              }))
          );

          // update search results
          this._showResults(results.filter(p => 'fulfilled' === p.status));
          this.$refs.reset.classList.remove("gcd-pseudo-rotate");
        }

        // request is for a single point (XCoord,YCoord)
        if (coordinates) {
          this.ctx.showMarker(coordinates, { transform });
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
              const coords = ol.proj.transform([parseFloat(item.lon), parseFloat(item.lat)], 'EPSG:4326', this.ctx.getMap().getView().getProjection())
              this.ctx.layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
              this.ctx.getMap().addLayer(this.ctx.layer);
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
        this.ctx.query(evt.target.value.trim());
      }
    },

    _onValue(evt) {
      const value = evt.target.value.trim();
      this.$refs.reset.classList.toggle("gcd-hidden", !value.length);
      if (this.ctx.options.autoComplete && timeout) {
        clearTimeout(timeout)
      }
      if (this.ctx.options.autoComplete) {
        timeout = setTimeout(() => (value.length >= this.ctx.options.autoCompleteMinLength) && this.ctx.query(value), 200);
      }
    },

    /**
     * @since 3.9.0
     */
    _onReset() {
      this.$refs.input.focus();
      this.$refs.input.value = '';
      this.$refs.reset.classList.add("gcd-hidden");
      this.ctx.clearResults();
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
          if (false === this.ctx.options.keepOpen) {
            this.ctx.clearResults(true);
          }
          this.ctx.showMarker([parseFloat(item.lon), parseFloat(item.lat)]);
        } else {
          try {
            const coords = ol.proj.transform([parseFloat(item.lon), parseFloat(item.lat)], 'EPSG:4326', this.ctx.getMap().getView().getProjection())
            this.ctx.layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
            this.ctx.getMap().addLayer(this.ctx.layer);
          } catch (e) {
            console.log(e);
          }
        }
      };
    },

  },

};
</script>

<style>.ol-geocoder ul.gcd-txt-result>li>a>*:not(:last-of-type) {
  margin-bottom: 10px;
}</style>