import { createCompiledTemplate } from 'gui/vue/utils';
import ApplicationService from 'core/applicationservice';
import utils from 'core/utils/utils';
import shpwrite from 'shp-write';
import { t } from 'core/i18n/i18n.service';
import Component from 'gui/vue/component';
import TableComponent from 'gui/table/vue/table';
import ComponentsRegistry from 'gui/componentsregistry';
import GUI from 'gui/gui';
import ControlsRegistry from 'gui/map/control/registry';
import CatalogLayersStoresRegistry from 'core/catalog/cataloglayersstoresregistry';
import { GeoJSON } from 'ol/format';
import catalogTemplate from './catalog.html';
import layersGroupTemplate from './layersgroup.html';
import Service from '../catalogservice';
import ChangeMapThemesComponent from './components/changemapthemes.vue';
import LayerLegend from './components/layerlegend.vue';
import CatalogEventHub from './catalogeventhub';
import { MAP_SETTINGS } from '../../../constant';
import legendTemplate from './legend.html';
import treestateTemplate from './tristate-tree.html';
import legendItemsTemplate from './legend_items.html';

const ChromeComponent = VueColor.Chrome;
const DEFAULT_ACTIVE_TAB = 'layers';

// OFFSETMENU
const OFFSETMENU = {
  top: 50,
  left: 15,
};

