import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

const POINTS = [
  GeometryTypes.POINT,
  GeometryTypes.POINTZ,
  GeometryTypes.POINTM,
  GeometryTypes.POINTZM,
  GeometryTypes.POINT25D,
  GeometryTypes.MULTIPOINT,
  GeometryTypes.MULTIPOINTZ,
  GeometryTypes.MULTIPOINTM,
  GeometryTypes.MULTIPOINTZM,
  GeometryTypes.MULTIPOINT25D,
];

const LINES = [
  GeometryTypes.LINESTRING,
  GeometryTypes.LINESTRINGZ,
  GeometryTypes.LINESTRINGM,
  GeometryTypes.LINESTRINGZM,
  GeometryTypes.LINESTRING25D,
  GeometryTypes.MULTILINESTRING,
  GeometryTypes.MULTILINESTRINGZ,
  GeometryTypes.MULTILINESTRINGM,
  GeometryTypes.MULTILINESTRINGZM,
  GeometryTypes.MULTILINESTRING25D,
  GeometryTypes.LINE,
  GeometryTypes.LINEZ,
  GeometryTypes.LINEM,
  GeometryTypes.LINEZM,
  GeometryTypes.LINE25D,
  GeometryTypes.MULTILINE,
  GeometryTypes.MULTILINEZ,
  GeometryTypes.MULTILINEM,
  GeometryTypes.MULTILINEZM,
  GeometryTypes.MULTILINE25D,
];

const POLYGONS = [
  GeometryTypes.POLYGON,
  GeometryTypes.POLYGONZ,
  GeometryTypes.POLYGONM,
  GeometryTypes.POLYGONZM,
  GeometryTypes.POLYGON25D,
  GeometryTypes.MULTIPOLYGON,
  GeometryTypes.MULTIPOLYGONZ,
  GeometryTypes.MULTIPOLYGONM,
  GeometryTypes.MULTIPOLYGONZM,
  GeometryTypes.MULTIPOLYGON25D,
];

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

  if (!style && POINTS.includes(layer.geometryType)) {
    style = new ol.style.Style({
      image: new ol.style.Circle({
        fill: new ol.style.Fill({ color }),
        radius: 5,
      }),
    });
  }

  if (!style && LINES.includes(layer.geometryType)) {
    style = new ol.style.Style({
      stroke: new ol.style.Stroke({ color, width: 3 })
    });
  }

  if (!style && POLYGONS.includes(layer.geometryType)) {
    style =  new ol.style.Style({
      stroke: new ol.style.Stroke({ color: '#000000', width: 1 }),
      fill: new ol.style.Fill({ color }),
    });
    olLayer.setOpacity(0.6);
  }

  olLayer.setStyle(style);
  return olLayer;
};