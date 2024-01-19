import { GEOMETRY_TYPES } from 'app/constant';

export function getDefaultLayerStyle(geometryType, options = {}) {

  const { color } = options;

  switch (geometryType) {

    // LineString
    case GEOMETRY_TYPES.LINESTRINGZ:
    case GEOMETRY_TYPES.LINESTRINGM:
    case GEOMETRY_TYPES.LINESTRINGZM:
    case GEOMETRY_TYPES.LINESTRING25D:
    case GEOMETRY_TYPES.LINE:
    case GEOMETRY_TYPES.LINEZ:
    case GEOMETRY_TYPES.LINEM:
    case GEOMETRY_TYPES.LINEZM:
    case GEOMETRY_TYPES.LINE25D:
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color, width: 3 }),
      });

    // MultiLineString
    case GEOMETRY_TYPES.MULTILINESTRINGZ:
    case GEOMETRY_TYPES.MULTILINESTRINGM:
    case GEOMETRY_TYPES.MULTILINESTRINGZM:
    case GEOMETRY_TYPES.MULTILINESTRING25D:
    case GEOMETRY_TYPES.MULTILINE:
    case GEOMETRY_TYPES.MULTILINEZ:
    case GEOMETRY_TYPES.MULTILINEM:
    case GEOMETRY_TYPES.MULTILINEZM:
    case GEOMETRY_TYPES.MULTILINE25D:
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color, width: 3 }),
      });

    // Point
    case GEOMETRY_TYPES.POINTZ:
    case GEOMETRY_TYPES.POINTM:
    case GEOMETRY_TYPES.POINTZM:
    case GEOMETRY_TYPES.POINT25D:
      return new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({ color }),
          stroke: new ol.style.Stroke({ color, width: 1 }),
          radius: 5,
        }),
      });

    // MultiPoint
    case GEOMETRY_TYPES.MULTIPOINTZ:
    case GEOMETRY_TYPES.MULTIPOINTM:
    case GEOMETRY_TYPES.MULTIPOINTZM:
    case GEOMETRY_TYPES.MULTIPOINT25D:
      return new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({ color }),
          stroke: new ol.style.Stroke({ color, width: 1 }),
          radius: 5,
        })
      });

    // Polygon
    case GEOMETRY_TYPES.POLYGONZ:
    case GEOMETRY_TYPES.POLYGONM:
    case GEOMETRY_TYPES.POLYGONZM:
    case GEOMETRY_TYPES.POLYGON25D:
      return new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.5)' }),
        stroke: new ol.style.Stroke({ color, width: 3 }),
      });

    // MultiPolygon
    case GEOMETRY_TYPES.MULTIPOLYGONZ:
    case GEOMETRY_TYPES.MULTIPOLYGONM:
    case GEOMETRY_TYPES.MULTIPOLYGONZM:
    case GEOMETRY_TYPES.MULTIPOLYGON25D:
      return new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.5)' }),
        stroke: new ol.style.Stroke({ color, width: 3 }),
      })
    
    default:
      console.warn('invalid geometry type: ', geometryType);

  }

};