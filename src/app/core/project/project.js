import {
  QUERY_POINT_TOLERANCE,
  TOC_LAYERS_INIT_STATUS,
  TOC_THEMES_INIT_STATUS,
}                         from 'app/constant';
import ApplicationState   from 'store/application-state';
import Projections        from 'store/projections';
import ApplicationService from 'services/application';
import G3WObject          from 'core/g3wobject';
import { crsToCrsObject } from 'utils/crsToCrsObject';
import { XHR }            from 'utils/XHR';

const LayerFactory        = require('core/layers/layerfactory');
const LayersStore         = require('core/layers/layersstore');

/**
 * @param config.id
 * @param config.type
 * @param config.gid
 * @param config.name
 * @param config.crs
 * @param config.extent
 * @param config.initextent
 * @param config.layers
 * @param config.layerstree
 * @param config.overviewprojectgid
 * @param config.baselayers
 * @param config.initbaselayer
 * @param config.filtertoken
 * @param config.context_base_legend
 * @param config.query_point_tolerance
 * @param config.wps                           array of wps service
 * @param config.bookmarks                     array of bookmarks
 * @param config.map_themes                    Object {project:[], custom:[]}
 * @param { 'POST' | 'GET' }                   config.ows_method
 * @param { boolean }                          config.wms_use_layer_ids
 * @param { 'tab' | 'toc' }                    config.legend_position 
 * @param { 'layers', 'baselayers', 'legend' } config.catalog_tab
 * @param show_load_layer_error                @since 3.10.0 show/hide layer load error
 */
