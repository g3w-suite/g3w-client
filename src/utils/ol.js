/**
 * @FIXME remove weird import (utility functions should be stateles)
 */
import ApplicationState from 'store/application-state';

/**
 * @FIXME circular dependency (ie. empty object when importing at top level), ref: #130
 */
// const { Geometry } = require('utils/geo');

const INCHES_PER_UNIT = {
  m: 39.37, //
  degrees: 4374754
};

//const DOTS_PER_INCH = ol.has.DEVICE_PIXEL_RATIO * 96; //DPI96
const DOTS_PER_INCH = 96; //DPI96

const utils = {
    merge(obj1,obj2){
      const obj3 = {
        ...obj1,
        ...obj2
      };
      return obj3;
    },

    getExtentForViewAndSize(center, resolution, rotation, size) {
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
      //return [Math.min(y0, y1, y2, y3),Math.min(x0, x1, x2, x3), Math.max(y0, y1, y2, y3), Math.max(x0, x1, x2, x3)]
      return [Math.min(x0, x1, x2, x3), Math.min(y0, y1, y2, y3), Math.max(x0, x1, x2, x3), Math.max(y0, y1, y2, y3)]
    },
    // function that create a polygon vector layer from bbox
    createPolygonLayerFromBBox(bbox) {
      const polygonFeature = new ol.Feature(new ol.geom.Polygon.fromExtent(bbox));
      const vectorSource = new ol.source.Vector({
        features: [polygonFeature]
      });
      const polygonLayer = new ol.layer.Vector({
        source: vectorSource
      });
      return polygonLayer;
    },
    reverseGeometry(geometry) {
      const reverseCoordinates = (coordinates) => {
        coordinates.find((coordinate) => {
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
    },
    getScaleFromResolution(resolution, units="m") {
      return Math.round(resolution * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
    },
    getResolutionFromScale(scale, units="m") {
      const normScale = (scale >= 1.0) ? (1.0 / scale) : scale; // just to prevent that scale is passed as 1:10000 or 0.0001
      return  1 / (normScale * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
    },
    getDPI() {
      return DOTS_PER_INCH;
    },
    getMetersFromDegrees(degrees) {
      return degrees * ol.proj.Units.METERS_PER_UNIT.degrees;
    },
    needUseSphereMethods(projection){
      return projection.getCode() === 'EPSG:3857' || projection.getUnits() === 'degrees';
      //return projection.getUnits() === 'degrees';
    },
    getLengthMessageText({unit, projection, geometry}={}){
      /**
       * @FIXME circular dependency (ie. empty object when importing at top level), ref: #130
       */
      const { Geometry } = require('utils/geo');
      //
      const geometryType = geometry.getType();
      const useSphereMethods = this.needUseSphereMethods(projection);
      const length = useSphereMethods ? ol.sphere.getLength(geometry, {
        projection: projection.getCode()
      }) : Geometry.isMultiGeometry(geometryType) ?
        geometry.getLineStrings().reduce((totalLength, lineGeometry) => totalLength+= lineGeometry.getLength(), 0)
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
    },
    getAreaMessageText({unit, geometry, projection, segments=[]}){
      const useSphereMethods = this.needUseSphereMethods(projection);
      const area =  Math.round(useSphereMethods ? ol.sphere.getArea(geometry, {
        projection: projection.getCode()
      }): geometry.getArea());
      let message;
      let segments_info_meausure = '';
      const segmentLength = segments.length;
      if (segmentLength > 2) {
        segments_info_meausure+=`${this.getLengthMessageText({
          unit, 
          projection,
          geometry: new ol.geom.LineString(segments)
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
    },
    formatMeasure({geometry, projection}={}, options={}){
      /**
       * @FIXME circular dependency (ie. empty object when importing at top level), ref: #130
       */
      const { Geometry, multiGeometryToSingleGeometries } = require('utils/geo');
      //
      const geometryType = geometry.getType();
      const unit = this.getCurrentMapUnit();
      if (Geometry.isLineGeometryType(geometryType)) {
        return this.getLengthMessageText({
          unit,
          projection,
          geometry
        });
      } else if (Geometry.isPolygonGeometryType(geometryType)){
        let segments;
        if (Geometry.isMultiGeometry(geometryType)) {
          segments = [];
          multiGeometryToSingleGeometries(geometry).forEach(geometry => {
            geometry.getLinearRing().getCoordinates().forEach(coordinates => segments.push(coordinates))
          })
        } else segments = geometry.getLinearRing().getCoordinates();
        return this.getAreaMessageText({unit, geometry, projection, segments});
      }
    },
  
    //create and add measure tooltip
    createMeasureTooltip({map, feature}={}, options={}){
      const element = document.createElement('div');
      element.className = 'mtooltip mtooltip-measure';
      const tooltip = new ol.Overlay({
        element,
        offset: [0, -15],
        positioning: 'bottom-center'
      });
      map.addOverlay(tooltip);
      const unbyKey = feature.getGeometry().on('change', evt => {
        let tooltipCoord;
        const geometry = evt.target;
        if (geometry instanceof ol.geom.Polygon) tooltipCoord = geometry.getInteriorPoint().getCoordinates();
        else if(geometry instanceof ol.geom.MultiPolygon) tooltipCoord = geometry.getInteriorPoints().getCoordinates()[0];
        else if (geometry instanceof ol.geom.LineString) tooltipCoord = geometry.getLastCoordinate();
        else if (geometry instanceof ol.geom.MultiLineString) tooltipCoord = geometry.getLastCoordinate();
        const output = utils.formatMeasure({
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
    },
    /**
     * @FIXME utility functions should be stateles (move it elsewhere)
     */
    getCurrentMapUnit(){
      return ApplicationState.map.unit;
    },
  
    /**
     * Method to transform length meter in a specific unti (ex.nautilcal mile)
     * @param length
     * @param tounit
     * @returns {null}
     */
   transformMeterLength(length, tounit){
      switch (tounit) {
        case 'nautical':
          length = length * 0.0005399568;
          break;
      }
      return length
    },
    transformMeterArea(area, tounit){
      switch (tounit) {
        case 'nautical':
          area = area * 0.000000291553349598122862913947445759414840765222583489217190918463024037990567;
          break;
      }
      return area;
    },
  
  //remove mesure tootltip
    removeMeasureTooltip({map, tooltip, unbyKey}){
      map.removeOverlay(tooltip);
      ol.Observable.unByKey(unbyKey);
    },
  
    setMeasureTooltipStatic(tooltip){
      const element = tooltip.getElement();
      element.className = 'mtooltip mtooltip-static';
      tooltip.setOffset([0, -7]);
    }
};

module.exports = utils;
