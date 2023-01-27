import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry from 'store/projects';
import ApplicationService from 'services/application';

const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function CatalogService() {
  this.state = {
    prstate: ProjectsRegistry.state,
    highlightlayers: false,
    external: {
      wms: [], // added by wms cside bar component
      vector: [] // added to map controls for the moment
    },
    layerstrees: [],
    layersgroups: []
  };
  this.setters = {
    /**
     * @since v3.8: Moved from method to setter method
     * @param layer
     * @param type
     */
    addExternalLayer({layer, type='vector'}={}) {
      layer.removable = true;
      this.state.external[type].push(layer);
    },
    /**
     * @since v3.8: Moved from method to setter method
     * @param layer
     * @param type
     */
    removeExternalLayer({name, type='vector'}={}) {
      this.state.external[type].filter((layer, index) => {
        if (layer.name === name) {
          this.state.external[type].splice(index, 1);
          return true
        }
      });
    },
    setSelectedExternalLayer({layer, type, selected}){
      this.state.external[type].forEach(externalLayer => {
        if (typeof externalLayer.selected != "undefined")
          externalLayer.selected = (layer === externalLayer) ? selected : false;
      })
    }
  };
  base(this);
  const layersStores = CatalogLayersStoresRegistry.getLayersStores();

  layersStores.forEach(layersStore => this.addLayersStoreToLayersTrees(layersStore));

  CatalogLayersStoresRegistry.onafter('addLayersStore', layersStore => {
    this.addLayersStoreToLayersTrees(layersStore)
  });

  CatalogLayersStoresRegistry.onafter('removeLayersStore', layersStore => {
    this.state.layerstrees.find((layersTree, idx) => {
      if (layersTree.storeid === layersStore.getId()) {
        this.state.layerstrees.splice(idx, 1);
        return true;
      }
    });
  });
  CatalogLayersStoresRegistry.onafter('removeLayersStores', () => {
    this.state.layerstrees.forEach((layersTree, idx) => {
      this.state.layerstrees.splice(idx, 1);
    });
  });
}

inherit(CatalogService, G3WObject);

const proto = CatalogService.prototype;

proto.createLayersGroup = function({title = 'Layers Group', layers =[]} = {}) {
  const nodes = [];
  layers.forEach(layer => nodes.push(layer));
  return {
    title,
    nodes
  }
};

proto.getMajorQgisVersion = function() {
  return ProjectsRegistry.getCurrentProject().getQgisVersion({
    type: 'major'
  });
};

// method to add a custom layers group
proto.addLayersGroup = function(layersGroup) {
  this.state.layersgroups.push(layersGroup);
};

proto.addLayersStoreToLayersTrees = function(layersStore) {
  this.state.layerstrees.push({
    tree: layersStore.getLayersTree(),
    storeid: layersStore.getId()
  });
};

proto.changeMapTheme = async function(map_theme){
  // set is changing project view
  ApplicationService.changeProjectView(true);
  const {currentProject} = this.state.prstate;
  const rootNode = this.state.layerstrees[0];
  rootNode.checked = true;
  const layerstree = rootNode.tree[0].nodes;
  const changeMapThemeProjectObj = await currentProject.setLayersTreePropertiesFromMapTheme({
    map_theme,
    layerstree,
    rootNode
  });
  ApplicationService.changeProjectView(false);
  return changeMapThemeProjectObj;
};

/**
 * @since v3.8
 */
proto.getExternalLayers = function({type="vector"}){
  return this.state.external[type];
};

proto.getExternalSelectedLayers = function({type="vector"}){
  return this.getExternalLayers({type}).filter(layer => layer.selected);
};

proto.getExternalLayerById = function({id, type="vector"}){
  return this.state.external[type].find(layer => layer.id === id);
};

proto.isExternalLayerSelected = function({id, type}){
  const externalLayer = this.getExternalLayerById({
    id,
    type
  });
  return externalLayer && externalLayer.selected;
};

module.exports = CatalogService;
