const {base, inherit} = require('core/utils/utils');
const ApplicationService = require('core/applicationservice');
const G3WObject = require('core/g3wobject');
const ProjectsRegistry = require('core/project/projectsregistry');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');

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
  this.setters = {};
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

proto.addExternalLayer = function({layer, type='vector'}={}) {
  layer.removable = true;
  this.state.external[type].push(layer);
};

proto.removeExternalLayer = function({name, type='vector'}={}) {
  this.state.external[type].find((layer, index) => {
    if (layer.name === name) {
      this.state.external[type].splice(index, 1);
      return true
    }
  });
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

module.exports = CatalogService;