const vueComponentOptions = {
  template: catalogTemplate,
  data() {
    const { legend } = this.$options;
    legend.place = ApplicationService.getCurrentProject().getLegendPosition() || 'tab';
    return {
      state: null,
      legend,
      showlegend: false,
      currentBaseLayer: null,
      activeTab: null,
      loading: false,
      // to show context menu right click
      layerMenu: {
        show: false,
        top: 0,
        left: 0,
        tooltip: false,
        name: '',
        layer: null,
        loading: {
          data_table: false,
          shp: false,
          csv: false,
          gpx: false,
          gpkg: false,
          xls: false,
        },
        // colorMenu
        colorMenu: {
          show: false,
          top: 0,
          left: 0,
          color: null,
        },
        // styleMenu
        // colorMenu
        stylesMenu: {
          show: false,
          top: 0,
          left: 0,
          style: null,
          default: null,
        },
        // metadataInfo
        metadatainfoMenu: {
          show: false,
          top: 0,
          left: 0,
        },
      },
    };
  },
  directives: {
    // create a vue directive from click outside contextmenu
    'click-outside-layer-menu': {
      bind(el, binding, vnode) {
        this.event = function (event) {
          (!(el === event.target || el.contains(event.target))) && vnode.context[binding.expression](event);
        };
        // add event listener click
        document.body.addEventListener('click', this.event);
      },
      unbind(el) {
        document.body.removeEventListener('click', this.event);
      },
    },
  },
  components: {
    'chrome-picker': ChromeComponent,
    changemapthemes: ChangeMapThemesComponent,

  },
  computed: {
    // show or not group toolbar
    showTocTools() {
      const { map_themes = [] } = this.project.state;
      const show = map_themes.length > 1;
      return show;
    },
    project() {
      return this.state.prstate.currentProject;
    },
    title() {
      return this.project.state.name;
    },
    baselayers() {
      return this.project.state.baselayers;
    },
    hasBaseLayers() {
      return this.project.state.baselayers.length > 0;
    },
    hasLayers() {
      let layerstresslength = 0;
      this.state.layerstrees.forEach((layerstree) => layerstresslength += layerstree.tree.length);
      return this.state.external.vector.length > 0 || layerstresslength > 0 || this.state.layersgroups.length > 0;
    },
  },
  methods: {
    // change view method
    async changeMapTheme(map_theme) {
      GUI.closeContent();
      const changes = await this.$options.service.changeMapTheme(map_theme);
      const changeStyleLayersId = Object.keys(changes.layers).filter((layerId) => {
        if (changes.layers[layerId].style) {
          if (!changes.layers[layerId].visible) {
            const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
            layer.change();
          }
          return true;
        }
      });
      this.legend.place === 'tab' ? CatalogEventHub.$emit('layer-change-style')
        // get all layer tha changes style
        : changeStyleLayersId.forEach((layerId) => {
          CatalogEventHub.$emit('layer-change-style', {
            layerId,
          });
        });
    },
    delegationClickEventTab(evt) {
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
          const { subtype } = baseLayer.source;
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
      return !customimage ? `${GUI.getResourcesUrl()}images/${image}` : image;
    },
    _hideMenu() {
      this.layerMenu.show = false;
      this.layerMenu.styles = false;
      this.layerMenu.loading.data_table = false;
      this.layerMenu.loading.shp = false;
      this.layerMenu.loading.csv = false;
      this.layerMenu.loading.gpx = false;
      this.layerMenu.loading.gpkg = false;
      this.layerMenu.loading.xls = false;
      this.layerMenu.loading.geotiff = false;
    },
    zoomToLayer() {
      const bbox = [this.layerMenu.layer.bbox.minx, this.layerMenu.layer.bbox.miny, this.layerMenu.layer.bbox.maxx, this.layerMenu.layer.bbox.maxy];
      const mapService = GUI.getService('map');
      mapService.goToBBox(bbox, this.layerMenu.layer.epsg);
      this._hideMenu();
    },
    canZoom(layer) {
      let canZoom = false;
      if (layer.bbox) {
        const bbox = [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy];
        canZoom = bbox.find((coordinate) => coordinate > 0);
      }
      return canZoom;
    },
    getGeometryType(layerId, external = false) {
      let geometryType;
      if (external) {
        const layer = this.state.external.vector.find((layer) => layer.id === layerId);
        if (layer) geometryType = layer.geometryType;
      } else {
        const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
        geometryType = originalLayer.config.geometrytype;
      }
      geometryType = geometryType && geometryType !== 'NoGeometry' ? geometryType : '';
      return geometryType;
    },
    canShowWmsUrl(layerId) {
      const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return originalLayer ? (!!(!originalLayer.isType('table') && originalLayer.getFullWmsUrl())) : false;
    },
    canDownloadXls(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isXlsDownlodable() : false;
    },
    canDownloadGpx(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isGpxDownlodable() : false;
    },
    canDownloadGpkg(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isGpkgDownlodable() : false;
    },
    canDownloadCsv(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isCsvDownlodable() : false;
    },
    canDownloadGeoTIFF(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isGeoTIFFDownlodable() : false;
    },
    canDownloadShp(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isShpDownlodable() : false;
    },
    getWmsUrl(layerId) {
      const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return originalLayer.getCatalogWmsUrl();
    },
    copyWmsUrl(evt, layerId) {
      const url = this.getWmsUrl(layerId);
      let ancorEement = document.createElement('a');
      ancorEement.href = url;
      const tempInput = document.createElement('input');
      tempInput.value = ancorEement.href;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      $(evt.target).attr('data-original-title', t('sdk.catalog.menu.wms.copied')).tooltip('show');
      $(evt.target).attr('title', this.copywmsurltooltip).tooltip('fixTitle');
      document.body.removeChild(tempInput);
      ancorEement = null;
    },
    downloadGeoTIFF(layerId, map_extent = false) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.geotiff = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getGeoTIFF({
        data: map_extent ? {
          map_extent: GUI.getService('map').getMapExtent().toString(),
        } : undefined,
      })
        .catch((err) => GUI.notify.error(t('info.server_error')))
        .finally(() => {
          this.layerMenu.loading.geotiff = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        });
    },
    downloadShp(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.shp = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getShp()
        .catch((err) => GUI.notify.error(t('info.server_error')))
        .finally(() => {
          this.layerMenu.loading.shp = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        });
    },
    downloadCsv(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.csv = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getCsv()
        .catch((err) => GUI.notify.error(t('info.server_error')))
        .finally(() => {
          this.layerMenu.loading.csv = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        });
    },
    downloadXls(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.xls = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getXls()
        .catch((err) => GUI.notify.error(t('info.server_error')))
        .finally(() => {
          this.layerMenu.loading.xls = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        });
    },
    downloadGpx(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.gpx = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getGpx()
        .catch((err) => GUI.notify.error(t('info.server_error')))
        .finally(() => {
          this.layerMenu.loading.gpx = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        });
    },
    downloadGpkg(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.gpkg = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getGpkg()
        .catch((err) => GUI.notify.error(t('info.server_error')))
        .finally(() => {
          this.layerMenu.loading.gpkg = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        });
    },
    changeLayerMapPosition({ position, layer }) {
      const mapService = GUI.getService('map');
      const changed = layer.position !== position;
      layer.position = position;
      mapService.changeLayerMapPosition({
        id: layer.id,
        position,
      });
      changed && this._hideMenu();
    },
    setWMSOpacity({ id = this.layerMenu.layer.id, value: opacity }) {
      this.layerMenu.layer.opacity = opacity;
      const mapService = GUI.getService('map');
      mapService.changeLayerOpacity({
        id,
        opacity,
      });
    },
    /**
     * Create a Geojson file from vector OL vector layer and download it in shapefile with WGS84 Projection
     * @param layer
     * @returns {Promise<void>}
     */
    async downloadExternalShapefile(layer) {
      const EPSG4326 = 'EPSG:4326';
      this.layerMenu.loading.shp = true;
      const mapService = GUI.getService('map');
      const vectorLayer = mapService.getLayerByName(layer.name);
      const GeoJSONFormat = new GeoJSON();
      let features = vectorLayer.getSource().getFeatures();
      if (layer.crs !== EPSG4326) {
        features = features.map((feature) => {
          const clonefeature = feature.clone();
          clonefeature.getGeometry().transform(layer.crs, EPSG4326);
          return clonefeature;
        });
      }
      const GeoJSONFile = GeoJSONFormat.writeFeaturesObject(features, {
        featureProjection: EPSG4326,
      });
      const name = layer.name.split(`.${layer.type}`)[0];
      shpwrite.download(GeoJSONFile, {
        folder: name,
        types: {
          point: name,
          mulipoint: name,
          polygon: name,
          multipolygon: name,
          line: name,
          polyline: name,
          multiline: name,
        },
      });
      await this.$nextTick();
      this.layerMenu.loading.shp = false;
      this._hideMenu();
    },
    showAttributeTable(layerId) {
      this.layerMenu.loading.data_table = false;
      GUI.closeContent();
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      this.layerMenu.loading.data_table = true;
      const tableContent = new TableComponent({
        layer,
        formatter: 1,
      });
      tableContent.on('show', () => {
        this.isMobile() && GUI.hideSidebar();
        this.layerMenu.loading.data_table = false;
        this._hideMenu();
      });
      tableContent.show({
        title: layer.getName(),
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
      this.layerMenu.stylesMenu.show = false;
    },
    onbeforeDestroyChangeColor() {
      this.$refs.color_picker.$off();
    },
    onChangeColor(val) {
      const mapService = GUI.getService('map');
      this.layerMenu.layer.color = val;
      const layer = mapService.getLayerByName(this.layerMenu.name);
      const style = layer.getStyle();
      style._g3w_options.color = val;
      layer.setStyle(style);
    },
    setCurrentLayerStyle(index) {
      let changed = false;
      this.layerMenu.layer.styles.forEach((style, idx) => {
        if (idx === index) {
          this.layerMenu.stylesMenu.style = style.name;
          changed = !style.current;
          style.current = true;
        } else style.current = false;
      });
      if (changed) {
        const layerId = this.layerMenu.layer.id;
        const layer = CatalogLayersStoresRegistry.getLayerById(this.layerMenu.layer.id);
        if (layer) {
          CatalogEventHub.$emit('layer-change-style', {
            layerId,
          });
          layer.change();
        }
      }
      this.closeLayerMenu();
    },
    async showStylesMenu(bool, evt) {
      if (bool) {
        const elem = $(evt.target);
        this.layerMenu.stylesMenu.top = elem.offset().top;
        this.layerMenu.stylesMenu.left = elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) / 2) + OFFSETMENU.left;
        await this.$nextTick();
      }
      this.layerMenu.stylesMenu.show = bool;
    },
    // showmetadatainfo
    async showMetadataInfo(bool, evt) {
      if (bool) {
        const elem = $(evt.target);
        this.layerMenu.metadatainfoMenu.top = elem.offset().top;
        this.layerMenu.metadatainfoMenu.left = elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) / 2) + OFFSETMENU.left;
        await this.$nextTick();
      }
      this.layerMenu.metadatainfoMenu.show = bool;
    },
    showColorMenu(bool, evt) {
      if (bool) {
        const elem = $(evt.target);
        this.layerMenu.colorMenu.top = elem.offset().top;
        this.layerMenu.colorMenu.left = elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) / 2) - OFFSETMENU.left;
      }
      this.layerMenu.colorMenu.show = bool;
    },
  },
  watch: {
    // listen external wms change. If remove all layer nee to set active the project or default tab
    'state.external.wms': function (newlayers, oldlayers) {
      if (oldlayers && newlayers.length === 0) {
        this.activeTab = this.project.state.catalog_tab || DEFAULT_ACTIVE_TAB;
      }
    },
    'state.prstate.currentProject': {
      async handler(project, oldproject) {
        const activeTab = project.state.catalog_tab || DEFAULT_ACTIVE_TAB;
        this.loading = activeTab === 'baselayers';
        await this.$nextTick();
        setTimeout(() => {
          this.loading = false;
          this.activeTab = activeTab;
        }, activeTab === 'baselayers' ? 500 : 0);
      },
      immediate: false,
    },
  },
  created() {
    this.layerpositions = MAP_SETTINGS.LAYER_POSITIONS.getPositions();
    CatalogEventHub.$on('unselectionlayer', (storeid, layerstree) => {
      const layer = CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layerstree.id);
      layer.clearSelectionFids();
    });

    CatalogEventHub.$on('activefiltertokenlayer', async (storeid, layerstree) => {
      const layer = CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layerstree.id);
      layerstree.filter.active = await layer.toggleFilterToken();
    });

    /**
     * Visible change layer
     */
    CatalogEventHub.$on('treenodevisible', (layer) => {
      const mapservice = GUI.getService('map');
      mapservice.fire('cataloglayervisible', layer);
    });

    /**
     * Eevent handle of select layer
     */
    CatalogEventHub.$on('treenodeselected', (storeid, node) => {
      const mapservice = GUI.getService('map');
      const layer = CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(node.id);
      CatalogLayersStoresRegistry.getLayersStore(storeid).selectLayer(node.id, !layer.isSelected());
      // emit signal of select layer from catalog
      mapservice.fire('cataloglayerselected', layer);
    });

    CatalogEventHub.$on('showmenulayer', async (layerstree, evt) => {
      this._hideMenu();
      await this.$nextTick();
      this.layerMenu.left = evt.x;
      this.layerMenu.name = layerstree.name;
      this.layerMenu.layer = layerstree;
      this.layerMenu.show = true;
      this.layerMenu.colorMenu.color = layerstree.color;
      await this.$nextTick();
      this.layerMenu.top = $(evt.target).offset().top - $(this.$refs['layer-menu']).height() + ($(evt.target).height() / 2);
      $('.catalog-menu-wms[data-toggle="tooltip"]').tooltip();
    });

    ControlsRegistry.onafter('registerControl', (id, control) => {
      if (id === 'querybbox') {
        control.getInteraction().on('propertychange', (evt) => {
          if (evt.key === 'active') this.state.highlightlayers = !evt.oldValue;
        });
      }
    });
  },
  beforeMount() {
    this.currentBaseLayer = this.project.state.initbaselayer;
  },
};

