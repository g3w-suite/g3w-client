/*BASE WMS LAYERS */

_gis3wlib._layer.prototype.buildRasterLayer = function(rasterOpts){
  return rasterLayer;
};

_gis3wlib._layer.prototype.addTiledWMSLayer = function(layerObj){
  var layer = new ol.layer.Image({
    name: layerObj.name,
    opacity: layerObj.opacity || 1.0,
    source: new ol.source.TileWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.name,
        VERSION: '1.3.0',
        TRANSPARENT: true
      },
      serverType: 'mapserver'
    }),
    visible:layerObj.visible
  });
  this.map.addLayer(layer);

  return layer;
};

_gis3wlib._layer.prototype.addWMSLayer = function(layerObj){
  var layer = new ol.layer.Image({
    name: layerObj.name,
    opacity: layerObj.opacity || 1.0,
    source: new ol.source.ImageWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.name,
        VERSION: '1.3.0',
        TRANSPARENT: true
      }
    }),
    visible:layerObj.visible
  });
  this.map.addLayer(layer);
  
  return layer;
};

_gis3wlib._layer.prototype.addWMSLayers = function(layerObjArray){
  var self = this;
  layerObjArray.forEach(function(wmsLayerObj){
    self.addWMSLayer(wmsLayerObj);
  })
};

_gis3wlib._layer.prototype.addTiledWMSLayer = function(layerObj){
  var layer = new ol.layer.Tile({
    name: layerObj.name,
    opacity: 1.0,
    source: new ol.source.TileWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.name,
        VERSION: '1.3.0',
        TRANSPARENT: true
      },
      serverType: 'mapserver'
    }),
    visible: layerObj.visible
  });
  this.map.addLayer(layer);
  
  return layer;
};

