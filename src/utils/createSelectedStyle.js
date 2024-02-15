/**
 * @param { Object } style 
 * @param style.geometryType
 * @param style.color
 * @param style.fill
 * 
 * @returns { ol.style.Style | null } style 
 */
export function createSelectedStyle({
  geometryType,
  color = 'rgb(255,255,0)',
  fill = true,
} = {}) {
  switch(geometryType) {

    case 'LineString':
    case 'MultiLineString':
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color, width: 4 })
      });

    case 'Point':
    case 'MultiPoint':
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: fill && new ol.style.Fill({ color }),
          stroke: !fill && new ol.style.Stroke({ color, width: 4 }),
        }),
        zIndex: Infinity,
      });

    case 'MultiPolygon':
    case 'Polygon':
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color, width: 4 }),
        fill: fill && new ol.style.Fill({ color: ol.color.asString(ol.color.asArray(color).splice(3,1,0.5)) })
      });

    default:
      console.warn('invalid geometry type', geometryType);
      return null;

  }
}