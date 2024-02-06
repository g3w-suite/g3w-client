const { base, inherit, uniqueId } = require('utils');
const G3WObject = require('core/g3wobject');

// Interface for Layers
function LayersStore(config={}) {
  this.config = {
    id: config.id || Date.now(),
    projection: config.projection,
    extent: config.extent,
    initextent: config.initextent,
    wmsUrl: config.wmsUrl,
    //set catalogable property
    catalog: _.isBoolean(config.catalog) ? config.catalog : true
  };
  this.state = {
    //useful to build layerstree
    layerstree: [],
    relations: null // useful to build tree of relations
  };
  this._isQueryable = _.isBoolean(config.queryable) ? config.queryable : true;
  this._layers = this.config.layers || {};
  this.setters = {
    setLayerSelection({layerId, selection}){
      const layer = this.getLayerById(layerId);
    },
    setLayerSelected(layerId, selected) {
      this.getLayers().forEach(layer => layer.state.selected = (layerId === layer.getId()) ? selected : false);
    },
    addLayers(layers) {
      layers.forEach(layer => this.addLayer(layer))
    },
    addLayer(layer) {
      this._addLayer(layer);
    },
    removeLayer(layerId) {
      this._removeLayer(layerId);
    }
  };

  base(this);
}

inherit(LayersStore, G3WObject);

const proto = LayersStore.prototype;

proto.isQueryable = function() {
  return this._isQueryable;
};

proto.setQueryable = function(bool) {
  this._isQueryable = !!bool;
};

proto.showOnCatalog = function() {
  return this.config.catalog;
};

proto.setOptions = function(config) {
  this.config = config;
};

proto.getId = function() {
  return this.config.id;
};

proto._addLayer = function(layer) {
  this._layers[layer.getId()] = layer;
};

proto._removeLayer = function(layer) {
  const layerId = layer.getId();
  delete this._layers[layerId];
};

proto.removeLayers = function() {
  Object.entries(this._layers).forEach(([layerId, layer]) => {
    this.removeLayer(layer)
  })
};

proto.getLayersDict = function(filter = {}, options = {}) {

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
    layers = layers.filter(layer => -1 !== ids.indexOf(layer.getId()));
  }

  // check if there are `selected` layers otherwise get all `layers`
  if (filter.SELECTED_OR_ALL) {
    const selected = layers.filter(l => l.isSelected());
    layers = selected.length > 0 ? selected : layers;
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
  if (has(filter.HIDDEN))                                                 layers = layers.filter(l => filter.HIDDEN      == l.isHidden());
  if (has(filter.DISABLED))                                               layers = layers.filter(l => filter.DISABLED    === l.isDisabled());
  if ('string'  === typeof filter.SERVERTYPE && filter.SERVERTYPE.length) layers = layers.filter(l => filter.SERVERTYPE  === l.getServerType());
  if (filter.PRINTABLE)                                                   layers = layers.filter(l => l.state.geolayer && l.isPrintable({ scale: filter.PRINTABLE.scale }));

  return layers;
};

// return layers array
proto.getLayers = function(filter = {}, options = {}) {
  return Object.values(this.getLayersDict(filter, options));
};

proto.getBaseLayers = function() {
  return this.getLayersDict({
    BASELAYER: true
  });
};

proto.getLayerById = function(layerId) {
  return this.getLayersDict()[layerId];
};

proto.getLayerByName = function(name) {
  return this._layers.find((layer) => {
    return layer.getName() === name;
  });
};

proto.getLayerAttributes = function(layerId){
  return this.getLayerById(layerId).getAttributes();
};

proto.getLayerAttributeLabel = function(layerId,name){
  return this.getLayerById(layerId).getAttributeLabel(name);
};

proto.getGeoLayers = function() {
  return this.getLayers({
    GEOLAYER: true
  })
};

proto._getAllSiblingsChildrenLayersId = function(layerstree) {
  let nodeIds = [];
  let traverse = layerstree => {
    layerstree.nodes.forEach(node => {
      if (node.id) nodeIds.push(node.id);
      else traverse(node);
    });
  };
  traverse(layerstree);
  return nodeIds;
};

proto._getAllParentLayersId = function(layerstree, node) {
  let nodeIds = [];
  let traverse = layerstree => {
    layerstree.nodes.forEach(node => {
      if (node.id) nodeIds.push(node.id);
      //else traverse(node);
    });
  };

  traverse({
    nodes: layerstree.nodes.filter(_node => _node !== node)
  });

  return nodeIds;
};

proto.selectLayer = function(layerId, selected){
  this.setLayerSelected(layerId, selected);
};

proto.getProjection = function() {
  return this.config.projection;
};

proto.getExtent = function() {
  return this.config.extent;
};

proto.getInitExtent = function() {
  return this.config.initextent;
};