module.exports = class Project extends G3WObject {
  
  constructor(config = {}) {
    super();

    this.state = Object.assign(config, {
      /** actived catalog tab */
      catalog_tab:            config.toc_tab_default        || config._catalog_tab || 'layers',
      ows_method:             config.ows_method             || 'GET',
      toc_layers_init_status: config.toc_layers_init_status || TOC_LAYERS_INIT_STATUS,
      toc_themes_init_status: config.toc_themes_init_status || TOC_THEMES_INIT_STATUS,
      query_point_tolerance:  config.query_point_tolerance  || QUERY_POINT_TOLERANCE,
    });

    const type   = this.getType();
    const id     = this.getId();
    const vector = this.getVectorUrl();

    /**
     * View information about project APIs 
     */
    this.urls = {
      map_themes:      `/${type}/api/prjtheme/${id}/`,
      expression_eval: `/api/expression_eval/${id}/`,
      vector_data:     `${vector}data/${type}/${id}/`,
      featurecount:    `${vector}featurecount/${type}/${id}/`,
    };

    /**
     * Process layerstree and baselayers of the project
     */

    // useful info for catalog
    const traverse = nodes => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        //check if layer (node) of folder
        if (undefined !== node.id) {
          this.state.layers.forEach(l => {
            if (node.id === l.id) {
              node.name = l.name;
              l.wmsUrl = this.getWmsUrl();
              l.project = this;
              node[i] = Object.assign(l, node);
              return false
            }
          });
        }
        if (Array.isArray(node.nodes)) {
          //add title to tree
          node.title = node.name;
          traverse(node.nodes);
        }
      }
    };

    traverse(this.state.layerstree);

    const baseLayerId = ApplicationService.getBaseLayerId();

    // Remove bing base layer when no vendor API Key is provided
    this.state.baselayers = this.state.baselayers.filter(l => ('Bing' === l.servertype ? ApplicationState.keys.vendorkeys.bing : true));

    this.state.baselayers.forEach(l => {
      const visible = (null !== baseLayerId) ? baseLayerId : this.state.initbaselayer;
      l.visible = visible && (l.id === visible) || !!l.fixed;
      l.baselayer = true;
    });

    /**
     * Set the project projection to object crs
     */
    this.state.crs    = crsToCrsObject(this.state.crs);

    this._projection  = Projections.get(this.state.crs);

    /**
     * Build layersstore and create layersstree 
     */

    // create a layersStore object
    this._layersStore = new LayersStore();

    this._layersStore.setOptions({
      id:         this.state.gid,
      projection: this._projection,
      extent:     this.state.extent,
      initextent: this.state.initextent,
      wmsUrl:     this.state.WMSUrl,
      catalog:    this.state.gid !== (this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null),
    });

    // instance each layer ad area added to layersstore
    this.getLayers().forEach(l => {
      const layer = LayerFactory.build(
        Object.assign(l, {
          crs:               crsToCrsObject(l.crs),
          projection:        l.crs ? Projections.get(l.crs) : this._projection,
          ows_method:        this.getOwsMethod(),
          wms_use_layer_ids: this.state.wms_use_layer_ids,
        }), { project: this }
      );
      if (layer) {
        this._layersStore.addLayer(layer)
      }
    });
    
    // create layerstree from layerstore
    this._layersStore.createLayersTree(this.state.name, {
      layerstree: this.state.layerstree,
      expanded: 'not_collapsed' === this.state.toc_layers_init_status // config to show layerstrees toc expanded or not
    });

    /**
     * Hook methods
     */
    this.setters = {
      setBaseLayer(id) {
        this.state.baselayers.forEach(baseLayer => {
          this._layersStore.getLayerById(baseLayer.id).setVisible(baseLayer.id === id);
          baseLayer.visible = (baseLayer.id === id);
        })
      },
    };

    /** @deprecated since 3.10.0. Will be removed in v.4.x. */
    (this.state.search || []).forEach(s => s.search_endpoint = 'api');

  }

  /**
   * @returns `wms_getmap_format` attribute from server (project settings) 
   *
   * @since 3.9.0
   */
  getWmsGetmapFormat() {
    return this.state.wms_getmap_format;
  }

  /**
   * @deprecated since 3.10.0. Will be removed in v.4.x.
   */
  getSearchEndPoint() {
    return 'api';
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

  /**
   * @param mapcontrol
   * 
   * @returns { boolean }
   */
  isQueryMultiLayers(mapcontrol) {
    return this.state.querymultilayers && -1 !== this.state.querymultilayers.indexOf(mapcontrol);
  }

  /**
   * @returns {*}
   */
  getRelations() {
    return this.state.relations;
  }

  /**
   * @param relationId
   * 
   * @returns {*}
   */
  getRelationById(relationId) {
    return this.state.relations.find(relation => relation.id === relationId);
  }

  /**
   * @param { Object } opts
   * @param opts.layerId
   * @param opts.type
   * 
   * @returns {*}
   */
  getRelationsByLayerId({layerId, type}={}) {
    return this.state.relations.filter(relation => relation.referencedLayer === layerId && (type ? relation.type === type : true))
  }

  /**
   * @returns {"POST"|"GET"}
   */
  getOwsMethod() {
    return this.state.ows_method;
  }

  getLayerById(layerId) {
    return this._layersStore.getLayerById(layerId);
  }

  getLayers() {
    return [...this.state.layers, ...this.state.baselayers];
  };

  getBaseLayers() {
    return this.state.baselayers;
  }

  /**
   * @param filter property layer config to filter
   * 
   * @returns { Array } configuration layers (from server config)
   */
  getConfigLayers({ key } = {}) {
    return key ? this.state.layers.filter(layer => undefined !== layer[key] ) : this.state.layers;
  }

  /**
   * @param { string } legend_position Legend Position
   */
  setLegendPosition(legend_position = 'tab') {
    this.state.legend_position = legend_position;
  }

  getLegendPosition() {
    return this.state.legend_position;
  }

  getThumbnail() {
    return this.state.thumbnail;
  }

  getMetadata() {
    return this.state.metadata || {};
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

  /**
   * @param {'major' | 'minor' | 'patch' } qgis.type 
   */
  getQgisVersion({ type } = {}) {
    const index = ['major', 'minor', 'patch'].indexOf(type);
    return -1 === index ? this.state.qgis_version : +this.state.qgis_version.split('.')[index];
  }

  /**
   * @returns {*}
   */
  getProjection() {
    return this._projection;
  }

  /**
   * @returns {*}
   */
  getWmsUrl() {
    return this.state.WMSUrl;
  }

  /**
   * @returns {string}
   */
  getInfoFormat() {
    return 'application/vnd.ogc.gml';
  }

  /**
   * @returns {*}
   */
  getLayersStore() {
    return this._layersStore;
  }

  /// Map Themes

  /**
   * Set properties (checked and visible) from view to layerstree
   * 
   * @param map_theme map theme name
   * @param layerstree // current layerstree of TOC
   */
  async setLayersTreePropertiesFromMapTheme({
    map_theme,
    layerstree = this.state.layerstree
  }) {
    /** map theme config */
    const theme = await this.getMapThemeFromThemeName(map_theme);
    // create a chages need to apply map_theme changes to map and TOC
    const changes  = {layers: {} }; // key is the layer id and object has style, visibility change (Boolean)
    const promises = [];
    /**
     * Traverse current layerstree of TOC and get changes with the new one related to map_theme choose
     * @param mapThemeLayersTree // new mapLayerTree
     * @param layerstree // current layerstree
     */
    const groups = [];
    const traverse = (mapThemeLayersTree, layerstree, checked) => {
      mapThemeLayersTree
        .forEach((node, index) => {
          if (node.nodes) { // case of a group
            groups.push({
              node,
              group: layerstree[index]
            });
            traverse(node.nodes, layerstree[index].nodes, checked && node.checked);
          } else {
            // case of layer
            node.style = theme.styles[node.id]; // set style from map_theme
            if (layerstree[index].checked !== node.visible) {
              changes.layers[node.id] = {
                visibility: true,
                style: false
              };
            }
            layerstree[index].checked = node.visible;
            // if it has a style settled
            if (node.style) {
              const promise = new Promise((resolve, reject) =>{
                const setCurrentStyleAndResolvePromise = node => {
                  if (changes.layers[node.id] === undefined) changes.layers[node.id] = {
                    visibility: false,
                    style: false
                  };
                  changes.layers[node.id].style = this.getLayerById(node.id).setCurrentStyle(node.style);
                  resolve();
                };
                if (this.getLayersStore()) { setCurrentStyleAndResolvePromise(node) }
                else { (node => setTimeout(() => setCurrentStyleAndResolvePromise(node)))(node) }// case of starting project creation
              });
              promises.push(promise);
            }
          }
      });
    };
    traverse(theme.layerstree, layerstree);

    await Promise.allSettled(promises);

    // all groups checked after layer checked so is set checked but not visible
    groups.forEach(({ group, node: { checked, expanded }}) => {
      group.checked = checked;
      group.expanded = expanded;
    });

    return changes // eventually, information about changes (for example style etc..)
  };

  /**
   * get map Theme_configuration
   */
  async getMapThemeFromThemeName(theme) {
    // get map theme configuration from map_themes project config
    const config = Object.values(this.state.map_themes).flat().find(c => theme === c.theme );
    if (config && undefined === config.layerstree) {
      config.layerstree = await this.getMapThemeConfiguration(theme);
    }
    return config;
  }

  /**
   * Save custom user map theme
   * 
   * @since 3.10
   */
  saveMapTheme(theme, params = {}) {
    //In case of no name provide skip
    if (!theme) {  return Promise.reject() }
    return XHR.post({
      url:         `${this.urls.map_themes}${encodeURIComponent(theme)}/`,
      contentType: 'application/json',
      data:        JSON.stringify(params),
    });
  }

  /**
   * @param theme
   * 
   * @since 3.10.0
   */
  async deleteMapTheme(theme) {
    //In case of no name provide skip
    if (!theme) { return Promise.reject() }
    return XHR.delete({url:`${this.urls.map_themes}${encodeURIComponent(theme)}/`});
  }

  /**
   * Get map_style from server
   * 
   * @param map_theme
   * 
   * @returns {Promise<*>}
   */
  async getMapThemeConfiguration(map_theme) {
    try {
      const response = await XHR.get({ url: `${this.urls.map_themes}${map_theme}/` });
      if (response.result) { return response.data }
    } catch(err) {
      console.warn('Error while retreiving map theme configuration', err);
    }
  }

  getUrl(type) {
    return this.urls[type];
  }

  /**
   * @returns {Array} spatial bookmarks saved on current QGIS project
   * 
   * @since v3.8
   */
  getSpatialBookmarks() {
    return this.state.bookmarks || [];
  }

  /**
   * @returns {{ items: Array, info: Object }} project messages at start time 
   * 
   * @since 3.8.0
   */
  getMessages() {
    return this.state.messages;
  }

};