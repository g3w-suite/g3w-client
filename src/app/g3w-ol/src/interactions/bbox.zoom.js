import {Style, Stroke} from "ol/style";
import {always} from "ol/events/condition";
import { DragBox} from "ol/interaction";

_gis3wlib._interaction.prototype.zoomToBox = function() {
  const map = this.map;
  const zoomToBox = new DragBox({
    condition: always,
    style: new Style({
      stroke: new Stroke({
        color: '#f0ad4e',
        width: 5
      })
    })
  });

  map.addInteraction(zoomToBox);
  zoomToBox.key = zoomToBox.on('boxend', evt => {
    const polygon = zoomToBox.getGeometry().getExtent();
    map.getView().fit(polygon, map.getSize());
  });
  
  return zoomToBox;
};

_gis3wlib._interaction.prototype.drawBBox = function(callback) {
  //get callback parameter and call it with bbox as argument
  const map = this.map;
  const selectBBox = new DragBox({
    condition: always,
    style: new Style({
      stroke: new Stroke({
        color: '#f0ad4e',
        width: 5
      })
    })
  });

  map.addInteraction(selectBBox);
  selectBBox.key = selectBBox.on('boxend', evt => {
    const polygon = selectBBox.getGeometry().getExtent();
    callback(polygon);
  });
  
  return selectBBox;
};
