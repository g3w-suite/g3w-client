import ApplicationState from "../../..core/applicationstate";
import Geometry  from 'core/geometry/geometry';
import {Vector as VectorLayer} from "ol/layer";
import {Vector as VectorSource} from "ol/source";
import {Feature} from "ol";
import {Polygon, MultiPolygon, MultiLineString, LineString} from "ol/geom";
import Units from "ol/proj/Units";
import {sphere} from 'ol/sphere';
import {Overlay} from "ol";
import {unByKey} from "ol/Observable";

const INCHES_PER_UNIT = {
  m: 39.37, //
  degrees: 4374754
};

//const DOTS_PER_INCH = ol.has.DEVICE_PIXEL_RATIO * 96; //DPI96
const DOTS_PER_INCH = 96; //DPI96

export function getExtentForViewAndSize(center, resolution, rotation, size) {
  const dx = resolution * size[0] / 2;
  const dy = resolution * size[1] / 2;
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);
  const xCos = dx * cosRotation;
  const xSin = dx * sinRotation;
  const yCos = dy * cosRotation;
  const ySin = dy * sinRotation;
  const x = center[0];
  const y = center[1];
  const x0 = x - xCos + ySin;
  const x1 = x - xCos - ySin;
  const x2 = x + xCos - ySin;
  const x3 = x + xCos + ySin;
  const y0 = y - xSin - yCos;
  const y1 = y - xSin + yCos;
  const y2 = y + xSin + yCos;
  const y3 = y + xSin - yCos;
  return [Math.min(x0, x1, x2, x3), Math.min(y0, y1, y2, y3), Math.max(x0, x1, x2, x3), Math.max(y0, y1, y2, y3)]
};
export function createPolygonLayerFromBBox(bbox) {
  const polygonFeature = new Feature(new Polygon.fromExtent(bbox));
  const vectorSource = new VectorSource({
    features: [polygonFeature]
  });
  const polygonLayer = new VectorLayer({
    source: vectorSource
  });
  return polygonLayer;
};
export function reverseGeometry(geometry) {
  const reverseCoordinates = coordinates => {
    coordinates.find(coordinate => {
      if (Array.isArray(coordinate)) {
        reverseCoordinates(coordinate)
      } else {
        const [y, x] = coordinates;
        coordinates[0] = x;
        coordinates[1] = y;
        return true
      }
    })
  };
  let coordinates = geometry.getCoordinates();
  reverseCoordinates(coordinates);
  geometry.setCoordinates(coordinates);
  return geometry
};
export function getScaleFromResolution(resolution, units="m") {
  return Math.round(resolution * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
};
export function getResolutionFromScale(scale, units="m") {
  const normScale = (scale >= 1.0) ? (1.0 / scale) : scale; // just to prevent that scale is passed as 1:10000 or 0.0001
  return  1 / (normScale * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
};
export function getDPI() {
  return DOTS_PER_INCH;
};
export function getMetersFromDegrees(degrees) {
  return degrees * Units.METERS_PER_UNIT.degrees;
};
export function needUseSphereMethods(projection){
  return projection.getCode() === 'EPSG:3857' || projection.getUnits() === 'degrees';
};
export function getLengthMessageText({unit, projection, geometry}={}){
  const geometryType = geometry.getType();
  const useSphereMethods = this.needUseSphereMethods(projection);
  const length = useSphereMethods ? sphere.getLength(geometry, {
    projection: projection.getCode()
  }) : Geometry.isMultiGeometry(geometryType) ?
    geometry.getLineStrings().reduce((totalLength, lineGeometry)=>  totalLength+= lineGeometry.getLength(), 0)
    : geometry.getLength();
  let message;
  switch(unit) {
    case 'nautical':
      message = `${this.transformMeterLength(length, unit)} nm`;
      break;
    case 'metric':
    default:
      message = (length > 1000) ? `${(Math.round(length / 1000 * 100) / 100).toFixed(3)} km` : `${(Math.round(length * 100) / 100).toFixed(2)} m`;
  }
  return message;
};
export function getAreaMessageText({unit, geometry, projection, segments=[]}){
  const useSphereMethods = this.needUseSphereMethods(projection);
  const area =  Math.round(useSphereMethods ? sphere.getArea(geometry, {
    projection: projection.getCode()
  }): geometry.getArea());
  let message;
  let segments_info_meausure = '';
  const segmentLength = segments.length;
  if (segmentLength > 2) {
    segments_info_meausure+=`${this.getLengthMessageText({
      unit,
      projection,
      geometry: new LineString([segments[segmentLength-3], segments[segmentLength-2]])
    })} <br>`;
  }
  switch (unit) {
    case 'nautical':
      message = `${this.transformMeterArea(area, unit)}  nmi²`;
      break;
    case 'metric':
    default:
      message = area > 1000000 ? `${(Math.round(area / 1000000 * 100) / 100).toFixed(6)} km<sup>2</sup>` : `${(Math.round(area * 100) / 100).toFixed(3)} m<sup>2</sup>`;
  }
  if (segments_info_meausure)
    message =`Area: ${message} <br><div style="width: 100%; padding: 3px; border-bottom: 2px solid #ffffff"></div> ${segments_info_meausure}`;
  return message;
};
export function formatMeasure({geometry, projection}={}, options={}){
  const geometryType = geometry.getType();
  const unit = this.getCurrentMapUnit();
  if (Geometry.isLineGeometryType(geometryType)) {
    return this.getLengthMessageText({
      unit,
      projection,
      geometry
    });
  } else if (Geometry.isPolygonGeometryType(geometryType)){
    const segments = geometry.getLinearRing().getCoordinates();
    return this.getAreaMessageText({unit, geometry, projection, segments});
  }
};
export function createMeasureTooltip({map, feature}={}, options={}){
  const element = document.createElement('div');
  element.className = 'mtooltip mtooltip-measure';
  const tooltip = new Overlay({
    element,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  map.addOverlay(tooltip);
  const unbyKey = feature.getGeometry().on('change', evt => {
    let tooltipCoord;
    const geometry = evt.target;
    if (geometry instanceof Polygon) tooltipCoord = geometry.getInteriorPoint().getCoordinates();
    else if(geometry instanceof MultiPolygon) tooltipCoord = geometry.getInteriorPoints().getCoordinates()[0];
    else if (geometry instanceof LineString) tooltipCoord = geometry.getLastCoordinate();
    else if (geometry instanceof MultiLineString) tooltipCoord = geometry.getLastCoordinate();
    const output = formatMeasure({
        geometry,
        projection: map.getView().getProjection()
      },
      options
    );
    element.innerHTML = output;
    tooltip.setPosition(tooltipCoord);
  });

  return {
    tooltip,
    unbyKey
  }
};
export function getCurrentMapUnit(){
  return ApplicationState.map.unit;
};
/**
 * Method to transform length meter in a specific unti (ex.nautilcal mile)
 * @param length
 * @param tounit
 * @returns {null}
 */
export function transformMeterLength(length, tounit){
  switch (tounit) {
    case 'nautical':
      length = length * 0.0005399568;
      break;
  }
  return length
};

export function transformMeterArea(area, tounit){
  switch (tounit) {
    case 'nautical':
      area = area * 0.000000291553349598122862913947445759414840765222583489217190918463024037990567;
      break;
  }
  return area;
};

export function removeMeasureTooltip({map, tooltip, unbyKey}){
  map.removeOverlay(tooltip);
  unByKey(unbyKey);
};

export function setMeasureTooltipStatic(tooltip){
  const element = tooltip.getElement();
  element.className = 'mtooltip mtooltip-static';
  tooltip.setOffset([0, -7]);
};

export const utils = {
  getExtentForViewAndSize,
  // function that create a polygon vector layer from bbox
  createPolygonLayerFromBBox,
  reverseGeometry,
  getScaleFromResolution,
  getResolutionFromScale,
  getDPI,
  getMetersFromDegrees,
  needUseSphereMethods,
  getLengthMessageText,
  getAreaMessageText,
  formatMeasure,
  //create and add measure tooltip
  createMeasureTooltip,
  getCurrentMapUnit,
  transformMeterLength,
  transformMeterArea,
//remove mesure tootltip
  removeMeasureTooltip,
  setMeasureTooltipStatic
};

export default utils;
