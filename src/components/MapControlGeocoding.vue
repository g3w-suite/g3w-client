<!--
  @file
  @since 3.9.0
-->
<template>
  <div :class="`${cssClasses.namespace} ${cssClasses.inputTextContainer}`">

    <!-- SEARCH INPUT -->
    <div :class="cssClasses.inputTextControl">
      <input
        ref             = "input"
        type            = "text"
        :id             = "cssClasses.inputQueryId"
        autocomplete    = "off"
        :class          = "cssClasses.inputTextInput"
        v-t-placeholder = "placeholder"
        @keyup          = "_onQuery"
        @input          = "_onValue"
      />
      <button
        type            = "button"
        id              = "search_nominatim"
        class           = "btn"
        @click          = "() => ctx.query(document.querySelector(`input.${this.cssClasses.inputTextInput}`).value)"
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
        :id    = "cssClasses.inputResetId"
        :class = "[cssClasses.inputTextReset, cssClassesHidden]"
        @click = "_onReset"
      ></button>
    </div>

    <!-- SEARCH RESULTS -->
    <ul
      ref    = "result"
      :class = "cssClasses.inputTextResult"
    >
      <li
        v-for   = "(item, i) in $data._results"
        :class  = "item.__heading ? item.provider + ' skin-background-color' : ''"
        :key    = "item.__uid"
        @click  = "_onItemClick(item)"
      >
        <div
          v-if  = "item.__heading"
          style = "display: flex; justify-content: space-between; padding: 5px"
        >
          <span style="color: #FFFFFF; font-weight: bold">{{ item.label }}</span>
        </div>
        <span
          v-else-if = "item.__no_results"
          class     = "nominatim-noresult"
          v-t       = "noresults"
        ></span>
        <template v-else>
          <a href="">
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
                :class = "cssClasses.road"
              >{{ item.address.name }}</div>
              <div
                v-if   = "item.address.road || item.address.building || item.address.house_number"
                :class = "cssClasses.road"
              >{{ item.address.building }} {{ item.address.road }} {{ item.address.house_number }}</div>
              <div
                v-if   = "item.address.city || item.address.town || item.address.village"
                :class = "cssClasses.city"
              >{{ item.address.postcode }} {{ item.address.city }} {{ item.address.town }} {{ item.address.village }}</div>
              <div
                v-if   = "item.address.state || item.address.country"
                :class = "cssClasses.country"
              >{{ item.address.state }} {{ item.address.country }}</div>
            </template>
          </a>
        </template>
      </li>
    </ul>

  </div>
</template>

<script>

import GUI from 'services/gui';

// import nominatim                  from 'utils/search_from_nominatim';
import bing from 'utils/search_from_bing';
// import google                     from 'utils/search_from_google';

const { toRawType } = require('utils');
const Projections = require('g3w-ol/projection/projections');

/**
 * @TODO add a server option to let user choose geocoding extent, eg:
 * 
 * - "dynamic": filter search results based on current map extent
 * - "initial": filter search results based on on initial map extent
 */
const DYNAMIC_MAP_EXTENT = false;

let timeout;

export default {

  // functional: true,

  data() {
    return {
      document,
      /** @since 3.9.0 */
      cssClasses: {
        namespace: "ol-geocoder",
        spin: "gcd-pseudo-rotate",
        hidden: "gcd-hidden",
        inputQueryId: "gcd-input-query",
        inputResetId: "gcd-input-reset",
        country: "gcd-country",
        city: "gcd-city",
        road: "gcd-road",
        olControl: "ol-control",
        inputTextContainer: "gcd-txt-container",
        inputTextControl: "gcd-txt-control",
        inputTextInput: "gcd-txt-input",
        inputTextReset: "gcd-txt-reset",
        inputTextResult: "gcd-txt-result"
      },
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
        const isNumber = value => 'Number' === toRawType(value) && !Number.isNaN(value);
        let coordinates = null;
        let transform = false;
        const [x, y, epsg] = (q || '').split(',');
        const code = epsg && Projections.get(`EPSG:${epsg.trim()}`);

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

          // const extent    = ol.proj.transformExtent(
          //   DYNAMIC_MAP_EXTENT ? GUI.getService('map').getMapExtent() : this.ctx.options.viewbox,
          //   this.ctx.options.mapCrs,
          //   'EPSG:4326'
          // );

          // clear previous result
          this.ctx.clearResults();
          this.$refs.reset.classList.add(this.cssClasses.spin);

          // request data
          const results = await Promise.allSettled(
            this.ctx.providers
              .map(p => p({
                query: q,
                lang: this.ctx.options.lang,
                countrycodes: this.ctx.options.countrycodes,
                limit: this.ctx.options.limit,
                extent: ol.proj.transformExtent(
                  p === bing ? GUI.getService('map').getMapExtent() : this.ctx.options.viewbox,
                  this.ctx.options.mapCrs,
                  'EPSG:4326'
                ),
              }))
          );

          // update search results
          results.forEach((p) => {

            // skip invalid requests
            if ('fulfilled' !== p.status) {
              return;
            }

            // heading
            this.$data._results.push({
              __uid: Date.now(),
              __heading: true,
              __no_results: !(p.value.results && p.value.results.length),
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

            console.log(this);

          });

          this.$refs.reset.classList.remove(this.cssClasses.spin);
        }

        // request is for a single point (XCoord,YCoord)
        if (coordinates) {
          this.ctx.showMarker(coordinates, { transform });
          resolve(coordinates);
          return;
        }

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
      this.$refs.reset.classList.toggle(this.cssClasses.hidden, !value.length);
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
      this.$refs.reset.classList.add(this.cssClasses.hidden);
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