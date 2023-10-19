<!--
  @file
  @since 3.9.0
-->
<template>
  <div :class="`${cssClasses.namespace} ${cssClasses.inputTextContainer}`">

    <div :class="cssClasses.inputTextControl">
      <input
        ref             = "input"
        type            = "text"
        :id             = "cssClasses.inputQueryId"
        autocomplete    = "off"
        :class          = "cssClasses.inputTextInput"
        v-t-placeholder = "placeholder"
        @keyup          = "_onQuery"
        @input          = "_onQuery"
      />
      <button
        type   = "button"
        id     = "search_nominatim"
        class  = "btn"
        @click = "() => ctx.query(document.querySelector(`input.${this.cssClasses.inputTextInput}`).value)"
      >
        <i :class="fontIcon" style="color: #ffffff" aria-hidden="true"></i>
      </button>
      <button
        ref    = "reset"
        type   = "button"
        :id    = "cssClasses.inputResetId"
        :class = "[cssClasses.inputTextReset, cssClassesHidden]"
        @click = "_onReset"
      ></button>
    </div>

    <ul ref="result" :class="cssClasses.inputTextResult">
      <!-- FIXME: -->
      <li v-if="_no_results" class="nominatim-noresult" v-t="noresults"></li>
    </ul>

  </div>
</template>

<script>

import GUI                        from 'services/gui';

// import nominatim                  from 'utils/search_from_nominatim';
import bing                       from 'utils/search_from_bing';
// import google                     from 'utils/search_from_google';

const { toRawType } = require('utils');
const Projections   = require('g3w-ol/projection/projections');

/**
 * HTML ENCODER (but why, is there any potential dangerous HTML ?)
 */
function h(text) {
  return String(undefined === text ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
        namespace:           "ol-geocoder",
        spin:                "gcd-pseudo-rotate",
        hidden:              "gcd-hidden",
        inputQueryId:        "gcd-input-query",
        inputResetId:        "gcd-input-reset",
        country:             "gcd-country",
        city:                "gcd-city",
        road:                "gcd-road",
        olControl:           "ol-control",
        inputTextContainer:  "gcd-txt-container",
        inputTextControl:    "gcd-txt-control",
        inputTextInput:      "gcd-txt-input",
        inputTextReset:      "gcd-txt-reset",
        inputTextResult:     "gcd-txt-result"
      },
      /** @since 3.9.0 */
      _no_results: false,
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

    /**
     * @since 3.9.0
     */
    noResultsFound() {
      this._no_results = true;
    },

    clear() {
      this._no_results = false;
      this.$refs.result.replaceChildren();
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
        const code         =  epsg && Projections.get(`EPSG:${epsg.trim()}`);

        // extract xCoord and yCoord
        if (isNumber(1*x) && isNumber(1*y)) {
          coordinates = [1*x, 1*y];
        }

        // whether EPSGCode is allowed on this project
        try {
          if (code) {
            coordinates = ol.proj.transform(coordinates, Projections.get(`EPSG:${epsg.trim()}`), 'EPSG:4326');
            transform = true;
          }
        } catch(err) {
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
                query:        q,
                lang:         this.ctx.options.lang,
                countrycodes: this.ctx.options.countrycodes,
                limit:        this.ctx.options.limit,
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

            console.log(p);

            const ul = this.$refs.result;

            const heading = document.createElement('li');
            heading.innerHTML = `<div style="display: flex; justify-content: space-between; padding: 5px">`
                              + `<span style="color: #FFFFFF; font-weight: bold">${p.value.label}</span>`
                              + `</div>`;
            heading.classList.add("skin-background-color");

            ul.appendChild(heading);
          
            if (!(p.value.results && p.value.results.length)) {
              this.noResultsFound();
            } else {
              p.value.results.forEach(({ name, type, address, lon, lat }) => {
                const html = [];
                
                // build template string
                if ('nominatim' !== p.value.provider)                         html.push(`<img style="float: right;" src="/static/client/images/pushpin.svg" width="24" height="24"></img>`);
                if (type && 'nominatim' !== p.value.provider)                 html.push(`<div>${type}</div>`);
                if (name && 'nominatim' !== p.value.provider)                 html.push(`<div>${name}</div>`);
                if (address.name)                                             html.push(`<div class="${ this.cssClasses.road }">${h(name)}</div>`);
                if (address.road || address.building || address.house_number) html.push(`<div class="${ this.cssClasses.road }">${h(address.building)} ${h(address.road)} ${h(address.house_number)}</div>`);
                if (address.city || address.town || address.village)          html.push(`<div class="${ this.cssClasses.city }">${h(address.postcode)} ${h(address.city)} ${h(address.town)} ${h(address.village)}</div>`);
                if (address.state || address.country)                         html.push(`<div class="${ this.cssClasses.country }">${h(address.state)} ${h(address.country)}</div>`);

                let li = document.createElement('li');

                if (p.value.provider) {
                  li.classList.add(p.value.provider);
                }

                li.innerHTML   = `<a href="#">${html.join('<br>')}</a>`;

                // append childs (in memory)
                const frag     = document.createDocumentFragment();
                while (li.childNodes[0]) frag.appendChild(li.childNodes[0]);
                li.appendChild(frag);

                if ('nominatim' === p.value.provider) {
                  // click to select
                  li.addEventListener('click', evt => {
                    evt.preventDefault();
                    if('nominatim' !== p.value.provider) {
                      if (false === this.ctx.options.keepOpen) {
                        this.ctx.clearResults(true);
                      }
                      this.ctx.showMarker([ parseFloat(lon), parseFloat(lat) ]);
                    } else {
                      try {
                        const coords = ol.proj.transform([ parseFloat(lon), parseFloat(lat) ], 'EPSG:4326', this.ctx.getMap().getView().getProjection())
                        this.ctx.layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
                        this.ctx.getMap().addLayer(this.ctx.layer);  
                      } catch(e) {
                        console.log(e);
                      }
                    }
                  }, false);
                } else {
                  try {
                    const coords = ol.proj.transform([ parseFloat(lon), parseFloat(lat) ], 'EPSG:4326', this.ctx.getMap().getView().getProjection())
                    this.ctx.layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
                    this.ctx.getMap().addLayer(this.ctx.layer);  
                  } catch(e) {
                    console.log(e);
                  }
                }
          
                ul.appendChild(li);
              });
            }
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
      if(this.ctx.options.autoComplete) {
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

  },

};
</script>
