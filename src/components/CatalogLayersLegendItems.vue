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
import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ApplicationService from 'services/application';
import ProjectsRegistry from 'store/projects';
import GUI from 'services/gui';

export default {
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

    getLegendUrl(layer, params={}) {
      const catalogLayer = CatalogLayersStoresRegistry
        .getLayerById(layer.id);
      return catalogLayer && catalogLayer.getLegendUrl(params, { format: 'image/png', categories: layer.categories });
    },

    /**
     * get legend src for visible layers
     * @returns {undefined}
     */
    async getLegendSrc() {
      /**
       * need to be reset layers url
       ***/
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

        if (layer.source && layer.source.url) {
          urlLayersName[url] = [];
        } else {
          const [prefix, layerName] = url.split('LAYER=');
          if (!urlLayersName[prefix]) {
            urlLayersName[prefix] = [];
          }
          urlLayersName[prefix].unshift({ layerName, style: style && style.name });
        }

      }

      for (const method in urlMethodsLayersName) {
        const urlLayersName = urlMethodsLayersName[method];
        if ('GET' === method) {
          for (const url in urlLayersName ) {
            this.legendurls.push({
              loading: true,
              url: (urlLayersName[url].length)
                ? `${url}LAYERS=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.layerName).join(','))}&STYLES=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.style).join(','))}${ApplicationService.getFilterToken() ? '&filtertoken=' + ApplicationService.getFilterToken() : '' }`
                : url,
              error: false
            })
          }
        } else {
          for (const url in urlLayersName ) {
            const xhr = new XMLHttpRequest();
            const econdedParams = [];
            let [_url, params] = url.split('?');

            params = params.split('&');

            params.forEach(param => {
              const [key, value] = param.split('=');
              econdedParams.push(`${key}=${encodeURIComponent(value)}`);
            });

            params = econdedParams.join('&');

            params = `${params}&LAYERS=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.layerName).join(','))}`;
            params += `&STYLES=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.style).join(','))}`;
            params += `${ApplicationService.getFilterToken() ? '&filtertoken=' + ApplicationService.getFilterToken(): '' }`;
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
              const data = this.response;
              if (undefined !== data) {
                legendUrlObject.url = window.URL.createObjectURL(data);
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
    CatalogEventHub.$on('layer-change-style', (options={}) => {
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