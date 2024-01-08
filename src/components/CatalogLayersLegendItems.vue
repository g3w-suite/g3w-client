<!--
  @file
  @since v3.7
-->

<template>
  <div class="legend-item">

    <figure v-for="legendurl in legendurls">
        <bar-loader
          :loading="legendurl.loading"
        />

        <img
          v-show="!legendurl.loading && !legendurl.error"
          :src="legendurl.url"
          @error="setError(legendurl)"
          @load="urlLoaded(legendurl)"
        >

        <span class="divider"></span>

      </figure>

  </div>
</template>

<script>
import { CatalogEventBus as VM } from 'app/eventbus';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ApplicationService from 'services/application';
import ProjectsRegistry from 'store/projects';
import GUI from 'services/gui';

export default {

  /** @since 3.8.6 */
  name: 'catalog-layers-legend-items',

  props: {
    layers: {
      default: []
    },
    legend: {
      type: Object
    },
    active: {
      default: true
    }
  },
  data() {
    return {
      legendurls: []
    }
  },
  watch: {

    /**
     * It changes when change layer visibility
     */
    layers: {
      handler() {
        this.getLegendSrc();
      },
      immediate: false
    },

    async active(bool) {
      if (bool) {
        const changeLayersLegend = this.layers.filter(layer => layer.legend.change);
        if (this.legendurls.length === 0 || this.dynamic || changeLayersLegend.length) {
          await this.getLegendSrc(this.layers);
          changeLayersLegend.forEach(layer => layer.legend.change = false);
        }
      }
    }

  },
  methods: {

    setError(legendurl) {
      legendurl.error = true;
      legendurl.loading = false;
    },

    urlLoaded(legendurl) {
      legendurl.loading = false;
    },

    /**
     * @param   {object} params    same as `src/core/layers/legend/wmslegend.js` params
     * @param   {object} layer     layer config
     * @returns {string|undefined} legend url of a layer (undefined if `layer.id` is not in CatalogRegistry)
     */
    getLegendUrl(layer, params={}) {
      const catalogLayer = CatalogLayersStoresRegistry.getLayerById(layer.id);
      if (catalogLayer) {
          return catalogLayer.getLegendUrl(params, {
            all: !this.dynamic, // set true or false based on legend is dynamic or not
            format: 'image/png',
            categories: layer.categories
          });
      }
    },

    /**
     * Build params string url to add to base url legend
     * 
     * @since v3.8
     */
    getLegendUrlParams(urlLayerName=[]){
      let paramsUrl = '';
      const params = {
        LAYERS:[],
        STYLES:[],
        LEGEND_ON:[],
        LEGEND_OFF:[]
      };

      urlLayerName
        .reduce((_, layer) => {
          params.LAYERS.push(layer.layerName);
          params.STYLES.push(layer.style);
          if (layer.legend_on) {
            params.LEGEND_ON.push(layer.legend_on);
          }
          if (layer.legend_off) {
            params.LEGEND_OFF.push(layer.legend_off);
          }
          return params;
        }, params);

      paramsUrl += `LAYERS=${encodeURIComponent(params.LAYERS.join(','))}`;
      paramsUrl += `&STYLES=${encodeURIComponent(params.STYLES.join(','))}`;

      // Add LEGEND_ON parameter
      if (params.LEGEND_ON.length) {
        paramsUrl += `&LEGEND_ON=${encodeURIComponent(params.LEGEND_ON.join(','))}`;
      }

      // Add LEGEND_OFF parameter
      if (params.LEGEND_OFF.length) {
        paramsUrl += `&LEGEND_OFF=${encodeURIComponent(params.LEGEND_OFF.join(','))}`;
      }

      if (ApplicationService.getFilterToken()) {
        paramsUrl += `&filtertoken=${ApplicationService.getFilterToken()}`;
      }

      return paramsUrl;
    },

    /**
     * Get legend src for visible layers
     * 
     * @returns {Promise<void>}
     */
    async getLegendSrc() {

      // reset layers url
      this.legendurls = [];

      await this.$nextTick();

      // skip if not active
      if (!this.active) {
        return
      }

      const urlMethodsLayersName = {
        GET: {},
        POST: {}
      };
      const self = this;

      // filter geolayer
      const layers = this.layers.filter(layer => layer.geolayer);

      for (let i=0; i < layers.length; i++) {
        const layer = layers[i];
        const style = Array.isArray(layer.styles) && layer.styles.find(style => style.current);
        const urlLayersName =
          (layer.source && layer.source.url) || layer.external
            ? urlMethodsLayersName.GET
            : urlMethodsLayersName[layer.ows_method];

        const url = `${this.getLegendUrl(layer, this.legend.config)}`;
        // in case of no url is get
        if ("undefined" === typeof url){
          continue;
        }
        if (layer.source && layer.source.url) {
          urlLayersName[url] = [];
        } else {
          let prefix, legend_on, legend_off;

          // extract LAYER from url
          [prefix, layerName] = url.split('LAYER=');

          // extract LEGEND_ON and LEGEND_OFF from prefix -> (in case of legend categories)
          [prefix, legend_on] = prefix.split('LEGEND_ON=');
          [prefix, legend_off] = prefix.split('LEGEND_OFF=');

          if (!urlLayersName[prefix]) {
            urlLayersName[prefix] = [];
          }

          urlLayersName[prefix].unshift({
            layerName,
            style: style && style.name,
            legend_on:  (legend_on || '').replace('&', ''), // remove eventually &
            legend_off: (legend_off || '').replace('&', ''),// remove eventually &
          });
        }

      }
      for (const method in urlMethodsLayersName) {
        const urlLayersName = urlMethodsLayersName[method];
        if ('GET' === method) {
          for (let url in urlLayersName ) {
            if (urlLayersName[url].length) {
              url+=`${this.getLegendUrlParams(urlLayersName[url])}`;
            }
            this.legendurls.push({
              loading: true,
              error: false,
              url
            })
          }
        }
        else {
          for (const url in urlLayersName ) {
            const xhr = new XMLHttpRequest();
            const econdedParams = [];
            let [_url, params] = url.split('?');

            params = params.split('&');

            params.forEach(param => {
              const [key, value] = param.split('=');
              if (key) {
                econdedParams.push(`${key}=${encodeURIComponent(value)}`);
              }
            });

            params = `${econdedParams.join('&')}&${this.getLegendUrlParams(urlLayersName[url])}`;

            const legendUrlObject = {
              loading: true,
              url: null,
              error: false
            };

            xhr.open('POST', _url);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.responseType = 'blob';

            self.legendurls.push(legendUrlObject);

            xhr.onload = function() {
              if (undefined !== this.response) {
                legendUrlObject.url = window.URL.createObjectURL(this.response);
              }
              legendUrlObject.loading = false;
            };

            xhr.onerror = function() {
              legendUrlObject.loading = false;
            };

            xhr.send(params);

          }
        }
      }
    }
  },

  created() {
    /**
     * check if has a dynamic legend
     */
    this.dynamic = ProjectsRegistry.getCurrentProject().getContextBaseLegend();
    this.mapReady = false;
    /**
     * listen when layer has changed style
     */
    VM.$on('layer-change-style', (options={}) => {
      this.getLegendSrc();
    });
  },

  async mounted() {

    await this.$nextTick();

    // in case of dynamic legend
    if (this.dynamic) {
      GUI.getService('map').on('change-map-legend-params', ()=>{
        this.mapReady = true;
        this.getLegendSrc();
      });
    } else {
      this.mapReady = true;
    }

  },

};
</script>