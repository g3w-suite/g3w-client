(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.g3wsdk = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var rejectedValue = require('core/utils/utils').rejectedValue;

function ApiService(){
  this._config = null;
  this._baseUrl = null;
  this._apiUrls = {};
  
  this.init = function(config) {
    this._config = config;
    this._baseUrl = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
  };
  
  var howManyAreLoading = 0;
  this._incrementLoaders = function(){
    if (howManyAreLoading == 0){
      this.emit('apiquerystart');
    }
    howManyAreLoading += 1;
  };
  
  this._decrementLoaders = function(){
    howManyAreLoading -= 1;
    if (howManyAreLoading == 0){
      this.emit('apiqueryend');
    }
  };
  
  this.get = function(api,options) {
    var self = this;
    var apiEndPoint = this._apiEndpoints[api];
    if (apiEndPoint) {
      var completeUrl = this._baseUrl + '/' + apiEndPoint;
      if (options.request) {
         completeUrl = completeUrl + '/' + options.request;
      }
      var params = options.params || {};
      
      self.emit(api+'querystart');
      this._incrementLoaders();
      return $.get(completeUrl,params)
      .done(function(response){
        self.emit(api+'queryend',response);
        return response;
      })
      .fail(function(e){
        self.emit(api+'queryfail',e);
        return e;
      })
      .always(function(){
        self._decrementLoaders();
      });
    }
    else {
      return rejectedValue();
    }
  };
  
  base(this);
}
inherit(ApiService,G3WObject);

module.exports = new ApiService;

},{"core/g3wobject":3,"core/utils/utils":22}],2:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ApiService = require('core/apiservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var PluginsRegistry = require('core/plugin/pluginsregistry');

var AppService = function(){
  var self = this;
  this.initialized = false;
  this._modalOverlay = null;
  this.config = {};

  // chiama il costruttore di G3WObject (che in questo momento non fa niente)
  base(this);
};
inherit(AppService,G3WObject);

var proto = AppService.prototype;

proto.init = function(config){
  this.config = config;
  this._bootstrap();
};

proto._bootstrap = function(){
  var self = this;
  if (!this.initialized){
    //inizializza la configurazione dei servizi. Ognungo cercherà dal config quello di cui avrà bisogno
    //una volta finita la configurazione emetto l'evento ready. A questo punto potrò avviare l'istanza Vue globale
    $.when(
      ApiService.init(this.config),
      ProjectsRegistry.init(this.config),
      PluginsRegistry.init(this.config.plugins)
    ).then(function(){
      self.emit('ready');
      this.initialized = true;
    });
  };
};

module.exports = new AppService;

},{"core/apiservice":1,"core/g3wobject":3,"core/plugin/pluginsregistry":16,"core/project/projectsregistry":20,"core/utils/utils":22}],3:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var noop = require('core/utils/utils').noop;

/**
 * Un oggetto base in grado di gestire eventuali setter e relativa catena di listeners.
 * @constructor
 */
var G3WObject = function(){
  if (this.setters){
    this._setupListenersChain(this.setters);
  }
};
inherit(G3WObject,EventEmitter);

var proto = G3WObject.prototype;

/**
 * Inserisce un listener dopo che è stato eseguito il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener (solo sincrona)
 */
proto.onafter = function(setter,listener){
  return this._onsetter('after',setter,listener,false);
};

// un listener può registrarsi in modo da essere eseguito PRIMA dell'esecuzione del metodo setter. Può ritornare true/false per
// votare a favore o meno dell'esecuzione del setter. Se non ritorna nulla o undefined, non viene considerato votante
/**
 * Inserisce un listener prima che venga eseguito il setter. Se ritorna false il setter non viene eseguito
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui viene passato una funzione "next" come ultimo parametro, da usare nel caso di listener asincroni
 */
proto.onbefore = function(setter,listener){
  return this._onsetter('before',setter,listener,false);
};

/**
 * Inserisce un listener prima che venga eseguito il setter. Al listener viene passato una funzione "next" come ultimo parametro, da chiamare con parametro true/false per far proseguire o meno il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui 
 */
proto.onbeforeasync = function(setter,listener){
  return this._onsetter('before',setter,listener,true);
};

proto.un = function(setter,key){
  _.forEach(this.settersListeners,function(settersListeners,when){
    _.forEach(settersListeners[setter],function(setterListener){
      if(setterListener.key == key){
        delete setterListener;
      }
    })
  })
};

proto._onsetter = function(when,setter,listener,async){ /*when=before|after, type=sync|async*/
  var settersListeners = this.settersListeners[when];
  var listenerKey = ""+Math.floor(Math.random()*1000000)+""+Date.now();
  /*if ((when == 'before') && !async){
    listener = this._makeChainable(listener);
  }*/
  settersListeners[setter].push({
    key: listenerKey,
    fnc: listener,
    async: async
  });
  return listenerKey;
  //return this.generateUnListener(setter,listenerKey);
};

// trasformo un listener sincrono in modo da poter essere usato nella catena di listeners (richiamando next col valore di ritorno del listener)
/*proto._makeChainable = function(listener){
  var self = this
  return function(){
    var args = Array.prototype.slice.call(arguments);
    // rimuovo next dai parametri prima di chiamare il listener
    var next = args.pop();
    var canSet = listener.apply(self,arguments);
    var _canSet = true;
    if (_.isBoolean(canSet)){
      _canSet = canSet;
    }
    next(canSet);
  }
};*/

proto._setupListenersChain = function(setters){
  // inizializza tutti i metodi definiti nell'oggetto "setters" della classe figlia.
  var self = this;
  this.settersListeners = {
    after:{},
    before:{}
  };
  // per ogni setter viene definito l'array dei listeners e fiene sostituito il metodo originale con la funzioni che gestisce la coda di listeners
  _.forEach(setters,function(setterOption,setter){
    var setterFnc = noop;
    var setterFallback = noop;
    if (_.isFunction(setterOption)){
      setterFnc = setterOption
    }
    else {
      setterFnc = setterOption.fnc;
      setterFallback = setterOption.fallback || noop;
    }
    self.settersListeners.after[setter] = [];
    self.settersListeners.before[setter] = [];
    // setter sostituito
    self[setter] = function(){
      var args = arguments;
      // eseguo i listener registrati per il before
      var deferred = $.Deferred();
      var returnVal = null;
      var counter = 0;
      var canSet = true;
      
      // richiamata alla fine della catena di listeners
      function done(){
        if(canSet){
          // eseguo la funzione
          returnVal = setterFnc.apply(self,args);
          // e risolvo la promessa (eventualmente utilizzata da chi ha invocato il setter
          deferred.resolve(returnVal);
          
          var afterListeners = self.settersListeners.after[setter];
          _.forEach(afterListeners,function(listener, key){
            listener.fnc.apply(self,args);
          })
        }
        else {
          // se non posso proseguire 
          // chiamo l'eventuale funzione di fallback
          setterFallback.apply(self,args);
          // e rigetto la promessa
          deferred.reject();
        }
      };
      
      function complete(){
        // eseguo la funzione
        returnVal = setterFnc.apply(self,args);
        // e risolvo la promessa (eventualmente utilizzata da chi ha invocato il setter
        deferred.resolve(returnVal);
        
        var afterListeners = self.settersListeners.after[setter];
        _.forEach(afterListeners,function(listener, key){
          listener.fnc.apply(self,args);
        })
      }
      
      function abort(){
          // se non posso proseguire ...
          // chiamo l'eventuale funzione di fallback
          setterFallback.apply(self,args);
          // e rigetto la promessa
          deferred.reject();
      }
      
      var beforeListeners = this.settersListeners['before'][setter];
      // contatore dei listener che verrà decrementato ad ogni chiamata a next()
      counter = 0;
      
      // funzione passata come ultimo parametro ai listeners, che ***SE SONO STATI AGGIUNTI COME ASINCRONI la DEVONO*** richiamare per poter proseguire la catena
      function next(bool){
        var cont = true;
        if (_.isBoolean(bool)){
          cont = bool;
        }
        var _args = Array.prototype.slice.call(args);
        // se la catena è stata bloccata o se siamo arrivati alla fine dei beforelisteners
        if (cont === false || (counter == beforeListeners.length)){
          if(cont === false)
            abort.apply(self,args);
          else{
            completed = complete.apply(self,args);
            if(_.isUndefined(completed) || completed === true){
              self.emitEvent('set:'+setter,args);
            }
          }
        }
        else {
          if (cont){
            var listenerFnc = beforeListeners[counter].fnc;
            if (beforeListeners[counter].async){
              // aggiungo next come ulitmo parametro
              _args.push(next);
              counter += 1;
              listenerFnc.apply(self,_args)
            }
            else {
              var _cont = listenerFnc.apply(self,_args);
              counter += 1;
              next(_cont);
            }
          }
        }
      }
      
      next();
      return deferred.promise();
    }
  })
};

/*
proto.generateUnListener = function(settersListeners,setter,listenerKey){
  var self = this;
  return function(){
    settersListeners[setter][listenerKey] = null;
    delete settersListeners[setter][listenerKey];
  }
};
*/

module.exports = G3WObject;

},{"core/utils/utils":22}],4:[function(require,module,exports){
var geom = {
  distance: function(c1,c2){
    return Math.sqrt(geom.squaredDistance(c1,c2));
  },
  squaredDistance: function(c1,c2){
    var x1 = c1[0];
    var y1 = c1[1];
    var x2 = c2[0];
    var y2 = c2[1];
    var dx = x2 - x1;
    var dy = y2 - y1;
    return dx * dx + dy * dy;
  },
  closestOnSegment: function(coordinate, segment) {
    var x0 = coordinate[0];
    var y0 = coordinate[1];
    var start = segment[0];
    var end = segment[1];
    var x1 = start[0];
    var y1 = start[1];
    var x2 = end[0];
    var y2 = end[1];
    var dx = x2 - x1;
    var dy = y2 - y1;
    var along = (dx === 0 && dy === 0) ? 0 :
        ((dx * (x0 - x1)) + (dy * (y0 - y1))) / ((dx * dx + dy * dy) || 0);
    var x, y;
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
  }
}

module.exports = geom;

},{}],5:[function(require,module,exports){
var Geometry = {};

Geometry.GeometryTypes = {
  POINT: "Point",
  MULTIPOINT: "MultiPoint",
  LINESTRING: "Line", // per seguire la definizione di QGis.GeometryType, che definisce Line invece di Linestring.
  MULTILINESTRING: "MultiLine",
  POLYGON: "Polygon",
  MULTIPOLYGON: "MultiPolygon",
  GEOMETRYCOLLECTION: "GeometryCollection"
};

Geometry.SupportedGeometryTypes = [
  Geometry.GeometryTypes.POINT,
  Geometry.GeometryTypes.MULTIPOINT,
  Geometry.GeometryTypes.LINESTRING,
  Geometry.GeometryTypes.MULTILINESTRING,
  Geometry.GeometryTypes.POLYGON,
  Geometry.GeometryTypes.MULTIPOLYGON
]

module.exports = Geometry;

},{}],6:[function(require,module,exports){
function init(config) {
  i18next
  .use(i18nextXHRBackend)
  .init({ 
      lng: 'it',
      ns: 'app',
      fallbackLng: 'it',
      resources: config.resources
  });
  
  jqueryI18next.init(i18next, $, {
    tName: 't', // --> appends $.t = i18next.t
    i18nName: 'i18n', // --> appends $.i18n = i18next
    handleName: 'localize', // --> appends $(selector).localize(opts);
    selectorAttr: 'data-i18n', // selector for translating elements
    targetAttr: 'data-i18n-target', // element attribute to grab target element to translate (if diffrent then itself)
    optionsAttr: 'data-i18n-options', // element attribute that contains options, will load/set if useOptionsAttr = true
    useOptionsAttr: false, // see optionsAttr
    parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
  });
}
    
var t = function(text){
    var trad = i18next.t(text);
    return trad;
};
    
module.exports = {
  init: init,
  t: t
}

},{}],7:[function(require,module,exports){
var PickCoordinatesEventType = {
  PICKED: 'picked'
};

var PickCoordinatesEvent = function(type, coordinate) {
  this.type = type;
  this.coordinate = coordinate;
};

var PickCoordinatesInteraction = function(options) {
  this.previousCursor_ = null;
  
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickCoordinatesInteraction.handleDownEvent_,
    handleUpEvent: PickCoordinatesInteraction.handleUpEvent_,
    handleMoveEvent: PickCoordinatesInteraction.handleMoveEvent_,
  });
};
ol.inherits(PickCoordinatesInteraction, ol.interaction.Pointer);

PickCoordinatesInteraction.handleDownEvent_ = function(event) {
  return true;
};

PickCoordinatesInteraction.handleUpEvent_ = function(event) {
  this.dispatchEvent(
          new PickCoordinatesEvent(
              PickCoordinatesEventType.PICKED,
              event.coordinate));
  return true;
};

PickCoordinatesInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  elem.style.cursor =  'pointer';
};

PickCoordinatesInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickCoordinatesInteraction.prototype.setMap = function(map){
  if (!map) {
    var elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickCoordinatesInteraction;

},{}],8:[function(require,module,exports){
var PickFeatureEventType = {
  PICKED: 'picked'
};

var PickFeatureEvent = function(type, coordinate, feature) {
  this.type = type;
  this.feature = feature;
  this.coordinate = coordinate;
};



var PickFeatureInteraction = function(options) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickFeatureInteraction.handleDownEvent_,
    handleUpEvent: PickFeatureInteraction.handleUpEvent_,
    handleMoveEvent: PickFeatureInteraction.handleMoveEvent_,
  });
  
  this.features_ = options.features || null;
  
  this.layers_ = options.layers || null;
  
  this.pickedFeature_ = null;
  
  var self = this;
  this.layerFilter_ = function(layer) {
    return _.includes(self.layers_, layer);
  };
};
ol.inherits(PickFeatureInteraction, ol.interaction.Pointer);

PickFeatureInteraction.handleDownEvent_ = function(event) {
  this.pickedFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  return true;
};

PickFeatureInteraction.handleUpEvent_ = function(event) {
  if(this.pickedFeature_){
    this.dispatchEvent(
            new PickFeatureEvent(
                PickFeatureEventType.PICKED,
                event.coordinate,
                this.pickedFeature_));
  }
  return true;
};

PickFeatureInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  var intersectingFeature = this.featuresAtPixel_(event.pixel, event.map);

  if (intersectingFeature) {
    elem.style.cursor =  'pointer';
  } else {
    elem.style.cursor = '';
  }
};

PickFeatureInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  var found = null;

  var intersectingFeature = map.forEachFeatureAtPixel(pixel,
      function(feature) {
        if (this.features_) {
          if (this.features_.indexOf(feature) > -1){
            return feature
          }
          else{
            return null;
          }
        }
        return feature;
      },this,this.layerFilter_);
  
  if(intersectingFeature){
    found = intersectingFeature;
  }
  return found;
};

PickFeatureInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickFeatureInteraction.prototype.setMap = function(map){
  if (!map) {
    var elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickFeatureInteraction;

},{}],9:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var GeometryTypes = require('core/geometry/geometry').GeometryTypes;

var CAPABILITIES = {
  QUERY: 1,
  EDIT: 2
};

var EDITOPS = {
  INSERT: 1,
  UPDATE: 2,
  DELETE: 4
};

LayerState = {};

LayerState.ServerTypes = {
  OGC: "OGC",
  QGIS: "QGIS",
  Mapserver: "Mapserver",
  Geoserver: "Geoserver",
  ArcGIS: "ArcGIS"
};

LayerState.getGeometryType = function(layerState) {
  return layerState.geometrytype;
};

LayerState.getAttributes = function(layerState) {
  var attributes = [];
  if (layerState.attributes) {
    attributes = _.map(layerState.attributes,function(attribute) {
      return attribute.name;
    })
  }
  return attributes;
};

LayerState.isQueryable = function(layerState){
  var queryEnabled = false;
  var queryableForCababilities = (layerState.capabilities && (layerState.capabilities && CAPABILITIES.QUERY)) ? true : false;
  if (queryableForCababilities) {
    // è interrogabile se visibile e non disabilitato (per scala) oppure se interrogabile comunque (forzato dalla proprietà infowhennotvisible)
    var queryEnabled = (layerState.visible && !layerState.disabled) || (layerState.infowhennotvisible && (layerState.infowhennotvisible === true));
  }
  return queryEnabled;
};

LayerState.getQueryLayerName = function(layerState) {
  var queryLayerName;
  if (layerState.infolayer && layerState.infolayer != '') {
    queryLayerName = layerState.infolayer;
  }
  else {
    queryLayerName = layerState.name;
  }
  return queryLayerName;
};

LayerState.getServerType = function(layerState) {
  if (layerState.servertype && layerState.servertype != '') {
    return layerState.servertype;
  }
  else {
    return LayerState.ServerTypes.QGIS;
  }
};

LayerState.isExternalWMS = function(layerState) {
  return (layerState.source && layerState.source.url);
};

LayerState.getWMSLayerName = function(layerState) {
  var layerName = layerState.name;
  if (layerState.source && layerState.source.layers){
    layerName = layerState.source.layers
  };
  return layerName;
};

LayerState.getOriginURL = function(layerState) {
  var url;
  if (layerState.source && layerState.source.type == 'wms' && layerState.source.url){
    url = layerState.source.url
  };
  return url;
};

module.exports = LayerState;

},{"core/g3wobject":3,"core/geometry/geometry":5,"core/utils/utils":22}],10:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var truefnc = require('core/utils/utils').truefnc;
var resolvedValue = require('core/utils/utils').resolvedValue;
var rejectedValue = require('core/utils/utils').rejectedValue;
var G3WObject = require('core/g3wobject');

function VectorLayer(config){
  var config = config || {};
  this.geometrytype = config.geometrytype || null;
  this.format = config.format || null;
  this.crs = config.crs  || null;
  this.id = config.id || null;
  this.name = config.name || "";
  this.pk = config.pk || "id"; // TODO: il GeoJSON setta l'id della feature da sé, e nasconde il campo PK dalle properties. In altri formati va verificato, e casomai usare feature.setId()
  
  this._olSource = new ol.source.Vector({
    features: new ol.Collection()
  });
  this._olLayer = new ol.layer.Vector({
    name: this.name,
    source: this._olSource
  });
  
  /*
   * Array di oggetti:
   * {
   *  name: Nome dell'attributo,
   *  type: integer | float | string | boolean | date | time | datetime,
   *  input: {
   *    label: Nome del campo di input,
   *    type: select | check | radio | coordspicker | boxpicker | layerpicker | fielddepend,
   *    options: {
   *      Le opzioni per lo spcifico tipo di input (es. "values" per la lista di valori di select, check e radio)
   *    }
   *  }
   * }
  */
  this._PKinAttributes = false;
  this._featuresFilter = null;
  this._fields = null
  this.lazyRelations = true;
  this._relations = null;
}
inherit(VectorLayer,G3WObject);
module.exports = VectorLayer;

var proto = VectorLayer.prototype;

proto.setData = function(featuresData){
  var self = this;
  var features;
  if (this.format) {
    switch (this.format){
      case "GeoJSON":
        var geojson = new ol.format.GeoJSON({
          defaultDataProjection: this.crs,
          geometryName: "geometry"
        });
        features = geojson.readFeatures(featuresData);
        break;
    }
    
    if (features && features.length) {
      if (!_.isNull(this._featuresFilter)){
        var features = _.map(features,function(feature){
          return self._featuresFilter(feature);
        });
      }
      
      var alreadyLoadedIds = this.getFeatureIds();
      var featuresToLoad = _.filter(features,function(feature){
        return !_.includes(alreadyLoadedIds,feature.getId());
      })
      
      this._olSource.addFeatures(featuresToLoad);
      
      // verifico, prendendo la prima feature, se la PK è presente o meno tra gli attributi
      var attributes = this.getSource().getFeatures()[0].getProperties();
      this._PKinAttributes = _.get(attributes,this.pk) ? true : false;
    }
  }
  else {
    console.log("VectorLayer format not defined");
  }
};

proto.setFeatureData = function(oldfid,fid,geometry,attributes){
  var feature = this.getFeatureById(oldfid);
  if (fid){
    feature.setId(fid);
  }
  
  if (geometry){
    feature.setGeometry(geometry);
  }
  
  if (attributes){
    var oldAttributes = feature.getProperties();
    var newAttributes =_.assign(oldAttributes,attributes);
    feature.setProperties(newAttributes);
  }
  
  return feature;
};

proto.addFeatures = function(features){
  this.getSource().addFeatures(features);
};

proto.setFeaturesFilter = function(featuresFilter){
  this._featuresFilter = featuresFilter;
};

proto.setFields = function(fields){
  this._fields = fields;
};

proto.setPkField = function(){
  var self = this;
  var pkfieldSet = false;
  _.forEach(this._fields,function(field){
    if (field.name == self.pk ){
      pkfieldSet = true;
    }
  });
  
  if (!pkfieldSet){
    this._fields
  }
};

proto.getFeatures = function(){
  return this.getSource().getFeatures();
};

proto.getFeatureIds = function(){
  var featureIds = _.map(this.getSource().getFeatures(),function(feature){
    return feature.getId();
  })
  return featureIds
};

proto.getFields = function(){
  return _.cloneDeep(this._fields);
};

proto.getFieldsNames = function(){
  return _.map(this._fields,function(field){
    return field.name;
  });
};

proto.getFieldsWithAttributes = function(obj){
  var self = this;
  /*var fields = _.cloneDeep(_.filter(this._fields,function(field){
    return ((field.name != self.pk) && field.editable);
  }));*/
  var fields = _.cloneDeep(this._fields);
  
  var feature, attributes;
  
  // il metodo accetta sia feature che fid
  if (obj instanceof ol.Feature){
    feature = obj;
  }
  else if (obj){
    feature = this.getFeatureById(obj);
  }
  if (feature){
    attributes = feature.getProperties();
  }
  
  _.forEach(fields,function(field){
    if (feature){
      if (!this._PKinAttributes && field.name == self.pk){
        field.value = feature.getId();
      }
      else{
        field.value = attributes[field.name];
      }
    }
    else{
      field.value = null;
    }
  });
  return fields;
};

proto.setRelations = function(relations){
  _.forEach(relations,function(relation,relationKey){
    relation.name = relationKey;
  });
  this._relations = relations;
};

proto.getRelations = function(){
  return this._relations;
};

proto.hasRelations = function(){
  return !_.isNull(this._relations);
};

proto.getRelationsNames = function(){
  return _.keys(this._relations);
};

proto.getRelationsFksKeys = function(){
  var fks = [];
  _.forEach(this._relations,function(relation){
    fks.push(relation.fk);
  })
  return fks;
};

proto.getRelationFieldsNames = function(relation){
  var relationFields = this._relations[relation];
  if (relationFields){
    return _.map(relationFields,function(field){
      return field.name;
    });
  }
  return null;
};

// ottengo le relazioni a partire dal fid di una feature esistente
proto.getRelationsWithAttributes = function(fid){
  var relations = _.cloneDeep(this._relations);
  var self = this;
  if (!fid || !this.getFeatureById(fid)){
    _.forEach(relations,function(relation,relationKey){
        // inizialmente setto a null i valori
      _.forEach(relation.fields,function(field){
        field.value = null;
      })
    });
    return resolvedValue(relations);
  }
  else {
    if (this.lazyRelations){
      var deferred = $.Deferred();
      var attributes = this.getFeatureById(fid).getProperties();
      var fks = {};
      _.forEach(relations,function(relation,relationKey){
        var url = relation.url;
        var keyVals = [];
        _.forEach(relation.fk,function(fkKey){
          fks[fkKey] = attributes[fkKey];
        });
      })
      
      this.getRelationsWithAttributesFromFks(fks)
      .then(function(relationsResponse){
        deferred.resolve(relationsResponse);
      })
      .fail(function(){
        deferred.reject();
      });
      return deferred.promise();
    }
  }
};

// ottengo le relazioni valorizzate a partire da un oggetto con le chiavi FK come keys e i loro valori come values
proto.getRelationsWithAttributesFromFks = function(fks){
  var self = this;
  var relations = _.cloneDeep(this._relations);
  var relationsRequests = [];

  _.forEach(relations,function(relation,relationKey){
    var url = relation.url;
    var keyVals = [];
    _.forEach(relation.fk,function(fkKey){
      var fkValue = fks[fkKey];
      keyVals.push(fkKey+"="+fkValue);
    });
    var fkParams = _.join(keyVals,"&");
    url += "?"+fkParams;
    relationsRequests.push($.get(url)
      .then(function(relationAttributes){
        _.forEach(relation.fields,function(field){
          field.value = relationAttributes[0][field.name];
        });
      })
    )
  })
  
  return $.when.apply(this,relationsRequests)
  .then(function(){
    return relations;
  });
}

proto.setStyle = function(style){
  this._olLayer.setStyle(style);
};

proto.getLayer = function(){
  return this._olLayer;
};

proto.getSource = function(){
  return this._olLayer.getSource();
};

proto.getFeatureById = function(id){
  return this._olLayer.getSource().getFeatureById(id);
};

proto.clear = function(){
  this.getSource().clear();
};

proto.addToMap = function(map){
  map.addLayer(this._olLayer);
};

// data una feature verifico se ha tra gli attributi i valori delle FK delle (eventuali) relazioni
proto.featureHasRelationsFksWithValues = function(feature){
  var attributes = feature.getProperties();
  var fksKeys = this.getRelationsFksKeys();
  return _.every(fksKeys,function(fkKey){
    var value = attributes[fkKey];
    return (!_.isNil(value) && value != '');
  })
};

// data una feature popolo un oggetto con chiavi/valori delle FK delle (eventuali) relazione
proto.getRelationsFksWithValuesForFeature = function(feature){
  var attributes = feature.getProperties();
  var fks = {};
  var fksKeys = this.getRelationsFksKeys();
  _.forEach(fksKeys,function(fkKey){
    fks[fkKey] = attributes[fkKey];
  })
  return fks;
};

},{"core/g3wobject":3,"core/utils/utils":22}],11:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var LayerState = require('core/layer/layerstate');
var MapLayer = require('core/map/maplayer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSLayer(options,extraParams){
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };

  this.extraParams = extraParams
  this.layers = [];
  
  base(this,options);
}
inherit(WMSLayer,MapLayer)
var proto = WMSLayer.prototype;

proto.getOLLayer = function(){
  var olLayer = this._olLayer;
  if (!olLayer){
    olLayer = this._olLayer = this._makeOlLayer();
  }
  return olLayer;
};

proto.getSource = function(){
  return this.getOLLayer().getSource();
};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getGetFeatureInfoUrl = function(coordinate,resolution,epsg,params){
  return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
};

proto.getLayerConfigs = function(){
  return this.layers;
};

proto.addLayer = function(layerConfig){
  this.layers.push(layerConfig);
};

proto.toggleLayer = function(layer){
  _.forEach(this.layers,function(_layer){
    if (_layer.id == layer.id){
      _layer.visible = layer.visible;
    }
  });
  this._updateLayers();
};
  
proto.update = function(mapState,extraParams){
  this._updateLayers(mapState,extraParams);
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto.getQueryUrl = function(){
  var layer = this.layers[0];
  if (layer.infourl && layer.infourl != '') {
    return layer.infourl;
  }
  return this.config.url;
};

proto.getQueryLayers = function(){ 
  var layer = this.layers[0];
  var queryLayers = [];
  _.forEach(this.layers,function(layer){
    if (LayerState.isQueryable(layer)) {
      queryLayers.push({
        layerName: LayerState.getWMSLayerName(layer),
        queryLayerName: LayerState.getQueryLayerName(layer),
        geometryType: LayerState.getGeometryType(layer),
        attributes: LayerState.getAttributes(layer)
      });
    }
  });
  return queryLayers;
};

proto._makeOlLayer = function(){
  var self = this;
  var wmsConfig = {
    url: this.config.url,
    id: this.config.id
  };
  
  var representativeLayer = this.layers[0]; //BRUTTO, DEVO PRENDERE UN LAYER A CASO (IL PRIMO) PER VEDERE SE PUNTA AD UN SOURCE DIVERSO (dovrebbe accadere solo per i layer singoli, WMS esterni)
  
  if (representativeLayer.source && representativeLayer.source.type == 'wms' && representativeLayer.source.url){
    wmsConfig.url = representativeLayer.source.url;
  };
  
  var olLayer = new RasterLayers.WMSLayer(wmsConfig,this.extraParams);
  
  olLayer.getSource().on('imageloadstart', function() {
        self.emit("loadstart");
      });
  olLayer.getSource().on('imageloadend', function() {
      self.emit("loadend");
  });
  
  return olLayer
};

proto._getVisibleLayers = function(mapState){
  var self = this;
  var visibleLayers = [];
  _.forEach(this.layers,function(layer){
    var resolutionBasedVisibility = layer.maxresolution ? (layer.maxresolution && layer.maxresolution > mapState.resolution) : true;
    if (layer.visible && resolutionBasedVisibility) {
      visibleLayers.push(layer);
    }    
  })
  return visibleLayers;
};

proto.checkLayerDisabled = function(layer,resolution) {
  var disabled = layer.disabled || false;
  if (layer.maxresolution){
    disabled = layer.maxresolution < resolution;
  }
  if (layer.minresolution){
    layer.disabled = disabled && (layer.minresolution > resolution);
  }
  layer.disabled = disabled;
};

proto.checkLayersDisabled = function(resolution){
  var self = this;
  _.forEach(this.layers,function(layer){
    self.checkLayerDisabled(layer,resolution);
  });
};

proto._updateLayers = function(mapState,extraParams){
  this.checkLayersDisabled(mapState.resolution);
  var visibleLayers = this._getVisibleLayers(mapState);
  if (visibleLayers.length > 0) {
    var params = {
      LAYERS: _.join(_.map(visibleLayers,function(layer){
        return LayerState.getWMSLayerName(layer);
      }),',')
    };
    if (extraParams) {
      params = _.assign(params,extraParams);
    }
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams(params);
  }
  else {
    this._olLayer.setVisible(false);
  }
};

module.exports = WMSLayer;

},{"core/layer/layerstate":9,"core/map/maplayer":12,"core/utils/utils":22,"g3w-ol3/src/layers/rasters":31}],12:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');


function MapLayer(config){
  this.config = config || {};
  this.id = config.id;
  
  this._olLayer = null;
  
  base(this);
}
inherit(MapLayer,G3WObject);

var proto = MapLayer.prototype;

proto.getId = function(){
  return this.id;
};

module.exports = MapLayer;

},{"core/g3wobject":3,"core/utils/utils":22}],13:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var Geometry = require('core/geometry/geometry');
var ProjectService = require('core/project/projectservice').ProjectService;

//var GUI = require('gui/gui'); // QUESTO NON CI DEVE ESSERE!!!

function MapQueryService() {
  base(this);
  
  this.init = function(map){
    this.map = map;
  }
  
  this.queryPoint = function(coordinates,mapLayers) {
    var self = this;
    var d = $.Deferred();
    var urlsForLayers = {};
    _.forEach(mapLayers,function(mapLayer){
      var url = mapLayer.getQueryUrl();
      var urlHash = url.hashCode().toString();
      if (_.keys(urlsForLayers).indexOf(urlHash) == -1) {
        urlsForLayers[urlHash] = {
          url: url,
          mapLayers: []
        };
      }
      urlsForLayers[urlHash].mapLayers.push(mapLayer);
    })
    
    var queryUrlsForLayers = [];
    _.forEach(urlsForLayers,function(urlForLayers){
      var firstLayer = urlForLayers.mapLayers[0];
      var _getFeatureInfoUrl = self.getGetFeatureInfoUrl(firstLayer,coordinates);
      var queryBase = _getFeatureInfoUrl.split('?')[0];
      var queryString = _getFeatureInfoUrl.split('?')[1];
      var queryParams = {};
      _.forEach(queryString.split('&'),function(queryStringPair){
        var queryPair = queryStringPair.split('=');
        var key = queryPair[0];
        var value = queryPair[1];
        queryParams[key] = value;
      });
      
      var layerNames = [];
      var queryLayers = [];
      _.forEach(urlForLayers.mapLayers,function(mapLayer){
        //var mapLayerLayersNames = mapLayer.getLayer().getSource().getParams()['LAYERS'];
        //layerNames = _.concat(layerNames,mapLayerLayersNames);
        var mapLayerQueryLayers = mapLayer.getQueryLayers();
        
        if (mapLayerQueryLayers.length) {
          queryLayers = _.concat(queryLayers,mapLayerQueryLayers);
        }
      })
      
      if (queryLayers.length) {
        delete queryParams['STYLES'];
      
        queryParams['LAYERS'] = _.map(queryLayers,'queryLayerName');
        queryParams['QUERY_LAYERS'] = _.map(queryLayers,'queryLayerName');
        queryParams['FEATURE_COUNT'] = 1000;
        
        var getFeatureInfoUrl = queryBase;
        var newQueryPairs = [];
        _.forEach(queryParams,function(value,key){
          newQueryPairs.push(key+'='+value);
        });
        getFeatureInfoUrl = queryBase+'?'+newQueryPairs.join('&')
        
        queryUrlsForLayers.push({
          url: getFeatureInfoUrl,
          queryLayers: queryLayers
        });
      }
    })
    
    var featuresForLayerNames = {};
    if (queryUrlsForLayers.length > 0) {
      _.forEach(queryUrlsForLayers,function(queryUrlForLayers){
        var url = queryUrlForLayers.url;
        var queryLayers = queryUrlForLayers.queryLayers;

        $.get(url).
        then(function(response){
          var jsonresponse;
          var x2js = new X2JS();
          try {
            if (_.isString(response)) {
              jsonresponse = x2js.xml_str2json(response);
            }
            else {
              jsonresponse = x2js.xml2json(response);
            }
          }
          catch (e) {
            d.reject(e);
          }
          var rootNode = _.keys(jsonresponse)[0];
          var parser, data;
          switch (rootNode) {
            case 'FeatureCollection':
              parser = self._parseLayerFeatureCollection;
              data = jsonresponse;
              break;
            case "msGMLOutput":
              parser = self._parseLayermsGMLOutput;
              data = response;
              break;
          }
          var nfeatures = 0
          _.forEach(queryLayers,function(queryLayer){
            var features = parser.call(self,queryLayer,data)
            nfeatures += features.length;
            featuresForLayerNames[queryLayer.layerName] = features;
          })
          d.resolve(coordinates,nfeatures,featuresForLayerNames);
        })
        .fail(function(e){
          d.reject(e);
        })
      });
    }
    else {
      d.resolve(coordinates,0,featuresForLayerNames);
    }
    
    return d.promise();
  };
  
  // Brutto ma per ora unica soluzione trovata per dividere per layer i risultati di un doc xml wfs.FeatureCollection. OL3 li parserizza tutti insieme...
  this._parseLayerFeatureCollection = function(queryLayer,data){
    var features = [];
    var layerName = queryLayer.queryLayerName;
    var layerData = _.cloneDeep(data);
    layerData.FeatureCollection.featureMember = [];
    
    var featureMembers = data.FeatureCollection.featureMember;
    _.forEach(featureMembers,function(featureMember){
      var isLayerMember = _.get(featureMember,layerName)

      if (isLayerMember) {
        layerData.FeatureCollection.featureMember.push(featureMember);
      }
    });
    
    var x2js = new X2JS();
    var layerFeatureCollectionXML = x2js.json2xml_str(layerData);
    var parser = new ol.format.WMSGetFeatureInfo();
    return parser.readFeatures(layerFeatureCollectionXML);
  };
  
  // mentre con i risultati in msGLMOutput (da Mapserver) il parser può essere istruito per parserizzare in base ad un layer di filtro
  this._parseLayermsGMLOutput = function(queryLayer,data){
    var parser = new ol.format.WMSGetFeatureInfo({
      layers: [queryLayer.queryLayerName]
    });
    return parser.readFeatures(data);
  };
  
  this.queryRect = function(rect,layerId) {
    
  };
  
  this._query = function(rect,layerId) {
    var layers;
    if (layerId) {
      layers = [ProjectService.getLayer(layerId)];
    }
    else {
      layers = ProjectService.getLayers();
    }
  };
  
  this.getGetFeatureInfoUrl = function(mapLayer,coordinate){
    //var parser = new ol.format.WMSGetFeatureInfo();
    var resolution = this.map.getView().getResolution();
    var epsg = this.map.getView().getProjection().getCode();
    var params = {
      QUERY_LAYERS: _.map(mapLayer.getQueryLayers(),'queryLayerName'),
      INFO_FORMAT: mapLayer.getInfoFormat(),
      // PARAMETRI DI TOLLERANZA PER QGIS SERVER
      FI_POINT_TOLERANCE: 10,
      FI_LINE_TOLERANCE: 10,
      FI_POLYGON_TOLERANCE: 10      
    }
    var url = mapLayer.getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
    return url;
  };
}
inherit(MapQueryService,G3WObject);

module.exports = new MapQueryService;

},{"core/g3wobject":3,"core/geometry/geometry":5,"core/project/projectservice":19,"core/utils/utils":22}],14:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectService = require('core/project/projectservice').ProjectService;
var ProjectTypes = require('core/project/projectservice').ProjectTypes;
var GeometryTypes = require('core/geometry/geometry').GeometryTypes;
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var ResetControl = require('g3w-ol3/src/controls/resetcontrol');
var QueryControl = require('g3w-ol3/src/controls/querycontrol');
var ZoomBoxControl = require('g3w-ol3/src/controls/zoomboxcontrol');
var PickCoordinatesInteraction = require('g3w-ol3/src/interactions/pickcoordinatesinteraction');
var WMSLayer = require('core/layer/wmslayer');
var MapQueryService = require('core/map/mapqueryservice');

//var GUI = require('gui/gui'); // QUESTO NON CI DEVE ESSERE!!!

var PickToleranceParams = {};
PickToleranceParams[ProjectTypes.QDJANGO] = {};
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.POINT] = "FI_POINT_TOLERANCE";
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.LINESTRING] = "FI_LINE_TOLERANCE";
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.POLYGON] = "FI_POLYGON_TOLERANCE";

var PickToleranceValues = {}
PickToleranceValues[GeometryTypes.POINT] = 5;
PickToleranceValues[GeometryTypes.LINESTRING] = 5;
PickToleranceValues[GeometryTypes.POLYGON] = 5;

