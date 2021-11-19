const { toRawType, uniqueId } = require('core/utils/utils');
const Geometry = require('core/geometry/geometry');
const Filter = require('core/layers/filter/filter');
const MapLayersStoreRegistry = require('core/map/maplayersstoresregistry');
const GUI = require('gui/gui');
const geometryFields = ['geometryProperty', 'boundedBy', 'geom', 'the_geom', 'geometry', 'bbox', 'GEOMETRY', 'geoemtria', 'geometria'];

const geoutils = {
  geometryFields,
  coordinatesToGeometry(geometryType, coordinates) {
    let geometryClass;
    switch (geometryType) {
      case Geometry.GeometryTypes.POLYGON:
      case Geometry.GeometryTypes.POLYGONZ:
      case Geometry.GeometryTypes.POLYGONM:
      case Geometry.GeometryTypes.POLYGONZM:
      case Geometry.GeometryTypes.POLYGON25D:
        geometryClass = ol.geom.Polygon;
        break;
      case Geometry.GeometryTypes.MULTIPOLYGON:
      case Geometry.GeometryTypes.MULTIPOLYGONZ:
      case Geometry.GeometryTypes.MULTIPOLYGONM:
      case Geometry.GeometryTypes.MULTIPOLYGONZM:
      case Geometry.GeometryTypes.MULTIPOLYGON25D:
        geometryClass = ol.geom.MultiPolygon;
        break;
      case Geometry.GeometryTypes.LINESTRING:
      case Geometry.GeometryTypes.LINESTRINGZ:
      case Geometry.GeometryTypes.LINESTRINGM:
      case Geometry.GeometryTypes.LINESTRINGZM:
      case Geometry.GeometryTypes.LINESTRING25D:
      case Geometry.GeometryTypes.LINE:
      case Geometry.GeometryTypes.LINEZ:
      case Geometry.GeometryTypes.LINEM:
      case Geometry.GeometryTypes.LINEZM:
      case Geometry.GeometryTypes.LINE25D:
        geometryClass = ol.geom.LineString;
        break;
      case Geometry.GeometryTypes.MULTILINE:
      case Geometry.GeometryTypes.MULTILINEZ:
      case Geometry.GeometryTypes.MULTILINEM:
      case Geometry.GeometryTypes.MULTILINEZM:
      case Geometry.GeometryTypes.MULTILINE25D:
      case Geometry.GeometryTypes.MULTILINESTRING:
      case Geometry.GeometryTypes.MULTILINESTRINGZ:
      case Geometry.GeometryTypes.MULTILINESTRINGM:
      case Geometry.GeometryTypes.MULTILINESTRINGZM:
      case Geometry.GeometryTypes.MULTILINESTRING25D:
        geometryClass = ol.geom.MultiLineString;
        break;
      case Geometry.GeometryTypes.POINT:
      case Geometry.GeometryTypes.POINTZ:
      case Geometry.GeometryTypes.POINTM:
      case Geometry.GeometryTypes.POINTZM:
      case Geometry.GeometryTypes.POINT25D:
        geometryClass = ol.geom.Point;
        break;
      case Geometry.GeometryTypes.MULTIPOINT:
      case Geometry.GeometryTypes.MULTIPOINTZ:
      case Geometry.GeometryTypes.MULTIPOINTM:
      case Geometry.GeometryTypes.MULTIPOINTZM:
      case Geometry.GeometryTypes.MULTIPOINT25D:
        geometryClass = ol.geom.MultiPoint;
        break;
      default:
        geometryClass = ol.geom.Point;
    }
    const geometry = new geometryClass(coordinates);
    return geometry
  },

  getDefaultLayerStyle(geometryType, options={}){
    const {color} = options;
    switch (geometryType) {
      case Geometry.GeometryTypes.LINESTRINGZ:
      case Geometry.GeometryTypes.LINESTRINGM:
      case Geometry.GeometryTypes.LINESTRINGZM:
      case Geometry.GeometryTypes.LINESTRING25D:
      case Geometry.GeometryTypes.LINE:
      case Geometry.GeometryTypes.LINEZ:
      case Geometry.GeometryTypes.LINEM:
      case Geometry.GeometryTypes.LINEZM:
      case Geometry.GeometryTypes.LINE25D:
        geometryType = 'LineString';
        break;
      case Geometry.GeometryTypes.MULTILINESTRINGZ:
      case Geometry.GeometryTypes.MULTILINESTRINGM:
      case Geometry.GeometryTypes.MULTILINESTRINGZM:
      case Geometry.GeometryTypes.MULTILINESTRING25D:
      case Geometry.GeometryTypes.MULTILINE:
      case Geometry.GeometryTypes.MULTILINEZ:
      case Geometry.GeometryTypes.MULTILINEM:
      case Geometry.GeometryTypes.MULTILINEZM:
      case Geometry.GeometryTypes.MULTILINE25D:
        geometryType = 'MultiLineString';
        break;
      case Geometry.GeometryTypes.POINTZ:
      case Geometry.GeometryTypes.POINTM:
      case Geometry.GeometryTypes.POINTZM:
      case Geometry.GeometryTypes.POINT25D:
        geometryType = 'Point';
        break;
      case Geometry.GeometryTypes.MULTIPOINTZ:
      case Geometry.GeometryTypes.MULTIPOINTM:
      case Geometry.GeometryTypes.MULTIPOINTZM:
      case Geometry.GeometryTypes.MULTIPOINT25D:
        geometryType = 'MultiPoint';
        break;
      case Geometry.GeometryTypes.POLYGONZ:
      case Geometry.GeometryTypes.POLYGONM:
      case Geometry.GeometryTypes.POLYGONZM:
      case Geometry.GeometryTypes.POLYGON25D:
        geometryType = 'Polygon';
        break;
      case Geometry.GeometryTypes.MULTIPOLYGONZ:
      case Geometry.GeometryTypes.MULTIPOLYGONM:
      case Geometry.GeometryTypes.MULTIPOLYGONZM:
      case Geometry.GeometryTypes.MULTIPOLYGON25D:
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

  createFeatureFromCoordinates(coordinates){
    let feature;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const geometry = new ol.geom.Point(coordinates);
      feature = new ol.Feature(geometry);
    }
    return feature;
  },

  createFeatureFromBBOX(bbox){
    let feature;
    if (Array.isArray(bbox) && bbox.length === 4) {
      const geometry = ol.geom.Polygon.fromExtent(bbox);
      feature = new ol.Feature(geometry)
    }
    return feature;
  },

  createFeatureFromGeometry({id,geometry}={}){
    if (geometry) {
      const feature = new ol.Feature(geometry);
      id && feature.setId(id);
      return feature;
    }
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
        case Geometry.GeometryTypes.POINT:
        case Geometry.GeometryTypes.POINTZ:
        case Geometry.GeometryTypes.POINTM:
        case Geometry.GeometryTypes.POINTZM:
        case Geometry.GeometryTypes.POINT25D:
        case Geometry.GeometryTypes.MULTIPOINT:
        case Geometry.GeometryTypes.MULTIPOINTZ:
        case Geometry.GeometryTypes.MULTIPOINTM:
        case Geometry.GeometryTypes.MULTIPOINTZM:
        case Geometry.GeometryTypes.MULTIPOINT25D:
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
        case Geometry.GeometryTypes.LINESTRINGZ:
        case Geometry.GeometryTypes.LINESTRINGM:
        case Geometry.GeometryTypes.LINESTRINGZM:
        case Geometry.GeometryTypes.LINESTRING25D:
        case Geometry.GeometryTypes.MULTILINESTRING:
        case Geometry.GeometryTypes.MULTILINESTRINGZ:
        case Geometry.GeometryTypes.MULTILINESTRINGM:
        case Geometry.GeometryTypes.MULTILINESTRINGZM:
        case Geometry.GeometryTypes.MULTILINESTRING25D:
        case Geometry.GeometryTypes.LINE:
        case Geometry.GeometryTypes.LINEZ:
        case Geometry.GeometryTypes.LINEM:
        case Geometry.GeometryTypes.LINEZM:
        case Geometry.GeometryTypes.LINE25D:
        case Geometry.GeometryTypes.MULTILINE:
        case Geometry.GeometryTypes.MULTILINEZ:
        case Geometry.GeometryTypes.MULTILINEM:
        case Geometry.GeometryTypes.MULTILINEZM:
        case Geometry.GeometryTypes.MULTILINE25D:
          style = new ol.style.Style({
            stroke: new ol.style.Stroke({
              width: 3,
              color
            })
          });
          break;
        case Geometry.GeometryTypes.POLYGON:
        case Geometry.GeometryTypes.POLYGONZ:
        case Geometry.GeometryTypes.POLYGONM:
        case Geometry.GeometryTypes.POLYGONZM:
        case Geometry.GeometryTypes.POLYGON25D:
        case Geometry.GeometryTypes.MULTIPOLYGON:
        case Geometry.GeometryTypes.MULTIPOLYGONZ:
        case Geometry.GeometryTypes.MULTIPOLYGONM:
        case Geometry.GeometryTypes.MULTIPOLYGONZM:
        case Geometry.GeometryTypes.MULTIPOLYGON25D:
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
          features
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
        format = new ol.format.KML({
          extractStyles: false
        });
        layer = createVectorLayer(format, data,  "EPSG:4326");
        break;
      case 'csv':
        const {headers, separator, values, x, y} = data;
        const features = [];
        const errorrows = [];
        values.forEach((row, index) =>{
          const properties = {};
          const rowvalues = row.split(separator);
          if (rowvalues.length === headers.length)  {
            const coordinates = [];
            rowvalues.forEach((value, index) =>{
              const field = headers[index];
              if (field === x) coordinates[0] = 1*value;
              if (field === y) coordinates[1] = 1*value;
              properties[field] = value;
            });
            // check if all coordinates is right
            if (coordinates.find(value => Number.isNaN(value)) === undefined){
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
        if (errorrows.length){
          GUI.showUserMessage({
            type: 'warning',
            message: 'sdk.mapcontrols.addlayer.messages.csv.warning',
            hooks: {
              footer: {
                template: `<select v-select2="errorrows[0].value" class="skin-color" :search="false" style="width:100%">
                    <option v-for="errorrow in errorrows" :key="errorrow.row" :value="errorrow.value">[{{ errorrow.row}}] {{errorrow.value}}</option>
                </select>`,
                data(){
                  return {
                    errorrows
                  };
                }
              }
            },
            autoclose: false
          });
        }

        const source = new ol.source.Vector({
          features
        });
        layer = new ol.layer.Vector({
          source,
          name,
          _fields: headers,
          id: uniqueId()
        });
        style && layer.setStyle(style);
        break;
      case 'zip':
        const promise = new Promise(async (resolve, reject) =>{
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

  createStyleFunctionToVectorLayer(options={}){
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
   *
   * @param layers
   * @param bbox
   * @param feature_count
   * @param multilayers
   * @returns {JQuery.Promise<any, any, any>}
   */
  getQueryLayersPromisesByBBOX(layers, { bbox, filterConfig={}, feature_count=10, multilayers=false}){
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
        projection:mapProjection
      })
    } else {
      const d = $.Deferred();
      const mapCrs = mapProjection.getCode();
      queriesPromise = d.promise();
      const queryResponses = [];
      const queryErrors = [];
      let layersLenght = layers.length;
      layers.forEach(layer => {
        const filter = new Filter(filterConfig);
        const layerCrs = layer.getProjection().getCode();
        /**
         * convert
         */
        filter.setGeometry((mapCrs !== layerCrs) ? geometry.clone().transform(mapCrs, layerCrs): geometry);
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
        const layerCrs = multilayer.getProjection().getCode();
        if (mapCrs !== layerCrs) filterGeometry = filterGeometry.clone().transform(mapCrs, layerCrs);
        filter.setGeometry(filterGeometry);
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
            filterConfig,
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

  getMapLayerById(layerId) {
    return MapLayersStoreRegistry.getLayerById(layerId);
  },

  //return mapLayer based on filter (properties of layer. Es GEOLAYER etc..)
  //Default values geolayer
  getMapLayersByFilter(filter={}, options={}) {
    filter = {
      GEOLAYER: true,
      ...filter
    };
    let layers = [];
    MapLayersStoreRegistry.getQuerableLayersStores().forEach(layerStore => {
      layers = layerStore.getLayers(filter, options);
    });
    return layers || [];
  },

  areCoordinatesEqual(coordinates1=[], coordinates2=[]) {
    return (coordinates1[0]===coordinates2[0] && coordinates1[1]===coordinates2[1]);
  },

  getFeaturesFromResponseVectorApi(response={}) {
    if (response.result) {
      const features = response.vector.data.features || [];
      return features;
    } else return null;
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
      if (isZType){
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
            if (isZType){
              const coordinates = lineNewSegment.getCoordinates();
              lineNewSegment.setCoordinates([[...coordinates[0], startPoint.z],[...coordinates[1], splitPoint.z]])
            }
            splittedSegments.push(lineNewSegment);
            pointsNotSplitted = [];
          } else {
            const lineNewSegment = olFromJsts.write(geometryFactory.createLineString([startPoint, splitPoint]));
            if (isZType){
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
    if (isZType){
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
    // array of splitted geometries
    const splittedFeatureGeometries = [];
    const parser = new jsts.io.OL3Parser();
    switch (splitType){
      case 'LineString':
        // check if geometry is Polygon
        if (featureGeometryType.indexOf('Polygon') !== -1 ) {
          // check if is a MultiPolygon
          const isMulti = featureGeometryType.indexOf('Multi') !== -1;
          // if multiPolygon
          const polygonFeature = isMulti ? geometries.feature.getPolygons() : geometries.feature;
          if (Array.isArray(polygonFeature)) {
            polygonFeature.forEach(geometry =>{
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
              for (let index=1; index < polygonFeature.getLinearRingCount(); index++){
                const holeRing = parser.read(polygonFeature.getLinearRing(index));
                if (holeFeaturesGeometry === undefined) holeFeaturesGeometry = holeRing;
                else holeFeaturesGeometry = holeFeaturesGeometry.union(holeRing);
              }
              holePolygons = new jsts.operation.polygonize.Polygonizer();
              holePolygons.add(holeFeaturesGeometry);
              let holyPolygonUnion;
              holePolygons.getPolygons().toArray().forEach(polygon =>{
                if (holyPolygonUnion === undefined) holyPolygonUnion = polygon;
                else holyPolygonUnion = holyPolygonUnion.union(polygon);
              });
              holePolygons = holyPolygonUnion;
            }

            if (isZType){
              polygonFeature.getCoordinates()[0].forEach((coordinate, index) =>{
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
                if (isZType){
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
                if (isMulti){
                  splittedFeatureGeometries.push(new ol.geom.MultiPolygon(geometryType=== 'Polygon' ? [geometry.getCoordinates()] : geometry.getCoordinates()))
                } else {
                  if (geometryType === 'Polygon'){
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
          if (dissolvedFeatuteGeometryCoordinates) baseFeature.getGeometry().setCoordinates(dissolvedFeatuteGeometryCoordinates);
          else dissolvedFeature = null;
        } else dissolvedFeature = null;
    }
    return dissolvedFeature;
  },

  normalizeEpsg(epsg) {
    if (typeof epsg === 'number') return `EPSG:${epsg}`;
    epsg = epsg.replace(/[^\d\.\-]/g, "");
    if (epsg !== '') return `EPSG:${parseInt(epsg)}`;
  },

  crsToCrsObject(crs){
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
   * Method to get geoiff file create by server
   *
   * @param options {
   *   url: server url end point
   *   method: "GET" or "POST" - default POST
   * }
   * @returns {Promise<Blob>}
   */
  async getGeoTIFFfromServer(options={}){
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
  }
};

module.exports = geoutils;
