/**
 * @file ORIGINAL SOURCE: src/app/core/utils/geo.js@3.8
 * 
 * @since 3.9.0
 */

import CONSTANT                    from 'app/constant';
import { getMapLayerById }         from 'utils/getMapLayerById';
import { getMapLayersByFilter }    from 'utils/getMapLayersByFilter';
import { toRawType }               from 'utils/toRawType';
import {
  getUniqueDomId as uniqueId
}                                  from 'utils/getUniqueDomId';
import { get_legend_params }       from 'utils/get_legend_params';
import GUI                         from 'services/gui';

const WMSLayer                     = require('core/layers/map/wmslayer');
const Filter                       = require('core/layers/filter/filter');
const { response: responseParser } = require('utils/parsers');

const geometryFields               = CONSTANT.GEOMETRY_FIELDS;
const {
  QUERY_POINT_TOLERANCE,
  G3W_FID,
  GEOMETRY_TYPES: GeometryTypes
}                                  = CONSTANT;

const Geometry = {

  /**
   * core/geometry/geometry::GeometryTypes@v3.4
   */
   GeometryTypes,

  /**
   * Remove Z values from geometry coordinates
   */
   removeZValueToOLFeatureGeometry({feature}={}) {
    const geometry = feature.getGeometry();
    if (geometry) {
      const geometryType = geometry.getType();
      const originalFeatureCoordinates = geometry.getCoordinates();
      switch (geometryType) {
        // POINT: [x, y]
        case GeometryTypes.POINT:
          if (originalFeatureCoordinates.length === 3) {
            originalFeatureCoordinates.splice(2);
            feature.getGeometry().setCoordinates(originalFeatureCoordinates);
          }
          break;
        // MULTIPOINT: [ [x1, y1], [x2, y2] ]
        case GeometryTypes.MULTIPOINT:
        // LINE: [ [x1, y1], [x2, y2] ]
        case GeometryTypes.LINESTRING:
        case GeometryTypes.LINE:
          originalFeatureCoordinates.forEach(coordinates => coordinates.splice(2));
          feature.getGeometry().setCoordinates(originalFeatureCoordinates);
          break;
        // MULTILINE: [
        //   [ [x1, y1], [x2, y2] ],
        //   [ [x3, y3], [x4, y4] ]
        // ]
        case GeometryTypes.MULTILINESTRING:
        case GeometryTypes.MULTILINE:
          originalFeatureCoordinates.forEach(singleLine => {
            singleLine.forEach(coordinates => coordinates.splice(2))
          });
          feature.getGeometry().setCoordinates(originalFeatureCoordinates);
          break;
        // POLYGON: [
        //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ]
        // ]
        case GeometryTypes.POLYGON:
          originalFeatureCoordinates[0].forEach(coordinates => coordinates.splice(2));
          feature.getGeometry().setCoordinates(originalFeatureCoordinates);
          break;
        // MULTIPOLYGON:[
        //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ],
        //   [ [xa, ya], [xb, yb], [xc, yc], [xa, ya] ]
        // ]
        case GeometryTypes.MULTIPOLYGON:
          originalFeatureCoordinates.forEach(singlePolygon => {
            singlePolygon[0].forEach(coordinates => coordinates.splice(2))
          });
          feature.getGeometry().setCoordinates(originalFeatureCoordinates);
          break;
      }
    }

    return feature;
  },

   /**
    * core/geometry/geometry::addZValueToOLFeatureGeometry@v3.4
    */
   addZValueToOLFeatureGeometry({
    feature,
    geometryType,
  } = {}) {
     if (!Geometry.is3DGeometry(geometryType)) {
      console.warn('Invalid 3D Geometry Type:', geometryType);
      return feature;
     }
     const geometry = feature.getGeometry();
     geometryType = geometryType || geometry.getType();
     const originalFeatureCoordinates = geometry.getCoordinates();
     switch (geometryType) {
       // POINT: [x, y]
       case GeometryTypes.POINTZ:
       case GeometryTypes.POINTM:
       case GeometryTypes.POINTZM:
       case GeometryTypes.POINT25D:
         originalFeatureCoordinates.push(0);
         feature.getGeometry().setCoordinates(originalFeatureCoordinates);
         break;
       // MULTIPOINT: [ [x1, y1], [x2, y2] ]
       case GeometryTypes.MULTIPOINTZ:
       case GeometryTypes.MULTIPOINTM:
       case GeometryTypes.MULTIPOINTZM:
       case GeometryTypes.MULTIPOINT25D:
       // LINE: [ [x1, y1], [x2, y2] ]
       case GeometryTypes.LINESTRINGZ:
       case GeometryTypes.LINESTRINGM:
       case GeometryTypes.LINESTRINGZM:
       case GeometryTypes.LINESTRING25D:
       case GeometryTypes.LINEZ:
       case GeometryTypes.LINEM:
       case GeometryTypes.LINEZM:
       case GeometryTypes.LINE25D:
         originalFeatureCoordinates.forEach(coordinates => coordinates.push(0));
         feature.getGeometry().setCoordinates(originalFeatureCoordinates);
         break;
       // MULTILINE: [
       //   [ [x1, y1], [x2, y2] ],
       //   [ [x3, y3], [x4, y4] ]
       // ]
       case GeometryTypes.MULTILINESTRINGZ:
       case GeometryTypes.MULTILINESTRINGM:
       case GeometryTypes.MULTILINESTRINGZM:
       case GeometryTypes.MULTILINESTRING25D:
       case GeometryTypes.MULTILINEZ:
       case GeometryTypes.MULTILINEM:
       case GeometryTypes.MULTILINEZM:
       case GeometryTypes.MULTILINE25D:
         originalFeatureCoordinates.forEach(singleLine => {
           singleLine.forEach(coordinates => coordinates.push(0))
         });
         feature.getGeometry().setCoordinates(originalFeatureCoordinates);
         break;
       // POLYGON: [
       //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ]
       // ]
       case GeometryTypes.POLYGONZ:
       case GeometryTypes.POLYGONM:
       case GeometryTypes.POLYGONZM:
       case GeometryTypes.POLYGON25D:
         originalFeatureCoordinates[0].forEach(coordinates => coordinates.push(0));
         feature.getGeometry().setCoordinates(originalFeatureCoordinates);
         break;
       // MULTIPOLYGON:[
       //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ],
       //   [ [xa, ya], [xb, yb], [xc, yc], [xa, ya] ]
       // ]
       case GeometryTypes.MULTIPOLYGONZ:
       case GeometryTypes.MULTIPOLYGONM:
       case GeometryTypes.MULTIPOLYGOZM:
       case GeometryTypes.MULTIPOLYGON25D:
         originalFeatureCoordinates.forEach(singlePolygon => {
           singlePolygon[0].forEach(coordinates => coordinates.push(0))
         });
         feature.getGeometry().setCoordinates(originalFeatureCoordinates);
         break;
     }
     return feature;
   },
 
   /**
    * core/geometry/geometry::getOLGeometry@v3.4
    */
   getOLGeometry(geometryType) {
     switch (geometryType) {
       case GeometryTypes.LINESTRINGZ:
       case GeometryTypes.LINESTRINGM:
       case GeometryTypes.LINESTRINGZM:
       case GeometryTypes.LINESTRING25D:
       case GeometryTypes.LINE:
       case GeometryTypes.LINEZ:
       case GeometryTypes.LINEM:
       case GeometryTypes.LINEZM:
       case GeometryTypes.LINE25D:
         geometryType = 'LineString';
         break;
       case GeometryTypes.MULTILINESTRINGZ:
       case GeometryTypes.MULTILINESTRINGM:
       case GeometryTypes.MULTILINESTRINGZM:
       case GeometryTypes.MULTILINESTRING25D:
       case GeometryTypes.MULTILINE:
       case GeometryTypes.MULTILINEZ:
       case GeometryTypes.MULTILINEM:
       case GeometryTypes.MULTILINEZM:
       case GeometryTypes.MULTILINE25D:
         geometryType = 'MultiLineString';
         break;
       case GeometryTypes.POINTZ:
       case GeometryTypes.POINTM:
       case GeometryTypes.POINTZM:
       case GeometryTypes.POINT25D:
         geometryType = 'Point';
         break;
       case GeometryTypes.MULTIPOINTZ:
       case GeometryTypes.MULTIPOINTM:
       case GeometryTypes.MULTIPOINTZM:
       case GeometryTypes.MULTIPOINT25D:
         geometryType = 'MultiPoint';
         break;
       case GeometryTypes.POLYGONZ:
       case GeometryTypes.POLYGONM:
       case GeometryTypes.POLYGONZM:
       case GeometryTypes.POLYGON25D:
         geometryType = 'Polygon';
         break;
       case GeometryTypes.MULTIPOLYGONZ:
       case GeometryTypes.MULTIPOLYGONM:
       case GeometryTypes.MULTIPOLYGONZM:
       case GeometryTypes.MULTIPOLYGON25D:
         geometryType = 'MultiPolygon';
         break;
     }
     return geometryType;
   },
 
   /**
    * core/geometry/geometry::isMultiGeometry@v3.4
    */
   isMultiGeometry(geometryType) {
     return [
       GeometryTypes.MULTIPOINT,
       GeometryTypes.MULTIPOINTZ,
       GeometryTypes.MULTIPOINTZM,
       GeometryTypes.MULTIPOINTM,
       GeometryTypes.MULTIPOINT25D,
       GeometryTypes.MULTILINESTRING,
       GeometryTypes.MULTILINESTRINGZ,
       GeometryTypes.MULTILINESTRINGM,
       GeometryTypes.MULTILINESTRINGZM,
       GeometryTypes.MULTILINESTRING25D,
       GeometryTypes.MULTILINE,
       GeometryTypes.MULTILINEZ,
       GeometryTypes.MULTILINEM,
       GeometryTypes.MULTILINEZM,
       GeometryTypes.MULTILINE25D,
       GeometryTypes.MULTIPOLYGON,
       GeometryTypes.MULTIPOLYGONZ,
       GeometryTypes.MULTIPOLYGONM,
       GeometryTypes.MULTIPOLYGONZM,
       GeometryTypes.MULTIPOLYGON25D
     ].indexOf(geometryType) !== -1;
   },
 
   /**
    * core/geometry/geometry::getAllPointGeometryTypes@v3.4
    */
   getAllPointGeometryTypes() {
     return [
       GeometryTypes.POINT,
       GeometryTypes.POINTZ,
       GeometryTypes.POINTM,
       GeometryTypes.POINTZM,
       GeometryTypes.POINT25D,
       GeometryTypes.MULTIPOINT,
       GeometryTypes.MULTIPOINTZ,
       GeometryTypes.MULTIPOINTM,
       GeometryTypes.MULTIPOINTZM,
       GeometryTypes.MULTIPOINT25D
     ]
   },
 
   /**
    * core/geometry/geometry::isPointGeometryType@v3.4
    */
   isPointGeometryType(geometryType) {
     return Geometry.getAllPointGeometryTypes().indexOf(geometryType) !== -1;
   },
 
   /**
    * core/geometry/geometry::getAllLineGeometryTypes@v3.4
    */
   getAllLineGeometryTypes() {
     return [
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
       GeometryTypes.MULTILINE25D]
   },
 
   /**
    * core/geometry/geometry::isLineGeometryType@v3.4
    */
   isLineGeometryType(geometryType) {
     return Geometry.getAllLineGeometryTypes().indexOf(geometryType) !== -1;
   },
 
   /**
    * core/geometry/geometry::getAllPolygonGeometryTypes@v3.4
    */
   getAllPolygonGeometryTypes() {
     return [
       GeometryTypes.POLYGON,
       GeometryTypes.POLYGONZ,
       GeometryTypes.POLYGONM,
       GeometryTypes.POLYGONZM,
       GeometryTypes.POLYGON25D,
       GeometryTypes.MULTIPOLYGON,
       GeometryTypes.MULTIPOLYGONZ,
       GeometryTypes.MULTIPOLYGONM,
       GeometryTypes.MULTIPOLYGONZM,
       GeometryTypes.MULTIPOLYGON25D
     ]
   },
 
   /**
    * core/geometry/geometry::isPolygonGeometryType@v3.4
    */
   isPolygonGeometryType(geometryType) {
     return Geometry.getAllPolygonGeometryTypes().indexOf(geometryType) !== -1;
   },

   /**
    * core/geometry/geometry::is3DGeometry@v3.4
    */
   is3DGeometry(geometryType) {
     return [
       GeometryTypes.POINTZ,
       GeometryTypes.POINTM,
       GeometryTypes.POINTZM,
       GeometryTypes.POINT25D,
       GeometryTypes.MULTIPOINTZ,
       GeometryTypes.MULTIPOINTM,
       GeometryTypes.MULTIPOINTZM,
       GeometryTypes.MULTIPOINT25D,
       GeometryTypes.LINESTRINGZ,
       GeometryTypes.LINESTRINGM,
       GeometryTypes.LINESTRINGZM,
       GeometryTypes.LINESTRING25D,
       GeometryTypes.MULTILINESTRINGZ,
       GeometryTypes.MULTILINESTRINGM,
       GeometryTypes.MULTILINESTRINGZM,
       GeometryTypes.MULTILINESTRING25D,
       GeometryTypes.LINEZ,
       GeometryTypes.LINEM,
       GeometryTypes.LINEZM,
       GeometryTypes.LINE25D,
       GeometryTypes.MULTILINEZ,
       GeometryTypes.MULTILINEM,
       GeometryTypes.MULTILINEZM,
       GeometryTypes.MULTILINE25D,
       GeometryTypes.POLYGONZ,
       GeometryTypes.POLYGONM,
       GeometryTypes.POLYGONZM,
       GeometryTypes.POLYGON25D,
       GeometryTypes.MULTIPOLYGONZ,
       GeometryTypes.MULTIPOLYGONM,
       GeometryTypes.MULTIPOLYGONZM,
       GeometryTypes.MULTIPOLYGON25D
     ].find( type3D => type3D === geometryType);
   },
};

