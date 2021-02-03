import { createCompiledTemplate } from 'gui/vue/utils';
const ApplicationService = require('core/applicationservice');
const {inherit, base, downloadFile, debounce} = require('core/utils/utils');
const t = require('core/i18n/i18n.service').t;
const Component = require('gui/vue/component');
const TableComponent = require('gui/table/vue/table');
const ComponentsRegistry = require('gui/componentsregistry');
const GUI = require('gui/gui');
const ControlsRegistry = require('gui/map/control/registry');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const Service = require('../catalogservice');
const ChromeComponent = VueColor.Chrome;
const CatalogEventHub = new Vue();
const compiledTemplate = createCompiledTemplate(require('./catalog.html'));
const DEFAULT_ACTIVE_TAB = 'layers';

const vueComponentOptions = {
  ...compiledTemplate,
  data() {
    return {
      state: null,
      legend: this.$options.legend,
      showlegend: false,
      currentBaseLayer: null,
      activeTab: null,
      // to show context menu right click
      layerMenu: {
        show: false,
        top:0,
        left:0,
        tooltip: false,
        name: '',
        layer: null,
        loading: {
          data_table: false,
          shp: false,
          csv: false,
          gpx: false,
          xls: false
        },
        //colorMenu
        colorMenu: {
          show: false,
          top:0,
          left: 0,
          color: null
        }
      }
    }
  },
  directives: {
    //create a vue directive fro click outside contextmenu
    'click-outside-layer-menu': {
      bind(el, binding, vnode) {
        this.event = function (event) {
          (!(el === event.target || el.contains(event.target))) && vnode.context[binding.expression](event);
        };
        //add event listener click
        document.body.addEventListener('click', this.event)
      },
      unbind(el) {
        document.body.removeEventListener('click', this.event)
      }
    }
  },
  components: {
    'chrome-picker': ChromeComponent
  },
  computed: {
    project() {
      return this.state.prstate.currentProject
    },
    title() {
      return this.project.state.name;
    },
    baselayers() {
      return this.project.state.baselayers;
    },
    hasBaseLayers(){
      return this.project.state.baselayers.length > 0;
    },
    hasLayers() {
      let layerstresslength = 0;
      this.state.layerstrees.forEach(layerstree => layerstresslength+=layerstree.tree.length);
      return this.state.externallayers.length > 0 || layerstresslength >0 || this.state.layersgroups.length > 0 ;
    }
  },
  methods: {
    delegationClickEventTab(evt){
     this.activeTab = evt.target.attributes['aria-controls'] ? evt.target.attributes['aria-controls'].value : this.activeTab;
    },
    showLegend(bool) {
      this.showlegend = bool;
    },
    setBaseLayer(id) {
      this.currentBaseLayer = id;
      this.project.setBaseLayer(id);
      ApplicationService.setBaseLayerId(id);
    },
    getSrcBaseLayerImage(baseLayer) {
      const type = baseLayer && baseLayer.servertype || baseLayer;
      let image;
      let customimage = false;
      switch (type) {
        case 'OSM':
          image = 'osm.png';
          break;
        case 'Bing':
          const subtype = baseLayer.source.subtype;
          image = `bing${subtype}.png`;
          break;
        case 'TMS':
        case 'WMTS':
          if (baseLayer.icon) {
            customimage = true;
            image = baseLayer.icon;
            break;
          }
        default:
          image = 'nobaselayer.png';
      }
      return !customimage ? `${GUI.getResourcesUrl()}images/${image}`: image;
    },
    _hideMenu() {
      this.layerMenu.show = false;
      this.layerMenu.loading.data_table = false;
      this.layerMenu.loading.shp = false;
      this.layerMenu.loading.csv = false;
      this.layerMenu.loading.gpx = false;
      this.layerMenu.loading.xls = false;
    },
    zoomToLayer: function() {
      const bbox = [this.layerMenu.layer.bbox.minx, this.layerMenu.layer.bbox.miny, this.layerMenu.layer.bbox.maxx, this.layerMenu.layer.bbox.maxy] ;
      const mapService = GUI.getComponent('map').getService();
      mapService.goToBBox(bbox, this.layerMenu.layer.epsg);
      this._hideMenu();
    },
    canZoom(layer) {
      let canZoom = false;
      if (layer.bbox) {
        const bbox = [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy] ;
        canZoom = bbox.find(coordinate => coordinate > 0);
      }
      return canZoom;
    },
    getGeometryType(layerId){
      let geometryType;
      const layer = this.state.externallayers.find(layer => layer.id === layerId);
      if (layer) geometryType = layer.geometryType;
      else {
        const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
        geometryType = originalLayer.config.geometrytype;
        geometryType && geometryType !== 'NoGeometry' ? geometryType : '' ;
      }
      return geometryType;
    },
    canShowWmsUrl(layerId) {
      const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return originalLayer ? (!!(!originalLayer.isType('table') && originalLayer.getFullWmsUrl())) : false;
    },
    canDownloadXls(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isXlsDownlodable(): false;
    },
    canDownloadGpx(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isGpxDownlodable(): false;
    },
    canDownloadCsv(layerId){
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isCsvDownlodable(): false;
    },
    canDownloadShp(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isShpDownlodable(): false;
    },
    getWmsUrl(layerId) {
      const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return originalLayer.getFullWmsUrl();
    },
    copyWmsUrl(evt, layerId) {
      const url = this.getWmsUrl(layerId);
      let ancorEement = document.createElement('a');
      ancorEement.href = url;
      const tempInput = document.createElement('input');
      tempInput.value = ancorEement.href;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      $(evt.target).attr('data-original-title', t('sdk.catalog.menu.wms.copied')).tooltip('show');
      $(evt.target).attr('title', this.copywmsurltooltip).tooltip('fixTitle');
      document.body.removeChild(tempInput);
      ancorEement = null;
    },
    downloadShp(layerId) {
      this.layerMenu.loading.shp = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getShp().catch((err) => {
        GUI.notify.error(t("info.server_error"));
      }).finally(() => {
        this.layerMenu.loading.shp = false;
        this._hideMenu();
      })
    },
    downloadCsv(layerId) {
      this.layerMenu.loading.csv = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getCsv().catch((err) => {
        GUI.notify.error(t("info.server_error"));
      }).finally(() => {
        this.layerMenu.loading.csv = false;
        this._hideMenu();
      })
    },
    downloadXls(layerId) {
      this.layerMenu.loading.xls = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getXls().catch((err) => {
        GUI.notify.error(t("info.server_error"));
      }).finally(() => {
        this.layerMenu.loading.xls = false;
        this._hideMenu();
      })
    },
    downloadGpx(layerId) {
      this.layerMenu.loading.gpx = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getGpx().catch(err => {
        GUI.notify.error(t("info.server_error"));
      }).finally(() => {
        this.layerMenu.loading.gpx = false;
        this._hideMenu();
      })
    },
    showAttributeTable(layerId) {
      this.layerMenu.loading.data_table = false;
      GUI.closeContent();
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      this.layerMenu.loading.data_table = true;
      const tableContent = new TableComponent({
        layer,
        formatter: 1
      });
      tableContent.on('show', () => {
        if (this.isMobile()) {
          GUI.hideSidebar();
        }
        this.layerMenu.loading.data_table = false;
        this._hideMenu();
      });
      tableContent.show({
        title: layer.getName()
      });
    },
    startEditing() {
      let layer;
      const catallogLayersStores = CatalogLayersStoresRegistry.getLayersStores();
      catallogLayersStores.forEach((layerStore) => {
        layer = layerStore.getLayerById(this.layerMenu.layer.id);
        if (layer) {
          layer.getLayerForEditing();
          return false;
        }
      });
    },
    closeLayerMenu() {
      this._hideMenu();
      this.showColorMenu(false);
    },
    onChangeColor(val) {
      const mapService = GUI.getComponent('map').getService();
      this.layerMenu.colorMenu.color = val;
      const layer = mapService.getLayerByName(this.layerMenu.name);
      layer.setStyle(mapService.setExternalLayerStyle(val));
    },
    showColorMenu(bool, evt) {
      if(bool) {
        const elem = $(evt.target);
        this.layerMenu.colorMenu.top = elem.offset().top;
        this.layerMenu.colorMenu.left = elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) /2);
      }
      this.layerMenu.colorMenu.show = bool;
    }
  },
  watch: {
    'state.prstate.currentProject': {
      handler(project){
        this.activeTab = project.state.catalog_tab || DEFAULT_ACTIVE_TAB;
      },
      immediate: false
    }
  },
  created() {
    CatalogEventHub.$on('treenodetoogled', (storeid, node, parent_mutually_exclusive) => {
      const mapService = GUI.getComponent('map').getService();
      if (node.external && !node.source) {
        let layer = mapService.getLayerByName(node.name);
        layer.setVisible(!layer.getVisible());
        node.visible = !node.visible;
        node.checked = node.visible;
      } else if(!storeid) {
        node.visible = !node.visible;
        let layer = mapService.getLayerById(node.id);
        layer.setVisible(node.visible);
      } else {
        if (!node.groupdisabled) {
          let layer = CatalogLayersStoresRegistry.getLayersStore(storeid).toggleLayer(node.id, null, parent_mutually_exclusive);
          mapService.emit('cataloglayertoggled', layer);
        } else CatalogLayersStoresRegistry.getLayersStore(storeid).toggleLayer(node.id, false, parent_mutually_exclusive)
      }
    });
    // event that set all visible or not all children layer of the folder and if parent is mutually exclusive turn off all layer
    CatalogEventHub.$on('treenodestoogled', (storeid, nodes, isGroupChecked) => {
      let layersIds = [];
      const layerStore = CatalogLayersStoresRegistry.getLayersStore(storeid);
      const turnOnOffSubGroups = (parentChecked, currentLayersIds, node) => {
        if (node.nodes) {
          //node.disabled = !parentChecked;
          const isGroupChecked = (node.checked && parentChecked);
          const groupLayers = {
            checked: isGroupChecked,
            layersIds: []
          };
          const currentLayersIds = groupLayers.layersIds;
          parentLayers.push(groupLayers);
          node.nodes.map(turnOnOffSubGroups.bind(null, isGroupChecked, currentLayersIds));
        } else if (node.geolayer) {
          if (node.checked)
            currentLayersIds.push(node.id);
          node.disabled = node.groupdisabled = !parentChecked;
        }
      };
      const parentLayers = [{
        checked: isGroupChecked,
        layersIds: []
      }];
      const currentLayersIds = parentLayers[0].layersIds;
      nodes.map(turnOnOffSubGroups.bind(null, isGroupChecked, currentLayersIds));
      for (let i = parentLayers.length; i--;) {
        const {layersIds, checked} = parentLayers[i];
        layerStore.toggleLayers(layersIds, checked , false);
      }
    });
    CatalogEventHub.$on('treenodeselected', function (storeid, node) {
      const mapservice = GUI.getComponent('map').getService();
      let layer = CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(node.id);
      if(!layer.isSelected()) {
        CatalogLayersStoresRegistry.getLayersStore(storeid).selectLayer(node.id);
        // emit signal of select layer from catalog
        mapservice.emit('cataloglayerselected', layer);
      } else {
        CatalogLayersStoresRegistry.getLayersStore(storeid).unselectLayer(node.id);
        mapservice.emit('cataloglayerunselected', layer);
      }
    });

    CatalogEventHub.$on('showmenulayer', async (layerstree, evt) => {
      this._hideMenu();
      await this.$nextTick();
      const layerId = layerstree.id;
      const constMenuHeight = ((layerId) => {
        return (1*this.canShowWmsUrl(layerId)
          + 1*!!layerstree.bbox
          + 1*!!layerstree.openattributetable
          + 1*!!layerstree.color
          + 1*this.canDownloadShp(layerId)) * 30;
      })(layerId);
      this.layerMenu.top = evt.y - constMenuHeight;
      this.layerMenu.left = evt.x;
      this.layerMenu.name = layerstree.name;
      this.layerMenu.layer = layerstree;
      this.layerMenu.show = true;
      this.layerMenu.colorMenu.color = layerstree.color;
      this.$nextTick(() => {
        $('.catalog-menu-wms[data-toggle="tooltip"]').tooltip();
      });
    });

    ControlsRegistry.onafter('registerControl', (id, control) => {
      if (id === 'querybbox') {
        control.getInteraction().on('propertychange', evt => {
          if (evt.key === 'active') this.state.highlightlayers = !evt.oldValue;
        })
      }
    });
  },
  beforeMount(){
    this.currentBaseLayer = this.project.state.initbaselayer;
  }
};