const InternalComponent = Vue.extend(vueComponentOptions);

Vue.component('g3w-catalog', vueComponentOptions);

Vue.component('layers-group', {
  template: layersGroupTemplate,
  props: {
    layersgroup: {
      type: Object,
    },
  },
});

const compiledTristateTreeTemplate = createCompiledTemplate(treestateTemplate);
/* CHILDREN COMPONENTS */
// tree component
Vue.component('tristate-tree', {
  ...compiledTristateTreeTemplate,
  props: ['layerstree', 'storeid', 'legend', 'legendplace', 'highlightlayers', 'parent_mutually_exclusive', 'parentFolder', 'externallayers', 'root', 'parent'],
  components: {
    layerlegend: LayerLegend,
  },
  data() {
    return {
      expanded: this.layerstree.expanded,
      isGroupChecked: true,
      controltoggled: false,
      n_childs: null,
      filtered: false,
    };
  },
  computed: {
    isGroup() {
      return !!this.layerstree.nodes;
    },
    legendlayerposition() {
      return !this.layerstree.exclude_from_legend && this.legendplace === 'toc' && this.layerstree.visible && this.layerstree.legend ? 'toc' : 'tab';
    },
    showscalevisibilityclass() {
      return !this.isGroup && this.layerstree.scalebasedvisibility;
    },
    showScaleVisibilityToolip() {
      return this.showscalevisibilityclass && this.layerstree.disabled && this.layerstree.checked;
    },
    isTable() {
      return !this.isGroup && !this.layerstree.geolayer && !this.layerstree.external;
    },
    isHidden() {
      return this.layerstree.hidden && (this.layerstree.hidden === true);
    },
    selected() {
      this.layerstree.selected = this.layerstree.disabled && this.layerstree.selected ? false : this.layerstree.selected;
    },
    isHighLight() {
      const { id } = this.layerstree;
      return this.highlightlayers && !this.isGroup && CatalogLayersStoresRegistry.getLayerById(id).getTocHighlightable() && this.layerstree.visible;
    },
    isInGrey() {
      return (!this.isGroup && !this.isTable && !this.layerstree.external && (!this.layerstree.visible || this.layerstree.disabled));
    },
  },
  watch: {
    'layerstree.disabled': function (bool) {},
    'layerstree.checked': function (n, o) {
      this.isGroup ? this.handleGroupChecked(this.layerstree) : this.handleLayerChecked(this.layerstree);
    },
  },
  methods: {
    // method to inizialize layer (disable, visible etc..)
    init() {
      if (this.isGroup && !this.layerstree.checked) this.handleGroupChecked(this.layerstree);
      if (this.isGroup && !this.root) {
        this.layerstree.nodes.forEach((node) => {
          if (this.parent_mutually_exclusive && !this.layerstree.mutually_exclusive) if (node.id) node.uncheckable = true;
        });
      }
    },
    /**
     * Handel change checked property of group
     * @param group
     */
    handleGroupChecked(group) {
      let { checked, parentGroup, nodes } = group;
      const setAllLayersVisible = ({ nodes, visible }) => {
        nodes.forEach((node) => {
          if (node.id !== undefined) {
            if (node.parentGroup.checked && node.checked) {
              const projectLayer = CatalogLayersStoresRegistry.getLayerById(node.id);
              projectLayer.setVisible(visible);
            }
          } else {
            setAllLayersVisible({
              nodes: node.nodes,
              visible: visible && node.checked,
            });
          }
        });
      };
      if (checked) {
        const visible = parentGroup ? parentGroup.checked : true;
        if (parentGroup && parentGroup.mutually_exclusive) {
          parentGroup.nodes.forEach((node) => {
            node.checked = node.groupId === group.groupId;
            node.checked && setAllLayersVisible({
              nodes: node.nodes,
              visible,
            });
          });
        } else {
          setAllLayersVisible({
            nodes,
            visible,
          });
        }
        while (parentGroup) {
          parentGroup.checked = parentGroup.root || parentGroup.checked;
          parentGroup = parentGroup.parentGroup;
        }
      } else {
        nodes.forEach((node) => {
          if (node.id !== undefined) {
            if (node.checked) {
              const projectLayer = CatalogLayersStoresRegistry.getLayerById(node.id);
              projectLayer.setVisible(false);
            }
          } else {
            setAllLayersVisible({
              nodes: node.nodes,
              visible: false,
            });
          }
        });
      }
    },
    /**
     * Handle changing checked property of layer
     * @param layer
     */
    handleLayerChecked(layerObject) {
      let {
        checked, id, disabled, projectLayer = false, parentGroup,
      } = layerObject;
      // in case of external layer
      if (!projectLayer) {
        const mapService = GUI.getService('map');
        mapService.changeLayerVisibility({
          id,
          visible: checked,
        });
      } else {
        const layer = CatalogLayersStoresRegistry.getLayerById(id);
        if (checked) {
          const visible = layer.setVisible(!disabled);
          visible && this.legendplace === 'toc' && setTimeout(() => CatalogEventHub.$emit('layer-change-style', {
            layerId: id,
          }));
          if (parentGroup.mutually_exclusive) {
            parentGroup.nodes.forEach((node) => node.checked = node.id === id);
          }
          while (parentGroup) {
            parentGroup.checked = true;
            parentGroup = parentGroup.parentGroup;
          }
        } else layer.setVisible(false);
        CatalogEventHub.$emit('treenodevisible', layer);
      }
    },
    toggleFilterLayer() {
      CatalogEventHub.$emit('activefiltertokenlayer', this.storeid, this.layerstree);
    },
    clearSelection() {
      CatalogEventHub.$emit('unselectionlayer', this.storeid, this.layerstree);
    },
    toggle() {
      this.layerstree.checked = !this.layerstree.checked;
    },
    expandCollapse() {
      this.layerstree.expanded = !this.layerstree.expanded;
    },
    select() {
      if (!this.isGroup && !this.layerstree.external && !this.isTable) {
        CatalogEventHub.$emit('treenodeselected', this.storeid, this.layerstree);
      }
    },
    triClass() {
      return this.layerstree.checked ? this.g3wtemplate.getFontClass('check') : this.g3wtemplate.getFontClass('uncheck');
    },
    downloadExternalLayer(download) {
      if (download.file) {
        utils.downloadFile(download.file);
      } else if (download.url) {}
    },
    removeExternalLayer(name, type) {
      const mapService = GUI.getService('map');
      mapService.removeExternalLayer(name, wms);
    },
    showLayerMenu(layerstree, evt) {
      if (!this.isGroup && (this.layerstree.openattributetable || this.layerstree.downloadable || this.layerstree.geolayer || this.layerstree.external)) {
        CatalogEventHub.$emit('showmenulayer', layerstree, evt);
      }
    },
  },
  created() {
    // just firs time
    this.init();
  },
  async mounted() {
    await this.$nextTick();
    $('span.scalevisibility').tooltip();
  },
});

