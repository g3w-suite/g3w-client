import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService from 'services/data';

const doQuery = function({coordinates}={}){
  return DataRouterService.getData('query:coordinates', {
    inputs: {
      coordinates
    },
    outputs: false
  })
};

const doQueryBBOX = ({mapService, bbox}={}) => {
  return DataRouterService.getData('query:bbox', {
    inputs: {
      bbox
    },
    outputs: false
  })
};

const doQueryByPolygon = async function({layer, coordinates}={}){
  const setSelectedLayer = CatalogLayersStoresRegistry.getLayerById(layer.id);
  setSelectedLayer.setSelected(true);
  const {data=[]} = await DataRouterService.getData('query:coordinates', {
    inputs: {
      coordinates
    },
    outputs: false
  })
  if (data.length && data[0].features.length) {
    const geometry = data[0].features[0].getGeometry();
    const excludeLayers = [data[0].layer];
    return DataRouterService.getData('query:polygon', {
      inputs: {
        excludeLayers,
        geometry,
      },
      outputs: false
    });
  }
};

module.exports = {
  query: {
    run: doQuery
  },
  querybbox: {
    run: doQueryBBOX
  },
  querybypolygon: {
    run: doQueryByPolygon
  }
};