const geoutils = {

  geometryFields,

  coordinatesToGeometry(geometryType, coordinates) {
    let geometryClass;
    switch (geometryType) {
      case GeometryTypes.POLYGON:
      case GeometryTypes.POLYGONZ:
      case GeometryTypes.POLYGONM:
      case GeometryTypes.POLYGONZM:
      case GeometryTypes.POLYGON25D:
        geometryClass = ol.geom.Polygon;
        break;
      case GeometryTypes.MULTIPOLYGON:
      case GeometryTypes.MULTIPOLYGONZ:
      case GeometryTypes.MULTIPOLYGONM:
      case GeometryTypes.MULTIPOLYGONZM:
      case GeometryTypes.MULTIPOLYGON25D:
        geometryClass = ol.geom.MultiPolygon;
        break;
      case GeometryTypes.LINESTRING:
      case GeometryTypes.LINESTRINGZ:
      case GeometryTypes.LINESTRINGM:
      case GeometryTypes.LINESTRINGZM:
      case GeometryTypes.LINESTRING25D:
      case GeometryTypes.LINE:
      case GeometryTypes.LINEZ:
      case GeometryTypes.LINEM:
      case GeometryTypes.LINEZM:
      case GeometryTypes.LINE25D:
        geometryClass = ol.geom.LineString;
        break;
      case GeometryTypes.MULTILINE:
      case GeometryTypes.MULTILINEZ:
      case GeometryTypes.MULTILINEM:
      case GeometryTypes.MULTILINEZM:
      case GeometryTypes.MULTILINE25D:
      case GeometryTypes.MULTILINESTRING:
      case GeometryTypes.MULTILINESTRINGZ:
      case GeometryTypes.MULTILINESTRINGM:
      case GeometryTypes.MULTILINESTRINGZM:
      case GeometryTypes.MULTILINESTRING25D:
        geometryClass = ol.geom.MultiLineString;
        break;
      case GeometryTypes.POINT:
      case GeometryTypes.POINTZ:
      case GeometryTypes.POINTM:
      case GeometryTypes.POINTZM:
      case GeometryTypes.POINT25D:
        geometryClass = ol.geom.Point;
        break;
      case GeometryTypes.MULTIPOINT:
      case GeometryTypes.MULTIPOINTZ:
      case GeometryTypes.MULTIPOINTM:
      case GeometryTypes.MULTIPOINTZM:
      case GeometryTypes.MULTIPOINT25D:
        geometryClass = ol.geom.MultiPoint;
        break;
      default:
        geometryClass = ol.geom.Point;
    }
    const geometry = new geometryClass(coordinates);
    return geometry
  },

  getDefaultLayerStyle(geometryType, options={}) {
    const {color} = options;
    switch (geometryType) {
      case GeometryTypes.LINESTRINGZ:
      case GeometryTypes.LINESTRINGM:
      case GeometryTypes.LINESTRINGZM:
      case GeometryTypes.LINESTRING25D:
      case GeometryTypes.LINE:
      case GeometryTypes.LINEZ:
      case GeometryTypes.LINEM:
      case GeometryTypes.LINEZM:
      case GeometryTypes.LINE25D:
        geometryType = 'LineString';
        break;
      case GeometryTypes.MULTILINESTRINGZ:
      case GeometryTypes.MULTILINESTRINGM:
      case GeometryTypes.MULTILINESTRINGZM:
      case GeometryTypes.MULTILINESTRING25D:
      case GeometryTypes.MULTILINE:
      case GeometryTypes.MULTILINEZ:
      case GeometryTypes.MULTILINEM:
      case GeometryTypes.MULTILINEZM:
      case GeometryTypes.MULTILINE25D:
        geometryType = 'MultiLineString';
        break;
      case GeometryTypes.POINTZ:
      case GeometryTypes.POINTM:
      case GeometryTypes.POINTZM:
      case GeometryTypes.POINT25D:
        geometryType = 'Point';
        break;
      case GeometryTypes.MULTIPOINTZ:
      case GeometryTypes.MULTIPOINTM:
      case GeometryTypes.MULTIPOINTZM:
      case GeometryTypes.MULTIPOINT25D:
        geometryType = 'MultiPoint';
        break;
      case GeometryTypes.POLYGONZ:
      case GeometryTypes.POLYGONM:
      case GeometryTypes.POLYGONZM:
      case GeometryTypes.POLYGON25D:
        geometryType = 'Polygon';
        break;
      case GeometryTypes.MULTIPOLYGONZ:
      case GeometryTypes.MULTIPOLYGONM:
      case GeometryTypes.MULTIPOLYGONZM:
      case GeometryTypes.MULTIPOLYGON25D:
        geometryType = 'MultiPolygon';
        break;
    }
    const defaultStyle = {
      'Point': new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color
          }),
          radius: 5,
          stroke: new ol.style.Stroke({
            color,
            width: 1
          })
        })
      }),
      'LineString': new ol.style.Style({
        stroke: new ol.style.Stroke({
          color,
          width: 3
        })
      }),
      'Polygon': new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255,255,255,0.5)'
        }),
        stroke: new ol.style.Stroke({
          color,
          width: 3
        })
      }),
      'MultiPoint': new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color
          }),
          radius: 5,
          stroke: new ol.style.Stroke({
            color,
            width: 1
          })
        })
      }),
      'MultiLineString': new ol.style.Style({
        stroke: new ol.style.Stroke({
          color,
          width: 3
        })
      }),
      'MultiPolygon': new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255,255,255,0.5)'
        }),
        stroke: new ol.style.Stroke({
          color,
          width: 3
        })
      })
    };
    return defaultStyle[geometryType]
  },

  createLayerStyle(styleObj) {
    let style;
    const styles = {};
    if (styleObj) {
      Object.entries(styleObj).forEach(([type, config]) => {
        switch (type) {
          case 'point':
            if (config.icon) {
              styles.image = new ol.style.Icon({
                src: config.icon.url,
                imageSize: config.icon.width
              })
            }
            break;
          case 'line':
            styles.stroke = new ol.style.Stroke({
              color: config.color,
              width: config.width
            });
            break;
          case 'polygon':
            styles.fill = new ol.style.Fill({
              color: config.color
            });
            break
        }
      });
      style = new ol.style.Style(styles);
    }
    return style
  },

  createFeatureFromCoordinates(coordinates) {
    let feature;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const geometry = new ol.geom.Point(coordinates);
      feature = new ol.Feature(geometry);
    }
    return feature;
  },

  createFeatureFromBBOX(bbox) {
    let feature;
    if (Array.isArray(bbox) && bbox.length === 4) {
      const geometry = ol.geom.Polygon.fromExtent(bbox);
      feature = new ol.Feature(geometry)
    }
    return feature;
  },

  createFeatureFromGeometry({id,geometry}={}) {
    if (geometry) {
      const feature = new ol.Feature(geometry);
      feature.setId(id);
      return feature;
    }
  },

  /**
   * in case of feature object
   * {
   *   id: X,
   *   attributes: {key:value}
   *   geometry: geometry
   * }
   * @param id
   * @param feature
   */
  createFeatureFromFeatureObject({id, feature={}}) {
    const {geometry, attributes} = feature;
    feature = geoutils.createFeatureFromGeometry({id,geometry});
    Object.keys(attributes).forEach(attribute => feature.set(attribute, attributes[attribute]));
    return feature;
  },

  createOlLayer(options = {}) {
    const id = options.id;
    const features = options.features;
    const geometryType = options.geometryType;
    const color = options.color;
    let style = options.style;
    // create ol layer to add to map
    const olSource = options.source || new ol.source.Vector({
      features: features || new ol.Collection()
    });
    const olLayer = new ol.layer.Vector({
      id: id,
      source: olSource
    });
    if (!style) {
      switch (geometryType) {
        case GeometryTypes.POINT:
        case GeometryTypes.POINTZ:
        case GeometryTypes.POINTM:
        case GeometryTypes.POINTZM:
        case GeometryTypes.POINT25D:
        case GeometryTypes.MULTIPOINT:
        case GeometryTypes.MULTIPOINTZ:
        case GeometryTypes.MULTIPOINTM:
        case GeometryTypes.MULTIPOINTZM:
        case GeometryTypes.MULTIPOINT25D:
          style = new ol.style.Style({
            image: new ol.style.Circle({
              radius: 5,
              fill: new ol.style.Fill({
                color
              })
            })
          });
          break;
        case GeometryTypes.LINESTRING:
        case GeometryTypes.LINESTRINGZ:
        case GeometryTypes.LINESTRINGM:
        case GeometryTypes.LINESTRINGZM:
        case GeometryTypes.LINESTRING25D:
        case GeometryTypes.MULTILINESTRING:
        case GeometryTypes.MULTILINESTRINGZ:
        case GeometryTypes.MULTILINESTRINGM:
        case GeometryTypes.MULTILINESTRINGZM:
        case GeometryTypes.MULTILINESTRING25D:
        case GeometryTypes.LINE:
        case GeometryTypes.LINEZ:
        case GeometryTypes.LINEM:
        case GeometryTypes.LINEZM:
        case GeometryTypes.LINE25D:
        case GeometryTypes.MULTILINE:
        case GeometryTypes.MULTILINEZ:
        case GeometryTypes.MULTILINEM:
        case GeometryTypes.MULTILINEZM:
        case GeometryTypes.MULTILINE25D:
          style = new ol.style.Style({
            stroke: new ol.style.Stroke({
              width: 3,
              color
            })
          });
          break;
        case GeometryTypes.POLYGON:
        case GeometryTypes.POLYGONZ:
        case GeometryTypes.POLYGONM:
        case GeometryTypes.POLYGONZM:
        case GeometryTypes.POLYGON25D:
        case GeometryTypes.MULTIPOLYGON:
        case GeometryTypes.MULTIPOLYGONZ:
        case GeometryTypes.MULTIPOLYGONM:
        case GeometryTypes.MULTIPOLYGONZM:
        case GeometryTypes.MULTIPOLYGON25D:
          style =  new ol.style.Style({
            stroke: new ol.style.Stroke({
              color:  "#000000",
              width: 1
            }),
            fill: new ol.style.Fill({
              color
            })
          });
          olLayer.setOpacity(0.6);
          break;
      }
    }
    olLayer.setStyle(style);
    return olLayer;
  },

  createWMSLayer({url, name, projection, layers=[]}={}) {
    const id = name || uniqueId();
    name = name || id;
    const wmslayer = new WMSLayer({
      id,
      layers,
      projection,
      url
    });
    const olLayer =  wmslayer.getOLLayer();
    olLayer.set('id', id); // set unique id
    olLayer.set('name', name);
    return {
      wmslayer,
      olLayer
    }
  },

  createVectorLayerFromGeometry(geometry) {
    const feature = new ol.Feature(geometry);
    return geoutils.createVectorLayerFromFeatures(feature);
  },

  createVectorLayerFromFeatures(feature) {
    return new ol.layer.Vector({
      source: new ol.source.Vector({
        features: Array.isArray(feature) ? feature : [feature]
      })
    })
  },

  async createVectorLayerFromFile({
    name,
    type,
    crs,
    mapCrs,
    data,
    style
  } = {}) {

    let format;
    let layer;

    const createVectorLayer = (format, data, epsg = crs) => {
      let vectorLayer;
      const features = format.readFeatures(data, { dataProjection: epsg, featureProjection: mapCrs || epsg });
      if (features.length) {

        // ignore kml property [`<styleUrl>`](https://developers.google.com/kml/documentation/kmlreference)
        if (format instanceof ol.format.KML) {
          features.forEach(feature => feature.unset('styleUrl'));
        }

        const vectorSource = new ol.source.Vector({ features });
        vectorLayer = new ol.layer.Vector({
          source: vectorSource,
          name,
          _fields: Object.keys(features[0].getProperties()).filter(property => geometryFields.indexOf(property) < 0),
          id: uniqueId()
        });
        style && vectorLayer.setStyle(style);
      }
      return vectorLayer;
    };
    switch (type) {
      case 'gpx':
        format = new ol.format.GPX();
        layer = createVectorLayer(format, data);
        break;
      case 'gml':
        format = new ol.format.WMSGetFeatureInfo();
        layer = createVectorLayer(format, data);
        break;
      case 'geojson':
        format = new ol.format.GeoJSON();
        layer = createVectorLayer(format, data);
        break;
      case 'kml':
        format = new ol.format.KML({ extractStyles: false });
        layer = createVectorLayer(format, data,  "EPSG:4326");
        break;
      case 'csv':
        const {headers, separator, values, x, y} = data;
        const features = [];
        const errorrows = [];
        values.forEach((row, index) => {
          const properties = {};
          const rowvalues = row.split(separator);
          if (rowvalues.length === headers.length)  {
            const coordinates = [];
            rowvalues.forEach((value, index) => {
              const field = headers[index];
              if (field === x) coordinates[0] = 1*value;
              if (field === y) coordinates[1] = 1*value;
              properties[field] = value;
            });
            // check if all coordinates is right
            if (coordinates.find(value => Number.isNaN(value)) === undefined) {
              const geometry = new ol.geom.Point(coordinates);
              if (crs !== mapCrs) geometry.transform(crs, mapCrs);
              const feature = new ol.Feature(geometry);
              feature.setId(index); // need to add a id incremental
              feature.setProperties(properties);
              features.push(feature);
            }
          } else errorrows.push({
            row: index + 1,
            value: values[index]
          })
        });
        if (!features.length) return Promise.reject();
        if (errorrows.length) {
          GUI.showUserMessage({
            type: 'warning',
            message: 'sdk.mapcontrols.addlayer.messages.csv.warning',
            hooks: {
              footer: {
                template: `<select v-select2="errorrows[0].value" class="skin-color" :search="false" style="width:100%">
                    <option v-for="errorrow in errorrows" :key="errorrow.row" :value="errorrow.value">[{{ errorrow.row}}] {{errorrow.value}}</option>
                </select>`,
                data() {
                  return {
                    errorrows
                  };
                }
              }
            },
            autoclose: false
          });
        }

        layer = new ol.layer.Vector({
          source: new ol.source.Vector({ features }),
          name,
          _fields: headers,
          id: uniqueId()
        });
        if (style) {
          layer.setStyle(style);
        }
        break;
      case 'kmz':
        const promiseKmz = new Promise(async (resolve, reject) => {
          const zip = new JSZip();
          const buffer = await data.arrayBuffer(data);
          zip.load(buffer);
          const kmlFiles = zip.file(/.kml$/i);
          /**
           * @TODO handle multiple network links
           * 
           * https://github.com/g3w-suite/g3w-client/pull/430/files#r1232092732
           */
          // get last kml file (when doc.kml file has a reference to kml inside another folder)
          const kmlFile = kmlFiles[kmlFiles.length - 1];
          if (kmlFile) {
            data = kmlFile.asText();
            resolve(createVectorLayer(new ol.format.KML({ extractStyles: false }), data, "EPSG:4326"));
          } else {
            reject();
          }
        });
        try {
          return await promiseKmz;
        } catch(err) {
          return Promise.reject();
        }
        break;
      case 'zip':
        const promise = new Promise(async (resolve, reject) => {
          const buffer = await data.arrayBuffer(data);
          shp(buffer).then(geojson => {
            const data = JSON.stringify(geojson);
            format = new ol.format.GeoJSON({});
            resolve(createVectorLayer(format, data, "EPSG:4326"));
          }).catch(err => reject(err))
        });
        try {
          return await promise;
        } catch(err) {
          return Promise.reject();
        }
        break;
    }
    return layer;
  },

  createStyleFunctionToVectorLayer(options={}) {
    const styleFunction = (feature, resolution) => {
      let {color, field} = options;
      color = color.rgba ? 'rgba(' + color.rgba.r + ',' + color.rgba.g + ',' + color.rgba.b + ','  + color.rgba.a + ')': color;
      const geometryType = feature.getGeometry().getType();
      const style = geoutils.getDefaultLayerStyle(geometryType, {color});
      field && style.setText(new ol.style.Text({
        text: `${feature.get(field)}`,
        font: 'bold',
        scale: 2,
        offsetY: 15,
        fill: new ol.style.Fill({
          color
        }),
        stroke: new ol.style.Stroke(({
          color: '#FFFFFF',
          width: 2
        }))
      }));
      return style;
    };
    styleFunction._g3w_options = options;
    return styleFunction;
  },

  createSelectedStyle({geometryType, color='rgb(255,255,0)', fill=true}={}) {
    let style = null;
    if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
      style = new ol.style.Style({
        stroke: new ol.style.Stroke({
          color,
          width: 4
        })
      });
    } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
      style = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          stroke: !fill && new ol.style.Stroke({
            color,
            width: 4
          }),
          fill: fill && new ol.style.Fill({
            color
          })
        }),
        zIndex: Infinity
      });
    } else if (geometryType === 'MultiPolygon' || geometryType === 'Polygon') {
      const fillColor = ol.color.asArray(color);
      fillColor.splice(3,1,0.5);
      style = new ol.style.Style({
        stroke: new ol.style.Stroke({
          color,
          width: 4
        }),
        fill: fill && new ol.style.Fill({
          color: ol.color.asString(fillColor)
        })
      });
    }
    return style;
  },

  getAlphanumericPropertiesFromFeature(properties=[]) {
    properties = Array.isArray(properties) ? properties : Object.keys(properties);
    return properties.filter(property => geometryFields.indexOf(property) === -1);
  },

  /**
   * Method to convert feature to form Data for expression/expression_eval request
   * @param feature
   * @param type
   */
  getFormDataExpressionRequestFromFeature(feature) {
    delete feature.attributes.geometry;
    const _feature = new ol.Feature(feature.geometry);
    const properties = {};
    geoutils.getAlphanumericPropertiesFromFeature(feature.attributes).forEach(property => {
      if (property !== G3W_FID) properties[property] = feature.attributes[property]
    });
    _feature.setProperties(properties);
    _feature.setId(feature.attributes[G3W_FID]);
    return geoutils.convertFeatureToGEOJSON(_feature);
  },

  /**
   * Convert Feature  to GEOJSON Format
   * @param feature
   */
  convertFeatureToGEOJSON(feature) {
    const GeoJSONFormat = new ol.format.GeoJSON();
    return GeoJSONFormat.writeFeatureObject(feature);
  },

  /**
   *
   * @param layers
   * @param bbox
   * @param feature_count
   * @param multilayers
   * @returns {JQuery.Promise<any, any, any>}
   */
  getQueryLayersPromisesByBBOX(layers, { bbox, filterConfig={}, feature_count=10, multilayers=false}) {
    let queriesPromise;
    const geometry = ol.geom.Polygon.fromExtent(bbox);
    const map = GUI.getComponent('map').getService().getMap();
    const mapProjection = map.getView().getProjection();

    if (multilayers) {
      queriesPromise = geoutils.getQueryLayersPromisesByGeometry(layers, {
        geometry,
        feature_count,
        filterConfig,
        multilayers,
        projection: mapProjection
      })
    } else {
      const d = $.Deferred();
      const mapCrs = mapProjection.getCode();
      queriesPromise = d.promise();
      const queryResponses = [];
      const queryErrors = [];
      let layersLenght = layers.length;
      layers.forEach(layer => {
        const filter   = new Filter(filterConfig);
        const layerCrs = layer.getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(
          (mapCrs === layerCrs)
            ? geometry
            : geometry.clone().transform(mapCrs, layerCrs)
        );
        layer.query({
          filter,
          feature_count
        }).then(response => {
          queryResponses.push(response)
        }).fail(error => queryErrors.push(error))
          .always(() => {
            layersLenght -= 1;
            if (layersLenght === 0)
              queryErrors.length === layers.length ? d.reject(queryErrors) : d.resolve(queryResponses)
        })
      });
    }
    return queriesPromise
  },

  /**
   *
   * @param layers
   * @param multilayers
   * @param bbox
   * @param geometry
   * @param projection
   * @param feature_count
   * @returns {JQuery.Promise<any, any, any>}
   */
  getQueryLayersPromisesByGeometry(layers, {multilayers=false, geometry, filterConfig={}, projection, feature_count=10} ={}) {
    const d = $.Deferred();
    const queryResponses = [];
    const queryErrors = [];
    const mapCrs = projection.getCode();
    const filter = new Filter(filterConfig);
    if (multilayers) {
      if (!layers.length) d.resolve([]);
      const multiLayers = _.groupBy(layers, layer => `${layer.getMultiLayerId()}_${layer.getProjection().getCode()}`);
      const numberRequestd = Object.keys(multiLayers).length;
      let layersLength = numberRequestd;
      for (let key in multiLayers) {
        const _multilayer = multiLayers[key];
        const layers      = _multilayer;
        const multilayer  = multiLayers[key][0];
        const provider    = multilayer.getProvider('filter');
        const layerCrs    = multilayer.getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(
          (mapCrs === layerCrs)
            ? geometry
            : geometry.clone().transform(mapCrs, layerCrs)
        );
        provider.query({
          filter,
          layers,
          feature_count
        }).then(response => queryResponses.push(response))
          .fail(error => queryErrors.push(error))
          .always(() => {
            layersLength -= 1;
            if (layersLength === 0)
              queryErrors.length === numberRequestd ? d.reject(queryErrors) : d.resolve(queryResponses)
          })
      }
    } else {
      if (layers.length === 0) d.resolve([]);
      else {
        let layersLenght = layers.length;
        layers.forEach(layer => {
          const layerCrs = layer.getProjection().getCode();
          // Convert filter geometry from `mapCRS` to `layerCrs`
          filter.setGeometry(
            (mapCrs === layerCrs)
              ? geometry
              : geometry.clone().transform(mapCrs, layerCrs)
          );
          layer.query({
            filter,
            filterConfig,
            feature_count
          }).then(response => queryResponses.push(response))
            .fail(error => queryErrors.push(error))
            .always(() => {
              layersLenght -= 1;
              if (layersLenght === 0) {
                queryErrors.length === layers.length ? d.reject(queryErrors) : d.resolve(queryResponses)
              }
            })
        });
      }
    }
    return d.promise();
  },

  getQueryLayersPromisesByCoordinates(layers, {coordinates, feature_count=10, query_point_tolerance=QUERY_POINT_TOLERANCE, multilayers=false, reproject=true}={}) {
    const d = $.Deferred();
    if (!layers.length) return d.resolve(layers);
    const map = GUI.getComponent('map').getService().getMap();
    const size = map.getSize();
    const queryResponses = [];
    const queryErrors = [];
    const mapProjection = map.getView().getProjection();
    const resolution = map.getView().getResolution();
    if (multilayers) { // case of multilayers
      const multiLayers = {};
      layers.forEach(layer => {
        const key = `${layer.getInfoFormat()}:${layer.getInfoUrl()}:${layer.getMultiLayerId()}`;
        if (multiLayers[key]) multiLayers[key].push(layer);
        else multiLayers[key] = [layer];
      });
      const numberOfRequests = Object.keys(multiLayers).length;
      let layersLength = numberOfRequests;
      for (let key in multiLayers) {
        const _multilayer = multiLayers[key];
        const layers = _multilayer;
        const multilayer = multiLayers[key][0];
        const provider = multilayer.getProvider('query');
        provider.query({
          feature_count,
          coordinates,
          query_point_tolerance,
          mapProjection,
          reproject,
          resolution,
          size,
          layers
        }).then(response => queryResponses.push(response))
          .fail(error => queryErrors.push(error))
          .always(() => {
            layersLength -= 1;
            if (layersLength === 0) {
              queryErrors.length === numberOfRequests ? d.reject(queryErrors) : d.resolve(queryResponses);
            }
          })
      }
    } else { // single layers request
      let layersLength = layers.length;
      let rejectedResponses = 0;
      layers.forEach(layer => {
        layer.query({
          feature_count,
          coordinates,
          query_point_tolerance,
          mapProjection,
          size,
          resolution,
        }).then(response => {
          queryResponses.push(response)
        }).fail(error => {
          rejectedResponses+=1;
          queryErrors.push(error);
        }).always(() => {
          layersLength -= 1;
          if (layersLength === 0) {
            rejectedResponses < layers.length ? d.resolve(queryResponses) : d.reject(queryErrors)
          }
        })
      });
    }
    return d.promise();
  },

  transformBBOX({bbox, sourceCrs, destinationCrs}={}) {
    const point1 = new ol.geom.Point([bbox[0], bbox[1]]);
    const point2 = new ol.geom.Point([bbox[2], bbox[3]]);
    point1.transform(sourceCrs, destinationCrs);
    point2.transform(sourceCrs, destinationCrs);
    return [...point1.getCoordinates(), ...point2.getCoordinates()];
  },

  parseQueryLayersPromiseResponses(responses) {
    const results = {
      query: responses[0] ? responses[0].query: null,
      data: []
    };
    responses.forEach(result => {
      result.data && result.data.forEach(data => {results.data.push(data)});
    });
    return results;
  },

  getMapLayerById,
  getMapLayersByFilter,

  areCoordinatesEqual(coordinates1=[], coordinates2=[]) {
    return (coordinates1[0]===coordinates2[0] && coordinates1[1]===coordinates2[1]);
  },
  /**
   *
   *
   * @param response
   * @param type vector/results
   * @returns {*|*[]|null}
   */
  getFeaturesFromResponseVectorApi(response={}, {type='vector'}={}) {
    if (response.result) {
      const features = response.vector.data.features || [];
      switch (type) {
        case 'result':
          return geoutils.covertVectorFeaturesToResultFeatures(features);
          break;
        case 'vector':
        default:
          return features
      }
    } else return null;
  },

  covertVectorFeaturesToResultFeatures(features=[]) {
    return features.map(feature => {
      const {id, properties:attributes, geometry} = feature;
      attributes[G3W_FID]= id;
      return {
        geometry,
        attributes,
        id
      }
    })
  },

  splitGeometryLine(splitGeometry, lineGeometry) {
    const isZType = lineGeometry.getCoordinates()[0][2] !== undefined;
    let splitted = false;
    const splittedSegments = [];
    const jstsFromWkt = new jsts.io.WKTReader();
    const wktFromOl = new ol.format.WKT();
    const olFromJsts = new jsts.io.OL3Parser();
    const splitLine = jstsFromWkt.read(wktFromOl.writeGeometry(splitGeometry));
    let wktLineString = wktFromOl.writeGeometry(lineGeometry);
    if (isZType) wktLineString = wktLineString.replace(' Z', '');
    const targetLine = jstsFromWkt.read(wktLineString);
    const targetCoordinates = targetLine.getCoordinates();
    const targetCoordinatesLength = targetCoordinates.length;
    const geometryFactory = new jsts.geom.GeometryFactory();
    let pointsNotSplitted = [];
    let endPoint;
    let startPoint;
    for (let i = 0; i < targetCoordinatesLength -1; i++) {
      startPoint = targetCoordinates[i];
      endPoint = targetCoordinates[i+1];
      if (isZType) {
        startPoint.z = lineGeometry.getCoordinates()[i][2];
        endPoint.z = lineGeometry.getCoordinates()[i+1][2];
      }
      // create a segment of two vertex
      const segment = geometryFactory.createLineString([startPoint, endPoint]);
      const intersectCoordinates = segment.intersection(splitLine).getCoordinates();
      if (intersectCoordinates.length) {
        splitted = true;
        intersectCoordinates.forEach(splitPoint => {
          if (isZType) splitPoint.z = startPoint.z;
          if (pointsNotSplitted.length) {
            const lineNewSegment = olFromJsts.write(geometryFactory.createLineString(pointsNotSplitted.concat([startPoint, splitPoint])));
            if (isZType) {
              const coordinates = lineNewSegment.getCoordinates();
              lineNewSegment.setCoordinates([[...coordinates[0], startPoint.z],[...coordinates[1], splitPoint.z]])
            }
            splittedSegments.push(lineNewSegment);
            pointsNotSplitted = [];
          } else {
            const lineNewSegment = olFromJsts.write(geometryFactory.createLineString([startPoint, splitPoint]));
            if (isZType) {
              const coordinates = lineNewSegment.getCoordinates();
              lineNewSegment.setCoordinates([[...coordinates[0], startPoint.z],[...coordinates[1], splitPoint.z]])
            }
            splittedSegments.push(lineNewSegment);
          }
          startPoint = splitPoint;
        });
        pointsNotSplitted = pointsNotSplitted.concat([startPoint, endPoint]);
      } else pointsNotSplitted = pointsNotSplitted.concat([startPoint, endPoint]);
    }
    const restOfLine = olFromJsts.write(geometryFactory.createLineString(pointsNotSplitted));
    if (isZType) {
      const zCoordinates = [];
      pointsNotSplitted.forEach((pointNotSplitted, index) => {
        const coordinate =  restOfLine.getCoordinates()[index];
        coordinate.push(pointNotSplitted.z);
        zCoordinates.push(coordinate);
      });
      restOfLine.setCoordinates(zCoordinates);
    }
    splittedSegments.push(restOfLine);
    return splitted && splittedSegments || []
  },

  splitFeatures({features=[], splitfeature} ={}) {
    const splitterdGeometries = [];
    features.forEach(feature => {
      const geometries = geoutils.splitFeature({feature, splitfeature});
      geometries.length > 1 && splitterdGeometries.push({
        uid: feature.getUid(),
        geometries
      })
    });
    return splitterdGeometries;
  },

  splitFeature({feature, splitfeature} ={}) {
    const geometries = {
      feature: feature.getGeometry(), //geometry of the feature to split
      split: splitfeature.getGeometry() // geometry of split feature
    };
    // check geometry type of split
    const splitType = geometries.split.getType();
    // check geometry type of feature
    const featureGeometryType = geometries.feature.getType();
    // array of splitted geometries
    const splittedFeatureGeometries = [];
    const parser = new jsts.io.OL3Parser();
    switch (splitType) {
      case 'LineString':
        // check if geometry is Polygon
        if (featureGeometryType.indexOf('Polygon') !== -1 ) {
          // check if is a MultiPolygon
          const isMulti = featureGeometryType.indexOf('Multi') !== -1;
          // if multiPolygon
          const polygonFeature = isMulti ? geometries.feature.getPolygons() : geometries.feature;
          if (Array.isArray(polygonFeature)) {
            polygonFeature.forEach(geometry => {
              geoutils.splitFeature({
                splitfeature,
                feature: new ol.Feature({
                  geometry
                })
              }).forEach(geometry => {
                geometry && splittedFeatureGeometries.push(new ol.geom.MultiPolygon([geometry.getCoordinates()]))
              })
            })
          } else {
            // case a Polygon
            const isZType = polygonFeature.getCoordinates()[0][0][2] !== undefined;
            const polygonFeatureGeometry = parser.read(polygonFeature);
            const externalPolygonFeatureGeometry = parser.read(polygonFeature.getLinearRing(0));
            // create a line splittinf feature in jsts
            const splitGeometry = parser.read(geometries.split);
            // add holes geometries
            let holePolygons;
            if (polygonFeature.getLinearRingCount() > 1) {
              let holeFeaturesGeometry;
              for (let index=1; index < polygonFeature.getLinearRingCount(); index++) {
                const holeRing = parser.read(polygonFeature.getLinearRing(index));
                if (holeFeaturesGeometry === undefined) holeFeaturesGeometry = holeRing;
                else holeFeaturesGeometry = holeFeaturesGeometry.union(holeRing);
              }
              holePolygons = new jsts.operation.polygonize.Polygonizer();
              holePolygons.add(holeFeaturesGeometry);
              let holyPolygonUnion;
              holePolygons.getPolygons().toArray().forEach(polygon => {
                if (holyPolygonUnion === undefined) holyPolygonUnion = polygon;
                else holyPolygonUnion = holyPolygonUnion.union(polygon);
              });
              holePolygons = holyPolygonUnion;
            }

            if (isZType) {
              polygonFeature.getCoordinates()[0].forEach((coordinate, index) => {
                externalPolygonFeatureGeometry.getCoordinates()[index].z = coordinate[2];
              });
              splitGeometry.getCoordinates().forEach(coordinate => coordinate.z = 0);
            }

            const union = externalPolygonFeatureGeometry.union(splitGeometry);
            const polygonizer = new jsts.operation.polygonize.Polygonizer();
            polygonizer.add(union);
            const polygons = polygonizer.getPolygons().toArray();
            polygons.length > 1 && polygons.forEach(polygon => {
              if (holePolygons) polygon = polygon.difference(holePolygons);
              if (polygonFeatureGeometry.intersects(polygon.getInteriorPoint())) {
                const geometry = parser.write(polygon);
                const polygonCoordinates = polygon.getCoordinates();
                if (isZType) {
                  polygonCoordinates.forEach((coordinate, index) => {
                    coordinate.z = coordinate.z === undefined ? polygonCoordinates[index === 0 ? index+1 : index-1].z : coordinate.z;
                  })
                }
                if (isZType) {
                  const zCoordinates = [];
                  geometry.getCoordinates()[0].forEach((coordinate, index) => {
                    coordinate.push(polygonCoordinates[index].z);
                    zCoordinates.push(coordinate)
                  });
                  geometry.setCoordinates([zCoordinates]);
                }
                const geometryType = geometry.getType();
                if (isMulti) {
                  splittedFeatureGeometries.push(new ol.geom.MultiPolygon(geometryType=== 'Polygon' ? [geometry.getCoordinates()] : geometry.getCoordinates()))
                } else {
                  if (geometryType === 'Polygon') {
                    splittedFeatureGeometries.push(geometry);
                  } else geometry.getCoordinates().forEach(coordinates => {
                    splittedFeatureGeometries.push(new ol.geom.Polygon(coordinates))
                  })
                }
              }
            })
          }
        //LineString or MultiLineString
        } else if (featureGeometryType.indexOf('LineString') !== -1) {
          const isMulti = featureGeometryType.indexOf('Multi') !== -1;
          const lineFeatureGeometry = isMulti ? geometries.feature.getLineStrings() : geometries.feature;
          if (Array.isArray(lineFeatureGeometry)) {
            lineFeatureGeometry.forEach(lineGeometry => {
              geoutils.splitFeature({
                splitfeature,
                feature: new ol.Feature({
                  geometry: lineGeometry
                })
              }).forEach(geometry => {
                geometry && splittedFeatureGeometries.push(new ol.geom.MultiLineString([geometry.getCoordinates()]))
              })
            })
          } else return geoutils.splitGeometryLine(geometries.split, geometries.feature);
        }
        break;
    }
    return splittedFeatureGeometries;
  },
  /**
   * Return Point feature vertex from geometry
   * @param geometry
   */
  getPointFeaturesfromGeometryVertex(geometry) {
    const pointFeatures = [];
    switch(geometry.getType()) {
      case GeometryTypes.MULTIPOLYGON:
        geometry.getCoordinates().forEach(coordinates => {
          coordinates.forEach(coordinates => {
            coordinates.pop();
            coordinates.forEach(coordinates => {
              const feature = new ol.Feature(new ol.geom.Point(coordinates));
              pointFeatures.push(feature);
            })
          })
        });
        break;
      case GeometryTypes.POLYGON:
        geometry.getCoordinates().forEach(coordinates => {
          coordinates.pop();
          coordinates.forEach(coordinates => {
            const feature = new ol.Feature(new ol.geom.Point(coordinates));
            pointFeatures.push(feature);
          })
        });
        break;
      case GeometryTypes.MULTILINESTRING:
        geometry.getCoordinates().forEach(coordinates => {
          coordinates.forEach(coordinates => {
            const feature = new ol.Feature(new ol.geom.Point(coordinates));
            pointFeatures.push(feature);
          })
        });
        break;
      case GeometryTypes.LINESTRING:
        geometry.getCoordinates().forEach(coordinates => {
          coordinates.forEach(coordinates => {
            const feature = new ol.Feature(new ol.geom.Point(coordinates));
            pointFeatures.push(feature);
          })
        });
        break;
      case GeometryTypes.MULTIPOINT:
        geometry.getCoordinates().forEach(coordinates => {
          const feature = new ol.Feature(new ol.geom.Point(coordinates));
          pointFeatures.push(feature);
        });
        break;
      case GeometryTypes.POINT:
        const coordinates =  geometry.getCoordinates();
        const feature = new ol.geom.Point(coordinates);
        pointFeatures.push(feature);
        break;
    }
    return pointFeatures;
  },

  /**
   * Return number of vertex of a feature
   * @param geometries
   * @returns {*}
   */
  getVertexLength(geometry) {
    let vertexLength = 0;
    switch(geometry.getType()) {
      case GeometryTypes.MULTIPOLYGON:
        geometry.getCoordinates().forEach(coordinates => {
          coordinates.forEach(coordinates => {
            coordinates.pop();
            coordinates.forEach(() => vertexLength+=1);
          })
        });
        break;
      case GeometryTypes.POLYGON:
        geometry.getCoordinates().forEach(coordinates => {
          coordinates.pop();
          coordinates.forEach(() => vertexLength+=1);
        });
        break;
    }
    return vertexLength;
  },

  /**
   * Method that compare two geometry type and return true id are same geometry type or have in common tha same base geometry type:
   * es. Point <--> Point => true
   *  MultiPoint <--> Point => true
   *  Point <--> Polygon => false
   *
   */
  isSameBaseGeometryType(geometryType1, geometryType2) {
    geometryType1 = geometryType1.replace('Multi','');
    geometryType2 = geometryType2.replace('Multi','');
    return geometryType1 === geometryType2;
  },

  isSingleGeometry(geometry) {
    return !Geometry.isMultiGeometry(geometry.getType());
  },

  singleGeometriesToMultiGeometry(geometries=[]) {
    const geometryType = geometries[0] && geometries[0].getType();
    return geometryType && new ol.geom[`Multi${geometryType}`](geometries.map(geometry => geometry.getCoordinates()))
  },

  multiGeometryToSingleGeometries(geometry) {
    const geometryType = geometry.getType();
    let geometries = [];
    switch (geometryType) {
      case GeometryTypes.MULTIPOLYGON:
        geometries = geometry.getPolygons();
        break;
      case GeometryTypes.MULTILINE:
      case GeometryTypes.MULTILINESTRING:
        geometries = geometry.getLineStrings();
        break;
      case GeometryTypes.MULTIPOINT:
        geometries = geometry.getPoints();
        break;
    }
    return geometries;
  },

  /**
   * Convert geometry to geometryType (from Single to Multi or viceversa)
   * 
   * @param { ol.geom } geometry       current OL geometry
   * @param { string }  toGeometryType 
   * 
   * @returns {*}
   */
  convertSingleMultiGeometry(geometry, toGeometryType) {
    const from_type = geometry.getType();
    if (toGeometryType && (from_type !== toGeometryType)) {
      const from_multi = Geometry.isMultiGeometry(from_type);
      const to_multi   = Geometry.isMultiGeometry(toGeometryType);
      if (from_multi && !to_multi) {
        return geoutils.multiGeometryToSingleGeometries(geometry);
      } else if (!from_multi && to_multi) {
        return geoutils.singleGeometriesToMultiGeometry([geometry]);
      }
    }
    return geometry;
  },

  dissolve({features=[], index=0, clone=false}={}) {
    const parser = new jsts.io.OL3Parser();
    const featuresLength = features.length;
    let dissolvedFeature;
    let jstsdissolvedFeatureGeometry;
    switch (featuresLength) {
      case 0:
        dissolvedFeature = null;
        break;
      case 1:
        dissolvedFeature = features[0];
        break;
      default:
        const baseFeature = dissolvedFeature = clone ? features[index].clone() : features[index];
        const baseFeatureGeometry = baseFeature.getGeometry();
        const baseFeatureGeometryType = baseFeatureGeometry.getType();
        // check if can buil a LineString
        if (baseFeatureGeometryType === 'LineString') {
          const lineMerger = new jsts.operation.linemerge.LineMerger();
          for (let i=0; i < featuresLength ; i++) {
            const feature = features[i];
            const coordinates = parser.read(feature.getGeometry()).getCoordinates();
            const LineString = new jsts.geom.GeometryFactory().createLineString(coordinates);
            lineMerger.addLineString(LineString);
          }
          const mergedLineString = lineMerger.getMergedLineStrings();
          jstsdissolvedFeatureGeometry = mergedLineString.size() === 1 ? mergedLineString.toArray()[0] : null;
        } else {
          jstsdissolvedFeatureGeometry = parser.read(baseFeatureGeometry);
          for (let i=0; i < featuresLength ; i++) {
            if (index !== i) {
              const feature = features[i];
              jstsdissolvedFeatureGeometry = jstsdissolvedFeatureGeometry.union(parser.read(feature.getGeometry()))
            }
          }
        }
        if (jstsdissolvedFeatureGeometry) {
          const dissolvedFeatureGeometry = parser.write(jstsdissolvedFeatureGeometry);
          const dissolvedFeatureGeometryType = dissolvedFeatureGeometry.getType();
          const dissolvedFeatuteGeometryCoordinates = dissolvedFeatureGeometryType === baseFeatureGeometryType ?
            dissolvedFeatureGeometry.getCoordinates() :
            (baseFeatureGeometryType.indexOf('Multi') !== -1 && dissolvedFeatureGeometryType === baseFeatureGeometryType.replace('Multi', '')) ? [dissolvedFeatureGeometry.getCoordinates()]
              : null;
          if (dissolvedFeatuteGeometryCoordinates) baseFeature.getGeometry().setCoordinates(dissolvedFeatuteGeometryCoordinates);
          else dissolvedFeature = null;
        } else dissolvedFeature = null;
    }
    return dissolvedFeature;
  },

  /**
   * Check if `geometryToCheck` is within `geometry`
   * 
   * @param   {ol.geometry} geometry
   * @param   {ol.geometry} geometryToCheck
   * @returns {boolean}     whether `geometryToCheck` is within `geometry`
   * 
   * @since 3.8.0
   */
  within(geometry, geometryToCheck) {
    const olFromJsts = new jsts.io.OL3Parser();
    const jstsGeometry = olFromJsts.read(geometry);
    const jstsGeometryToCheck = olFromJsts.read(geometryToCheck);
    return jstsGeometryToCheck.within(jstsGeometry)
  },
  /**
   * Check if `geometryCheck` intersects with `geometry`
   * 
   * @param   {ol.geometry} geometry
   * @param   {ol.geometry} geometryToCheck
   * 
   * @returns {boolean}     whether `geometryToCheck` interesects `geometry`
   * 
   * @since 3.8.0
   */
  intersects(geometry, geometryToCheck) {
    const olFromJsts = new jsts.io.OL3Parser();
    const jstsGeometry = olFromJsts.read(geometry);
    const jstsGeometryToCheck = olFromJsts.read(geometryToCheck);
    return jstsGeometry.intersects(jstsGeometryToCheck)
  },

  /**
   * Method to find Self Intersection
   * @param geoJsonPolygon
   * @returns {[]}
   */
  findSelfIntersects(geometry) {
    // temporary return true or false (commented the array result for point intersect)
    const selfIntersectPoint = [];
    const olFromJsts = new jsts.io.OL3Parser();
    const jstsPolygon = olFromJsts.read(geometry);
    // if the geometry is already a simple linear ring, do not
    // try to find self intersection points.
    const validator = new jsts.operation.IsSimpleOp(jstsPolygon);
    //if (validator.isSimpleLinearGeometry(jstsPolygon)) return selfIntersectPoint;
    if (validator.isSimpleLinearGeometry(jstsPolygon)) return false;
    const graph = new jsts.geomgraph.GeometryGraph(0, jstsPolygon);
    const cat = new jsts.operation.valid.ConsistentAreaTester(graph);
    const r = cat.isNodeConsistentArea();
    if (!r) {
      return true;
      //const pt = cat.getInvalidPoint();
      //selfIntersectPoint.push([pt.x, pt.y]);
    }
  },

  normalizeEpsg(epsg) {
    if (typeof epsg === 'number') return `EPSG:${epsg}`;
    epsg = epsg.replace(/[^\d\.\-]/g, "");
    if (epsg !== '') return `EPSG:${parseInt(epsg)}`;
  },

  crsToCrsObject(crs) {
    if (crs === null || crs === undefined) return crs;
    if  (toRawType(crs) === 'Object' && crs.epsg) crs.epsg = geoutils.normalizeEpsg(crs.epsg);
    else
      crs = {
        epsg: geoutils.normalizeEpsg(crs),
        proj4: "",
        axisinverted: false,
        geographic: false
      };
    return crs;
  },
  /**
   * Method to convert Degree Minutes  to Degree
   * @param dm
   * @returns {string}
   * @constructor
   */
  ConvertDMToDEG({dms, type="Array"}) {
    const dms_Array = type === 'Array' ? dms : dms.split(/[^\d\w\.]+/);
    const degrees = 1*dms_Array[0];
    const minutes = 1*dms_Array[1];
    let deg = (Number(degrees) + Number(minutes)/60).toFixed(6);
    return 1*deg;
  },
  /**
   * Method to convert Degree to DM
   * @param deg
   * @param lat
   * @returns {string}
   * @constructor
   */
  ConvertDEGToDM({deg, output='Array'} = {}) {
    const absolute = Math.abs(deg);
    const degrees = Math.floor(absolute);
    const minutes = (absolute - degrees) * 60;
    switch (output) {
      case 'Array':
        return [degrees, minutes];
        break;
      case 'Object':
        return {
          degrees,
          minutes,
        };
        break;
      case 'Text':
      default:
        return  degrees + "°" + minutes + "'"
    }
  },
  /**
   * Method to convert Degree Minutes Seconto to Degree
   * @param dms
   * @returns {string}
   * @constructor
   */
  ConvertDMSToDEG({dms, type="Array"}) {
    const dms_Array = type === 'Array' ? dms : dms.split(/[^\d\w\.]+/);
    const degrees = 1*dms_Array[0];
    const minutes = 1*dms_Array[1];
    const seconds = 1*dms_Array[2];
    const direction = dms_Array[3];
    let deg = (Number(degrees) + Number(minutes)/60 + Number(seconds)/3600).toFixed(6);
    if (direction == "S" || direction == "W") deg = deg * -1;
    return 1*deg;
  },
  /**
   * Method to convert Degree to DMS
   * @param deg
   * @param lat
   * @returns {string}
   * @constructor
   */
  ConvertDEGToDMS({deg, lat, lon, output='Array'} = {}) {
    const absolute = Math.abs(deg);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);
    let direction;
    if (lat) direction =  deg >= 0 ? "N" : "S";
    if (lon) direction = deg >= 0 ? "E" : "W";
    switch (output) {
      case 'Array':
        return [degrees, minutes, seconds, direction];
        break;
      case 'Object':
        return {
          degrees,
          minutes,
          seconds,
          direction
        };
        break;
      case 'Text':
      default:
        return  degrees + "°" + minutes + "'" + seconds + "\"" + direction
    }

  },
  /**
   * Method to get geotiff file create by server
   *
   * @param options {
   *   url: server url end point
   *   method: "GET" or "POST" - default POST
   * }
   * @returns {Promise<Blob>}
   */
  async getGeoTIFFfromServer(options={}) {
    const {url, params:{image, csrfmiddlewaretoken, bbox}, method="POST"} = options;
    const body = new FormData();
    body.append('image', image);
    body.append('csrfmiddlewaretoken', csrfmiddlewaretoken);
    body.append('bbox', bbox);
    const response = await fetch(url, {
      method, // *GET, POST, PUT, DELETE, etc.,
      body
    });
    const geoTIFF = await response.blob();
    return geoTIFF;
  },
  /**
   * Method to convert feature forma api
   * @param feature
   * @returns {*|Feature|Feature}
   */
  createOlFeatureFromApiResponseFeature(feature) {
    const {properties={}, geometry, id} = feature;
    properties[G3W_FID] = id;
    const Feature = new ol.Feature(geometry && new ol.geom[geometry.type](geometry.coordinates));
    Feature.setProperties(properties);
    Feature.setId(id);
    return Feature;
  },

  sanitizeFidFeature(fid) {
    if (toRawType(fid) === 'String' && Number.isNaN(1*fid))  {
      fid = fid.split('.');
      fid = fid.length === 2 ? fid[1] : fid[0];
    }
    return fid;
  },
  parseAttributes(layerAttributes, featureAttributes) {
    let featureAttributesNames = Object.keys(featureAttributes).filter(featureAttributesName => geometryFields.indexOf(featureAttributesName) === -1);
    if (layerAttributes && layerAttributes.length) {
      let featureAttributesNames = Object.keys(featureAttributes);
      return layerAttributes.filter(attribute => featureAttributesNames.indexOf(attribute.name) > -1)
    } else {
      return featureAttributesNames.map(featureAttributesName => ({
          name: featureAttributesName,
          label: featureAttributesName
        })
      )
    }
  },
  /**
   * Handle case query response
   */
  handleQueryResponse({response, projections, layers, wms=true}={}) {
    layers = layers ? layers : [this._layer];
    const layer = layers[0];
    const infoFormat = layer.getInfoFormat();
    response = responseParser.get(infoFormat)({
      response,
      projections,
      layers,
      wms
    });
    return response;
  },


  /**
   * core/geometry/geom::distance@v3.4
   */
  distance(c1,c2) {
    return Math.sqrt(geom.squaredDistance(c1,c2));
  },

  /**
   * * core/geometry/geom::squaredDistance@v3.4
   */
  squaredDistance(c1,c2) {
    const x1 = c1[0];
    const y1 = c1[1];
    const x2 = c2[0];
    const y2 = c2[1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },

  /**
   * core/geometry/geom::closestOnSegment@v3.4
   */
  closestOnSegment(coordinate, segment) {
    const x0 = coordinate[0];
    const y0 = coordinate[1];
    const start = segment[0];
    const end = segment[1];
    const x1 = start[0];
    const y1 = start[1];
    const x2 = end[0];
    const y2 = end[1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const along = (dx === 0 && dy === 0) ? 0 :
      ((dx * (x0 - x1)) + (dy * (y0 - y1))) / ((dx * dx + dy * dy) || 0);
    let x, y;
    if (along <= 0) {
      x = x1;
      y = y1;
    } else if (along >= 1) {
      x = x2;
      y = y2;
    } else {
      x = x1 + along * dx;
      y = y1 + along * dy;
    }
    return [x, y];
  },

  get_LEGEND_ON_LEGEND_OFF_Params: get_legend_params,

  /**
   * @TODO remove "Geometry" sub-property (ie. find out how to merge the following functions)
   */
  Geometry

};

module.exports = geoutils;