const compiletLegendTemplate = createCompiledTemplate(legendTemplate);
Vue.component('layerslegend', {
  ...compiletLegendTemplate,
  props: ['layerstree', 'legend', 'active'],
  data() {
    return {};
  },
  computed: {
    visiblelayers() {
      const _visiblelayers = [];
      const layerstree = this.layerstree.tree;
      const traverse = (obj) => {
        for (const layer of obj) {
          if (!_.isNil(layer.id) && layer.visible && layer.geolayer && !layer.exclude_from_legend) _visiblelayers.push(layer);
          if (!_.isNil(layer.nodes)) traverse(layer.nodes);
        }
      };
      traverse(layerstree);
      return _visiblelayers;
    },
  },
  watch: {
    layerstree: {
      handler(val, old) {},
      deep: true,
    },
    visiblelayers(visibleLayers) {
      const show = !!visibleLayers.length;
      this.$emit('showlegend', show);
    },
  },
  created() {
    const show = !!this.visiblelayers.length;
    this.$emit('showlegend', show);
  },
});

const compiledLegendItemsTemplate = createCompiledTemplate(legendItemsTemplate);

Vue.component('layerslegend-items', {
  ...compiledLegendItemsTemplate,
  props: {
    layers: {
      default: [],
    },
    legend: {
      type: Object,
    },
    active: {
      default: true,
    },
  },
  data() {
    return {
      legendurls: [],
    };
  },
  watch: {
    layers: {
      handler(layers) {
        // used to preved duplicate legend
        setTimeout(() => {
          this.mapReady && this.getLegendSrc(layers);
        });
      },
      immediate: false,
    },
    active(bool) {
      if (bool && this.waitinglegendsurls.length) {
        this.legendurls = [...this.waitinglegendsurls];
        this.waitinglegendsurls = [];
      }
    },
  },
  methods: {
    setError(legendurl) {
      legendurl.error = true;
      legendurl.loading = false;
    },
    urlLoaded(legendurl) {
      legendurl.loading = false;
    },
    getLegendUrl(layer, params = {}) {
      let legendurl;
      const catalogLayers = CatalogLayersStoresRegistry.getLayersStores();
      catalogLayers.forEach((layerStore) => {
        if (layerStore.getLayerById(layer.id)) {
          legendurl = layerStore.getLayerById(layer.id).getLegendUrl(params);
          return false;
        }
      });
      return legendurl;
    },
    async getLegendSrc(_layers) {
      const urlMethodsLayersName = {
        GET: {},
        POST: {},
      };
      const self = this;
      this.legendurls = [];
      this.waitinglegendsurls = [];
      await this.$nextTick();
      // need to filter geolayer
      const layers = _layers.filter((layer) => layer.geolayer);
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const style = Array.isArray(layer.styles) && layer.styles.find((style) => style.current);
        const urlLayersName = (layer.source && layer.source.url) || layer.external ? urlMethodsLayersName.GET : urlMethodsLayersName[layer.ows_method];
        const url = `${this.getLegendUrl(layer, this.legend.config)}`;
        if (layer.source && layer.source.url) urlLayersName[url] = [];
        else {
          const [prefix, layerName] = url.split('LAYER=');
          if (!urlLayersName[prefix]) urlLayersName[prefix] = [];
          urlLayersName[prefix].unshift({
            layerName,
            style: style && style.name,
          });
        }
      }
      for (const method in urlMethodsLayersName) {
        const urlLayersName = urlMethodsLayersName[method];
        if (method === 'GET') {
          for (const url in urlLayersName) {
            const legendUrl = urlLayersName[url].length ? `${url}&LAYER=${urlLayersName[url].map((layerObj) => layerObj.layerName).join(',')}&STYLES=${urlLayersName[url].map((layerObj) => layerObj.style).join(',')}${ApplicationService.getFilterToken() ? `&filtertoken=${ApplicationService.getFilterToken()}` : ''}` : url;
            const legendUrlObject = {
              loading: true,
              url: legendUrl,
              error: false,
            };
            this.active ? this.legendurls.push(legendUrlObject) : this.waitinglegendsurls.push(legendUrlObject);
          }
        } else {
          for (const url in urlLayersName) {
            const xhr = new XMLHttpRequest();
            let [_url, params] = url.split('?');
            params = params.split('&');
            const econdedParams = [];
            params.forEach((param) => {
              const [key, value] = param.split('=');
              econdedParams.push(`${key}=${encodeURIComponent(value)}`);
            });
            params = econdedParams.join('&');
            params = `${params}&LAYERS=${encodeURIComponent(urlLayersName[url].map((layerObj) => layerObj.layerName).join(','))}`;
            params += `&STYLES=${encodeURIComponent(urlLayersName[url].map((layerObj) => layerObj.style).join(','))}`;
            params += `${ApplicationService.getFilterToken() ? `&filtertoken=${ApplicationService.getFilterToken()}` : ''}`;
            xhr.open('POST', _url);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.responseType = 'blob';
            const legendUrlObject = {
              loading: true,
              url: null,
              error: false,
            };
            self.active ? self.legendurls.push(legendUrlObject) : self.waitinglegendsurls.push(legendUrlObject);
            xhr.onload = function () {
              const data = this.response;
              if (data !== undefined) legendUrlObject.url = window.URL.createObjectURL(data);
              legendUrlObject.loading = false;
            };
            xhr.onerror = function () {
              legendUrlObject.loading = false;
            };
            xhr.send(params);
          }
        }
      }
    },
  },
  created() {
    this.mapReady = false;
    this.waitinglegendsurls = []; // urls that are waiting to be loaded
    CatalogEventHub.$on('layer-change-style', (options = {}) => {
      const { layerId } = options;
      let changeLayersLegend = [];
      if (layerId) {
        const layer = this.layers.find((layer) => layerId == layer.id);
        layer && changeLayersLegend.push(layer);
      } else changeLayersLegend = this.layers;
      changeLayersLegend.length && this.getLegendSrc(changeLayersLegend);
    });
  },
  async mounted() {
    await this.$nextTick();
    const mapService = GUI.getService('map');
    // mapService.on('change-map-legend-params', ()=>{
    //   this.mapReady = true;
    //   this.getLegendSrc(this.layers);
    // })
  },
});

class CatalogComponent extends Component {
  constructor(options = {}) {
    super(options);
    const { legend } = options.config;
    this.title = 'catalog';
    this.mapComponentId = options.mapcomponentid;
    const service = options.service || new Service();
    this.setService(service);
    this.setInternalComponent(new InternalComponent({
      service,
      legend,
    }));
    this.internalComponent.state = this.getService().state;
    const listenToMapVisibility = (map) => {
      const mapService = map.getService();
      this.state.visible = !mapService.state.hidden;
      mapService.onafter('setHidden', (hidden) => {
        this.state.visible = !mapService.state.hidden;
        this.state.expanded = true;
      });
    };
    if (this.mapComponentId) {
      const map = GUI.getComponent(this.mapComponentId);
      !map && ComponentsRegistry.on('componentregistered', (component) => (component.getId() === this.mapComponentId) && listenToMapVisibility(component))
      || listenToMapVisibility(map);
    }
  }
}

export default CatalogComponent;
