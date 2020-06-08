const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const XHR = require('core/utils/utils').XHR;
const t = require('core/i18n/i18n.service').t;
const DataProvider = require('core/layers/providers/provider');
const RelationsService = require('core/relations/relationsservice');
const Feature = require('core/layers/features/feature');
const Parsers = require('core/parsers/parsers');

function QGISProvider(options = {}) {
  base(this);
  this._name = 'qgis';
  this._layer = options.layer || {};
  this._projections = {
    map: null,
    layer: null
  };
  this._unlockUrl = this._layer.getUrl('unlock');
  // url referred to query
  this._queryUrl = this._layer.getUrl('query');
  this._dataUrl = this._layer.getUrl('data');
  // editing url api
  this._editingUrl = this._layer.getUrl('editing');
  this._commitUrl = this._layer.getUrl('commit');
  // url to get configuration
  this._configUrl = this._layer.getUrl('config');
  // widget url
  this._widgetUrls = this._layer.getUrl('widget');
  // layer name
  this._layerName = this._layer.getName() || null; // get name  from QGIS layer, because the query are proxed from g3w-server
  this._infoFormat = this._layer.getInfoFormat() || 'application/vnd.ogc.gml';
}

inherit(QGISProvider, DataProvider);

const proto = QGISProvider.prototype;

