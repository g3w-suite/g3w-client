import ApplicationState from 'store/application-state';
import RelationsService from 'services/relations';

const { base, inherit, XHR } = require('core/utils/utils');
const { t } = require('core/i18n/i18n.service');
const DataProvider = require('core/layers/providers/provider');
const { response: responseParser } = require('core/utils/parsers');
const Feature = require('core/layers/features/feature');
const Parsers = require('core/utils/parsers');

function QGISProvider(options = {}) {
  base(this);
  this._name = 'qgis';
  this._layer = options.layer || {};
  this._projections = {
    map: null,
    layer: null
  };
  // url referred to query
  this._queryUrl = this._layer.getUrl('query');
  //filtertokenurl
  this._filtertokenUrl = this._layer.getUrl('filtertoken');
  // layer name
  this._layerName = this._layer.getName() || null; // get name  from QGIS layer, because the query are proxed from g3w-server
  this._infoFormat = this._layer.getInfoFormat() || 'application/vnd.ogc.gml';
}

inherit(QGISProvider, DataProvider);

const proto = QGISProvider.prototype;
/*
* token: current token if provide
* action: create, update, delete
* */

proto.deleteFilterToken = async function(){
  await XHR.get({
    url: this._filtertokenUrl,
    params:{
      mode: 'delete'
    }
  })
};

proto.getFilterToken = async function(params={}){
  try {
    const {data={} } = await XHR.get({
      url: this._filtertokenUrl,
      params
    });
    return data.filtertoken;
  } catch(err){
    return Promise.reject(err);
  }
};

proto.getFilterData = async function({field, raw=false, suggest={}, unique, formatter=1, queryUrl, ordering}={}){
  const dataUrl = this._layer.getUrl('data');
  const params = {
    field,
    suggest,
    ordering,
    formatter,
    unique,
    filtertoken: ApplicationState.tokens.filtertoken
  };
  try {
    let response = await XHR.get({
      url: `${queryUrl ?  queryUrl : dataUrl}`,
      params
    });
    const isVector = this._layer.getType() !== "table";
    isVector && this.setProjections();
    const data = raw ? response : response.result ?  unique ? response.data :  {
      data: responseParser.get('application/json')({
        layers: [this._layer],
        response:response.vector.data,
        projections: this._projections
      })
    }: Promise.reject();
    return data;
  } catch(error){
    return Promise.reject(error);
  }
};

proto.setProjections = function() {
  //COMMENTED LAYER PROJECTION: EXPECT ONLY RESULT IN MAP PROJECTION
  //this._projections.layer = this._layer.getProjection();
  this._projections.map = this._layer.getMapProjection() || this._projections.layer;
};

