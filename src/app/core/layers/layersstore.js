const { uniqueId } = require('utils');
const G3WObject    = require('core/g3wobject');

module.exports = class LayersStore extends G3WObject {
  constructor(config = {}) {
    super();
    this.config = {
      id:         config.id || Date.now(),
      projection: config.projection,
      extent:     config.extent,
      initextent: config.initextent,
      wmsUrl:     config.wmsUrl,
      //set catalogable property
      catalog: (true === config.catalog || false === config.catalog) ? config.catalog : true
    };
    this.state = {
      //useful to build layerstree
      layerstree: [],
      relations:  null // useful to build a tree of relations
    };
    this._isQueryable = (true === config.queryable || false === config.queryable ) ? config.queryable : true;
    this._layers = this.config.layers || {};

    this.setters = {
      setLayerSelected(id, selected) {
        this.getLayers().forEach(l => l.state.selected = (id === l.getId()) ? selected : false);
      },
      addLayers(layers = []) {
        layers.forEach(l => this.addLayer(l))
      },
      addLayer(layer) {
        this._addLayer(layer);
      },
      removeLayer(id) {
        this._removeLayer(id);
      }
    };
  }

  isQueryable() {
    return this._isQueryable;
  };

  /**
   *
   * @param { Boolean } bool
   */
  setQueryable(bool) {
    this._isQueryable = !!bool;
  };

  showOnCatalog() {
    return this.config.catalog;
  };

  setOptions(config = {}) {
    this.config = config;
  };

  getId() {
    return this.config.id;
  };

  _addLayer(layer) {
    this._layers[layer.getId()] = layer;
  };

  _removeLayer(layer) {
    delete this._layers[layer.getId()];
  };

  removeLayers() {
    Object
      .entries(this._layers)
      .forEach(([_, layer]) => this.removeLayer(layer))
  };

  getLayersDict(filter = {}, options = {}) {

    // skip when no filter is provided (eg. `filter = null`)
    if (
      !filter ||
      [
        filter.PRINTABLE,
        filter.QUERYABLE,
        filter.FILTERABLE,
        filter.EDITABLE,
        filter.VISIBLE,
        filter.SELECTED,
        filter.CACHED,
        filter.SELECTED_OR_ALL,
        filter.SERVERTYPE,
        filter.BASELAYER,
        filter.GEOLAYER,
        filter.VECTORLAYER,
        filter.HIDDEN,
        filter.DISABLED,
        filter.IDS,
      ].every(f => undefined === f)
    ) {
      return this._layers;
    }

    let layers = Object.values(this._layers);

    if (filter.IDS) {
      const ids = [].concat(filter.IDS);
      layers = layers.filter(l => ids.includes(l.getId()));
    }

    // check if there are `selected` layers otherwise get all `layers`
    if (filter.SELECTED_OR_ALL) {
      const selected = layers.filter(l => l.isSelected());
      layers         = selected.length > 0 ? selected : layers;
    }

    // checks if a boolean filter is setted
    const has = f => 'boolean' === typeof f;

    if (has(filter.SELECTED) && !filter.SELECTED_OR_ALL)                    layers = layers.filter(l => filter.SELECTED    === l.isSelected());
    if (has(filter.QUERYABLE))                                              layers = layers.filter(l => filter.QUERYABLE   === l.isQueryable());
    if (has(filter.FILTERABLE))                                             layers = layers.filter(l => filter.FILTERABLE  === l.isFilterable(options.filtrable || null));
    if (has(filter.EDITABLE))                                               layers = layers.filter(l => filter.EDITABLE    === l.isEditable());
    if (has(filter.VISIBLE))                                                layers = layers.filter(l => filter.VISIBLE     === l.isVisible());
    if (has(filter.CACHED))                                                 layers = layers.filter(l => filter.CACHED      === l.isCached());
    if (has(filter.BASELAYER))                                              layers = layers.filter(l => filter.BASELAYER   === l.isBaseLayer());
    if (has(filter.GEOLAYER))                                               layers = layers.filter(l => filter.GEOLAYER    === l.state.geolayer);
    if (has(filter.VECTORLAYER))                                            layers = layers.filter(l => filter.VECTORLAYER === l.isType('vector'));
    if (has(filter.HIDDEN))                                                 layers = layers.filter(l => filter.HIDDEN      === l.isHidden());
    if (has(filter.DISABLED))                                               layers = layers.filter(l => filter.DISABLED    === l.isDisabled());
    if ('string'  === typeof filter.SERVERTYPE && filter.SERVERTYPE.length) layers = layers.filter(l => filter.SERVERTYPE  === l.getServerType());
    if (filter.PRINTABLE)                                                   layers = layers.filter(l => l.state.geolayer && l.isPrintable({ scale: filter.PRINTABLE.scale }));

    return layers;
  };

// return layers array
  getLayers(filter = {}, options = {}) {
    return Object.values(this.getLayersDict(filter, options));
  };

  getBaseLayers() {
    return this.getLayersDict({ BASELAYER: true });
  };

  getLayerById(id) {
    return this.getLayersDict()[id];
  };

  getLayerByName(name) {
    return this._layers.find(l => name === l.getName());
  };

  getLayerAttributes(id) {
    return this.getLayerById(id).getAttributes();
  };

  getLayerAttributeLabel(id, name) {
    return this.getLayerById(id).getAttributeLabel(name);
  };

  getGeoLayers() {
    return this.getLayers({ GEOLAYER: true })
  };

  _getAllSiblingsChildrenLayersId(layerstree) {
    let nodeIds = [];
    let traverse = layerstree => {
      layerstree.nodes.forEach(n => {
        if (n.id) { nodeIds.push(n.id) }
        else { traverse(n) }
      });
    };
    traverse(layerstree);
    return nodeIds;
  };

  _getAllParentLayersId(layerstree, node) {
    let nodeIds = [];
    let traverse = layerstree => {
      layerstree.nodes.forEach(n => {
        if (n.id) {
          nodeIds.push(n.id);
        }
      });
    };

    traverse({ nodes: layerstree.nodes.filter(n => node !== n) });

    return nodeIds;
  };

  selectLayer(id, selected) {
    this.setLayerSelected(id, selected);
  };

  getProjection() {
    return this.config.projection;
  };

  getExtent() {
    return this.config.extent;
  };

  getInitExtent() {
    return this.config.initextent;
  };

  getWmsUrl() {
    return this.config.wmsUrl;
  };

  removeLayersTree() {
    this.state.layerstree.splice(0, this.state.layerstree.length);
  };

  getLayersTree() {
    return this.state.layerstree;
  };

  /**
   * Set layersstree of layers inside the layersstore
   *
   * @param {unknown[]} layerstree nodes
   * @param {string}    name
   * @param {boolean}   [expanded = true]
   */
  setLayersTree(layerstree = [], name, expanded = true) {
    const [minx, miny, maxx, maxy] = this.getInitExtent();

    // Root group project that contains all layerstree of qgis project
    const rootGroup = {
      title:       name || this.config.id,
      root:        true,
      parentGroup: null,
      expanded,
      disabled:    false,
      checked:     true,
      /**
       * @since 3.8.0
       */
      bbox:        { minx, miny, maxx, maxy },
      nodes:       layerstree,
    };

    if (layerstree.length > 0) {
      this._traverseLayersTree(layerstree, rootGroup);
      this.state.layerstree.splice(0, 0, rootGroup); // at the end
    }
  };

  /**
   * Used by external plugins to build layerstree
   *
   * @param {string}  groupName is a ProjectName
   * @param options
   * @param {Object} [options.layerstree = null ]
   * @param {boolean} [options.expanded   = false]
   * @param {boolean} [options.full       = false]
   */
  createLayersTree(
    groupName,
    options = {
      layerstree: null,
      expanded:   false,
      full:       false
    }
  ) {

    let layerstree = [];

    // return layerstree from server project config (when setted)
    if (options.layerstree && true === options.full) {
      return this.state.layerstree;
    }

    // compare all layer ids from server config with all layer nodes on layerstree server property
    if (options.layerstree && true !== options.full) {
      const tocLayersId = this.getLayers({ BASELAYER: false }).map(l => l.getId())
      this._traverseLightLayersTree(options.layerstree, layerstree, tocLayersId);
    }

    // retrieve all project layers that have geometry
    if (!options.layerstree) {
      layerstree = this.getGeoLayers()
        .map(l => ({
            id:      l.getId(),
            name:    l.getName(),
            title:   l.getTitle(),
            visible: l.isVisible() || false
          })
        )
    }

    // setLayerstree
    this.setLayersTree(layerstree, groupName, options.expanded);
  };

  /**
   * @since 3.8.0
   */
  _traverseLightLayersTree(nodes, layerstree, tocLayersId) {
    nodes.forEach(n => {
      let lightlayer = null;

      // case TOC has layer ID
      if (null !== n.id && undefined !== n.id && tocLayersId.find(id => n.id === id)) {
        lightlayer = ({ ...lightlayer, ...n });
      }

      // case group
      if (null !== n.nodes && undefined !== n.nodes) {
        lightlayer = ({
          ...lightlayer,
          name:                 n.name, /** @since 3.10.0 **/
          title:                n.name,
          groupId:              uniqueId(),
          root:                 false,
          nodes:                [],
          checked:              n.checked,
          mutually_exclusive:   n["mutually-exclusive"],
          'mutually-exclusive': n["mutually-exclusive"], /** @since 3.10.0 */
        });
        this._traverseLightLayersTree(n.nodes, lightlayer.nodes, tocLayersId); // recursion step
      }

      // check if lightlayer is not null
      if (null !== lightlayer) {
        lightlayer.expanded = n.expanded; // expand legend item (TOC)
        layerstree.push(lightlayer);
      }
    });
  };

  /**
   * @since 3.8.0
   */
  _traverseLayersTree(nodes, parentGroup) {
    nodes.forEach((node, index) => {
      // substitute node layer with layer state
      if (undefined !== node.id) {
        nodes[index] = this.getLayerById(node.id).getState();
      }
      // case of layer substitute node with layer state
      if (undefined !== node.id) {
        nodes[index] = this.getLayerById(node.id).getState();
        // pass bbox and epsg of layer
        if (undefined !== nodes[index].bbox) {
          this._setLayersTreeGroupBBox(parentGroup, { bbox: nodes[index].bbox, epsg: nodes[index].epsg });
        }
      }
      if (Array.isArray(node.nodes)) {
        node.nodes.forEach(n => n.parentGroup = parentGroup);
        this._traverseLayersTree(node.nodes, node);
      }
      //SET PARENT GROUP
      nodes[index].parentGroup = parentGroup;
    });
  };

  /**
   * @since 3.8.0
   */
  _setLayersTreeGroupBBox(group, { bbox, epsg } = {}) {

    const project_epsg = this.getProjection().getCode();

    // translate bbox epsg to project epsg code (when they differ)
    if ((epsg !== project_epsg)) {
      const [minx, miny, maxx, maxy] = ol.proj.transformExtent([ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ], epsg, project_epsg);
      bbox = { minx, miny, maxx, maxy }
    }

    // get current bbox or compute bbox from an ol extent
    if (undefined === group.bbox) {
      group.bbox = bbox
    } else {
      group.bbox = ol.extent
        .extend(
          [ group.bbox.minx, group.bbox.miny, group.bbox.maxx, group.bbox.maxy ],
          [ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ]
        )
        .reduce(
          (bbox, extentCoordinate, index) => {
            switch(index){
              case 0: bbox.minx = extentCoordinate; break;
              case 1: bbox.miny = extentCoordinate; break;
              case 2: bbox.maxx = extentCoordinate; break;
              case 3: bbox.maxy = extentCoordinate; break;
            }
            return bbox;
          },
          { minxx:null, miny: null, maxx: null, maxy: null }
        );
    }

    // Recursion
    if (group.parentGroup && false === group.parentGroup.root) {
      this._setLayersTreeGroupBBox(group.parentGroup, { bbox: group.bbox, epsg: project_epsg });
    }
  };

}

