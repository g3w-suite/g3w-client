import {
  QUERY_POINT_TOLERANCE,
  TOC_LAYERS_INIT_STATUS,
  TOC_THEMES_INIT_STATUS,
}                         from 'app/constant';
import ApplicationState   from 'store/application-state';
import Projections        from 'store/projections';
import G3WObject          from 'core/g3wobject';
import { crsToCrsObject } from 'utils/crsToCrsObject';

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
 * @param config.querymultilayers
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

    /**
     * View information about project APIs 
     */
    this.urls = {
      map_themes:      `/${type}/api/prjtheme/${id}/`,
      expression_eval: `/api/expression_eval/${id}/`,
      vector_data:     `${this.state.vectorurl}data/${type}/${id}/`,
      featurecount:    `${this.state.vectorurl}featurecount/${type}/${id}/`,
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
          this.state.layers
            .forEach(l => {
              if (node.id === l.id) {
                node.name = l.name;
                l.wmsUrl  = this.state.WMSUrl;
                l.project = this;
                node[i]   = Object.assign(l, node);
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

    // Remove bing base layer when no vendor API Key is provided
    this.state.baselayers = this.state.baselayers.filter(l => ('Bing' === l.servertype ? ApplicationState.keys.vendorkeys.bing : true));

    this.state.baselayers.forEach(l => {
      l.visible     = l.id && (l.id === (null === ApplicationState.baseLayerId ? this.state.initbaselayer : ApplicationState.baseLayerId)) || !!l.fixed;
      l.baselayer   = true;
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
      catalog:    (this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null) !== this.state.gid,
    });

    // instance each layer ad area added to layersstore
    this.getLayers().forEach(l => {
      const layer = LayerFactory.build(
        Object.assign(l, {
          crs:               crsToCrsObject(l.crs),
          projection:        l.crs ? Projections.get(l.crs) : this._projection,
          ows_method:        this.state.ows_method,
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
      expanded:   'not_collapsed' === this.state.toc_layers_init_status // config to show layerstrees toc expanded or not
    });

    /**
     * Hook methods
     */
    this.setters = {
      setBaseLayer(id) {
        this.state.baselayers.forEach(l => {
          this._layersStore.getLayerById(l.id).setVisible(id === l.id);
          l.visible = (id === l.id);
        })
      },
    };

    /** @deprecated since 3.10.0. Will be removed in v.4.x. */
    (this.state.search || []).forEach(s => s.search_endpoint = 'api');

  }

  getQueryPointTolerance() {
    return this.state.query_point_tolerance;
  }

  /**
   * @returns {*}
   */
  getRelations() {
    return this.state.relations;
  }

  /**
   * @param id
   * 
   * @returns {*}
   */
  getRelationById(id) {
    return this.state.relations.find(r => id === r.id);
  }

  getLayerById(id) {
    return this._layersStore.getLayerById(id);
  }

  getLayers() {
    return [...this.state.layers, ...this.state.baselayers];
  };

  /**
   * @param filter property layer config to filter
   * 
   * @returns { Array } configuration layers (from server config)
   */
  getConfigLayers({ key } = {}) {
    return key ? this.state.layers.filter(l => undefined !== l[key] ) : this.state.layers;
  }

  getState() {
    return this.state;
  }

  getPrint() {
    return this.state.print || [];
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

  getCrs() {
    return this._projection.getCode();
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
  getLayersStore() {
    return this._layersStore;
  }

  getUrl(type) {
    return this.urls[type];
  }

};