//query by filter
proto.query = function(options={}) {
  return new Promise((resolve, reject) => {
    const feature_count = options.feature_count || 10;
    // parameter to get rwa response
    const raw = options.raw || false;
    let {filter=null} = options;
    filter = filter && Array.isArray(filter) ? filter : [filter];
    const isVector = this._layer.getType() !== "table";
    isVector && this.setProjections();
    const CRS = isVector ? this._projections.map.getCode() : ApplicationState.map.epsg;
    const queryUrl = options.queryUrl || this._queryUrl;
    const {I,J, layers} = options;
    const layerNames = layers ? layers.map(layer => layer.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();
    if (filter) {
      // check if geometry filter. If not i have to remove projection layer
      if (filter[0].getType() !== 'geometry') this._projections.layer = null;
      filter = filter.map(filter => filter.get()).filter(value => value);
      const url = queryUrl ;
      const params = {
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetFeatureInfo',
        filtertoken: ApplicationState.tokens.filtertoken,
        LAYERS: layerNames,
        QUERY_LAYERS: layerNames,
        INFO_FORMAT: this._infoFormat,
        FEATURE_COUNT: feature_count,
        CRS,
        I,
        J,
        FILTER: filter && filter.length ? filter.join(';') : undefined,
        WITH_GEOMETRY: isVector
      };
      XHR.get({
        url,
        params
      }).then(response => {
        const featuresForLayers = raw ? response : this.handleQueryResponseFromServer(response, this._projections, layers);
        resolve(featuresForLayers);
      }).catch(err => reject(err));
    } else reject();
  });
};

// get layer config
proto.getConfig = function() {
  return new Promise((resolve, reject) => {
    const url = this._layer.getUrl('config');
    if (!url) {
      reject('not valid url');
      return;
    }
    XHR.get({url})
      .then(config => resolve(config))
      .catch(err => reject(err));
  })
};

proto.getWidgetData = function(options={}) {
  const {type, fields} = options;
  const widgetUrls = this._layer.getUrl('widget');
  const url = widgetUrls[type];
  return XHR.get({
    url,
    params: {
      fields
    }
  });
};

// unlock feature
proto.unlock = function() {
  const unlockUrl =  this._layer.getUrl('unlock');
  return new Promise((resolve, reject) => {
    XHR.post({url:unlockUrl})
      .then(response => resolve(response))
      .catch(err => reject(err));
  })
};

// commit function
proto.commit = function(commitItems) {
  return new Promise((resolve, reject) => {
    //check if editing or not;
    const url = this._layer.getUrl('commit');
    const jsonCommits = JSON.stringify(commitItems);
    XHR.post({
      url,
      data: jsonCommits,
      contentType: "application/json"
    })
      .then(response => resolve(response))
      .catch(err => reject(err));
  });
};

// METHODS LOADING EDITING FEATURES (READ/WRITE) //
proto.getFeatures = function(options={}, params={}) {
  return new Promise((resolve, reject) => {
    // filter null value
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === void 0)
        delete params[key]
    });
    const layerType = this._layer.getType();
    // check if data are requested in read or write mode;
    let url;
    //set contentType
    const contentType = "application/json";
    //editing mode
    if (options.editing) {
      let promise;
      url = this._layer.getUrl('editing');
      if (!url) {
        reject('Url not valid');
        return;
      }
      const urlParams = $.param(params);
      url+=  urlParams ? '?' + urlParams : '';
      const features = [];
      let filter = options.filter || null;
      if (filter) {
        // filterbbox
        if (filter.bbox) {
          const bbox = filter.bbox;
          filter = {
            in_bbox: `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`,
            filtertoken: ApplicationState.tokens.filtertoken
          };
          const jsonFilter = JSON.stringify(filter);
          promise = XHR.post({
            url,
            data: jsonFilter,
            contentType
          })
          // filter fid
        } else if (filter.fid) {
          const options = filter.fid;
          promise = RelationsService.getRelations(options);
        } else if (filter.field) {
          const jsonFilter = JSON.stringify(filter);
          promise = XHR.post({
            url,
            data: jsonFilter,
            contentType
          })
        } else if (filter.fids){
          promise = XHR.get({
            url,
            params: filter
          })
        } else if (filter.nofeatures){
          const jsonFilter = JSON.stringify({
            field: `${filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__`
          });
          promise = XHR.post({
            url,
            data: jsonFilter,
            contentType
          })
        }
      } else promise = XHR.post({url,contentType});
      promise.then(response => {
        const {vector, result, featurelocks} = response;
        if (result) {
          const {data, geometrytype, count} = vector;
          const parser = Parsers[layerType].get({
            type: 'json'
          });
          //const parser_options = (geometrytype !== 'NoGeometry') ? { crs: this._layer.getCrs(), mapCrs: this._layer.getMapCrs() } : {};
          const parser_options = (geometrytype !== 'NoGeometry') ? { crs: this._layer.getCrs() } : {};
          //get lockIds
          const lockIds = featurelocks.map(featureLock => {
            return featureLock.featureid
          });
          parser(data, parser_options).forEach(feature => {
            const featureId = `${feature.getId()}`;
            if (lockIds.indexOf(featureId) > -1) {
              features.push(new Feature({
                feature
              }));
            }
          });
          // resolve with features locked and requested
          resolve({
            count, // real number of feature that request will return
            features, // feature object returned
            featurelocks // features locked
          });
        } else {// case when server responde with result false (error)
          reject({
            message: t("info.server_error")
          });
        }
      })
        .catch(err => reject({ message: t("info.server_error")}));
    } else {
      url = this._layer.getUrl('data');
      const urlParams = $.param(params);
      url+= urlParams ? '?' + urlParams : '';
      XHR.get({
        url
      })
        .then(response => {
          const vector = response.vector;
          const data = vector.data;
          resolve({
            data,
            count: vector.count
          })
        })
        .catch(err => reject(err))
    }
  })
};

