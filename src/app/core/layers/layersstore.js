const { base, inherit, uniqueId } = require('core/utils/utils');
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

proto.getLayersDict = function(filter = {}, options={}) {
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
    SELECTED_OR_ALL,
    SERVERTYPE,
    BASELAYER,
    GEOLAYER,
    VECTORLAYER,
    HIDDEN,
    DISABLED,
    IDS
  } = filter;

  // if filter is passed
  if (
    _.isUndefined(QUERYABLE) &&
    _.isUndefined(FILTERABLE) &&
    _.isUndefined(EDITABLE) &&
    _.isUndefined(VISIBLE) &&
    _.isUndefined(SERVERTYPE) &&
    _.isUndefined(CACHED) &&
    _.isUndefined(SELECTED_OR_ALL) &&
    _.isUndefined(SERVERTYPE) &&
    _.isUndefined(GEOLAYER) &&
    _.isUndefined(HIDDEN) &&
    _.isUndefined(DISABLED) &&
    _.isUndefined(BASELAYER) &&
    _.isUndefined(VECTORLAYER) &&
    _.isUndefined(PRINTABLE) &&
    _.isUndefined(IDS)
  ) return this._layers;

  let layers = [];

  for (let key in this._layers) {
    layers.push(this._layers[key]);
  }

  if (IDS) {
    const ids = Array.isArray(IDS) ? IDS : [IDS];
    layers = layers.filter(layer => ids.indexOf(layer.getId()) !== -1)
  }

  // return only selected if some one are selected
  if (SELECTED_OR_ALL) {
    let _layers = layers;
    layers = layers.filter(layer => layer.isSelected());
    layers = layers.length ? layers : _layers;
  }

  if ('boolean' === typeof SELECTED && !SELECTED_OR_ALL) layers = layers.filter(layer => SELECTED === layer.isSelected());

  if ('boolean' === typeof QUERYABLE)   layers = layers.filter(layer => QUERYABLE   === layer.isQueryable());
  if ('boolean' === typeof FILTERABLE)  layers = layers.filter(layer => FILTERABLE  === layer.isFilterable(options.filtrable || null));
  if ('boolean' === typeof EDITABLE)    layers = layers.filter(layer => EDITABLE    === layer.isEditable());
  if ('boolean' === typeof VISIBLE)     layers = layers.filter(layer => VISIBLE     === layer.isVisible());
  if ('boolean' === typeof CACHED)      layers = layers.filter(layer => CACHED      === layer.isCached());
  if ('boolean' === typeof BASELAYER)   layers = layers.filter(layer => BASELAYER   === layer.isBaseLayer());
  if ('boolean' === typeof GEOLAYER)    layers = layers.filter(layer => GEOLAYER    === layer.state.geolayer);
  if ('boolean' === typeof VECTORLAYER) layers = layers.filter(layer => VECTORLAYER === layer.isType('vector'));
  if ('boolean' === typeof HIDDEN)      layers = layers.filter(layer => HIDDEN      == layer.isHidden());
  if ('boolean' === typeof DISABLED)    layers = layers.filter(layer => DISABLED    === layer.isDisabled());

  if ('string' === typeof SERVERTYPE && '' !== SERVERTYPE) layers = layers.filter(layer => SERVERTYPE === layer.getServerType());

  if (PRINTABLE) layers = layers.filter(layer => layer.state.geolayer && layer.isPrintable({scale: PRINTABLE.scale}));

  return layers;
};

