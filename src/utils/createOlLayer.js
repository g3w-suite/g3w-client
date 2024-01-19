import { GEOMETRY_TYPES } from 'app/constant';

const POINTS = [
  GEOMETRY_TYPES.POINT,
  GEOMETRY_TYPES.POINTZ,
  GEOMETRY_TYPES.POINTM,
  GEOMETRY_TYPES.POINTZM,
  GEOMETRY_TYPES.POINT25D,
  GEOMETRY_TYPES.MULTIPOINT,
  GEOMETRY_TYPES.MULTIPOINTZ,
  GEOMETRY_TYPES.MULTIPOINTM,
  GEOMETRY_TYPES.MULTIPOINTZM,
  GEOMETRY_TYPES.MULTIPOINT25D,
];

const LINES = [
  GEOMETRY_TYPES.LINESTRING,
  GEOMETRY_TYPES.LINESTRINGZ,
  GEOMETRY_TYPES.LINESTRINGM,
  GEOMETRY_TYPES.LINESTRINGZM,
  GEOMETRY_TYPES.LINESTRING25D,
  GEOMETRY_TYPES.MULTILINESTRING,
  GEOMETRY_TYPES.MULTILINESTRINGZ,
  GEOMETRY_TYPES.MULTILINESTRINGM,
  GEOMETRY_TYPES.MULTILINESTRINGZM,
  GEOMETRY_TYPES.MULTILINESTRING25D,
  GEOMETRY_TYPES.LINE,
  GEOMETRY_TYPES.LINEZ,
  GEOMETRY_TYPES.LINEM,
  GEOMETRY_TYPES.LINEZM,
  GEOMETRY_TYPES.LINE25D,
  GEOMETRY_TYPES.MULTILINE,
  GEOMETRY_TYPES.MULTILINEZ,
  GEOMETRY_TYPES.MULTILINEM,
  GEOMETRY_TYPES.MULTILINEZM,
  GEOMETRY_TYPES.MULTILINE25D,
];

const POLYGONS = [
  GEOMETRY_TYPES.POLYGON,
  GEOMETRY_TYPES.POLYGONZ,
  GEOMETRY_TYPES.POLYGONM,
  GEOMETRY_TYPES.POLYGONZM,
  GEOMETRY_TYPES.POLYGON25D,
  GEOMETRY_TYPES.MULTIPOLYGON,
  GEOMETRY_TYPES.MULTIPOLYGONZ,
  GEOMETRY_TYPES.MULTIPOLYGONM,
  GEOMETRY_TYPES.MULTIPOLYGONZM,
  GEOMETRY_TYPES.MULTIPOLYGON25D,
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
}