proto._loadLayerData = function(mode, customUrlParameters) {
  return new Promise((resolve, reject) => {
    Object.entries(this._layers).forEach(([layerCode, layer]) => {
      if (_.isNull(layer.vector)) noVectorlayerCodes.push(layerCode);
    });
    const vectorLayersSetup = noVectorlayerCodes.map(layerCode => this._setupVectorLayer(layerCode));
    this.emit('loadingvectorlayersstart');
    $.when.apply(this, vectorLayersSetup)
      .then(() => {
        const vectorLayersCodes = Array.prototype.slice.call(arguments);
        this.emit('loadingvectolayersdatastart');
        this.loadAllVectorsData(vectorLayersCodes)
          .then(() => {
            this._vectorLayersCodes = vectorLayersCodes;
            resolve(vectorLayersCodes);
            this.emit('loadingvectorlayersend');
            this.setReady(true);
          })
          .catch(() =>  {
            this._layers.forEach(layer => layer.vector = null);
            reject();
            this.emit('errorloadingvectorlayersend');
            this.setReady(false);
          })
      })
      .catch(() => {
        this.setReady(false);
        this.emit('errorloadingvectorlayersend');
        reject();
      });
  });
};

proto.setVectorLayersCodes = function(vectorLayersCodes) {
  this._vectorLayersCodes = vectorLayersCodes;
};

proto.getVectorLayersCodes = function() {
  return this._vectorLayersCodes;
};

proto.getLayers = function() {
  return this._layers;
};

proto.reloadVectorData = function(layerCode) {
  return new Promise((resolve, reject) =>{
    const bbox = this._mapService.state.bbox;
    this._createVectorLayerFromConfig(layerCode)
      .then(vectorLayer => {
        this._getVectorLayerData(vectorLayer, bbox)
          .then((vectorDataResponse) => {
            this.setVectorLayerData(vectorLayer[this._editingApiField], vectorDataResponse);
            vectorLayer.setData(vectorDataResponse.vector.data);
            resolve(vectorLayer);
          });
      });
  })
};

proto.loadAllVectorsData = function(layerCodes) {
  return new Promise((resolve, reject) => {
    let layers = this._layers;
    const bbox = this._mapService.state.bbox;
    const loadedExtent = this._loadedExtent;
    if (loadedExtent && ol.extent.containsExtent(loadedExtent, bbox)) {
      return resolvedValue();
    }
    this._loadedExtent = !loadedExtent ? bbox : ol.extent.extend(loadedExtent, bbox);
    if (layerCodes) {
      layers = [];
      layerCodes.forEach(layerCode => layers.push(this._layers[layerCode]));
    }
    const vectorDataRequests = layers.map(Layer => this._loadVectorData(Layer.vector, bbox));

    $.when.apply(this, vectorDataRequests)
      .then(() => resolve(layerCodes))
      .catch(() => reject());
  })
};

proto._setCustomUrlParameters = function(customUrlParameters) {
  this._customUrlParameters = customUrlParameters;
};

proto._checkVectorGeometryTypeFromConfig = function(vectorConfig) {
  switch (vectorConfig.geometrytype) {
    case 'Line':
      vectorConfig.geometrytype = 'LineString';
      break;
    case 'MultiLine':
      vectorConfig.geometrytype = 'MultiLineString';
      break;
  }
  return vectorConfig;
};

