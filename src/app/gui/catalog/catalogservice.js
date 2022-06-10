import  ApplicationService  from 'core/applicationservice';
import G3WObject from 'core/g3wobject';
import  ProjectsRegistry  from 'core/project/projectsregistry';
import  CatalogLayersStoresRegistry  from 'core/catalog/cataloglayersstoresregistry';

class CatalogService extends G3WObject {
  constructor() {
    super();
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
  };

  createLayersGroup({title = 'Layers Group', layers =[]} = {}) {
    const nodes = [];
    layers.forEach(layer => nodes.push(layer));
    return {
      title,
      nodes
    }
  };

  getMajorQgisVersion() {
    return ProjectsRegistry.getCurrentProject().getQgisVersion({
      type: 'major'
    });
  };

// method to add a custom layers group
  addLayersGroup(layersGroup) {
    this.state.layersgroups.push(layersGroup);
  };

  addExternalLayer({layer, type='vector'}={}) {
    layer.removable = true;
    this.state.external[type].push(layer);
  };

  removeExternalLayer({name, type='vector'}={}) {
    this.state.external[type].find((layer, index) => {
      if (layer.name === name) {
        this.state.external[type].splice(index, 1);
        return true
      }
    });
  };

  addLayersStoreToLayersTrees(layersStore) {
    this.state.layerstrees.push({
      tree: layersStore.getLayersTree(),
      storeid: layersStore.getId()
    });
  };

  async changeMapTheme(map_theme) {
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


}




export default  CatalogService;
