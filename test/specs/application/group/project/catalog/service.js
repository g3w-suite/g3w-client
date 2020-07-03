const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
export const getCatalogInfoTree = function(gid) {
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
  traverseLayerTrees(layersTree.nodes)
  return info;
}
export default {
  getCatalogInfoTree
}