/* VECTOR LAYERS */
_gis3wlib._layer.prototype.buildvectorLayer = function (vectorOpts) {
  return vectorLayer;
};

_gis3wlib._layer.prototype.addVectorLayer = function (layerObj) {
  const layer = new ol.layer.vector({
    name: layerObj.name,
    source: layerObj.source,
  });
  this.map.addLayer(layer);
  return layer;
};

_gis3wlib._layer.prototype.addVectorLayers = function (layerObjArray) {
  layerObjArray.forEach((vectorLayerObj) => {
    this.addVectorLayer(vectorLayerObj);
  });
};
