const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
export function getCatalogInfoTree(gid) {
  const projectLayersStore = CatalogLayersStoresRegistry.getLayersStore(gid);
  const layersTree = projectLayersStore.getLayersTree()[0];
  const info = {
    groups: [],
    layers: []
  };
  const traverseLayerTrees = nodes=>{
    nodes.forEach(node => {
      if (node.nodes) {
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
    case 'geolayer':
    case 'disabled':
    case 'visible':
    case 'checked':
      filterLayers = layers.filter(layer => layer[type]);
      break;
    case 'querable':
      filterLayers = layers.filter(layer => layer.isQueryable());
      break;
    case 'filtrable':
      filterLayers = layers.filter(layer => {
        return CatalogLayersStoresRegistry.getLayerById(layer.id).isFilterable({ows: 'WFS'});
      });
      break;
    }
    return filterLayers;
};

export default {
  getCatalogInfoTree,
  getLayersByType
}