proto.getWmsUrl = function() {
  return this.config.wmsUrl;
};

proto.removeLayersTree = function() {
  this.state.layerstree.splice(0, this.state.layerstree.length);
};

proto.getLayersTree = function() {
  return this.state.layerstree;
};

/**
 * Set layersstree of layers inside the layersstore
 *
 * @param {unknown[]} layerstree nodes
 * @param {string}    name
 * @param {boolean}   [expanded = true]
 */
proto.setLayersTree = function(layerstree=[], name, expanded=true) {
  const [minx, miny, maxx, maxy] = this.getInitExtent();

  // Root group project that contain all layerstree of qgis project
  const rootGroup = {
    title: name || this.config.id,
    root: true,
    parentGroup: null,
    expanded,
    disabled: false,
    checked: true,
    /**
     * @since 3.8.0
     */
    bbox: { minx, miny, maxx, maxy },
    nodes: layerstree
  };

  if (layerstree.length) {
    this._traverseLayersTree(layerstree, rootGroup);
    this.state.layerstree.splice(0, 0, rootGroup); // at the end
  }
};

/**
 * Used by external plugins to build layerstree
 *
 * @param {string}  groupName is a ProjectName
 * @param {unknown} [options.layerstree = null ]
 * @param {boolean} [options.expanded   = false]
 * @param {boolean} [options.full       = false]
 */
proto.createLayersTree = function(
  groupName,
  options = {
    layerstree: null,
    expanded: false,
    full: false
  }
  ) {

  let layerstree = [];

  // return layerstree from server project config (when setted)
  if (options.layerstree && true === options.full) {
      return this.state.layerstree;
  }

  // compare all layer ids from server config with all layer nodes on layerstree server property
  if (options.layerstree && true !== options.full) {
    const tocLayersId = this.getLayers({ BASELAYER: false }).map(layer=>layer.getId())
    this._traverseLightLayersTree(options.layerstree, layerstree, tocLayersId);
  }

  // retrieve all project layers that have geometry
  if (!options.layerstree) {
    layerstree = this.getGeoLayers()
      .map(layer => ({
        id: layer.getId(),
        name: layer.getName(),
        title: layer.getTitle(),
        visible: layer.isVisible() || false
      })
    )
  }

  // setLayerstree
  this.setLayersTree(layerstree, groupName, options.expanded);
};

/**
 * @since 3.8.0
 */
proto._traverseLightLayersTree = function(nodes, layerstree, tocLayersId) {
  nodes.forEach(node => {
    let lightlayer = null;

    // case TOC has layer ID
    if (null !== node.id && "undefined" !== typeof node.id && tocLayersId.find(id => id === node.id)) {
      lightlayer = ({ ...lightlayer, ...node });
    }

    // case group
    if (null !== node.nodes && "undefined" !== typeof node.nodes) {
      lightlayer = ({
        ...lightlayer,
        title: node.name,
        groupId: uniqueId(),
        root: false,
        nodes: [],
        checked: node.checked,
        mutually_exclusive: node["mutually-exclusive"]
      });
      this._traverseLightLayersTree(node.nodes, lightlayer.nodes, tocLayersId); // recursion step
    }

    // check if lightlayer is not null
    if (null !== lightlayer) {
      lightlayer.expanded = node.expanded; // expand legend item (TOC)
      layerstree.push(lightlayer);
    }
  });
};

/**
 * @since 3.8.0
 */
proto._traverseLayersTree = function(nodes, parentGroup) {
  nodes.forEach((node, index) => {
    // substitute node layer with layer state
    if ("undefined" !== typeof node.id) {
      nodes[index] = this.getLayerById(node.id).getState();
    }
    // case of layer substitute node with layer state
    if ("undefined" !== typeof node.id) {
      nodes[index] = this.getLayerById(node.id).getState();
      // pass bbox and epsg of layer
      if ("undefined" !== typeof nodes[index].bbox) {
        this._setLayersTreeGroupBBox(parentGroup, { bbox: nodes[index].bbox, epsg: nodes[index].epsg });
      }
    }
    if (Array.isArray(node.nodes)) {
      node.nodes.forEach(node => node.parentGroup = parentGroup);
      this._traverseLayersTree(node.nodes, node);
    }
    //SET PARENT GROUP
    nodes[index].parentGroup = parentGroup;
  });
};

/**
 * @since 3.8.0
 */
proto._setLayersTreeGroupBBox = function(group, { bbox, epsg } = {}) {

  const project_epsg = this.getProjection().getCode();

  // translate bbox epsg to project epsg code (when they differ)
  if ((epsg !== project_epsg)) {
    const [minx, miny, maxx, maxy] = ol.proj.transformExtent([ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ], epsg, project_epsg);
    bbox = { minx, miny, maxx, maxy }
  }

  // get current bbox or compute bbox from ol extent
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

module.exports = LayersStore;
