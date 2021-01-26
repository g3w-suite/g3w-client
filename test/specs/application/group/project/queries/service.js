const Filter = require('core/layers/filter/filter');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');

const doQuery = function({mapService, coordinates}={}){
  return new Promise((resolve, reject) =>{
    mapService.runQuery({
      coordinates
    }).then(response => {
      resolve(response);
    }).fail(err => reject(err))
  });
};

const doQueryBBOX = ({mapService, bbox}={}) => {
  return new Promise((resolve, reject) =>{
    mapService.runQueryBBOX({bbox}).then(response =>{
      resolve(response[0].data)
    }).fail(err =>{
      reject(err)
    })
  })
}

const doQueryByPolygon = function({layer, mapService, coordinates}={}){
  const setSelectedLayer = CatalogLayersStoresRegistry.getLayerById(layer.id);
  setSelectedLayer.setSelected(true);
  return new Promise((resolve, reject) =>{
    mapService.runQueryByPolygon({
      coordinates
    }).then(({response}) =>{
      resolve(response[0].data)
    }).catch(err =>{
      reject(err);
    })
  })
}

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
}
