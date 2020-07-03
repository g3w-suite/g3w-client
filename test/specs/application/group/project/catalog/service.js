const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
export function getCatalogInfoTree(gid) {
  const projectLayersStore = CatalogLayersStoresRegistry.getLayersStore(gid);
  const layersTree = projectLayersStore.getLayersTree()[0];
  const info = {
    groups: [],
    layers: []
  };
  const traverseLayerTrees = (nodes)=>{
    nodes.forEach(node => {
      if(node.nodes) {
        info.groups.push(node);
        traverseLayerTrees(node.nodes)
      } else info.layers.push(node);
    })
  }
  traverseLayerTrees(layersTree.nodes);
  return info;
};

export function getLayersByType({layers=[], type}={}) {
  let filterLayers;
  switch (type) {
    case 'table':
      filterLayers = layers.filter(layer => !layer.geolayer);
      break;
    case 'vector':
      filterLayers = layers.filter(layer => layer.geolayer);
      break;
    case 'disabled':
    case 'visible':
    case 'checked':
      filterLayers = layers.filter(layer => layer[type]);
      break;
    case 'querable':
      filterLayers = layers.filter(layer => layer.geolayer);
      break;
    case 'filtrable':
      filterLayers = layers.filter(layer => layer.geolayer);
      break;
    }
    return filterLayers;
};

export default {
  getCatalogInfoTree,
  getLayersByType
}