const InternalComponent = Vue.extend(vueComponentOptions);

Vue.component('g3w-catalog', vueComponentOptions);

Vue.component('layers-group', {
  template: require('./layersgroup.html'),
  props: {
    layersgroup: {
      type: Object
    }
  }
});

const compiledTristateTreeTemplate = createCompiledTemplate(require('./tristate-tree.html'));
/* CHILDREN COMPONENTS */
// tree component
Vue.component('tristate-tree', {
  ...compiledTristateTreeTemplate,
  props : ['layerstree', 'storeid', 'highlightlayers', 'parent_mutually_exclusive', 'parentFolder', 'externallayers', 'root', "parent"],
  data() {
    return {
      expanded: this.layerstree.expanded,
      isFolderChecked: true,
      controltoggled: false,
      n_childs: null
    }
  },
  computed: {
    isFolder() {
      return !!this.layerstree.nodes
    },
    showscalevisibilityclass(){
      return !this.isFolder && this.layerstree.scalebasedvisibility
    },
    showScaleVisibilityToolip(){
      return this.showscalevisibilityclass && this.isDisabled && this.layerstree.checked;
    },
    isTable() {
      if (!this.isFolder) {
        return !this.layerstree.geolayer && !this.layerstree.external;
      }
    },
    isHidden() {
      return this.layerstree.hidden && (this.layerstree.hidden === true);
    },
    selected() {
      this.layerstree.selected = this.layerstree.disabled && this.layerstree.selected ? false : this.layerstree.selected;
    },
    isHighLight() {
      const id = this.layerstree.id;
      return this.highlightlayers && !this.isFolder && CatalogLayersStoresRegistry.getLayerById(id).getTocHighlightable() && this.layerstree.visible;
    },
    isDisabled() {
      return (!this.isFolder && !this.isTable && !this.layerstree.checked) || this.layerstree.disabled || this.layerstree.groupdisabled
    }
  },
  watch:{
    'layerstree.disabled'(bool) {
      this.layerstree.selected = bool && this.layerstree.selected ? false : this.layerstree.selected;
    }
  },
  methods: {
    toggle(isFolder) {
      if (isFolder) {
        this.layerstree.checked = !this.layerstree.checked;
        this.isFolderChecked = this.layerstree.checked && !this.layerstree.disabled;
        CatalogEventHub.$emit('treenodestoogled', this.storeid, this.layerstree.nodes, this.isFolderChecked, this.parent_mutually_exclusive);
      } else CatalogEventHub.$emit('treenodetoogled', this.storeid, this.layerstree, this.parent_mutually_exclusive);
    },
    expandCollapse() {
      this.layerstree.expanded = !this.layerstree.expanded;
    },
    select () {
      if (!this.isFolder && !this.layerstree.external && !this.isTable) {
        CatalogEventHub.$emit('treenodeselected',this.storeid, this.layerstree);
      }
    },
    triClass () {
      return this.layerstree.checked ? this.g3wtemplate.getFontClass('check') : this.g3wtemplate.getFontClass('uncheck');
    },
    downloadExternalLayer(download) {
      if (download.file) {
        downloadFile(download.file);
      } else if (download.url) {}
    },
    removeExternalLayer: function(name) {
      const mapService = GUI.getComponent('map').getService();
      mapService.removeExternalLayer(name);
    },
    showLayerMenu(layerstree, evt) {
      if (!this.isFolder && (this.layerstree.openattributetable || this.layerstree.geolayer || this.layerstree.external)) {
        CatalogEventHub.$emit('showmenulayer', layerstree, evt);
      }
    }
  },
  created() {
    (this.isFolder && !this.layerstree.checked) && CatalogEventHub.$emit('treenodestoogled', this.storeid, this.layerstree.nodes, this.layerstree.checked, this.parent_mutually_exclusive);
  },
  async mounted() {
    if (this.isFolder && !this.root) {
      this.layerstree.nodes.forEach(node => {
        if (this.parent_mutually_exclusive && !this.layerstree.mutually_exclusive)
          if (node.id) node.uncheckable = true;
      })
    }
    await this.$nextTick();
    $('span.scalevisibility').tooltip();
  }
});

