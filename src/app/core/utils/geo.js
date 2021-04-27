const { toRawType, uniqueId } = require('core/utils/utils');
const Geometry = require('core/geometry/geometry');
const Filter = require('core/layers/filter/filter');
const MapLayersStoreRegistry = require('core/map/maplayersstoresregistry');
const GUI = require('gui/gui');
const geometryFields = ['geometryProperty', 'boundedBy', 'geom', 'the_geom', 'geometry', 'bbox', 'GEOMETRY', 'geoemtria'];

const geoutils = {
  geometryFields,
  coordinatesToGeometry: function(geometryType, coordinates) {
    let geometryClass;
    switch (geometryType) {
      case Geometry.GeometryTypes.POLYGON:
        geometryClass = ol.geom.Polygon;
        break;
      case Geometry.GeometryTypes.MULTIPOLYGON:
        geometryClass = ol.geom.MultiPolygon;
        break;
      case Geometry.GeometryTypes.LINESTRING:
      case Geometry.GeometryTypes.LINE:
        geometryClass = ol.geom.LineString;
        break;
      case Geometry.GeometryTypes.MULTILINE:
      case Geometry.GeometryTypes.MULTILINESTRING:
        geometryClass = ol.geom.MultiLineString;
        break;
      case Geometry.GeometryTypes.POINT:
        geometryClass = ol.geom.Point;
        break;
      case (Geometry.GeometryTypes.MULTIPOINT):
        geometryClass = ol.geom.MultiPoint;
        break;
      default:
        geometryClass = ol.geom.Point;
    }
    const geometry = new geometryClass(coordinates);
    return geometry
  },
  shpToGeojson: function(config, returnData) {
    const {EPSG='4326', encoding='utf-8'} = config;
    const  url = config.url;
    loadshp({
      url,
      encoding,
      EPSG: Number.isInteger(EPSG) ? EPSG : EPSG.split('EPSG:')[1]
    }, function(geojson) {
      returnData(geojson)
    });
  },
  getDefaultLayerStyle(geometryType, options={}){
    const {color} = options;
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
  createLayerStyle: function(styleObj) {
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

  createFeatureFromGeometry({id,geometry}={}){
    if (geometry) {
      const feature = new ol.Feature(geometry);
      id && feature.setId(id);
      return feature;
    }
  },

  createOlLayer: function(options = {}) {
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
        case Geometry.GeometryTypes.POINT:
        case Geometry.GeometryTypes.MULTIPOINT:
          style = new ol.style.Style({
            image: new ol.style.Circle({
              radius: 5,
              fill: new ol.style.Fill({
                color
              })
            })
          });
          break;
        case Geometry.GeometryTypes.LINESTRING:
        case Geometry.GeometryTypes.MULTILINESTRING:
          style = new ol.style.Style({
            stroke: new ol.style.Stroke({
              width: 3,
              color
            })
          });
          break;
        case Geometry.GeometryTypes.POLYGON:
        case Geometry.GeometryTypes.MULTIPOLYGON:
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
  async createVectorLayerFromFile({name, type, crs, mapCrs, data, style} ={}) {
    let format;
    let layer;
    const createVectorLayer = (format, data, epsg=crs) => {
      let vectorLayer;
      const features = format.readFeatures(data, {
        dataProjection: epsg,
        featureProjection: mapCrs || epsg
      });
      if (features.length) {
        const vectorSource = new ol.source.Vector({
          features,
        });
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
      case 'gml':
        format = new ol.format.WMSGetFeatureInfo();
        layer = createVectorLayer(format, data);
        break;
      case 'geojson':
        format = new ol.format.GeoJSON();
        layer = createVectorLayer(format, data);
        break;
      case 'kml':
        format = new ol.format.KML({
          extractStyles: false
        });
        layer = createVectorLayer(format, data,  "EPSG:4326");
        break;
      case 'zip':
        const promise = new Promise((resolve, reject) =>{
          geoutils.shpToGeojson({
            url: data,
            EPSG: crs
          }, geojson => {
            if (geojson) {
              const data = JSON.stringify(geojson);
              format = new ol.format.GeoJSON({});
              resolve(createVectorLayer(format, data, "EPSG:4326"));
            } else reject()
          });
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
  createStyleFunctionToVectorLayer(options={}){
    const styleFunction = function(feature, resolution) {
      let {color, field} = options;
      color = color.rgba ? 'rgba(' + color.rgba.r + ',' + color.rgba.g + ',' + color.rgba.b + ','  + color.rgba.a + ')': color;
      const style = geoutils.getDefaultLayerStyle(feature.getGeometry().getType(), {color});
      field && style.setText(new ol.style.Text({
        text: `${feature.get(field)}`,
        font: 'bold',
        scale: 2,
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
    }
    else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
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
    return properties.filter((property) => {
      return geometryFields.indexOf(property) === -1;
    });
  },

  /**
   *
   * @param layers
   * @param bbox
   * @param feature_count
   * @param multilayers
   * @returns {JQuery.Promise<any, any, any>}
   */
  getQueryLayersPromisesByBBOX(layers, { bbox, feature_count=10, multilayers=false}){
    let queriesPromise;
    if (multilayers) {
      const map = GUI.getComponent('map').getService().getMap();
      queriesPromise = geoutils.getQueryLayersPromisesByGeometry(layers, {
        geometry: bbox,
        bbox: true,
        feature_count,
        projection: map.getView().getProjection()
      })
    } else {
      const d = $.Deferred();
      queriesPromise = d.promise();
      const queryResponses = [];
      const queryErrors = [];
      let layersLenght = layers.length;
      let filterBBox = bbox;
      layers.forEach(layer => {
        const filter = new Filter();
        filter.setBBOX(filterBBox);
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

  getQueryLayersPromisesByCoordinates(layers, {coordinates, feature_count=10, multilayers=false, reproject=true}={}) {
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
    } else { // single layers
      let layersLength = layers.length;
      let rejectedResponses = 0;
      layers.forEach(layer => {
        layer.query({
          feature_count,
          coordinates,
          mapProjection,
          size,
          resolution,
        }).then(response => {
          queryResponses.push(response)
        }).fail(error =>{
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

  transformBBOX({bbox, sourceCrs, destinationCrs}={}){
    const point1 = new ol.geom.Point([bbox[0], bbox[1]]);
    const point2 = new ol.geom.Point([bbox[2], bbox[3]]);
    point1.transform(sourceCrs, destinationCrs);
    point2.transform(sourceCrs, destinationCrs);
    return [...point1.getCoordinates(), ...point2.getCoordinates()];
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
  getQueryLayersPromisesByGeometry(layers, {multilayers=false, bbox, geometry, projection, feature_count=10} ={}) {
    const d = $.Deferred();
    const queryResponses = [];
    const queryErrors = [];
    const mapCrs = projection.getCode();
    const filter = new Filter();
    if (multilayers) {
      let filterGeometry = geometry;
      if (!layers.length) d.resolve([]);
      const multiLayers = _.groupBy(layers, layer => `${layer.getMultiLayerId()}_${layer.getProjection().getCode()}`);
      const numberRequestd = Object.keys(multiLayers).length;
      let layersLength = numberRequestd;
      for (let key in multiLayers) {
        const _multilayer = multiLayers[key];
        const layers = _multilayer;
        const multilayer = multiLayers[key][0];
        const provider = multilayer.getProvider('filter');
        // in case of boox geometry
        if (bbox) filter.setBBOX(filterGeometry);
        else {
          const layerCrs = multilayer.getProjection().getCode();
          if (mapCrs !== layerCrs) filterGeometry = filterGeometry.clone().transform(mapCrs, layerCrs);
          filter.setGeometry(filterGeometry)
        }
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
          filter.setGeometry((mapCrs !== layerCrs) ? geometry.clone().transform(mapCrs, layerCrs): geometry);
          layer.query({
            filter,
            feature_count
          }).then(response => queryResponses.push(response))
            .fail(error => queryErrors.push(error))
            .always(() => {
              layersLenght -= 1;
              if (layersLenght === 0){
                queryErrors.length === layers.length ? d.reject(queryErrors) : d.resolve(queryResponses)
              }
            })
        });
      }
    }
    return d.promise();
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
  getMapLayerById: function(layerId) {
    return MapLayersStoreRegistry.getLayerById(layerId);
  },

  getMapLayersByFilter(filter, options={}) {
    filter = filter || {};
    const mapFilter = {
      GEOLAYER: true
    };
    Object.assign(filter, mapFilter);
    let layers = [];
    MapLayersStoreRegistry.getQuerableLayersStores().forEach(layerStore => {
      layers = layerStore.getLayers(filter, options);
    });
    return layers || [];
  },

  areCoordinatesEqual(coordinates1=[], coordinates2=[]) {
    return (coordinates1[0]===coordinates2[0] && coordinates1[1]===coordinates2[1]);
  },

  getFeaturesFromResponseVectorApi: function(response={}) {
    if (response.result) {
      const features = response.vector.data.features || [];
      return features;
    } else return null;
  },

  splitGeometryLine(splitGeometry, lineGeometry) {
    let splitted = false;
    const splittedSegments = [];
    const jstsFromWkt = new jsts.io.WKTReader();
    const wktFromOl = new ol.format.WKT();
    const olFromJsts = new jsts.io.OL3Parser();
    const splitLine = jstsFromWkt.read(wktFromOl.writeGeometry(splitGeometry));
    const targetLine = jstsFromWkt.read(wktFromOl.writeGeometry(lineGeometry));
    const targetCoordinates = targetLine.getCoordinates();
    const targetCoordinatesLength = targetCoordinates.length;
    const geometryFactory = new jsts.geom.GeometryFactory();
    let pointsNotSplitted = [];
    let endPoint;
    let startPoint;
    for (let i = 0; i < targetCoordinatesLength -1; i++) {
      startPoint = targetCoordinates[i];
      endPoint = targetCoordinates[i+1];
      // create a segment of two vertex
      const segment = geometryFactory.createLineString([startPoint, endPoint]);
      const intersectCoordinates = segment.intersection(splitLine).getCoordinates();
      if (intersectCoordinates.length) {
        splitted = true;
        intersectCoordinates.forEach(splitPoint => {
          if (pointsNotSplitted.length) {
            const newSegment= geometryFactory.createLineString(pointsNotSplitted.concat([startPoint, splitPoint]));
            splittedSegments.push(olFromJsts.write(newSegment));
            pointsNotSplitted = [];
          } else {
            const newSegment= geometryFactory.createLineString([startPoint, splitPoint]);
            splittedSegments.push(olFromJsts.write(newSegment));
          }
          startPoint = splitPoint;
        });
        pointsNotSplitted = pointsNotSplitted.concat([startPoint, endPoint]);
      } else pointsNotSplitted = pointsNotSplitted.concat([startPoint, endPoint]);
    }
    const restOfLine =  geometryFactory.createLineString(pointsNotSplitted);
    splittedSegments.push(olFromJsts.write(restOfLine));
    return splitted && splittedSegments || []
  },

  splitFeatures({features=[], splitfeature} ={}){
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

  splitFeature({feature, splitfeature} ={}){
    const geometries = {
      feature: feature.getGeometry(), //geometry of the feature to split
      split: splitfeature.getGeometry() // geometry of split feature
    };
    // check geometry type of split
    const splitType = geometries.split.getType();
    // check geometry type of feature
    const featureGeometryType = geometries.feature.getType();
    const splittedFeatureGeometries = [];
    const parser = new jsts.io.OL3Parser();
    switch (splitType){
      case 'LineString':
        // check if geoemtry is Polygon
        if (featureGeometryType.indexOf('Polygon') !== -1 ) {
          // check if is a MultiPolygon
          const isMulti = featureGeometryType.indexOf('Multi') !== -1;
          // if multiPolygon
          const polygonFeature = isMulti ? geometries.feature.getPolygons() : geometries.feature;
          if (Array.isArray(polygonFeature)) {
            polygonFeature.forEach(polygonGeometry =>{
              geoutils.splitFeature({
                splitfeature,
                feature: new ol.Feature({
                  geometry: polygonGeometry
                })
              }).forEach(geometry => {
                geometry && splittedFeatureGeometries.push(new ol.geom.MultiPolygon([geometry.getCoordinates()]))
              })
            })
          } else {
            // case a Polygon
            const polygonFeatureGeometry = parser.read(polygonFeature);
            const featureGeometry = parser.read(polygonFeature.getLinearRing(0));
            const splitGeometry = parser.read(geometries.split);
            const union = featureGeometry.union(splitGeometry);
            const polygonizer = new jsts.operation.polygonize.Polygonizer();
            polygonizer.add(union);
            const polygons = polygonizer.getPolygons().toArray();
            polygons.length > 1 && polygons.forEach(polygon => {
              if (polygonFeatureGeometry.intersection(polygon).getGeometryType() === 'Polygon') {
                const geometry = parser.write(polygon);
                splittedFeatureGeometries.push(isMulti ? new ol.geom.MultiPolygon([geometry.getCoordinates()]) : geometry)
              }
            })
          }
        //LineString or MultiLineString
        } else if (featureGeometryType.indexOf('LineString') !== -1) {
          const isMulti = featureGeometryType.indexOf('Multi') !== -1;
          const lineFeatureGeometry = isMulti ? geometries.feature.getLineStrings() : geometries.feature;
          if (Array.isArray(lineFeatureGeometry)) {
            lineFeatureGeometry.forEach(lineGeometry =>{
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

  singleGeometriesToMultiGeometry(geometries=[]) {
    const geometryType = geometries[0] && geometries[0].getType();
    return geometryType && new ol.geom[`Multi${geometryType}`](geometries.map(geometry => geometry.getCoordinates()))
  },

  multiGeometryToSingleGeometries(geometry){
    const geometryType = geometry.getType();
    let geometries = [];
    switch (geometryType) {
      case Geometry.GeometryTypes.MULTIPOLYGON:
        geometries = geometry.getPolygons();
        break;
      case Geometry.GeometryTypes.MULTILINE:
      case Geometry.GeometryTypes.MULTILINESTRING:
        geometries = geometry.getLineStrings();
        break;
      case Geometry.GeometryTypes.MULTIPOINT:
        geometries = geometry.getPoints();
        break;
    }
    return geometries;
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
          if (dissolvedFeatuteGeometryCoordinates)
            baseFeature.getGeometry().setCoordinates(dissolvedFeatuteGeometryCoordinates);
          else
            dissolvedFeature = null;
        } else dissolvedFeature = null;
    }
    return dissolvedFeature;
  },

  normalizeEpsg: function(epsg) {
    if (typeof epsg === 'number') return `EPSG:${epsg}`;
    epsg = epsg.replace(/[^\d\.\-]/g, "");
    if (epsg !== '') return `EPSG:${parseInt(epsg)}`;
  },

  crsToCrsObject(crs){
    if (crs === null || crs === undefined) return crs;
    if  (toRawType(crs) === 'Object' && crs.epsg) {
      crs.epsg = geoutils.normalizeEpsg(crs.epsg);
    } else
      crs = {
        epsg: geoutils.normalizeEpsg(crs),
        proj4: "",
        axisinverted: false,
        geographic: false
      };
    return crs;
  }
};

module.exports = geoutils;
