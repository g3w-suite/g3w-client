const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
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
    setLayersVisible: function (layersIds, visible, checked=true) {
      const layers = [];
      layersIds.forEach((layerId) => {
        const layer = this.getLayerById(layerId);
        layer.setVisible(visible);
        checked && layer.setChecked(visible);
        layers.push(layer);
      });
      return layers;
    },
    setLayerSelected(layerId, selected) {
      const layers = this.getLayers();
      layers.forEach(layer => layer.state.selected = ((layerId === layer.getId()) && selected) || false);
    },
    addLayers(layers) {
      layers.forEach((layer) => {
        this.addLayer(layer);
      })
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

proto = LayersStore.prototype;

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
  if (!filter) {
    return this._layers;
  }
  const filterPrintable = filter.PRINTABLE;
  const filterActive = filter.ACTIVE;
  const filterQueryable = filter.QUERYABLE;
  const filterFilterable = filter.FILTERABLE;
  const filterEditable = filter.EDITABLE;
  const filterVisible = filter.VISIBLE;
  const filterSelected = filter.SELECTED;
  const filterCached = filter.CACHED;
  const filterSelectedOrAll = filter.SELECTEDORALL;
  const filterAllNotSelected = filter.ALLNOTSELECTED;
  const filterServerType = filter.SERVERTYPE;
  const filterBaseLayer = filter.BASELAYER;
  const filterGeoLayer = filter.GEOLAYER;
  const filterVectorLayer = filter.VECTORLAYER;
  const filterHidden = filter.HIDDEN;
  const filterDisabled = filter.DISABLED;
  const filterIds = filter.IDS;
  if (_.isUndefined(filterQueryable)
    && _.isUndefined(filterFilterable)
    && _.isUndefined(filterEditable)
    && _.isUndefined(filterVisible)
    && _.isUndefined(filterActive)
    && _.isUndefined(filterSelected)
    && _.isUndefined(filterCached)
    && _.isUndefined(filterSelectedOrAll)
    && _.isUndefined(filterServerType)
    && _.isUndefined(filterGeoLayer)
    && _.isUndefined(filterHidden)
    && _.isUndefined(filterDisabled)
    && _.isUndefined(filterBaseLayer)
    && _.isUndefined(filterVectorLayer)
    && _.isUndefined(filterPrintable)
    && _.isUndefined(filterIds)
  ) {
    return this._layers;
  }
  let layers = [];

  for(let key in this._layers) {
    layers.push(this._layers[key]);
  }

  // return only selected
  if (filterSelectedOrAll) {
    let _layers = layers;
    layers = layers.filter((layer) => {
      return layer.isSelected();
    });
    layers = layers.length ? layers : _layers;
  }

  if (filterIds) {
    const ids = Array.isArray(filterIds) ? filterIds : [filterIds];
    layers = layers.filter(layer => ids.indexOf(layer.getId()) !== -1)
  }

  if (typeof filterActive === 'boolean') layers = layers.filter(layer => filterActive === !layer.isDisabled());

  if (typeof filterQueryable === 'boolean') layers = layers.filter(layer => filterQueryable === layer.isQueryable());

  if (typeof filterFilterable === 'boolean') layers = layers.filter(layer => filterFilterable === layer.isFilterable(options.filtrable || null));

  if (typeof filterEditable === 'boolean') layers = layers.filter(layer => filterEditable === layer.isEditable());

  if (typeof filterVisible === 'boolean') layers = layers.filter(layer => filterVisible === layer.isVisible());

  if (typeof filterCached === 'boolean') layers = layers.filter(layer => filterCached === layer.isCached());

  if (typeof filterSelected === 'boolean') layers = layers.filter(layer => filterSelected === layer.isSelected());

  if (typeof filterBaseLayer === 'boolean') layers = layers.filter(layer => filterBaseLayer === layer.isBaseLayer());

  if (typeof filterGeoLayer === 'boolean') layers = layers.filter(layer => filterGeoLayer === layer.state.geolayer);

  if (typeof filterVectorLayer === 'boolean') layers = layers.filter(layer => filterVectorLayer === layer.isType('vector'));

  if (typeof filterHidden === 'boolean') layers = layers.filter(layer => filterHidden == layer.isHidden());

  if (typeof filterDisabled === 'boolean') layers = layers.filter(layer => filterDisabled === layer.isDisabled());

  if (typeof filterServerType === 'string' && filterServerType !=='') layers = layers.filter(layer => filterServerType === layer.getServerType());

  if (filterPrintable) layers = layers.filter(layer => layer.state.geolayer && layer.isPrintable({scale: filterPrintable.scale}));

  // return only not selected
  if (filterAllNotSelected) layers = layers.filter((layer) => !layer.isSelected());
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
  let traverse = (layerstree) => {
    layerstree.nodes.forEach((node) => {
      if (node.id)
        nodeIds.push(node.id);
      else
        traverse(node);
    });
  };
  traverse(layerstree);
  return nodeIds;
};

