import { GEOMETRY_TYPES }        from 'g3w-constants';
import { isPointGeometryType }   from "./isPointGeometryType";
import { isLineGeometryType }    from "./isLineGeometryType";
import { isPolygonGeometryType } from "./isPolygonGeometryType";

export function getDefaultLayerStyle(geometryType, options = {}) {

  const { color } = options;

  //Point geometry type
  if (isPointGeometryType(geometryType)) {
    return new ol.style.Style({
      image: new ol.style.Circle({
        fill: new ol.style.Fill({ color }),
        stroke: new ol.style.Stroke({ color, width: 1 }),
        radius: 5,
      })
    });
  }

  //Line geometry type
  if (isLineGeometryType(geometryType)) {
    return new ol.style.Style({
      stroke: new ol.style.Stroke({ color, width: 3 }),
    });
  }

  //Polygon geometry type
  if (isPolygonGeometryType(geometryType)) {
    return new ol.style.Style({
      fill:   new ol.style.Fill({ color: 'rgba(255,255,255,0.5)' }),
      stroke: new ol.style.Stroke({ color, width: 3 }),
    })
  }

  console.warn('invalid geometry type: ', geometryType);

}