const compiletLegendTemplate = createCompiledTemplate(require('./legend.html'));

Vue.component('layerslegend',{
    ...compiletLegendTemplate,
    props: ['layerstree', 'legend', 'active'],
    data: function() {
      return {}
    },
    computed: {
      visiblelayers: function(){
        let _visiblelayers = [];
        const layerstree = this.layerstree.tree;
        let traverse = (obj) => {
          for (const layer of obj) {
            if (!_.isNil(layer.id) && layer.visible && !layer.exclude_from_legend) {
              _visiblelayers.push(layer);
            }
            if (!_.isNil(layer.nodes)) {
              traverse(layer.nodes);
            }
          }
        };
        traverse(layerstree);
        return _visiblelayers;
      }
    },
    watch: {
      'layerstree': {
        handler: function(val, old){},
        deep: true
      },
      'visiblelayers'(visibleLayers) {
        const show = !!visibleLayers.length;
        this.$emit('showlegend', show)
      }
    },
    created() {
      this.$emit('showlegend', !!this.visiblelayers.length);
    }
});

const compiledLegendItemsTemplate = createCompiledTemplate(require('./legend_items.html'));

Vue.component('layerslegend-items',{
  ...compiledLegendItemsTemplate,
  props: ['layers', 'legend', 'active'],
  data() {
    return {
      legendurls: []
    }
  },
  watch: {
    layers: {
      handler(layers){
        this.mapReady && this.getLegendSrc(layers)
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
    getLegendUrl: function(layer, params={}) {
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
        const urlLayersName = (layer.source && layer.source.url) || layer.external ? urlMethodsLayersName.GET : urlMethodsLayersName[layer.ows_method];
        const url = `${this.getLegendUrl(layer, this.legend)}`;
        if (layer.source && layer.source.url) urlLayersName[url] = [];
        else {
          const [prefix, layerName] = url.split('LAYER=');
          if (!urlLayersName[prefix])
            urlLayersName[prefix] = [];
          urlLayersName[prefix].unshift(layerName);
        }
      }
      for (const method in urlMethodsLayersName) {
        const urlLayersName = urlMethodsLayersName[method];
        if (method === 'GET')
          for (const url in urlLayersName ) {
            const legendUrl = urlLayersName[url].length ? `${url}&LAYER=${urlLayersName[url].join(',')}`: url;
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
            params.forEach((param) => {
              const [key, value] = param.split('=');
              econdedParams.push(`${key}=${encodeURIComponent(value)}`);
            });
            params = econdedParams.join('&');
            params = `${params}&LAYERS=${encodeURIComponent(urlLayersName[url].join(','))}`;
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
    this.waitinglegendsurls = [] // urls that are waiting to be loaded
  },
  async mounted() {
    await this.$nextTick();
    const mapService = GUI.getComponent('map').getService();
    mapService.on('change-map-legend-params', ()=>{
      this.mapReady = true;
      this.getLegendSrc(this.layers);
    })
  },
});

function CatalogComponent(options={}) {
  options.resizable = true;
  base(this, options);
  const {legend}  = options.config;
  this.title = "catalog";
  this.mapComponentId = options.mapcomponentid;
  const service = options.service || new Service;
  this.setService(service);
  this.setInternalComponent(new InternalComponent({
    service,
    legend
  }));
  this.internalComponent.state = this.getService().state;
  let listenToMapVisibility = (map) => {
    const mapService = map.getService();
    this.state.visible = !mapService.state.hidden;
    mapService.onafter('setHidden',(hidden) => {
      this.state.visible = !mapService.state.hidden;
      this.state.expanded = true;
    })
  };
  if (this.mapComponentId) {
    const map = GUI.getComponent(this.mapComponentId);
    !map && ComponentsRegistry.on('componentregistered', (component) => {
        if (component.getId() === this.mapComponentId) {
          listenToMapVisibility(component);
        }
      }) || listenToMapVisibility(map);
  }
}

inherit(CatalogComponent, Component);

module.exports = CatalogComponent;