proto._createVectorLayerFromConfig = function(layerCode) {
  const layerConfig = this._layers[layerCode];
  return new Promise((resolve, reject) => {
    this._getVectorLayerConfig(layerConfig[this._editingApiField])
      .then(vectorConfigResponse => {
        let vectorConfig = vectorConfigResponse.vector;
        vectorConfig = this._checkVectorGeometryTypeFromConfig(vectorConfig);
        const crsLayer = layerConfig.crs || this._mapService.getProjection().getCode();
        const vectorLayer = this._createVectorLayer({
          geometrytype: vectorConfig.geometrytype,
          format: vectorConfig.format,
          crs: this._mapService.getProjection().getCode(),
          crsLayer : crsLayer,
          id: layerConfig.id,
          name: layerConfig.name,
          editing: self._editingMode
        });
        vectorLayer.setFields(vectorConfig.fields);
        vectorLayer.setCrs(crsLayer);
        const relations = vectorConfig.relations;
        if (relations) {
          vectorLayer.lazyRelations = true;
          vectorLayer.setRelations(relations);
        }
        if (layerConfig.style) vectorLayer.setStyle(layerConfig.style);
        resolve(vectorLayer);
      })
      .catch(() => reject());
  })
};

proto._setupVectorLayer = function(layerCode) {
  return new Promise((resolve, reject) => {
    this._createVectorLayerFromConfig(layerCode)
      .then(vectorLayer => {
        const layerConfig = this._layers[layerCode];
        layerConfig.vector = vectorLayer;
        resolve(layerCode);
      })
      .catch(() => reject());
  })
};

proto._loadVectorData = function(vectorLayer, bbox) {
  return self._getVectorLayerData(vectorLayer, bbox)
    .then(vectorDataResponse => {
      this.setVectorLayerData(vectorLayer[this._editingApiField], vectorDataResponse);
      if (this._editingMode && vectorDataResponse.featurelocks) {
        this.setVectorFeaturesLock(vectorLayer, vectorDataResponse.featurelocks);
      }
      vectorLayer.setData(vectorDataResponse.vector.data);
      if (this._) return vectorDataResponse;
    })
    .catch(() => {
      return false;
    })
};

proto.getVectorLayerData = function(layerCode) {
  return this._vectorLayersData[layerCode];
};

proto.getVectorLayersData = function() {
  return this._vectorLayersData;
};

proto.setVectorLayerData = function(layerCode, vectorLayerData) {
  this._vectorLayersData[layerCode] = vectorLayerData;
};

proto.setVectorFeaturesLock = function(vectorLayer, featureslock) {
  const newFeaturesLockIds = _.differenceBy(featureslock, vectorLayer.getFeatureLocks(), 'featureid');
  newFeaturesLockIds.forEach((newLockId) => {
    vectorLayer.addLockId(newLockId)
  });
};

proto.cleanVectorFeaturesLock = function(vectorLayer) {
  vectorLayer.cleanFeatureLocks();
};

proto.lockFeatures = function(layerName) {
  return new Promise((resolve, reject) => {
    const bbox = this._mapService.state.bbox;
    const vectorLayer = this._layers[layerName].vector;
    XHR.get({url: this._baseUrl+layerName+"/?lock" + this._customUrlParameters+"&in_bbox=" + bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3]})
      .then(data => {
        this.setVectorFeaturesLock(vectorLayer, data.featurelocks);
        resolve(data);
      })
      .catch(() => reject());
  })
};

proto._getVectorLayerConfig = function(layerApiField) {
  return new Promise((resolve, reject)=> {
    XHR.get({url: this._baseUrl+layerApiField+"/?config"+ this._customUrlParameters})
      .then(data => resolve(data))
      .catch(() => reject());
  })
};

proto._getVectorLayerData = function(vectorLayer, bbox) {
 return new Promise((resolve, reject) => {
   const lock = this.getMode() == 'w' ? true : false;
   const apiUrl = lock ? this._baseUrl+vectorLayer[this._editingApiField]+"/?editing" : this._baseUrl+vectorLayer[this._editingApiField]+"/?";
   XHR.get({url: apiUrl + this._customUrlParameters+"&in_bbox=" + bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3]})
     .then(data => resolve(data))
     .catch(() => reject());
 })
};

proto._createVectorLayer = function(options={}) {
  const vector = new VectorLayer(options);
  return vector;
};

proto.cleanUpLayers = function() {
  this._loadedExtent = null;
};

module.exports = QGISProvider;
