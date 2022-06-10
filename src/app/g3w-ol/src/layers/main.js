

/* GET LAYER BY NAME */
_gis3wlib._layer.prototype.addLayer = function(type,layerObj) {
  const layer = this.buildLayer(type,layerObj);
  this.map.addLayer(layer);
};

_gis3wlib._layer.prototype.buildLayer = function(type,layerObj) {
  /* type:
    'base' : baseMap Layer;
    'vector': Vector Layer;
    'raster': raster Layer;
  */
  const layer = this['build'+type+'Layer'](layerObj);
  return layer;
};

_gis3wlib._layer.prototype.getLayerByName = function(layer_name) {
  const layers = this.map.getLayers();
  const length = layers.getLength();
  for (let i = 0; i < length; i++) {
    if (layer_name === layers.item(i).get('name')) {
      return layers.item(i);
    }
  }
  return null;
};

/* REMOVE NAME BY NAME */
_gis3wlib._layer.prototype.removeLayerByName = function(layer_name) {
  const layer = this.getLayerByName(layer_name);
  if (layer) {
    this.map.removeLayer(layer);
  }
};

_gis3wlib._layer.prototype.getActiveLayers = function() {
  const activelayers = [];
  this.map.getLayers().forEach((layer) => {
    const props = layer.getProperties();
    if (props.basemap != true && props.visible) {
       activelayers.push(layer);
    }
  });
  
  return activelayers;
};

_gis3wlib._layer.prototype.getLayersNoBase = function() {
  const layers = [];
  this.map.getLayers().forEach((layer) => {
    const props = layer.getProperties();
    if (props.basemap != true) {
      layers.push(layer);
    }
  });
  
  return layers;
}
