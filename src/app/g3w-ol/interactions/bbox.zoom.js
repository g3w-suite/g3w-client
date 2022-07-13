_gis3wlib._interaction.prototype.zoomToBox = function () {
  const { map } = this;
  const zoomToBox = new ol.interaction.DragBox({
    condition: ol.events.condition.always,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#f0ad4e',
        width: 5,
      }),
    }),
  });

  map.addInteraction(zoomToBox);
  zoomToBox.key = zoomToBox.on('boxend', (evt) => {
    const polygon = zoomToBox.getGeometry().getExtent();
    map.getView().fit(polygon, map.getSize());
  });

  return zoomToBox;
};

_gis3wlib._interaction.prototype.drawBBox = function (callback) {
  // get callback parameter and call it with bbox as argument
  const { map } = this;
  const selectBBox = new ol.interaction.DragBox({
    condition: ol.events.condition.always,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#f0ad4e',
        width: 5,
      }),
    }),
  });

  map.addInteraction(selectBBox);
  selectBBox.key = selectBBox.on('boxend', (evt) => {
    const polygon = selectBBox.getGeometry().getExtent();
    callback(polygon);
  });

  return selectBBox;
};
