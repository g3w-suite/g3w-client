import utils from 'core/utils/utils';
import G3WObject from 'core/g3wobject';

// Interface for Layers
class LayersStore extends G3WObject {
  constructor(config = {}) {
    super({
      setters: {
        setLayerSelection({ layerId, selection }) {
          const layer = this.getLayerById(layerId);
        },
        setLayerSelected(layerId, selected) {
          this.getLayers().forEach((layer) => layer.state.selected = (layerId === layer.getId()) ? selected : false);
        },
        addLayers(layers) {
          layers.forEach((layer) => this.addLayer(layer));
        },
        addLayer(layer) {
          this._addLayer(layer);
        },
        removeLayer(layerId) {
          this._removeLayer(layerId);
        },
      },
    });
    this.config = {
      id: config.id || Date.now(),
      projection: config.projection,
      extent: config.extent,
      initextent: config.initextent,
      wmsUrl: config.wmsUrl,
      // set catalogable property
      catalog: _.isBoolean(config.catalog) ? config.catalog : true,
    };

    this.state = {
      // useful to build layerstree
      layerstree: [],
      relations: null, // useful to build tree of relations
    };
    this._isQueryable = _.isBoolean(config.queryable) ? config.queryable : true;
    this._layers = this.config.layers || {};
  }

  isQueryable() {
    return this._isQueryable;
  }

  setQueryable(bool) {
    this._isQueryable = !!bool;
  }

  showOnCatalog() {
    return this.config.catalog;
  }

  setOptions(config) {
    this.config = config;
  }

  getId() {
    return this.config.id;
  }

  _addLayer(layer) {
    this._layers[layer.getId()] = layer;
  }

  _removeLayer(layer) {
    const layerId = layer.getId();
    delete this._layers[layerId];
  }

  removeLayers() {
    Object.entries(this._layers).forEach(([layerId, layer]) => {
      this.removeLayer(layer);
    });
  }

  getLayersDict(filter = {}, options = {}) {
    // in case  we pass filter = null
    if (!filter) return this._layers;
    const {
      PRINTABLE,
      QUERYABLE,
      FILTERABLE,
      EDITABLE,
      VISIBLE,
      SELECTED,
      CACHED,
      SELECTEDORALL,
      SERVERTYPE,
      BASELAYER,
      GEOLAYER,
      VECTORLAYER,
      HIDDEN,
      DISABLED,
      IDS,
    } = filter;

    // if filter is passed
    if (
      _.isUndefined(QUERYABLE)
      && _.isUndefined(FILTERABLE)
      && _.isUndefined(EDITABLE)
      && _.isUndefined(VISIBLE)
      && _.isUndefined(SERVERTYPE)
      && _.isUndefined(CACHED)
      && _.isUndefined(SELECTEDORALL)
      && _.isUndefined(SERVERTYPE)
      && _.isUndefined(GEOLAYER)
      && _.isUndefined(HIDDEN)
      && _.isUndefined(DISABLED)
      && _.isUndefined(BASELAYER)
      && _.isUndefined(VECTORLAYER)
      && _.isUndefined(PRINTABLE)
      && _.isUndefined(IDS)
    ) return this._layers;

    let layers = [];

    for (const key in this._layers) {
      layers.push(this._layers[key]);
    }

    if (IDS) {
      const ids = Array.isArray(IDS) ? IDS : [IDS];
      layers = layers.filter((layer) => ids.indexOf(layer.getId()) !== -1);
    }

    // return only selected if some one are selected
    if (SELECTEDORALL) {
      const _layers = layers;
      layers = layers.filter((layer) => layer.isSelected());
      layers = layers.length ? layers : _layers;
    } else if (typeof SELECTED === 'boolean') layers = layers.filter((layer) => SELECTED === layer.isSelected());

    if (typeof QUERYABLE === 'boolean') layers = layers.filter((layer) => QUERYABLE === layer.isQueryable());

    if (typeof FILTERABLE === 'boolean') layers = layers.filter((layer) => FILTERABLE === layer.isFilterable(options.filtrable || null));

    if (typeof EDITABLE === 'boolean') layers = layers.filter((layer) => EDITABLE === layer.isEditable());

    if (typeof VISIBLE === 'boolean') layers = layers.filter((layer) => VISIBLE === layer.isVisible());

    if (typeof CACHED === 'boolean') layers = layers.filter((layer) => CACHED === layer.isCached());

    if (typeof BASELAYER === 'boolean') layers = layers.filter((layer) => BASELAYER === layer.isBaseLayer());

    if (typeof GEOLAYER === 'boolean') layers = layers.filter((layer) => GEOLAYER === layer.state.geolayer);

    if (typeof VECTORLAYER === 'boolean') layers = layers.filter((layer) => VECTORLAYER === layer.isType('vector'));

    if (typeof HIDDEN === 'boolean') layers = layers.filter((layer) => HIDDEN == layer.isHidden());

    if (typeof DISABLED === 'boolean') layers = layers.filter((layer) => DISABLED === layer.isDisabled());

    if (typeof SERVERTYPE === 'string' && SERVERTYPE !== '') layers = layers.filter((layer) => SERVERTYPE === layer.getServerType());

    if (PRINTABLE) layers = layers.filter((layer) => layer.state.geolayer && layer.isPrintable({ scale: PRINTABLE.scale }));

    return layers;
  }

