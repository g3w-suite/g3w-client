import GUI from 'services/gui';
import CatalogLayersStoresRegistry from 'store/catalog-layers';

let CatalogLayersStores = null;
const CATALOG_CONTEX_MENU_GEOMETRIES_TYPES = [
  'Point',
  'MultiPoint',
  'LinesString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
  '',
]

export function init(gid) {
  CatalogLayersStores = CatalogLayersStoresRegistry.getLayersStore(gid);
  catalogComponent = GUI.getComponent('catalog');
}

export function getCatalogInfoTree() {
  const layersTree = CatalogLayersStores.getLayersTree()[0];
  const info = {
    groups: [],
    layers: []
  };
  const traverseLayerTrees = (nodes) => {
    nodes.forEach(node => {
      if (node.nodes) {
        info.groups.push(node);
        traverseLayerTrees(node.nodes)
      } else {
        info.layers.push(node);
      }
    })
  }
  traverseLayerTrees(layersTree.nodes);
  return info;
}

export function testContextMenu() {
  const vueCatalogComponent = catalogComponent.getInternalComponent();
  const layers = getCatalogInfoTree().layers;
  let context_catalog_check = {
    status: true,
    message: null
  };
  const layersLength = layers.length;
  for (let i = 0; i < layersLength -1; i++){
    const layer = layers[i];
    const layerId = layer.id;
    vueCatalogComponent.canZoom(layer);
    const geometryType = vueCatalogComponent.getGeometryType(layerId);
    if (CATALOG_CONTEX_MENU_GEOMETRIES_TYPES.indexOf(geometryType) === -1) {
      context_catalog_check.status = false;
      context_catalog_check.message = `Layer ${layer.title} Geometry error: Type ${geometryType}`;
    }
    vueCatalogComponent.showAttributeTable(layerId);
    vueCatalogComponent.canDownloadShp(layerId);
    vueCatalogComponent.canDownloadGpx(layerId);
    vueCatalogComponent.canDownloadXls(layerId);
    vueCatalogComponent.canShowWmsUrl(layerId);
  }
  return context_catalog_check
}

export function getOpenAttributeLayers() {
  return CatalogLayersStores.getLayers().filter(layer => layer.canShowTable());
}

export function getDownloadableLayers(){
  const download = {
    csv:[],
    gpx:[],
    shp:[],
    xls:[]
  };
  CatalogLayersStores
    .getLayers()
    .forEach(layer => {
      layer.isCsvDownlodable() && download.csv.push(layer);
      layer.isShpDownlodable() && download.shp.push(layer);
      layer.isGpxDownlodable() && download.gpx.push(layer);
      layer.isXlsDownlodable() && download.xls.push(layer);
    });
  return download;
}

export function getDataTable(layer) {
  return new Promise((resolve, reject) => {
    layer.getDataTable()
      .then(response =>resolve(response))
      .fail( err =>reject(err))
  })
}

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
        return CatalogLayersStores.getLayerById(layer.id).isFilterable({ows: 'WFS'});
      });
      break;
    }
    return filterLayers;
}

export default {
  init,
  getCatalogInfoTree,
  getLayersByType,
  getOpenAttributeLayers,
  getDataTable,
  getDownloadableLayers,
  testContextMenu
}