//query by filter
proto.query = function(options={}) {
  const d = $.Deferred();
  const feature_count = options.feature_count || 10;
  const filter = options.filter || null;
  const isVector = this._layer.getType() !== "table";
  if (isVector) {
    this._projections.layer = this._layer.getProjection();
    this._projections.map = this._layer.getMapProjection() || this._projections.layer;
  }
  const crs = isVector ? this._layer.getSourceType() === 'spatialite' ? `EPSG:${this._layer.getCrs()}` : this._projections.map.getCode() : null;
  const queryUrl = options.queryUrl || this._queryUrl;
  const layers = options.layers;
  const {I,J} = options;
  const layerNames = layers ? layers.map(layer => layer.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();
  if (filter) {
    // check if geomemtry filter. If not i have to remove projection layer
    if (filter.getType() !== 'geometry' && this._layer.getSourceType() !== 'spatialite')
      this._projections.layer = null;
    const url = queryUrl ;
    const params = {
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      LAYERS: layerNames,
      QUERY_LAYERS: layerNames,
      INFO_FORMAT: this._infoFormat,
      FEATURE_COUNT: feature_count,
      CRS: crs,
      I,
      J,
      FILTER: filter.get(),
      WITH_GEOMETRY: isVector ? 1: 0
    };

    XHR.get({
      url,
      params
    }).then((response) => {
      const featuresForLayers = this.handleQueryResponseFromServer(response, this._projections, layers);
      d.resolve(featuresForLayers);
    }).catch((err) => {
      d.reject(err);
    });
  } else d.reject();
  return d.promise();
};

// get layer config
proto.getConfig = function() {
  const d = $.Deferred();
  const url = this._configUrl;
  if (!url) {
    d.reject('Url non valido');
    return;
  }
  $.get(url)
    .then((config) => {
      d.resolve(config);
    })
    .fail((err) => {
      d.reject(err);
    });
  return d.promise();
};

proto.getWidgetData = function(options) {
  options = options || {};
  const type = options.type;
  const fields = options.fields;
  const url = this._widgetUrls[type];
  return $.get(url, {
    fields: fields
  });
};

// unlock feature
proto.unlock = function() {
  const d = $.Deferred();
  $.post(this._unlockUrl)
    .then((response) => {
      d.resolve(response);
    })
    .fail((err) => {
      d.reject(err);
    });
  return d.promise()
};

// commit function
proto.commit = function(commitItems) {
  const d = $.Deferred();
  //check if editing or not;
  const url = this._commitUrl;
  const jsonCommits = JSON.stringify(commitItems);
  $.post({
    url: url,
    data: jsonCommits,
    contentType: "application/json"
  })
    .then(function(response) {
      d.resolve(response);
    })
    .fail(function(err) {
      d.reject(err);
    });
  return d.promise();
};

// METODS LOADING EDITING FEATURES (READ/WRITE) //
proto.getFeatures = function(options={}, params={}) {
  const d = $.Deferred();
  // filter null value
  Object.entries(params).forEach(([key, value]) => {
    if (value === null)
      delete params[key]
  });
  const layerType = this._layer.getType();
  // check if data are requested in read or write mode;
  let url;
  //editing mode
  if (options.editing) {
    let promise;
    url = this._editingUrl;
    if (!url) {
      d.reject('Url non valido');
      return;
    }
    const urlParams = $.param(params);
    url+=  urlParams ? '?' + urlParams : '';
    const features = [];
    let filter = options.filter || null;
    if (filter) {
      if (filter.bbox) {
        const bbox = filter.bbox;
        filter = {in_bbox: `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`};
        const jsonFilter = JSON.stringify(filter);
        promise = XHR.post({
          url,
          data: jsonFilter,
          contentType: "application/json"
        })
      } else if (filter.fid) {
        const options = filter.fid;
        promise = RelationsService.getRelations(options);
      }
    } else promise = XHR.post({url,contentType: "application/json"});
    promise.then((response) => {
        const {vector, result, featurelocks} = response;
        if (result) {
          const {data, geometrytype} = vector;
          const parser = Parsers[layerType].get({
            type: 'json'
          });
          const parser_options = (geometrytype !== 'NoGeometry') ? { crs: this._layer.getCrs() } : {};
          const lockIds = featurelocks.map((featureLock) => {
            return featureLock.featureid
          });
          parser(data, parser_options).forEach((feature) => {
            const featureId = `${feature.getId()}`;
            if (lockIds.indexOf(featureId) > -1) {
              features.push(new Feature({
                feature
              }));
            }
          });
          // resolve with featers locked and requested
          d.resolve({
            features,
            featurelocks
          });
        } else {// case when server responde with result false (error)
          d.reject({
            message: t("info.server_error")
          });
        }
      })
      .catch(function(err) {
        d.reject({
          message: t("info.server_error")
        });
      });
  } else {
    url = this._dataUrl;
    const urlParams = $.param(params);
    url+=  urlParams ? '?' + urlParams : '';
    $.get({
      url: url,
      contentType: "application/json"
    })
      .then((response) => {
        const vector = response.vector;
        const data = vector.data;
        count = vector.count;
        d.resolve({
          data,
          count
        })
      })
      .fail((err) => {
        d.reject(err)
      })
  }

  return d.promise();
};

// main function, starting point, is called to get vector data
proto._loadLayerData = function(mode, customUrlParameters) {
  const d = $.Deferred();
  //verifica se sono stati caricati i vettoriali dei layer
  // attraverso la proprietà vector del layer passato dal plugin
  Obkect.entries(this._layers).forEach(([layerCode, layer]) => {
    // verifico se l'attributo vector è nullo
    if (_.isNull(layer.vector)) {
      noVectorlayerCodes.push(layerCode);
    }
  });
  // eseguo le richieste delle configurazioni e mi tengo le promesse
  const vectorLayersSetup = noVectorlayerCodes.map((layerCode) => {
    return this._setupVectorLayer(layerCode);
  });
  // emetto l'evento loadingvectorlayersstart (il pluginservice è in ascolto)
  this.emit('loadingvectorlayersstart');
  // aspetto tutte le promesse del setup vector
  $.when.apply(this, vectorLayersSetup)
  // una volta che tutte le configurazioni dei layer vecor
  // sono state prese dal server e dopo aver assegnato all'attributo vector
  // del layer plugin il layer vettoriale costruito con le configurazioni
  // di sopra
    .then(() => {
      // le promesse ritornano il layerCode del layer vettoriale appena costuito
      const vectorLayersCodes = Array.prototype.slice.call(arguments);
      // emtto evento che inzia il recupero dei dati dei layer vettoriali (geojson)
      this.emit('loadingvectolayersdatastart');
      // inizio a caricare tutti i vettoriali dopo aver caricato le configurazioni
      this.loadAllVectorsData(vectorLayersCodes)
        .then(() => {
          this._vectorLayersCodes = vectorLayersCodes;
          d.resolve(vectorLayersCodes);
          // emtto evento che ho ricevuto i layers
          this.emit('loadingvectorlayersend');
          // ora il loader è pronto
          this.setReady(true);

        })
        .fail(() =>  {
          // risetto tutti i layer veetotiali a null
          this._layers.forEach((layer) => {
            layer.vector = null;
          });
          d.reject();
          // emttto che c'è stato un errore nel loading dei dati che vengono dal server
          this.emit('errorloadingvectorlayersend');
          this.setReady(false);
        })
    })
    .fail(() => {
      this.setReady(false);
      this.emit('errorloadingvectorlayersend');
      d.reject();
    });
  return d.promise();
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

// funzione che fa il reload che rihiede di nuovo il dati del vetor layer
// caso in cui si lavora con un layer vettoriale e non si usa un wms per fare la query
proto.reloadVectorData = function(layerCode) {
  const d = $.Deferred();
  const bbox = this._mapService.state.bbox;
  this._createVectorLayerFromConfig(layerCode)
    .then((vectorLayer) => {
      this._getVectorLayerData(vectorLayer, bbox)
        .then((vectorDataResponse) => {
          this.setVectorLayerData(vectorLayer[this._editingApiField], vectorDataResponse);
          vectorLayer.setData(vectorDataResponse.vector.data);
          d.resolve(vectorLayer);
        });
    });
  return d.promise();
};

//funzione che permette di ottenere tutti i dati relativi ai layer vettoriali caricati
//prima si è ottenuta la coinfigurazione, ora si ottengono i dati veri e propri
proto.loadAllVectorsData = function(layerCodes) {
  const d = $.Deferred();
  let layers = this._layers;
  // verifico che il BBOX attuale non sia stato già  caricato
  // prondo il bbox
  const bbox = this._mapService.state.bbox;
  const loadedExtent = this._loadedExtent;
  if (loadedExtent && ol.extent.containsExtent(loadedExtent, bbox)) {
    return resolvedValue();
  }
  if (!loadedExtent) {
    this._loadedExtent = bbox;
  } else {
    this._loadedExtent = ol.extent.extend(loadedExtent, bbox);
  }
  if (layerCodes) {
    layers = [];
    layerCodes.forEach((layerCode) => {
      layers.push(this._layers[layerCode]);
    });
  }
  //per ogni layer del plugin che non ha il layer vado a caricare i dati del layer vettoriale
  const vectorDataRequests = layers.map((Layer) => {
    return this._loadVectorData(Layer.vector, bbox);
  });

  $.when.apply(this, vectorDataRequests)
    .then(() => {
      d.resolve(layerCodes);
    })
    .fail(() => {
      d.reject();
    });

  return d.promise();
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
  // recupero la configurazione del layer settata da plugin service
  const layerConfig = this._layers[layerCode];
  const d = $.Deferred();
  // eseguo le richieste delle configurazioni
  this._getVectorLayerConfig(layerConfig[this._editingApiField])
    .then((vectorConfigResponse) => {
      let vectorConfig = vectorConfigResponse.vector;
      // vado a verificare la correttezza del geometryType (caso di editing generico)
      vectorConfig = this._checkVectorGeometryTypeFromConfig(vectorConfig);
      // una volta ottenuta dal server la configurazione vettoriale,
      // provvedo alla creazione del layer vettoriale
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
      // setto i campi del layer
      vectorLayer.setFields(vectorConfig.fields);
      vectorLayer.setCrs(crsLayer);
      // questo è la proprietà della configurazione del config layer
      // che specifica se esistono relazioni con altri layer
      // sono array di oggetti che specificano una serie di
      // informazioni su come i layer sono relazionati (nome della relazione == nome layer)
      // foreign key etc ..
      const relations = vectorConfig.relations;
      // nel caso il layer abbia relazioni (array non vuoto)
      if (relations) {
        // per dire a vectorLayer che i dati
        // delle relazioni verranno caricati solo quando
        // richiesti (es. aperture form di editing)
        vectorLayer.lazyRelations = true;
        //vado a settare le relazioni del vector layer
        vectorLayer.setRelations(relations);
      }
      // setto lo stile del layer OL
      if (layerConfig.style) {
        vectorLayer.setStyle(layerConfig.style);
      }
      // risolve con il nome del vectorLayer
      d.resolve(vectorLayer);
    })
    .fail(() => {
      d.reject();
    });
  return d.promise();
};

// funzione che dato la configurazione del layer fornito dal plugin (style, editor, vctor etc..)
// esegue richieste al server al fine di ottenere configurazione vettoriale del layer
proto._setupVectorLayer = function(layerCode) {
  const d = $.Deferred();
  // eseguo le richieste delle configurazioni
  this._createVectorLayerFromConfig(layerCode)
    .then((vectorLayer) => {
      const layerConfig = this._layers[layerCode];
      // assegno il vetorLayer appena creato all'attributo vector del layer
      layerConfig.vector = vectorLayer;
      // risolve con il nome del layerCode
      d.resolve(layerCode);
    })
    .fail(() => {
      d.reject();
    });
  return d.promise();
};

//in base all bbox e la layer chiedo al server di restituirmi il vettoriale (geojson) del layer
proto._loadVectorData = function(vectorLayer, bbox) {
  // eseguo le richieste dei dati al server al fine di ottenere il geojson,
  // vettoriale, del layer richiesto
  return self._getVectorLayerData(vectorLayer, bbox)
    .then((vectorDataResponse) => {
      this.setVectorLayerData(vectorLayer[this._editingApiField], vectorDataResponse);
      // setto i dati vettoriali del layer vettoriale
      // e verifico se siamo in editingMode write e se ci sono featurelocks
      if (this._editingMode && vectorDataResponse.featurelocks) {
        // nel cso in cui sia in editing (mode w) e che si siano featureLocks
        // setto tale features al layervettoriale
        this.setVectorFeaturesLock(vectorLayer, vectorDataResponse.featurelocks);
      }
      //setto i dati del layer vettoriale (geojson)
      vectorLayer.setData(vectorDataResponse.vector.data);
      if (this._)
        return vectorDataResponse;
    })
    .fail(() => {
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

//funzione che setta le features lock del layer vettoriale
proto.setVectorFeaturesLock = function(vectorLayer, featureslock) {
  //vado a pescare le fifferenze tra le featureidlock già caricati id
  const newFeaturesLockIds = _.differenceBy(featureslock, vectorLayer.getFeatureLocks(), 'featureid');
  newFeaturesLockIds.forEach((newLockId) => {
    vectorLayer.addLockId(newLockId)
  });
};

proto.cleanVectorFeaturesLock = function(vectorLayer) {
  vectorLayer.cleanFeatureLocks();
};

proto.lockFeatures = function(layerName) {
  const d = $.Deferred();
  const bbox = this._mapService.state.bbox;
  const vectorLayer = this._layers[layerName].vector;
  $.get(this._baseUrl+layerName+"/?lock" + this._customUrlParameters+"&in_bbox=" + bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done((data) => {
      this.setVectorFeaturesLock(vectorLayer, data.featurelocks);
      d.resolve(data);
    })
    .fail(() => {
      d.reject();
    });
  return d.promise();
};

// ottiene la configurazione del vettoriale
// (qui richiesto solo per la definizione degli input)
proto._getVectorLayerConfig = function(layerApiField) {
  const d = $.Deferred();
  // attravercso il layer name e il base url
  // chiedo la server di inviarmi la configurazione editing del laye
  $.get(this._baseUrl+layerApiField+"/?config"+ this._customUrlParameters)
    .done((data) => {
      d.resolve(data);
    })
    .fail(() => {
      d.reject();
    });
  return d.promise();
};

// ottiene il vettoriale in modalità  editing
proto._getVectorLayerData = function(vectorLayer, bbox) {
  const d = $.Deferred();
  const lock = this.getMode() == 'w' ? true : false;
  let apiUrl;
  if (lock) {
    apiUrl = this._baseUrl+vectorLayer[this._editingApiField]+"/?editing";
  } else {
    apiUrl = this._baseUrl+vectorLayer[this._editingApiField]+"/?"
  }
  $.get(apiUrl + this._customUrlParameters+"&in_bbox=" + bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done((data) => {
      d.resolve(data);
    })
    .fail(() => {
      d.reject();
    });
  return d.promise();
};
// funzione per creare il layer vettoriale
proto._createVectorLayer = function(options) {
  const vector = new VectorLayer(options);
  return vector;
};
//funzione chiamata dal plugin quando si vuole fare un cleanUp dei layers
// !!! -- DA RIVEDERE -- !!!
proto.cleanUpLayers = function() {
  this._loadedExtent = null;
};

module.exports = QGISProvider;