  // return layers array
  getLayers(filter = {}, options = {}) {
    return Object.values(this.getLayersDict(filter, options));
  }

  getBaseLayers() {
    return this.getLayersDict({
      BASELAYER: true,
    });
  }

  getLayerById(layerId) {
    return this.getLayersDict()[layerId];
  }

  getLayerByName(name) {
    return this._layers.find((layer) => layer.getName() === name);
  }

  getLayerAttributes(layerId) {
    return this.getLayerById(layerId).getAttributes();
  }

  getLayerAttributeLabel(layerId, name) {
    return this.getLayerById(layerId).getAttributeLabel(name);
  }

  getGeoLayers() {
    return this.getLayers({
      GEOLAYER: true,
    });
  }

  _getAllSiblingsChildrenLayersId(layerstree) {
    const nodeIds = [];
    const traverse = (layerstree) => {
      layerstree.nodes.forEach((node) => {
        if (node.id) nodeIds.push(node.id);
        else traverse(node);
      });
    };
    traverse(layerstree);
    return nodeIds;
  }

  _getAllParentLayersId(layerstree, node) {
    const nodeIds = [];
    const traverse = (layerstree) => {
      layerstree.nodes.forEach((node) => {
        if (node.id) nodeIds.push(node.id);
        // else traverse(node);
      });
    };

    traverse({
      nodes: layerstree.nodes.filter((_node) => _node !== node),
    });

    return nodeIds;
  }

  selectLayer(layerId, selected) {
    this.setLayerSelected(layerId, selected);
  }

  getProjection() {
    return this.config.projection;
  }

  getExtent() {
    return this.config.extent;
  }

  getInitExtent() {
    return this.config.initextent;
  }

  getWmsUrl() {
    return this.config.wmsUrl;
  }

  // set layersstree of layers inside the laysstore
  setLayersTree(layerstree, name, expanded = true) {
    // this is a root group project that contain all layerstree of qgis project
    const rootGroup = {
      title: name || this.config.id,
      root: true,
      parentGroup: null,
      expanded,
      disabled: false,
      checked: true,
      nodes: layerstree,
    };
    const traverse = (nodes, parentGroup) => {
      nodes.forEach((node, index) => {
        // case of layer substitute node with layere state
        if (node.id !== undefined) nodes[index] = this.getLayerById(node.id).getState();
        if (node.nodes) {
          node.nodes.forEach((node) => node.parentGroup = parentGroup);
          traverse(node.nodes, node);
        }
        // SET PARENT GROUP
        nodes[index].parentGroup = parentGroup;
      });
    };
    if (layerstree.length) {
      traverse(layerstree, rootGroup);
      // at the end
      this.state.layerstree.splice(0, 0, rootGroup);
    }
  }

  // used by from plugin (or external code) to build layerstree
  // layer groupNem is a ProjectName
  createLayersTree(groupName, options = {}) {
    const full = options.full || false;
    const { expanded } = options;
    const _layerstree = options.layerstree || null;
    const tocLayersId = this.getLayers({ BASELAYER: false }).map((layer) => layer.getId());
    const layerstree = [];
    if (_layerstree) {
      if (full === true) return this.state.layerstree;

      const traverse = (obj, newobj) => {
        obj.forEach((layer) => {
          let lightlayer = {};
          if (layer.id !== null && layer.id !== undefined) {
            if (tocLayersId.find((toclayerId) => toclayerId === layer.id)) {
              lightlayer.id = layer.id;
            } else lightlayer = null;
          }
          // case group
          if (layer.nodes !== null && layer.nodes !== undefined) {
            lightlayer.title = layer.name;
            lightlayer.expanded = layer.expanded;
            lightlayer.groupId = utils.uniqueId();
            lightlayer.nodes = [];
            lightlayer.checked = layer.checked;
            lightlayer.mutually_exclusive = layer['mutually-exclusive'];
            traverse(layer.nodes, lightlayer.nodes);
          }
          lightlayer && newobj.push(lightlayer);
        });
      };
      traverse(_layerstree, layerstree);
    } else {
      const geoLayers = this.getGeoLayers();
      geoLayers.forEach((layer) => {
        layerstree.push({
          id: layer.getId(),
          name: layer.getName(),
          title: layer.getTitle(),
          visible: layer.isVisible() || false,
        });
      });
    }
    // setLayerstree
    this.setLayersTree(layerstree, groupName, expanded);
  }

  removeLayersTree() {
    this.state.layerstree.splice(0, this.state.layerstree.length);
  }

  getLayersTree() {
    return this.state.layerstree;
  }
}

export default LayersStore;
