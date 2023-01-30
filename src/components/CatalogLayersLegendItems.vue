<!--
  @file
  @since v3.7
-->

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
     * It change when check/uncheck layer on toc
     */
    layers: {
      handler(){
       //reset the legend urls array
       this.legendurls = [];
      },
      immediate: false
    },
    active(bool) {
      if (bool && (this.dynamic || this.legendurls.length === 0)) {
        this.getLegendSrc(this.layers);
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
      //need to be active
      if (this.active) {
        const urlMethodsLayersName = {
          GET: {},
          POST: {}
        };
        const self = this;
        this.legendurls = [];
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
              this.legendurls.push(legendUrlObject)
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
    }
  },
  created(){
    /**
     * check if has a dynamic legend
     */
    this.dynamic = ProjectsRegistry.getCurrentProject().getContextBaseLegend();
    this.mapReady = false;
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
    /** In case of dynamic legend **/
    if (this.dynamic) {
      mapService.on('change-map-legend-params', ()=>{
        this.mapReady = true;
        this.getLegendSrc(this.layers);
      });
    } else this.mapReady = true;
  },
};
</script>