function MapService(){
  var self = this;
  this.config;
  this.viewer;
  this.mapLayers = {};
  this.mapBaseLayers = {};
  this.layersAssociation = {};
  this.layersExtraParams = {};
  this.state = {
      bbox: [],
      resolution: null,
      center: null,
      loading: false
  };
  
  this.init = function(config) {
    this.config = config;
  }
  
  this._howManyAreLoading = 0;
  this._incrementLoaders = function(){
    if (this._howManyAreLoading == 0){
      this.emit('loadstart');
    }
    this._howManyAreLoading += 1;
  };
  
  this._decrementLoaders = function(){
    this._howManyAreLoading -= 1;
    if (this._howManyAreLoading == 0){
      this.emit('loadend');
    }
  };
  
  this._interactionsStack = [];
  
  
  this.setters = {
    setMapView: function(bbox,resolution,center){
      this.state.bbox = bbox;
      this.state.resolution = resolution;
      this.state.center = center;
      this.updateMapLayers(this.mapLayers);
    },
    setupViewer: function(){
      //$script("http://epsg.io/"+ProjectService.state.project.crs+".js");
      proj4.defs("EPSG:"+ProjectService.state.project.crs,ProjectService.state.project.proj4);
      if (self.viewer) {
        this.viewer.destroy();
        this.viewer = null;
      }
      self._setupViewer();
      self.setupControls();
      self.setupLayers();
      self.emit('viewerset');
    }
  };
  
  ProjectService.on('projectset',function(){
    self.setupViewer();
  });
  
  ProjectService.on('projectswitch',function(){
    self.setupLayers();
  });
  
  ProjectService.onafter('setLayersVisible',function(layers){
    var mapLayers = _.map(layers,function(layer){
      return self.getMapLayerForLayer(layer);
    })
    self.updateMapLayers(mapLayers);
  });
  
  ProjectService.onafter('setBaseLayer',function(){
    self.updateMapLayers(self.mapBaseLayers);
  });
  
  this.setLayersExtraParams = function(params,update){
    this.layersExtraParams = _.assign(this.layersExtraParams,params);
    this.emit('extraParamsSet',params,update);
  };
  
  this._setupViewer = function(){
    var extent = ProjectService.state.project.extent;
    var projection = new ol.proj.Projection({
      code: "EPSG:"+ProjectService.state.project.crs,
      extent: extent
    });
    
    /*var constrain_extent;
    if (this.config.constraintextent) {
      var extent = this.config.constraintextent;
      var dx = extent[2]-extent[0];
      var dy = extent[3]-extent[1];
      var dx4 = dx/4;
      var dy4 = dy/4;
      var bbox_xmin = extent[0] + dx4;
      var bbox_xmax = extent[2] - dx4;
      var bbox_ymin = extent[1] + dy4;
      var bbox_ymax = extent[3] - dy4;
      
      constrain_extent = [bbox_xmin,bbox_ymin,bbox_xmax,bbox_ymax];
    }*/
    
    this.viewer = ol3helpers.createViewer({
      view: {
        projection: projection,
        center: this.config.initcenter || ol.extent.getCenter(ProjectService.state.project.extent),
        zoom: this.config.initzoom || 0,
        extent: this.config.constraintextent || extent,
        minZoom: this.config.minzoom || 0, // default di OL3 3.16.0
        maxZoom: this.config.maxzoom || 28 // default di OL3 3.16.0
      }
    });
    
    this.viewer.map.on('moveend',function(e){
      self._setMapView();
    });
    
    MapQueryService.init(this.viewer.map);
    
    this.emit('ready');
  };
  
  this.getViewerElement = function(){
    this.viewer.map.getTargetElement();
  };
  
  this.getViewport = function(){
    return this.viewer.map.getViewport();
  };
  
  this.setupControls = function(){
    var self = this;
    var map = self.viewer.map;
    if (this.config && this.config.controls) {
      _.forEach(this.config.controls,function(controlType){
        var control;
        switch (controlType) {
          case 'reset':
            if (!isMobile.any) {
              control = new ResetControl();
            }
            break;
          case 'zoom':
            control = new ol.control.Zoom({
              zoomInLabel: "\ue98a",
              zoomOutLabel: "\ue98b"
            });
            break;
          case 'zoombox': 
            if (!isMobile.any) {
              control = new ZoomBoxControl();
              control.on('zoomend',function(e){
                self.viewer.fit(e.extent);
              })
            }
            break;
          case 'zoomtoextent':
            control = new ol.control.ZoomToExtent({
              label:  "\ue98c",
              extent: self.config.constraintextent
            });
            break;
          case 'query':
            control = new QueryControl();
            control.on('picked',function(e){
              var coordinates = e.coordinates;
 
              MapQueryService.queryPoint(coordinates,self.mapLayers)
              .then(function(coordinates,nfeatures,featuresForLayerNames){
                var featuresForLayers = [];
                _.forEach(featuresForLayerNames,function(features,layerName){
                  var layer = ProjectService.layers[layerName];
                  featuresForLayers.push({
                    layer: layer,
                    features: features
                  })
                })
                
                self.emit('mapqueryend',featuresForLayers,nfeatures,coordinates,self.state.resolution);
              })
            });
            break;
        }
        
        if (control) {
          self.addControl(control);
        }
      });
    }
  };
  
  this.addControl = function(control){
    this.viewer.map.addControl(control);
  };
  
  this.setupBaseLayers = function(){
    if (!ProjectsRegistry.state.baseLayers){
      return;
    }
    var self = this;
    this.mapBaseLayers = {};
    
    var initBaseLayer = ProjectService.config.initbaselayer;
    var baseLayersArray = ProjectService.state.baseLayers;
    
    _.forEach(baseLayersArray,function(baseLayer){
      var visible = true;
      if (ProjectService.state.project.initbaselayer) {
        visible = baseLayer.id == (ProjectService.state.project.initbaselayer);
      }
      if (baseLayer.fixed) {
        visible = baseLayer.fixed;
      }
      baseLayer.visible = visible;
    })
    
    baseLayersArray.forEach(function(layer){     
      var config = {
        url: ProjectService.getWmsUrl(),
        id: layer.id,
        tiled: true
      };
      
      var mapLayer = new WMSLayer(config);
      self.registerListeners(mapLayer);
      
      mapLayer.addLayer(layer);
      self.mapBaseLayers[layer.id] = mapLayer;
    });
    
    _.forEach(_.values(this.mapBaseLayers).reverse(),function(mapLayer){
      self.viewer.map.addLayer(mapLayer.getOLLayer());
      mapLayer.update(self.state);
    })
  };
  
  this.setupLayers = function(){
    this.viewer.removeLayers();
    
    this.setupBaseLayers();
    
    this.mapLayers = {};
    this.layersAssociation = {};
    var layersArray = this.traverseLayersTree(ProjectService.state.project.layerstree);
    // prendo solo i layer veri e non i folder
    var leafLayersArray = _.filter(layersArray,function(layer){
      return !_.get(layer,'nodes');
    });
    var multiLayers = _.groupBy(leafLayersArray,function(layer){
      return layer.multilayer;
    });
    _.forEach(multiLayers,function(layers,id){
      var layerId = 'layer_'+id
      var mapLayer = _.get(self.mapLayers,layerId);
      var tiled = layers[0].tiled // BRUTTO, da sistemare quando riorganizzeremo i metalayer (da far diventare multilayer). Per ora posso configurare tiled solo i layer singoli
      var config = {
        url: ProjectService.getWmsUrl(),
        id: layerId,
        tiled: tiled
      };
      mapLayer = self.mapLayers[layerId] = new WMSLayer(config,self.layersExtraParams);
      self.registerListeners(mapLayer);
      
      layers.forEach(function(layer){
        mapLayer.addLayer(layer);
        self.layersAssociation[layer.id] = layerId;
      });
    })
    
    _.forEach(_.values(this.mapLayers).reverse(),function(mapLayer){
      self.viewer.map.addLayer(mapLayer.getOLLayer());
      mapLayer.update(self.state,self.layersExtraParams);
    })
  };
  
  this.updateMapLayers = function(mapLayers) {
    var self = this;
    _.forEach(_.values(mapLayers),function(mapLayer){
      mapLayer.update(self.state,self.layersExtraParams);
    })
  };
  
  this.getMapLayerForLayer = function(layer){
    return this.mapLayers['layer_'+layer.multilayer];
  };
  
  this.traverseLayersTree = function(layersTree){
    var self = this;
    var layersArray = [];
    function traverse(obj){
      _.forIn(obj, function (val, key) {
          if (!_.isNil(val.id)) {
              layersArray.unshift(val);
          }
          if (!_.isNil(val.nodes)) {
              traverse(val.nodes);
          }
      });
    }
    traverse(layersTree);
    return layersArray;
  };
  
  this.registerListeners = function(mapLayer){
    mapLayer.on('loadstart',function(){
      self._incrementLoaders();
    });
    mapLayer.on('loadend',function(){
      self._decrementLoaders(false);
    });
    
    this.on('extraParamsSet',function(extraParams,update){
      if (update) {
        mapLayer.update(this.state,extraParams);
      }
    })
  };
  
  this.showViewer = function(elId){
    this.viewer.setTarget(elId);
    var map = this.viewer.map;
    GUI.on('guiready',function(){
      self._setMapView();
    });
  };
  
  
  // per creare una pila di ol.interaction in cui l'ultimo che si aggiunge disattiva temporaemente i precedenti (per poi togliersi di mezzo con popInteraction!)
  // Usato ad es. da pickfeaturetool e getfeatureinfo
  this.pushInteraction = function(interaction){
    if (this._interactionsStack.length){
      var prevInteraction = this._interactionsStack.slice(-1)[0];
      if (_.isArray(prevInteraction)){
        _.forEach(prevInteraction,function(interaction){
          interaction.setActive(false);
        })
      }
      else{
        prevInteraction.setActive(false);
      };
    }
    
    this.viewer.map.addInteraction(interaction);
    interaction.setActive(true);
    this._interactionsStack.push(interaction)
  };
  
  this.popInteraction = function(){
    var interaction = this._interactionsStack.pop();
    this.viewer.map.removeInteraction(interaction);
    
    if (this._interactionsStack.length){
      var prevInteraction = this._interactionsStack.slice(-1)[0];
      if (_.isArray(prevInteraction)){
        _.forEach(prevInteraction,function(interaction){
          interaction.setActive(true);
        })
      }
      else{
        prevInteraction.setActive(true);
      };
    }
  };
  
  this.goTo = function(coordinates,zoom){
    var zoom = zoom || 6;
    this.viewer.goTo(coordinates,zoom);
  };
  
  this.goToWGS84 = function(coordinates,zoom){
    var coordinates = ol.proj.transform(coordinates,'EPSG:4326','EPSG:'+ProjectService.state.project.crs);
    this.goTo(coordinates,zoom);
  };
  
  this.extentToWGS84 = function(extent){
    return ol.proj.transformExtent(extent,'EPSG:'+ProjectService.state.project.crs,'EPSG:4326');
  };
  
  this.getFeatureInfo = function(layerId){
    var self = this;
    var deferred = $.Deferred();
    this._pickInteraction = new PickCoordinatesInteraction();
    //this.viewer.map.addInteraction(this._pickInteraction);
    //this._pickInteraction.setActive(true);
    this.pushInteraction(this._pickInteraction);
    this._pickInteraction.on('picked',function(e){
      self._completeGetFeatureInfo(layerId,e.coordinate,deferred);
    })
    return deferred.promise();
  };
  
  this._completeGetFeatureInfo = function(layerId,coordinate,deferred){
    var self = this;
    var projectType = ProjectService.state.project.type;
    
    var mapLayer = this.mapLayers[this.layersAssociation[layerId]];
    var resolution = self.viewer.getResolution();
    var epsg = self.viewer.map.getView().getProjection().getCode();
    var params = {
      QUERY_LAYERS: ProjectService.getLayer(layerId).name,
      INFO_FORMAT: "text/xml"
    }
    
    if (projectType == ProjectTypes.QDJANGO){
      var toleranceParams = PickToleranceParams[projectType];
      if (toleranceParams){
        var geometrytype = ProjectService.getLayer(layerId).geometrytype;
        params[toleranceParams[geometrytype]] = PickToleranceValues[geometrytype];
      }
    }
    
    var getFeatureInfoUrl = mapLayer.getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
    $.get(getFeatureInfoUrl)
    .then(function(data){
      var x2js = new X2JS();
      var jsonData = x2js.xml2json(data);
      if (jsonData.GetFeatureInfoResponse.Layer.Feature){
        var attributes = jsonData.GetFeatureInfoResponse.Layer.Feature.Attribute;
        var attributesObj = {};
        _.forEach(attributes,function(attribute){
          attributesObj[attribute._name] = attribute._value; // X2JS aggiunge "_" come prefisso degli attributi
        })
        
        deferred.resolve(attributesObj);
      }
      deferred.reject();;
    })
    .fail(function(){
      deferred.reject();
    })
    .always(function(){
      //self.viewer.map.removeInteraction(self._pickInteraction);
      self.popInteraction();
      self._pickInteraction = null;
    })
  };
  
  this.highlightGeometry = function(geometryObj,options){    
    var geometry;
    if (geometryObj instanceof ol.geom.Geometry){
      geometry = geometryObj;
    }
    else {
      format = new ol.format.GeoJSON;
      geometry = format.readGeometry(geometryObj);
    }
    
    if (options.zoom) {
      this.viewer.fit(geometry);
    }
    
    var duration = options.duration || 4000;
    
    if (options.fromWGS84) {
      geometry.transform('EPSG:4326','EPSG:'+ProjectService.state.project.crs);
    }
    
    var feature = new ol.Feature({
      geometry: geometry
    });
    var source = new ol.source.Vector();
    source.addFeatures([feature]);
    var layer = new ol.layer.Vector({
      source: source,
      style: function(feature){
        var styles = [];
        var geometryType = feature.getGeometry().getType();
        if (geometryType == 'LineString') {
          var style = new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: 'rgb(255,255,0)',
              width: 4
            })
          })
          styles.push(style);
        }
        else if (geometryType == 'Point'){
          var style = new ol.style.Style({
            image: new ol.style.Circle({
              radius: 6,
              fill: new ol.style.Fill({
                color: 'rgb(255,255,0)',
              })
            }),
            zIndex: Infinity
          });
          styles.push(style);
        }
        
        return styles;
      }
    })
    layer.setMap(this.viewer.map);
    
    setTimeout(function(){
      layer.setMap(null);
    },duration);
  };
  
  this.refreshMap = function(){
    _.forEach(this.mapLayers,function(wmsLayer){
      wmsLayer.getLayer().getSource().updateParams({"time": Date.now()});
    })
  };
  
  base(this);
  
  this._setMapView = function(){
    var bbox = this.viewer.getBBOX();
    var resolution = this.viewer.getResolution();
    var center = this.viewer.getCenter();
    this.setMapView(bbox,resolution,center);
  };
};

inherit(MapService,G3WObject);

module.exports = new MapService

},{"core/g3wobject":3,"core/geometry/geometry":5,"core/layer/wmslayer":11,"core/map/mapqueryservice":13,"core/project/projectservice":19,"core/project/projectsregistry":20,"core/utils/utils":22,"g3w-ol3/src/controls/querycontrol":25,"g3w-ol3/src/controls/resetcontrol":26,"g3w-ol3/src/controls/zoomboxcontrol":27,"g3w-ol3/src/g3w.ol3":28,"g3w-ol3/src/interactions/pickcoordinatesinteraction":29}],15:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function Plugin(){
  this.id = "plugin";
  this.tools = [];
}
inherit(Plugin,G3WObject);

var proto = Plugin.prototype;

proto.providesTools = function(){
  return this.tools.length > 0;
};

proto.getTools = function(){
  return this.tools;
};

proto.getActions = function(tool){
  return tool.actions;
};

module.exports = Plugin;

},{"core/g3wobject":3,"core/utils/utils":22}],16:[function(require,module,exports){
var base = require('core/utils/utils').base;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

var ToolsService = require('core/plugin/toolsservice');

function PluginsRegistry(){
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this.plugins = {};
  this.state = {
    toolsproviders: []
  };
  
  this.setters = {
    setToolsProvider: function(plugin) {
      self.state.toolsproviders.push(plugin);
    }
  }
  
  base(this);
  
  this.init = function(config){
    var self = this;
    this.config = config;
    _.forEach(config.plugins,function(plugin){
      self._setup(plugin);
    })
  };
  
  // Per permettere la registrazione anche in un secondo momento
  this.register = function(plugin){
    if (!this.plugins[plugin.name]) {
      this._setup(plugin);
    }
  };
  
  this._setup = function(plugin) {
    var self = this;
    var pluginConfig = this.config.configs[plugin.name];
    if (pluginConfig){
      plugin.init(pluginConfig);
      self.plugins[name] = plugin;
    }
  };
  
  this.activate = function(plugin) {
    var tools = plugin.getTools();
    if (tools.length) {
      ToolsService.registerToolsProvider(plugin);
    }
  };
};

inherit(PluginsRegistry,G3WObject);

module.exports = new PluginsRegistry

},{"core/g3wobject":3,"core/plugin/toolsservice":18,"core/utils/utils":22}],17:[function(require,module,exports){
var base = require('core/utils/utils').base;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function PluginsService(){
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this.plugins = {};
  this.state = {
    toolsproviders: []
  };
  
  this.setters = {
    setToolsProvider: function(plugin) {
      self.state.toolsproviders.push(plugin);
    }
  }
  
  base(this);
  
  this.init = function(config){
    var self = this;
    this.config = config;
    _.forEach(config.plugins,function(plugin){
      self._setup(plugin);
    })
    this.emit("initend");
  };
  
  // Per permettere la registrazione anche in un secondo momento
  this.register = function(plugin){
    if (!this.plugins[plugin.name]) {
      this._setup(plugin);
    }
  }
  
  this._setup = function(plugin){
    var self = this;
    var pluginConfig = this.config.configs[plugin.name];
    if (pluginConfig){
      plugin.init(pluginConfig)
      .then(function(){
        self.plugins[name] = plugin;
        if (plugin.providesTools()){
          self.setToolsProvider(plugin);
        }
      })
    }
  }
};

inherit(PluginsService,G3WObject);

module.exports = new PluginsService

},{"core/g3wobject":3,"core/utils/utils":22}],18:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function ToolsService(){
  var self = this;
  this.config = null;
  this._actions = {};
  this.state = {
    tools: []
  };
  
  this.init = function(config){
    this.config = config;
    this.setState();
  };
  
  this.setState = function(){
    this._mergeTools(this.config.tools);
  };
  
  this.registerToolsProvider = function(plugin){
    self._mergeTools(plugin.getTools());
    self._addActions(plugin);
  }
  
  this.fireAction = function(actionid){
    var plugin = this._actions[actionid];
    var method = this._actionMethod(actionid);
    plugin[method]();
  };
  
  this._actionMethod = function(actionid){
    var namespace = actionid.split(":");
    return namespace.pop();
  };
  
  this._mergeTools = function(tools){
    self.state.tools = _.concat(self.state.tools,tools);
  };
  
  this._addActions = function(plugin){
    _.forEach(plugin.getTools(),function(tool){
      _.forEach(plugin.getActions(tool),function(action){
        self._actions[action.id] = plugin;
      })
    })
  };
};

// Make the public service en Event Emitter
inherit(ToolsService,G3WObject);

module.exports = new ToolsService

},{"core/g3wobject":3,"core/utils/utils":22}],19:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils//utils').base;
var G3WObject = require('core/g3wobject');
var LayerState = require('core/layer/layerstate.js');

var ProjectTypes = {
  QDJANGO: 'qdjango',
  OGR: 'ogr'
};

function ProjectService(){
  var self = this;
  this.config = null;
  this.layers = {};
  this.state = {
    project: null,
    baseLayers: []
  };
  
  this.setters = {
    setLayersVisible: function(layers,visible){
      _.forEach(layers,function(layer){
        self.layers[layer.id].visible = visible;
      })
    },
    setBaseLayer: function(id){
      _.forEach(self.state.baseLayers,function(baseLayer){
        baseLayer.visible = (baseLayer.id == id);
      })
    }
  };
  
  this.init = function(config){
    this.config = config;
  };
  
  // genera l'oggetto layers (per riferimento), per semplificare gli aggiornamenti dello stato del layerstree
  this.makeLayersObj = function(layerstree){
    this.layers = {};
    function traverse(obj){
      _.forIn(obj, function (layer, key) {
            //verifica che il valore dell'id non sia nullo
            if (!_.isNil(layer.id)) {
                self.layers[layer.id] = layer;
            }
            if (!_.isNil(layer.nodes)) {
                traverse(layer.nodes);
            }
        });
      };
    traverse(layerstree);
  };
  
  this.getCurrentProject = function(){
    return this.state.project;
  };
  
  this.setProject = function(project,doswitch){
    /* struttura oggetto 'project'
    {
      id,
      type,
      gid,
      name,
      crs,
      extent,
      layerstree,
      widgets
    }
    */
    this.state.project = project;
    this.state.baseLayers = project.baseLayers;
    this.makeLayersObj(project.layerstree);
    var eventType = 'projectset';
    if (doswitch && doswitch === true) {
      eventType = 'projectswitch';
    }
    this.emit(eventType);
  };
  
  this.switchProject = function(project) {
    this.setProject(project,true);
  };
  
  this.getLayer = function(id){
    return this.layers[id];
  };
  
  this.getLayers = function(){
    return this.layers;
  };
  
  this.getLayerById = function(id) {
    var layer = null;
    _.forEach(this.getLayers(),function(_layer){
      if (_layer.id == id){
        layer = _layer;
      }
    });
    return layer;
  };
  
  this.getLayerByName = function(name) {
    var layer = null;
    _.forEach(this.getLayers(),function(_layer){
      if (_layer.name == name){
        layer = _layer;
      }
    });
    return layer;
  };
  
  this.getQueryableLayers = function(){
    var queryableLayers = [];
    _.forEach(this.getLayers(),function(layer){
      if (LayerState.isQueryable(layer)){
        queryableLayers.push(layer);
      }
    });
    return queryableLayers;
  };
  
  this.getLayerAttributes = function(id){
    return this.layers[id].attributes;
  };
  
  this.getLayerAttributeLabel = function(id,name){
    var label = '';
    _.forEach(this.layers[id].attributes,function(attribute){
      if (attribute.name == name){
        label = attribute.label;
      }
    })
    return label;
  };
  
  this.toggleLayer = function(layer,visible){
    var visible = visible || !layer.visible;
    self.setLayersVisible([layer],visible);
  };
  
  this.toggleLayers = function(layers,visible){
    self.setLayersVisible(layers,visible);
  };
  
  this.getWmsUrl = function(){
    return this.config.getWmsUrl(this.state.project);
  };
  
  this.getLegendUrl = function(layer){
    var url = this.getWmsUrl(this.state);
    sep = (url.indexOf('?') > -1) ? '&' : '?';
    return this.getWmsUrl(this.state)+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
  };
  
  base(this);
};

inherit(ProjectService,G3WObject);

module.exports = {
  ProjectService: new ProjectService,
  ProjectTypes: ProjectTypes
};

},{"core/g3wobject":3,"core/layer/layerstate.js":9,"core/utils//utils":22,"core/utils/utils":22}],20:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolvedValue = require('core/utils/utils').resolvedValue;
var rejectedValue = require('core/utils/utils').rejectedValue;
var G3WObject = require('core/g3wobject');
var ProjectService = require('core/project/projectservice').ProjectService;

/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersState: ritorna l'oggetto LayersState
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersState
*/

// Public interface
function ProjectsRegistry(){
  var self = this;
  this.config = null;
  this.initialized = false;
  
  this.setters = {
    setCurrentProject: function(project){
      this.state.currentProject = project;
    }
  };
  
  this.state = {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    projects: [],
    currentProject: null
  }
  
  base(this);
}
inherit(ProjectsRegistry,G3WObject);

var proto = ProjectsRegistry.prototype;

proto.init = function(config){
  if (!this.initialized){
    this.initialized = true;
    this.config = config;
    this.setupState();
    ProjectService.init(config);
    return this.setProject(config.initproject);
  }
};
  
proto.setupState = function(){
  var self = this;
  
  self.state.baseLayers = self.config.baselayers;
  self.state.minScale = self.config.minscale;
  self.state.maxScale = self.config.maxscale;
  self.state.crs = self.config.crs;
  self.state.proj4 = self.config.proj4;
  self.config.projects.forEach(function(project){
    project.baseLayers = self.config.baselayers;
    project.minScale = self.config.minscale;
    project.maxScale = self.config.maxscale;
    project.crs = self.config.crs;
    project.proj4 = self.config.proj4;
    self.state.projects.push(project);
  })
  //this.state.projects = config.group.projects;
};

proto.getCurrentProject = function(){
  return this.state.currentProject;
};
  
proto.setProject = function(projectGid){
  var self = this;
  return this.getProject(projectGid).
  then(function(project){
    ProjectService.setProject(project);
    self.setCurrentProject(project);
  })
};
  
proto.switchProject = function(projectGid) {
  var self = this;
  return this.getProject(projectGid).
  then(function(project){
    ProjectService.switchProject(project);
    self.setCurrentProject(project);
  })
};
  
proto.buildProjectTree = function(project){
  var layers = _.keyBy(project.layers,'id');
  var layersTree = _.cloneDeep(project.layerstree);
  
  function traverse(obj){
    _.forIn(obj, function (layer, key) {
        //verifica che il nodo sia un layer e non un folder
        if (!_.isNil(layer.id)) {
            var fulllayer = _.merge(layer,layers[layer.id]);
            obj[parseInt(key)] = fulllayer;
            var a =1;
        }
        if (!_.isNil(layer.nodes)){
          // aggiungo proprietà title per l'albero
          layer.title = layer.name;
          traverse(layer.nodes);
        }
      });
    };
  traverse(layersTree);
  project.layerstree = layersTree;
};

proto.getProject = function(projectGid){
  var self = this;
  var d = $.Deferred();
  var project = null;
  this.state.projects.forEach(function(_project){
    if (_project.gid == projectGid) {
      project = _project;
    }
  })
  if (!project) {
    return rejectedValue("Project doesn't exist");
  }

  var isFullFilled = !_.isNil(project.layers);
  if (isFullFilled){
    return d.resolve(project);
  }
  else{
    return this.getProjectFullConfig(project)
    .then(function(projectFullConfig){
      project = _.merge(project,projectFullConfig);
      self.buildProjectTree(project);
      return d.resolve(project);
    });
  }
  
  return d.promise();
};
  
  //ritorna una promises
proto.getProjectFullConfig = function(projectBaseConfig){
  var self = this;
  var deferred = $.Deferred();
  var url = this.config.getProjectConfigUrl(projectBaseConfig);
  $.get(url).done(function(projectFullConfig){
      deferred.resolve(projectFullConfig);
  })
  return deferred.promise();
};

module.exports = new ProjectsRegistry();

},{"core/g3wobject":3,"core/project/projectservice":19,"core/utils/utils":22}],21:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var Base64 = require('core/utils/utils').Base64;
var G3WObject = require('core/g3wobject');

var RouterService = function(){
  var self = this;
  this._route = '';
  this.setters = {
    setRoute: function(path){
      this._route = path;
    }
  }
  
  History.Adapter.bind(window,'statechange',function(){ // Note: We are using statechange instead of popstate
      var state = History.getState(); // Note: We are using History.getState() instead of event.state
      var hash = state.hash;
      self.setRouteFromHash(hash);
  });
  
  base(this);
};
inherit(RouterService,G3WObject);

var proto = RouterService.prototype;

proto.initRoute = function(){
  var firstHash = window.location.search;
  this.setRouteFromHash(firstHash);
}

proto.goto = function(path){
  var pathb64 = Base64.encode(path);
  History.pushState({path:path},null,'?p='+pathb64);
  //this.setRoute(path);
};

proto.setRouteFromHash = function(hash) {
  var pathb64 = this.getQueryParams(hash)['p'];
  var path = pathb64 ? Base64.decode(pathb64) : '';
  this.setRoute(path);
}

proto.slicePath = function(path){
  return path.split('?')[0].split('/');
};
  
proto.sliceFirst = function(path){
  var pathAndQuery = path.split('?');
  var queryString = pathAndQuery[1];
  var pathArr = pathAndQuery[0].split('/')
  var firstPath = pathArr[0];
  path = pathArr.slice(1).join('/');
  path = [path,queryString].join('?')
  return [firstPath,path];
};
  
proto.getQueryParams = function(path){
  var queryParams = {};
  try {
    var queryString = path.split('?')[1];
    var queryPairs = queryString.split('&');
    var queryParams = {};
    _.forEach(queryPairs,function(queryPair){
      var pair = queryPair.split('=');
      var key = pair[0];
      var value = pair[1];
      queryParams[key] = value;
    });
  }
  catch (e) {}
  return queryParams;
};

proto.getQueryString = function(path){
  return path.split('?')[1];
};
  
proto.makeQueryString = function(queryParams){};

module.exports = new RouterService;

},{"core/g3wobject":3,"core/utils/utils":22}],22:[function(require,module,exports){

/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment.
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number} The adjusted value.
 */
function decimalAdjust(type, value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

// Decimal round
if (!Math.round10) {
  Math.round10 = function(value, exp) {
    return decimalAdjust('round', value, exp);
  };
}
// Decimal floor
if (!Math.floor10) {
  Math.floor10 = function(value, exp) {
    return decimalAdjust('floor', value, exp);
  };
}
// Decimal ceil
if (!Math.ceil10) {
  Math.ceil10 = function(value, exp) {
    return decimalAdjust('ceil', value, exp);
  };
}

String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

var Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};


var utils = {
  mixin: function mixin(destination, source) {
      return utils.merge(destination.prototype, source);
  },
  
  mixininstance: function mixininstance(destination,source){
      var sourceInstance = new source;
      utils.merge(destination, sourceInstance);
      utils.merge(destination.prototype, source.prototype);
  },


  merge: function merge(destination, source) {
      var key;

      for (key in source) {
          if (utils.hasOwn(source, key)) {
              destination[key] = source[key];
          }
      }
  },

  hasOwn: function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
  },
  
  inherit:function(childCtor, parentCtor) {
    function tempCtor() {};
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    childCtor.prototype.constructor = childCtor;
  },
  
  base: function(me, opt_methodName, var_args) {
    var caller = arguments.callee.caller;
    if (caller.superClass_) {
      // This is a constructor. Call the superclass constructor.
      return caller.superClass_.constructor.apply(
          me, Array.prototype.slice.call(arguments, 1));
    }

    var args = Array.prototype.slice.call(arguments, 2);
    var foundCaller = false;
    for (var ctor = me.constructor;
         ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
      if (ctor.prototype[opt_methodName] === caller) {
        foundCaller = true;
      } else if (foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args);
      }
    }

    // If we did not find the caller in the prototype chain,
    // then one of two things happened:
    // 1) The caller is an instance method.
    // 2) This method was not called by the right caller.
    if (me[opt_methodName] === caller) {
      return me.constructor.prototype[opt_methodName].apply(me, args);
    } else {
      throw Error(
          'base called from a method of one name ' +
          'to a method of a different name');
    }
  },
  
  noop: function(){},
  
  truefnc: function(){return true},
  
  falsefnc: function(){return true},
  
  resolvedValue: function(value){
    var deferred = $.Deferred();
    deferred.resolve(value);
    return deferred.promise();
  },
  
  rejectedValue: function(value){
    var deferred = $.Deferred();
    deferred.reject(value);
    return deferred.promise();
  },
  
  Base64: Base64
};

module.exports = utils;

},{}],23:[function(require,module,exports){
var Control = function(options){
  var name = options.name || "?";
  this.name = name.split(' ').join('-').toLowerCase();
  this.id = this.name+'_'+(Math.floor(Math.random() * 1000000));
  
  if (!options.element) {
    var className = "ol-"+this.name.split(' ').join('-').toLowerCase();
    var tipLabel = options.tipLabel || this.name;
    var label = options.label || "?";
    
    options.element = $('<div class="'+className+' ol-unselectable ol-control"><button type="button" title="'+tipLabel+'">'+label+'</button></div>')[0];
  }
  
  var buttonClickHandler = options.buttonClickHandler || Control.prototype._handleClick.bind(this);
  
  $(options.element).on('click',buttonClickHandler);
  
  ol.control.Control.call(this,options);
  
  this._postRender();
}
ol.inherits(Control, ol.control.Control);


var proto = Control.prototype;

proto._handleClick = function(){
  var self = this;
  var map = this.getMap();
  
  var resetControl = null;
  // remove all the other, eventually toggled, interactioncontrols
  var controls = map.getControls();
  controls.forEach(function(control){
    if(control.id && control.toggle && (control.id != self.id)) {
      control.toggle(false);
      if (control.name == 'reset') {
        resetControl = control;
      }
    }
  });
  if (!self._toggled && resetControl) {
    resetControl.toggle(true);
  }
};

proto._postRender = function(){};

module.exports = Control;

},{}],24:[function(require,module,exports){
var Control = require('./control');

var InteractionControl = function(options){
  this._toggled = this._toggled || false;
  this._interaction = options.interaction || null;
  this._autountoggle = options.autountoggle || false;
  
  options.buttonClickHandler = InteractionControl.prototype._handleClick.bind(this);
  
  Control.call(this,options);
};
ol.inherits(InteractionControl, Control);

var proto = InteractionControl.prototype;

proto.toggle = function(toggle){
  var toggle = toggle !== undefined ? toggle : !this._toggled
  this._toggled = toggle;
  var map = this.getMap();
  var controlButton = $(this.element).find('button').first();
  
  if (toggle) {
    if (this._interaction) {
      map.addInteraction(this._interaction);
    }
    controlButton.addClass('g3w-ol-toggled');
  }
  else {
    if (this._interaction) {
      map.removeInteraction(this._interaction);
    }
    controlButton.removeClass('g3w-ol-toggled');
  }
}

proto._handleClick = function(e){
  this.toggle();
  Control.prototype._handleClick.call(this,e);
};

module.exports = InteractionControl;

},{"./control":23}],25:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var PickCoordinatesInteraction = require('../interactions/pickcoordinatesinteraction');

var QueryControl = function(options){
  var self = this;
  var _options = {
    name: "querylayer",
    tipLabel: "Query layer",
    label: "\uea0f",
    interaction: new PickCoordinatesInteraction
  };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
  
  this._interaction.on('picked',function(e){
    self.dispatchEvent({
      type: 'picked',
      coordinates: e.coordinate
    });
    if (self._autountoggle) {
      self.toggle();
    }
  });
}
ol.inherits(QueryControl, InteractionControl);

