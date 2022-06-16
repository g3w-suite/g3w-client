import ApplicationService from 'core/applicationservice';
import utils from 'core/utils/utils';
import geoutils from 'core/utils/geo';
import G3WObject from 'core/g3wobject';
import LayerFactory from 'core/layers/layerfactory';
import LayersStore from 'core/layers/layersstore';
import Projections from 'g3w-ol/src/projection/projections';
import { QUERY_POINT_TOLERANCE, TOC_LAYERS_INIT_STATUS, TOC_THEMES_INIT_STATUS } from '../../constant';

class Project extends G3WObject {
  constructor(config = {}, options = {}) {
    super({
      setters: {
        setBaseLayer(id) {
          this.state.baselayers.forEach((baseLayer) => {
            this._layersStore.getLayerById(baseLayer.id).setVisible(baseLayer.id === id);
            baseLayer.visible = (baseLayer.id === id);
          });
        },
      },
    });
    /* structure 'project' object
  {
    id,
    type,
    gid,
    name,
    crs,
    extent,
    initextent,
    layers,
    layerstree,
    overviewprojectgid,
    baselayers,
    initbaselayer,
    filtertoken,
    context_base_legend
    ows_method <POST or GET>
    wms_use_layer_ids: <TRUE OR FALSE>
    search_endpoint : 'ows', 'api'
    legend_position: 'tab', 'toc'
    query_point_tolerance
    wps: [] // array of wps service
  }
  */
    // for future implementation catalog tab actived
    config.catalog_tab = config.toc_tab_default || config._catalog_tab || 'layers'; // values : layers, baselayers, legend
    config.ows_method = config.ows_method || 'GET';
    config.toc_layers_init_status = config.toc_layers_init_status || TOC_LAYERS_INIT_STATUS;
    config.toc_themes_init_status = config.toc_themes_init_status || TOC_THEMES_INIT_STATUS;
    config.query_point_tolerance = config.query_point_tolerance || QUERY_POINT_TOLERANCE;
    this.state = config;
    /**
     * View
     *
     */
    // information about api project
    this.urls = {
      map_themes: `/${this.getType()}/api/prjtheme/${this.getId()}/`,
      expression_eval: `/api/expression_eval/${this.getId()}/`,
      vector_data: `${this.getVectorUrl()}data/${this.getType()}/${this.getId()}/`,
    };
    /*
     *
     * End View
     *
     */
    // process layers
    this._processLayers();
    // set the project projection to object crs
    this.state.crs = geoutils.crsToCrsObject(this.state.crs);
    this._projection = Projections.get(this.state.crs);
    // build a layersstore of the project
    this._layersStore = this._buildLayersStore();
    this.setSearchEndPoint();
  }

  // get search end point value (ows or api)
  getSearchEndPoint() {
    return this.state.search_endpoint;
  }

  setSearchEndPoint() {
    const { search_endpoint, search = [] } = this.state;
    search.forEach((search) => search.search_endpoint = search_endpoint);
  }

  getAliasUrl() {
    return this.state.aliasUrl;
  }

  getActiveCatalogTab() {
    return this.state.catalog_tab;
  }

  setActiveCatalogTab(tab = 'layers') {
    this.state.catalog_tab = tab;
  }

  isWmsUseLayerIds() {
    return this.state.wms_use_layer_ids;
  }

  getContextBaseLegend() {
    return this.state.context_base_legend;
  }

  getQueryPointTolerance() {
    return this.state.query_point_tolerance;
  }

  // check if multi
  getQueryFeatureCount() {
    return this.state.feature_count || 5;
  }

  isQueryMultiLayers(mapcontrol) {
    return this.state.querymultilayers && this.state.querymultilayers.indexOf(mapcontrol) !== -1;
  }

  getRelations() {
    return this.state.relations;
  }

  getRelationById(relationId) {
    return this.state.relations.find((relation) => relation.id === relationId);
  }

  getRelationsByLayerId({ layerId, type } = {}) {
    return this.state.relations.filter((relation) => relation.referencedLayer === layerId && (type ? relation.type === type : true));
  }

  getOwsMethod() {
    return this.state.ows_method;
  }

