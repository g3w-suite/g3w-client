import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

export function getDefaultLayerStyle(geometryType, options = {}) {

  const { color } = options;

  switch (geometryType) {

    // LineString
    case GeometryTypes.LINESTRINGZ:
    case GeometryTypes.LINESTRINGM:
    case GeometryTypes.LINESTRINGZM:
    case GeometryTypes.LINESTRING25D:
    case GeometryTypes.LINE:
    case GeometryTypes.LINEZ:
    case GeometryTypes.LINEM:
    case GeometryTypes.LINEZM:
    case GeometryTypes.LINE25D:
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color, width: 3 }),
      });

    // MultiLineString
    case GeometryTypes.MULTILINESTRINGZ:
    case GeometryTypes.MULTILINESTRINGM:
    case GeometryTypes.MULTILINESTRINGZM:
    case GeometryTypes.MULTILINESTRING25D:
    case GeometryTypes.MULTILINE:
    case GeometryTypes.MULTILINEZ:
    case GeometryTypes.MULTILINEM:
    case GeometryTypes.MULTILINEZM:
    case GeometryTypes.MULTILINE25D:
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color, width: 3 }),
      });

    // Point
    case GeometryTypes.POINTZ:
    case GeometryTypes.POINTM:
    case GeometryTypes.POINTZM:
    case GeometryTypes.POINT25D:
      return new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({ color }),
          stroke: new ol.style.Stroke({ color, width: 1 }),
          radius: 5,
        }),
      });

    // MultiPoint
    case GeometryTypes.MULTIPOINTZ:
    case GeometryTypes.MULTIPOINTM:
    case GeometryTypes.MULTIPOINTZM:
    case GeometryTypes.MULTIPOINT25D:
      return new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({ color }),
          stroke: new ol.style.Stroke({ color, width: 1 }),
          radius: 5,
        })
      });

    // Polygon
    case GeometryTypes.POLYGONZ:
    case GeometryTypes.POLYGONM:
    case GeometryTypes.POLYGONZM:
    case GeometryTypes.POLYGON25D:
      return new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.5)' }),
        stroke: new ol.style.Stroke({ color, width: 3 }),
      });

    // MultiPolygon
    case GeometryTypes.MULTIPOLYGONZ:
    case GeometryTypes.MULTIPOLYGONM:
    case GeometryTypes.MULTIPOLYGONZM:
    case GeometryTypes.MULTIPOLYGON25D:
      return new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.5)' }),
        stroke: new ol.style.Stroke({ color, width: 3 }),
      })
    
    default:
      console.warn('invalid geometry type: ', geometryType);

  }

};