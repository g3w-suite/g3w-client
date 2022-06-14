import CONSTANT from 'constant';
import utils from 'core/utils/utils';
import Filter from 'core/layers/filter/filter';
import Geometry from 'core/geometry/geometry';
import GUI from 'gui/gui';
import WMSLayer  from 'core/layers/map/wmslayer';
import responseParser  from 'core/parsers/response/parser';
import MapLayersStoreRegistry  from 'core/map/maplayersstoresregistry';
import {Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon} from 'ol/geom';
import {fromExtent} from 'ol/geom/Polygon';
import geom from 'ol/geom';
import {Style, Circle, Stroke, Fill, Icon, Text} from 'ol/style';
import {Feature} from "ol";
import {Vector as VectorLayer} from "ol/layer";
import {Vector as VectorSource} from "ol/source";
import {Collection} from "ol";
import {GPX, GeoJSON, WMSGetFeatureInfo, KML, WKT} from "ol/format";
import {asArray, asString} from 'ol/color';


export const geometryFields = CONSTANT.GEOMETRY_FIELDS;
const {QUERY_POINT_TOLERANCE, G3W_FID} = CONSTANT;
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
        geometryClass = Polygon;
        break;
      case Geometry.GeometryTypes.MULTIPOLYGON:
      case Geometry.GeometryTypes.MULTIPOLYGONZ:
      case Geometry.GeometryTypes.MULTIPOLYGONM:
      case Geometry.GeometryTypes.MULTIPOLYGONZM:
      case Geometry.GeometryTypes.MULTIPOLYGON25D:
        geometryClass = MultiPolygon;
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
        geometryClass = LineString;
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
        geometryClass = MultiLineString;
        break;
      case Geometry.GeometryTypes.POINT:
      case Geometry.GeometryTypes.POINTZ:
      case Geometry.GeometryTypes.POINTM:
      case Geometry.GeometryTypes.POINTZM:
      case Geometry.GeometryTypes.POINT25D:
        geometryClass = Point;
        break;
      case Geometry.GeometryTypes.MULTIPOINT:
      case Geometry.GeometryTypes.MULTIPOINTZ:
      case Geometry.GeometryTypes.MULTIPOINTM:
      case Geometry.GeometryTypes.MULTIPOINTZM:
      case Geometry.GeometryTypes.MULTIPOINT25D:
        geometryClass = MultiPoint;
        break;
      default:
        geometryClass = Point;
    }
    const geometry = new geometryClass(coordinates);
    return geometry
  },
  getDefaultLayerStyle(geometryType, options={}) {
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
      'Point': new Style({
        image: new Circle({
          fill: new Fill({
            color
          }),
          radius: 5,
          stroke: new Stroke({
            color,
            width: 1
          })
        })
      }),
      'LineString': new Style({
        stroke: new Stroke({
          color,
          width: 3
        })
      }),
      'Polygon': new Style({
        fill: new Fill({
          color: 'rgba(255,255,255,0.5)'
        }),
        stroke: new Stroke({
          color,
          width: 3
        })
      }),
      'MultiPoint': new Style({
        image: new Circle({
          fill: new Fill({
            color
          }),
          radius: 5,
          stroke: new Stroke({
            color,
            width: 1
          })
        })
      }),
      'MultiLineString': new Style({
        stroke: new Stroke({
          color,
          width: 3
        })
      }),
      'MultiPolygon': new Style({
        fill: new Fill({
          color: 'rgba(255,255,255,0.5)'
        }),
        stroke: new Stroke({
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
              styles.image = new Icon({
                src: config.icon.url,
                imageSize: config.icon.width
              })
            }
            break;
          case 'line':
            styles.stroke = new Stroke({
              color: config.color,
              width: config.width
            });
            break;
          case 'polygon':
            styles.fill = new Fill({
              color: config.color
            });
            break
        }
      });
      style = new Style(styles);
    }
    return style
  },

  createFeatureFromCoordinates(coordinates) {
    let feature;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const geometry = new Point(coordinates);
      feature = new Feature(geometry);
    }
    return feature;
  },

  createFeatureFromBBOX(bbox) {
    let feature;
    if (Array.isArray(bbox) && bbox.length === 4) {
      const geometry = Polygon.fromExtent(bbox);
      feature = new Feature(geometry)
    }
    return feature;
  },

  createFeatureFromGeometry({id,geometry}={}) {
    if (geometry) {
      const feature = new Feature(geometry);
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
    const olSource = options.source || new VectorSource({
      features: features || new Collection()
    });
    const olLayer = new VectorLayer({
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
          style = new Style({
            image: new Circle({
              radius: 5,
              fill: new Fill({
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
          style = new Style({
            stroke: new Stroke({
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
          style =  new Style({
            stroke: new Stroke({
              color:  "#000000",
              width: 1
            }),
            fill: new Fill({
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
    const {uniqueId} = utils;
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
    const feature = new Feature(geometry);
    return geoutils.createVectorLayerFromFeatures(feature);
  },

  createVectorLayerFromFeatures(feature) {
    return new VectorLayer({
      source: new VectorSource({
        features: Array.isArray(feature) ? feature : [feature]
      })
    })
  },

  async createVectorLayerFromFile({name, type, crs, mapCrs, data, style} ={}) {
    let format;
    let layer;
    const {uniqueId} = utils;
    const createVectorLayer = (format, data, epsg=crs) => {
      let vectorLayer;
      const features = format.readFeatures(data, {
        dataProjection: epsg,
        featureProjection: mapCrs || epsg
      });
      if (features.length) {
        const vectorSource = new VectorSource({
          features
        });
        vectorLayer = new VectorLayer({
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
        format = new GPX();
        layer = createVectorLayer(format, data);
        break;
      case 'gml':
        format = new WMSGetFeatureInfo();
        layer = createVectorLayer(format, data);
        break;
      case 'geojson':
        format = new GeoJSON();
        layer = createVectorLayer(format, data);
        break;
      case 'kml':
        format = new KML({
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
            if (coordinates.find(value => Number.isNaN(value)) === undefined) {
              const geometry = new Point(coordinates);
              if (crs !== mapCrs) geometry.transform(crs, mapCrs);
              const feature = new Feature(geometry);
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

        const source = new VectorSource({
          features
        });
        const {uniqueId} = utils;
        layer = new VectorLayer({
          source,
          name,
          _fields: headers,
          id: uniqueId()
        });
        style && layer.setStyle(style);
        break;
      case 'kmz':
        const promiseKmz = new Promise(async (resolve, reject) => {
          const zip = new JSZip();
          const buffer = await data.arrayBuffer(data);
          zip.load(buffer);
          const kmlFile = zip.file(/.kml$/i)[0];
          if (kmlFile) {
            data = kmlFile.asText();
            format = new KML({
              extractStyles: false
            });
            resolve(createVectorLayer(format, data, "EPSG:4326"));
          } else reject();
        });
        try {
          return await promiseKmz;
        } catch(err) {
          return Promise.reject();
        }
        break;
      case 'zip':
        const promise = new Promise(async (resolve, reject) =>{
          const buffer = await data.arrayBuffer(data);
          shp(buffer).then(geojson => {
            const data = JSON.stringify(geojson);
            format = new GeoJSON({});
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
      field && style.setText(new Text({
        text: `${feature.get(field)}`,
        font: 'bold',
        scale: 2,
        offsetY: 15,
        fill: new Fill({
          color
        }),
        stroke: new Stroke(({
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
      style = new Style({
        stroke: new Stroke({
          color,
          width: 4
        })
      });
    } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
      style = new Style({
        image: new Circle({
          radius: 6,
          stroke: !fill && new Stroke({
            color,
            width: 4
          }),
          fill: fill && new Fill({
            color
          })
        }),
        zIndex: Infinity
      });
    } else if (geometryType === 'MultiPolygon' || geometryType === 'Polygon') {
      const fillColor = asArray(color);
      fillColor.splice(3,1,0.5);
      style = new Style({
        stroke: new Stroke({
          color,
          width: 4
        }),
        fill: fill && new Fill({
          color: asString(fillColor)
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
    const _feature = new Feature(feature.geometry);
    const properties = {};
    geoutils.getAlphanumericPropertiesFromFeature(feature.attributes).forEach(property =>{
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
    const GeoJSONFormat = new GeoJSON();
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
    const geometry = fromExtent(bbox);
    const map = GUI.getService('map').getMap();
    const mapProjection = map.getView().getProjection();
    console.log(map)
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
    const map = GUI.getService('map').getMap();
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

  transformBBOX({bbox, sourceCrs, destinationCrs}={}) {
    const point1 = new Point([bbox[0], bbox[1]]);
    const point2 = new Point([bbox[2], bbox[3]]);
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
    const wktFromOl = new WKT();
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
            polygonFeature.forEach(geometry =>{
              geoutils.splitFeature({
                splitfeature,
                feature: new Feature({
                  geometry
                })
              }).forEach(geometry => {
                geometry && splittedFeatureGeometries.push(new MultiPolygon([geometry.getCoordinates()]))
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
              holePolygons.getPolygons().toArray().forEach(polygon =>{
                if (holyPolygonUnion === undefined) holyPolygonUnion = polygon;
                else holyPolygonUnion = holyPolygonUnion.union(polygon);
              });
              holePolygons = holyPolygonUnion;
            }

            if (isZType) {
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
                  splittedFeatureGeometries.push(new MultiPolygon(geometryType=== 'Polygon' ? [geometry.getCoordinates()] : geometry.getCoordinates()))
                } else {
                  if (geometryType === 'Polygon') {
                    splittedFeatureGeometries.push(geometry);
                  } else geometry.getCoordinates().forEach(coordinates => {
                    splittedFeatureGeometries.push(new Polygon(coordinates))
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
                feature: new Feature({
                  geometry: lineGeometry
                })
              }).forEach(geometry => {
                geometry && splittedFeatureGeometries.push(new MultiLineString([geometry.getCoordinates()]))
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
      case Geometry.GeometryTypes.MULTIPOLYGON:
        geometry.getCoordinates().forEach(coordinates =>{
          coordinates.forEach(coordinates =>{
            coordinates.pop();
            coordinates.forEach(coordinates =>{
              const feature = new Feature(new Point(coordinates));
              pointFeatures.push(feature);
            })
          })
        });
        break;
      case Geometry.GeometryTypes.POLYGON:
        geometry.getCoordinates().forEach(coordinates =>{
          coordinates.pop();
          coordinates.forEach(coordinates =>{
            const feature = new Feature(new Point(coordinates));
            pointFeatures.push(feature);
          })
        });
        break;
      case Geometry.GeometryTypes.MULTILINESTRING:
        geometry.getCoordinates().forEach(coordinates =>{
          coordinates.forEach(coordinates =>{
            const feature = new Feature(new Point(coordinates));
            pointFeatures.push(feature);
          })
        });
        break;
      case Geometry.GeometryTypes.LINESTRING:
        geometry.getCoordinates().forEach(coordinates =>{
          coordinates.forEach(coordinates =>{
            const feature = new Feature(new Point(coordinates));
            pointFeatures.push(feature);
          })
        });
        break;
      case Geometry.GeometryTypes.MULTIPOINT:
        geometry.getCoordinates().forEach(coordinates =>{
          const feature = new Feature(new Point(coordinates));
          pointFeatures.push(feature);
        });
        break;
      case Geometry.GeometryTypes.POINT:
        const coordinates =  geometry.getCoordinates();
        const feature = new Point(coordinates);
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
      case Geometry.GeometryTypes.MULTIPOLYGON:
        geometry.getCoordinates().forEach(coordinates =>{
          coordinates.forEach(coordinates =>{
            coordinates.pop();
            coordinates.forEach(() => vertexLength+=1);
          })
        });
        break;
      case Geometry.GeometryTypes.POLYGON:
        geometry.getCoordinates().forEach(coordinates =>{
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

  isMultiGeometry(geometry) {
    return !Geometry.isMultiGeometry(geometry.getType());
  },

  singleGeometriesToMultiGeometry(geometries=[]) {
    const geometryType = geometries[0] && geometries[0].getType();
    return geometryType && new geom[`Multi${geometryType}`](geometries.map(geometry => geometry.getCoordinates()))
  },

  multiGeometryToSingleGeometries(geometry) {
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
  /**
   * Convert geometry to geometryType (from Single to Multi or viceversa)
   * @param geometry //from geometry
   * @param toGeometryType
   * @returns {*}
   */
  convertSingleMultiGeometry(geometry, toGeometryType) {
      if (toGeometryType) {
        const isFromGeometryMulti = geoutils.isMultiGeometry(geometry);
        const isToGeometryMulti = Geometry.isMultiGeometry(toGeometryType);
        if (isFromGeometryMulti && !isToGeometryMulti) return geoutils.multiGeometryToSingleGeometries(geometry);
        else if (!isFromGeometryMulti && isToGeometryMulti) return geoutils.singleGeometriesToMultiGeometry(geometry);
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
    const {toRawType} = utils;
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
    const Feature = new Feature(geometry && new geom[geometry.type](geometry.coordinates));
    Feature.setProperties(properties);
    Feature.setId(id);
    return Feature;
  },

  sanitizeFidFeature(fid) {
    const {toRawType} = utils;
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
  }
};

export default geoutils;