  // process layerstree and baselayers of the project
  _processLayers() {
    // info useful for catalog
    const traverse = (tree) => {
      for (let i = 0; i < tree.length; i++) {
        const layer = tree[i];
        let layer_name_originale;
        // check if layer (node) of folder
        if (layer.id !== undefined) {
          this.state.layers.forEach((_layer) => {
            layer_name_originale = _layer.name;
            if (layer.id === _layer.id) {
              layer.name = _layer.name;
              _layer.wmsUrl = this.getWmsUrl();
              _layer.project = this;
              tree[i] = Object.assign(_layer, layer);
              return false;
            }
          });
        }
        if (Array.isArray(layer.nodes)) {
          // add title to tree
          layer.title = layer.name;
          traverse(layer.nodes);
        }
      }
    };
    // call trasverse function to
    traverse(this.state.layerstree);
    const baseLayerId = ApplicationService.getBaseLayerId();
    for (let i = 0; i < this.state.baselayers.length; i++) {
      const baseLayerConfig = this.state.baselayers[i];
      const baseLayerVisibleId = baseLayerId !== null ? baseLayerId : this.state.initbaselayer;
      const visible = baseLayerVisibleId && (baseLayerConfig.id === baseLayerVisibleId) || !!baseLayerConfig.fixed;
      baseLayerConfig.visible = visible;
      baseLayerConfig.baselayer = true;
    }
  }

  // build layersstore and create layersstree
  _buildLayersStore() {
    // create a layersStore object
    const layersStore = new LayersStore();
    // check if we have owerview project
    const overviewprojectgid = this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null;
    layersStore.setOptions({
      id: this.state.gid,
      projection: this._projection,
      extent: this.state.extent,
      initextent: this.state.initextent,
      wmsUrl: this.state.WMSUrl,
      catalog: this.state.gid !== overviewprojectgid,
    });

    // instance each layer ad area added to layersstore
    const layers = this.getLayers();
    layers.forEach((layerConfig) => {
      // check and set crs in objectformat
      layerConfig.crs = geoutils.crsToCrsObject(layerConfig.crs);
      // add projection
      layerConfig.projection = layerConfig.crs ? Projections.get(layerConfig.crs) : this._projection;
      // add ows_method
      layerConfig.ows_method = this.getOwsMethod();
      layerConfig.wms_use_layer_ids = this.state.wms_use_layer_ids;
      const layer = LayerFactory.build(layerConfig, {
        project: this,
      });
      layer && layersStore.addLayer(layer);
    });
    // create layerstree from layerstore
    layersStore.createLayersTree(this.state.name, {
      layerstree: this.state.layerstree,
      expanded: this.state.toc_layers_init_status === 'not_collapsed', // config to show layerstrees toc expanded or not
    });
    return layersStore;
  }

  getLayerById(layerId) {
    return this._layersStore.getLayerById(layerId);
  }

  getLayers() {
    return [...this.state.layers, ...this.state.baselayers];
  }

  getBaseLayers() {
    return this.state.baselayers;
  }

  /**
   * Get configuration layers array from server config
   * @param filter property layer config to filter
   * @returns {*}
   */
  getConfigLayers({ key } = {}) {
    return key ? this.state.layers.filter((layer) => layer[key] !== undefined) : this.state.layers;
  }

  /**
   * Legend Position
   */

  setLegendPosition(legend_position = 'tab') {
    this.state.legend_position = legend_position;
  }

  getLegendPosition() {
    return this.state.legend_position;
  }

  /**
   * End Legend Position
   */

  getThumbnail() {
    return this.state.thumbnail;
  }

  getState() {
    return this.state;
  }

  getPrint() {
    return this.state.print || [];
  }

  getSearches() {
    return this.state.search || [];
  }

  getVectorUrl() {
    return this.state.vectorurl;
  }

  getRasterUrl() {
    return this.state.rasterurl;
  }

  getId() {
    return this.state.id;
  }

  getType() {
    return this.state.type;
  }

  getGid() {
    return this.state.gid;
  }

  getName() {
    return this.state.name;
  }

  getOverviewProjectGid() {
    return this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null;
  }

  getCrs() {
    return this._projection.getCode();
  }

