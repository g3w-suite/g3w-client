const { toRawType, uniqueId } = require('core/utils/utils');
const Geometry = require('core/geometry/geometry');
const Filter = require('core/layers/filter/filter');
const MapLayersStoreRegistry = require('core/map/maplayersstoresregistry');
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
    const inputData = {};
    const EPSG4326 = "EPSG:4326";
    const EPSGUser = config.EPSG || EPSG4326;
    const  url = config.url;
    const encoding = typeof config.encoding != 'utf-8' ? config.encoding : 'utf-8';
    function TransCoord(x, y) {
      const p = ol.proj.transform([parseFloat(x), parseFloat(y)], EPSGUser, EPSG4326);
      return {x: p[0], y: p[1]};
    }

    function shpLoader(data, returnData) {
      inputData['shp'] = data;
      if(inputData['shp'] && inputData['dbf'])
        if(returnData) returnData(  toGeojson(inputData)  );
    }

    function dbfLoader(data, returnData) {
      inputData['dbf'] = data;
      if(inputData['shp'] && inputData['dbf'])
        if(returnData) returnData(  toGeojson(inputData)  );
    }

    function toGeojson(geojsonData) {
      let geojson = {},
        features = [],
        feature, geometry, points;

      const shpRecords = geojsonData.shp.records;
      const dbfRecords = geojsonData.dbf.records;

      geojson.type = "FeatureCollection";
      min = TransCoord(geojsonData.shp.minX, geojsonData.shp.minY);
      max = TransCoord(geojsonData.shp.maxX, geojsonData.shp.maxY);
      geojson.bbox = [
        min.x,
        min.y,
        max.x,
        max.y
      ];

      geojson.features = features;
      for (let i = 0; i < shpRecords.length; i++) {
        feature = {};
        feature.type = 'Feature';
        geometry = feature.geometry = {};
        properties = feature.properties = dbfRecords[i];
        if (shpRecords[i].shape) {
          // point : 1 , polyline : 3 , polygon : 5, multipoint : 8
          switch(shpRecords[i].shape.type) {
            case 1:
              geometry.type = "Point";
              const reprj = TransCoord(shpRecords[i].shape.content.x, shpRecords[i].shape.content.y);
              geometry.coordinates = [
                reprj.x, reprj.y
              ];
              break;
            case 3:
            case 8:
              geometry.type = (shpRecords[i].shape.type == 3 ? "LineString" : "MultiPoint");
              geometry.coordinates = [];
              for (let j = 0; j < shpRecords[i].shape.content.points.length; j+=2) {
                const reprj = TransCoord(shpRecords[i].shape.content.points[j], shpRecords[i].shape.content.points[j+1]);
                geometry.coordinates.push([reprj.x, reprj.y]);
              }
              break;
            case 5:
              geometry.type = "Polygon";
              geometry.coordinates = [];
              for (let pts = 0; pts < shpRecords[i].shape.content.parts.length; pts++) {
                let partsIndex = shpRecords[i].shape.content.parts[pts],
                  part = [];
                for (let j = partsIndex*2; j < (shpRecords[i].shape.content.parts[pts+1]*2 || shpRecords[i].shape.content.points.length); j+=2) {
                  const point = shpRecords[i].shape.content.points;
                  const reprj = TransCoord(point[j], point[j+1]);
                  part.push([reprj.x, reprj.y]);
                }
                geometry.coordinates.push(part);

              }
              break;
            default:
          }
          if("coordinates" in feature.geometry) features.push(feature);
        }
      }
      return geojson;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        let URL = window.URL || window.webkitURL || window.mozURL || window.msURL,
          zip = new JSZip(e.target.result),
          shpString =  zip.file(/.shp$/i)[0].name,
          dbfString = zip.file(/.dbf$/i)[0].name;

        SHPParser.load(URL.createObjectURL(new Blob([zip.file(shpString).asArrayBuffer()])), shpLoader, returnData);
        DBFParser.load(URL.createObjectURL(new Blob([zip.file(dbfString).asArrayBuffer()])), encoding, dbfLoader, returnData);
      } catch(error){
        returnData()
      }

    };
    reader.readAsArrayBuffer(url);
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
  createFeatureFromGeometry(geometry){
    return geometry && new ol.Feature(geometry);
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
                color: color
              })
            })
          });
          break;
        case Geometry.GeometryTypes.LINESTRING:
        case Geometry.GeometryTypes.MULTILINESTRING:
          style = new ol.style.Style({
            stroke: new ol.style.Stroke({
              width: 3,
              color: color
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
              color: color
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
            encoding: 'big5',
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
  getQueryLayersPromisesByCoordinates(layers, {coordinates, map, feature_count=10, querymultilayers=false}={}) {
    const d = $.Deferred();
    const size = map.getSize();
    if (!layers.length)
      return d.resolve(layers);
    const queryResponses = [];
    const mapProjection = map.getView().getProjection();
    const resolution = map.getView().getResolution();
    if (querymultilayers) {
           const multiLayers = {};
      layers.forEach(layer => {
        const key = `${layer.getInfoFormat()}:${layer.getInfoUrl()}:${layer.getMultiLayerId()}`;
        if (multiLayers[key])
          multiLayers[key].push(layer);
        else
          multiLayers[key] = [layer];
      });
      let layersLenght = Object.keys(multiLayers).length;
      for (let key in multiLayers) {
        const _multilayer = multiLayers[key];
        const layers = _multilayer;
        const multilayer = multiLayers[key][0];
        const provider = multilayer.getProvider('query');
        provider.query({
          feature_count,
          coordinates,
          mapProjection,
          resolution,
          size,
          layers
        }).then((response)=> {
          queryResponses.push(response);
        }).always(() => {
          layersLenght -= 1;
          if (layersLenght === 0)
            d.resolve(queryResponses)
        })
      }
    } else {
      let layersLenght = layers.length;
      layers.forEach((layer) => {
        layer.query({
          feature_count,
          coordinates,
          mapProjection,
          size,
          resolution,
        }).then((response) => {
          queryResponses.push(response)
        }).always(() => {
          layersLenght -= 1;
          if (layersLenght === 0)
            d.resolve(queryResponses)
        })
      });
    }
    return d.promise();
  },
  getQueryLayersPromisesByGeometry(layers, options={}) {
    const d = $.Deferred();
    let filterGeometry = options.geometry;
    const bbox = options.bbox;
    const projection = options.projection;
    const queryResponses = [];
    const feature_count = options.feature_count || 10;
    if (!layers.length)
      d.resolve([]);
    const mapCrs = projection.getCode();
    const multiLayers = _.groupBy(layers, function(layer) {
      return `${layer.getMultiLayerId()}_${layer.getProjection().getCode()}`;
    });
    let layersLenght = Object.keys(multiLayers).length;
    for (let key in multiLayers) {
      const filter = new Filter();
      const _multilayer = multiLayers[key];
      const layers = _multilayer;
      const multilayer = multiLayers[key][0];
      const provider = multilayer.getProvider('filter');
      const layerCrs = multilayer.getProjection().getCode();
      if (mapCrs !== layerCrs) {
        if (bbox) {
          const geometry = ol.geom.Polygon.fromExtent(filterGeometry);
          filterGeometry = geometry.transform(mapCrs, layerCrs).getExtent();
        } else {
          filterGeometry = filterGeometry.clone().transform(mapCrs, layerCrs);
        }
      }
      bbox && filter.setBBOX(filterGeometry) ||  filter.setGeometry(filterGeometry);
      provider.query({
        filter,
        layers,
        feature_count
      }).then((response)=> {
        queryResponses.push(response);
      }).always(() => {
        layersLenght -= 1;
        if (layersLenght === 0)
          d.resolve(queryResponses)
      })
    }
    return d.promise();
  },
  parseQueryLayersPromiseResponses(responses) {
    const results = {
      query: responses[0] ? responses[0].query: null,
      data: []
    };
    responses.forEach((result) => {
      if (result.data)
        result.data.forEach(data => {results.data.push(data)});
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
    MapLayersStoreRegistry.getQuerableLayersStores().forEach((layerStore) => {
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