module.exports = QueryControl;

},{"../interactions/pickcoordinatesinteraction":29,"../utils":33,"./interactioncontrol":24}],26:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ResetControl = function(options){
  var self = this;
  this._toggled = true;
  this._startCoordinate = null;
  var _options = {
      name: "reset",
      tipLabel: "Pan",
      label: "\ue901",
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
}
ol.inherits(ResetControl, InteractionControl);
module.exports = ResetControl;

var proto = ResetControl.prototype;

proto._postRender = function(){
  this.toggle(true);
};

},{"../utils":33,"./interactioncontrol":24}],27:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ZoomBoxControl = function(options){
  var self = this;
  this._startCoordinate = null;
  var _options = {
      name: "zoombox",
      tipLabel: "Zoom to box",
      label: "\ue900",
      interaction: new ol.interaction.DragBox
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
  
  this._interaction.on('boxstart',function(e){
    self._startCoordinate = e.coordinate;
  });
  
  this._interaction.on('boxend',function(e){
    var start_coordinate = self._startCoordinate;
    var end_coordinate = e.coordinate;
    var extent = ol.extent.boundingExtent([start_coordinate,end_coordinate]);
    self.dispatchEvent({
      type: 'zoomend',
      extent: extent
    });
    self._startCoordinate = null;
    if (self._autountoggle) {
      self.toggle();
    }
  })
}
ol.inherits(ZoomBoxControl, InteractionControl);
module.exports = ZoomBoxControl;

},{"../utils":33,"./interactioncontrol":24}],28:[function(require,module,exports){
var utils = require('./utils');
var maphelpers = require('./map/maphelpers');

(function (name, root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  }
  else if (typeof exports === 'object') {
    module.exports = factory();
  }
  else {
    root[name] = factory();
  }
})('g3wol3', this, function () {
  'use strict';
  
  var helpers = utils.merge({},maphelpers);
  
  return {
    helpers: helpers
  }
});

},{"./map/maphelpers":32,"./utils":33}],29:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7}],30:[function(require,module,exports){
var BaseLayers = {};

BaseLayers.OSM = new ol.layer.Tile({
  source: new ol.source.OSM({
    attributions: [
      new ol.Attribution({
        html: 'All maps &copy; ' +
            '<a href="http://www.openstreetmap.org/">OpenStreetMap</a>'
      }),
      ol.source.OSM.ATTRIBUTION
    ],
    url: 'http://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    crossOrigin: null
  }),
  id: 'osm',
  title: 'OSM',
  basemap: true
});

BaseLayers.BING = {};

BaseLayers.BING.Road = new ol.layer.Tile({
  name:'Road',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'Road'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

BaseLayers.BING.AerialWithLabels = new ol.layer.Tile({
  name: 'AerialWithLabels',
  visible: true,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'AerialWithLabels'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

BaseLayers.BING.Aerial = new ol.layer.Tile({
  name: 'Aerial',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'Aerial'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

module.exports = BaseLayers;

},{}],31:[function(require,module,exports){
var utils = require('../utils');
var RasterLayers = {};

RasterLayers.TiledWMSLayer = function(layerObj,extraParams){
  var options = {
    layerObj: layerObj,
    extraParams: extraParams || {},
    tiled: true
  }
  return RasterLayers._WMSLayer(options);
};

RasterLayers.WMSLayer = function(layerObj,extraParams){
  var options = {
    layerObj: layerObj,
    extraParams: extraParams || {}
  }
  return RasterLayers._WMSLayer(options);
};

RasterLayers._WMSLayer = function(options){
  var layerObj = options.layerObj;
  var extraParams = options.extraParams;
  var tiled = options.tiled || false;
  
  var params = {
    LAYERS: layerObj.layers || '',
    VERSION: '1.3.0',
    TRANSPARENT: true,
    SLD_VERSION: '1.1.0'
  };
  
  params = utils.merge(params,extraParams);
  
  var sourceOptions = {
    url: layerObj.url,
    params: params,
    ratio: 1
  };
  
  var imageOptions = {
    id: layerObj.id,
    name: layerObj.name,
    opacity: layerObj.opacity || 1.0,
    visible:layerObj.visible,
    maxResolution: layerObj.maxResolution
  }
  
  var imageClass;
  var source;
  if (tiled) {
    source = new ol.source.TileWMS(sourceOptions);
    imageClass = ol.layer.Tile;
    //imageOptions.extent = [1134867,3873002,2505964,5596944];
  }
  else {
    source = new ol.source.ImageWMS(sourceOptions)
    imageClass = ol.layer.Image;
  }
  
  imageOptions.source = source;
  
  var layer = new imageClass(imageOptions);
  
  return layer;
};

/*RasterLayers.TiledWMSLayer = function(layerObj){
  var layer = new ol.layer.Tile({
    name: layerObj.name,
    opacity: 1.0,
    source: new ol.source.TileWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.layers || '',
        VERSION: '1.3.0',
        TRANSPARENT: true
      }
    }),
    visible: layerObj.visible
  });
  
  return layer;
};*/

module.exports = RasterLayers;


},{"../utils":33}],32:[function(require,module,exports){
BaseLayers = require('../layers/bases');

var MapHelpers = {
  createViewer: function(opts){
    return new _Viewer(opts);
  }
};

var _Viewer = function(opts){
  var controls = ol.control.defaults({
    attributionOptions: {
      collapsible: false
    },
    zoom: false,
    attribution: false
  });//.extend([new ol.control.Zoom()]);
  
  var interactions = ol.interaction.defaults()
    .extend([
      new ol.interaction.DragRotate()
    ]);
  interactions.removeAt(1) // rimuovo douclickzoom
  
  var view = new ol.View(opts.view);
  var options = {
    controls: controls,
    interactions: interactions,
    ol3Logo: false,
    view: view,
    keyboardEventTarget: document
  };
  if (opts.id){
    options.target = opts.id;
  }
  var map  = new ol.Map(options);
  this.map = map;
};

_Viewer.prototype.destroy = function(){
  if (this.map) {
    this.map.dispose();
    this.map = null
  }
};

_Viewer.prototype.updateMap = function(mapObject){};

_Viewer.prototype.updateView = function(){};

_Viewer.prototype.getMap = function(){
  return this.map;
};

_Viewer.prototype.setTarget = function(id){
  this.map.setTarget(id);
};

_Viewer.prototype.goTo = function(coordinates, zoom){
  var options = options || {};
  var animate = options.animate || true;
  var view = this.map.getView();
  
  if (animate) {
    var pan = ol.animation.pan({
      duration: 500,
      source: view.getCenter()
    });
    var zoom = ol.animation.zoom({
      duration: 500,
      resolution: view.getResolution()
    });
    this.map.beforeRender(pan,zoom);
  }
  
  view.setCenter(coordinates);
  view.setZoom(zoom);
};

_Viewer.prototype.goToRes = function(coordinates, resolution){
  var options = options || {};
  var animate = options.animate || true;
  var view = this.map.getView();
  
  if (animate) {
    var pan = ol.animation.pan({
      duration: 500,
      source: view.getCenter()
    });
    var zoom = ol.animation.zoom({
      duration: 500,
      resolution: view.getResolution()
    });
    this.map.beforeRender(pan,zoom);
  }

  view.setCenter(coordinates);
  view.setResolution(resolution);
};

_Viewer.prototype.fit = function(geometry, options){
  var view = this.map.getView();
  
  var options = options || {};
  var animate = options.animate || true;
  
  if (animate) {
    var pan = ol.animation.pan({
      duration: 500,
      source: view.getCenter()
    });
    var zoom = ol.animation.zoom({
      duration: 500,
      resolution: view.getResolution()
    });
    this.map.beforeRender(pan,zoom);
  }
  
  if (options.animate) {
    delete options.animate; // non lo passo al metodo di OL3 perché è un'opzione interna
  }
  options.constrainResolution = options.constrainResolution || false;
  
  view.fit(geometry,this.map.getSize(),options);
};

_Viewer.prototype.getZoom = function(){
  var view = this.map.getView();
  return view.getZoom();
};

_Viewer.prototype.getResolution = function(){
  var view = this.map.getView();
  return view.getResolution();
};

_Viewer.prototype.getCenter = function(){
  var view = this.map.getView();
  return view.getCenter();
};

_Viewer.prototype.getBBOX = function(){
  return this.map.getView().calculateExtent(this.map.getSize());
};

_Viewer.prototype.getLayerByName = function(layerName) {
  var layers = this.map.getLayers();
  var length = layers.getLength();
  for (var i = 0; i < length; i++) {
    if (layerName === layers.item(i).get('name')) {
      return layers.item(i);
    }
  }
  return null;
};

_Viewer.prototype.removeLayerByName = function(layerName){
  var layer = this.getLayerByName(layerName);
  if (layer){
    this.map.removeLayer(layer);
    delete layer;
  }
};

_Viewer.prototype.getActiveLayers = function(){
  var activelayers = [];
  this.map.getLayers().forEach(function(layer) {
    var props = layer.getProperties();
    if (props.basemap != true && props.visible){
       activelayers.push(layer);
    }
  });
  
  return activelayers;
};

_Viewer.prototype.removeLayers = function(){
  this.map.getLayers().clear();
};

_Viewer.prototype.getLayersNoBase = function(){
  var layers = [];
  this.map.getLayers().forEach(function(layer) {
    var props = layer.getProperties();
    if (props.basemap != true){
      layers.push(layer);
    }
  });
  
  return layers;
};

_Viewer.prototype.addBaseLayer = function(type){
  var layer;
  type ? layer = BaseLayers[type]:  layer = BaseLayers.BING.Aerial;
  this.map.addLayer(layer);
};

_Viewer.prototype.changeBaseLayer = function(layerName){
  var baseLayer = this.getLayerByName(layername);
  var layers = this.map.getLayers();
  layers.insertAt(0, baseLayer);
};

module.exports = MapHelpers;

},{"../layers/bases":30}],33:[function(require,module,exports){
var utils = {
  merge: function(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  }
}

module.exports = utils;

},{}],34:[function(require,module,exports){
module.exports = "<li>\n<form role=\"form\">\n  <div class=\"box-body\">\n    <div class=\"form-group\">\n      <label for=\"exampleInputEmail1\" style=\"color: white\">Email address</label>\n      <input type=\"email\" class=\"form-control\" id=\"exampleInputEmail1\" placeholder=\"\">\n    </div>\n    <div class=\"form-group\">\n      <button type=\"button\" class=\"btn btn-primary\">Ciao</button>\n    </div>\n  </div>\n</form>\n</li>";

},{}],35:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;

Vue.component('g3w-search',{
    template: require('gui/components/search/search.html'),
    data: function() {
    	return {
        	
        };
    },
    methods: {
    	
	}
});

},{"core/i18n/i18n.service":6,"gui/components/search/search.html":34}],36:[function(require,module,exports){
var g3w = {};

g3w.core = {
   G3WObject: require('core/g3wobject'),
   utils: require('core/utils/utils'),
   Application: require('core/application'),
   ApiService: require('core/apiservice'),
   Router: require('core/router'),
   ProjectsRegistry: require('core/project/projectsregistry'),
   ProjectService: require('core/project/projectservice'),
   MapService: require('core/map/mapservice'),
   MapQueryService: require('core/map/mapqueryservice'),
   MapLayer: require('core/map/maplayer'),
   LayerState: require('core/layer/layerstate'),
   VectorLayer: require('core/layer/vectorlayer'),
   WmsLayer: require('core/layer/wmslayer'),
   Geometry: require('core/geometry/geometry'),
   geom: require('core/geometry/geom'),
   PickCoordinatesInteraction: require('core/interactions/pickcoordinatesinteraction'),
   PickFeatureInteraction: require('core/interactions/pickfeatureinteraction'),
   i18n: require('core/i18n/i18n.service'),
   Plugin: require('core/plugin/plugin'),
   PluginsRegistry: require('core/plugin/pluginsregistry'),
   PluginsService: require('core/plugin/pluginsservice'),
   ToolsService: require('core/plugin/toolsservice')
};

g3w.gui = {
  //Geocoding: require('gui/components/geocoding/geocoding'),
  Search: require('gui/components/search/search')
}

(function (exports) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
      define(function () {
          return g3w;
      });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = g3w;
    }
    else {
        exports.g3w = g3w;
    }
}(this || {}));

},{"core/apiservice":1,"core/application":2,"core/g3wobject":3,"core/geometry/geom":4,"core/geometry/geometry":5,"core/i18n/i18n.service":6,"core/interactions/pickcoordinatesinteraction":7,"core/interactions/pickfeatureinteraction":8,"core/layer/layerstate":9,"core/layer/vectorlayer":10,"core/layer/wmslayer":11,"core/map/maplayer":12,"core/map/mapqueryservice":13,"core/map/mapservice":14,"core/plugin/plugin":15,"core/plugin/pluginsregistry":16,"core/plugin/pluginsservice":17,"core/plugin/toolsservice":18,"core/project/projectservice":19,"core/project/projectsregistry":20,"core/router":21,"core/utils/utils":22,"gui/components/search/search":35}]},{},[36])(36)
});


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb3JlL2FwaXNlcnZpY2UuanMiLCJjb3JlL2FwcGxpY2F0aW9uLmpzIiwiY29yZS9nM3dvYmplY3QuanMiLCJjb3JlL2dlb21ldHJ5L2dlb20uanMiLCJjb3JlL2dlb21ldHJ5L2dlb21ldHJ5LmpzIiwiY29yZS9pMThuL2kxOG4uc2VydmljZS5qcyIsImNvcmUvaW50ZXJhY3Rpb25zL3BpY2tjb29yZGluYXRlc2ludGVyYWN0aW9uLmpzIiwiY29yZS9pbnRlcmFjdGlvbnMvcGlja2ZlYXR1cmVpbnRlcmFjdGlvbi5qcyIsImNvcmUvbGF5ZXIvbGF5ZXJzdGF0ZS5qcyIsImNvcmUvbGF5ZXIvdmVjdG9ybGF5ZXIuanMiLCJjb3JlL2xheWVyL3dtc2xheWVyLmpzIiwiY29yZS9tYXAvbWFwbGF5ZXIuanMiLCJjb3JlL21hcC9tYXBxdWVyeXNlcnZpY2UuanMiLCJjb3JlL21hcC9tYXBzZXJ2aWNlLmpzIiwiY29yZS9wbHVnaW4vcGx1Z2luLmpzIiwiY29yZS9wbHVnaW4vcGx1Z2luc3JlZ2lzdHJ5LmpzIiwiY29yZS9wbHVnaW4vcGx1Z2luc3NlcnZpY2UuanMiLCJjb3JlL3BsdWdpbi90b29sc3NlcnZpY2UuanMiLCJjb3JlL3Byb2plY3QvcHJvamVjdHNlcnZpY2UuanMiLCJjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeS5qcyIsImNvcmUvcm91dGVyLmpzIiwiY29yZS91dGlscy91dGlscy5qcyIsImczdy1vbDMvc3JjL2NvbnRyb2xzL2NvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy9pbnRlcmFjdGlvbmNvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy9xdWVyeWNvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy9yZXNldGNvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy96b29tYm94Y29udHJvbC5qcyIsImczdy1vbDMvc3JjL2czdy5vbDMuanMiLCJnM3ctb2wzL3NyYy9sYXllcnMvYmFzZXMuanMiLCJnM3ctb2wzL3NyYy9sYXllcnMvcmFzdGVycy5qcyIsImczdy1vbDMvc3JjL21hcC9tYXBoZWxwZXJzLmpzIiwiZzN3LW9sMy9zcmMvdXRpbHMuanMiLCJndWkvY29tcG9uZW50cy9zZWFyY2gvc2VhcmNoLmh0bWwiLCJndWkvY29tcG9uZW50cy9zZWFyY2gvc2VhcmNoLmpzIiwiaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgcmVqZWN0ZWRWYWx1ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3RlZFZhbHVlO1xuXG5mdW5jdGlvbiBBcGlTZXJ2aWNlKCl7XG4gIHRoaXMuX2NvbmZpZyA9IG51bGw7XG4gIHRoaXMuX2Jhc2VVcmwgPSBudWxsO1xuICB0aGlzLl9hcGlVcmxzID0ge307XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB0aGlzLl9jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5fYmFzZVVybCA9IGNvbmZpZy51cmxzLmFwaTtcbiAgICB0aGlzLl9hcGlFbmRwb2ludHMgPSBjb25maWcudXJscy5hcGlFbmRwb2ludHM7XG4gIH07XG4gIFxuICB2YXIgaG93TWFueUFyZUxvYWRpbmcgPSAwO1xuICB0aGlzLl9pbmNyZW1lbnRMb2FkZXJzID0gZnVuY3Rpb24oKXtcbiAgICBpZiAoaG93TWFueUFyZUxvYWRpbmcgPT0gMCl7XG4gICAgICB0aGlzLmVtaXQoJ2FwaXF1ZXJ5c3RhcnQnKTtcbiAgICB9XG4gICAgaG93TWFueUFyZUxvYWRpbmcgKz0gMTtcbiAgfTtcbiAgXG4gIHRoaXMuX2RlY3JlbWVudExvYWRlcnMgPSBmdW5jdGlvbigpe1xuICAgIGhvd01hbnlBcmVMb2FkaW5nIC09IDE7XG4gICAgaWYgKGhvd01hbnlBcmVMb2FkaW5nID09IDApe1xuICAgICAgdGhpcy5lbWl0KCdhcGlxdWVyeWVuZCcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuZ2V0ID0gZnVuY3Rpb24oYXBpLG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGFwaUVuZFBvaW50ID0gdGhpcy5fYXBpRW5kcG9pbnRzW2FwaV07XG4gICAgaWYgKGFwaUVuZFBvaW50KSB7XG4gICAgICB2YXIgY29tcGxldGVVcmwgPSB0aGlzLl9iYXNlVXJsICsgJy8nICsgYXBpRW5kUG9pbnQ7XG4gICAgICBpZiAob3B0aW9ucy5yZXF1ZXN0KSB7XG4gICAgICAgICBjb21wbGV0ZVVybCA9IGNvbXBsZXRlVXJsICsgJy8nICsgb3B0aW9ucy5yZXF1ZXN0O1xuICAgICAgfVxuICAgICAgdmFyIHBhcmFtcyA9IG9wdGlvbnMucGFyYW1zIHx8IHt9O1xuICAgICAgXG4gICAgICBzZWxmLmVtaXQoYXBpKydxdWVyeXN0YXJ0Jyk7XG4gICAgICB0aGlzLl9pbmNyZW1lbnRMb2FkZXJzKCk7XG4gICAgICByZXR1cm4gJC5nZXQoY29tcGxldGVVcmwscGFyYW1zKVxuICAgICAgLmRvbmUoZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICBzZWxmLmVtaXQoYXBpKydxdWVyeWVuZCcscmVzcG9uc2UpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oZSl7XG4gICAgICAgIHNlbGYuZW1pdChhcGkrJ3F1ZXJ5ZmFpbCcsZSk7XG4gICAgICAgIHJldHVybiBlO1xuICAgICAgfSlcbiAgICAgIC5hbHdheXMoZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5fZGVjcmVtZW50TG9hZGVycygpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIHJlamVjdGVkVmFsdWUoKTtcbiAgICB9XG4gIH07XG4gIFxuICBiYXNlKHRoaXMpO1xufVxuaW5oZXJpdChBcGlTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEFwaVNlcnZpY2U7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIEFwaVNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL2FwaXNlcnZpY2UnKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcbnZhciBQbHVnaW5zUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3BsdWdpbi9wbHVnaW5zcmVnaXN0cnknKTtcblxudmFyIEFwcFNlcnZpY2UgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgdGhpcy5fbW9kYWxPdmVybGF5ID0gbnVsbDtcbiAgdGhpcy5jb25maWcgPSB7fTtcblxuICAvLyBjaGlhbWEgaWwgY29zdHJ1dHRvcmUgZGkgRzNXT2JqZWN0IChjaGUgaW4gcXVlc3RvIG1vbWVudG8gbm9uIGZhIG5pZW50ZSlcbiAgYmFzZSh0aGlzKTtcbn07XG5pbmhlcml0KEFwcFNlcnZpY2UsRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gQXBwU2VydmljZS5wcm90b3R5cGU7XG5cbnByb3RvLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgdGhpcy5fYm9vdHN0cmFwKCk7XG59O1xuXG5wcm90by5fYm9vdHN0cmFwID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIXRoaXMuaW5pdGlhbGl6ZWQpe1xuICAgIC8vaW5pemlhbGl6emEgbGEgY29uZmlndXJhemlvbmUgZGVpIHNlcnZpemkuIE9nbnVuZ28gY2VyY2hlcsOgIGRhbCBjb25maWcgcXVlbGxvIGRpIGN1aSBhdnLDoCBiaXNvZ25vXG4gICAgLy91bmEgdm9sdGEgZmluaXRhIGxhIGNvbmZpZ3VyYXppb25lIGVtZXR0byBsJ2V2ZW50byByZWFkeS4gQSBxdWVzdG8gcHVudG8gcG90csOyIGF2dmlhcmUgbCdpc3RhbnphIFZ1ZSBnbG9iYWxlXG4gICAgJC53aGVuKFxuICAgICAgQXBpU2VydmljZS5pbml0KHRoaXMuY29uZmlnKSxcbiAgICAgIFByb2plY3RzUmVnaXN0cnkuaW5pdCh0aGlzLmNvbmZpZyksXG4gICAgICBQbHVnaW5zUmVnaXN0cnkuaW5pdCh0aGlzLmNvbmZpZy5wbHVnaW5zKVxuICAgICkudGhlbihmdW5jdGlvbigpe1xuICAgICAgc2VsZi5lbWl0KCdyZWFkeScpO1xuICAgICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSk7XG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBBcHBTZXJ2aWNlO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBub29wID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLm5vb3A7XG5cbi8qKlxuICogVW4gb2dnZXR0byBiYXNlIGluIGdyYWRvIGRpIGdlc3RpcmUgZXZlbnR1YWxpIHNldHRlciBlIHJlbGF0aXZhIGNhdGVuYSBkaSBsaXN0ZW5lcnMuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEczV09iamVjdCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLnNldHRlcnMpe1xuICAgIHRoaXMuX3NldHVwTGlzdGVuZXJzQ2hhaW4odGhpcy5zZXR0ZXJzKTtcbiAgfVxufTtcbmluaGVyaXQoRzNXT2JqZWN0LEV2ZW50RW1pdHRlcik7XG5cbnZhciBwcm90byA9IEczV09iamVjdC5wcm90b3R5cGU7XG5cbi8qKlxuICogSW5zZXJpc2NlIHVuIGxpc3RlbmVyIGRvcG8gY2hlIMOoIHN0YXRvIGVzZWd1aXRvIGlsIHNldHRlclxuICogQHBhcmFtIHtzdHJpbmd9IHNldHRlciAtIElsIG5vbWUgZGVsIG1ldG9kbyBzdSBjdWkgc2kgY3VvbGUgcmVnaXN0cmFyZSB1bmEgZnVuemlvbmUgbGlzdGVuZXJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGxpc3RlbmVyIC0gVW5hIGZ1bnppb25lIGxpc3RlbmVyIChzb2xvIHNpbmNyb25hKVxuICovXG5wcm90by5vbmFmdGVyID0gZnVuY3Rpb24oc2V0dGVyLGxpc3RlbmVyKXtcbiAgcmV0dXJuIHRoaXMuX29uc2V0dGVyKCdhZnRlcicsc2V0dGVyLGxpc3RlbmVyLGZhbHNlKTtcbn07XG5cbi8vIHVuIGxpc3RlbmVyIHB1w7IgcmVnaXN0cmFyc2kgaW4gbW9kbyBkYSBlc3NlcmUgZXNlZ3VpdG8gUFJJTUEgZGVsbCdlc2VjdXppb25lIGRlbCBtZXRvZG8gc2V0dGVyLiBQdcOyIHJpdG9ybmFyZSB0cnVlL2ZhbHNlIHBlclxuLy8gdm90YXJlIGEgZmF2b3JlIG8gbWVubyBkZWxsJ2VzZWN1emlvbmUgZGVsIHNldHRlci4gU2Ugbm9uIHJpdG9ybmEgbnVsbGEgbyB1bmRlZmluZWQsIG5vbiB2aWVuZSBjb25zaWRlcmF0byB2b3RhbnRlXG4vKipcbiAqIEluc2VyaXNjZSB1biBsaXN0ZW5lciBwcmltYSBjaGUgdmVuZ2EgZXNlZ3VpdG8gaWwgc2V0dGVyLiBTZSByaXRvcm5hIGZhbHNlIGlsIHNldHRlciBub24gdmllbmUgZXNlZ3VpdG9cbiAqIEBwYXJhbSB7c3RyaW5nfSBzZXR0ZXIgLSBJbCBub21lIGRlbCBtZXRvZG8gc3UgY3VpIHNpIGN1b2xlIHJlZ2lzdHJhcmUgdW5hIGZ1bnppb25lIGxpc3RlbmVyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBsaXN0ZW5lciAtIFVuYSBmdW56aW9uZSBsaXN0ZW5lciwgYSBjdWkgdmllbmUgcGFzc2F0byB1bmEgZnVuemlvbmUgXCJuZXh0XCIgY29tZSB1bHRpbW8gcGFyYW1ldHJvLCBkYSB1c2FyZSBuZWwgY2FzbyBkaSBsaXN0ZW5lciBhc2luY3JvbmlcbiAqL1xucHJvdG8ub25iZWZvcmUgPSBmdW5jdGlvbihzZXR0ZXIsbGlzdGVuZXIpe1xuICByZXR1cm4gdGhpcy5fb25zZXR0ZXIoJ2JlZm9yZScsc2V0dGVyLGxpc3RlbmVyLGZhbHNlKTtcbn07XG5cbi8qKlxuICogSW5zZXJpc2NlIHVuIGxpc3RlbmVyIHByaW1hIGNoZSB2ZW5nYSBlc2VndWl0byBpbCBzZXR0ZXIuIEFsIGxpc3RlbmVyIHZpZW5lIHBhc3NhdG8gdW5hIGZ1bnppb25lIFwibmV4dFwiIGNvbWUgdWx0aW1vIHBhcmFtZXRybywgZGEgY2hpYW1hcmUgY29uIHBhcmFtZXRybyB0cnVlL2ZhbHNlIHBlciBmYXIgcHJvc2VndWlyZSBvIG1lbm8gaWwgc2V0dGVyXG4gKiBAcGFyYW0ge3N0cmluZ30gc2V0dGVyIC0gSWwgbm9tZSBkZWwgbWV0b2RvIHN1IGN1aSBzaSBjdW9sZSByZWdpc3RyYXJlIHVuYSBmdW56aW9uZSBsaXN0ZW5lclxuICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXIgLSBVbmEgZnVuemlvbmUgbGlzdGVuZXIsIGEgY3VpIFxuICovXG5wcm90by5vbmJlZm9yZWFzeW5jID0gZnVuY3Rpb24oc2V0dGVyLGxpc3RlbmVyKXtcbiAgcmV0dXJuIHRoaXMuX29uc2V0dGVyKCdiZWZvcmUnLHNldHRlcixsaXN0ZW5lcix0cnVlKTtcbn07XG5cbnByb3RvLnVuID0gZnVuY3Rpb24oc2V0dGVyLGtleSl7XG4gIF8uZm9yRWFjaCh0aGlzLnNldHRlcnNMaXN0ZW5lcnMsZnVuY3Rpb24oc2V0dGVyc0xpc3RlbmVycyx3aGVuKXtcbiAgICBfLmZvckVhY2goc2V0dGVyc0xpc3RlbmVyc1tzZXR0ZXJdLGZ1bmN0aW9uKHNldHRlckxpc3RlbmVyKXtcbiAgICAgIGlmKHNldHRlckxpc3RlbmVyLmtleSA9PSBrZXkpe1xuICAgICAgICBkZWxldGUgc2V0dGVyTGlzdGVuZXI7XG4gICAgICB9XG4gICAgfSlcbiAgfSlcbn07XG5cbnByb3RvLl9vbnNldHRlciA9IGZ1bmN0aW9uKHdoZW4sc2V0dGVyLGxpc3RlbmVyLGFzeW5jKXsgLyp3aGVuPWJlZm9yZXxhZnRlciwgdHlwZT1zeW5jfGFzeW5jKi9cbiAgdmFyIHNldHRlcnNMaXN0ZW5lcnMgPSB0aGlzLnNldHRlcnNMaXN0ZW5lcnNbd2hlbl07XG4gIHZhciBsaXN0ZW5lcktleSA9IFwiXCIrTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjEwMDAwMDApK1wiXCIrRGF0ZS5ub3coKTtcbiAgLyppZiAoKHdoZW4gPT0gJ2JlZm9yZScpICYmICFhc3luYyl7XG4gICAgbGlzdGVuZXIgPSB0aGlzLl9tYWtlQ2hhaW5hYmxlKGxpc3RlbmVyKTtcbiAgfSovXG4gIHNldHRlcnNMaXN0ZW5lcnNbc2V0dGVyXS5wdXNoKHtcbiAgICBrZXk6IGxpc3RlbmVyS2V5LFxuICAgIGZuYzogbGlzdGVuZXIsXG4gICAgYXN5bmM6IGFzeW5jXG4gIH0pO1xuICByZXR1cm4gbGlzdGVuZXJLZXk7XG4gIC8vcmV0dXJuIHRoaXMuZ2VuZXJhdGVVbkxpc3RlbmVyKHNldHRlcixsaXN0ZW5lcktleSk7XG59O1xuXG4vLyB0cmFzZm9ybW8gdW4gbGlzdGVuZXIgc2luY3Jvbm8gaW4gbW9kbyBkYSBwb3RlciBlc3NlcmUgdXNhdG8gbmVsbGEgY2F0ZW5hIGRpIGxpc3RlbmVycyAocmljaGlhbWFuZG8gbmV4dCBjb2wgdmFsb3JlIGRpIHJpdG9ybm8gZGVsIGxpc3RlbmVyKVxuLypwcm90by5fbWFrZUNoYWluYWJsZSA9IGZ1bmN0aW9uKGxpc3RlbmVyKXtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHJldHVybiBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAvLyByaW11b3ZvIG5leHQgZGFpIHBhcmFtZXRyaSBwcmltYSBkaSBjaGlhbWFyZSBpbCBsaXN0ZW5lclxuICAgIHZhciBuZXh0ID0gYXJncy5wb3AoKTtcbiAgICB2YXIgY2FuU2V0ID0gbGlzdGVuZXIuYXBwbHkoc2VsZixhcmd1bWVudHMpO1xuICAgIHZhciBfY2FuU2V0ID0gdHJ1ZTtcbiAgICBpZiAoXy5pc0Jvb2xlYW4oY2FuU2V0KSl7XG4gICAgICBfY2FuU2V0ID0gY2FuU2V0O1xuICAgIH1cbiAgICBuZXh0KGNhblNldCk7XG4gIH1cbn07Ki9cblxucHJvdG8uX3NldHVwTGlzdGVuZXJzQ2hhaW4gPSBmdW5jdGlvbihzZXR0ZXJzKXtcbiAgLy8gaW5pemlhbGl6emEgdHV0dGkgaSBtZXRvZGkgZGVmaW5pdGkgbmVsbCdvZ2dldHRvIFwic2V0dGVyc1wiIGRlbGxhIGNsYXNzZSBmaWdsaWEuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5zZXR0ZXJzTGlzdGVuZXJzID0ge1xuICAgIGFmdGVyOnt9LFxuICAgIGJlZm9yZTp7fVxuICB9O1xuICAvLyBwZXIgb2duaSBzZXR0ZXIgdmllbmUgZGVmaW5pdG8gbCdhcnJheSBkZWkgbGlzdGVuZXJzIGUgZmllbmUgc29zdGl0dWl0byBpbCBtZXRvZG8gb3JpZ2luYWxlIGNvbiBsYSBmdW56aW9uaSBjaGUgZ2VzdGlzY2UgbGEgY29kYSBkaSBsaXN0ZW5lcnNcbiAgXy5mb3JFYWNoKHNldHRlcnMsZnVuY3Rpb24oc2V0dGVyT3B0aW9uLHNldHRlcil7XG4gICAgdmFyIHNldHRlckZuYyA9IG5vb3A7XG4gICAgdmFyIHNldHRlckZhbGxiYWNrID0gbm9vcDtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHNldHRlck9wdGlvbikpe1xuICAgICAgc2V0dGVyRm5jID0gc2V0dGVyT3B0aW9uXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc2V0dGVyRm5jID0gc2V0dGVyT3B0aW9uLmZuYztcbiAgICAgIHNldHRlckZhbGxiYWNrID0gc2V0dGVyT3B0aW9uLmZhbGxiYWNrIHx8IG5vb3A7XG4gICAgfVxuICAgIHNlbGYuc2V0dGVyc0xpc3RlbmVycy5hZnRlcltzZXR0ZXJdID0gW107XG4gICAgc2VsZi5zZXR0ZXJzTGlzdGVuZXJzLmJlZm9yZVtzZXR0ZXJdID0gW107XG4gICAgLy8gc2V0dGVyIHNvc3RpdHVpdG9cbiAgICBzZWxmW3NldHRlcl0gPSBmdW5jdGlvbigpe1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAvLyBlc2VndW8gaSBsaXN0ZW5lciByZWdpc3RyYXRpIHBlciBpbCBiZWZvcmVcbiAgICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAgIHZhciByZXR1cm5WYWwgPSBudWxsO1xuICAgICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgICAgdmFyIGNhblNldCA9IHRydWU7XG4gICAgICBcbiAgICAgIC8vIHJpY2hpYW1hdGEgYWxsYSBmaW5lIGRlbGxhIGNhdGVuYSBkaSBsaXN0ZW5lcnNcbiAgICAgIGZ1bmN0aW9uIGRvbmUoKXtcbiAgICAgICAgaWYoY2FuU2V0KXtcbiAgICAgICAgICAvLyBlc2VndW8gbGEgZnVuemlvbmVcbiAgICAgICAgICByZXR1cm5WYWwgPSBzZXR0ZXJGbmMuYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgICAvLyBlIHJpc29sdm8gbGEgcHJvbWVzc2EgKGV2ZW50dWFsbWVudGUgdXRpbGl6emF0YSBkYSBjaGkgaGEgaW52b2NhdG8gaWwgc2V0dGVyXG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5WYWwpO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhciBhZnRlckxpc3RlbmVycyA9IHNlbGYuc2V0dGVyc0xpc3RlbmVycy5hZnRlcltzZXR0ZXJdO1xuICAgICAgICAgIF8uZm9yRWFjaChhZnRlckxpc3RlbmVycyxmdW5jdGlvbihsaXN0ZW5lciwga2V5KXtcbiAgICAgICAgICAgIGxpc3RlbmVyLmZuYy5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgLy8gc2Ugbm9uIHBvc3NvIHByb3NlZ3VpcmUgXG4gICAgICAgICAgLy8gY2hpYW1vIGwnZXZlbnR1YWxlIGZ1bnppb25lIGRpIGZhbGxiYWNrXG4gICAgICAgICAgc2V0dGVyRmFsbGJhY2suYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgICAvLyBlIHJpZ2V0dG8gbGEgcHJvbWVzc2FcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgZnVuY3Rpb24gY29tcGxldGUoKXtcbiAgICAgICAgLy8gZXNlZ3VvIGxhIGZ1bnppb25lXG4gICAgICAgIHJldHVyblZhbCA9IHNldHRlckZuYy5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAvLyBlIHJpc29sdm8gbGEgcHJvbWVzc2EgKGV2ZW50dWFsbWVudGUgdXRpbGl6emF0YSBkYSBjaGkgaGEgaW52b2NhdG8gaWwgc2V0dGVyXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocmV0dXJuVmFsKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBhZnRlckxpc3RlbmVycyA9IHNlbGYuc2V0dGVyc0xpc3RlbmVycy5hZnRlcltzZXR0ZXJdO1xuICAgICAgICBfLmZvckVhY2goYWZ0ZXJMaXN0ZW5lcnMsZnVuY3Rpb24obGlzdGVuZXIsIGtleSl7XG4gICAgICAgICAgbGlzdGVuZXIuZm5jLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGFib3J0KCl7XG4gICAgICAgICAgLy8gc2Ugbm9uIHBvc3NvIHByb3NlZ3VpcmUgLi4uXG4gICAgICAgICAgLy8gY2hpYW1vIGwnZXZlbnR1YWxlIGZ1bnppb25lIGRpIGZhbGxiYWNrXG4gICAgICAgICAgc2V0dGVyRmFsbGJhY2suYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgICAvLyBlIHJpZ2V0dG8gbGEgcHJvbWVzc2FcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIGJlZm9yZUxpc3RlbmVycyA9IHRoaXMuc2V0dGVyc0xpc3RlbmVyc1snYmVmb3JlJ11bc2V0dGVyXTtcbiAgICAgIC8vIGNvbnRhdG9yZSBkZWkgbGlzdGVuZXIgY2hlIHZlcnLDoCBkZWNyZW1lbnRhdG8gYWQgb2duaSBjaGlhbWF0YSBhIG5leHQoKVxuICAgICAgY291bnRlciA9IDA7XG4gICAgICBcbiAgICAgIC8vIGZ1bnppb25lIHBhc3NhdGEgY29tZSB1bHRpbW8gcGFyYW1ldHJvIGFpIGxpc3RlbmVycywgY2hlICoqKlNFIFNPTk8gU1RBVEkgQUdHSVVOVEkgQ09NRSBBU0lOQ1JPTkkgbGEgREVWT05PKioqIHJpY2hpYW1hcmUgcGVyIHBvdGVyIHByb3NlZ3VpcmUgbGEgY2F0ZW5hXG4gICAgICBmdW5jdGlvbiBuZXh0KGJvb2wpe1xuICAgICAgICB2YXIgY29udCA9IHRydWU7XG4gICAgICAgIGlmIChfLmlzQm9vbGVhbihib29sKSl7XG4gICAgICAgICAgY29udCA9IGJvb2w7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9hcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncyk7XG4gICAgICAgIC8vIHNlIGxhIGNhdGVuYSDDqCBzdGF0YSBibG9jY2F0YSBvIHNlIHNpYW1vIGFycml2YXRpIGFsbGEgZmluZSBkZWkgYmVmb3JlbGlzdGVuZXJzXG4gICAgICAgIGlmIChjb250ID09PSBmYWxzZSB8fCAoY291bnRlciA9PSBiZWZvcmVMaXN0ZW5lcnMubGVuZ3RoKSl7XG4gICAgICAgICAgaWYoY29udCA9PT0gZmFsc2UpXG4gICAgICAgICAgICBhYm9ydC5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb21wbGV0ZWQgPSBjb21wbGV0ZS5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgICAgaWYoXy5pc1VuZGVmaW5lZChjb21wbGV0ZWQpIHx8IGNvbXBsZXRlZCA9PT0gdHJ1ZSl7XG4gICAgICAgICAgICAgIHNlbGYuZW1pdEV2ZW50KCdzZXQ6JytzZXR0ZXIsYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChjb250KXtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lckZuYyA9IGJlZm9yZUxpc3RlbmVyc1tjb3VudGVyXS5mbmM7XG4gICAgICAgICAgICBpZiAoYmVmb3JlTGlzdGVuZXJzW2NvdW50ZXJdLmFzeW5jKXtcbiAgICAgICAgICAgICAgLy8gYWdnaXVuZ28gbmV4dCBjb21lIHVsaXRtbyBwYXJhbWV0cm9cbiAgICAgICAgICAgICAgX2FyZ3MucHVzaChuZXh0KTtcbiAgICAgICAgICAgICAgY291bnRlciArPSAxO1xuICAgICAgICAgICAgICBsaXN0ZW5lckZuYy5hcHBseShzZWxmLF9hcmdzKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHZhciBfY29udCA9IGxpc3RlbmVyRm5jLmFwcGx5KHNlbGYsX2FyZ3MpO1xuICAgICAgICAgICAgICBjb3VudGVyICs9IDE7XG4gICAgICAgICAgICAgIG5leHQoX2NvbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICBuZXh0KCk7XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgIH1cbiAgfSlcbn07XG5cbi8qXG5wcm90by5nZW5lcmF0ZVVuTGlzdGVuZXIgPSBmdW5jdGlvbihzZXR0ZXJzTGlzdGVuZXJzLHNldHRlcixsaXN0ZW5lcktleSl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgc2V0dGVyc0xpc3RlbmVyc1tzZXR0ZXJdW2xpc3RlbmVyS2V5XSA9IG51bGw7XG4gICAgZGVsZXRlIHNldHRlcnNMaXN0ZW5lcnNbc2V0dGVyXVtsaXN0ZW5lcktleV07XG4gIH1cbn07XG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEczV09iamVjdDtcbiIsInZhciBnZW9tID0ge1xuICBkaXN0YW5jZTogZnVuY3Rpb24oYzEsYzIpe1xuICAgIHJldHVybiBNYXRoLnNxcnQoZ2VvbS5zcXVhcmVkRGlzdGFuY2UoYzEsYzIpKTtcbiAgfSxcbiAgc3F1YXJlZERpc3RhbmNlOiBmdW5jdGlvbihjMSxjMil7XG4gICAgdmFyIHgxID0gYzFbMF07XG4gICAgdmFyIHkxID0gYzFbMV07XG4gICAgdmFyIHgyID0gYzJbMF07XG4gICAgdmFyIHkyID0gYzJbMV07XG4gICAgdmFyIGR4ID0geDIgLSB4MTtcbiAgICB2YXIgZHkgPSB5MiAtIHkxO1xuICAgIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbiAgfSxcbiAgY2xvc2VzdE9uU2VnbWVudDogZnVuY3Rpb24oY29vcmRpbmF0ZSwgc2VnbWVudCkge1xuICAgIHZhciB4MCA9IGNvb3JkaW5hdGVbMF07XG4gICAgdmFyIHkwID0gY29vcmRpbmF0ZVsxXTtcbiAgICB2YXIgc3RhcnQgPSBzZWdtZW50WzBdO1xuICAgIHZhciBlbmQgPSBzZWdtZW50WzFdO1xuICAgIHZhciB4MSA9IHN0YXJ0WzBdO1xuICAgIHZhciB5MSA9IHN0YXJ0WzFdO1xuICAgIHZhciB4MiA9IGVuZFswXTtcbiAgICB2YXIgeTIgPSBlbmRbMV07XG4gICAgdmFyIGR4ID0geDIgLSB4MTtcbiAgICB2YXIgZHkgPSB5MiAtIHkxO1xuICAgIHZhciBhbG9uZyA9IChkeCA9PT0gMCAmJiBkeSA9PT0gMCkgPyAwIDpcbiAgICAgICAgKChkeCAqICh4MCAtIHgxKSkgKyAoZHkgKiAoeTAgLSB5MSkpKSAvICgoZHggKiBkeCArIGR5ICogZHkpIHx8IDApO1xuICAgIHZhciB4LCB5O1xuICAgIGlmIChhbG9uZyA8PSAwKSB7XG4gICAgICB4ID0geDE7XG4gICAgICB5ID0geTE7XG4gICAgfSBlbHNlIGlmIChhbG9uZyA+PSAxKSB7XG4gICAgICB4ID0geDI7XG4gICAgICB5ID0geTI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHggPSB4MSArIGFsb25nICogZHg7XG4gICAgICB5ID0geTEgKyBhbG9uZyAqIGR5O1xuICAgIH1cbiAgICByZXR1cm4gW3gsIHldO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VvbTtcbiIsInZhciBHZW9tZXRyeSA9IHt9O1xuXG5HZW9tZXRyeS5HZW9tZXRyeVR5cGVzID0ge1xuICBQT0lOVDogXCJQb2ludFwiLFxuICBNVUxUSVBPSU5UOiBcIk11bHRpUG9pbnRcIixcbiAgTElORVNUUklORzogXCJMaW5lXCIsIC8vIHBlciBzZWd1aXJlIGxhIGRlZmluaXppb25lIGRpIFFHaXMuR2VvbWV0cnlUeXBlLCBjaGUgZGVmaW5pc2NlIExpbmUgaW52ZWNlIGRpIExpbmVzdHJpbmcuXG4gIE1VTFRJTElORVNUUklORzogXCJNdWx0aUxpbmVcIixcbiAgUE9MWUdPTjogXCJQb2x5Z29uXCIsXG4gIE1VTFRJUE9MWUdPTjogXCJNdWx0aVBvbHlnb25cIixcbiAgR0VPTUVUUllDT0xMRUNUSU9OOiBcIkdlb21ldHJ5Q29sbGVjdGlvblwiXG59O1xuXG5HZW9tZXRyeS5TdXBwb3J0ZWRHZW9tZXRyeVR5cGVzID0gW1xuICBHZW9tZXRyeS5HZW9tZXRyeVR5cGVzLlBPSU5ULFxuICBHZW9tZXRyeS5HZW9tZXRyeVR5cGVzLk1VTFRJUE9JTlQsXG4gIEdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMuTElORVNUUklORyxcbiAgR2VvbWV0cnkuR2VvbWV0cnlUeXBlcy5NVUxUSUxJTkVTVFJJTkcsXG4gIEdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMuUE9MWUdPTixcbiAgR2VvbWV0cnkuR2VvbWV0cnlUeXBlcy5NVUxUSVBPTFlHT05cbl1cblxubW9kdWxlLmV4cG9ydHMgPSBHZW9tZXRyeTtcbiIsImZ1bmN0aW9uIGluaXQoY29uZmlnKSB7XG4gIGkxOG5leHRcbiAgLnVzZShpMThuZXh0WEhSQmFja2VuZClcbiAgLmluaXQoeyBcbiAgICAgIGxuZzogJ2l0JyxcbiAgICAgIG5zOiAnYXBwJyxcbiAgICAgIGZhbGxiYWNrTG5nOiAnaXQnLFxuICAgICAgcmVzb3VyY2VzOiBjb25maWcucmVzb3VyY2VzXG4gIH0pO1xuICBcbiAganF1ZXJ5STE4bmV4dC5pbml0KGkxOG5leHQsICQsIHtcbiAgICB0TmFtZTogJ3QnLCAvLyAtLT4gYXBwZW5kcyAkLnQgPSBpMThuZXh0LnRcbiAgICBpMThuTmFtZTogJ2kxOG4nLCAvLyAtLT4gYXBwZW5kcyAkLmkxOG4gPSBpMThuZXh0XG4gICAgaGFuZGxlTmFtZTogJ2xvY2FsaXplJywgLy8gLS0+IGFwcGVuZHMgJChzZWxlY3RvcikubG9jYWxpemUob3B0cyk7XG4gICAgc2VsZWN0b3JBdHRyOiAnZGF0YS1pMThuJywgLy8gc2VsZWN0b3IgZm9yIHRyYW5zbGF0aW5nIGVsZW1lbnRzXG4gICAgdGFyZ2V0QXR0cjogJ2RhdGEtaTE4bi10YXJnZXQnLCAvLyBlbGVtZW50IGF0dHJpYnV0ZSB0byBncmFiIHRhcmdldCBlbGVtZW50IHRvIHRyYW5zbGF0ZSAoaWYgZGlmZnJlbnQgdGhlbiBpdHNlbGYpXG4gICAgb3B0aW9uc0F0dHI6ICdkYXRhLWkxOG4tb3B0aW9ucycsIC8vIGVsZW1lbnQgYXR0cmlidXRlIHRoYXQgY29udGFpbnMgb3B0aW9ucywgd2lsbCBsb2FkL3NldCBpZiB1c2VPcHRpb25zQXR0ciA9IHRydWVcbiAgICB1c2VPcHRpb25zQXR0cjogZmFsc2UsIC8vIHNlZSBvcHRpb25zQXR0clxuICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQ6IHRydWUgLy8gcGFyc2VzIGRlZmF1bHQgdmFsdWVzIGZyb20gY29udGVudCBlbGUudmFsIG9yIGVsZS50ZXh0XG4gIH0pO1xufVxuICAgIFxudmFyIHQgPSBmdW5jdGlvbih0ZXh0KXtcbiAgICB2YXIgdHJhZCA9IGkxOG5leHQudCh0ZXh0KTtcbiAgICByZXR1cm4gdHJhZDtcbn07XG4gICAgXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdDogaW5pdCxcbiAgdDogdFxufVxuIiwidmFyIFBpY2tDb29yZGluYXRlc0V2ZW50VHlwZSA9IHtcbiAgUElDS0VEOiAncGlja2VkJ1xufTtcblxudmFyIFBpY2tDb29yZGluYXRlc0V2ZW50ID0gZnVuY3Rpb24odHlwZSwgY29vcmRpbmF0ZSkge1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLmNvb3JkaW5hdGUgPSBjb29yZGluYXRlO1xufTtcblxudmFyIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICB0aGlzLnByZXZpb3VzQ3Vyc29yXyA9IG51bGw7XG4gIFxuICBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyLmNhbGwodGhpcywge1xuICAgIGhhbmRsZURvd25FdmVudDogUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyxcbiAgICBoYW5kbGVVcEV2ZW50OiBQaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbi5oYW5kbGVVcEV2ZW50XyxcbiAgICBoYW5kbGVNb3ZlRXZlbnQ6IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLmhhbmRsZU1vdmVFdmVudF8sXG4gIH0pO1xufTtcbm9sLmluaGVyaXRzKFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLCBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyKTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlVXBFdmVudF8gPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgICAgbmV3IFBpY2tDb29yZGluYXRlc0V2ZW50KFxuICAgICAgICAgICAgICBQaWNrQ29vcmRpbmF0ZXNFdmVudFR5cGUuUElDS0VELFxuICAgICAgICAgICAgICBldmVudC5jb29yZGluYXRlKSk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlTW92ZUV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBlbGVtID0gZXZlbnQubWFwLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgZWxlbS5zdHlsZS5jdXJzb3IgPSAgJ3BvaW50ZXInO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24ucHJvdG90eXBlLnNob3VsZFN0b3BFdmVudCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLnByb3RvdHlwZS5zZXRNYXAgPSBmdW5jdGlvbihtYXApe1xuICBpZiAoIW1hcCkge1xuICAgIHZhciBlbGVtID0gdGhpcy5nZXRNYXAoKS5nZXRUYXJnZXRFbGVtZW50KCk7XG4gICAgZWxlbS5zdHlsZS5jdXJzb3IgPSAnJztcbiAgfVxuICBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyLnByb3RvdHlwZS5zZXRNYXAuY2FsbCh0aGlzLG1hcCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uO1xuIiwidmFyIFBpY2tGZWF0dXJlRXZlbnRUeXBlID0ge1xuICBQSUNLRUQ6ICdwaWNrZWQnXG59O1xuXG52YXIgUGlja0ZlYXR1cmVFdmVudCA9IGZ1bmN0aW9uKHR5cGUsIGNvb3JkaW5hdGUsIGZlYXR1cmUpIHtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy5mZWF0dXJlID0gZmVhdHVyZTtcbiAgdGhpcy5jb29yZGluYXRlID0gY29vcmRpbmF0ZTtcbn07XG5cblxuXG52YXIgUGlja0ZlYXR1cmVJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb2wuaW50ZXJhY3Rpb24uUG9pbnRlci5jYWxsKHRoaXMsIHtcbiAgICBoYW5kbGVEb3duRXZlbnQ6IFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyxcbiAgICBoYW5kbGVVcEV2ZW50OiBQaWNrRmVhdHVyZUludGVyYWN0aW9uLmhhbmRsZVVwRXZlbnRfLFxuICAgIGhhbmRsZU1vdmVFdmVudDogUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5oYW5kbGVNb3ZlRXZlbnRfLFxuICB9KTtcbiAgXG4gIHRoaXMuZmVhdHVyZXNfID0gb3B0aW9ucy5mZWF0dXJlcyB8fCBudWxsO1xuICBcbiAgdGhpcy5sYXllcnNfID0gb3B0aW9ucy5sYXllcnMgfHwgbnVsbDtcbiAgXG4gIHRoaXMucGlja2VkRmVhdHVyZV8gPSBudWxsO1xuICBcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmxheWVyRmlsdGVyXyA9IGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgcmV0dXJuIF8uaW5jbHVkZXMoc2VsZi5sYXllcnNfLCBsYXllcik7XG4gIH07XG59O1xub2wuaW5oZXJpdHMoUGlja0ZlYXR1cmVJbnRlcmFjdGlvbiwgb2wuaW50ZXJhY3Rpb24uUG9pbnRlcik7XG5cblBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMucGlja2VkRmVhdHVyZV8gPSB0aGlzLmZlYXR1cmVzQXRQaXhlbF8oZXZlbnQucGl4ZWwsIGV2ZW50Lm1hcCk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5oYW5kbGVVcEV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIGlmKHRoaXMucGlja2VkRmVhdHVyZV8pe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChcbiAgICAgICAgICAgIG5ldyBQaWNrRmVhdHVyZUV2ZW50KFxuICAgICAgICAgICAgICAgIFBpY2tGZWF0dXJlRXZlbnRUeXBlLlBJQ0tFRCxcbiAgICAgICAgICAgICAgICBldmVudC5jb29yZGluYXRlLFxuICAgICAgICAgICAgICAgIHRoaXMucGlja2VkRmVhdHVyZV8pKTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cblBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlTW92ZUV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBlbGVtID0gZXZlbnQubWFwLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgdmFyIGludGVyc2VjdGluZ0ZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzQXRQaXhlbF8oZXZlbnQucGl4ZWwsIGV2ZW50Lm1hcCk7XG5cbiAgaWYgKGludGVyc2VjdGluZ0ZlYXR1cmUpIHtcbiAgICBlbGVtLnN0eWxlLmN1cnNvciA9ICAncG9pbnRlcic7XG4gIH0gZWxzZSB7XG4gICAgZWxlbS5zdHlsZS5jdXJzb3IgPSAnJztcbiAgfVxufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5wcm90b3R5cGUuZmVhdHVyZXNBdFBpeGVsXyA9IGZ1bmN0aW9uKHBpeGVsLCBtYXApIHtcbiAgdmFyIGZvdW5kID0gbnVsbDtcblxuICB2YXIgaW50ZXJzZWN0aW5nRmVhdHVyZSA9IG1hcC5mb3JFYWNoRmVhdHVyZUF0UGl4ZWwocGl4ZWwsXG4gICAgICBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICAgIGlmICh0aGlzLmZlYXR1cmVzXykge1xuICAgICAgICAgIGlmICh0aGlzLmZlYXR1cmVzXy5pbmRleE9mKGZlYXR1cmUpID4gLTEpe1xuICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmVcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmVhdHVyZTtcbiAgICAgIH0sdGhpcyx0aGlzLmxheWVyRmlsdGVyXyk7XG4gIFxuICBpZihpbnRlcnNlY3RpbmdGZWF0dXJlKXtcbiAgICBmb3VuZCA9IGludGVyc2VjdGluZ0ZlYXR1cmU7XG4gIH1cbiAgcmV0dXJuIGZvdW5kO1xufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5wcm90b3R5cGUuc2hvdWxkU3RvcEV2ZW50ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5wcm90b3R5cGUuc2V0TWFwID0gZnVuY3Rpb24obWFwKXtcbiAgaWYgKCFtYXApIHtcbiAgICB2YXIgZWxlbSA9IHRoaXMuZ2V0TWFwKCkuZ2V0VGFyZ2V0RWxlbWVudCgpO1xuICAgIGVsZW0uc3R5bGUuY3Vyc29yID0gJyc7XG4gIH1cbiAgb2wuaW50ZXJhY3Rpb24uUG9pbnRlci5wcm90b3R5cGUuc2V0TWFwLmNhbGwodGhpcyxtYXApO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQaWNrRmVhdHVyZUludGVyYWN0aW9uO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBHZW9tZXRyeVR5cGVzID0gcmVxdWlyZSgnY29yZS9nZW9tZXRyeS9nZW9tZXRyeScpLkdlb21ldHJ5VHlwZXM7XG5cbnZhciBDQVBBQklMSVRJRVMgPSB7XG4gIFFVRVJZOiAxLFxuICBFRElUOiAyXG59O1xuXG52YXIgRURJVE9QUyA9IHtcbiAgSU5TRVJUOiAxLFxuICBVUERBVEU6IDIsXG4gIERFTEVURTogNFxufTtcblxuTGF5ZXJTdGF0ZSA9IHt9O1xuXG5MYXllclN0YXRlLlNlcnZlclR5cGVzID0ge1xuICBPR0M6IFwiT0dDXCIsXG4gIFFHSVM6IFwiUUdJU1wiLFxuICBNYXBzZXJ2ZXI6IFwiTWFwc2VydmVyXCIsXG4gIEdlb3NlcnZlcjogXCJHZW9zZXJ2ZXJcIixcbiAgQXJjR0lTOiBcIkFyY0dJU1wiXG59O1xuXG5MYXllclN0YXRlLmdldEdlb21ldHJ5VHlwZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgcmV0dXJuIGxheWVyU3RhdGUuZ2VvbWV0cnl0eXBlO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24obGF5ZXJTdGF0ZSkge1xuICB2YXIgYXR0cmlidXRlcyA9IFtdO1xuICBpZiAobGF5ZXJTdGF0ZS5hdHRyaWJ1dGVzKSB7XG4gICAgYXR0cmlidXRlcyA9IF8ubWFwKGxheWVyU3RhdGUuYXR0cmlidXRlcyxmdW5jdGlvbihhdHRyaWJ1dGUpIHtcbiAgICAgIHJldHVybiBhdHRyaWJ1dGUubmFtZTtcbiAgICB9KVxuICB9XG4gIHJldHVybiBhdHRyaWJ1dGVzO1xufTtcblxuTGF5ZXJTdGF0ZS5pc1F1ZXJ5YWJsZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpe1xuICB2YXIgcXVlcnlFbmFibGVkID0gZmFsc2U7XG4gIHZhciBxdWVyeWFibGVGb3JDYWJhYmlsaXRpZXMgPSAobGF5ZXJTdGF0ZS5jYXBhYmlsaXRpZXMgJiYgKGxheWVyU3RhdGUuY2FwYWJpbGl0aWVzICYmIENBUEFCSUxJVElFUy5RVUVSWSkpID8gdHJ1ZSA6IGZhbHNlO1xuICBpZiAocXVlcnlhYmxlRm9yQ2FiYWJpbGl0aWVzKSB7XG4gICAgLy8gw6ggaW50ZXJyb2dhYmlsZSBzZSB2aXNpYmlsZSBlIG5vbiBkaXNhYmlsaXRhdG8gKHBlciBzY2FsYSkgb3BwdXJlIHNlIGludGVycm9nYWJpbGUgY29tdW5xdWUgKGZvcnphdG8gZGFsbGEgcHJvcHJpZXTDoCBpbmZvd2hlbm5vdHZpc2libGUpXG4gICAgdmFyIHF1ZXJ5RW5hYmxlZCA9IChsYXllclN0YXRlLnZpc2libGUgJiYgIWxheWVyU3RhdGUuZGlzYWJsZWQpIHx8IChsYXllclN0YXRlLmluZm93aGVubm90dmlzaWJsZSAmJiAobGF5ZXJTdGF0ZS5pbmZvd2hlbm5vdHZpc2libGUgPT09IHRydWUpKTtcbiAgfVxuICByZXR1cm4gcXVlcnlFbmFibGVkO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRRdWVyeUxheWVyTmFtZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgdmFyIHF1ZXJ5TGF5ZXJOYW1lO1xuICBpZiAobGF5ZXJTdGF0ZS5pbmZvbGF5ZXIgJiYgbGF5ZXJTdGF0ZS5pbmZvbGF5ZXIgIT0gJycpIHtcbiAgICBxdWVyeUxheWVyTmFtZSA9IGxheWVyU3RhdGUuaW5mb2xheWVyO1xuICB9XG4gIGVsc2Uge1xuICAgIHF1ZXJ5TGF5ZXJOYW1lID0gbGF5ZXJTdGF0ZS5uYW1lO1xuICB9XG4gIHJldHVybiBxdWVyeUxheWVyTmFtZTtcbn07XG5cbkxheWVyU3RhdGUuZ2V0U2VydmVyVHlwZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgaWYgKGxheWVyU3RhdGUuc2VydmVydHlwZSAmJiBsYXllclN0YXRlLnNlcnZlcnR5cGUgIT0gJycpIHtcbiAgICByZXR1cm4gbGF5ZXJTdGF0ZS5zZXJ2ZXJ0eXBlO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBMYXllclN0YXRlLlNlcnZlclR5cGVzLlFHSVM7XG4gIH1cbn07XG5cbkxheWVyU3RhdGUuaXNFeHRlcm5hbFdNUyA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgcmV0dXJuIChsYXllclN0YXRlLnNvdXJjZSAmJiBsYXllclN0YXRlLnNvdXJjZS51cmwpO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRXTVNMYXllck5hbWUgPSBmdW5jdGlvbihsYXllclN0YXRlKSB7XG4gIHZhciBsYXllck5hbWUgPSBsYXllclN0YXRlLm5hbWU7XG4gIGlmIChsYXllclN0YXRlLnNvdXJjZSAmJiBsYXllclN0YXRlLnNvdXJjZS5sYXllcnMpe1xuICAgIGxheWVyTmFtZSA9IGxheWVyU3RhdGUuc291cmNlLmxheWVyc1xuICB9O1xuICByZXR1cm4gbGF5ZXJOYW1lO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRPcmlnaW5VUkwgPSBmdW5jdGlvbihsYXllclN0YXRlKSB7XG4gIHZhciB1cmw7XG4gIGlmIChsYXllclN0YXRlLnNvdXJjZSAmJiBsYXllclN0YXRlLnNvdXJjZS50eXBlID09ICd3bXMnICYmIGxheWVyU3RhdGUuc291cmNlLnVybCl7XG4gICAgdXJsID0gbGF5ZXJTdGF0ZS5zb3VyY2UudXJsXG4gIH07XG4gIHJldHVybiB1cmw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheWVyU3RhdGU7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIHRydWVmbmMgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykudHJ1ZWZuYztcbnZhciByZXNvbHZlZFZhbHVlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmVkVmFsdWU7XG52YXIgcmVqZWN0ZWRWYWx1ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3RlZFZhbHVlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbmZ1bmN0aW9uIFZlY3RvckxheWVyKGNvbmZpZyl7XG4gIHZhciBjb25maWcgPSBjb25maWcgfHwge307XG4gIHRoaXMuZ2VvbWV0cnl0eXBlID0gY29uZmlnLmdlb21ldHJ5dHlwZSB8fCBudWxsO1xuICB0aGlzLmZvcm1hdCA9IGNvbmZpZy5mb3JtYXQgfHwgbnVsbDtcbiAgdGhpcy5jcnMgPSBjb25maWcuY3JzICB8fCBudWxsO1xuICB0aGlzLmlkID0gY29uZmlnLmlkIHx8IG51bGw7XG4gIHRoaXMubmFtZSA9IGNvbmZpZy5uYW1lIHx8IFwiXCI7XG4gIHRoaXMucGsgPSBjb25maWcucGsgfHwgXCJpZFwiOyAvLyBUT0RPOiBpbCBHZW9KU09OIHNldHRhIGwnaWQgZGVsbGEgZmVhdHVyZSBkYSBzw6ksIGUgbmFzY29uZGUgaWwgY2FtcG8gUEsgZGFsbGUgcHJvcGVydGllcy4gSW4gYWx0cmkgZm9ybWF0aSB2YSB2ZXJpZmljYXRvLCBlIGNhc29tYWkgdXNhcmUgZmVhdHVyZS5zZXRJZCgpXG4gIFxuICB0aGlzLl9vbFNvdXJjZSA9IG5ldyBvbC5zb3VyY2UuVmVjdG9yKHtcbiAgICBmZWF0dXJlczogbmV3IG9sLkNvbGxlY3Rpb24oKVxuICB9KTtcbiAgdGhpcy5fb2xMYXllciA9IG5ldyBvbC5sYXllci5WZWN0b3Ioe1xuICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICBzb3VyY2U6IHRoaXMuX29sU291cmNlXG4gIH0pO1xuICBcbiAgLypcbiAgICogQXJyYXkgZGkgb2dnZXR0aTpcbiAgICoge1xuICAgKiAgbmFtZTogTm9tZSBkZWxsJ2F0dHJpYnV0byxcbiAgICogIHR5cGU6IGludGVnZXIgfCBmbG9hdCB8IHN0cmluZyB8IGJvb2xlYW4gfCBkYXRlIHwgdGltZSB8IGRhdGV0aW1lLFxuICAgKiAgaW5wdXQ6IHtcbiAgICogICAgbGFiZWw6IE5vbWUgZGVsIGNhbXBvIGRpIGlucHV0LFxuICAgKiAgICB0eXBlOiBzZWxlY3QgfCBjaGVjayB8IHJhZGlvIHwgY29vcmRzcGlja2VyIHwgYm94cGlja2VyIHwgbGF5ZXJwaWNrZXIgfCBmaWVsZGRlcGVuZCxcbiAgICogICAgb3B0aW9uczoge1xuICAgKiAgICAgIExlIG9wemlvbmkgcGVyIGxvIHNwY2lmaWNvIHRpcG8gZGkgaW5wdXQgKGVzLiBcInZhbHVlc1wiIHBlciBsYSBsaXN0YSBkaSB2YWxvcmkgZGkgc2VsZWN0LCBjaGVjayBlIHJhZGlvKVxuICAgKiAgICB9XG4gICAqICB9XG4gICAqIH1cbiAgKi9cbiAgdGhpcy5fUEtpbkF0dHJpYnV0ZXMgPSBmYWxzZTtcbiAgdGhpcy5fZmVhdHVyZXNGaWx0ZXIgPSBudWxsO1xuICB0aGlzLl9maWVsZHMgPSBudWxsXG4gIHRoaXMubGF6eVJlbGF0aW9ucyA9IHRydWU7XG4gIHRoaXMuX3JlbGF0aW9ucyA9IG51bGw7XG59XG5pbmhlcml0KFZlY3RvckxheWVyLEczV09iamVjdCk7XG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvckxheWVyO1xuXG52YXIgcHJvdG8gPSBWZWN0b3JMYXllci5wcm90b3R5cGU7XG5cbnByb3RvLnNldERhdGEgPSBmdW5jdGlvbihmZWF0dXJlc0RhdGEpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBmZWF0dXJlcztcbiAgaWYgKHRoaXMuZm9ybWF0KSB7XG4gICAgc3dpdGNoICh0aGlzLmZvcm1hdCl7XG4gICAgICBjYXNlIFwiR2VvSlNPTlwiOlxuICAgICAgICB2YXIgZ2VvanNvbiA9IG5ldyBvbC5mb3JtYXQuR2VvSlNPTih7XG4gICAgICAgICAgZGVmYXVsdERhdGFQcm9qZWN0aW9uOiB0aGlzLmNycyxcbiAgICAgICAgICBnZW9tZXRyeU5hbWU6IFwiZ2VvbWV0cnlcIlxuICAgICAgICB9KTtcbiAgICAgICAgZmVhdHVyZXMgPSBnZW9qc29uLnJlYWRGZWF0dXJlcyhmZWF0dXJlc0RhdGEpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgXG4gICAgaWYgKGZlYXR1cmVzICYmIGZlYXR1cmVzLmxlbmd0aCkge1xuICAgICAgaWYgKCFfLmlzTnVsbCh0aGlzLl9mZWF0dXJlc0ZpbHRlcikpe1xuICAgICAgICB2YXIgZmVhdHVyZXMgPSBfLm1hcChmZWF0dXJlcyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgICAgICByZXR1cm4gc2VsZi5fZmVhdHVyZXNGaWx0ZXIoZmVhdHVyZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICB2YXIgYWxyZWFkeUxvYWRlZElkcyA9IHRoaXMuZ2V0RmVhdHVyZUlkcygpO1xuICAgICAgdmFyIGZlYXR1cmVzVG9Mb2FkID0gXy5maWx0ZXIoZmVhdHVyZXMsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAgIHJldHVybiAhXy5pbmNsdWRlcyhhbHJlYWR5TG9hZGVkSWRzLGZlYXR1cmUuZ2V0SWQoKSk7XG4gICAgICB9KVxuICAgICAgXG4gICAgICB0aGlzLl9vbFNvdXJjZS5hZGRGZWF0dXJlcyhmZWF0dXJlc1RvTG9hZCk7XG4gICAgICBcbiAgICAgIC8vIHZlcmlmaWNvLCBwcmVuZGVuZG8gbGEgcHJpbWEgZmVhdHVyZSwgc2UgbGEgUEsgw6ggcHJlc2VudGUgbyBtZW5vIHRyYSBnbGkgYXR0cmlidXRpXG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHRoaXMuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKVswXS5nZXRQcm9wZXJ0aWVzKCk7XG4gICAgICB0aGlzLl9QS2luQXR0cmlidXRlcyA9IF8uZ2V0KGF0dHJpYnV0ZXMsdGhpcy5waykgPyB0cnVlIDogZmFsc2U7XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKFwiVmVjdG9yTGF5ZXIgZm9ybWF0IG5vdCBkZWZpbmVkXCIpO1xuICB9XG59O1xuXG5wcm90by5zZXRGZWF0dXJlRGF0YSA9IGZ1bmN0aW9uKG9sZGZpZCxmaWQsZ2VvbWV0cnksYXR0cmlidXRlcyl7XG4gIHZhciBmZWF0dXJlID0gdGhpcy5nZXRGZWF0dXJlQnlJZChvbGRmaWQpO1xuICBpZiAoZmlkKXtcbiAgICBmZWF0dXJlLnNldElkKGZpZCk7XG4gIH1cbiAgXG4gIGlmIChnZW9tZXRyeSl7XG4gICAgZmVhdHVyZS5zZXRHZW9tZXRyeShnZW9tZXRyeSk7XG4gIH1cbiAgXG4gIGlmIChhdHRyaWJ1dGVzKXtcbiAgICB2YXIgb2xkQXR0cmlidXRlcyA9IGZlYXR1cmUuZ2V0UHJvcGVydGllcygpO1xuICAgIHZhciBuZXdBdHRyaWJ1dGVzID1fLmFzc2lnbihvbGRBdHRyaWJ1dGVzLGF0dHJpYnV0ZXMpO1xuICAgIGZlYXR1cmUuc2V0UHJvcGVydGllcyhuZXdBdHRyaWJ1dGVzKTtcbiAgfVxuICBcbiAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG5wcm90by5hZGRGZWF0dXJlcyA9IGZ1bmN0aW9uKGZlYXR1cmVzKXtcbiAgdGhpcy5nZXRTb3VyY2UoKS5hZGRGZWF0dXJlcyhmZWF0dXJlcyk7XG59O1xuXG5wcm90by5zZXRGZWF0dXJlc0ZpbHRlciA9IGZ1bmN0aW9uKGZlYXR1cmVzRmlsdGVyKXtcbiAgdGhpcy5fZmVhdHVyZXNGaWx0ZXIgPSBmZWF0dXJlc0ZpbHRlcjtcbn07XG5cbnByb3RvLnNldEZpZWxkcyA9IGZ1bmN0aW9uKGZpZWxkcyl7XG4gIHRoaXMuX2ZpZWxkcyA9IGZpZWxkcztcbn07XG5cbnByb3RvLnNldFBrRmllbGQgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBwa2ZpZWxkU2V0ID0gZmFsc2U7XG4gIF8uZm9yRWFjaCh0aGlzLl9maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgIGlmIChmaWVsZC5uYW1lID09IHNlbGYucGsgKXtcbiAgICAgIHBrZmllbGRTZXQgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG4gIFxuICBpZiAoIXBrZmllbGRTZXQpe1xuICAgIHRoaXMuX2ZpZWxkc1xuICB9XG59O1xuXG5wcm90by5nZXRGZWF0dXJlcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCk7XG59O1xuXG5wcm90by5nZXRGZWF0dXJlSWRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIGZlYXR1cmVJZHMgPSBfLm1hcCh0aGlzLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgcmV0dXJuIGZlYXR1cmUuZ2V0SWQoKTtcbiAgfSlcbiAgcmV0dXJuIGZlYXR1cmVJZHNcbn07XG5cbnByb3RvLmdldEZpZWxkcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBfLmNsb25lRGVlcCh0aGlzLl9maWVsZHMpO1xufTtcblxucHJvdG8uZ2V0RmllbGRzTmFtZXMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gXy5tYXAodGhpcy5fZmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZmllbGQubmFtZTtcbiAgfSk7XG59O1xuXG5wcm90by5nZXRGaWVsZHNXaXRoQXR0cmlidXRlcyA9IGZ1bmN0aW9uKG9iail7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLyp2YXIgZmllbGRzID0gXy5jbG9uZURlZXAoXy5maWx0ZXIodGhpcy5fZmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gKChmaWVsZC5uYW1lICE9IHNlbGYucGspICYmIGZpZWxkLmVkaXRhYmxlKTtcbiAgfSkpOyovXG4gIHZhciBmaWVsZHMgPSBfLmNsb25lRGVlcCh0aGlzLl9maWVsZHMpO1xuICBcbiAgdmFyIGZlYXR1cmUsIGF0dHJpYnV0ZXM7XG4gIFxuICAvLyBpbCBtZXRvZG8gYWNjZXR0YSBzaWEgZmVhdHVyZSBjaGUgZmlkXG4gIGlmIChvYmogaW5zdGFuY2VvZiBvbC5GZWF0dXJlKXtcbiAgICBmZWF0dXJlID0gb2JqO1xuICB9XG4gIGVsc2UgaWYgKG9iail7XG4gICAgZmVhdHVyZSA9IHRoaXMuZ2V0RmVhdHVyZUJ5SWQob2JqKTtcbiAgfVxuICBpZiAoZmVhdHVyZSl7XG4gICAgYXR0cmlidXRlcyA9IGZlYXR1cmUuZ2V0UHJvcGVydGllcygpO1xuICB9XG4gIFxuICBfLmZvckVhY2goZmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICBpZiAoZmVhdHVyZSl7XG4gICAgICBpZiAoIXRoaXMuX1BLaW5BdHRyaWJ1dGVzICYmIGZpZWxkLm5hbWUgPT0gc2VsZi5wayl7XG4gICAgICAgIGZpZWxkLnZhbHVlID0gZmVhdHVyZS5nZXRJZCgpO1xuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgZmllbGQudmFsdWUgPSBhdHRyaWJ1dGVzW2ZpZWxkLm5hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNle1xuICAgICAgZmllbGQudmFsdWUgPSBudWxsO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmaWVsZHM7XG59O1xuXG5wcm90by5zZXRSZWxhdGlvbnMgPSBmdW5jdGlvbihyZWxhdGlvbnMpe1xuICBfLmZvckVhY2gocmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uLHJlbGF0aW9uS2V5KXtcbiAgICByZWxhdGlvbi5uYW1lID0gcmVsYXRpb25LZXk7XG4gIH0pO1xuICB0aGlzLl9yZWxhdGlvbnMgPSByZWxhdGlvbnM7XG59O1xuXG5wcm90by5nZXRSZWxhdGlvbnMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fcmVsYXRpb25zO1xufTtcblxucHJvdG8uaGFzUmVsYXRpb25zID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuICFfLmlzTnVsbCh0aGlzLl9yZWxhdGlvbnMpO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25zTmFtZXMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gXy5rZXlzKHRoaXMuX3JlbGF0aW9ucyk7XG59O1xuXG5wcm90by5nZXRSZWxhdGlvbnNGa3NLZXlzID0gZnVuY3Rpb24oKXtcbiAgdmFyIGZrcyA9IFtdO1xuICBfLmZvckVhY2godGhpcy5fcmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICBma3MucHVzaChyZWxhdGlvbi5mayk7XG4gIH0pXG4gIHJldHVybiBma3M7XG59O1xuXG5wcm90by5nZXRSZWxhdGlvbkZpZWxkc05hbWVzID0gZnVuY3Rpb24ocmVsYXRpb24pe1xuICB2YXIgcmVsYXRpb25GaWVsZHMgPSB0aGlzLl9yZWxhdGlvbnNbcmVsYXRpb25dO1xuICBpZiAocmVsYXRpb25GaWVsZHMpe1xuICAgIHJldHVybiBfLm1hcChyZWxhdGlvbkZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgICByZXR1cm4gZmllbGQubmFtZTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5cbi8vIG90dGVuZ28gbGUgcmVsYXppb25pIGEgcGFydGlyZSBkYWwgZmlkIGRpIHVuYSBmZWF0dXJlIGVzaXN0ZW50ZVxucHJvdG8uZ2V0UmVsYXRpb25zV2l0aEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihmaWQpe1xuICB2YXIgcmVsYXRpb25zID0gXy5jbG9uZURlZXAodGhpcy5fcmVsYXRpb25zKTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIWZpZCB8fCAhdGhpcy5nZXRGZWF0dXJlQnlJZChmaWQpKXtcbiAgICBfLmZvckVhY2gocmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uLHJlbGF0aW9uS2V5KXtcbiAgICAgICAgLy8gaW5pemlhbG1lbnRlIHNldHRvIGEgbnVsbCBpIHZhbG9yaVxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uLmZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgIGZpZWxkLnZhbHVlID0gbnVsbDtcbiAgICAgIH0pXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc29sdmVkVmFsdWUocmVsYXRpb25zKTtcbiAgfVxuICBlbHNlIHtcbiAgICBpZiAodGhpcy5sYXp5UmVsYXRpb25zKXtcbiAgICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gdGhpcy5nZXRGZWF0dXJlQnlJZChmaWQpLmdldFByb3BlcnRpZXMoKTtcbiAgICAgIHZhciBma3MgPSB7fTtcbiAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24scmVsYXRpb25LZXkpe1xuICAgICAgICB2YXIgdXJsID0gcmVsYXRpb24udXJsO1xuICAgICAgICB2YXIga2V5VmFscyA9IFtdO1xuICAgICAgICBfLmZvckVhY2gocmVsYXRpb24uZmssZnVuY3Rpb24oZmtLZXkpe1xuICAgICAgICAgIGZrc1tma0tleV0gPSBhdHRyaWJ1dGVzW2ZrS2V5XTtcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICAgXG4gICAgICB0aGlzLmdldFJlbGF0aW9uc1dpdGhBdHRyaWJ1dGVzRnJvbUZrcyhma3MpXG4gICAgICAudGhlbihmdW5jdGlvbihyZWxhdGlvbnNSZXNwb25zZSl7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVsYXRpb25zUmVzcG9uc2UpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgIH1cbiAgfVxufTtcblxuLy8gb3R0ZW5nbyBsZSByZWxhemlvbmkgdmFsb3JpenphdGUgYSBwYXJ0aXJlIGRhIHVuIG9nZ2V0dG8gY29uIGxlIGNoaWF2aSBGSyBjb21lIGtleXMgZSBpIGxvcm8gdmFsb3JpIGNvbWUgdmFsdWVzXG5wcm90by5nZXRSZWxhdGlvbnNXaXRoQXR0cmlidXRlc0Zyb21Ga3MgPSBmdW5jdGlvbihma3Mpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciByZWxhdGlvbnMgPSBfLmNsb25lRGVlcCh0aGlzLl9yZWxhdGlvbnMpO1xuICB2YXIgcmVsYXRpb25zUmVxdWVzdHMgPSBbXTtcblxuICBfLmZvckVhY2gocmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uLHJlbGF0aW9uS2V5KXtcbiAgICB2YXIgdXJsID0gcmVsYXRpb24udXJsO1xuICAgIHZhciBrZXlWYWxzID0gW107XG4gICAgXy5mb3JFYWNoKHJlbGF0aW9uLmZrLGZ1bmN0aW9uKGZrS2V5KXtcbiAgICAgIHZhciBma1ZhbHVlID0gZmtzW2ZrS2V5XTtcbiAgICAgIGtleVZhbHMucHVzaChma0tleStcIj1cIitma1ZhbHVlKTtcbiAgICB9KTtcbiAgICB2YXIgZmtQYXJhbXMgPSBfLmpvaW4oa2V5VmFscyxcIiZcIik7XG4gICAgdXJsICs9IFwiP1wiK2ZrUGFyYW1zO1xuICAgIHJlbGF0aW9uc1JlcXVlc3RzLnB1c2goJC5nZXQodXJsKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVsYXRpb25BdHRyaWJ1dGVzKXtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uLmZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgZmllbGQudmFsdWUgPSByZWxhdGlvbkF0dHJpYnV0ZXNbMF1bZmllbGQubmFtZV07XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICApXG4gIH0pXG4gIFxuICByZXR1cm4gJC53aGVuLmFwcGx5KHRoaXMscmVsYXRpb25zUmVxdWVzdHMpXG4gIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHJlbGF0aW9ucztcbiAgfSk7XG59XG5cbnByb3RvLnNldFN0eWxlID0gZnVuY3Rpb24oc3R5bGUpe1xuICB0aGlzLl9vbExheWVyLnNldFN0eWxlKHN0eWxlKTtcbn07XG5cbnByb3RvLmdldExheWVyID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX29sTGF5ZXI7XG59O1xuXG5wcm90by5nZXRTb3VyY2UgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fb2xMYXllci5nZXRTb3VyY2UoKTtcbn07XG5cbnByb3RvLmdldEZlYXR1cmVCeUlkID0gZnVuY3Rpb24oaWQpe1xuICByZXR1cm4gdGhpcy5fb2xMYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlQnlJZChpZCk7XG59O1xuXG5wcm90by5jbGVhciA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuZ2V0U291cmNlKCkuY2xlYXIoKTtcbn07XG5cbnByb3RvLmFkZFRvTWFwID0gZnVuY3Rpb24obWFwKXtcbiAgbWFwLmFkZExheWVyKHRoaXMuX29sTGF5ZXIpO1xufTtcblxuLy8gZGF0YSB1bmEgZmVhdHVyZSB2ZXJpZmljbyBzZSBoYSB0cmEgZ2xpIGF0dHJpYnV0aSBpIHZhbG9yaSBkZWxsZSBGSyBkZWxsZSAoZXZlbnR1YWxpKSByZWxhemlvbmlcbnByb3RvLmZlYXR1cmVIYXNSZWxhdGlvbnNGa3NXaXRoVmFsdWVzID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHZhciBhdHRyaWJ1dGVzID0gZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCk7XG4gIHZhciBma3NLZXlzID0gdGhpcy5nZXRSZWxhdGlvbnNGa3NLZXlzKCk7XG4gIHJldHVybiBfLmV2ZXJ5KGZrc0tleXMsZnVuY3Rpb24oZmtLZXkpe1xuICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNbZmtLZXldO1xuICAgIHJldHVybiAoIV8uaXNOaWwodmFsdWUpICYmIHZhbHVlICE9ICcnKTtcbiAgfSlcbn07XG5cbi8vIGRhdGEgdW5hIGZlYXR1cmUgcG9wb2xvIHVuIG9nZ2V0dG8gY29uIGNoaWF2aS92YWxvcmkgZGVsbGUgRksgZGVsbGUgKGV2ZW50dWFsaSkgcmVsYXppb25lXG5wcm90by5nZXRSZWxhdGlvbnNGa3NXaXRoVmFsdWVzRm9yRmVhdHVyZSA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICB2YXIgYXR0cmlidXRlcyA9IGZlYXR1cmUuZ2V0UHJvcGVydGllcygpO1xuICB2YXIgZmtzID0ge307XG4gIHZhciBma3NLZXlzID0gdGhpcy5nZXRSZWxhdGlvbnNGa3NLZXlzKCk7XG4gIF8uZm9yRWFjaChma3NLZXlzLGZ1bmN0aW9uKGZrS2V5KXtcbiAgICBma3NbZmtLZXldID0gYXR0cmlidXRlc1tma0tleV07XG4gIH0pXG4gIHJldHVybiBma3M7XG59O1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgTGF5ZXJTdGF0ZSA9IHJlcXVpcmUoJ2NvcmUvbGF5ZXIvbGF5ZXJzdGF0ZScpO1xudmFyIE1hcExheWVyID0gcmVxdWlyZSgnY29yZS9tYXAvbWFwbGF5ZXInKTtcbnZhciBSYXN0ZXJMYXllcnMgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9sYXllcnMvcmFzdGVycycpO1xuXG5mdW5jdGlvbiBXTVNMYXllcihvcHRpb25zLGV4dHJhUGFyYW1zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLkxBWUVSVFlQRSA9IHtcbiAgICBMQVlFUjogJ2xheWVyJyxcbiAgICBNVUxUSUxBWUVSOiAnbXVsdGlsYXllcidcbiAgfTtcblxuICB0aGlzLmV4dHJhUGFyYW1zID0gZXh0cmFQYXJhbXNcbiAgdGhpcy5sYXllcnMgPSBbXTtcbiAgXG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbn1cbmluaGVyaXQoV01TTGF5ZXIsTWFwTGF5ZXIpXG52YXIgcHJvdG8gPSBXTVNMYXllci5wcm90b3R5cGU7XG5cbnByb3RvLmdldE9MTGF5ZXIgPSBmdW5jdGlvbigpe1xuICB2YXIgb2xMYXllciA9IHRoaXMuX29sTGF5ZXI7XG4gIGlmICghb2xMYXllcil7XG4gICAgb2xMYXllciA9IHRoaXMuX29sTGF5ZXIgPSB0aGlzLl9tYWtlT2xMYXllcigpO1xuICB9XG4gIHJldHVybiBvbExheWVyO1xufTtcblxucHJvdG8uZ2V0U291cmNlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuZ2V0T0xMYXllcigpLmdldFNvdXJjZSgpO1xufTtcblxucHJvdG8uZ2V0SW5mb0Zvcm1hdCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ2FwcGxpY2F0aW9uL3ZuZC5vZ2MuZ21sJztcbn07XG5cbnByb3RvLmdldEdldEZlYXR1cmVJbmZvVXJsID0gZnVuY3Rpb24oY29vcmRpbmF0ZSxyZXNvbHV0aW9uLGVwc2cscGFyYW1zKXtcbiAgcmV0dXJuIHRoaXMuZ2V0T0xMYXllcigpLmdldFNvdXJjZSgpLmdldEdldEZlYXR1cmVJbmZvVXJsKGNvb3JkaW5hdGUscmVzb2x1dGlvbixlcHNnLHBhcmFtcyk7XG59O1xuXG5wcm90by5nZXRMYXllckNvbmZpZ3MgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5sYXllcnM7XG59O1xuXG5wcm90by5hZGRMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29uZmlnKXtcbiAgdGhpcy5sYXllcnMucHVzaChsYXllckNvbmZpZyk7XG59O1xuXG5wcm90by50b2dnbGVMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzLGZ1bmN0aW9uKF9sYXllcil7XG4gICAgaWYgKF9sYXllci5pZCA9PSBsYXllci5pZCl7XG4gICAgICBfbGF5ZXIudmlzaWJsZSA9IGxheWVyLnZpc2libGU7XG4gICAgfVxuICB9KTtcbiAgdGhpcy5fdXBkYXRlTGF5ZXJzKCk7XG59O1xuICBcbnByb3RvLnVwZGF0ZSA9IGZ1bmN0aW9uKG1hcFN0YXRlLGV4dHJhUGFyYW1zKXtcbiAgdGhpcy5fdXBkYXRlTGF5ZXJzKG1hcFN0YXRlLGV4dHJhUGFyYW1zKTtcbn07XG5cbnByb3RvLmlzVmlzaWJsZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLl9nZXRWaXNpYmxlTGF5ZXJzKCkubGVuZ3RoID4gMDtcbn07XG5cbnByb3RvLmdldFF1ZXJ5VXJsID0gZnVuY3Rpb24oKXtcbiAgdmFyIGxheWVyID0gdGhpcy5sYXllcnNbMF07XG4gIGlmIChsYXllci5pbmZvdXJsICYmIGxheWVyLmluZm91cmwgIT0gJycpIHtcbiAgICByZXR1cm4gbGF5ZXIuaW5mb3VybDtcbiAgfVxuICByZXR1cm4gdGhpcy5jb25maWcudXJsO1xufTtcblxucHJvdG8uZ2V0UXVlcnlMYXllcnMgPSBmdW5jdGlvbigpeyBcbiAgdmFyIGxheWVyID0gdGhpcy5sYXllcnNbMF07XG4gIHZhciBxdWVyeUxheWVycyA9IFtdO1xuICBfLmZvckVhY2godGhpcy5sYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgIGlmIChMYXllclN0YXRlLmlzUXVlcnlhYmxlKGxheWVyKSkge1xuICAgICAgcXVlcnlMYXllcnMucHVzaCh7XG4gICAgICAgIGxheWVyTmFtZTogTGF5ZXJTdGF0ZS5nZXRXTVNMYXllck5hbWUobGF5ZXIpLFxuICAgICAgICBxdWVyeUxheWVyTmFtZTogTGF5ZXJTdGF0ZS5nZXRRdWVyeUxheWVyTmFtZShsYXllciksXG4gICAgICAgIGdlb21ldHJ5VHlwZTogTGF5ZXJTdGF0ZS5nZXRHZW9tZXRyeVR5cGUobGF5ZXIpLFxuICAgICAgICBhdHRyaWJ1dGVzOiBMYXllclN0YXRlLmdldEF0dHJpYnV0ZXMobGF5ZXIpXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcXVlcnlMYXllcnM7XG59O1xuXG5wcm90by5fbWFrZU9sTGF5ZXIgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB3bXNDb25maWcgPSB7XG4gICAgdXJsOiB0aGlzLmNvbmZpZy51cmwsXG4gICAgaWQ6IHRoaXMuY29uZmlnLmlkXG4gIH07XG4gIFxuICB2YXIgcmVwcmVzZW50YXRpdmVMYXllciA9IHRoaXMubGF5ZXJzWzBdOyAvL0JSVVRUTywgREVWTyBQUkVOREVSRSBVTiBMQVlFUiBBIENBU08gKElMIFBSSU1PKSBQRVIgVkVERVJFIFNFIFBVTlRBIEFEIFVOIFNPVVJDRSBESVZFUlNPIChkb3ZyZWJiZSBhY2NhZGVyZSBzb2xvIHBlciBpIGxheWVyIHNpbmdvbGksIFdNUyBlc3Rlcm5pKVxuICBcbiAgaWYgKHJlcHJlc2VudGF0aXZlTGF5ZXIuc291cmNlICYmIHJlcHJlc2VudGF0aXZlTGF5ZXIuc291cmNlLnR5cGUgPT0gJ3dtcycgJiYgcmVwcmVzZW50YXRpdmVMYXllci5zb3VyY2UudXJsKXtcbiAgICB3bXNDb25maWcudXJsID0gcmVwcmVzZW50YXRpdmVMYXllci5zb3VyY2UudXJsO1xuICB9O1xuICBcbiAgdmFyIG9sTGF5ZXIgPSBuZXcgUmFzdGVyTGF5ZXJzLldNU0xheWVyKHdtc0NvbmZpZyx0aGlzLmV4dHJhUGFyYW1zKTtcbiAgXG4gIG9sTGF5ZXIuZ2V0U291cmNlKCkub24oJ2ltYWdlbG9hZHN0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuZW1pdChcImxvYWRzdGFydFwiKTtcbiAgICAgIH0pO1xuICBvbExheWVyLmdldFNvdXJjZSgpLm9uKCdpbWFnZWxvYWRlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZW1pdChcImxvYWRlbmRcIik7XG4gIH0pO1xuICBcbiAgcmV0dXJuIG9sTGF5ZXJcbn07XG5cbnByb3RvLl9nZXRWaXNpYmxlTGF5ZXJzID0gZnVuY3Rpb24obWFwU3RhdGUpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB2aXNpYmxlTGF5ZXJzID0gW107XG4gIF8uZm9yRWFjaCh0aGlzLmxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgdmFyIHJlc29sdXRpb25CYXNlZFZpc2liaWxpdHkgPSBsYXllci5tYXhyZXNvbHV0aW9uID8gKGxheWVyLm1heHJlc29sdXRpb24gJiYgbGF5ZXIubWF4cmVzb2x1dGlvbiA+IG1hcFN0YXRlLnJlc29sdXRpb24pIDogdHJ1ZTtcbiAgICBpZiAobGF5ZXIudmlzaWJsZSAmJiByZXNvbHV0aW9uQmFzZWRWaXNpYmlsaXR5KSB7XG4gICAgICB2aXNpYmxlTGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgIH0gICAgXG4gIH0pXG4gIHJldHVybiB2aXNpYmxlTGF5ZXJzO1xufTtcblxucHJvdG8uY2hlY2tMYXllckRpc2FibGVkID0gZnVuY3Rpb24obGF5ZXIscmVzb2x1dGlvbikge1xuICB2YXIgZGlzYWJsZWQgPSBsYXllci5kaXNhYmxlZCB8fCBmYWxzZTtcbiAgaWYgKGxheWVyLm1heHJlc29sdXRpb24pe1xuICAgIGRpc2FibGVkID0gbGF5ZXIubWF4cmVzb2x1dGlvbiA8IHJlc29sdXRpb247XG4gIH1cbiAgaWYgKGxheWVyLm1pbnJlc29sdXRpb24pe1xuICAgIGxheWVyLmRpc2FibGVkID0gZGlzYWJsZWQgJiYgKGxheWVyLm1pbnJlc29sdXRpb24gPiByZXNvbHV0aW9uKTtcbiAgfVxuICBsYXllci5kaXNhYmxlZCA9IGRpc2FibGVkO1xufTtcblxucHJvdG8uY2hlY2tMYXllcnNEaXNhYmxlZCA9IGZ1bmN0aW9uKHJlc29sdXRpb24pe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIF8uZm9yRWFjaCh0aGlzLmxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgc2VsZi5jaGVja0xheWVyRGlzYWJsZWQobGF5ZXIscmVzb2x1dGlvbik7XG4gIH0pO1xufTtcblxucHJvdG8uX3VwZGF0ZUxheWVycyA9IGZ1bmN0aW9uKG1hcFN0YXRlLGV4dHJhUGFyYW1zKXtcbiAgdGhpcy5jaGVja0xheWVyc0Rpc2FibGVkKG1hcFN0YXRlLnJlc29sdXRpb24pO1xuICB2YXIgdmlzaWJsZUxheWVycyA9IHRoaXMuX2dldFZpc2libGVMYXllcnMobWFwU3RhdGUpO1xuICBpZiAodmlzaWJsZUxheWVycy5sZW5ndGggPiAwKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIExBWUVSUzogXy5qb2luKF8ubWFwKHZpc2libGVMYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgICByZXR1cm4gTGF5ZXJTdGF0ZS5nZXRXTVNMYXllck5hbWUobGF5ZXIpO1xuICAgICAgfSksJywnKVxuICAgIH07XG4gICAgaWYgKGV4dHJhUGFyYW1zKSB7XG4gICAgICBwYXJhbXMgPSBfLmFzc2lnbihwYXJhbXMsZXh0cmFQYXJhbXMpO1xuICAgIH1cbiAgICB0aGlzLl9vbExheWVyLnNldFZpc2libGUodHJ1ZSk7XG4gICAgdGhpcy5fb2xMYXllci5nZXRTb3VyY2UoKS51cGRhdGVQYXJhbXMocGFyYW1zKTtcbiAgfVxuICBlbHNlIHtcbiAgICB0aGlzLl9vbExheWVyLnNldFZpc2libGUoZmFsc2UpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdNU0xheWVyO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuXG5mdW5jdGlvbiBNYXBMYXllcihjb25maWcpe1xuICB0aGlzLmNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgdGhpcy5pZCA9IGNvbmZpZy5pZDtcbiAgXG4gIHRoaXMuX29sTGF5ZXIgPSBudWxsO1xuICBcbiAgYmFzZSh0aGlzKTtcbn1cbmluaGVyaXQoTWFwTGF5ZXIsRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gTWFwTGF5ZXIucHJvdG90eXBlO1xuXG5wcm90by5nZXRJZCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLmlkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNYXBMYXllcjtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgR2VvbWV0cnkgPSByZXF1aXJlKCdjb3JlL2dlb21ldHJ5L2dlb21ldHJ5Jyk7XG52YXIgUHJvamVjdFNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNlcnZpY2UnKS5Qcm9qZWN0U2VydmljZTtcblxuLy92YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpOyAvLyBRVUVTVE8gTk9OIENJIERFVkUgRVNTRVJFISEhXG5cbmZ1bmN0aW9uIE1hcFF1ZXJ5U2VydmljZSgpIHtcbiAgYmFzZSh0aGlzKTtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKG1hcCl7XG4gICAgdGhpcy5tYXAgPSBtYXA7XG4gIH1cbiAgXG4gIHRoaXMucXVlcnlQb2ludCA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzLG1hcExheWVycykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgdXJsc0ZvckxheWVycyA9IHt9O1xuICAgIF8uZm9yRWFjaChtYXBMYXllcnMsZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgICAgdmFyIHVybCA9IG1hcExheWVyLmdldFF1ZXJ5VXJsKCk7XG4gICAgICB2YXIgdXJsSGFzaCA9IHVybC5oYXNoQ29kZSgpLnRvU3RyaW5nKCk7XG4gICAgICBpZiAoXy5rZXlzKHVybHNGb3JMYXllcnMpLmluZGV4T2YodXJsSGFzaCkgPT0gLTEpIHtcbiAgICAgICAgdXJsc0ZvckxheWVyc1t1cmxIYXNoXSA9IHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBtYXBMYXllcnM6IFtdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICB1cmxzRm9yTGF5ZXJzW3VybEhhc2hdLm1hcExheWVycy5wdXNoKG1hcExheWVyKTtcbiAgICB9KVxuICAgIFxuICAgIHZhciBxdWVyeVVybHNGb3JMYXllcnMgPSBbXTtcbiAgICBfLmZvckVhY2godXJsc0ZvckxheWVycyxmdW5jdGlvbih1cmxGb3JMYXllcnMpe1xuICAgICAgdmFyIGZpcnN0TGF5ZXIgPSB1cmxGb3JMYXllcnMubWFwTGF5ZXJzWzBdO1xuICAgICAgdmFyIF9nZXRGZWF0dXJlSW5mb1VybCA9IHNlbGYuZ2V0R2V0RmVhdHVyZUluZm9VcmwoZmlyc3RMYXllcixjb29yZGluYXRlcyk7XG4gICAgICB2YXIgcXVlcnlCYXNlID0gX2dldEZlYXR1cmVJbmZvVXJsLnNwbGl0KCc/JylbMF07XG4gICAgICB2YXIgcXVlcnlTdHJpbmcgPSBfZ2V0RmVhdHVyZUluZm9Vcmwuc3BsaXQoJz8nKVsxXTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgXy5mb3JFYWNoKHF1ZXJ5U3RyaW5nLnNwbGl0KCcmJyksZnVuY3Rpb24ocXVlcnlTdHJpbmdQYWlyKXtcbiAgICAgICAgdmFyIHF1ZXJ5UGFpciA9IHF1ZXJ5U3RyaW5nUGFpci5zcGxpdCgnPScpO1xuICAgICAgICB2YXIga2V5ID0gcXVlcnlQYWlyWzBdO1xuICAgICAgICB2YXIgdmFsdWUgPSBxdWVyeVBhaXJbMV07XG4gICAgICAgIHF1ZXJ5UGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICB2YXIgbGF5ZXJOYW1lcyA9IFtdO1xuICAgICAgdmFyIHF1ZXJ5TGF5ZXJzID0gW107XG4gICAgICBfLmZvckVhY2godXJsRm9yTGF5ZXJzLm1hcExheWVycyxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICAgIC8vdmFyIG1hcExheWVyTGF5ZXJzTmFtZXMgPSBtYXBMYXllci5nZXRMYXllcigpLmdldFNvdXJjZSgpLmdldFBhcmFtcygpWydMQVlFUlMnXTtcbiAgICAgICAgLy9sYXllck5hbWVzID0gXy5jb25jYXQobGF5ZXJOYW1lcyxtYXBMYXllckxheWVyc05hbWVzKTtcbiAgICAgICAgdmFyIG1hcExheWVyUXVlcnlMYXllcnMgPSBtYXBMYXllci5nZXRRdWVyeUxheWVycygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1hcExheWVyUXVlcnlMYXllcnMubGVuZ3RoKSB7XG4gICAgICAgICAgcXVlcnlMYXllcnMgPSBfLmNvbmNhdChxdWVyeUxheWVycyxtYXBMYXllclF1ZXJ5TGF5ZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgaWYgKHF1ZXJ5TGF5ZXJzLmxlbmd0aCkge1xuICAgICAgICBkZWxldGUgcXVlcnlQYXJhbXNbJ1NUWUxFUyddO1xuICAgICAgXG4gICAgICAgIHF1ZXJ5UGFyYW1zWydMQVlFUlMnXSA9IF8ubWFwKHF1ZXJ5TGF5ZXJzLCdxdWVyeUxheWVyTmFtZScpO1xuICAgICAgICBxdWVyeVBhcmFtc1snUVVFUllfTEFZRVJTJ10gPSBfLm1hcChxdWVyeUxheWVycywncXVlcnlMYXllck5hbWUnKTtcbiAgICAgICAgcXVlcnlQYXJhbXNbJ0ZFQVRVUkVfQ09VTlQnXSA9IDEwMDA7XG4gICAgICAgIFxuICAgICAgICB2YXIgZ2V0RmVhdHVyZUluZm9VcmwgPSBxdWVyeUJhc2U7XG4gICAgICAgIHZhciBuZXdRdWVyeVBhaXJzID0gW107XG4gICAgICAgIF8uZm9yRWFjaChxdWVyeVBhcmFtcyxmdW5jdGlvbih2YWx1ZSxrZXkpe1xuICAgICAgICAgIG5ld1F1ZXJ5UGFpcnMucHVzaChrZXkrJz0nK3ZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGdldEZlYXR1cmVJbmZvVXJsID0gcXVlcnlCYXNlKyc/JytuZXdRdWVyeVBhaXJzLmpvaW4oJyYnKVxuICAgICAgICBcbiAgICAgICAgcXVlcnlVcmxzRm9yTGF5ZXJzLnB1c2goe1xuICAgICAgICAgIHVybDogZ2V0RmVhdHVyZUluZm9VcmwsXG4gICAgICAgICAgcXVlcnlMYXllcnM6IHF1ZXJ5TGF5ZXJzXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gICAgXG4gICAgdmFyIGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyA9IHt9O1xuICAgIGlmIChxdWVyeVVybHNGb3JMYXllcnMubGVuZ3RoID4gMCkge1xuICAgICAgXy5mb3JFYWNoKHF1ZXJ5VXJsc0ZvckxheWVycyxmdW5jdGlvbihxdWVyeVVybEZvckxheWVycyl7XG4gICAgICAgIHZhciB1cmwgPSBxdWVyeVVybEZvckxheWVycy51cmw7XG4gICAgICAgIHZhciBxdWVyeUxheWVycyA9IHF1ZXJ5VXJsRm9yTGF5ZXJzLnF1ZXJ5TGF5ZXJzO1xuXG4gICAgICAgICQuZ2V0KHVybCkuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgIHZhciBqc29ucmVzcG9uc2U7XG4gICAgICAgICAgdmFyIHgyanMgPSBuZXcgWDJKUygpO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoXy5pc1N0cmluZyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAganNvbnJlc3BvbnNlID0geDJqcy54bWxfc3RyMmpzb24ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGpzb25yZXNwb25zZSA9IHgyanMueG1sMmpzb24ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgZC5yZWplY3QoZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByb290Tm9kZSA9IF8ua2V5cyhqc29ucmVzcG9uc2UpWzBdO1xuICAgICAgICAgIHZhciBwYXJzZXIsIGRhdGE7XG4gICAgICAgICAgc3dpdGNoIChyb290Tm9kZSkge1xuICAgICAgICAgICAgY2FzZSAnRmVhdHVyZUNvbGxlY3Rpb24nOlxuICAgICAgICAgICAgICBwYXJzZXIgPSBzZWxmLl9wYXJzZUxheWVyRmVhdHVyZUNvbGxlY3Rpb247XG4gICAgICAgICAgICAgIGRhdGEgPSBqc29ucmVzcG9uc2U7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIm1zR01MT3V0cHV0XCI6XG4gICAgICAgICAgICAgIHBhcnNlciA9IHNlbGYuX3BhcnNlTGF5ZXJtc0dNTE91dHB1dDtcbiAgICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5mZWF0dXJlcyA9IDBcbiAgICAgICAgICBfLmZvckVhY2gocXVlcnlMYXllcnMsZnVuY3Rpb24ocXVlcnlMYXllcil7XG4gICAgICAgICAgICB2YXIgZmVhdHVyZXMgPSBwYXJzZXIuY2FsbChzZWxmLHF1ZXJ5TGF5ZXIsZGF0YSlcbiAgICAgICAgICAgIG5mZWF0dXJlcyArPSBmZWF0dXJlcy5sZW5ndGg7XG4gICAgICAgICAgICBmZWF0dXJlc0ZvckxheWVyTmFtZXNbcXVlcnlMYXllci5sYXllck5hbWVdID0gZmVhdHVyZXM7XG4gICAgICAgICAgfSlcbiAgICAgICAgICBkLnJlc29sdmUoY29vcmRpbmF0ZXMsbmZlYXR1cmVzLGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGQucmVqZWN0KGUpO1xuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZC5yZXNvbHZlKGNvb3JkaW5hdGVzLDAsZmVhdHVyZXNGb3JMYXllck5hbWVzKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgLy8gQnJ1dHRvIG1hIHBlciBvcmEgdW5pY2Egc29sdXppb25lIHRyb3ZhdGEgcGVyIGRpdmlkZXJlIHBlciBsYXllciBpIHJpc3VsdGF0aSBkaSB1biBkb2MgeG1sIHdmcy5GZWF0dXJlQ29sbGVjdGlvbi4gT0wzIGxpIHBhcnNlcml6emEgdHV0dGkgaW5zaWVtZS4uLlxuICB0aGlzLl9wYXJzZUxheWVyRmVhdHVyZUNvbGxlY3Rpb24gPSBmdW5jdGlvbihxdWVyeUxheWVyLGRhdGEpe1xuICAgIHZhciBmZWF0dXJlcyA9IFtdO1xuICAgIHZhciBsYXllck5hbWUgPSBxdWVyeUxheWVyLnF1ZXJ5TGF5ZXJOYW1lO1xuICAgIHZhciBsYXllckRhdGEgPSBfLmNsb25lRGVlcChkYXRhKTtcbiAgICBsYXllckRhdGEuRmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZU1lbWJlciA9IFtdO1xuICAgIFxuICAgIHZhciBmZWF0dXJlTWVtYmVycyA9IGRhdGEuRmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZU1lbWJlcjtcbiAgICBfLmZvckVhY2goZmVhdHVyZU1lbWJlcnMsZnVuY3Rpb24oZmVhdHVyZU1lbWJlcil7XG4gICAgICB2YXIgaXNMYXllck1lbWJlciA9IF8uZ2V0KGZlYXR1cmVNZW1iZXIsbGF5ZXJOYW1lKVxuXG4gICAgICBpZiAoaXNMYXllck1lbWJlcikge1xuICAgICAgICBsYXllckRhdGEuRmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZU1lbWJlci5wdXNoKGZlYXR1cmVNZW1iZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIHZhciB4MmpzID0gbmV3IFgySlMoKTtcbiAgICB2YXIgbGF5ZXJGZWF0dXJlQ29sbGVjdGlvblhNTCA9IHgyanMuanNvbjJ4bWxfc3RyKGxheWVyRGF0YSk7XG4gICAgdmFyIHBhcnNlciA9IG5ldyBvbC5mb3JtYXQuV01TR2V0RmVhdHVyZUluZm8oKTtcbiAgICByZXR1cm4gcGFyc2VyLnJlYWRGZWF0dXJlcyhsYXllckZlYXR1cmVDb2xsZWN0aW9uWE1MKTtcbiAgfTtcbiAgXG4gIC8vIG1lbnRyZSBjb24gaSByaXN1bHRhdGkgaW4gbXNHTE1PdXRwdXQgKGRhIE1hcHNlcnZlcikgaWwgcGFyc2VyIHB1w7IgZXNzZXJlIGlzdHJ1aXRvIHBlciBwYXJzZXJpenphcmUgaW4gYmFzZSBhZCB1biBsYXllciBkaSBmaWx0cm9cbiAgdGhpcy5fcGFyc2VMYXllcm1zR01MT3V0cHV0ID0gZnVuY3Rpb24ocXVlcnlMYXllcixkYXRhKXtcbiAgICB2YXIgcGFyc2VyID0gbmV3IG9sLmZvcm1hdC5XTVNHZXRGZWF0dXJlSW5mbyh7XG4gICAgICBsYXllcnM6IFtxdWVyeUxheWVyLnF1ZXJ5TGF5ZXJOYW1lXVxuICAgIH0pO1xuICAgIHJldHVybiBwYXJzZXIucmVhZEZlYXR1cmVzKGRhdGEpO1xuICB9O1xuICBcbiAgdGhpcy5xdWVyeVJlY3QgPSBmdW5jdGlvbihyZWN0LGxheWVySWQpIHtcbiAgICBcbiAgfTtcbiAgXG4gIHRoaXMuX3F1ZXJ5ID0gZnVuY3Rpb24ocmVjdCxsYXllcklkKSB7XG4gICAgdmFyIGxheWVycztcbiAgICBpZiAobGF5ZXJJZCkge1xuICAgICAgbGF5ZXJzID0gW1Byb2plY3RTZXJ2aWNlLmdldExheWVyKGxheWVySWQpXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBsYXllcnMgPSBQcm9qZWN0U2VydmljZS5nZXRMYXllcnMoKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLmdldEdldEZlYXR1cmVJbmZvVXJsID0gZnVuY3Rpb24obWFwTGF5ZXIsY29vcmRpbmF0ZSl7XG4gICAgLy92YXIgcGFyc2VyID0gbmV3IG9sLmZvcm1hdC5XTVNHZXRGZWF0dXJlSW5mbygpO1xuICAgIHZhciByZXNvbHV0aW9uID0gdGhpcy5tYXAuZ2V0VmlldygpLmdldFJlc29sdXRpb24oKTtcbiAgICB2YXIgZXBzZyA9IHRoaXMubWFwLmdldFZpZXcoKS5nZXRQcm9qZWN0aW9uKCkuZ2V0Q29kZSgpO1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBRVUVSWV9MQVlFUlM6IF8ubWFwKG1hcExheWVyLmdldFF1ZXJ5TGF5ZXJzKCksJ3F1ZXJ5TGF5ZXJOYW1lJyksXG4gICAgICBJTkZPX0ZPUk1BVDogbWFwTGF5ZXIuZ2V0SW5mb0Zvcm1hdCgpLFxuICAgICAgLy8gUEFSQU1FVFJJIERJIFRPTExFUkFOWkEgUEVSIFFHSVMgU0VSVkVSXG4gICAgICBGSV9QT0lOVF9UT0xFUkFOQ0U6IDEwLFxuICAgICAgRklfTElORV9UT0xFUkFOQ0U6IDEwLFxuICAgICAgRklfUE9MWUdPTl9UT0xFUkFOQ0U6IDEwICAgICAgXG4gICAgfVxuICAgIHZhciB1cmwgPSBtYXBMYXllci5nZXRHZXRGZWF0dXJlSW5mb1VybChjb29yZGluYXRlLHJlc29sdXRpb24sZXBzZyxwYXJhbXMpO1xuICAgIHJldHVybiB1cmw7XG4gIH07XG59XG5pbmhlcml0KE1hcFF1ZXJ5U2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNYXBRdWVyeVNlcnZpY2U7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xudmFyIFByb2plY3RTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzZXJ2aWNlJykuUHJvamVjdFNlcnZpY2U7XG52YXIgUHJvamVjdFR5cGVzID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzZXJ2aWNlJykuUHJvamVjdFR5cGVzO1xudmFyIEdlb21ldHJ5VHlwZXMgPSByZXF1aXJlKCdjb3JlL2dlb21ldHJ5L2dlb21ldHJ5JykuR2VvbWV0cnlUeXBlcztcbnZhciBvbDNoZWxwZXJzID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvZzN3Lm9sMycpLmhlbHBlcnM7XG52YXIgUmVzZXRDb250cm9sID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvY29udHJvbHMvcmVzZXRjb250cm9sJyk7XG52YXIgUXVlcnlDb250cm9sID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvY29udHJvbHMvcXVlcnljb250cm9sJyk7XG52YXIgWm9vbUJveENvbnRyb2wgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9jb250cm9scy96b29tYm94Y29udHJvbCcpO1xudmFyIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvaW50ZXJhY3Rpb25zL3BpY2tjb29yZGluYXRlc2ludGVyYWN0aW9uJyk7XG52YXIgV01TTGF5ZXIgPSByZXF1aXJlKCdjb3JlL2xheWVyL3dtc2xheWVyJyk7XG52YXIgTWFwUXVlcnlTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9tYXAvbWFwcXVlcnlzZXJ2aWNlJyk7XG5cbi8vdmFyIEdVSSA9IHJlcXVpcmUoJ2d1aS9ndWknKTsgLy8gUVVFU1RPIE5PTiBDSSBERVZFIEVTU0VSRSEhIVxuXG52YXIgUGlja1RvbGVyYW5jZVBhcmFtcyA9IHt9O1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT10gPSB7fTtcblBpY2tUb2xlcmFuY2VQYXJhbXNbUHJvamVjdFR5cGVzLlFESkFOR09dW0dlb21ldHJ5VHlwZXMuUE9JTlRdID0gXCJGSV9QT0lOVF9UT0xFUkFOQ0VcIjtcblBpY2tUb2xlcmFuY2VQYXJhbXNbUHJvamVjdFR5cGVzLlFESkFOR09dW0dlb21ldHJ5VHlwZXMuTElORVNUUklOR10gPSBcIkZJX0xJTkVfVE9MRVJBTkNFXCI7XG5QaWNrVG9sZXJhbmNlUGFyYW1zW1Byb2plY3RUeXBlcy5RREpBTkdPXVtHZW9tZXRyeVR5cGVzLlBPTFlHT05dID0gXCJGSV9QT0xZR09OX1RPTEVSQU5DRVwiO1xuXG52YXIgUGlja1RvbGVyYW5jZVZhbHVlcyA9IHt9XG5QaWNrVG9sZXJhbmNlVmFsdWVzW0dlb21ldHJ5VHlwZXMuUE9JTlRdID0gNTtcblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5MSU5FU1RSSU5HXSA9IDU7XG5QaWNrVG9sZXJhbmNlVmFsdWVzW0dlb21ldHJ5VHlwZXMuUE9MWUdPTl0gPSA1O1xuXG5mdW5jdGlvbiBNYXBTZXJ2aWNlKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWc7XG4gIHRoaXMudmlld2VyO1xuICB0aGlzLm1hcExheWVycyA9IHt9O1xuICB0aGlzLm1hcEJhc2VMYXllcnMgPSB7fTtcbiAgdGhpcy5sYXllcnNBc3NvY2lhdGlvbiA9IHt9O1xuICB0aGlzLmxheWVyc0V4dHJhUGFyYW1zID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgICBiYm94OiBbXSxcbiAgICAgIHJlc29sdXRpb246IG51bGwsXG4gICAgICBjZW50ZXI6IG51bGwsXG4gICAgICBsb2FkaW5nOiBmYWxzZVxuICB9O1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gIH1cbiAgXG4gIHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nID0gMDtcbiAgdGhpcy5faW5jcmVtZW50TG9hZGVycyA9IGZ1bmN0aW9uKCl7XG4gICAgaWYgKHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nID09IDApe1xuICAgICAgdGhpcy5lbWl0KCdsb2Fkc3RhcnQnKTtcbiAgICB9XG4gICAgdGhpcy5faG93TWFueUFyZUxvYWRpbmcgKz0gMTtcbiAgfTtcbiAgXG4gIHRoaXMuX2RlY3JlbWVudExvYWRlcnMgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nIC09IDE7XG4gICAgaWYgKHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nID09IDApe1xuICAgICAgdGhpcy5lbWl0KCdsb2FkZW5kJyk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5faW50ZXJhY3Rpb25zU3RhY2sgPSBbXTtcbiAgXG4gIFxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0TWFwVmlldzogZnVuY3Rpb24oYmJveCxyZXNvbHV0aW9uLGNlbnRlcil7XG4gICAgICB0aGlzLnN0YXRlLmJib3ggPSBiYm94O1xuICAgICAgdGhpcy5zdGF0ZS5yZXNvbHV0aW9uID0gcmVzb2x1dGlvbjtcbiAgICAgIHRoaXMuc3RhdGUuY2VudGVyID0gY2VudGVyO1xuICAgICAgdGhpcy51cGRhdGVNYXBMYXllcnModGhpcy5tYXBMYXllcnMpO1xuICAgIH0sXG4gICAgc2V0dXBWaWV3ZXI6IGZ1bmN0aW9uKCl7XG4gICAgICAvLyRzY3JpcHQoXCJodHRwOi8vZXBzZy5pby9cIitQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmNycytcIi5qc1wiKTtcbiAgICAgIHByb2o0LmRlZnMoXCJFUFNHOlwiK1Byb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuY3JzLFByb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QucHJvajQpO1xuICAgICAgaWYgKHNlbGYudmlld2VyKSB7XG4gICAgICAgIHRoaXMudmlld2VyLmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy52aWV3ZXIgPSBudWxsO1xuICAgICAgfVxuICAgICAgc2VsZi5fc2V0dXBWaWV3ZXIoKTtcbiAgICAgIHNlbGYuc2V0dXBDb250cm9scygpO1xuICAgICAgc2VsZi5zZXR1cExheWVycygpO1xuICAgICAgc2VsZi5lbWl0KCd2aWV3ZXJzZXQnKTtcbiAgICB9XG4gIH07XG4gIFxuICBQcm9qZWN0U2VydmljZS5vbigncHJvamVjdHNldCcsZnVuY3Rpb24oKXtcbiAgICBzZWxmLnNldHVwVmlld2VyKCk7XG4gIH0pO1xuICBcbiAgUHJvamVjdFNlcnZpY2Uub24oJ3Byb2plY3Rzd2l0Y2gnLGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5zZXR1cExheWVycygpO1xuICB9KTtcbiAgXG4gIFByb2plY3RTZXJ2aWNlLm9uYWZ0ZXIoJ3NldExheWVyc1Zpc2libGUnLGZ1bmN0aW9uKGxheWVycyl7XG4gICAgdmFyIG1hcExheWVycyA9IF8ubWFwKGxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgICByZXR1cm4gc2VsZi5nZXRNYXBMYXllckZvckxheWVyKGxheWVyKTtcbiAgICB9KVxuICAgIHNlbGYudXBkYXRlTWFwTGF5ZXJzKG1hcExheWVycyk7XG4gIH0pO1xuICBcbiAgUHJvamVjdFNlcnZpY2Uub25hZnRlcignc2V0QmFzZUxheWVyJyxmdW5jdGlvbigpe1xuICAgIHNlbGYudXBkYXRlTWFwTGF5ZXJzKHNlbGYubWFwQmFzZUxheWVycyk7XG4gIH0pO1xuICBcbiAgdGhpcy5zZXRMYXllcnNFeHRyYVBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcyx1cGRhdGUpe1xuICAgIHRoaXMubGF5ZXJzRXh0cmFQYXJhbXMgPSBfLmFzc2lnbih0aGlzLmxheWVyc0V4dHJhUGFyYW1zLHBhcmFtcyk7XG4gICAgdGhpcy5lbWl0KCdleHRyYVBhcmFtc1NldCcscGFyYW1zLHVwZGF0ZSk7XG4gIH07XG4gIFxuICB0aGlzLl9zZXR1cFZpZXdlciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGV4dGVudCA9IFByb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuZXh0ZW50O1xuICAgIHZhciBwcm9qZWN0aW9uID0gbmV3IG9sLnByb2ouUHJvamVjdGlvbih7XG4gICAgICBjb2RlOiBcIkVQU0c6XCIrUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC5jcnMsXG4gICAgICBleHRlbnQ6IGV4dGVudFxuICAgIH0pO1xuICAgIFxuICAgIC8qdmFyIGNvbnN0cmFpbl9leHRlbnQ7XG4gICAgaWYgKHRoaXMuY29uZmlnLmNvbnN0cmFpbnRleHRlbnQpIHtcbiAgICAgIHZhciBleHRlbnQgPSB0aGlzLmNvbmZpZy5jb25zdHJhaW50ZXh0ZW50O1xuICAgICAgdmFyIGR4ID0gZXh0ZW50WzJdLWV4dGVudFswXTtcbiAgICAgIHZhciBkeSA9IGV4dGVudFszXS1leHRlbnRbMV07XG4gICAgICB2YXIgZHg0ID0gZHgvNDtcbiAgICAgIHZhciBkeTQgPSBkeS80O1xuICAgICAgdmFyIGJib3hfeG1pbiA9IGV4dGVudFswXSArIGR4NDtcbiAgICAgIHZhciBiYm94X3htYXggPSBleHRlbnRbMl0gLSBkeDQ7XG4gICAgICB2YXIgYmJveF95bWluID0gZXh0ZW50WzFdICsgZHk0O1xuICAgICAgdmFyIGJib3hfeW1heCA9IGV4dGVudFszXSAtIGR5NDtcbiAgICAgIFxuICAgICAgY29uc3RyYWluX2V4dGVudCA9IFtiYm94X3htaW4sYmJveF95bWluLGJib3hfeG1heCxiYm94X3ltYXhdO1xuICAgIH0qL1xuICAgIFxuICAgIHRoaXMudmlld2VyID0gb2wzaGVscGVycy5jcmVhdGVWaWV3ZXIoe1xuICAgICAgdmlldzoge1xuICAgICAgICBwcm9qZWN0aW9uOiBwcm9qZWN0aW9uLFxuICAgICAgICBjZW50ZXI6IHRoaXMuY29uZmlnLmluaXRjZW50ZXIgfHwgb2wuZXh0ZW50LmdldENlbnRlcihQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmV4dGVudCksXG4gICAgICAgIHpvb206IHRoaXMuY29uZmlnLmluaXR6b29tIHx8IDAsXG4gICAgICAgIGV4dGVudDogdGhpcy5jb25maWcuY29uc3RyYWludGV4dGVudCB8fCBleHRlbnQsXG4gICAgICAgIG1pblpvb206IHRoaXMuY29uZmlnLm1pbnpvb20gfHwgMCwgLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wXG4gICAgICAgIG1heFpvb206IHRoaXMuY29uZmlnLm1heHpvb20gfHwgMjggLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wXG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy52aWV3ZXIubWFwLm9uKCdtb3ZlZW5kJyxmdW5jdGlvbihlKXtcbiAgICAgIHNlbGYuX3NldE1hcFZpZXcoKTtcbiAgICB9KTtcbiAgICBcbiAgICBNYXBRdWVyeVNlcnZpY2UuaW5pdCh0aGlzLnZpZXdlci5tYXApO1xuICAgIFxuICAgIHRoaXMuZW1pdCgncmVhZHknKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0Vmlld2VyRWxlbWVudCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy52aWV3ZXIubWFwLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0Vmlld3BvcnQgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLnZpZXdlci5tYXAuZ2V0Vmlld3BvcnQoKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2V0dXBDb250cm9scyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXAgPSBzZWxmLnZpZXdlci5tYXA7XG4gICAgaWYgKHRoaXMuY29uZmlnICYmIHRoaXMuY29uZmlnLmNvbnRyb2xzKSB7XG4gICAgICBfLmZvckVhY2godGhpcy5jb25maWcuY29udHJvbHMsZnVuY3Rpb24oY29udHJvbFR5cGUpe1xuICAgICAgICB2YXIgY29udHJvbDtcbiAgICAgICAgc3dpdGNoIChjb250cm9sVHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3Jlc2V0JzpcbiAgICAgICAgICAgIGlmICghaXNNb2JpbGUuYW55KSB7XG4gICAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgUmVzZXRDb250cm9sKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICd6b29tJzpcbiAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgb2wuY29udHJvbC5ab29tKHtcbiAgICAgICAgICAgICAgem9vbUluTGFiZWw6IFwiXFx1ZTk4YVwiLFxuICAgICAgICAgICAgICB6b29tT3V0TGFiZWw6IFwiXFx1ZTk4YlwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3pvb21ib3gnOiBcbiAgICAgICAgICAgIGlmICghaXNNb2JpbGUuYW55KSB7XG4gICAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgWm9vbUJveENvbnRyb2woKTtcbiAgICAgICAgICAgICAgY29udHJvbC5vbignem9vbWVuZCcsZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgc2VsZi52aWV3ZXIuZml0KGUuZXh0ZW50KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3pvb210b2V4dGVudCc6XG4gICAgICAgICAgICBjb250cm9sID0gbmV3IG9sLmNvbnRyb2wuWm9vbVRvRXh0ZW50KHtcbiAgICAgICAgICAgICAgbGFiZWw6ICBcIlxcdWU5OGNcIixcbiAgICAgICAgICAgICAgZXh0ZW50OiBzZWxmLmNvbmZpZy5jb25zdHJhaW50ZXh0ZW50XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3F1ZXJ5JzpcbiAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgUXVlcnlDb250cm9sKCk7XG4gICAgICAgICAgICBjb250cm9sLm9uKCdwaWNrZWQnLGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICB2YXIgY29vcmRpbmF0ZXMgPSBlLmNvb3JkaW5hdGVzO1xuIFxuICAgICAgICAgICAgICBNYXBRdWVyeVNlcnZpY2UucXVlcnlQb2ludChjb29yZGluYXRlcyxzZWxmLm1hcExheWVycylcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY29vcmRpbmF0ZXMsbmZlYXR1cmVzLGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyl7XG4gICAgICAgICAgICAgICAgdmFyIGZlYXR1cmVzRm9yTGF5ZXJzID0gW107XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyxmdW5jdGlvbihmZWF0dXJlcyxsYXllck5hbWUpe1xuICAgICAgICAgICAgICAgICAgdmFyIGxheWVyID0gUHJvamVjdFNlcnZpY2UubGF5ZXJzW2xheWVyTmFtZV07XG4gICAgICAgICAgICAgICAgICBmZWF0dXJlc0ZvckxheWVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXI6IGxheWVyLFxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlczogZmVhdHVyZXNcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzZWxmLmVtaXQoJ21hcHF1ZXJ5ZW5kJyxmZWF0dXJlc0ZvckxheWVycyxuZmVhdHVyZXMsY29vcmRpbmF0ZXMsc2VsZi5zdGF0ZS5yZXNvbHV0aW9uKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjb250cm9sKSB7XG4gICAgICAgICAgc2VsZi5hZGRDb250cm9sKGNvbnRyb2wpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLmFkZENvbnRyb2wgPSBmdW5jdGlvbihjb250cm9sKXtcbiAgICB0aGlzLnZpZXdlci5tYXAuYWRkQ29udHJvbChjb250cm9sKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2V0dXBCYXNlTGF5ZXJzID0gZnVuY3Rpb24oKXtcbiAgICBpZiAoIVByb2plY3RzUmVnaXN0cnkuc3RhdGUuYmFzZUxheWVycyl7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm1hcEJhc2VMYXllcnMgPSB7fTtcbiAgICBcbiAgICB2YXIgaW5pdEJhc2VMYXllciA9IFByb2plY3RTZXJ2aWNlLmNvbmZpZy5pbml0YmFzZWxheWVyO1xuICAgIHZhciBiYXNlTGF5ZXJzQXJyYXkgPSBQcm9qZWN0U2VydmljZS5zdGF0ZS5iYXNlTGF5ZXJzO1xuICAgIFxuICAgIF8uZm9yRWFjaChiYXNlTGF5ZXJzQXJyYXksZnVuY3Rpb24oYmFzZUxheWVyKXtcbiAgICAgIHZhciB2aXNpYmxlID0gdHJ1ZTtcbiAgICAgIGlmIChQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmluaXRiYXNlbGF5ZXIpIHtcbiAgICAgICAgdmlzaWJsZSA9IGJhc2VMYXllci5pZCA9PSAoUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC5pbml0YmFzZWxheWVyKTtcbiAgICAgIH1cbiAgICAgIGlmIChiYXNlTGF5ZXIuZml4ZWQpIHtcbiAgICAgICAgdmlzaWJsZSA9IGJhc2VMYXllci5maXhlZDtcbiAgICAgIH1cbiAgICAgIGJhc2VMYXllci52aXNpYmxlID0gdmlzaWJsZTtcbiAgICB9KVxuICAgIFxuICAgIGJhc2VMYXllcnNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKXsgICAgIFxuICAgICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgdXJsOiBQcm9qZWN0U2VydmljZS5nZXRXbXNVcmwoKSxcbiAgICAgICAgaWQ6IGxheWVyLmlkLFxuICAgICAgICB0aWxlZDogdHJ1ZVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgdmFyIG1hcExheWVyID0gbmV3IFdNU0xheWVyKGNvbmZpZyk7XG4gICAgICBzZWxmLnJlZ2lzdGVyTGlzdGVuZXJzKG1hcExheWVyKTtcbiAgICAgIFxuICAgICAgbWFwTGF5ZXIuYWRkTGF5ZXIobGF5ZXIpO1xuICAgICAgc2VsZi5tYXBCYXNlTGF5ZXJzW2xheWVyLmlkXSA9IG1hcExheWVyO1xuICAgIH0pO1xuICAgIFxuICAgIF8uZm9yRWFjaChfLnZhbHVlcyh0aGlzLm1hcEJhc2VMYXllcnMpLnJldmVyc2UoKSxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICBzZWxmLnZpZXdlci5tYXAuYWRkTGF5ZXIobWFwTGF5ZXIuZ2V0T0xMYXllcigpKTtcbiAgICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlKTtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5zZXR1cExheWVycyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy52aWV3ZXIucmVtb3ZlTGF5ZXJzKCk7XG4gICAgXG4gICAgdGhpcy5zZXR1cEJhc2VMYXllcnMoKTtcbiAgICBcbiAgICB0aGlzLm1hcExheWVycyA9IHt9O1xuICAgIHRoaXMubGF5ZXJzQXNzb2NpYXRpb24gPSB7fTtcbiAgICB2YXIgbGF5ZXJzQXJyYXkgPSB0aGlzLnRyYXZlcnNlTGF5ZXJzVHJlZShQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmxheWVyc3RyZWUpO1xuICAgIC8vIHByZW5kbyBzb2xvIGkgbGF5ZXIgdmVyaSBlIG5vbiBpIGZvbGRlclxuICAgIHZhciBsZWFmTGF5ZXJzQXJyYXkgPSBfLmZpbHRlcihsYXllcnNBcnJheSxmdW5jdGlvbihsYXllcil7XG4gICAgICByZXR1cm4gIV8uZ2V0KGxheWVyLCdub2RlcycpO1xuICAgIH0pO1xuICAgIHZhciBtdWx0aUxheWVycyA9IF8uZ3JvdXBCeShsZWFmTGF5ZXJzQXJyYXksZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgcmV0dXJuIGxheWVyLm11bHRpbGF5ZXI7XG4gICAgfSk7XG4gICAgXy5mb3JFYWNoKG11bHRpTGF5ZXJzLGZ1bmN0aW9uKGxheWVycyxpZCl7XG4gICAgICB2YXIgbGF5ZXJJZCA9ICdsYXllcl8nK2lkXG4gICAgICB2YXIgbWFwTGF5ZXIgPSBfLmdldChzZWxmLm1hcExheWVycyxsYXllcklkKTtcbiAgICAgIHZhciB0aWxlZCA9IGxheWVyc1swXS50aWxlZCAvLyBCUlVUVE8sIGRhIHNpc3RlbWFyZSBxdWFuZG8gcmlvcmdhbml6emVyZW1vIGkgbWV0YWxheWVyIChkYSBmYXIgZGl2ZW50YXJlIG11bHRpbGF5ZXIpLiBQZXIgb3JhIHBvc3NvIGNvbmZpZ3VyYXJlIHRpbGVkIHNvbG8gaSBsYXllciBzaW5nb2xpXG4gICAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICB1cmw6IFByb2plY3RTZXJ2aWNlLmdldFdtc1VybCgpLFxuICAgICAgICBpZDogbGF5ZXJJZCxcbiAgICAgICAgdGlsZWQ6IHRpbGVkXG4gICAgICB9O1xuICAgICAgbWFwTGF5ZXIgPSBzZWxmLm1hcExheWVyc1tsYXllcklkXSA9IG5ldyBXTVNMYXllcihjb25maWcsc2VsZi5sYXllcnNFeHRyYVBhcmFtcyk7XG4gICAgICBzZWxmLnJlZ2lzdGVyTGlzdGVuZXJzKG1hcExheWVyKTtcbiAgICAgIFxuICAgICAgbGF5ZXJzLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgICBtYXBMYXllci5hZGRMYXllcihsYXllcik7XG4gICAgICAgIHNlbGYubGF5ZXJzQXNzb2NpYXRpb25bbGF5ZXIuaWRdID0gbGF5ZXJJZDtcbiAgICAgIH0pO1xuICAgIH0pXG4gICAgXG4gICAgXy5mb3JFYWNoKF8udmFsdWVzKHRoaXMubWFwTGF5ZXJzKS5yZXZlcnNlKCksZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgICAgc2VsZi52aWV3ZXIubWFwLmFkZExheWVyKG1hcExheWVyLmdldE9MTGF5ZXIoKSk7XG4gICAgICBtYXBMYXllci51cGRhdGUoc2VsZi5zdGF0ZSxzZWxmLmxheWVyc0V4dHJhUGFyYW1zKTtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy51cGRhdGVNYXBMYXllcnMgPSBmdW5jdGlvbihtYXBMYXllcnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5mb3JFYWNoKF8udmFsdWVzKG1hcExheWVycyksZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgICAgbWFwTGF5ZXIudXBkYXRlKHNlbGYuc3RhdGUsc2VsZi5sYXllcnNFeHRyYVBhcmFtcyk7XG4gICAgfSlcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0TWFwTGF5ZXJGb3JMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICByZXR1cm4gdGhpcy5tYXBMYXllcnNbJ2xheWVyXycrbGF5ZXIubXVsdGlsYXllcl07XG4gIH07XG4gIFxuICB0aGlzLnRyYXZlcnNlTGF5ZXJzVHJlZSA9IGZ1bmN0aW9uKGxheWVyc1RyZWUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbGF5ZXJzQXJyYXkgPSBbXTtcbiAgICBmdW5jdGlvbiB0cmF2ZXJzZShvYmope1xuICAgICAgXy5mb3JJbihvYmosIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgIGlmICghXy5pc05pbCh2YWwuaWQpKSB7XG4gICAgICAgICAgICAgIGxheWVyc0FycmF5LnVuc2hpZnQodmFsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFfLmlzTmlsKHZhbC5ub2RlcykpIHtcbiAgICAgICAgICAgICAgdHJhdmVyc2UodmFsLm5vZGVzKTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgdHJhdmVyc2UobGF5ZXJzVHJlZSk7XG4gICAgcmV0dXJuIGxheWVyc0FycmF5O1xuICB9O1xuICBcbiAgdGhpcy5yZWdpc3Rlckxpc3RlbmVycyA9IGZ1bmN0aW9uKG1hcExheWVyKXtcbiAgICBtYXBMYXllci5vbignbG9hZHN0YXJ0JyxmdW5jdGlvbigpe1xuICAgICAgc2VsZi5faW5jcmVtZW50TG9hZGVycygpO1xuICAgIH0pO1xuICAgIG1hcExheWVyLm9uKCdsb2FkZW5kJyxmdW5jdGlvbigpe1xuICAgICAgc2VsZi5fZGVjcmVtZW50TG9hZGVycyhmYWxzZSk7XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy5vbignZXh0cmFQYXJhbXNTZXQnLGZ1bmN0aW9uKGV4dHJhUGFyYW1zLHVwZGF0ZSl7XG4gICAgICBpZiAodXBkYXRlKSB7XG4gICAgICAgIG1hcExheWVyLnVwZGF0ZSh0aGlzLnN0YXRlLGV4dHJhUGFyYW1zKTtcbiAgICAgIH1cbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5zaG93Vmlld2VyID0gZnVuY3Rpb24oZWxJZCl7XG4gICAgdGhpcy52aWV3ZXIuc2V0VGFyZ2V0KGVsSWQpO1xuICAgIHZhciBtYXAgPSB0aGlzLnZpZXdlci5tYXA7XG4gICAgR1VJLm9uKCdndWlyZWFkeScsZnVuY3Rpb24oKXtcbiAgICAgIHNlbGYuX3NldE1hcFZpZXcoKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIFxuICAvLyBwZXIgY3JlYXJlIHVuYSBwaWxhIGRpIG9sLmludGVyYWN0aW9uIGluIGN1aSBsJ3VsdGltbyBjaGUgc2kgYWdnaXVuZ2UgZGlzYXR0aXZhIHRlbXBvcmFlbWVudGUgaSBwcmVjZWRlbnRpIChwZXIgcG9pIHRvZ2xpZXJzaSBkaSBtZXp6byBjb24gcG9wSW50ZXJhY3Rpb24hKVxuICAvLyBVc2F0byBhZCBlcy4gZGEgcGlja2ZlYXR1cmV0b29sIGUgZ2V0ZmVhdHVyZWluZm9cbiAgdGhpcy5wdXNoSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihpbnRlcmFjdGlvbil7XG4gICAgaWYgKHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrLmxlbmd0aCl7XG4gICAgICB2YXIgcHJldkludGVyYWN0aW9uID0gdGhpcy5faW50ZXJhY3Rpb25zU3RhY2suc2xpY2UoLTEpWzBdO1xuICAgICAgaWYgKF8uaXNBcnJheShwcmV2SW50ZXJhY3Rpb24pKXtcbiAgICAgICAgXy5mb3JFYWNoKHByZXZJbnRlcmFjdGlvbixmdW5jdGlvbihpbnRlcmFjdGlvbil7XG4gICAgICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIHByZXZJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgdGhpcy52aWV3ZXIubWFwLmFkZEludGVyYWN0aW9uKGludGVyYWN0aW9uKTtcbiAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgdGhpcy5faW50ZXJhY3Rpb25zU3RhY2sucHVzaChpbnRlcmFjdGlvbilcbiAgfTtcbiAgXG4gIHRoaXMucG9wSW50ZXJhY3Rpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBpbnRlcmFjdGlvbiA9IHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrLnBvcCgpO1xuICAgIHRoaXMudmlld2VyLm1hcC5yZW1vdmVJbnRlcmFjdGlvbihpbnRlcmFjdGlvbik7XG4gICAgXG4gICAgaWYgKHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrLmxlbmd0aCl7XG4gICAgICB2YXIgcHJldkludGVyYWN0aW9uID0gdGhpcy5faW50ZXJhY3Rpb25zU3RhY2suc2xpY2UoLTEpWzBdO1xuICAgICAgaWYgKF8uaXNBcnJheShwcmV2SW50ZXJhY3Rpb24pKXtcbiAgICAgICAgXy5mb3JFYWNoKHByZXZJbnRlcmFjdGlvbixmdW5jdGlvbihpbnRlcmFjdGlvbil7XG4gICAgICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgcHJldkludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5nb1RvID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsem9vbSl7XG4gICAgdmFyIHpvb20gPSB6b29tIHx8IDY7XG4gICAgdGhpcy52aWV3ZXIuZ29Ubyhjb29yZGluYXRlcyx6b29tKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ29Ub1dHUzg0ID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsem9vbSl7XG4gICAgdmFyIGNvb3JkaW5hdGVzID0gb2wucHJvai50cmFuc2Zvcm0oY29vcmRpbmF0ZXMsJ0VQU0c6NDMyNicsJ0VQU0c6JytQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmNycyk7XG4gICAgdGhpcy5nb1RvKGNvb3JkaW5hdGVzLHpvb20pO1xuICB9O1xuICBcbiAgdGhpcy5leHRlbnRUb1dHUzg0ID0gZnVuY3Rpb24oZXh0ZW50KXtcbiAgICByZXR1cm4gb2wucHJvai50cmFuc2Zvcm1FeHRlbnQoZXh0ZW50LCdFUFNHOicrUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC5jcnMsJ0VQU0c6NDMyNicpO1xuICB9O1xuICBcbiAgdGhpcy5nZXRGZWF0dXJlSW5mbyA9IGZ1bmN0aW9uKGxheWVySWQpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdGhpcy5fcGlja0ludGVyYWN0aW9uID0gbmV3IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uKCk7XG4gICAgLy90aGlzLnZpZXdlci5tYXAuYWRkSW50ZXJhY3Rpb24odGhpcy5fcGlja0ludGVyYWN0aW9uKTtcbiAgICAvL3RoaXMuX3BpY2tJbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgdGhpcy5wdXNoSW50ZXJhY3Rpb24odGhpcy5fcGlja0ludGVyYWN0aW9uKTtcbiAgICB0aGlzLl9waWNrSW50ZXJhY3Rpb24ub24oJ3BpY2tlZCcsZnVuY3Rpb24oZSl7XG4gICAgICBzZWxmLl9jb21wbGV0ZUdldEZlYXR1cmVJbmZvKGxheWVySWQsZS5jb29yZGluYXRlLGRlZmVycmVkKTtcbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9jb21wbGV0ZUdldEZlYXR1cmVJbmZvID0gZnVuY3Rpb24obGF5ZXJJZCxjb29yZGluYXRlLGRlZmVycmVkKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHByb2plY3RUeXBlID0gUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC50eXBlO1xuICAgIFxuICAgIHZhciBtYXBMYXllciA9IHRoaXMubWFwTGF5ZXJzW3RoaXMubGF5ZXJzQXNzb2NpYXRpb25bbGF5ZXJJZF1dO1xuICAgIHZhciByZXNvbHV0aW9uID0gc2VsZi52aWV3ZXIuZ2V0UmVzb2x1dGlvbigpO1xuICAgIHZhciBlcHNnID0gc2VsZi52aWV3ZXIubWFwLmdldFZpZXcoKS5nZXRQcm9qZWN0aW9uKCkuZ2V0Q29kZSgpO1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBRVUVSWV9MQVlFUlM6IFByb2plY3RTZXJ2aWNlLmdldExheWVyKGxheWVySWQpLm5hbWUsXG4gICAgICBJTkZPX0ZPUk1BVDogXCJ0ZXh0L3htbFwiXG4gICAgfVxuICAgIFxuICAgIGlmIChwcm9qZWN0VHlwZSA9PSBQcm9qZWN0VHlwZXMuUURKQU5HTyl7XG4gICAgICB2YXIgdG9sZXJhbmNlUGFyYW1zID0gUGlja1RvbGVyYW5jZVBhcmFtc1twcm9qZWN0VHlwZV07XG4gICAgICBpZiAodG9sZXJhbmNlUGFyYW1zKXtcbiAgICAgICAgdmFyIGdlb21ldHJ5dHlwZSA9IFByb2plY3RTZXJ2aWNlLmdldExheWVyKGxheWVySWQpLmdlb21ldHJ5dHlwZTtcbiAgICAgICAgcGFyYW1zW3RvbGVyYW5jZVBhcmFtc1tnZW9tZXRyeXR5cGVdXSA9IFBpY2tUb2xlcmFuY2VWYWx1ZXNbZ2VvbWV0cnl0eXBlXTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdmFyIGdldEZlYXR1cmVJbmZvVXJsID0gbWFwTGF5ZXIuZ2V0U291cmNlKCkuZ2V0R2V0RmVhdHVyZUluZm9VcmwoY29vcmRpbmF0ZSxyZXNvbHV0aW9uLGVwc2cscGFyYW1zKTtcbiAgICAkLmdldChnZXRGZWF0dXJlSW5mb1VybClcbiAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgIHZhciB4MmpzID0gbmV3IFgySlMoKTtcbiAgICAgIHZhciBqc29uRGF0YSA9IHgyanMueG1sMmpzb24oZGF0YSk7XG4gICAgICBpZiAoanNvbkRhdGEuR2V0RmVhdHVyZUluZm9SZXNwb25zZS5MYXllci5GZWF0dXJlKXtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBqc29uRGF0YS5HZXRGZWF0dXJlSW5mb1Jlc3BvbnNlLkxheWVyLkZlYXR1cmUuQXR0cmlidXRlO1xuICAgICAgICB2YXIgYXR0cmlidXRlc09iaiA9IHt9O1xuICAgICAgICBfLmZvckVhY2goYXR0cmlidXRlcyxmdW5jdGlvbihhdHRyaWJ1dGUpe1xuICAgICAgICAgIGF0dHJpYnV0ZXNPYmpbYXR0cmlidXRlLl9uYW1lXSA9IGF0dHJpYnV0ZS5fdmFsdWU7IC8vIFgySlMgYWdnaXVuZ2UgXCJfXCIgY29tZSBwcmVmaXNzbyBkZWdsaSBhdHRyaWJ1dGlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoYXR0cmlidXRlc09iaik7XG4gICAgICB9XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTs7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfSlcbiAgICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgICAvL3NlbGYudmlld2VyLm1hcC5yZW1vdmVJbnRlcmFjdGlvbihzZWxmLl9waWNrSW50ZXJhY3Rpb24pO1xuICAgICAgc2VsZi5wb3BJbnRlcmFjdGlvbigpO1xuICAgICAgc2VsZi5fcGlja0ludGVyYWN0aW9uID0gbnVsbDtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5oaWdobGlnaHRHZW9tZXRyeSA9IGZ1bmN0aW9uKGdlb21ldHJ5T2JqLG9wdGlvbnMpeyAgICBcbiAgICB2YXIgZ2VvbWV0cnk7XG4gICAgaWYgKGdlb21ldHJ5T2JqIGluc3RhbmNlb2Ygb2wuZ2VvbS5HZW9tZXRyeSl7XG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5T2JqO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZvcm1hdCA9IG5ldyBvbC5mb3JtYXQuR2VvSlNPTjtcbiAgICAgIGdlb21ldHJ5ID0gZm9ybWF0LnJlYWRHZW9tZXRyeShnZW9tZXRyeU9iaik7XG4gICAgfVxuICAgIFxuICAgIGlmIChvcHRpb25zLnpvb20pIHtcbiAgICAgIHRoaXMudmlld2VyLmZpdChnZW9tZXRyeSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24gfHwgNDAwMDtcbiAgICBcbiAgICBpZiAob3B0aW9ucy5mcm9tV0dTODQpIHtcbiAgICAgIGdlb21ldHJ5LnRyYW5zZm9ybSgnRVBTRzo0MzI2JywnRVBTRzonK1Byb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuY3JzKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGZlYXR1cmUgPSBuZXcgb2wuRmVhdHVyZSh7XG4gICAgICBnZW9tZXRyeTogZ2VvbWV0cnlcbiAgICB9KTtcbiAgICB2YXIgc291cmNlID0gbmV3IG9sLnNvdXJjZS5WZWN0b3IoKTtcbiAgICBzb3VyY2UuYWRkRmVhdHVyZXMoW2ZlYXR1cmVdKTtcbiAgICB2YXIgbGF5ZXIgPSBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgc3R5bGU6IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgICB2YXIgc3R5bGVzID0gW107XG4gICAgICAgIHZhciBnZW9tZXRyeVR5cGUgPSBmZWF0dXJlLmdldEdlb21ldHJ5KCkuZ2V0VHlwZSgpO1xuICAgICAgICBpZiAoZ2VvbWV0cnlUeXBlID09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICAgIHZhciBzdHlsZSA9IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICAgICAgICBjb2xvcjogJ3JnYigyNTUsMjU1LDApJyxcbiAgICAgICAgICAgICAgd2lkdGg6IDRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgICBzdHlsZXMucHVzaChzdHlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZ2VvbWV0cnlUeXBlID09ICdQb2ludCcpe1xuICAgICAgICAgIHZhciBzdHlsZSA9IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgICAgICAgIHJhZGl1czogNixcbiAgICAgICAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgICAgICAgIGNvbG9yOiAncmdiKDI1NSwyNTUsMCknLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB6SW5kZXg6IEluZmluaXR5XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc3R5bGVzLnB1c2goc3R5bGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgICAgfVxuICAgIH0pXG4gICAgbGF5ZXIuc2V0TWFwKHRoaXMudmlld2VyLm1hcCk7XG4gICAgXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgbGF5ZXIuc2V0TWFwKG51bGwpO1xuICAgIH0sZHVyYXRpb24pO1xuICB9O1xuICBcbiAgdGhpcy5yZWZyZXNoTWFwID0gZnVuY3Rpb24oKXtcbiAgICBfLmZvckVhY2godGhpcy5tYXBMYXllcnMsZnVuY3Rpb24od21zTGF5ZXIpe1xuICAgICAgd21zTGF5ZXIuZ2V0TGF5ZXIoKS5nZXRTb3VyY2UoKS51cGRhdGVQYXJhbXMoe1widGltZVwiOiBEYXRlLm5vdygpfSk7XG4gICAgfSlcbiAgfTtcbiAgXG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLl9zZXRNYXBWaWV3ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgYmJveCA9IHRoaXMudmlld2VyLmdldEJCT1goKTtcbiAgICB2YXIgcmVzb2x1dGlvbiA9IHRoaXMudmlld2VyLmdldFJlc29sdXRpb24oKTtcbiAgICB2YXIgY2VudGVyID0gdGhpcy52aWV3ZXIuZ2V0Q2VudGVyKCk7XG4gICAgdGhpcy5zZXRNYXBWaWV3KGJib3gscmVzb2x1dGlvbixjZW50ZXIpO1xuICB9O1xufTtcblxuaW5oZXJpdChNYXBTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE1hcFNlcnZpY2VcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuZnVuY3Rpb24gUGx1Z2luKCl7XG4gIHRoaXMuaWQgPSBcInBsdWdpblwiO1xuICB0aGlzLnRvb2xzID0gW107XG59XG5pbmhlcml0KFBsdWdpbixHM1dPYmplY3QpO1xuXG52YXIgcHJvdG8gPSBQbHVnaW4ucHJvdG90eXBlO1xuXG5wcm90by5wcm92aWRlc1Rvb2xzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMudG9vbHMubGVuZ3RoID4gMDtcbn07XG5cbnByb3RvLmdldFRvb2xzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMudG9vbHM7XG59O1xuXG5wcm90by5nZXRBY3Rpb25zID0gZnVuY3Rpb24odG9vbCl7XG4gIHJldHVybiB0b29sLmFjdGlvbnM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsdWdpbjtcbiIsInZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbnZhciBUb29sc1NlcnZpY2UgPSByZXF1aXJlKCdjb3JlL3BsdWdpbi90b29sc3NlcnZpY2UnKTtcblxuZnVuY3Rpb24gUGx1Z2luc1JlZ2lzdHJ5KCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICAvLyB1biBkb21hbmkgcXVlc3RvIHNhcsOgIGRpbmFtaWNvXG4gIHRoaXMucGx1Z2lucyA9IHt9O1xuICB0aGlzLnN0YXRlID0ge1xuICAgIHRvb2xzcHJvdmlkZXJzOiBbXVxuICB9O1xuICBcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIHNldFRvb2xzUHJvdmlkZXI6IGZ1bmN0aW9uKHBsdWdpbikge1xuICAgICAgc2VsZi5zdGF0ZS50b29sc3Byb3ZpZGVycy5wdXNoKHBsdWdpbik7XG4gICAgfVxuICB9XG4gIFxuICBiYXNlKHRoaXMpO1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgXy5mb3JFYWNoKGNvbmZpZy5wbHVnaW5zLGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgICBzZWxmLl9zZXR1cChwbHVnaW4pO1xuICAgIH0pXG4gIH07XG4gIFxuICAvLyBQZXIgcGVybWV0dGVyZSBsYSByZWdpc3RyYXppb25lIGFuY2hlIGluIHVuIHNlY29uZG8gbW9tZW50b1xuICB0aGlzLnJlZ2lzdGVyID0gZnVuY3Rpb24ocGx1Z2luKXtcbiAgICBpZiAoIXRoaXMucGx1Z2luc1twbHVnaW4ubmFtZV0pIHtcbiAgICAgIHRoaXMuX3NldHVwKHBsdWdpbik7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fc2V0dXAgPSBmdW5jdGlvbihwbHVnaW4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHBsdWdpbkNvbmZpZyA9IHRoaXMuY29uZmlnLmNvbmZpZ3NbcGx1Z2luLm5hbWVdO1xuICAgIGlmIChwbHVnaW5Db25maWcpe1xuICAgICAgcGx1Z2luLmluaXQocGx1Z2luQ29uZmlnKTtcbiAgICAgIHNlbGYucGx1Z2luc1tuYW1lXSA9IHBsdWdpbjtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLmFjdGl2YXRlID0gZnVuY3Rpb24ocGx1Z2luKSB7XG4gICAgdmFyIHRvb2xzID0gcGx1Z2luLmdldFRvb2xzKCk7XG4gICAgaWYgKHRvb2xzLmxlbmd0aCkge1xuICAgICAgVG9vbHNTZXJ2aWNlLnJlZ2lzdGVyVG9vbHNQcm92aWRlcihwbHVnaW4pO1xuICAgIH1cbiAgfTtcbn07XG5cbmluaGVyaXQoUGx1Z2luc1JlZ2lzdHJ5LEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFBsdWdpbnNSZWdpc3RyeVxuIiwidmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuZnVuY3Rpb24gUGx1Z2luc1NlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIC8vIHVuIGRvbWFuaSBxdWVzdG8gc2Fyw6AgZGluYW1pY29cbiAgdGhpcy5wbHVnaW5zID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgdG9vbHNwcm92aWRlcnM6IFtdXG4gIH07XG4gIFxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0VG9vbHNQcm92aWRlcjogZnVuY3Rpb24ocGx1Z2luKSB7XG4gICAgICBzZWxmLnN0YXRlLnRvb2xzcHJvdmlkZXJzLnB1c2gocGx1Z2luKTtcbiAgICB9XG4gIH1cbiAgXG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICBfLmZvckVhY2goY29uZmlnLnBsdWdpbnMsZnVuY3Rpb24ocGx1Z2luKXtcbiAgICAgIHNlbGYuX3NldHVwKHBsdWdpbik7XG4gICAgfSlcbiAgICB0aGlzLmVtaXQoXCJpbml0ZW5kXCIpO1xuICB9O1xuICBcbiAgLy8gUGVyIHBlcm1ldHRlcmUgbGEgcmVnaXN0cmF6aW9uZSBhbmNoZSBpbiB1biBzZWNvbmRvIG1vbWVudG9cbiAgdGhpcy5yZWdpc3RlciA9IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgaWYgKCF0aGlzLnBsdWdpbnNbcGx1Z2luLm5hbWVdKSB7XG4gICAgICB0aGlzLl9zZXR1cChwbHVnaW4pO1xuICAgIH1cbiAgfVxuICBcbiAgdGhpcy5fc2V0dXAgPSBmdW5jdGlvbihwbHVnaW4pe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcGx1Z2luQ29uZmlnID0gdGhpcy5jb25maWcuY29uZmlnc1twbHVnaW4ubmFtZV07XG4gICAgaWYgKHBsdWdpbkNvbmZpZyl7XG4gICAgICBwbHVnaW4uaW5pdChwbHVnaW5Db25maWcpXG4gICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICBzZWxmLnBsdWdpbnNbbmFtZV0gPSBwbHVnaW47XG4gICAgICAgIGlmIChwbHVnaW4ucHJvdmlkZXNUb29scygpKXtcbiAgICAgICAgICBzZWxmLnNldFRvb2xzUHJvdmlkZXIocGx1Z2luKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn07XG5cbmluaGVyaXQoUGx1Z2luc1NlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGx1Z2luc1NlcnZpY2VcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuZnVuY3Rpb24gVG9vbHNTZXJ2aWNlKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLl9hY3Rpb25zID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgdG9vbHM6IFtdXG4gIH07XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuc2V0U3RhdGUoKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2V0U3RhdGUgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX21lcmdlVG9vbHModGhpcy5jb25maWcudG9vbHMpO1xuICB9O1xuICBcbiAgdGhpcy5yZWdpc3RlclRvb2xzUHJvdmlkZXIgPSBmdW5jdGlvbihwbHVnaW4pe1xuICAgIHNlbGYuX21lcmdlVG9vbHMocGx1Z2luLmdldFRvb2xzKCkpO1xuICAgIHNlbGYuX2FkZEFjdGlvbnMocGx1Z2luKTtcbiAgfVxuICBcbiAgdGhpcy5maXJlQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uaWQpe1xuICAgIHZhciBwbHVnaW4gPSB0aGlzLl9hY3Rpb25zW2FjdGlvbmlkXTtcbiAgICB2YXIgbWV0aG9kID0gdGhpcy5fYWN0aW9uTWV0aG9kKGFjdGlvbmlkKTtcbiAgICBwbHVnaW5bbWV0aG9kXSgpO1xuICB9O1xuICBcbiAgdGhpcy5fYWN0aW9uTWV0aG9kID0gZnVuY3Rpb24oYWN0aW9uaWQpe1xuICAgIHZhciBuYW1lc3BhY2UgPSBhY3Rpb25pZC5zcGxpdChcIjpcIik7XG4gICAgcmV0dXJuIG5hbWVzcGFjZS5wb3AoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX21lcmdlVG9vbHMgPSBmdW5jdGlvbih0b29scyl7XG4gICAgc2VsZi5zdGF0ZS50b29scyA9IF8uY29uY2F0KHNlbGYuc3RhdGUudG9vbHMsdG9vbHMpO1xuICB9O1xuICBcbiAgdGhpcy5fYWRkQWN0aW9ucyA9IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgXy5mb3JFYWNoKHBsdWdpbi5nZXRUb29scygpLGZ1bmN0aW9uKHRvb2wpe1xuICAgICAgXy5mb3JFYWNoKHBsdWdpbi5nZXRBY3Rpb25zKHRvb2wpLGZ1bmN0aW9uKGFjdGlvbil7XG4gICAgICAgIHNlbGYuX2FjdGlvbnNbYWN0aW9uLmlkXSA9IHBsdWdpbjtcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcbn07XG5cbi8vIE1ha2UgdGhlIHB1YmxpYyBzZXJ2aWNlIGVuIEV2ZW50IEVtaXR0ZXJcbmluaGVyaXQoVG9vbHNTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFRvb2xzU2VydmljZVxuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy8vdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgTGF5ZXJTdGF0ZSA9IHJlcXVpcmUoJ2NvcmUvbGF5ZXIvbGF5ZXJzdGF0ZS5qcycpO1xuXG52YXIgUHJvamVjdFR5cGVzID0ge1xuICBRREpBTkdPOiAncWRqYW5nbycsXG4gIE9HUjogJ29ncidcbn07XG5cbmZ1bmN0aW9uIFByb2plY3RTZXJ2aWNlKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLmxheWVycyA9IHt9O1xuICB0aGlzLnN0YXRlID0ge1xuICAgIHByb2plY3Q6IG51bGwsXG4gICAgYmFzZUxheWVyczogW11cbiAgfTtcbiAgXG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBzZXRMYXllcnNWaXNpYmxlOiBmdW5jdGlvbihsYXllcnMsdmlzaWJsZSl7XG4gICAgICBfLmZvckVhY2gobGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgICAgc2VsZi5sYXllcnNbbGF5ZXIuaWRdLnZpc2libGUgPSB2aXNpYmxlO1xuICAgICAgfSlcbiAgICB9LFxuICAgIHNldEJhc2VMYXllcjogZnVuY3Rpb24oaWQpe1xuICAgICAgXy5mb3JFYWNoKHNlbGYuc3RhdGUuYmFzZUxheWVycyxmdW5jdGlvbihiYXNlTGF5ZXIpe1xuICAgICAgICBiYXNlTGF5ZXIudmlzaWJsZSA9IChiYXNlTGF5ZXIuaWQgPT0gaWQpO1xuICAgICAgfSlcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICB9O1xuICBcbiAgLy8gZ2VuZXJhIGwnb2dnZXR0byBsYXllcnMgKHBlciByaWZlcmltZW50byksIHBlciBzZW1wbGlmaWNhcmUgZ2xpIGFnZ2lvcm5hbWVudGkgZGVsbG8gc3RhdG8gZGVsIGxheWVyc3RyZWVcbiAgdGhpcy5tYWtlTGF5ZXJzT2JqID0gZnVuY3Rpb24obGF5ZXJzdHJlZSl7XG4gICAgdGhpcy5sYXllcnMgPSB7fTtcbiAgICBmdW5jdGlvbiB0cmF2ZXJzZShvYmope1xuICAgICAgXy5mb3JJbihvYmosIGZ1bmN0aW9uIChsYXllciwga2V5KSB7XG4gICAgICAgICAgICAvL3ZlcmlmaWNhIGNoZSBpbCB2YWxvcmUgZGVsbCdpZCBub24gc2lhIG51bGxvXG4gICAgICAgICAgICBpZiAoIV8uaXNOaWwobGF5ZXIuaWQpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5sYXllcnNbbGF5ZXIuaWRdID0gbGF5ZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uaXNOaWwobGF5ZXIubm9kZXMpKSB7XG4gICAgICAgICAgICAgICAgdHJhdmVyc2UobGF5ZXIubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgdHJhdmVyc2UobGF5ZXJzdHJlZSk7XG4gIH07XG4gIFxuICB0aGlzLmdldEN1cnJlbnRQcm9qZWN0ID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5wcm9qZWN0O1xuICB9O1xuICBcbiAgdGhpcy5zZXRQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCxkb3N3aXRjaCl7XG4gICAgLyogc3RydXR0dXJhIG9nZ2V0dG8gJ3Byb2plY3QnXG4gICAge1xuICAgICAgaWQsXG4gICAgICB0eXBlLFxuICAgICAgZ2lkLFxuICAgICAgbmFtZSxcbiAgICAgIGNycyxcbiAgICAgIGV4dGVudCxcbiAgICAgIGxheWVyc3RyZWUsXG4gICAgICB3aWRnZXRzXG4gICAgfVxuICAgICovXG4gICAgdGhpcy5zdGF0ZS5wcm9qZWN0ID0gcHJvamVjdDtcbiAgICB0aGlzLnN0YXRlLmJhc2VMYXllcnMgPSBwcm9qZWN0LmJhc2VMYXllcnM7XG4gICAgdGhpcy5tYWtlTGF5ZXJzT2JqKHByb2plY3QubGF5ZXJzdHJlZSk7XG4gICAgdmFyIGV2ZW50VHlwZSA9ICdwcm9qZWN0c2V0JztcbiAgICBpZiAoZG9zd2l0Y2ggJiYgZG9zd2l0Y2ggPT09IHRydWUpIHtcbiAgICAgIGV2ZW50VHlwZSA9ICdwcm9qZWN0c3dpdGNoJztcbiAgICB9XG4gICAgdGhpcy5lbWl0KGV2ZW50VHlwZSk7XG4gIH07XG4gIFxuICB0aGlzLnN3aXRjaFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgdGhpcy5zZXRQcm9qZWN0KHByb2plY3QsdHJ1ZSk7XG4gIH07XG4gIFxuICB0aGlzLmdldExheWVyID0gZnVuY3Rpb24oaWQpe1xuICAgIHJldHVybiB0aGlzLmxheWVyc1tpZF07XG4gIH07XG4gIFxuICB0aGlzLmdldExheWVycyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMubGF5ZXJzO1xuICB9O1xuICBcbiAgdGhpcy5nZXRMYXllckJ5SWQgPSBmdW5jdGlvbihpZCkge1xuICAgIHZhciBsYXllciA9IG51bGw7XG4gICAgXy5mb3JFYWNoKHRoaXMuZ2V0TGF5ZXJzKCksZnVuY3Rpb24oX2xheWVyKXtcbiAgICAgIGlmIChfbGF5ZXIuaWQgPT0gaWQpe1xuICAgICAgICBsYXllciA9IF9sYXllcjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbGF5ZXI7XG4gIH07XG4gIFxuICB0aGlzLmdldExheWVyQnlOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBsYXllciA9IG51bGw7XG4gICAgXy5mb3JFYWNoKHRoaXMuZ2V0TGF5ZXJzKCksZnVuY3Rpb24oX2xheWVyKXtcbiAgICAgIGlmIChfbGF5ZXIubmFtZSA9PSBuYW1lKXtcbiAgICAgICAgbGF5ZXIgPSBfbGF5ZXI7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGxheWVyO1xuICB9O1xuICBcbiAgdGhpcy5nZXRRdWVyeWFibGVMYXllcnMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBxdWVyeWFibGVMYXllcnMgPSBbXTtcbiAgICBfLmZvckVhY2godGhpcy5nZXRMYXllcnMoKSxmdW5jdGlvbihsYXllcil7XG4gICAgICBpZiAoTGF5ZXJTdGF0ZS5pc1F1ZXJ5YWJsZShsYXllcikpe1xuICAgICAgICBxdWVyeWFibGVMYXllcnMucHVzaChsYXllcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHF1ZXJ5YWJsZUxheWVycztcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0TGF5ZXJBdHRyaWJ1dGVzID0gZnVuY3Rpb24oaWQpe1xuICAgIHJldHVybiB0aGlzLmxheWVyc1tpZF0uYXR0cmlidXRlcztcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0TGF5ZXJBdHRyaWJ1dGVMYWJlbCA9IGZ1bmN0aW9uKGlkLG5hbWUpe1xuICAgIHZhciBsYWJlbCA9ICcnO1xuICAgIF8uZm9yRWFjaCh0aGlzLmxheWVyc1tpZF0uYXR0cmlidXRlcyxmdW5jdGlvbihhdHRyaWJ1dGUpe1xuICAgICAgaWYgKGF0dHJpYnV0ZS5uYW1lID09IG5hbWUpe1xuICAgICAgICBsYWJlbCA9IGF0dHJpYnV0ZS5sYWJlbDtcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBsYWJlbDtcbiAgfTtcbiAgXG4gIHRoaXMudG9nZ2xlTGF5ZXIgPSBmdW5jdGlvbihsYXllcix2aXNpYmxlKXtcbiAgICB2YXIgdmlzaWJsZSA9IHZpc2libGUgfHwgIWxheWVyLnZpc2libGU7XG4gICAgc2VsZi5zZXRMYXllcnNWaXNpYmxlKFtsYXllcl0sdmlzaWJsZSk7XG4gIH07XG4gIFxuICB0aGlzLnRvZ2dsZUxheWVycyA9IGZ1bmN0aW9uKGxheWVycyx2aXNpYmxlKXtcbiAgICBzZWxmLnNldExheWVyc1Zpc2libGUobGF5ZXJzLHZpc2libGUpO1xuICB9O1xuICBcbiAgdGhpcy5nZXRXbXNVcmwgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXRXbXNVcmwodGhpcy5zdGF0ZS5wcm9qZWN0KTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0TGVnZW5kVXJsID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIHZhciB1cmwgPSB0aGlzLmdldFdtc1VybCh0aGlzLnN0YXRlKTtcbiAgICBzZXAgPSAodXJsLmluZGV4T2YoJz8nKSA+IC0xKSA/ICcmJyA6ICc/JztcbiAgICByZXR1cm4gdGhpcy5nZXRXbXNVcmwodGhpcy5zdGF0ZSkrc2VwKydTRVJWSUNFPVdNUyZWRVJTSU9OPTEuMy4wJlJFUVVFU1Q9R2V0TGVnZW5kR3JhcGhpYyZTTERfVkVSU0lPTj0xLjEuMCZGT1JNQVQ9aW1hZ2UvcG5nJlRSQU5TUEFSRU5UPXRydWUmSVRFTUZPTlRDT0xPUj13aGl0ZSZMQVlFUlRJVExFPUZhbHNlJklURU1GT05UU0laRT0xMCZMQVlFUj0nK2xheWVyLm5hbWU7XG4gIH07XG4gIFxuICBiYXNlKHRoaXMpO1xufTtcblxuaW5oZXJpdChQcm9qZWN0U2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgUHJvamVjdFNlcnZpY2U6IG5ldyBQcm9qZWN0U2VydmljZSxcbiAgUHJvamVjdFR5cGVzOiBQcm9qZWN0VHlwZXNcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciByZXNvbHZlZFZhbHVlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmVkVmFsdWU7XG52YXIgcmVqZWN0ZWRWYWx1ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3RlZFZhbHVlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgUHJvamVjdFNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNlcnZpY2UnKS5Qcm9qZWN0U2VydmljZTtcblxuLyogc2VydmljZVxuRnVuemlvbmUgY29zdHJ1dHRvcmUgY29udGVudGVudGUgdHJlIHByb3ByaWV0YSc6XG4gICAgc2V0dXA6IG1ldG9kbyBkaSBpbml6aWFsaXp6YXppb25lXG4gICAgZ2V0TGF5ZXJzU3RhdGU6IHJpdG9ybmEgbCdvZ2dldHRvIExheWVyc1N0YXRlXG4gICAgZ2V0TGF5ZXJzVHJlZTogcml0b3JuYSBsJ2FycmF5IGxheWVyc1RyZWUgZGFsbCdvZ2dldHRvIExheWVyc1N0YXRlXG4qL1xuXG4vLyBQdWJsaWMgaW50ZXJmYWNlXG5mdW5jdGlvbiBQcm9qZWN0c1JlZ2lzdHJ5KCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLmluaXRpYWxpemVkID0gZmFsc2U7XG4gIFxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0Q3VycmVudFByb2plY3Q6IGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50UHJvamVjdCA9IHByb2plY3Q7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBiYXNlTGF5ZXJzOiB7fSxcbiAgICBtaW5TY2FsZTogbnVsbCxcbiAgICBtYXhzY2FsZTogbnVsbCxcbiAgICBwcm9qZWN0czogW10sXG4gICAgY3VycmVudFByb2plY3Q6IG51bGxcbiAgfVxuICBcbiAgYmFzZSh0aGlzKTtcbn1cbmluaGVyaXQoUHJvamVjdHNSZWdpc3RyeSxHM1dPYmplY3QpO1xuXG52YXIgcHJvdG8gPSBQcm9qZWN0c1JlZ2lzdHJ5LnByb3RvdHlwZTtcblxucHJvdG8uaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gIGlmICghdGhpcy5pbml0aWFsaXplZCl7XG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5zZXR1cFN0YXRlKCk7XG4gICAgUHJvamVjdFNlcnZpY2UuaW5pdChjb25maWcpO1xuICAgIHJldHVybiB0aGlzLnNldFByb2plY3QoY29uZmlnLmluaXRwcm9qZWN0KTtcbiAgfVxufTtcbiAgXG5wcm90by5zZXR1cFN0YXRlID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgc2VsZi5zdGF0ZS5iYXNlTGF5ZXJzID0gc2VsZi5jb25maWcuYmFzZWxheWVycztcbiAgc2VsZi5zdGF0ZS5taW5TY2FsZSA9IHNlbGYuY29uZmlnLm1pbnNjYWxlO1xuICBzZWxmLnN0YXRlLm1heFNjYWxlID0gc2VsZi5jb25maWcubWF4c2NhbGU7XG4gIHNlbGYuc3RhdGUuY3JzID0gc2VsZi5jb25maWcuY3JzO1xuICBzZWxmLnN0YXRlLnByb2o0ID0gc2VsZi5jb25maWcucHJvajQ7XG4gIHNlbGYuY29uZmlnLnByb2plY3RzLmZvckVhY2goZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgcHJvamVjdC5iYXNlTGF5ZXJzID0gc2VsZi5jb25maWcuYmFzZWxheWVycztcbiAgICBwcm9qZWN0Lm1pblNjYWxlID0gc2VsZi5jb25maWcubWluc2NhbGU7XG4gICAgcHJvamVjdC5tYXhTY2FsZSA9IHNlbGYuY29uZmlnLm1heHNjYWxlO1xuICAgIHByb2plY3QuY3JzID0gc2VsZi5jb25maWcuY3JzO1xuICAgIHByb2plY3QucHJvajQgPSBzZWxmLmNvbmZpZy5wcm9qNDtcbiAgICBzZWxmLnN0YXRlLnByb2plY3RzLnB1c2gocHJvamVjdCk7XG4gIH0pXG4gIC8vdGhpcy5zdGF0ZS5wcm9qZWN0cyA9IGNvbmZpZy5ncm91cC5wcm9qZWN0cztcbn07XG5cbnByb3RvLmdldEN1cnJlbnRQcm9qZWN0ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuc3RhdGUuY3VycmVudFByb2plY3Q7XG59O1xuICBcbnByb3RvLnNldFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0R2lkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gdGhpcy5nZXRQcm9qZWN0KHByb2plY3RHaWQpLlxuICB0aGVuKGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgIFByb2plY3RTZXJ2aWNlLnNldFByb2plY3QocHJvamVjdCk7XG4gICAgc2VsZi5zZXRDdXJyZW50UHJvamVjdChwcm9qZWN0KTtcbiAgfSlcbn07XG4gIFxucHJvdG8uc3dpdGNoUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3RHaWQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gdGhpcy5nZXRQcm9qZWN0KHByb2plY3RHaWQpLlxuICB0aGVuKGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgIFByb2plY3RTZXJ2aWNlLnN3aXRjaFByb2plY3QocHJvamVjdCk7XG4gICAgc2VsZi5zZXRDdXJyZW50UHJvamVjdChwcm9qZWN0KTtcbiAgfSlcbn07XG4gIFxucHJvdG8uYnVpbGRQcm9qZWN0VHJlZSA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuICB2YXIgbGF5ZXJzID0gXy5rZXlCeShwcm9qZWN0LmxheWVycywnaWQnKTtcbiAgdmFyIGxheWVyc1RyZWUgPSBfLmNsb25lRGVlcChwcm9qZWN0LmxheWVyc3RyZWUpO1xuICBcbiAgZnVuY3Rpb24gdHJhdmVyc2Uob2JqKXtcbiAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKGxheWVyLCBrZXkpIHtcbiAgICAgICAgLy92ZXJpZmljYSBjaGUgaWwgbm9kbyBzaWEgdW4gbGF5ZXIgZSBub24gdW4gZm9sZGVyXG4gICAgICAgIGlmICghXy5pc05pbChsYXllci5pZCkpIHtcbiAgICAgICAgICAgIHZhciBmdWxsbGF5ZXIgPSBfLm1lcmdlKGxheWVyLGxheWVyc1tsYXllci5pZF0pO1xuICAgICAgICAgICAgb2JqW3BhcnNlSW50KGtleSldID0gZnVsbGxheWVyO1xuICAgICAgICAgICAgdmFyIGEgPTE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFfLmlzTmlsKGxheWVyLm5vZGVzKSl7XG4gICAgICAgICAgLy8gYWdnaXVuZ28gcHJvcHJpZXTDoCB0aXRsZSBwZXIgbCdhbGJlcm9cbiAgICAgICAgICBsYXllci50aXRsZSA9IGxheWVyLm5hbWU7XG4gICAgICAgICAgdHJhdmVyc2UobGF5ZXIubm9kZXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuICB0cmF2ZXJzZShsYXllcnNUcmVlKTtcbiAgcHJvamVjdC5sYXllcnN0cmVlID0gbGF5ZXJzVHJlZTtcbn07XG5cbnByb3RvLmdldFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0R2lkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZCA9ICQuRGVmZXJyZWQoKTtcbiAgdmFyIHByb2plY3QgPSBudWxsO1xuICB0aGlzLnN0YXRlLnByb2plY3RzLmZvckVhY2goZnVuY3Rpb24oX3Byb2plY3Qpe1xuICAgIGlmIChfcHJvamVjdC5naWQgPT0gcHJvamVjdEdpZCkge1xuICAgICAgcHJvamVjdCA9IF9wcm9qZWN0O1xuICAgIH1cbiAgfSlcbiAgaWYgKCFwcm9qZWN0KSB7XG4gICAgcmV0dXJuIHJlamVjdGVkVmFsdWUoXCJQcm9qZWN0IGRvZXNuJ3QgZXhpc3RcIik7XG4gIH1cblxuICB2YXIgaXNGdWxsRmlsbGVkID0gIV8uaXNOaWwocHJvamVjdC5sYXllcnMpO1xuICBpZiAoaXNGdWxsRmlsbGVkKXtcbiAgICByZXR1cm4gZC5yZXNvbHZlKHByb2plY3QpO1xuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UHJvamVjdEZ1bGxDb25maWcocHJvamVjdClcbiAgICAudGhlbihmdW5jdGlvbihwcm9qZWN0RnVsbENvbmZpZyl7XG4gICAgICBwcm9qZWN0ID0gXy5tZXJnZShwcm9qZWN0LHByb2plY3RGdWxsQ29uZmlnKTtcbiAgICAgIHNlbGYuYnVpbGRQcm9qZWN0VHJlZShwcm9qZWN0KTtcbiAgICAgIHJldHVybiBkLnJlc29sdmUocHJvamVjdCk7XG4gICAgfSk7XG4gIH1cbiAgXG4gIHJldHVybiBkLnByb21pc2UoKTtcbn07XG4gIFxuICAvL3JpdG9ybmEgdW5hIHByb21pc2VzXG5wcm90by5nZXRQcm9qZWN0RnVsbENvbmZpZyA9IGZ1bmN0aW9uKHByb2plY3RCYXNlQ29uZmlnKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gIHZhciB1cmwgPSB0aGlzLmNvbmZpZy5nZXRQcm9qZWN0Q29uZmlnVXJsKHByb2plY3RCYXNlQ29uZmlnKTtcbiAgJC5nZXQodXJsKS5kb25lKGZ1bmN0aW9uKHByb2plY3RGdWxsQ29uZmlnKXtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUocHJvamVjdEZ1bGxDb25maWcpO1xuICB9KVxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUHJvamVjdHNSZWdpc3RyeSgpO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgQmFzZTY0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLkJhc2U2NDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG52YXIgUm91dGVyU2VydmljZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fcm91dGUgPSAnJztcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIHNldFJvdXRlOiBmdW5jdGlvbihwYXRoKXtcbiAgICAgIHRoaXMuX3JvdXRlID0gcGF0aDtcbiAgICB9XG4gIH1cbiAgXG4gIEhpc3RvcnkuQWRhcHRlci5iaW5kKHdpbmRvdywnc3RhdGVjaGFuZ2UnLGZ1bmN0aW9uKCl7IC8vIE5vdGU6IFdlIGFyZSB1c2luZyBzdGF0ZWNoYW5nZSBpbnN0ZWFkIG9mIHBvcHN0YXRlXG4gICAgICB2YXIgc3RhdGUgPSBIaXN0b3J5LmdldFN0YXRlKCk7IC8vIE5vdGU6IFdlIGFyZSB1c2luZyBIaXN0b3J5LmdldFN0YXRlKCkgaW5zdGVhZCBvZiBldmVudC5zdGF0ZVxuICAgICAgdmFyIGhhc2ggPSBzdGF0ZS5oYXNoO1xuICAgICAgc2VsZi5zZXRSb3V0ZUZyb21IYXNoKGhhc2gpO1xuICB9KTtcbiAgXG4gIGJhc2UodGhpcyk7XG59O1xuaW5oZXJpdChSb3V0ZXJTZXJ2aWNlLEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IFJvdXRlclNlcnZpY2UucHJvdG90eXBlO1xuXG5wcm90by5pbml0Um91dGUgPSBmdW5jdGlvbigpe1xuICB2YXIgZmlyc3RIYXNoID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaDtcbiAgdGhpcy5zZXRSb3V0ZUZyb21IYXNoKGZpcnN0SGFzaCk7XG59XG5cbnByb3RvLmdvdG8gPSBmdW5jdGlvbihwYXRoKXtcbiAgdmFyIHBhdGhiNjQgPSBCYXNlNjQuZW5jb2RlKHBhdGgpO1xuICBIaXN0b3J5LnB1c2hTdGF0ZSh7cGF0aDpwYXRofSxudWxsLCc/cD0nK3BhdGhiNjQpO1xuICAvL3RoaXMuc2V0Um91dGUocGF0aCk7XG59O1xuXG5wcm90by5zZXRSb3V0ZUZyb21IYXNoID0gZnVuY3Rpb24oaGFzaCkge1xuICB2YXIgcGF0aGI2NCA9IHRoaXMuZ2V0UXVlcnlQYXJhbXMoaGFzaClbJ3AnXTtcbiAgdmFyIHBhdGggPSBwYXRoYjY0ID8gQmFzZTY0LmRlY29kZShwYXRoYjY0KSA6ICcnO1xuICB0aGlzLnNldFJvdXRlKHBhdGgpO1xufVxuXG5wcm90by5zbGljZVBhdGggPSBmdW5jdGlvbihwYXRoKXtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJz8nKVswXS5zcGxpdCgnLycpO1xufTtcbiAgXG5wcm90by5zbGljZUZpcnN0ID0gZnVuY3Rpb24ocGF0aCl7XG4gIHZhciBwYXRoQW5kUXVlcnkgPSBwYXRoLnNwbGl0KCc/Jyk7XG4gIHZhciBxdWVyeVN0cmluZyA9IHBhdGhBbmRRdWVyeVsxXTtcbiAgdmFyIHBhdGhBcnIgPSBwYXRoQW5kUXVlcnlbMF0uc3BsaXQoJy8nKVxuICB2YXIgZmlyc3RQYXRoID0gcGF0aEFyclswXTtcbiAgcGF0aCA9IHBhdGhBcnIuc2xpY2UoMSkuam9pbignLycpO1xuICBwYXRoID0gW3BhdGgscXVlcnlTdHJpbmddLmpvaW4oJz8nKVxuICByZXR1cm4gW2ZpcnN0UGF0aCxwYXRoXTtcbn07XG4gIFxucHJvdG8uZ2V0UXVlcnlQYXJhbXMgPSBmdW5jdGlvbihwYXRoKXtcbiAgdmFyIHF1ZXJ5UGFyYW1zID0ge307XG4gIHRyeSB7XG4gICAgdmFyIHF1ZXJ5U3RyaW5nID0gcGF0aC5zcGxpdCgnPycpWzFdO1xuICAgIHZhciBxdWVyeVBhaXJzID0gcXVlcnlTdHJpbmcuc3BsaXQoJyYnKTtcbiAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcbiAgICBfLmZvckVhY2gocXVlcnlQYWlycyxmdW5jdGlvbihxdWVyeVBhaXIpe1xuICAgICAgdmFyIHBhaXIgPSBxdWVyeVBhaXIuc3BsaXQoJz0nKTtcbiAgICAgIHZhciBrZXkgPSBwYWlyWzBdO1xuICAgICAgdmFyIHZhbHVlID0gcGFpclsxXTtcbiAgICAgIHF1ZXJ5UGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgfVxuICBjYXRjaCAoZSkge31cbiAgcmV0dXJuIHF1ZXJ5UGFyYW1zO1xufTtcblxucHJvdG8uZ2V0UXVlcnlTdHJpbmcgPSBmdW5jdGlvbihwYXRoKXtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJz8nKVsxXTtcbn07XG4gIFxucHJvdG8ubWFrZVF1ZXJ5U3RyaW5nID0gZnVuY3Rpb24ocXVlcnlQYXJhbXMpe307XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFJvdXRlclNlcnZpY2U7XG4iLCJcbi8qKlxuICogRGVjaW1hbCBhZGp1c3RtZW50IG9mIGEgbnVtYmVyLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSAgdHlwZSAgVGhlIHR5cGUgb2YgYWRqdXN0bWVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSAgdmFsdWUgVGhlIG51bWJlci5cbiAqIEBwYXJhbSB7SW50ZWdlcn0gZXhwICAgVGhlIGV4cG9uZW50ICh0aGUgMTAgbG9nYXJpdGhtIG9mIHRoZSBhZGp1c3RtZW50IGJhc2UpLlxuICogQHJldHVybnMge051bWJlcn0gVGhlIGFkanVzdGVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBkZWNpbWFsQWRqdXN0KHR5cGUsIHZhbHVlLCBleHApIHtcbiAgLy8gSWYgdGhlIGV4cCBpcyB1bmRlZmluZWQgb3IgemVyby4uLlxuICBpZiAodHlwZW9mIGV4cCA9PT0gJ3VuZGVmaW5lZCcgfHwgK2V4cCA9PT0gMCkge1xuICAgIHJldHVybiBNYXRoW3R5cGVdKHZhbHVlKTtcbiAgfVxuICB2YWx1ZSA9ICt2YWx1ZTtcbiAgZXhwID0gK2V4cDtcbiAgLy8gSWYgdGhlIHZhbHVlIGlzIG5vdCBhIG51bWJlciBvciB0aGUgZXhwIGlzIG5vdCBhbiBpbnRlZ2VyLi4uXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgISh0eXBlb2YgZXhwID09PSAnbnVtYmVyJyAmJiBleHAgJSAxID09PSAwKSkge1xuICAgIHJldHVybiBOYU47XG4gIH1cbiAgLy8gU2hpZnRcbiAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnNwbGl0KCdlJyk7XG4gIHZhbHVlID0gTWF0aFt0eXBlXSgrKHZhbHVlWzBdICsgJ2UnICsgKHZhbHVlWzFdID8gKCt2YWx1ZVsxXSAtIGV4cCkgOiAtZXhwKSkpO1xuICAvLyBTaGlmdCBiYWNrXG4gIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKS5zcGxpdCgnZScpO1xuICByZXR1cm4gKyh2YWx1ZVswXSArICdlJyArICh2YWx1ZVsxXSA/ICgrdmFsdWVbMV0gKyBleHApIDogZXhwKSk7XG59XG5cbi8vIERlY2ltYWwgcm91bmRcbmlmICghTWF0aC5yb3VuZDEwKSB7XG4gIE1hdGgucm91bmQxMCA9IGZ1bmN0aW9uKHZhbHVlLCBleHApIHtcbiAgICByZXR1cm4gZGVjaW1hbEFkanVzdCgncm91bmQnLCB2YWx1ZSwgZXhwKTtcbiAgfTtcbn1cbi8vIERlY2ltYWwgZmxvb3JcbmlmICghTWF0aC5mbG9vcjEwKSB7XG4gIE1hdGguZmxvb3IxMCA9IGZ1bmN0aW9uKHZhbHVlLCBleHApIHtcbiAgICByZXR1cm4gZGVjaW1hbEFkanVzdCgnZmxvb3InLCB2YWx1ZSwgZXhwKTtcbiAgfTtcbn1cbi8vIERlY2ltYWwgY2VpbFxuaWYgKCFNYXRoLmNlaWwxMCkge1xuICBNYXRoLmNlaWwxMCA9IGZ1bmN0aW9uKHZhbHVlLCBleHApIHtcbiAgICByZXR1cm4gZGVjaW1hbEFkanVzdCgnY2VpbCcsIHZhbHVlLCBleHApO1xuICB9O1xufVxuXG5TdHJpbmcucHJvdG90eXBlLmhhc2hDb2RlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoYXNoID0gMCwgaSwgY2hyLCBsZW47XG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGhhc2g7XG4gIGZvciAoaSA9IDAsIGxlbiA9IHRoaXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBjaHIgICA9IHRoaXMuY2hhckNvZGVBdChpKTtcbiAgICBoYXNoICA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgY2hyO1xuICAgIGhhc2ggfD0gMDtcbiAgfVxuICByZXR1cm4gaGFzaDtcbn07XG5cbnZhciBCYXNlNjQgPSB7X2tleVN0cjpcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XCIsZW5jb2RlOmZ1bmN0aW9uKGUpe3ZhciB0PVwiXCI7dmFyIG4scixpLHMsbyx1LGE7dmFyIGY9MDtlPUJhc2U2NC5fdXRmOF9lbmNvZGUoZSk7d2hpbGUoZjxlLmxlbmd0aCl7bj1lLmNoYXJDb2RlQXQoZisrKTtyPWUuY2hhckNvZGVBdChmKyspO2k9ZS5jaGFyQ29kZUF0KGYrKyk7cz1uPj4yO289KG4mMyk8PDR8cj4+NDt1PShyJjE1KTw8MnxpPj42O2E9aSY2MztpZihpc05hTihyKSl7dT1hPTY0fWVsc2UgaWYoaXNOYU4oaSkpe2E9NjR9dD10K3RoaXMuX2tleVN0ci5jaGFyQXQocykrdGhpcy5fa2V5U3RyLmNoYXJBdChvKSt0aGlzLl9rZXlTdHIuY2hhckF0KHUpK3RoaXMuX2tleVN0ci5jaGFyQXQoYSl9cmV0dXJuIHR9LGRlY29kZTpmdW5jdGlvbihlKXt2YXIgdD1cIlwiO3ZhciBuLHIsaTt2YXIgcyxvLHUsYTt2YXIgZj0wO2U9ZS5yZXBsYWNlKC9bXkEtWmEtejAtOSsvPV0vZyxcIlwiKTt3aGlsZShmPGUubGVuZ3RoKXtzPXRoaXMuX2tleVN0ci5pbmRleE9mKGUuY2hhckF0KGYrKykpO289dGhpcy5fa2V5U3RyLmluZGV4T2YoZS5jaGFyQXQoZisrKSk7dT10aGlzLl9rZXlTdHIuaW5kZXhPZihlLmNoYXJBdChmKyspKTthPXRoaXMuX2tleVN0ci5pbmRleE9mKGUuY2hhckF0KGYrKykpO249czw8MnxvPj40O3I9KG8mMTUpPDw0fHU+PjI7aT0odSYzKTw8NnxhO3Q9dCtTdHJpbmcuZnJvbUNoYXJDb2RlKG4pO2lmKHUhPTY0KXt0PXQrU3RyaW5nLmZyb21DaGFyQ29kZShyKX1pZihhIT02NCl7dD10K1N0cmluZy5mcm9tQ2hhckNvZGUoaSl9fXQ9QmFzZTY0Ll91dGY4X2RlY29kZSh0KTtyZXR1cm4gdH0sX3V0ZjhfZW5jb2RlOmZ1bmN0aW9uKGUpe2U9ZS5yZXBsYWNlKC9ybi9nLFwiblwiKTt2YXIgdD1cIlwiO2Zvcih2YXIgbj0wO248ZS5sZW5ndGg7bisrKXt2YXIgcj1lLmNoYXJDb2RlQXQobik7aWYocjwxMjgpe3QrPVN0cmluZy5mcm9tQ2hhckNvZGUocil9ZWxzZSBpZihyPjEyNyYmcjwyMDQ4KXt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjZ8MTkyKTt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKHImNjN8MTI4KX1lbHNle3QrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+MTJ8MjI0KTt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjYmNjN8MTI4KTt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKHImNjN8MTI4KX19cmV0dXJuIHR9LF91dGY4X2RlY29kZTpmdW5jdGlvbihlKXt2YXIgdD1cIlwiO3ZhciBuPTA7dmFyIHI9YzE9YzI9MDt3aGlsZShuPGUubGVuZ3RoKXtyPWUuY2hhckNvZGVBdChuKTtpZihyPDEyOCl7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyKTtuKyt9ZWxzZSBpZihyPjE5MSYmcjwyMjQpe2MyPWUuY2hhckNvZGVBdChuKzEpO3QrPVN0cmluZy5mcm9tQ2hhckNvZGUoKHImMzEpPDw2fGMyJjYzKTtuKz0yfWVsc2V7YzI9ZS5jaGFyQ29kZUF0KG4rMSk7YzM9ZS5jaGFyQ29kZUF0KG4rMik7dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgociYxNSk8PDEyfChjMiY2Myk8PDZ8YzMmNjMpO24rPTN9fXJldHVybiB0fX07XG5cblxudmFyIHV0aWxzID0ge1xuICBtaXhpbjogZnVuY3Rpb24gbWl4aW4oZGVzdGluYXRpb24sIHNvdXJjZSkge1xuICAgICAgcmV0dXJuIHV0aWxzLm1lcmdlKGRlc3RpbmF0aW9uLnByb3RvdHlwZSwgc291cmNlKTtcbiAgfSxcbiAgXG4gIG1peGluaW5zdGFuY2U6IGZ1bmN0aW9uIG1peGluaW5zdGFuY2UoZGVzdGluYXRpb24sc291cmNlKXtcbiAgICAgIHZhciBzb3VyY2VJbnN0YW5jZSA9IG5ldyBzb3VyY2U7XG4gICAgICB1dGlscy5tZXJnZShkZXN0aW5hdGlvbiwgc291cmNlSW5zdGFuY2UpO1xuICAgICAgdXRpbHMubWVyZ2UoZGVzdGluYXRpb24ucHJvdG90eXBlLCBzb3VyY2UucHJvdG90eXBlKTtcbiAgfSxcblxuXG4gIG1lcmdlOiBmdW5jdGlvbiBtZXJnZShkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICB2YXIga2V5O1xuXG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAodXRpbHMuaGFzT3duKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICBkZXN0aW5hdGlvbltrZXldID0gc291cmNlW2tleV07XG4gICAgICAgICAgfVxuICAgICAgfVxuICB9LFxuXG4gIGhhc093bjogZnVuY3Rpb24gaGFzT3duKG9iamVjdCwga2V5KSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KTtcbiAgfSxcbiAgXG4gIGluaGVyaXQ6ZnVuY3Rpb24oY2hpbGRDdG9yLCBwYXJlbnRDdG9yKSB7XG4gICAgZnVuY3Rpb24gdGVtcEN0b3IoKSB7fTtcbiAgICB0ZW1wQ3Rvci5wcm90b3R5cGUgPSBwYXJlbnRDdG9yLnByb3RvdHlwZTtcbiAgICBjaGlsZEN0b3Iuc3VwZXJDbGFzc18gPSBwYXJlbnRDdG9yLnByb3RvdHlwZTtcbiAgICBjaGlsZEN0b3IucHJvdG90eXBlID0gbmV3IHRlbXBDdG9yKCk7XG4gICAgY2hpbGRDdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNoaWxkQ3RvcjtcbiAgfSxcbiAgXG4gIGJhc2U6IGZ1bmN0aW9uKG1lLCBvcHRfbWV0aG9kTmFtZSwgdmFyX2FyZ3MpIHtcbiAgICB2YXIgY2FsbGVyID0gYXJndW1lbnRzLmNhbGxlZS5jYWxsZXI7XG4gICAgaWYgKGNhbGxlci5zdXBlckNsYXNzXykge1xuICAgICAgLy8gVGhpcyBpcyBhIGNvbnN0cnVjdG9yLiBDYWxsIHRoZSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yLlxuICAgICAgcmV0dXJuIGNhbGxlci5zdXBlckNsYXNzXy5jb25zdHJ1Y3Rvci5hcHBseShcbiAgICAgICAgICBtZSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgfVxuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBmb3VuZENhbGxlciA9IGZhbHNlO1xuICAgIGZvciAodmFyIGN0b3IgPSBtZS5jb25zdHJ1Y3RvcjtcbiAgICAgICAgIGN0b3I7IGN0b3IgPSBjdG9yLnN1cGVyQ2xhc3NfICYmIGN0b3Iuc3VwZXJDbGFzc18uY29uc3RydWN0b3IpIHtcbiAgICAgIGlmIChjdG9yLnByb3RvdHlwZVtvcHRfbWV0aG9kTmFtZV0gPT09IGNhbGxlcikge1xuICAgICAgICBmb3VuZENhbGxlciA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGZvdW5kQ2FsbGVyKSB7XG4gICAgICAgIHJldHVybiBjdG9yLnByb3RvdHlwZVtvcHRfbWV0aG9kTmFtZV0uYXBwbHkobWUsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHdlIGRpZCBub3QgZmluZCB0aGUgY2FsbGVyIGluIHRoZSBwcm90b3R5cGUgY2hhaW4sXG4gICAgLy8gdGhlbiBvbmUgb2YgdHdvIHRoaW5ncyBoYXBwZW5lZDpcbiAgICAvLyAxKSBUaGUgY2FsbGVyIGlzIGFuIGluc3RhbmNlIG1ldGhvZC5cbiAgICAvLyAyKSBUaGlzIG1ldGhvZCB3YXMgbm90IGNhbGxlZCBieSB0aGUgcmlnaHQgY2FsbGVyLlxuICAgIGlmIChtZVtvcHRfbWV0aG9kTmFtZV0gPT09IGNhbGxlcikge1xuICAgICAgcmV0dXJuIG1lLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtvcHRfbWV0aG9kTmFtZV0uYXBwbHkobWUsIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICAnYmFzZSBjYWxsZWQgZnJvbSBhIG1ldGhvZCBvZiBvbmUgbmFtZSAnICtcbiAgICAgICAgICAndG8gYSBtZXRob2Qgb2YgYSBkaWZmZXJlbnQgbmFtZScpO1xuICAgIH1cbiAgfSxcbiAgXG4gIG5vb3A6IGZ1bmN0aW9uKCl7fSxcbiAgXG4gIHRydWVmbmM6IGZ1bmN0aW9uKCl7cmV0dXJuIHRydWV9LFxuICBcbiAgZmFsc2VmbmM6IGZ1bmN0aW9uKCl7cmV0dXJuIHRydWV9LFxuICBcbiAgcmVzb2x2ZWRWYWx1ZTogZnVuY3Rpb24odmFsdWUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9LFxuICBcbiAgcmVqZWN0ZWRWYWx1ZTogZnVuY3Rpb24odmFsdWUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBkZWZlcnJlZC5yZWplY3QodmFsdWUpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH0sXG4gIFxuICBCYXNlNjQ6IEJhc2U2NFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcbiIsInZhciBDb250cm9sID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gIHZhciBuYW1lID0gb3B0aW9ucy5uYW1lIHx8IFwiP1wiO1xuICB0aGlzLm5hbWUgPSBuYW1lLnNwbGl0KCcgJykuam9pbignLScpLnRvTG93ZXJDYXNlKCk7XG4gIHRoaXMuaWQgPSB0aGlzLm5hbWUrJ18nKyhNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwKSk7XG4gIFxuICBpZiAoIW9wdGlvbnMuZWxlbWVudCkge1xuICAgIHZhciBjbGFzc05hbWUgPSBcIm9sLVwiK3RoaXMubmFtZS5zcGxpdCgnICcpLmpvaW4oJy0nKS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciB0aXBMYWJlbCA9IG9wdGlvbnMudGlwTGFiZWwgfHwgdGhpcy5uYW1lO1xuICAgIHZhciBsYWJlbCA9IG9wdGlvbnMubGFiZWwgfHwgXCI/XCI7XG4gICAgXG4gICAgb3B0aW9ucy5lbGVtZW50ID0gJCgnPGRpdiBjbGFzcz1cIicrY2xhc3NOYW1lKycgb2wtdW5zZWxlY3RhYmxlIG9sLWNvbnRyb2xcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIicrdGlwTGFiZWwrJ1wiPicrbGFiZWwrJzwvYnV0dG9uPjwvZGl2PicpWzBdO1xuICB9XG4gIFxuICB2YXIgYnV0dG9uQ2xpY2tIYW5kbGVyID0gb3B0aW9ucy5idXR0b25DbGlja0hhbmRsZXIgfHwgQ29udHJvbC5wcm90b3R5cGUuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyk7XG4gIFxuICAkKG9wdGlvbnMuZWxlbWVudCkub24oJ2NsaWNrJyxidXR0b25DbGlja0hhbmRsZXIpO1xuICBcbiAgb2wuY29udHJvbC5Db250cm9sLmNhbGwodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3Bvc3RSZW5kZXIoKTtcbn1cbm9sLmluaGVyaXRzKENvbnRyb2wsIG9sLmNvbnRyb2wuQ29udHJvbCk7XG5cblxudmFyIHByb3RvID0gQ29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLl9oYW5kbGVDbGljayA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIG1hcCA9IHRoaXMuZ2V0TWFwKCk7XG4gIFxuICB2YXIgcmVzZXRDb250cm9sID0gbnVsbDtcbiAgLy8gcmVtb3ZlIGFsbCB0aGUgb3RoZXIsIGV2ZW50dWFsbHkgdG9nZ2xlZCwgaW50ZXJhY3Rpb25jb250cm9sc1xuICB2YXIgY29udHJvbHMgPSBtYXAuZ2V0Q29udHJvbHMoKTtcbiAgY29udHJvbHMuZm9yRWFjaChmdW5jdGlvbihjb250cm9sKXtcbiAgICBpZihjb250cm9sLmlkICYmIGNvbnRyb2wudG9nZ2xlICYmIChjb250cm9sLmlkICE9IHNlbGYuaWQpKSB7XG4gICAgICBjb250cm9sLnRvZ2dsZShmYWxzZSk7XG4gICAgICBpZiAoY29udHJvbC5uYW1lID09ICdyZXNldCcpIHtcbiAgICAgICAgcmVzZXRDb250cm9sID0gY29udHJvbDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBpZiAoIXNlbGYuX3RvZ2dsZWQgJiYgcmVzZXRDb250cm9sKSB7XG4gICAgcmVzZXRDb250cm9sLnRvZ2dsZSh0cnVlKTtcbiAgfVxufTtcblxucHJvdG8uX3Bvc3RSZW5kZXIgPSBmdW5jdGlvbigpe307XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbDtcbiIsInZhciBDb250cm9sID0gcmVxdWlyZSgnLi9jb250cm9sJyk7XG5cbnZhciBJbnRlcmFjdGlvbkNvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdGhpcy5fdG9nZ2xlZCA9IHRoaXMuX3RvZ2dsZWQgfHwgZmFsc2U7XG4gIHRoaXMuX2ludGVyYWN0aW9uID0gb3B0aW9ucy5pbnRlcmFjdGlvbiB8fCBudWxsO1xuICB0aGlzLl9hdXRvdW50b2dnbGUgPSBvcHRpb25zLmF1dG91bnRvZ2dsZSB8fCBmYWxzZTtcbiAgXG4gIG9wdGlvbnMuYnV0dG9uQ2xpY2tIYW5kbGVyID0gSW50ZXJhY3Rpb25Db250cm9sLnByb3RvdHlwZS5faGFuZGxlQ2xpY2suYmluZCh0aGlzKTtcbiAgXG4gIENvbnRyb2wuY2FsbCh0aGlzLG9wdGlvbnMpO1xufTtcbm9sLmluaGVyaXRzKEludGVyYWN0aW9uQ29udHJvbCwgQ29udHJvbCk7XG5cbnZhciBwcm90byA9IEludGVyYWN0aW9uQ29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uKHRvZ2dsZSl7XG4gIHZhciB0b2dnbGUgPSB0b2dnbGUgIT09IHVuZGVmaW5lZCA/IHRvZ2dsZSA6ICF0aGlzLl90b2dnbGVkXG4gIHRoaXMuX3RvZ2dsZWQgPSB0b2dnbGU7XG4gIHZhciBtYXAgPSB0aGlzLmdldE1hcCgpO1xuICB2YXIgY29udHJvbEJ1dHRvbiA9ICQodGhpcy5lbGVtZW50KS5maW5kKCdidXR0b24nKS5maXJzdCgpO1xuICBcbiAgaWYgKHRvZ2dsZSkge1xuICAgIGlmICh0aGlzLl9pbnRlcmFjdGlvbikge1xuICAgICAgbWFwLmFkZEludGVyYWN0aW9uKHRoaXMuX2ludGVyYWN0aW9uKTtcbiAgICB9XG4gICAgY29udHJvbEJ1dHRvbi5hZGRDbGFzcygnZzN3LW9sLXRvZ2dsZWQnKTtcbiAgfVxuICBlbHNlIHtcbiAgICBpZiAodGhpcy5faW50ZXJhY3Rpb24pIHtcbiAgICAgIG1hcC5yZW1vdmVJbnRlcmFjdGlvbih0aGlzLl9pbnRlcmFjdGlvbik7XG4gICAgfVxuICAgIGNvbnRyb2xCdXR0b24ucmVtb3ZlQ2xhc3MoJ2czdy1vbC10b2dnbGVkJyk7XG4gIH1cbn1cblxucHJvdG8uX2hhbmRsZUNsaWNrID0gZnVuY3Rpb24oZSl7XG4gIHRoaXMudG9nZ2xlKCk7XG4gIENvbnRyb2wucHJvdG90eXBlLl9oYW5kbGVDbGljay5jYWxsKHRoaXMsZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyYWN0aW9uQ29udHJvbDtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgSW50ZXJhY3Rpb25Db250cm9sID0gcmVxdWlyZSgnLi9pbnRlcmFjdGlvbmNvbnRyb2wnKTtcblxudmFyIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uID0gcmVxdWlyZSgnLi4vaW50ZXJhY3Rpb25zL3BpY2tjb29yZGluYXRlc2ludGVyYWN0aW9uJyk7XG5cbnZhciBRdWVyeUNvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgX29wdGlvbnMgPSB7XG4gICAgbmFtZTogXCJxdWVyeWxheWVyXCIsXG4gICAgdGlwTGFiZWw6IFwiUXVlcnkgbGF5ZXJcIixcbiAgICBsYWJlbDogXCJcXHVlYTBmXCIsXG4gICAgaW50ZXJhY3Rpb246IG5ldyBQaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvblxuICB9O1xuICBcbiAgb3B0aW9ucyA9IHV0aWxzLm1lcmdlKG9wdGlvbnMsX29wdGlvbnMpO1xuICBcbiAgSW50ZXJhY3Rpb25Db250cm9sLmNhbGwodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX2ludGVyYWN0aW9uLm9uKCdwaWNrZWQnLGZ1bmN0aW9uKGUpe1xuICAgIHNlbGYuZGlzcGF0Y2hFdmVudCh7XG4gICAgICB0eXBlOiAncGlja2VkJyxcbiAgICAgIGNvb3JkaW5hdGVzOiBlLmNvb3JkaW5hdGVcbiAgICB9KTtcbiAgICBpZiAoc2VsZi5fYXV0b3VudG9nZ2xlKSB7XG4gICAgICBzZWxmLnRvZ2dsZSgpO1xuICAgIH1cbiAgfSk7XG59XG5vbC5pbmhlcml0cyhRdWVyeUNvbnRyb2wsIEludGVyYWN0aW9uQ29udHJvbCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUXVlcnlDb250cm9sO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbnZhciBJbnRlcmFjdGlvbkNvbnRyb2wgPSByZXF1aXJlKCcuL2ludGVyYWN0aW9uY29udHJvbCcpO1xuXG52YXIgUmVzZXRDb250cm9sID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fdG9nZ2xlZCA9IHRydWU7XG4gIHRoaXMuX3N0YXJ0Q29vcmRpbmF0ZSA9IG51bGw7XG4gIHZhciBfb3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IFwicmVzZXRcIixcbiAgICAgIHRpcExhYmVsOiBcIlBhblwiLFxuICAgICAgbGFiZWw6IFwiXFx1ZTkwMVwiLFxuICAgIH07XG4gIFxuICBvcHRpb25zID0gdXRpbHMubWVyZ2Uob3B0aW9ucyxfb3B0aW9ucyk7XG4gIFxuICBJbnRlcmFjdGlvbkNvbnRyb2wuY2FsbCh0aGlzLG9wdGlvbnMpO1xufVxub2wuaW5oZXJpdHMoUmVzZXRDb250cm9sLCBJbnRlcmFjdGlvbkNvbnRyb2wpO1xubW9kdWxlLmV4cG9ydHMgPSBSZXNldENvbnRyb2w7XG5cbnZhciBwcm90byA9IFJlc2V0Q29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLl9wb3N0UmVuZGVyID0gZnVuY3Rpb24oKXtcbiAgdGhpcy50b2dnbGUodHJ1ZSk7XG59O1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbnZhciBJbnRlcmFjdGlvbkNvbnRyb2wgPSByZXF1aXJlKCcuL2ludGVyYWN0aW9uY29udHJvbCcpO1xuXG52YXIgWm9vbUJveENvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9zdGFydENvb3JkaW5hdGUgPSBudWxsO1xuICB2YXIgX29wdGlvbnMgPSB7XG4gICAgICBuYW1lOiBcInpvb21ib3hcIixcbiAgICAgIHRpcExhYmVsOiBcIlpvb20gdG8gYm94XCIsXG4gICAgICBsYWJlbDogXCJcXHVlOTAwXCIsXG4gICAgICBpbnRlcmFjdGlvbjogbmV3IG9sLmludGVyYWN0aW9uLkRyYWdCb3hcbiAgICB9O1xuICBcbiAgb3B0aW9ucyA9IHV0aWxzLm1lcmdlKG9wdGlvbnMsX29wdGlvbnMpO1xuICBcbiAgSW50ZXJhY3Rpb25Db250cm9sLmNhbGwodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX2ludGVyYWN0aW9uLm9uKCdib3hzdGFydCcsZnVuY3Rpb24oZSl7XG4gICAgc2VsZi5fc3RhcnRDb29yZGluYXRlID0gZS5jb29yZGluYXRlO1xuICB9KTtcbiAgXG4gIHRoaXMuX2ludGVyYWN0aW9uLm9uKCdib3hlbmQnLGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzdGFydF9jb29yZGluYXRlID0gc2VsZi5fc3RhcnRDb29yZGluYXRlO1xuICAgIHZhciBlbmRfY29vcmRpbmF0ZSA9IGUuY29vcmRpbmF0ZTtcbiAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJvdW5kaW5nRXh0ZW50KFtzdGFydF9jb29yZGluYXRlLGVuZF9jb29yZGluYXRlXSk7XG4gICAgc2VsZi5kaXNwYXRjaEV2ZW50KHtcbiAgICAgIHR5cGU6ICd6b29tZW5kJyxcbiAgICAgIGV4dGVudDogZXh0ZW50XG4gICAgfSk7XG4gICAgc2VsZi5fc3RhcnRDb29yZGluYXRlID0gbnVsbDtcbiAgICBpZiAoc2VsZi5fYXV0b3VudG9nZ2xlKSB7XG4gICAgICBzZWxmLnRvZ2dsZSgpO1xuICAgIH1cbiAgfSlcbn1cbm9sLmluaGVyaXRzKFpvb21Cb3hDb250cm9sLCBJbnRlcmFjdGlvbkNvbnRyb2wpO1xubW9kdWxlLmV4cG9ydHMgPSBab29tQm94Q29udHJvbDtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBtYXBoZWxwZXJzID0gcmVxdWlyZSgnLi9tYXAvbWFwaGVscGVycycpO1xuXG4oZnVuY3Rpb24gKG5hbWUsIHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShmYWN0b3J5KTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfVxuICBlbHNlIHtcbiAgICByb290W25hbWVdID0gZmFjdG9yeSgpO1xuICB9XG59KSgnZzN3b2wzJywgdGhpcywgZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIFxuICB2YXIgaGVscGVycyA9IHV0aWxzLm1lcmdlKHt9LG1hcGhlbHBlcnMpO1xuICBcbiAgcmV0dXJuIHtcbiAgICBoZWxwZXJzOiBoZWxwZXJzXG4gIH1cbn0pO1xuIiwidmFyIEJhc2VMYXllcnMgPSB7fTtcblxuQmFzZUxheWVycy5PU00gPSBuZXcgb2wubGF5ZXIuVGlsZSh7XG4gIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5PU00oe1xuICAgIGF0dHJpYnV0aW9uczogW1xuICAgICAgbmV3IG9sLkF0dHJpYnV0aW9uKHtcbiAgICAgICAgaHRtbDogJ0FsbCBtYXBzICZjb3B5OyAnICtcbiAgICAgICAgICAgICc8YSBocmVmPVwiaHR0cDovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9cIj5PcGVuU3RyZWV0TWFwPC9hPidcbiAgICAgIH0pLFxuICAgICAgb2wuc291cmNlLk9TTS5BVFRSSUJVVElPTlxuICAgIF0sXG4gICAgdXJsOiAnaHR0cDovL3thLWN9LnRpbGUub3BlbnN0cmVldG1hcC5vcmcve3p9L3t4fS97eX0ucG5nJyxcbiAgICBjcm9zc09yaWdpbjogbnVsbFxuICB9KSxcbiAgaWQ6ICdvc20nLFxuICB0aXRsZTogJ09TTScsXG4gIGJhc2VtYXA6IHRydWVcbn0pO1xuXG5CYXNlTGF5ZXJzLkJJTkcgPSB7fTtcblxuQmFzZUxheWVycy5CSU5HLlJvYWQgPSBuZXcgb2wubGF5ZXIuVGlsZSh7XG4gIG5hbWU6J1JvYWQnLFxuICB2aXNpYmxlOiBmYWxzZSxcbiAgcHJlbG9hZDogSW5maW5pdHksXG4gIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5CaW5nTWFwcyh7XG4gICAga2V5OiAnQW1fbUFTblVBLWp0VzNPM014SVltT09QTE92TDM5ZHdNdlJueW9IeGZLZl9FUE5ZZ2ZXTTlpbXFHRVRXS0dWbicsXG4gICAgaW1hZ2VyeVNldDogJ1JvYWQnXG4gICAgICAvLyB1c2UgbWF4Wm9vbSAxOSB0byBzZWUgc3RyZXRjaGVkIHRpbGVzIGluc3RlYWQgb2YgdGhlIEJpbmdNYXBzXG4gICAgICAvLyBcIm5vIHBob3RvcyBhdCB0aGlzIHpvb20gbGV2ZWxcIiB0aWxlc1xuICAgICAgLy8gbWF4Wm9vbTogMTlcbiAgfSksXG4gIGJhc2VtYXA6IHRydWVcbn0pO1xuXG5CYXNlTGF5ZXJzLkJJTkcuQWVyaWFsV2l0aExhYmVscyA9IG5ldyBvbC5sYXllci5UaWxlKHtcbiAgbmFtZTogJ0FlcmlhbFdpdGhMYWJlbHMnLFxuICB2aXNpYmxlOiB0cnVlLFxuICBwcmVsb2FkOiBJbmZpbml0eSxcbiAgc291cmNlOiBuZXcgb2wuc291cmNlLkJpbmdNYXBzKHtcbiAgICBrZXk6ICdBbV9tQVNuVUEtanRXM08zTXhJWW1PT1BMT3ZMMzlkd012Um55b0h4ZktmX0VQTllnZldNOWltcUdFVFdLR1ZuJyxcbiAgICBpbWFnZXJ5U2V0OiAnQWVyaWFsV2l0aExhYmVscydcbiAgICAgIC8vIHVzZSBtYXhab29tIDE5IHRvIHNlZSBzdHJldGNoZWQgdGlsZXMgaW5zdGVhZCBvZiB0aGUgQmluZ01hcHNcbiAgICAgIC8vIFwibm8gcGhvdG9zIGF0IHRoaXMgem9vbSBsZXZlbFwiIHRpbGVzXG4gICAgICAvLyBtYXhab29tOiAxOVxuICB9KSxcbiAgYmFzZW1hcDogdHJ1ZVxufSk7XG5cbkJhc2VMYXllcnMuQklORy5BZXJpYWwgPSBuZXcgb2wubGF5ZXIuVGlsZSh7XG4gIG5hbWU6ICdBZXJpYWwnLFxuICB2aXNpYmxlOiBmYWxzZSxcbiAgcHJlbG9hZDogSW5maW5pdHksXG4gIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5CaW5nTWFwcyh7XG4gICAga2V5OiAnQW1fbUFTblVBLWp0VzNPM014SVltT09QTE92TDM5ZHdNdlJueW9IeGZLZl9FUE5ZZ2ZXTTlpbXFHRVRXS0dWbicsXG4gICAgaW1hZ2VyeVNldDogJ0FlcmlhbCdcbiAgICAgIC8vIHVzZSBtYXhab29tIDE5IHRvIHNlZSBzdHJldGNoZWQgdGlsZXMgaW5zdGVhZCBvZiB0aGUgQmluZ01hcHNcbiAgICAgIC8vIFwibm8gcGhvdG9zIGF0IHRoaXMgem9vbSBsZXZlbFwiIHRpbGVzXG4gICAgICAvLyBtYXhab29tOiAxOVxuICB9KSxcbiAgYmFzZW1hcDogdHJ1ZVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZUxheWVycztcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgUmFzdGVyTGF5ZXJzID0ge307XG5cblJhc3RlckxheWVycy5UaWxlZFdNU0xheWVyID0gZnVuY3Rpb24obGF5ZXJPYmosZXh0cmFQYXJhbXMpe1xuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBsYXllck9iajogbGF5ZXJPYmosXG4gICAgZXh0cmFQYXJhbXM6IGV4dHJhUGFyYW1zIHx8IHt9LFxuICAgIHRpbGVkOiB0cnVlXG4gIH1cbiAgcmV0dXJuIFJhc3RlckxheWVycy5fV01TTGF5ZXIob3B0aW9ucyk7XG59O1xuXG5SYXN0ZXJMYXllcnMuV01TTGF5ZXIgPSBmdW5jdGlvbihsYXllck9iaixleHRyYVBhcmFtcyl7XG4gIHZhciBvcHRpb25zID0ge1xuICAgIGxheWVyT2JqOiBsYXllck9iaixcbiAgICBleHRyYVBhcmFtczogZXh0cmFQYXJhbXMgfHwge31cbiAgfVxuICByZXR1cm4gUmFzdGVyTGF5ZXJzLl9XTVNMYXllcihvcHRpb25zKTtcbn07XG5cblJhc3RlckxheWVycy5fV01TTGF5ZXIgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIGxheWVyT2JqID0gb3B0aW9ucy5sYXllck9iajtcbiAgdmFyIGV4dHJhUGFyYW1zID0gb3B0aW9ucy5leHRyYVBhcmFtcztcbiAgdmFyIHRpbGVkID0gb3B0aW9ucy50aWxlZCB8fCBmYWxzZTtcbiAgXG4gIHZhciBwYXJhbXMgPSB7XG4gICAgTEFZRVJTOiBsYXllck9iai5sYXllcnMgfHwgJycsXG4gICAgVkVSU0lPTjogJzEuMy4wJyxcbiAgICBUUkFOU1BBUkVOVDogdHJ1ZSxcbiAgICBTTERfVkVSU0lPTjogJzEuMS4wJ1xuICB9O1xuICBcbiAgcGFyYW1zID0gdXRpbHMubWVyZ2UocGFyYW1zLGV4dHJhUGFyYW1zKTtcbiAgXG4gIHZhciBzb3VyY2VPcHRpb25zID0ge1xuICAgIHVybDogbGF5ZXJPYmoudXJsLFxuICAgIHBhcmFtczogcGFyYW1zLFxuICAgIHJhdGlvOiAxXG4gIH07XG4gIFxuICB2YXIgaW1hZ2VPcHRpb25zID0ge1xuICAgIGlkOiBsYXllck9iai5pZCxcbiAgICBuYW1lOiBsYXllck9iai5uYW1lLFxuICAgIG9wYWNpdHk6IGxheWVyT2JqLm9wYWNpdHkgfHwgMS4wLFxuICAgIHZpc2libGU6bGF5ZXJPYmoudmlzaWJsZSxcbiAgICBtYXhSZXNvbHV0aW9uOiBsYXllck9iai5tYXhSZXNvbHV0aW9uXG4gIH1cbiAgXG4gIHZhciBpbWFnZUNsYXNzO1xuICB2YXIgc291cmNlO1xuICBpZiAodGlsZWQpIHtcbiAgICBzb3VyY2UgPSBuZXcgb2wuc291cmNlLlRpbGVXTVMoc291cmNlT3B0aW9ucyk7XG4gICAgaW1hZ2VDbGFzcyA9IG9sLmxheWVyLlRpbGU7XG4gICAgLy9pbWFnZU9wdGlvbnMuZXh0ZW50ID0gWzExMzQ4NjcsMzg3MzAwMiwyNTA1OTY0LDU1OTY5NDRdO1xuICB9XG4gIGVsc2Uge1xuICAgIHNvdXJjZSA9IG5ldyBvbC5zb3VyY2UuSW1hZ2VXTVMoc291cmNlT3B0aW9ucylcbiAgICBpbWFnZUNsYXNzID0gb2wubGF5ZXIuSW1hZ2U7XG4gIH1cbiAgXG4gIGltYWdlT3B0aW9ucy5zb3VyY2UgPSBzb3VyY2U7XG4gIFxuICB2YXIgbGF5ZXIgPSBuZXcgaW1hZ2VDbGFzcyhpbWFnZU9wdGlvbnMpO1xuICBcbiAgcmV0dXJuIGxheWVyO1xufTtcblxuLypSYXN0ZXJMYXllcnMuVGlsZWRXTVNMYXllciA9IGZ1bmN0aW9uKGxheWVyT2JqKXtcbiAgdmFyIGxheWVyID0gbmV3IG9sLmxheWVyLlRpbGUoe1xuICAgIG5hbWU6IGxheWVyT2JqLm5hbWUsXG4gICAgb3BhY2l0eTogMS4wLFxuICAgIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5UaWxlV01TKHtcbiAgICAgIHVybDogbGF5ZXJPYmoudXJsLFxuICAgICAgcGFyYW1zOiB7XG4gICAgICAgIExBWUVSUzogbGF5ZXJPYmoubGF5ZXJzIHx8ICcnLFxuICAgICAgICBWRVJTSU9OOiAnMS4zLjAnLFxuICAgICAgICBUUkFOU1BBUkVOVDogdHJ1ZVxuICAgICAgfVxuICAgIH0pLFxuICAgIHZpc2libGU6IGxheWVyT2JqLnZpc2libGVcbiAgfSk7XG4gIFxuICByZXR1cm4gbGF5ZXI7XG59OyovXG5cbm1vZHVsZS5leHBvcnRzID0gUmFzdGVyTGF5ZXJzO1xuXG4iLCJCYXNlTGF5ZXJzID0gcmVxdWlyZSgnLi4vbGF5ZXJzL2Jhc2VzJyk7XG5cbnZhciBNYXBIZWxwZXJzID0ge1xuICBjcmVhdGVWaWV3ZXI6IGZ1bmN0aW9uKG9wdHMpe1xuICAgIHJldHVybiBuZXcgX1ZpZXdlcihvcHRzKTtcbiAgfVxufTtcblxudmFyIF9WaWV3ZXIgPSBmdW5jdGlvbihvcHRzKXtcbiAgdmFyIGNvbnRyb2xzID0gb2wuY29udHJvbC5kZWZhdWx0cyh7XG4gICAgYXR0cmlidXRpb25PcHRpb25zOiB7XG4gICAgICBjb2xsYXBzaWJsZTogZmFsc2VcbiAgICB9LFxuICAgIHpvb206IGZhbHNlLFxuICAgIGF0dHJpYnV0aW9uOiBmYWxzZVxuICB9KTsvLy5leHRlbmQoW25ldyBvbC5jb250cm9sLlpvb20oKV0pO1xuICBcbiAgdmFyIGludGVyYWN0aW9ucyA9IG9sLmludGVyYWN0aW9uLmRlZmF1bHRzKClcbiAgICAuZXh0ZW5kKFtcbiAgICAgIG5ldyBvbC5pbnRlcmFjdGlvbi5EcmFnUm90YXRlKClcbiAgICBdKTtcbiAgaW50ZXJhY3Rpb25zLnJlbW92ZUF0KDEpIC8vIHJpbXVvdm8gZG91Y2xpY2t6b29tXG4gIFxuICB2YXIgdmlldyA9IG5ldyBvbC5WaWV3KG9wdHMudmlldyk7XG4gIHZhciBvcHRpb25zID0ge1xuICAgIGNvbnRyb2xzOiBjb250cm9scyxcbiAgICBpbnRlcmFjdGlvbnM6IGludGVyYWN0aW9ucyxcbiAgICBvbDNMb2dvOiBmYWxzZSxcbiAgICB2aWV3OiB2aWV3LFxuICAgIGtleWJvYXJkRXZlbnRUYXJnZXQ6IGRvY3VtZW50XG4gIH07XG4gIGlmIChvcHRzLmlkKXtcbiAgICBvcHRpb25zLnRhcmdldCA9IG9wdHMuaWQ7XG4gIH1cbiAgdmFyIG1hcCAgPSBuZXcgb2wuTWFwKG9wdGlvbnMpO1xuICB0aGlzLm1hcCA9IG1hcDtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuICBpZiAodGhpcy5tYXApIHtcbiAgICB0aGlzLm1hcC5kaXNwb3NlKCk7XG4gICAgdGhpcy5tYXAgPSBudWxsXG4gIH1cbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLnVwZGF0ZU1hcCA9IGZ1bmN0aW9uKG1hcE9iamVjdCl7fTtcblxuX1ZpZXdlci5wcm90b3R5cGUudXBkYXRlVmlldyA9IGZ1bmN0aW9uKCl7fTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0TWFwID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMubWFwO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuc2V0VGFyZ2V0ID0gZnVuY3Rpb24oaWQpe1xuICB0aGlzLm1hcC5zZXRUYXJnZXQoaWQpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ29UbyA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzLCB6b29tKXtcbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgYW5pbWF0ZSA9IG9wdGlvbnMuYW5pbWF0ZSB8fCB0cnVlO1xuICB2YXIgdmlldyA9IHRoaXMubWFwLmdldFZpZXcoKTtcbiAgXG4gIGlmIChhbmltYXRlKSB7XG4gICAgdmFyIHBhbiA9IG9sLmFuaW1hdGlvbi5wYW4oe1xuICAgICAgZHVyYXRpb246IDUwMCxcbiAgICAgIHNvdXJjZTogdmlldy5nZXRDZW50ZXIoKVxuICAgIH0pO1xuICAgIHZhciB6b29tID0gb2wuYW5pbWF0aW9uLnpvb20oe1xuICAgICAgZHVyYXRpb246IDUwMCxcbiAgICAgIHJlc29sdXRpb246IHZpZXcuZ2V0UmVzb2x1dGlvbigpXG4gICAgfSk7XG4gICAgdGhpcy5tYXAuYmVmb3JlUmVuZGVyKHBhbix6b29tKTtcbiAgfVxuICBcbiAgdmlldy5zZXRDZW50ZXIoY29vcmRpbmF0ZXMpO1xuICB2aWV3LnNldFpvb20oem9vbSk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nb1RvUmVzID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsIHJlc29sdXRpb24pe1xuICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBhbmltYXRlID0gb3B0aW9ucy5hbmltYXRlIHx8IHRydWU7XG4gIHZhciB2aWV3ID0gdGhpcy5tYXAuZ2V0VmlldygpO1xuICBcbiAgaWYgKGFuaW1hdGUpIHtcbiAgICB2YXIgcGFuID0gb2wuYW5pbWF0aW9uLnBhbih7XG4gICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgc291cmNlOiB2aWV3LmdldENlbnRlcigpXG4gICAgfSk7XG4gICAgdmFyIHpvb20gPSBvbC5hbmltYXRpb24uem9vbSh7XG4gICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgcmVzb2x1dGlvbjogdmlldy5nZXRSZXNvbHV0aW9uKClcbiAgICB9KTtcbiAgICB0aGlzLm1hcC5iZWZvcmVSZW5kZXIocGFuLHpvb20pO1xuICB9XG5cbiAgdmlldy5zZXRDZW50ZXIoY29vcmRpbmF0ZXMpO1xuICB2aWV3LnNldFJlc29sdXRpb24ocmVzb2x1dGlvbik7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5maXQgPSBmdW5jdGlvbihnZW9tZXRyeSwgb3B0aW9ucyl7XG4gIHZhciB2aWV3ID0gdGhpcy5tYXAuZ2V0VmlldygpO1xuICBcbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgYW5pbWF0ZSA9IG9wdGlvbnMuYW5pbWF0ZSB8fCB0cnVlO1xuICBcbiAgaWYgKGFuaW1hdGUpIHtcbiAgICB2YXIgcGFuID0gb2wuYW5pbWF0aW9uLnBhbih7XG4gICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgc291cmNlOiB2aWV3LmdldENlbnRlcigpXG4gICAgfSk7XG4gICAgdmFyIHpvb20gPSBvbC5hbmltYXRpb24uem9vbSh7XG4gICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgcmVzb2x1dGlvbjogdmlldy5nZXRSZXNvbHV0aW9uKClcbiAgICB9KTtcbiAgICB0aGlzLm1hcC5iZWZvcmVSZW5kZXIocGFuLHpvb20pO1xuICB9XG4gIFxuICBpZiAob3B0aW9ucy5hbmltYXRlKSB7XG4gICAgZGVsZXRlIG9wdGlvbnMuYW5pbWF0ZTsgLy8gbm9uIGxvIHBhc3NvIGFsIG1ldG9kbyBkaSBPTDMgcGVyY2jDqSDDqCB1bidvcHppb25lIGludGVybmFcbiAgfVxuICBvcHRpb25zLmNvbnN0cmFpblJlc29sdXRpb24gPSBvcHRpb25zLmNvbnN0cmFpblJlc29sdXRpb24gfHwgZmFsc2U7XG4gIFxuICB2aWV3LmZpdChnZW9tZXRyeSx0aGlzLm1hcC5nZXRTaXplKCksb3B0aW9ucyk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRab29tID0gZnVuY3Rpb24oKXtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIHJldHVybiB2aWV3LmdldFpvb20oKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldFJlc29sdXRpb24gPSBmdW5jdGlvbigpe1xuICB2YXIgdmlldyA9IHRoaXMubWFwLmdldFZpZXcoKTtcbiAgcmV0dXJuIHZpZXcuZ2V0UmVzb2x1dGlvbigpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0Q2VudGVyID0gZnVuY3Rpb24oKXtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIHJldHVybiB2aWV3LmdldENlbnRlcigpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0QkJPWCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLm1hcC5nZXRWaWV3KCkuY2FsY3VsYXRlRXh0ZW50KHRoaXMubWFwLmdldFNpemUoKSk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRMYXllckJ5TmFtZSA9IGZ1bmN0aW9uKGxheWVyTmFtZSkge1xuICB2YXIgbGF5ZXJzID0gdGhpcy5tYXAuZ2V0TGF5ZXJzKCk7XG4gIHZhciBsZW5ndGggPSBsYXllcnMuZ2V0TGVuZ3RoKCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobGF5ZXJOYW1lID09PSBsYXllcnMuaXRlbShpKS5nZXQoJ25hbWUnKSkge1xuICAgICAgcmV0dXJuIGxheWVycy5pdGVtKGkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLnJlbW92ZUxheWVyQnlOYW1lID0gZnVuY3Rpb24obGF5ZXJOYW1lKXtcbiAgdmFyIGxheWVyID0gdGhpcy5nZXRMYXllckJ5TmFtZShsYXllck5hbWUpO1xuICBpZiAobGF5ZXIpe1xuICAgIHRoaXMubWFwLnJlbW92ZUxheWVyKGxheWVyKTtcbiAgICBkZWxldGUgbGF5ZXI7XG4gIH1cbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldEFjdGl2ZUxheWVycyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBhY3RpdmVsYXllcnMgPSBbXTtcbiAgdGhpcy5tYXAuZ2V0TGF5ZXJzKCkuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgIHZhciBwcm9wcyA9IGxheWVyLmdldFByb3BlcnRpZXMoKTtcbiAgICBpZiAocHJvcHMuYmFzZW1hcCAhPSB0cnVlICYmIHByb3BzLnZpc2libGUpe1xuICAgICAgIGFjdGl2ZWxheWVycy5wdXNoKGxheWVyKTtcbiAgICB9XG4gIH0pO1xuICBcbiAgcmV0dXJuIGFjdGl2ZWxheWVycztcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLnJlbW92ZUxheWVycyA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMubWFwLmdldExheWVycygpLmNsZWFyKCk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRMYXllcnNOb0Jhc2UgPSBmdW5jdGlvbigpe1xuICB2YXIgbGF5ZXJzID0gW107XG4gIHRoaXMubWFwLmdldExheWVycygpLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICB2YXIgcHJvcHMgPSBsYXllci5nZXRQcm9wZXJ0aWVzKCk7XG4gICAgaWYgKHByb3BzLmJhc2VtYXAgIT0gdHJ1ZSl7XG4gICAgICBsYXllcnMucHVzaChsYXllcik7XG4gICAgfVxuICB9KTtcbiAgXG4gIHJldHVybiBsYXllcnM7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5hZGRCYXNlTGF5ZXIgPSBmdW5jdGlvbih0eXBlKXtcbiAgdmFyIGxheWVyO1xuICB0eXBlID8gbGF5ZXIgPSBCYXNlTGF5ZXJzW3R5cGVdOiAgbGF5ZXIgPSBCYXNlTGF5ZXJzLkJJTkcuQWVyaWFsO1xuICB0aGlzLm1hcC5hZGRMYXllcihsYXllcik7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5jaGFuZ2VCYXNlTGF5ZXIgPSBmdW5jdGlvbihsYXllck5hbWUpe1xuICB2YXIgYmFzZUxheWVyID0gdGhpcy5nZXRMYXllckJ5TmFtZShsYXllcm5hbWUpO1xuICB2YXIgbGF5ZXJzID0gdGhpcy5tYXAuZ2V0TGF5ZXJzKCk7XG4gIGxheWVycy5pbnNlcnRBdCgwLCBiYXNlTGF5ZXIpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNYXBIZWxwZXJzO1xuIiwidmFyIHV0aWxzID0ge1xuICBtZXJnZTogZnVuY3Rpb24ob2JqMSxvYmoyKXtcbiAgICB2YXIgb2JqMyA9IHt9O1xuICAgIGZvciAodmFyIGF0dHJuYW1lIGluIG9iajEpIHsgb2JqM1thdHRybmFtZV0gPSBvYmoxW2F0dHJuYW1lXTsgfVxuICAgIGZvciAodmFyIGF0dHJuYW1lIGluIG9iajIpIHsgb2JqM1thdHRybmFtZV0gPSBvYmoyW2F0dHJuYW1lXTsgfVxuICAgIHJldHVybiBvYmozO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGxpPlxcbjxmb3JtIHJvbGU9XFxcImZvcm1cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiYm94LWJvZHlcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJleGFtcGxlSW5wdXRFbWFpbDFcXFwiIHN0eWxlPVxcXCJjb2xvcjogd2hpdGVcXFwiPkVtYWlsIGFkZHJlc3M8L2xhYmVsPlxcbiAgICAgIDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgaWQ9XFxcImV4YW1wbGVJbnB1dEVtYWlsMVxcXCIgcGxhY2Vob2xkZXI9XFxcIlxcXCI+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCI+Q2lhbzwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZm9ybT5cXG48L2xpPlwiO1xuIiwidmFyIHQgPSByZXF1aXJlKCdjb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJykudDtcblxuVnVlLmNvbXBvbmVudCgnZzN3LXNlYXJjaCcse1xuICAgIHRlbXBsYXRlOiByZXF1aXJlKCdndWkvY29tcG9uZW50cy9zZWFyY2gvc2VhcmNoLmh0bWwnKSxcbiAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICBcdHJldHVybiB7XG4gICAgICAgIFx0XG4gICAgICAgIH07XG4gICAgfSxcbiAgICBtZXRob2RzOiB7XG4gICAgXHRcblx0fVxufSk7XG4iLCJ2YXIgZzN3ID0ge307XG5cbmczdy5jb3JlID0ge1xuICAgRzNXT2JqZWN0OiByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpLFxuICAgdXRpbHM6IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKSxcbiAgIEFwcGxpY2F0aW9uOiByZXF1aXJlKCdjb3JlL2FwcGxpY2F0aW9uJyksXG4gICBBcGlTZXJ2aWNlOiByZXF1aXJlKCdjb3JlL2FwaXNlcnZpY2UnKSxcbiAgIFJvdXRlcjogcmVxdWlyZSgnY29yZS9yb3V0ZXInKSxcbiAgIFByb2plY3RzUmVnaXN0cnk6IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5JyksXG4gICBQcm9qZWN0U2VydmljZTogcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzZXJ2aWNlJyksXG4gICBNYXBTZXJ2aWNlOiByZXF1aXJlKCdjb3JlL21hcC9tYXBzZXJ2aWNlJyksXG4gICBNYXBRdWVyeVNlcnZpY2U6IHJlcXVpcmUoJ2NvcmUvbWFwL21hcHF1ZXJ5c2VydmljZScpLFxuICAgTWFwTGF5ZXI6IHJlcXVpcmUoJ2NvcmUvbWFwL21hcGxheWVyJyksXG4gICBMYXllclN0YXRlOiByZXF1aXJlKCdjb3JlL2xheWVyL2xheWVyc3RhdGUnKSxcbiAgIFZlY3RvckxheWVyOiByZXF1aXJlKCdjb3JlL2xheWVyL3ZlY3RvcmxheWVyJyksXG4gICBXbXNMYXllcjogcmVxdWlyZSgnY29yZS9sYXllci93bXNsYXllcicpLFxuICAgR2VvbWV0cnk6IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbWV0cnknKSxcbiAgIGdlb206IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbScpLFxuICAgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb246IHJlcXVpcmUoJ2NvcmUvaW50ZXJhY3Rpb25zL3BpY2tjb29yZGluYXRlc2ludGVyYWN0aW9uJyksXG4gICBQaWNrRmVhdHVyZUludGVyYWN0aW9uOiByZXF1aXJlKCdjb3JlL2ludGVyYWN0aW9ucy9waWNrZmVhdHVyZWludGVyYWN0aW9uJyksXG4gICBpMThuOiByZXF1aXJlKCdjb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJyksXG4gICBQbHVnaW46IHJlcXVpcmUoJ2NvcmUvcGx1Z2luL3BsdWdpbicpLFxuICAgUGx1Z2luc1JlZ2lzdHJ5OiByZXF1aXJlKCdjb3JlL3BsdWdpbi9wbHVnaW5zcmVnaXN0cnknKSxcbiAgIFBsdWdpbnNTZXJ2aWNlOiByZXF1aXJlKCdjb3JlL3BsdWdpbi9wbHVnaW5zc2VydmljZScpLFxuICAgVG9vbHNTZXJ2aWNlOiByZXF1aXJlKCdjb3JlL3BsdWdpbi90b29sc3NlcnZpY2UnKVxufTtcblxuZzN3Lmd1aSA9IHtcbiAgLy9HZW9jb2Rpbmc6IHJlcXVpcmUoJ2d1aS9jb21wb25lbnRzL2dlb2NvZGluZy9nZW9jb2RpbmcnKSxcbiAgU2VhcmNoOiByZXF1aXJlKCdndWkvY29tcG9uZW50cy9zZWFyY2gvc2VhcmNoJylcbn1cblxuKGZ1bmN0aW9uIChleHBvcnRzKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIGczdztcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cyl7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZzN3O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZXhwb3J0cy5nM3cgPSBnM3c7XG4gICAgfVxufSh0aGlzIHx8IHt9KSk7XG4iXX0=
