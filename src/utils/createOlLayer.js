import { getAllPointGeometryTypes }   from "utils/getAllPointGeometryTypes";
import { getAllLineGeometryTypes }    from "utils/getAllLineGeometryTypes";
import { getAllPolygonGeometryTypes } from "utils/getAllPolygonGeometryTypes";

/**
 * @param { Object } layer options
 * @param layer.id
 * @param layer.features
 * @param layer.geometryType
 * @param layer.color
 * @param layer.style
 * @param layer.source
 * 
 * @returns { ol.layer.Vector } ol layer 
 */
export function createOlLayer(layer = {}) {
  const color    = layer.color;
  let style      = layer.style;

  // create ol layer to add to map
  const olSource = layer.source || new ol.source.Vector({ features: layer.features || new ol.Collection() });
  const olLayer  = new ol.layer.Vector({ id: layer.id, source: olSource });

  if (!style && getAllPointGeometryTypes().includes(layer.geometryType)) {
    style = new ol.style.Style({
      image: new ol.style.Circle({
        fill:   new ol.style.Fill({ color }),
        radius: 5,
      }),
    });
  }

  if (!style && getAllLineGeometryTypes().includes(layer.geometryType)) {
    style = new ol.style.Style({
      stroke: new ol.style.Stroke({ color, width: 3 })
    });
  }

  if (!style && getAllPolygonGeometryTypes().includes(layer.geometryType)) {
    style =  new ol.style.Style({
      stroke: new ol.style.Stroke({ color: '#000000', width: 1 }),
      fill:   new ol.style.Fill({ color }),
    });
    olLayer.setOpacity(0.6);
  }

  olLayer.setStyle(style);
  return olLayer;
}