  /*
  * type: major, minor, patch
  * */
  getQgisVersion({ type } = {}) {
    const index = ['major', 'minor', 'patch'].indexOf(type);
    return index === -1 ? this.state.qgis_version : +this.state.qgis_version.split('.')[index];
  }

  getProjection() {
    return this._projection;
  }

  getWmsUrl() {
    return this.state.WMSUrl;
  }

  getInfoFormat() {
    return 'application/vnd.ogc.gml';
  }

  getLayersStore() {
    return this._layersStore;
  }

  /// Map Themes

  /**
   * Method to set properties ( checked and visible) from view to layerstree
   * @param map_theme map theme name
   * @param layerstree // current layerstree of TOC
   */
  async setLayersTreePropertiesFromMapTheme({ map_theme, layerstree = this.state.layerstree }) {
    /**
     * mapThemeConfig contain map_theme attributes coming from project map_themes attribute config
     * plus layerstree of map_theme get from api map theme
     */
    const mapThemeConfig = await this.getMapThemeFromThemeName(map_theme);
    // extract layerstree
    const { layerstree: mapThemeLayersTree } = mapThemeConfig;
    // create a chages need to apply map_theme changes to map and TOC
    const changes = {
      layers: {}, // key is the layer id and object has style, visibility change (Boolean)
    };
    const promises = [];
    /**
     * Function to traverse current layerstree of toc anche get changes with the new one related to map_theme choose
     * @param mapThemeLayersTree // new mapLayerTree
     * @param layerstree // current layerstree
     */
    const groups = [];
    const traverse = (mapThemeLayersTree, layerstree, checked) => {
      mapThemeLayersTree.forEach((node, index) => {
        if (node.nodes) { // case of group
          groups.push({
            node,
            group: layerstree[index],
          });
          traverse(node.nodes, layerstree[index].nodes, checked && node.checked);
        } else {
          // case of layer
          node.style = mapThemeConfig.styles[node.id]; // set style from map_theme
          if (layerstree[index].checked !== node.visible) {
            changes.layers[node.id] = {
              visibility: true,
              style: false,
            };
          }
          layerstree[index].checked = node.visible;
          // if has a style settled
          if (node.style) {
            const promise = new Promise((resolve, reject) => {
              const setCurrentStyleAndResolvePromise = (node) => {
                if (changes.layers[node.id] === undefined) {
                  changes.layers[node.id] = {
                    visibility: false,
                    style: false,
                  };
                }
                changes.layers[node.id].style = this.getLayerById(node.id).setCurrentStyle(node.style);
                resolve();
              };
              if (this.getLayersStore()) setCurrentStyleAndResolvePromise(node);
              else // case of starting project creation
              {
                (node) => setTimeout(() => {
                  setCurrentStyleAndResolvePromise(node);
                })(node);
              }
            });
            promises.push(promise);
          }
        }
      });
    };
    traverse(mapThemeLayersTree, layerstree);
    await Promise.allSettled(promises);
    // all groups checked after layer checked so is set checked but not visible
    groups.forEach(({ group, node: { checked, expanded } }) => {
      group.checked = checked;
      group.expanded = expanded;
    });
    return changes; // eventually information about changes (for example style etc..)
  }

  /**
   * get map Theme_configuration
   */
  async getMapThemeFromThemeName(map_theme) {
    // get map theme configuration from map_themes project config
    const mapThemeConfig = this.state.map_themes.find((map_theme_config) => map_theme_config.theme === map_theme);
    // check if mapThemeConfig exist
    if (mapThemeConfig) {
      // check if has layerstree (property get from server with a specific api
      const { layerstree } = mapThemeConfig;
      if (layerstree === undefined) {
        const layerstree = await this.getMapThemeConfiguration(map_theme);
        mapThemeConfig.layerstree = layerstree;
      }
    }
    return mapThemeConfig;
  }

  /**
   * get map_style from server
   * @param map_theme
   * @returns {Promise<*>}
   */
  getMapThemeConfiguration = async function (map_theme) {
    let config;
    const url = `${this.urls.map_themes}${map_theme}/`;
    try {
      const response = await utils.XHR.get({
        url,
      });
      const { result, data } = response;
      if (result) config = data;
    } catch (err) {}
    return config;
  };

  getUrl(type) {
    return this.urls[type];
  }
}

export default Project;
