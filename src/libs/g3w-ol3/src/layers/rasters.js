var RasterLayers = {};

RasterLayers.TiledWMSLayer = function(layerObj){
  var layer = new ol.layer.Image({
    name: layerObj.name,
    opacity: layerObj.opacity || 1.0,
    source: new ol.source.TileWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.layers || '',
        VERSION: '1.3.0',
        TRANSPARENT: true
      }
    }),
    visible:layerObj.visible
  });

  return layer;
};

RasterLayers.WMSLayer = function(layerObj){
  var layer = new ol.layer.Image({
    name: layerObj.name,
    opacity: layerObj.opacity || 1.0,
    source: new ol.source.ImageWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.layers || '',
        VERSION: '1.3.0',
        TRANSPARENT: true
      }
    }),
    visible:layerObj.visible
  });
  
  return layer;
};

RasterLayers.TiledWMSLayer = function(layerObj){
  var layer = new ol.layer.Tile({
    name: layerObj.name,
    opacity: 1.0,
    source: new ol.source.TileWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.layers || '',
        VERSION: '1.3.0',
        TRANSPARENT: true
      }
    }),
    visible: layerObj.visible
  });
  
  return layer;
};

module.exports = RasterLayers;

