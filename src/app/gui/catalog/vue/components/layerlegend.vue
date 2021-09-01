<template>
  <div v-show="layer.visible && legend.show" class="layer-legend">
    <bar-loader :loading="legend.loading"></bar-loader>
    <figure>
      <img v-show="!legend.error" :src="legend.url" @error="setError()" @load="urlLoaded()">
      <span class="divider"></span>
    </figure>
  </div>
</template>

<script>
  import CatalogEventHub from '../catalogeventhub';
  const ApplicationService = require('core/applicationservice');
  const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
  const GUI = require('gui/gui');
  export default {
    name: "layerlegend",
    props: {
      layer: {
        type: Object
      }
    },
    data(){
      return {}
    },
    computed:{
      legend(){
        return this.layer.legend;
      }
    },
    methods: {
      setError() {
        this.legend.error = true;
        this.legend.loading = false;
      },
      urlLoaded() {
        this.legend.loading = false;
      },
      getLegendUrl (layer) {
        let legendurl;
        const layerStore = CatalogLayersStoresRegistry.getLayersStores().find(layerStore => layerStore.getLayerById(layer.id));
        legendurl = layerStore && layerStore.getLayerById(layer.id).getLegendUrl(this.legendParams);
        return legendurl;
      },
      async getLegendSrc(layer) {
        const urlMethodsLayersName = {
          GET: {},
          POST: {}
        };
        const self = this;
        await this.$nextTick();
        const style = Array.isArray(layer.styles) && layer.styles.find(style => style.current);
        const urlLayersName = (layer.source && layer.source.url) || layer.external ? urlMethodsLayersName.GET : urlMethodsLayersName[layer.ows_method];
        const url = `${this.getLegendUrl(layer)}`;
        if (layer.source && layer.source.url) urlLayersName[url] = [];
        else {
          const [prefix, layerName] = url.split('LAYER=');
          if (!urlLayersName[prefix]) urlLayersName[prefix] = [];
          urlLayersName[prefix].unshift({
            layerName,
            style: style && style.name
          });
        }
        for (const method in urlMethodsLayersName) {
          const urlLayersName = urlMethodsLayersName[method];
          if (method === 'GET') {
            for (const url in urlLayersName) {
              this.legend.url = urlLayersName[url].length ? `${url}&LAYER=${urlLayersName[url].map(layerObj => layerObj.layerName).join(',')}&STYLES=${urlLayersName[url].map(layerObj => layerObj.style).join(',')}${ApplicationService.getFilterToken() ? '&filtertoken=' + ApplicationService.getFilterToken() : ''}` : url;
              this.legend.loading = true;
            }
          } else {
            for (const url in urlLayersName) {
              const xhr = new XMLHttpRequest();
              let [_url, params] = url.split('?');
              params = params.split('&');
              const econdedParams = [];
              params.forEach(param => {
                const [key, value] = param.split('=');
                econdedParams.push(`${key}=${encodeURIComponent(value)}`);
              });
              params = econdedParams.join('&');
              params = `${params}&LAYERS=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.layerName).join(','))}`;
              params += `&STYLES=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.style).join(','))}`;
              params += `${ApplicationService.getFilterToken() ? '&filtertoken=' + ApplicationService.getFilterToken() : ''}`;
              xhr.open('POST', _url);
              xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
              xhr.responseType = 'blob';
              self.legend.loading = true;
              xhr.onload = function () {
                const data = this.response;
                if (data !== undefined)
                  self.legend.url = window.URL.createObjectURL(data);
                self.legend.loading = false;
              };
              xhr.onerror = function () {
                self.legend.loading = false;
              };
              xhr.send(params);
            }
          }
        }
      }
    },
    created() {
      this.legendParams = ApplicationService.getConfig().layout ? ApplicationService.getConfig().layout.legend : {};
      this.mapReady = false;
      CatalogEventHub.$on('layer-change-style', (layerObj={})  => {
        const { layerId } = layerObj;
        layerId === this.layer.id && this.getLegendSrc(this.layer);
      })
    },
    async mounted() {
      await this.$nextTick();
      const mapService = GUI.getComponent('map').getService();
      mapService.on('change-map-legend-params', () => {
        this.mapReady = true;
        this.getLegendSrc(this.layer);
      })
    }
  }
</script>

<style scoped>

</style>