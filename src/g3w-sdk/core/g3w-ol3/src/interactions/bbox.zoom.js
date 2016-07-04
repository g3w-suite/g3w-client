_gis3wlib._interaction.prototype.zoomToBox = function(){
  var map = this.map;
  var zoomToBox = new ol.interaction.DragBox({
    condition: ol.events.condition.always,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#f0ad4e',
        width: 5
      })
    })
  });

  map.addInteraction(zoomToBox);
  zoomToBox.key = zoomToBox.on('boxend', function(e){
    var polygon = zoomToBox.getGeometry().getExtent();
    map.getView().fit(polygon, map.getSize());
  });
  
  return zoomToBox;
};

_gis3wlib._interaction.prototype.drawBBox = function(callback){
  //prende come parametro una funzione a cui passa il bbox del rettangolo disegnato //
  var map = this.map;
  var selectBBox = new ol.interaction.DragBox({
    condition: ol.events.condition.always,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#f0ad4e',
        width: 5
      })
    })
  });

  map.addInteraction(selectBBox);
  selectBBox.key = selectBBox.on('boxend', function(e){
    var polygon = selectBBox.getGeometry().getExtent();
    callback(polygon);
  })
  
  return selectBBox;
};