proto._getAllParentLayersId = function(layerstree, node) {
  let nodeIds = [];
  let traverse = (layerstree) => {
    layerstree.nodes.forEach((node) => {
      if (node.id)
        nodeIds.push(node.id);
      else
        traverse(node);
    });
  };

  traverse({
    nodes: layerstree.nodes.filter((_node) => {
      return _node !== node;
    })
  });
  return nodeIds;
};

proto._mutuallyExclude = function(layerId) {
  let parentLayersTree = this.state.layerstree;
  let traverse = (obj) => {
    Object.entries(obj).forEach(([key, layer]) => {
      if (!_.isNil(layer.nodes)) {
        let found = layer.nodes.reduce((previous, node) => {
          return node.id === layerId ||  previous ;
        }, false);
        // if found mean that a found a group that contain layer with layerId
        if (found) {
          let checked_node;
          let nodeIds = [];
          layer.nodes.forEach((node) => {
            if (node.id) {
              if (node.id !== layerId && node.geolayer)
                nodeIds.push(node.id);
              else
                checked_node = node;
            } else {
              nodeIds = nodeIds.concat(this._getAllSiblingsChildrenLayersId(node));
            }
          });
          if (parentLayersTree.mutually_exclusive) {
            nodeIds = nodeIds.concat(this._getAllParentLayersId(parentLayersTree));
          }
          this.setLayersVisible(nodeIds, false);
          parentLayersTree = layer;
        }
        traverse(layer.nodes);
      }
    });
  };
  traverse(this.state.layerstree)
};

proto.toggleLayer = function(layerId, visible, mutually_exclusive) {
  const layer = this.getLayerById(layerId);
  const checked = layer.isChecked();
  visible = visible !== null ? checked : !checked;
  mutually_exclusive &&  this._mutuallyExclude(layerId);
  if (layer.isDisabled()) layer.setVisible(false);
  else this.setLayersVisible([layerId], visible);
  layer.setChecked(!checked);
  return layer;
};

proto.toggleLayers = function(layersIds, visible, checked=true) {
  return this.setLayersVisible(layersIds, visible, checked)
};

proto.selectLayer = function(layerId){
  this.setLayerSelected(layerId, true);
};

proto.unselectLayer = function(layerId) {
  this.setLayerSelected(layerId, false);
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

// set layersstree of layers inside the laysstore
proto.setLayersTree = function(layerstree, name) {
  const traverse = (obj, isChild=false, currentGroupDisabled=false) => {
    Object.entries(obj).forEach(([key, layer]) => {
      if (layer.id !== undefined) {
        obj[key] = this.getLayerById(layer.id).getState();
        obj[key].groupdisabled = currentGroupDisabled;
      }
      if (layer.nodes) {
        const _currentGroupDisabled = !isChild ? !layer.checked : currentGroupDisabled || !layer.checked;
        traverse(layer.nodes, true, _currentGroupDisabled);
      }
    });
  };
  if (layerstree.length) {
    traverse(layerstree);
    this.state.layerstree.splice(0,0,{
      title: name || this.config.id,
      expanded: true,
      disabled: false,
      checked: true,
      nodes: layerstree
    });
  }
};

// used by from plugin (or external code) to build layerstree
// layer groupNem is a ProjectName
proto.createLayersTree = function(groupName, options={}) {
  const full = options.full || false;
  const _layerstree = options.layerstree || null;
  const tocLayersId = this.getLayers({BASELAYER:false}).map(layer=>layer.getId());
  let layerstree = [];
  if (_layerstree) {
    if (full === true) {
      return this.state.layerstree;
    } else {
      let traverse = (obj, newobj) => {
        _.forIn(obj, layer => {
          let lightlayer = {};
          if (!_.isNil(layer.id)) {
            if (tocLayersId.find(toclayerId => toclayerId === layer.id)) lightlayer.id = layer.id;
            else lightlayer = null;
          }
          if (!_.isNil(layer.nodes)) {
            lightlayer.title = layer.name;
            lightlayer.expanded = layer.expanded;
            lightlayer.nodes = [];
            lightlayer.checked = layer.checked;
            lightlayer.mutually_exclusive = layer["mutually-exclusive"];
            traverse(layer.nodes, lightlayer.nodes)
          }
          lightlayer && newobj.push(lightlayer);
        });
      };
      traverse(_layerstree, layerstree);
    }
  } else {
    const geoLayers = this.getGeoLayers();
    geoLayers.forEach(layer => {
      layerstree.push({
        id: layer.getId(),
        name: layer.getName(),
        title: layer.getTitle(),
        visible: layer.isVisible() || false
      })
    });
  }
  this.setLayersTree(layerstree, groupName);
};

proto.removeLayersTree = function() {
  this.state.layerstree.splice(0,this.state.layerstree.length);
};

proto.getLayersTree = function() {
  return this.state.layerstree;
};


module.exports = LayersStore;