// return layers array
proto.getLayers = function(filter={}, options={}) {
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

/**
 * Set layersstree of layers inside the layersstore
 *
 * @param {unknown[]} layerstree nodes
 * @param {string}    name
 * @param {boolean}   [expanded = true]
 */
proto.setLayersTree = function(layerstree=[], name, expanded=true) {
  // Root group project that contain all layerstree of qgis project
  const [minx, miny, maxx, maxy] = this.getInitExtent();
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
    bbox: {
      minx,
      miny,
      maxx,
      maxy
    },
    nodes: layerstree
  };
  const setGroupBBox = (group, {bbox, epsg}={}) => {
    //check if epsg code is different from project epsg
    if ((epsg !== this.getProjection().getCode())) {
      //need to transform bbox to project epsg code
      const [minx, miny, maxx, maxy] = ol.proj.transformExtent([
        bbox.minx,
        bbox.miny,
        bbox.maxx,
        bbox.maxy
      ], epsg, this.getProjection().getCode());
      //set translate value to bbox
      bbox = {
        minx,
        miny,
        maxx,
        maxy
      }
    }

    group.bbox = "undefined" === typeof group.bbox ?
      // get bbox from bbox
      group.bbox = bbox :
      //calculate bbox from extent ol method
      ol.extent.extend(
      [
        group.bbox.minx,
        group.bbox.miny,
        group.bbox.maxx,
        group.bbox.maxy
      ],
      [
        bbox.minx,
        bbox.miny,
        bbox.maxx,
        bbox.maxy
      ]
    ).reduce((bbox, extentCoordinate, index) =>{
      switch(index){
        case 0:
          bbox.minx = extentCoordinate;
          break;
        case 1:
          bbox.miny = extentCoordinate;
          break;
        case 2:
          bbox.maxx = extentCoordinate;
          break;
        case 3:
          bbox.maxy = extentCoordinate;
          break;
      }
      return bbox;
    }, {minxx:null, miny: null, maxx: null, maxy: null});
    // Recursion
    if (group.parentGroup && false === group.parentGroup.root) {
      setGroupBBox(group.parentGroup, {
        bbox: group.bbox,
        epsg: this.getProjection().getCode(), // set epsg of project
      });
    }
  };
  const traverse = (nodes, parentGroup) => {
    nodes.forEach((node, index) => {
      // substitute node layer with layer state
      if ("undefined" !== typeof node.id) {
        nodes[index] = this.getLayerById(node.id).getState();
      }
      // case of layer substitute node with layer state
      if ("undefined" !== typeof node.id) {
        nodes[index] = this.getLayerById(node.id).getState();
        if ("undefined" !== typeof nodes[index].bbox) {
          setGroupBBox(parentGroup, {
            bbox: nodes[index].bbox, // pass bbox of layer
            epsg: nodes[index].epsg, // pass espg of layer
          });
        }
      }
      if (Array.isArray(node.nodes)) {
        node.nodes.forEach(node => node.parentGroup = parentGroup);
        traverse(node.nodes, node);
      }
      //SET PARENT GROUP
      nodes[index].parentGroup = parentGroup;
    });
  };
  if (layerstree.length) {
    traverse(layerstree, rootGroup);
    // at the end
    this.state.layerstree.splice(0,0, rootGroup);
  }
};

/**
 * Used by external plugins to build layerstree
 *
 * @param {string} groupName is a ProjectName
 * @param {layerstree, expanded: boolean, full: bool} options
 */
proto.createLayersTree = function(
  groupName,
  options = {
    layerstree:null,
    expanded: false,
    full: false
  }
  ) {

  // get all layers id from layers server config to compare with layer nodes on layerstree server property
  const tocLayersId = this.getLayers({ BASELAYER: false }).map(layer=>layer.getId());
  let layerstree = [];

  // check if layerstree coming from server project configuration is set
  if (options.layerstree && true === options.full) {
      return this.state.layerstree;
  }

  /** @FIXME add description */
  if (options.layerstree && true !== options.full) {
    let traverse = (nodes, layerstree) => {
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
            traverse(node.nodes, lightlayer.nodes); // recursion step
          }

        // check if lightlayer is not null
        if (null !== lightlayer) {
          lightlayer.expanded = node.expanded; // expand legend item (TOC)
          layerstree.push(lightlayer);
        }
      });
    };
    traverse(options.layerstree, layerstree);
  }

  /** @FIXME add description */
  if (!options.layerstree) {
    // get all project layers that have geometry
    layerstree = this.getGeoLayers().map(layer => ({
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

proto.removeLayersTree = function() {
  this.state.layerstree.splice(0,this.state.layerstree.length);
};

proto.getLayersTree = function() {
  return this.state.layerstree;
};

module.exports = LayersStore;
