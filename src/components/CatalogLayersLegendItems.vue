<!-- ORIGINAL SOURCE: -->
<!-- catalog/vue/legend_items.html@v3.4 -->
<!-- gui/catalog/vue/catalog.js@v3.4 -->

<template>
  <div class="legend-item">
    <figure v-for="legendurl in legendurls" :key="legendurl.url">
      <bar-loader :loading="legendurl.loading"></bar-loader>
      <img v-show="!legendurl.loading && !legendurl.error" :src="legendurl.url" @error="setError(legendurl)" @load="urlLoaded(legendurl)">
      <span class="divider"></span>
    </figure>
  </div>
</template>

<script>
import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ApplicationService from 'services/application';
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
    layers: {
      handler(layers){
        // used to preved duplicate legend
        setTimeout(()=>{
          this.mapReady && this.getLegendSrc(layers)
        })
      },
      immediate: false
    },
    active(bool) {
      if (bool && this.waitinglegendsurls.length) {
        this.legendurls = [...this.waitinglegendsurls];
        this.waitinglegendsurls = [];
      }
    }
  },
  methods: {
    setError(legendurl){
      legendurl.error = true;
      legendurl.loading = false;
    },
    urlLoaded(legendurl){
      legendurl.loading = false;
    },
    getLegendUrl(layer, params={}) {
      let legendurl;
      const catalogLayers = CatalogLayersStoresRegistry.getLayersStores();
      catalogLayers.forEach(layerStore => {
        if (layerStore.getLayerById(layer.id)) {
          legendurl = layerStore.getLayerById(layer.id).getLegendUrl(params);
          return false
        }
      });
      return legendurl;
    },
    async getLegendSrc(_layers) {
      const urlMethodsLayersName = {
        GET: {},
        POST: {}
      };
      const self = this;
      this.legendurls = [];
      this.waitinglegendsurls = [];
      await this.$nextTick();
      // need to filter geolayer
      const layers = _layers.filter(layer => layer.geolayer);
      for (let i=0; i< layers.length; i++) {
        const layer = layers[i];
        const style = Array.isArray(layer.styles) && layer.styles.find(style => style.current);
        const urlLayersName = (layer.source && layer.source.url) || layer.external ? urlMethodsLayersName.GET : urlMethodsLayersName[layer.ows_method];
        const url = `${this.getLegendUrl(layer, this.legend.config)}`;
        if (layer.source && layer.source.url) urlLayersName[url] = [];
        else {
          const [prefix, layerName] = url.split('LAYER=');
          if (!urlLayersName[prefix]) urlLayersName[prefix] = [];
          urlLayersName[prefix].unshift({
            layerName,
            style: style && style.name
          });
        }
      }
      for (const method in urlMethodsLayersName) {
        const urlLayersName = urlMethodsLayersName[method];
        if (method === 'GET')
          for (const url in urlLayersName ) {
            const legendUrl = urlLayersName[url].length ? `${url}&LAYER=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.layerName).join(','))}&STYLES=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.style).join(','))}${ApplicationService.getFilterToken() ? '&filtertoken=' + ApplicationService.getFilterToken(): '' }`: url;
            const legendUrlObject = {
              loading: true,
              url: legendUrl,
              error: false
            };
            this.active ? this.legendurls.push(legendUrlObject) : this.waitinglegendsurls.push(legendUrlObject);
          }
        else {
          for (const url in urlLayersName ) {
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
            params+= `&STYLES=${encodeURIComponent(urlLayersName[url].map(layerObj => layerObj.style).join(','))}`;
            params+= `${ApplicationService.getFilterToken() ? '&filtertoken=' + ApplicationService.getFilterToken(): '' }`;
            xhr.open('POST', _url);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.responseType = 'blob';
            const legendUrlObject = {
              loading: true,
              url: null,
              error: false
            };
            self.active ? self.legendurls.push(legendUrlObject): self.waitinglegendsurls.push(legendUrlObject);
            xhr.onload = function() {
              const data = this.response;
              if (data !== undefined)
                legendUrlObject.url = window.URL.createObjectURL(data);
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
  created(){
    this.mapReady = false;
    this.waitinglegendsurls = []; // urls that are waiting to be loaded
    CatalogEventHub.$on('layer-change-style', (options={}) => {
      const {layerId} = options;
      let changeLayersLegend =[];
      if (layerId){
        const layer = this.layers.find(layer => layerId == layer.id);
        layer && changeLayersLegend.push(layer);
      } else changeLayersLegend = this.layers;
      changeLayersLegend.length && this.getLegendSrc(changeLayersLegend);
    });
    CatalogEventHub.$on('layer-change-categories', layer => {
      this.getLegendSrc(this.layers);
    })
  },
  async mounted() {
    await this.$nextTick();
    const mapService = GUI.getService('map');
    mapService.on('change-map-legend-params', ()=>{
      this.mapReady = true;
      this.getLegendSrc(this.layers);
    })
  },
};
</script>