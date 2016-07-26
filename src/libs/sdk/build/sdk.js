(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.g3wsdk = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var reject = require('core/utils/utils').reject;

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
      return reject();
    }
  };
  
  base(this);
}
inherit(ApiService,G3WObject);

module.exports = new ApiService;

},{"core/g3wobject":3,"core/utils/utils":27}],2:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ApiService = require('core/apiservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var PluginsRegistry = require('core/plugin/pluginsregistry');

var ApplicationService = function(){
  this.secret = "### G3W Client Application Service ###";
  var self = this;
  this.initialized = false;
  this._modalOverlay = null;
  this.config = {};

  // chiama il costruttore di G3WObject (che in questo momento non fa niente)
  base(this);
  
  this.init = function(config){
    this._config = config;
    this._bootstrap();
  };
  
  this.getConfig = function() {
    return this._config;
  };
  
  this._bootstrap = function(){
    var self = this;
    if (!this.initialized){
      //inizializza la configurazione dei servizi. Ognungo cercherà dal config quello di cui avrà bisogno
      //una volta finita la configurazione emetto l'evento ready. A questo punto potrò avviare l'istanza Vue globale
      $.when(
        ApiService.init(this._config),
        ProjectsRegistry.init(this._config),
        PluginsRegistry.init(this._config.plugins)
      ).then(function(){
        self.emit('ready');
        this.initialized = true;
      });
    };
  };
};
inherit(ApplicationService,G3WObject);

module.exports = new ApplicationService;

},{"core/apiservice":1,"core/g3wobject":3,"core/plugin/pluginsregistry":17,"core/project/projectsregistry":21,"core/utils/utils":27}],3:[function(require,module,exports){
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

},{"core/utils/utils":27}],4:[function(require,module,exports){
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

},{"core/g3wobject":3,"core/geometry/geometry":5,"core/utils/utils":27}],10:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var truefnc = require('core/utils/utils').truefnc;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
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
    return resolve(relations);
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

},{"core/g3wobject":3,"core/utils/utils":27}],11:[function(require,module,exports){
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

},{"core/layer/layerstate":9,"core/map/maplayer":12,"core/utils/utils":27,"g3w-ol3/src/layers/rasters":36}],12:[function(require,module,exports){
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

},{"core/g3wobject":3,"core/utils/utils":27}],13:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var Geometry = require('core/geometry/geometry');
var ProjectsRegistry = require('core/project/projectsregistry');


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
    var Project = ProjectsRegistry.getCurrentProject();
    var layers;
    if (layerId) {
      layers = [Project.getLayer(layerId)];
    }
    else {
      layers = Project.getLayers();
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

},{"core/g3wobject":3,"core/geometry/geometry":5,"core/project/projectsregistry":21,"core/utils/utils":27}],14:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var ApplicationService = require('core/applicationservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectTypes = require('core/project/projecttypes');
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
  var Project = ProjectsRegistry.getCurrentService();
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
  this.config = ApplicationService.getConfig().map;
  
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
      var Project = ProjectsRegistry.getCurrentService();
      //$script("http://epsg.io/"+ProjectService.state.project.crs+".js");
      proj4.defs("EPSG:"+Project.state.project.crs, Project.state.project.proj4);
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
  
  ProjectsRegistry.on('setCurrentProject',function(){
    self.setupViewer();
  });
  
  Project.on('setCurrentProject',function(){
    self.setupLayers();
  });
  
  Project.onafter('setLayersVisible',function(layers){
    var mapLayers = _.map(layers,function(layer){
      return self.getMapLayerForLayer(layer);
    })
    self.updateMapLayers(mapLayers);
  });
  
  Project.onafter('setBaseLayer',function(){
    self.updateMapLayers(self.mapBaseLayers);
  });
  
  this.setLayersExtraParams = function(params,update){
    this.layersExtraParams = _.assign(this.layersExtraParams,params);
    this.emit('extraParamsSet',params,update);
  };
  
  this._setupViewer = function(){
    var extent = Project.state.extent;
    var projection = new ol.proj.Projection({
      code: "EPSG:"+Project.state.crs,
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
        /*center: this.config.initcenter || ol.extent.getCenter(extent),
        zoom: this.config.initzoom || 0,
        extent: this.config.constraintextent || extent,
        minZoom: this.config.minzoom || 0, // default di OL3 3.16.0
        maxZoom: this.config.maxzoom || 28 // default di OL3 3.16.0*/
        center: ol.extent.getCenter(extent),
        zoom: 0,
        extent: extent,
        minZoom: 0, // default di OL3 3.16.0
        maxZoom: 28 // default di OL3 3.16.0
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
                  var layer = Project.layers[layerName];
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
    
    var initBaseLayer = Project.state.initbaselayer;
    var baseLayersArray = Project.state.baseLayers;
    
    _.forEach(baseLayersArray,function(baseLayer){
      var visible = true;
      if (initBaseLayer) {
        visible = baseLayer.id == (initBaseLayer);
      }
      if (baseLayer.fixed) {
        visible = baseLayer.fixed;
      }
      baseLayer.visible = visible;
    })
    
    baseLayersArray.forEach(function(layer){     
      var config = {
        url: Project.getWmsUrl(),
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
    var layersArray = this.traverseLayersTree(Project.state.layerstree);
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
        url: Project.getWmsUrl(),
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
    GUI.on('ready',function(){
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
    var coordinates = ol.proj.transform(coordinates,'EPSG:4326','EPSG:'+Project.state.crs);
    this.goTo(coordinates,zoom);
  };
  
  this.extentToWGS84 = function(extent){
    return ol.proj.transformExtent(extent,'EPSG:'+Project.state.crs,'EPSG:4326');
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
    var projectType = Project.state.type;
    
    var mapLayer = this.mapLayers[this.layersAssociation[layerId]];
    var resolution = self.viewer.getResolution();
    var epsg = self.viewer.map.getView().getProjection().getCode();
    var params = {
      QUERY_LAYERS: Project.getLayer(layerId).name,
      INFO_FORMAT: "text/xml"
    }
    
    if (projectType == ProjectTypes.QDJANGO){
      var toleranceParams = PickToleranceParams[projectType];
      if (toleranceParams){
        var geometrytype = Project.getLayer(layerId).geometrytype;
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
      geometry.transform('EPSG:4326','EPSG:'+Project.state.crs);
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

module.exports = MapService

},{"core/applicationservice":2,"core/g3wobject":3,"core/geometry/geometry":5,"core/layer/wmslayer":11,"core/map/mapqueryservice":13,"core/project/projectsregistry":21,"core/project/projecttypes":22,"core/utils/utils":27,"g3w-ol3/src/controls/querycontrol":30,"g3w-ol3/src/controls/resetcontrol":31,"g3w-ol3/src/controls/zoomboxcontrol":32,"g3w-ol3/src/g3w.ol3":33,"g3w-ol3/src/interactions/pickcoordinatesinteraction":34,"gui/gui":41}],15:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function MapsRegistry() {
  base(this);
  
  this._mapsServices = {
  };
  
  this.addMap = function(mapService) {
    this._registerMapService(mapService);
  };
  
  this._registerMapService = function(mapService) {
    var mapService = this._mapsServices[mapService.id]
    if (_.isUndefined(mapService)) {
      this._mapsServices[mapService.id] = mapService;
    }
  };
} 
inherit(MapsRegistry,G3WObject);

module.exports = MapsRegistry;

},{"core/g3wobject":3,"core/utils/utils":27}],16:[function(require,module,exports){
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

},{"core/g3wobject":3,"core/utils/utils":27}],17:[function(require,module,exports){
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

},{"core/g3wobject":3,"core/plugin/toolsservice":19,"core/utils/utils":27}],18:[function(require,module,exports){
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

},{"core/g3wobject":3,"core/utils/utils":27}],19:[function(require,module,exports){
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

},{"core/g3wobject":3,"core/utils/utils":27}],20:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils//utils').base;
var G3WObject = require('core/g3wobject');
var ApplicationService = require('core/applicationservice');

function Project(projectConfig) {
  var self = this;
  
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
  this.state = projectConfig;
  
  this._layers = {};
  function traverse(obj){
    _.forIn(obj, function (layer, key) {
        //verifica che il valore dell'id non sia nullo
        if (!_.isNil(layer.id)) {
            self._layers[layer.id] = layer;
        }
        if (!_.isNil(layer.nodes)) {
            traverse(layer.nodes);
        }
    });
  }
  traverse(projectConfig.layerstree);
  
  /*var eventType = 'projectset';
  if (doswitch && doswitch === true) {
    eventType = 'projectswitch';
  }
  this.emit(eventType);*/
  
  this.setters = {
    setLayersVisible: function(layers,visible){
      _.forEach(layers,function(layer){
        self._layers[layer.id].visible = visible;
      })
    },
    setBaseLayer: function(id){
      _.forEach(self.state.baseLayers,function(baseLayer){
        baseLayer.visible = (baseLayer.id == id);
      })
    }
  };

  base(this);
}
inherit(Project,G3WObject);

var proto = Project.prototype;

proto.getLayer = function(id){
  return this._layers[id];
};

proto.getLayers = function(){
  return this._layers;
};

proto.getLayerById = function(id) {
  var layer = null;
  _.forEach(this.getLayers(),function(_layer){
    if (_layer.id == id){
      layer = _layer;
    }
  });
  return layer;
};

proto.getLayerByName = function(name) {
  var layer = null;
  _.forEach(this.getLayers(),function(_layer){
    if (_layer.name == name){
      layer = _layer;
    }
  });
  return layer;
};

proto.getQueryableLayers = function(){
  var queryableLayers = [];
  _.forEach(this.getLayers(),function(layer){
    if (LayerState.isQueryable(layer)){
      queryableLayers.push(layer);
    }
  });
  return queryableLayers;
};

proto.getLayerAttributes = function(id){
  return this._layers[id].attributes;
};

proto.getLayerAttributeLabel = function(id,name){
  var label = '';
  _.forEach(this._layers[id].attributes,function(attribute){
    if (attribute.name == name){
      label = attribute.label;
    }
  })
  return label;
};

proto.toggleLayer = function(layer,visible){
  var visible = visible || !layer.visible;
  this.setLayersVisible([layer],visible);
};

proto.toggleLayers = function(layers,visible){
  this.setLayersVisible(layers,visible);
};

proto.setGetWmsUrl = function(getWmsUrlFnc){
  this._getWmsUrlFnc = getWmsUrlFnc;
};

proto.getWmsUrl = function(){
  return this._getWmsUrlFnc(this.state);
};

proto.getLegendUrl = function(layer){
  var url = this.getWmsUrl();
  sep = (url.indexOf('?') > -1) ? '&' : '?';
  return this.getWmsUrl()+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
};

module.exports = Project;

},{"core/applicationservice":2,"core/g3wobject":3,"core/utils//utils":27,"core/utils/utils":27}],21:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var G3WObject = require('core/g3wobject');
var Project = require('core/project/project');


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
  this.projectType = null;
  
  this.setters = {
    setCurrentProject: function(project){
      this.state.currentProject = project;
    }
  };
  
  this.state = {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    currentProject: null
  };
  
  // tutte le configurazioni di base dei progetti, ma di cui non è detto che sia ancora disponibile l'istanza (lazy loading)
  this._pendingProjects = [];
  this._projects = {};
  
  base(this);
}
inherit(ProjectsRegistry, G3WObject);

var proto = ProjectsRegistry.prototype;

proto.init = function(config){
  var self = this;
  if (!this.initialized){
    this.initialized = true;
    this.config = config;
    //aggiunto tipo progetto
    this.projectType = this.config.group.overviewproject.type;
    this.setupState();
    return this.getProject(config.initproject)
    .then(function(project){
      self.setCurrentProject(project);
    });
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
    project.baselayers = self.config.baselayers;
    project.minscale = self.config.minscale;
    project.maxscale = self.config.maxscale;
    project.crs = self.config.crs;
    project.proj4 = self.config.proj4;
    self._pendingProjects.push(project);
  })
  //this.state.projects = config.group.projects;
};

proto.getProjectType = function() {
  return this.projectType;
};

proto.getPendingProjects = function() {
  return this._pendingProjects();
};

proto.getCurrentProject = function(){
  return this.state.currentProject;
};

// ottengo il progetto dal suo gid; ritorna una promise nel caso non fosse stato ancora scaricato il config completo (e quindi non sia ancora istanziato Project)
proto.getProject = function(projectGid){
  var self = this;
  var d = $.Deferred();
  var pendingProject = false;
  var project = null;
  this._pendingProjects.forEach(function(_pendingProject){
    if (_pendingProject.gid == projectGid) {
      pendingProject = _pendingProject;
      project = self._projects[projectGid];
    }
  })
  if (!pendingProject) {
    return reject("Project doesn't exist");
  }

  if (project){
    return d.resolve(project);
  }
  else{
    return this._getProjectFullConfig(pendingProject)
    .then(function(projectFullConfig){
      var projectConfig = _.merge(pendingProject,projectFullConfig);
      self._buildProjectTree(projectConfig);
      var project = new Project(projectConfig);
      project.setGetWmsUrl(self.config.getWmsUrl); // BRUTTO MA PER ORA SI TIENE COSI'
      self._projects[projectConfig.gid] = project;
      return d.resolve(project);
    });
  }
  
  return d.promise();
};
  
//ritorna una promises
proto._getProjectFullConfig = function(projectBaseConfig){
  var self = this;
  var deferred = $.Deferred();
  var url = this.config.getProjectConfigUrl(projectBaseConfig);
  $.get(url).done(function(projectFullConfig){
      deferred.resolve(projectFullConfig);
  })
  return deferred.promise();
};

proto._buildProjectTree = function(project){
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
  }
  traverse(layersTree);
  project.layerstree = layersTree;
};

module.exports = new ProjectsRegistry();

},{"core/g3wobject":3,"core/project/project":20,"core/utils/utils":27}],22:[function(require,module,exports){
var ProjectTypes = {
  QDJANGO: 'qdjango',
  OGR: 'ogr'
};

module.exports = ProjectTypes;
},{}],23:[function(require,module,exports){
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

},{"core/g3wobject":3,"core/utils/utils":27}],24:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var resolve = require('core/utils/utils').resolve;
var ProjectsRegistry = require('core/project/projectsregistry');


// FILTRI
var Filters = {
  eq: '=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '=<',
  LIKE: 'LIKE',
  ILIKE: 'ILIKE',
  AND: 'AND',
  OR: 'OR',
  NOT: '!='
};

function QueryQGISWMSProvider() {

  self = this;
  //funzione che fa la richiesta vera e propria al server qgis
  this.submitGetFeatureInfo = function(options) {

    var url = options.url || '';
    var querylayer = options.querylayer || null;
    var filter = options.filter || null;
    var bbox = options.bbox || ProjectsRegistry.getCurrentProject().state.extent.join(',');
    var simpleWmsSearchMaxResults = null;
    var crs = options.crs || '4326;'
    return $.get( url, {
        'SERVICE': 'WMS',
        'VERSION': '1.3.0',
        'REQUEST': 'GetFeatureInfo',
        'LAYERS': querylayer,
        'QUERY_LAYERS': querylayer,
        'FEATURE_COUNT': simpleWmsSearchMaxResults ||  50,
        'INFO_FORMAT': 'text/xml',
        'CRS': 'EPSG:'+ crs,
        'FILTER': filter,
        // Temporary fix for https://hub.qgis.org/issues/8656 (fixed in QGIS master)
        'BBOX': bbox // QUI CI VA IL BBOX DELLA MAPPA
      }
    );
   };

  //funzione che fa la ricerca
  this.doSearch = function(queryFilterObject) {

    var url = queryFilterObject.url;
    var querylayer = queryFilterObject.querylayer;
    var filterObject = queryFilterObject.filterObject;
    var crs = queryFilterObject.crs;
    //creo il filtro
    var filter = this.createFilter(filterObject, querylayer);
    //eseguo la richiesta e restituisco come risposta la promise del $.get
    var response = this.submitGetFeatureInfo({
      url: url,
      crs: crs,
      filter: filter,
      querylayer: querylayer
    });
    return response;
  };

  this.createFilter = function(filterObject, querylayer) {

    /////inserisco il nome del layer (typename) ///
    var filter = [];
    function createSingleFilter(booleanObject) {
      var filterElements = [];
      var filterElement = '';
      var valueExtra = "";
      var valueQuotes = "";
      var rootFilter;
      _.forEach(booleanObject, function(v, k, obj) {
        //creo il filtro root che sarà AND OR
        rootFilter = Filters[k];
        //qui c'è array degli elementi di un booleano
        _.forEach(v, function(input){
          //scorro su oggetto
          _.forEach(input, function(v, k, obj) {
          //verifico se il valore dell'oggetto è array e quindi è altro oggetto padre booleano
            if (_.isArray(v)) {
              filterElement = createSingleFilter(obj);
            } else { // è un oggetto operatore
              if (k == 'LIKE' || k == 'ILIKE') {
                valueExtra = "%";
              };
              filterOp = Filters[k];
              _.forEach(input, function(v, k, obj) {
                _.forEach(v, function(v, k, obj) {
                  //verifico se il valore non è un numero e quindi aggiungo singolo apice
                  if(isNaN(v)) {
                    valueQuotes = "'";
                  } else {
                    valueQuotes = "";
                  };
                  filterElement = "\"" + k + "\" "+ filterOp +" " + valueQuotes + valueExtra + v + valueExtra + valueQuotes;
                });
              });
            };
            filterElements.push(filterElement);
          });
        });
        rootFilter = filterElements.join(" "+ rootFilter + " ");
      });
      return rootFilter;
    };
    //assegno il filtro creato
    filter = querylayer + ":" + createSingleFilter(filterObject);
    return filter;
  };

};

inherit(QueryQGISWMSProvider, G3WObject);

module.exports =  new QueryQGISWMSProvider();

},{"core/g3wobject":3,"core/project/projectsregistry":21,"core/utils/utils":27}],25:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var resolve = require('core/utils/utils').resolve;
//definisco il filtro ol3
var ol3OGCFilter = ol.format.ogc.filter;

//oggetto che viene passato per effetturare il la search
var ol3GetFeatureRequestObject = {
  srsName: 'EPSG:',
  featureNS: '',
  featurePrefix: '',
  featureTypes: [],
  outputFormat: 'application/json',
  filter: null // esempio filtro composto ol3OGCFilter.and(ol3OGCFilter.bbox('the_geom', [1, 2, 3, 4], 'urn:ogc:def:crs:EPSG::4326'),ol3OGCFilter.like('name', 'New*'))
};

// FILTRI OL3
var ol3Filters = {
  eq: ol3OGCFilter.equalTo,
  gt: ol3OGCFilter.greaterThan,
  gte: ol3OGCFilter.greaterThanOrEqualTo,
  lt: ol3OGCFilter.lessThan,
  lte: ol3OGCFilter.lessThanOrEqualTo,
  like: ol3OGCFilter.like,
  ilike: "",
  bbox: ol3OGCFilter.bbox,
  AND: ol3OGCFilter.and,
  OR: ol3OGCFilter.or,
  NOT: ol3OGCFilter.not
};


// CREATO UN FILTRO DI ESEMPIO PER VERIFICARE LA CORRETTEZZA DELLA FUNZIONE CREAZIONE FILTRO
var testFilter = {
  'AND':
    [
      {
        eq:
          {
            gid : 10
          }
      },
      {
        'OR':
          [
            {
              eq: {
                pippo : 'lallo'
              }
            },
            {
              gt: {
                id : 5
              }
            }

          ]
      }
   ]
}
//////////////

///FILTRI CUSTOM
var standardFilterTemplates = function() {
  var common = {
    propertyName:
          "<PropertyName>" +
            "[PROP]" +
          "</PropertyName>",
    literal:
          "<Literal>" +
            "[VALUE]" +
          "</Literal>"
  };
  return {
    eq: "<PropertyIsEqualTo>" +
            common.propertyName +
            common.literal +
        "</PropertyIsEqualTo>",
    gt: "<PropertyIsGreaterThan>" +
            common.propertyName +
            common.literal +
         "</PropertyIsGreaterThan>",
    gte:"",
    lt: "",
    lte: "",
    like: "",
    ilike: "",
    AND: "<And>[AND]</And>",
    OR: "<Or>[OR]</Or>",
  }
}();

/////
var qgisFilterTemplates = {
  // codice qui
};

var mapserverFilterTemplates = {
  // codice qui
};

var geoserverFilterTemplates = {
  // codice qui
};

function QueryWFSProvider(){
  var self = this;
  var d = $.Deferred();
  var results = {
    headers:[],
    values:[]
  };

  this.doSearch = function(queryFilterObject){
    var ogcservertype = queryFilterObject.servertype;
    var url = queryFilterObject.url;
    var querylayer = queryFilterObject.querylayer;
    var filterObject = queryFilterObject.filterObject;
    var crs = queryFilterObject.crs;
    //setto il srs
    ol3GetFeatureRequestObject.srsName+=crs || '4326';
    var response, filter;
    switch (ogcservertype) {
      case 'OGC':
        filter = this.createStandardFilter(filterObject, querylayer);
        response = this.standardSearch(url, filter);
        return resolve(response)
        break;
      case 'qgis':
        filter = this.createQgisFilter(filterObject);
        response = this.qgisSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'mapserver':
        filter = this.createMapserverFilter(filterObject);
        response = this.mapserverSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'geoserver':
        filter = this.createGeoserverFilter(filterObject);
        response = this.geoserverSearch(querylayer, url, filter);
        return resolve(response)
        break;
      default:
        return false
    }
  };

  this.standardSearch = function(url, filter){
    console.log(filter)
  };
  this.createStandardFilter = function(filterObject, querylayer) {
    /////inserisco il nome del layer (typename) ///
    ol3GetFeatureRequestObject.featureTypes.push(querylayer);
    var filter = [];
    function createSingleFilter(booleanObject) {
      var filterElements = [];
      var filterElement = '';
      var rootFilter;
      _.forEach(booleanObject, function(v, k, obj) {
        //creo il filtro root che sarà AND OR
        rootFilter = ol3Filters[k];
        //qui c'è array degli elementi di un booleano
        _.forEach(v, function(input){
          //scorro su oggetto operatore
          _.forEach(input, function(v, k, obj) {
          //è un array e quindi è altro oggetto padre booleano
            if (_.isArray(v)) {
              filterElement = createSingleFilter(obj);
            } else {
              filterElement = ol3Filters[k];
              _.forEach(input, function(v, k, obj) {
                _.forEach(v, function(v, k, obj) {
                  filterElement = filterElement(k, v);
                });
              });
            };
            filterElements.push(filterElement);
          });
        });
        //verifico che ci siano almeno due condizione nel filtro AND. Nel caso di una sola condizione (esempio : un solo input)
        //estraggo solo l'elemento filtro altrimenti da errore -- DA VERIFICARE SE CAMBIARLO
        if (filterElements.length > 1) {
          rootFilter = rootFilter.apply(this, filterElements);
        } else {
          rootFilter = filterElements[0];
        };
      });
      return rootFilter;
    };
    //assegno il filtro creato
    ol3GetFeatureRequestObject.filter = createSingleFilter(filterObject);
    //creo il filtro utilizzando ol3
    filter = new ol.format.WFS().writeGetFeature(ol3GetFeatureRequestObject);
    return filter;
  };

  this.qgisSearch = function(urls, filter){
    $.get(searchUrl).then(function(result){
      self.emit("searchdone",result);
    });
    return d.promise();
  };
  this.createQGisFilter = function(filterObject) {
    var filter;
    return filter
  };
  this.mapserverSearch = function(querylayer, url, filter){
    return d.promise();
  };
  this.createMapserverFilter = function(filterObject) {
    var filter;
    return filter
  };
  this.geoserverSearch = function(querylayer, url, filter){
    return d.promise();
  };
  this.createGeoserverFilter = function(filterObject) {
    var filter;
    return filter
  };
  base(this);
}
inherit(QueryWFSProvider,G3WObject);

module.exports =  new QueryWFSProvider()


},{"core/g3wobject":3,"core/utils/utils":27}],26:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var QueryWFSProvider = require('./queryWFSProvider');
var QueryQGISWMSProvider = require('./queryQGISWMSProvider');

var Provider = {
  'QGIS': QueryQGISWMSProvider,
  'OGC': QueryWFSProvider
};

function SearchQueryService(){
  var self = this;
  this.url = "";
  this.filterObject = {};
  this.queryFilterObject = {};

  this.setFilterObject = function(filterObject){
    this.filterObject = filterObject;
  };

  this.getFilterObject = function() {
    return this.filterObject;
  };
  //dato l'oggetto filter restituito dal server ricostruisco la struttura del filterObject
  //interpretato da queryWMSProvider
  this.createQueryFilterFromConfig = function(filter) {

    var queryFilter = {};
    var attribute;
    var operator;
    var field;
    var operatorObject = {};
    var booleanObject = {};
    //funzione che costruisce l'oggetto operatore es. {'=':{'nomecampo':null}}
    function createOperatorObject(obj) {
      //rinizializzo a oggetto vuoto
      evalObject = {};
      //verifico che l'oggetto passato non sia a sua volta un oggetto 'BOOLEANO'
      _.forEach(obj, function(v,k) {
        if (_.isArray(v)) {
          return createBooleanObject(k,v);
        };
      });
      field = obj.attribute;
      operator = obj.op;
      evalObject[operator] = {};
      evalObject[operator][field] = null;
      return evalObject;
    };
    //functione che costruisce oggetti BOOLEANI caso AND OR contenente array di oggetti fornit dalla funzione createOperatorObject
    function createBooleanObject(booleanOperator, operations) {
      booleanObject = {};
      booleanObject[booleanOperator] = [];
      _.forEach(operations, function(operation){
        booleanObject[booleanOperator].push(createOperatorObject(operation));
      })
      return booleanObject;
    };
    /*
    // vado a creare l'oggetto filtro principale. Questo è un oggetto che contiene l'operatore booleano come root (chiave)
    // come valore un array di oggetti operatori che contengono il tipo di operatore come chiave e come valore un oggetto contenete
    // nome campo e valore passato
    */
    _.forEach(filter, function(v,k,obj) {
      queryFilter = createBooleanObject(k,v);
    });
    return queryFilter;
  };

  this.createQueryFilterObject = function(layerId, filterObject){
    var layerInfo = this.getLayerInfoUrlFromProjectConfig(layerId);
    return {
      type: 'standard',
      url: layerInfo.url,
      querylayer: layerInfo.name,
      servertype: layerInfo.servertype,
      crs: layerInfo.crs,
      filterObject : filterObject
    };
  };

  this.getLayerInfoUrlFromProjectConfig = function(layerId) {
    var layerFilterInfo = {};
    var Project = ProjectsRegistry.getCurrentProject();
    var layerInfo = Project.getLayerById(layerId);
    if (layerInfo) {
      layerFilterInfo.name = layerInfo.name;
      layerFilterInfo.crs = layerInfo.crs;
      layerFilterInfo.servertype = layerInfo.servertype;
      if (layerInfo.source && layerInfo.source.url){
        layerFilterInfo.url = layerInfo.source.url;
      } else {
        layerFilterInfo.url = Project.getWmsUrl();
      };
    };
    return layerFilterInfo;
  };

  this.doQuerySearch = function(queryFilterObject) {
    var provider = Provider[queryFilterObject.servertype];
    provider.doSearch(queryFilterObject)
    .then(function(result){
      console.log(result);
      self.emit("searchresults", result)
    });
  };
  base(this);
}
inherit(SearchQueryService,G3WObject);

module.exports =  new SearchQueryService


},{"./queryQGISWMSProvider":24,"./queryWFSProvider":25,"core/g3wobject":3,"core/project/projectsregistry":21,"core/utils/utils":27}],27:[function(require,module,exports){

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
  
  resolve: function(value){
    var deferred = $.Deferred();
    deferred.resolve(value);
    return deferred.promise();
  },
  
  reject: function(value){
    var deferred = $.Deferred();
    deferred.reject(value);
    return deferred.promise();
  },
  
  Base64: Base64
};

module.exports = utils;

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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

},{"./control":28}],30:[function(require,module,exports){
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

},{"../interactions/pickcoordinatesinteraction":34,"../utils":38,"./interactioncontrol":29}],31:[function(require,module,exports){
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

},{"../utils":38,"./interactioncontrol":29}],32:[function(require,module,exports){
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

},{"../utils":38,"./interactioncontrol":29}],33:[function(require,module,exports){
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

},{"./map/maphelpers":37,"./utils":38}],34:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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


},{"../utils":38}],37:[function(require,module,exports){
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
  
  var view;
  if (opts.view instanceof ol.View) {
    view = opts.view;
  }
  else {
    view = new ol.View(opts.view);
  }
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

_Viewer.prototype.getView = function() {
  return this.map.getView();
}

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

},{"../layers/bases":35}],38:[function(require,module,exports){
var utils = {
  merge: function(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  }
}

module.exports = utils;

},{}],39:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

var Component = function(options) {
  var options = options || {};
  this.id = options.id || Math.random() * 1000;
  this.title = options.title || '';
  this.internalComponent = null;
};
inherit(Component,G3WObject);

var proto = Component.prototype;

proto.getId = function(){
  return self.id;
};

proto.getName = function() {
  return self.name;
};

proto.getTitle = function(){
  return self.title;
};

/* HOOKS */

/* 
 * Il metodo permette al componente di montarsi nel DOM
 * parentEl: elemento DOM padre, su cui inserirsi; 
 * ritorna una promise, risolta nel momento in cui sarà terminato il montaggio
*/
proto.mount = function(parent){};

/*
 * Metodo richiamato quando si vuole rimuovere il componente.
 * Ritorna una promessa che sarà risolta nel momento in cui il componente avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){};

/* 
 * Metodo (opzionale) che offre l'opportunità di ricalcolare proprietà dipendenti dalle dimensioni del padre
 * parentHeight: nuova altezza del parent
 * parentWidth: nuova larghezza del parent
 * richiamato ogni volta che il parent subisce un ridimensionamento
*/
proto.onResize = function(parentWidth,parentHeight){};


module.exports = Component;

},{"core/g3wobject":3,"core/utils/utils":27}],40:[function(require,module,exports){
var G3WObject = require('core/g3wobject');
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

function ComponentsRegistry() {
  this.components = {};
  
  this.addComponent = function(component) {
    var id = component.getId();
    if (!this.components[id]) {
      this.components[id] = component;
    }
  }; 
  
  this.getComponent = function(id) {
    return this.components[id];
  };
  
  this.removeComponent = function(id) {
    var component = this._components[id];
    if (component) {
      if (_.isFunction(component.destroy)) {
        component.destroy();
      }
      delete component;
      this._components[id] = null;
    }
  };
}
inherit(ComponentsRegistry,G3WObject);

module.exports = new ComponentsRegistry;

},{"core/g3wobject":3,"core/utils/utils":27}],41:[function(require,module,exports){
noop = require('core/utils/utils').noop;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var ComponentsRegistry = require('gui/componentsregistry');

// rappresenta l'interfaccia globale dell'API della GUI. 
// metodi devono essere implementati (definiti) dall'applicazione ospite
// l'app ospite dovrebbe chiamare anche la funzione GUI.ready() quando la UI è pronta
function GUI(){
  // url delle risorse (immagini, ecc.)
  this.getResourcesUrl = noop;
  // show a Vue form
  this.showForm = noop;
  this.closeForm = noop;
  
  // mostra una lista di oggetti (es. lista di risultati)
  this.showListing = noop;
  this.closeListing = noop;
  this.hideListing = noop;

  /* panel */
  this.showPanel = noop;
  this.hidePanel = noop;

  //metodi componente
  this.addComponent = noop;
  this.removeComponent = noop;
  this.getComponent = function(id) {
    return ComponentsRegistry.getComponent(id);
  };
  //fine metodi componente

  this.ready = function(){
    this.emit('ready');
  };
  
  this.guiResized = function(){
    this.emit('guiresized');
  };

  /* spinner */
  this.showSpinner = noop; // per mostrare un'icona spinner che notifica un caricamento dati in corso
  this.hideSpinner = noop;
  
  this.notify = noop;
  this.dialog = noop;
}

inherit(GUI,G3WObject);

module.exports = new GUI;

},{"core/g3wobject":3,"core/utils/utils":27,"gui/componentsregistry":40}],42:[function(require,module,exports){
module.exports = "<div>\n  Lista di oggetti\n</div>\n";

},{}],43:[function(require,module,exports){
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var GUI = require('gui/gui');
var MapService = require('core/map/mapservice');

var ListPanelComponent = Vue.extend({
  template: require('./listpanel.html'),
  methods: {
    exec: function(cbk){
      var relations = this.state.relations || null;
      cbk(this.state.fields,relations);
      GUI.closeForm();
    }
  }
});


function ListPanel(options){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.panelComponent = null;
  this.options =  options || {};
  this.id = options.id || null; // id del form
  this.name = options.name || null; // nome del form
  
  this.state = {
    list: options.list || []
  }
  
  this._listPanelComponent = options.listPanelComponent || ListPanelComponent;
}

var proto = ListPanel.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  var panel = this._setupPanel();
  this._mountPanel(panel,container);
  return resolve(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
  this.panelComponent.$destroy(true);
  this.panelComponent = null;
  return resolve(true);
};

proto._setupPanel = function(){
  var panel = this.panelComponent = new this._listPanelComponent({
    panel: this
  });
  panel.state = this.state;
  return panel
};

proto._mountPanel = function(panel,container){
  panel.$mount().$appendTo(container);
};

module.exports = {
  ListPanelComponent: ListPanelComponent,
  ListPanel: ListPanel
}

},{"./listpanel.html":42,"core/map/mapservice":14,"core/utils/utils":27,"gui/gui":41}],44:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var ApplicationService = require('core/applicationservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectTypes = require('core/project/projecttypes');
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

function MapService(project){
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
  this.config = ApplicationService.getConfig().map;
  
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
  
  if(!_.isNil(project)) {
    this.project = project;
  }
  else {
    this.project = ProjectsRegistry.getCurrentProject();
  }
  
  
  this.setters = {
    setMapView: function(bbox,resolution,center){
      this.state.bbox = bbox;
      this.state.resolution = resolution;
      this.state.center = center;
      this.updateMapLayers(this.mapLayers);
    },
    setupViewer: function(){
      //$script("http://epsg.io/"+ProjectService.state.project.crs+".js");
      proj4.defs("EPSG:"+self.project.state.crs,this.project.state.proj4);
      if (self.viewer) {
        self.viewer.destroy();
        self.viewer = null;
      }
      self._setupViewer();
      self.setupControls();
      self.setupLayers();
      self.emit('viewerset');
    }
  };
  
  this._setupViewer = function(){
    var extent = this.project.state.extent;
    var projection = new ol.proj.Projection({
      code: "EPSG:"+this.project.state.crs,
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
        /*center: this.config.initcenter || ol.extent.getCenter(extent),
        zoom: this.config.initzoom || 0,
        extent: this.config.constraintextent || extent,
        minZoom: this.config.minzoom || 0, // default di OL3 3.16.0
        maxZoom: this.config.maxzoom || 28 // default di OL3 3.16.0*/
        center: ol.extent.getCenter(extent),
        zoom: 0,
        extent: extent,
        minZoom: 0, // default di OL3 3.16.0
        maxZoom: 28 // default di OL3 3.16.0
      }
    });
    
    this.viewer.map.on('moveend',function(e){
      self._setMapView();
    });
    
    MapQueryService.init(this.viewer.map);
    
    this.emit('ready');
  };
  
  this.project.on('projectset',function(){
    self.setupViewer();
  });
  
  this.project.on('projectswitch',function(){
    self.setupLayers();
  });
  
  this.project.onafter('setLayersVisible',function(layers){
    var mapLayers = _.map(layers,function(layer){
      return self.getMapLayerForLayer(layer);
    })
    self.updateMapLayers(mapLayers);
  });
  
  this.project.onafter('setBaseLayer',function(){
    self.updateMapLayers(self.mapBaseLayers);
  });
  
  base(this);
  
  this.setupViewer();
};

inherit(MapService,G3WObject);

var proto = MapService.prototype;

// rende questo mapservice slave di un altro MapService
proto.slaveOf = function(mapService, sameLayers){
  // se impostare i layer iniziali uguali a quelli del mapService master
  var sameLayers = sameLayers || false;
};

proto.setLayersExtraParams = function(params,update){
  this.layersExtraParams = _.assign(this.layersExtraParams,params);
  this.emit('extraParamsSet',params,update);
};

proto.getMap = function() {
  return this.viewer.map;
};

proto.getViewerElement = function(){
  return this.viewer.map.getTargetElement();
};

proto.getViewport = function(){
  return this.viewer.map.getViewport();
};

proto.setupControls = function(){
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
                var layer = this.project.layers[layerName];
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

proto.addControl = function(control){
  this.viewer.map.addControl(control);
};

proto.setupBaseLayers = function(){
  if (!this.project.state.baselayers){
    return;
  }
  var self = this;
  this.mapBaseLayers = {};
  
  var initBaseLayer = ProjectsRegistry.config.initbaselayer;
  var baseLayersArray = this.project.state.baselayers;
  
  _.forEach(baseLayersArray,function(baseLayer){
    var visible = true;
    if (this.project.state.initbaselayer) {
      visible = baseLayer.id == (this.project.state.initbaselayer);
    }
    if (baseLayer.fixed) {
      visible = baseLayer.fixed;
    }
    baseLayer.visible = visible;
  })
  
  baseLayersArray.forEach(function(layer){     
    var config = {
      url: this.project.getWmsUrl(),
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

proto.setupLayers = function(){
  var self = this;
  this.viewer.removeLayers();
  this.setupBaseLayers();
  
  this.mapLayers = {};
  this.layersAssociation = {};
  var layersArray = this.traverseLayersTree(this.project.state.layerstree);
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
      url: self.project.getWmsUrl(),
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

proto.updateMapLayers = function(mapLayers) {
  var self = this;
  _.forEach(_.values(mapLayers),function(mapLayer){
    mapLayer.update(self.state,self.layersExtraParams);
  })
};

proto.getMapLayerForLayer = function(layer){
  return this.mapLayers['layer_'+layer.multilayer];
};

proto.traverseLayersTree = function(layersTree){
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

proto.registerListeners = function(mapLayer){
  var self = this;
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

proto.showViewer = function(elId){
  var self = this;
  this.viewer.setTarget(elId);
  var map = this.viewer.map;
  GUI.on('ready',function(){
    self._setMapView();
  });
};


// per creare una pila di ol.interaction in cui l'ultimo che si aggiunge disattiva temporaemente i precedenti (per poi togliersi di mezzo con popInteraction!)
// Usato ad es. da pickfeaturetool e getfeatureinfo
proto.pushInteraction = function(interaction){
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

proto.popInteraction = function(){
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

proto.goTo = function(coordinates,zoom){
  var zoom = zoom || 6;
  this.viewer.goTo(coordinates,zoom);
};

proto.goToWGS84 = function(coordinates,zoom){
  var coordinates = ol.proj.transform(coordinates,'EPSG:4326','EPSG:'+this.project.state.crs);
  this.goTo(coordinates,zoom);
};

proto.extentToWGS84 = function(extent){
  return ol.proj.transformExtent(extent,'EPSG:'+this.project.state.crs,'EPSG:4326');
};

proto.getFeatureInfo = function(layerId){
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

proto._completeGetFeatureInfo = function(layerId,coordinate,deferred){
  var self = this;
  var projectType = this.project.state.type;
  
  var mapLayer = this.mapLayers[this.layersAssociation[layerId]];
  var resolution = self.viewer.getResolution();
  var epsg = self.viewer.map.getView().getProjection().getCode();
  var params = {
    QUERY_LAYERS: Project.getLayer(layerId).name,
    INFO_FORMAT: "text/xml"
  }
  
  if (projectType == ProjectTypes.QDJANGO){
    var toleranceParams = PickToleranceParams[projectType];
    if (toleranceParams){
      var geometrytype = this.project.getLayer(layerId).geometrytype;
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

proto.highlightGeometry = function(geometryObj,options){    
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
    geometry.transform('EPSG:4326','EPSG:'+this.project.project.crs);
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

proto.refreshMap = function(){
  _.forEach(this.mapLayers,function(wmsLayer){
    wmsLayer.getLayer().getSource().updateParams({"time": Date.now()});
  })
};

proto._setMapView = function(){
  var bbox = this.viewer.getBBOX();
  var resolution = this.viewer.getResolution();
  var center = this.viewer.getCenter();
  this.setMapView(bbox,resolution,center);
};

module.exports = MapService

},{"core/applicationservice":2,"core/g3wobject":3,"core/geometry/geometry":5,"core/layer/wmslayer":11,"core/map/mapqueryservice":13,"core/project/projectsregistry":21,"core/project/projecttypes":22,"core/utils/utils":27,"g3w-ol3/src/controls/querycontrol":30,"g3w-ol3/src/controls/resetcontrol":31,"g3w-ol3/src/controls/zoomboxcontrol":32,"g3w-ol3/src/g3w.ol3":33,"g3w-ol3/src/interactions/pickcoordinatesinteraction":34,"gui/gui":41}],45:[function(require,module,exports){
module.exports = "<div id=\"map\" style=\"width:100%;height:100%\">\n</div>\n";

},{}],46:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');   
var Component = require('gui/vue/component');
var RouterService = require('core/router');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var MapsRegistry = require('core/map/mapsregistry');
var MapService = require('../mapservice');

function mainHeight(){
  //return $(window).innerHeight()-$(".navbar").innerHeight();
  //return $(window).innerHeight();
  var topHeight = $(".navbar").innerHeight();
  var bottomHeight = 0;
  
  if ($(".bottombar").is(":visible")) {
    bottomHeight = $(".bottombar").innerHeight()
  }
  return $(window).innerHeight() - topHeight - bottomHeight;
}

/* map resize calculations */
function setMapDivHeight(map){
  var height = mainHeight();
  $("#map").height(height);
  map.updateSize();
}

function setMapDivWidth(map){
  var offset = $(".main-sidebar").offset().left;
  var width = $(".main-sidebar").innerWidth();
  var sideBarSpace = width + offset;
  $("#map").width($(window).innerWidth() - sideBarSpace);
  map.updateSize();
}

var vueComponentOptions = {
  template: require('./map.html'),
  ready: function(){
    var self = this;
    
    var mapService = this.$options.mapService;
    
    mapService.showViewer(this.$el.id);
    
    // questo serve per quando viene cambiato progetto/vista cartografica, in cui viene ricreato il viewer (e quindi la mappa)
    mapService.onafter('setupViewer',function(){
      mapService.showViewer(self.$el.id);
    });
    
    GUI.on('ready',function(){
      setMapDivHeight(mapService.getMap());
      
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function () {
          $(this).trigger('trans-end');
          setMapDivWidth(mapService.getMap());
      });
      
      var drawing = false;
      var resizeFired = false;
      
      GUI.on('guiresized',function(){
        resizeFired = true;
        drawResize();
      });
      
      $(window).resize(function() {
        // set resizedFired to true and execute drawResize if it's not already running
        if (drawing === false) {
            resizeFired = true;
            drawResize();
        }
      });

      function drawResize() {
        var height;
        // render friendly resize loop
        if (resizeFired === true) {
            resizeFired = false;
            drawing = true;
            setMapDivHeight(mapService.getMap());
            setMapDivWidth(mapService.getMap());
            requestAnimationFrame(drawResize);
        } else {
            drawing = false;
        }
      }
      
    })
  }
}

var InternalComponent = Vue.extend(vueComponentOptions);

Vue.component('g3w-map', vueComponentOptions);

function MapComponent(options){
  base(this,options);
  this.id = "map-component";
  this.title = "Catalogo dati";
  this.mapService = new MapService;
  merge(this, options);
  this.internalComponent = new InternalComponent({
    mapService: this.mapService
  });
}
inherit(MapComponent, Component);

var proto = MapComponent.prototype;

module.exports =  MapComponent;

},{"../mapservice":44,"./map.html":45,"core/i18n/i18n.service":6,"core/map/mapsregistry":15,"core/router":23,"core/utils/utils":27,"g3w-ol3/src/g3w.ol3":33,"gui/gui":41,"gui/vue/component":63}],47:[function(require,module,exports){
var localize = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var resolvedValue = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');

var Panel = function(options) {
  self = this;
  var options = options || {};
  self.id = options.id || null;
  self.title = options.title || '';
};

inherit(Panel, G3WObject);

var proto = Panel.prototype;

proto.getId = function(){
  return self.id;
};

proto.getTitle = function(){
  return self.title;
};

/* HOOKS */

/*
 * Il metodo permette al pannello di montarsi nel DOM
 * parent: elemento DOM padre, su cui inserirsi;
 * ritorna una promise, risolta nel momento in cui sarà terminato il montaggio
*/

// SONO DUE TIPOLOGIE DI MONTAGGIO CON IL QUALE IL PANNELLO
// CHE VERRA' MONTATO AL VOLO CON IL METODO MOUNT A SECONDA DEL TIPO DI PANNELLO RICHIESTO

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso

proto.mount = function(parent) {
  var panel = this.InternalPanel;
  panel.$mount().$appendTo(parent);
  localize();
  return resolvedValue(true);
};

/*
 * Metodo richiamato quando si vuole rimuovere il panello.
 * Ritorna una promessa che sarà risolta nel momento in cui il pannello avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){
  var panel = this.InternalPanel;
  var deferred = $.Deferred();
  panel.$destroy(true);
  deferred.resolve();
  return deferred.promise();
};

/*
 * Metodo (opzionale) che offre l'opportunità di ricalcolare proprietà dipendenti dalle dimensioni del padre
 * parentHeight: nuova altezza del parent
 * parentWidth: nuova larghezza del parent
 * richiamato ogni volta che il parent subisce un ridimensionamento
*/
proto.onResize = function(parentWidth,parentHeight){};


module.exports = Panel;

},{"core/g3wobject":3,"core/i18n/i18n.service":6,"core/utils/utils":27}],48:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var G3WObject = require('core/g3wobject');
var SearchPanel = require('gui/search/vue/panel/searchpanel');

function SearchesService(){
  var self = this;
  this.init = function(searchesObject) {
    var searches = searchesObject || ProjectsRegistry.getCurrentProject().state.search;
    this.state.searches = searches;
  };

  this.state = {
    searches: []
  };

  this.showSearchPanel = function(panelConfig) {
    panel = new SearchPanel();// creo panello search
    panel.init(panelConfig);//inizializzo pannello serach
    GUI.showPanel(panel);
    return panel;
  };

  this.cleanSearchPanels = function() {
    this.state.panels = {};
  };

  this.stop = function(){
    var deferred = $.Deferred();
    deferred.resolve();
    return deferred.promise();
  };
};

// Make the public service en Event Emitter
inherit(SearchesService, G3WObject);

module.exports = new SearchesService();

},{"core/g3wobject":3,"core/project/projectsregistry":21,"core/utils/utils":27,"gui/gui":41,"gui/search/vue/panel/searchpanel":50}],49:[function(require,module,exports){
module.exports = "<div class=\"g3w-search-panel form-group\">\n  <form id=\"g3w-search-form\">\n    <template v-for=\"forminput in forminputs\">\n       <template v-if=\"forminput.input.type == 'numberfield'\" class=\"numeric\">\n         <label for=\"{{ forminput.id }} \">{{ forminput.label }}</label>\n         <input type=\"number\" v-model=\"formInputValues[$index].value\" class=\"form-control\" id=\"{{ forminput.id }}\">\n       </template>\n      <template v-if=\"forminput.input.type == 'textfield'\" class=\"text\">\n         <label for=\"{{ forminput.id }}\">{{ forminput.label }}</label>\n         <input type=\"text\" v-model=\"formInputValues[$index].value\" class=\"form-control\" id=\"{{ forminput.id }}\">\n       </template>\n    </template>\n    <button class=\"btn btn-primary\" @click=\"doSearch($event)\" data-i18n=\"dosearch\">Search</button>\n  </form>\n</div>\n";

},{}],50:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var localize = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');
var SearchQueryService = require('core/search/searchqueryservice');
var ListPanel = require('gui/listpanel').ListPanel;
var Panel = require('gui/panel');
var SearchResultPanelComponent = require('gui/search/vue/results/resultpanel');
var ProjectsRegistry = require('core/project/projectsregistry');

//componente vue pannello search
var SearchPanelComponet = Vue.extend({
  template: require('./searchpanel.html'),
  data: function() {
    return {
      forminputs: [],
      filterObject: {},
      formInputValues : []
    }
  },
  methods: {
    doSearch: function(event) {
      event.preventDefault();
      //al momento molto farragginoso ma da rivedere
      //per associazione valore input
      this.filterObject = fillFilterInputsWithValues(this.filterObject, this.formInputValues);
      SearchQueryService.doQuerySearch(this.filterObject);
    }
  }
});

//funzione che associa i valori dell'inputs form al relativo oggetto "operazionde del filtro"

function fillFilterInputsWithValues (filterObject, formInputValues, globalIndex) {
  //funzione conversione da valore restituito dall'input (sempre stringa) al vero tipo di valore
  function convertInputValueToInputType(type, value) {
    switch(type) {
      case 'numberfield':
           value = parseInt(value);
           break;
      default:
           break;
    }
    return value;
  }
  //ciclo sull'oggetto filtro che ha come chiave root 'AND' o 'OR'
  _.forEach(filterObject.filterObject, function(v,k) {
    //scorro attraverso l'array di elementi operazionali da confrontare
    _.forEach(v, function(input, idx) {
      //elemento operazionale {'=':{}}
      _.forEach(input, function(v, k, obj) {
        //vado a leggere l'oggetto attributo
        if (_.isArray(v)) {
          //richiama la funzione ricorsivamente .. andrà bene ?
          fillFilterInputsWithValues(input, formInputValues, idx);
        } else {
          _.forEach(v, function(v, k, obj) {
            //considero l'index globale in modo che inputs di operazioni booleane interne
            //vengono considerate
            index = (globalIndex) ? globalIndex + idx : idx;
            obj[k] = convertInputValueToInputType(formInputValues[index].type, formInputValues[index].value);
          });
        };
      });
    });
  });
  return filterObject;
};

//costruttore del pannello e del suo componente vue
function SearchPanel() {
  self = this;
  this.config = {};
  this.filter = {};
  this.id = null;
  this.querylayerid = null;
  this.InternalPanel = new SearchPanelComponet();
  //funzione inizializzazione
  this.init = function(config) {
    this.config = config || {};
    this.name = this.config.name || this.name;
    this.id = this.config.id || this.id;
    this.filter = this.config.options.filter || this.filter;
    this.querylayerid = this.config.options.querylayerid || this.querylayerid;
    //vado a riempire gli input del form del pannello
    this.fillInputsFormFromFilter();
    //creo e assegno l'oggetto filtro
    var filterObjFromConfig = SearchQueryService.createQueryFilterFromConfig(this.filter);
    //alla fine creo l'ggetto finale del filtro da passare poi al provider QGISWMS o WFS etc.. che contiene sia
    //il filtro che url, il nome del layer il tipo di server etc ..
    this.InternalPanel.filterObject = SearchQueryService.createQueryFilterObject(this.querylayerid, filterObjFromConfig);
  };

  //funzione che popola gli inputs che ci saranno nel form del pannello ricerca
  //oltre costruire un oggetto che legherà i valori degli inputs del form con gli oggetti
  //'operazionali' del filtro
  this.fillInputsFormFromFilter = function() {
    var id = 0;
    var formValue;
    _.forEach(this.filter,function(v,k,obj) {
      _.forEach(v, function(input){
        //sempre nuovo oggetto
        formValue = {};
        //inserisco l'id all'input
        input.id = id
        //aggiungo il tipo al valore per fare conversione da stringa a tipo input
        formValue.type = input.input.type;
        ////TEMPORANEO !!! DEVO PRENDERE IL VERO VALORE DI DEFAULT
        formValue.value = null;
        //popolo gli inputs:

        // valori
        self.InternalPanel.formInputValues.push(formValue);
        //input
        self.InternalPanel.forminputs.push(input);
        id+=1;
      });
    });
  };
};

inherit(SearchPanel, Panel);

//search query
SearchQueryService.on("searchresults",function(results){
  var listPanel = new ListPanel({
    name: "Risultati ricerca",
    id: 'nominatim_results',
    list: results,
    listPanelComponent: SearchResultPanelComponent
  });
  GUI.showListing(listPanel);
});

module.exports = SearchPanel;

},{"./searchpanel.html":49,"core/i18n/i18n.service":6,"core/project/projectsregistry":21,"core/search/searchqueryservice":26,"core/utils/utils":27,"gui/gui":41,"gui/listpanel":43,"gui/panel":47,"gui/search/vue/results/resultpanel":52}],51:[function(require,module,exports){
module.exports = "<div id=\"search-results\">\n  <table style=\"width:100px;\" id=\"search-results-table\">\n    <thead>\n      <tr>\n        <th v-for=\"header in state.list.headers\"  style=\"cursor:pointer\">{{ header }}</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr v-for=\"values in state.list.values\" style=\"cursor:pointer\">\n        <td v-for=\"value in values\">\n          {{ value }}\n        </td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n";

},{}],52:[function(require,module,exports){
var SearchResultPanelComponent = Vue.extend({
  template: require('./resultpanel.html'),
  methods: {},
  created: function(){
    $("#search-results-table").footable({
      calculateWidthOverride: function(){
        return {
          width: $('#search-results').width()
        }
      }
    });
  }
});

module.exports = SearchResultPanelComponent;

},{"./resultpanel.html":51}],53:[function(require,module,exports){
module.exports = "<div id=\"g3w-search\" class=\"g3w-search g3w-tools\">\n  <ul>\n    <li v-for=\"search in searches.search\">\n      <div style=\"margin-bottom: 5px;\"class=\"search-header tool-header\" @click=\"showSearchPanel(search)\">\n        <span style=\"\">{{ search.name }}</span>\n      </div>\n    </li>\n  </ul>\n</div>\n\n";

},{}],54:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var Component = require('gui/vue/component');
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var G3WObject = require('core/g3wobject');
var SearchPanel = require('gui/search/vue/panel/searchpanel');
var ProjectsRegistry = require('core/project/projectsregistry');
var SearchesService = require('gui/search/searchesservice');

var vueComponentOptions = {
   template: require('./search.html'),
   data: function() {
    	return {
    	  searches: ProjectsRegistry.getCurrentProject().state
    	};
   },
   methods: {
    showSearchPanel: function(search) {
        var panel = SearchesService.showSearchPanel(search);
    }
  }
};

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);
// se lo voglio usare come componente come elemento html
//Vue.component('g3w-search',vueComponentOptions);

/* COMPONENTI FIGLI */
/* FINE COMPONENTI FIGLI */

/* INTERFACCIA PUBBLICA */
function SearchComponent(options){
  base(this,options);
  this.id = "search-component";
  this.title = "search";
  this.internalComponent = new InternalComponent;
  merge(this, options);
  this.initService = function() {
    //inizializzo il servizio
    SearchesService.init();
  };
};

inherit(SearchComponent, Component);


module.exports = SearchComponent;

},{"./search.html":53,"core/g3wobject":3,"core/i18n/i18n.service":6,"core/project/projectsregistry":21,"core/utils/utils":27,"gui/gui":41,"gui/search/searchesservice":48,"gui/search/vue/panel/searchpanel":50,"gui/vue/component":63}],55:[function(require,module,exports){
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

module.exports = ToolsService

},{"core/g3wobject":3,"core/utils/utils":27}],56:[function(require,module,exports){
module.exports = "<div class=\"g3w-tools\">\n  <ul>\n    <li v-for=\"tool in tools\">\n      <div data-toggle=\"collapse\" data-target=\"#iternet-tools\" class=\"tool-header\">\n        <span style=\"\">{{ tool.name }}</span>\n      </div>\n      <div id=\"iternet-tools\" class=\"tool-box collapse\">\n        <template v-for=\"action in tool.actions\">\n          <i class=\"glyphicon glyphicon-cog\"></i>\n          <span @click=\"fireAction(action.id)\">{{ action.name }}</span>\n        </template>\n      </div>\n    </li>\n  </ul>\n</div>\n";

},{}],57:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');

var ToolsService = require('gui/tools/toolsservice');

var InternalComponent = Vue.extend({
    template: require('./tools.html'),
    data: function() {
      return {
        //tools: ToolsService.state.tools
      }
    },
    methods: {
      fireAction: function(actionid){
        //ToolsService.fireAction(actionid);
      }
    }
});

function ToolsComponent(options){
  base(this,options);
  this.id = "tools-component";
  this.title = "tools";
  this.toolsService = new ToolsService();
  merge(this, options);
  this.internalComponent = new InternalComponent({
    toolsService: this.toolsService
  });
}

inherit(ToolsComponent, Component);

module.exports = ToolsComponent;

},{"./tools.html":56,"core/i18n/i18n.service":6,"core/utils/utils":27,"gui/tools/toolsservice":55,"gui/vue/component":63}],58:[function(require,module,exports){
module.exports = "<!-- item template -->\n<div id=\"catalog\" class=\"tabbable-panel catalog\">\n  <div class=\"tabbable-line\">\n    <ul class=\"nav nav-tabs\" role=\"tablist\">\n      <li role=\"presentation\" class=\"active\"><a href=\"#tree\" aria-controls=\"tree\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"tree\">Data</a></li>\n      <li v-if=\"hasBaseLayers\" role=\"presentation\"><a href=\"#baselayers\" aria-controls=\"baselayers\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"baselayers\">Layer Base</a></li>\n      <li role=\"presentation\"><a href=\"#legend\" aria-controls=\"legend\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"legend\">Legenda</a></li>\n    </ul>\n    <div  class=\"tab-content\">\n      <div role=\"tabpanel\" class=\"tab-pane active tree\" id=\"tree\">\n        <ul class=\"tree-root\">\n          <tristate-tree v-if=\"!isHidden\" :layerstree=\"layerstree\" class=\"item\" v-for=\"layerstree in layerstree\">\n          </tristate-tree>\n        </ul>\n      </div>\n      <div v-if=\"hasBaseLayers\" role=\"tabpanel\" class=\"tab-pane baselayers\" id=\"baselayers\">\n        <form>\n          <ul>\n            <li v-if=\"!baselayer.fixed\" v-for=\"baselayer in baselayers\">\n              <div class=\"radio\">\n                <label><input type=\"radio\" name=\"baselayer\" v-checked=\"baselayer.visible\" @click=\"setBaseLayer(baselayer.id)\">{{ baselayer.title }}</label>\n              </div>\n            </li>\n          </ul>\n        </form>\n      </div>\n      <legend :layerstree=\"layerstree\"></legend>\n    </div>\n  </div>\n</div>\n";

},{}],59:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var Component = require('gui/vue/component');
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');

var vueComponentOptions = {
  template: require('./catalog.html'),
  data: function() {
    return {
      project: ProjectsRegistry.getCurrentProject()
    }
  },
  computed: {
    layerstree: function(){
      return this.project.state.layerstree;
    },
    baselayers: function(){
      return this.project.state.baselayers;
    },
    hasBaseLayers: function(){
      return this.project.state.baselayers.length>0;
    }
  },
  methods: {
    setBaseLayer: function(id) {
      this.project.setBaseLayer(id);
    }
  },
  ready: function() {
    var self = this;
    this.$on('treenodetoogled',function(node){
      self.project.toggleLayer(node);
    });

    this.$on('treenodestoogled',function(nodes,parentChecked){
      self.project.toggleLayers(nodes,parentChecked);
    });
  }
}

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);

// se lo voglio usare come componente come elemento html
Vue.component('g3w-catalog', vueComponentOptions);


/* COMPONENTI FIGLI */

// tree component


Vue.component('tristate-tree', {
  template: require('./tristate-tree.html'),
  props: {
    layerstree: [],
    //eredito il numero di childs dal parent
    n_parentChilds : 0,
    checked: false
  },
  data: function () {
    return {
      expanded: this.layerstree.expanded,
      parentChecked: false,
      //proprieta che serve per fare confronto per il tristate
      n_childs: this.layerstree.nodes ? this.layerstree.nodes.length : 0
    }
  },
  watch: {
      'checked': function (val){
        this.layerstree.visible = val;
      }
  },
  computed: {
    isFolder: function () {
      var isFolder = this.n_childs ? true : false;
      if (isFolder) {
        var _visibleChilds = 0;
        _.forEach(this.layerstree.nodes,function(layer){
          if (layer.visible){
            _visibleChilds += 1;
          }
        });
        this.n_parentChilds = this.n_childs - _visibleChilds;
      }
      return isFolder
    },
    isHidden: function() {
      return this.layerstree.hidden && (this.layerstree.hidden === true);
    }
  },
  methods: {
    toggle: function (checkAllLayers) {
      var checkAll = checkAllLayers == 'true' ? true : false;
      if (this.isFolder && !checkAll) {
        this.layerstree.expanded = !this.layerstree.expanded;
      }
      else if (checkAll){
        if (this.parentChecked && !this.n_parentChilds){
          this.parentChecked = false;
        } else if (this.parentChecked && this.n_parentChilds) {
          this.parentChecked = true;
        }
        else {
          this.parentChecked = !this.parentChecked;
        }
        this.$dispatch('treenodestoogled',this.layerstree.nodes,this.parentChecked);
      }
      else {
        this.$dispatch('treenodetoogled',this.layerstree);
      }
    },
    triClass: function () {
      if (!this.n_parentChilds) {
        return 'fa-check-square-o';
      } else if ((this.n_parentChilds > 0) && (this.n_parentChilds < this.n_childs)) {
        return 'fa-square';
      } else {
        return 'fa-square-o';
      }
    }
  }
})

Vue.component('legend',{
    template: require('./legend.html'),
    props: ['layerstree'],
    data: function() {
      return {
        //data qui
      }
    },
    computed: {
      visiblelayers: function(){
        var _visiblelayers = [];
        var layerstree = this.layerstree;
        function traverse(obj){
        _.forIn(obj, function (layer, key) {
              //verifica che il valore dell'id non sia nullo
              if (!_.isNil(layer.id) && layer.visible) {
                  _visiblelayers.push(layer);
              }
              if (!_.isNil(layer.nodes)) {
                  traverse(layer.nodes);
              }
          });
        }
        traverse(layerstree);
        return _visiblelayers;
      }
    },
    watch: {
      'layerstree': {
        handler: function(val, old){
          //codice qui
        },
        deep: true
      }
    },
    ready: function() {
      //codice qui
    }
});

Vue.component('legend-item',{
  template: require('./legend_item.html'),
  props: ['layer'],
  computed: {
    legendurl: function(){
      // in attesa di risolvere lo schianto di QGSI Server...
      //return "http://localhost/cgi-bin/qgis_mapserv.fcgi?map=/home/giohappy/Scrivania/Dev/G3W/g3w-client/test/progetto/test.qgs&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER="+this.layer.name;
      return ProjectsRegistry.getCurrentProject().getLegendUrl(this.layer);
    }
  },
  methods: {
    // esempio utilizzo del servizio GUI
    openform: function(){
      //GUI.notify.success("Apro un form");
      //GUI.showForm();
    }
  }
});

/* FINE COMPONENTI FIGLI */

/* INTERFACCIA PUBBLICA */
function CatalogComponent(options){
  this.id = "catalog-component";
  this.title = "catalog";
  this.internalComponent = new InternalComponent;
  //mergio opzioni con proprità di default del componente
  merge(this, options);
}

inherit(CatalogComponent, Component);

module.exports = CatalogComponent;

},{"./catalog.html":58,"./legend.html":60,"./legend_item.html":61,"./tristate-tree.html":62,"core/i18n/i18n.service":6,"core/project/projectsregistry":21,"core/utils/utils":27,"gui/gui":41,"gui/vue/component":63}],60:[function(require,module,exports){
module.exports = "<div role=\"tabpanel\" class=\"tab-pane\" id=\"legend\">\n  <legend-item :layer=\"layer\" v-for=\"layer in visiblelayers\"></legend-item>\n</div>\n";

},{}],61:[function(require,module,exports){
module.exports = "<div @click=\"openform()\">{{ layer.title }}</div>\n<div><img :src=\"legendurl\"></div>\n";

},{}],62:[function(require,module,exports){
module.exports = "<li class=\"tree-item\">\n  <span :class=\"{bold: isFolder, 'fa-chevron-down': layerstree.expanded, 'fa-chevron-right': !layerstree.expanded}\" @click=\"toggle\" v-if=\"isFolder\" class=\"fa\"></span>\n  <span v-if=\"isFolder\" @click=\"toggle('true')\" :class=\"[triClass()]\" class=\"fa\"></span>\n  <span v-else @click=\"toggle\" :class=\"[layerstree.visible  ? 'fa-check-square-o': 'fa-square-o',layerstree.disabled  ? 'disabled': '']\" class=\"fa\" style=\"cursor:default\"></span>\n  <span :class=\"{bold: isFolder, disabled: layerstree.disabled}\" @click=\"toggle\">{{layerstree.title}}</span>\n  <ul v-show=\"layerstree.expanded\" v-if=\"isFolder\">\n    <tristate-tree :n_parent-childs.sync=\"n_parentChilds\" :layerstree=\"layerstree\" :checked=\"parentChecked\" v-for=\"layerstree in layerstree.nodes\">\n    </tristate-tree>\n  </ul>\n</li>\n\n\n\n\n";

},{}],63:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var BaseComponent = require('gui/component');

var Component = function(options) {
  base(this,options);
};

inherit(Component, BaseComponent);

var proto = Component.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.mount = function(parent){
  this.internalComponent.$mount(parent);
  return resolve(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.unmount = function(){
  this.internalComponent.$destroy(true);
  this.internalComponent = null;
  return resolve();
};

module.exports = Component;

},{"core/utils/utils":27,"gui/component":39}],64:[function(require,module,exports){
module.exports = "<form class=\"navbar-form\" role=\"search\" @submit.prevent>\n  <div class=\"input-group\">\n    <input type=\"text\" class=\"form-control\" :placeholder=\"placeholder\" v-model=\"query\"  name=\"srch-term\" id=\"srch-term\">\n    <div class=\"input-group-btn\">\n        <button class=\"btn btn-default\" type=\"submit\" @click=\"search\"><i class=\"glyphicon glyphicon-search\"></i></button>\n    </div>\n  </div>\n</form>\n";

},{}],65:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;
var GUI = require('gui/gui');
var GeocodingService = require('./geocodingservice');

Vue.component("geocoder",{
  template: require("./geocoding.html"),
  props: ['type'],
  data: function(){
    return {
      query: "",
      placeholder: t("street_search")
    }
  },
  methods: {
    search: function(e){
      e.preventDefault();
      var query = this.query;
      this.service.search(query);
    }
  },
  ready: function(){
    var self = this;
    this.service = GeocodingService[this.type];
    this.service.on("results",function(){
      self.query = "";
    })
  }
});

},{"./geocoding.html":64,"./geocodingservice":66,"core/i18n/i18n.service":6,"gui/gui":41}],66:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var MapService = require('core/map/mapservice');

function Nominatim(){
  var self = this;
  this.url = "http://nominatim.openstreetmap.org";
  
  this.search = function(query){
    var deferred = $.Deferred();
    var extent = MapService.extentToWGS84(ProjectsRegistry.getCurrentProject().state.extent);
    bboxstring = _.join(extent,',');
    var searchUrl = this.url+"/search?viewboxlbrt="+bboxstring+"&bounded=1&format=json&polygon_geojson=1&q="+query;
    $.get(searchUrl,function(result){
      self.emit("results",result,query);
    });
  };
  
  base(this);
}
inherit(Nominatim,G3WObject);

module.exports = {
  Nominatim: new Nominatim
};

},{"core/g3wobject":3,"core/map/mapservice":14,"core/project/projectsregistry":21,"core/utils/utils":27}],67:[function(require,module,exports){
var g3w = g3w || {};

g3w.core = {
   G3WObject: require('core/g3wobject'),
   utils: require('core/utils/utils'),
   ApplicationService: require('core/applicationservice'),
   ApiService: require('core/apiservice'),
   Router: require('core/router'),
   ProjectsRegistry: require('core/project/projectsregistry'),
   Project: require('core/project/project'),
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
   PluginsRegistry: require('core/plugin/pluginsregistry')
};

g3w.gui = {
  gui: require('gui/gui'),
  vue: {
    //GeocodingComponent: require('gui/vue/geocoding/geocoding'),
    SearchComponent: require('gui/search/vue/search'),
    CatalogComponent: require('gui/vue/catalog/catalog'),
    MapComponent: require('gui/map/vue/map'),
    ToolsComponent: require('gui/tools/vue/tools')
  }
};

module.exports = {
  core: g3w.core,
  gui: g3w.gui
};

},{"core/apiservice":1,"core/applicationservice":2,"core/g3wobject":3,"core/geometry/geom":4,"core/geometry/geometry":5,"core/i18n/i18n.service":6,"core/interactions/pickcoordinatesinteraction":7,"core/interactions/pickfeatureinteraction":8,"core/layer/layerstate":9,"core/layer/vectorlayer":10,"core/layer/wmslayer":11,"core/map/maplayer":12,"core/map/mapqueryservice":13,"core/plugin/plugin":16,"core/plugin/pluginsregistry":17,"core/plugin/pluginsservice":18,"core/project/project":20,"core/project/projectsregistry":21,"core/router":23,"core/utils/utils":27,"gui/gui":41,"gui/map/vue/map":46,"gui/search/vue/search":54,"gui/tools/vue/tools":57,"gui/vue/catalog/catalog":59,"gui/vue/geocoding/geocoding":65}]},{},[67])(67)
});


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb3JlL2FwaXNlcnZpY2UuanMiLCJjb3JlL2FwcGxpY2F0aW9uc2VydmljZS5qcyIsImNvcmUvZzN3b2JqZWN0LmpzIiwiY29yZS9nZW9tZXRyeS9nZW9tLmpzIiwiY29yZS9nZW9tZXRyeS9nZW9tZXRyeS5qcyIsImNvcmUvaTE4bi9pMThuLnNlcnZpY2UuanMiLCJjb3JlL2ludGVyYWN0aW9ucy9waWNrY29vcmRpbmF0ZXNpbnRlcmFjdGlvbi5qcyIsImNvcmUvaW50ZXJhY3Rpb25zL3BpY2tmZWF0dXJlaW50ZXJhY3Rpb24uanMiLCJjb3JlL2xheWVyL2xheWVyc3RhdGUuanMiLCJjb3JlL2xheWVyL3ZlY3RvcmxheWVyLmpzIiwiY29yZS9sYXllci93bXNsYXllci5qcyIsImNvcmUvbWFwL21hcGxheWVyLmpzIiwiY29yZS9tYXAvbWFwcXVlcnlzZXJ2aWNlLmpzIiwiY29yZS9tYXAvbWFwc2VydmljZS5qcyIsImNvcmUvbWFwL21hcHNyZWdpc3RyeS5qcyIsImNvcmUvcGx1Z2luL3BsdWdpbi5qcyIsImNvcmUvcGx1Z2luL3BsdWdpbnNyZWdpc3RyeS5qcyIsImNvcmUvcGx1Z2luL3BsdWdpbnNzZXJ2aWNlLmpzIiwiY29yZS9wbHVnaW4vdG9vbHNzZXJ2aWNlLmpzIiwiY29yZS9wcm9qZWN0L3Byb2plY3QuanMiLCJjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeS5qcyIsImNvcmUvcHJvamVjdC9wcm9qZWN0dHlwZXMuanMiLCJjb3JlL3JvdXRlci5qcyIsImNvcmUvc2VhcmNoL3F1ZXJ5UUdJU1dNU1Byb3ZpZGVyLmpzIiwiY29yZS9zZWFyY2gvcXVlcnlXRlNQcm92aWRlci5qcyIsImNvcmUvc2VhcmNoL3NlYXJjaHF1ZXJ5c2VydmljZS5qcyIsImNvcmUvdXRpbHMvdXRpbHMuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy9jb250cm9sLmpzIiwiZzN3LW9sMy9zcmMvY29udHJvbHMvaW50ZXJhY3Rpb25jb250cm9sLmpzIiwiZzN3LW9sMy9zcmMvY29udHJvbHMvcXVlcnljb250cm9sLmpzIiwiZzN3LW9sMy9zcmMvY29udHJvbHMvcmVzZXRjb250cm9sLmpzIiwiZzN3LW9sMy9zcmMvY29udHJvbHMvem9vbWJveGNvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9nM3cub2wzLmpzIiwiZzN3LW9sMy9zcmMvbGF5ZXJzL2Jhc2VzLmpzIiwiZzN3LW9sMy9zcmMvbGF5ZXJzL3Jhc3RlcnMuanMiLCJnM3ctb2wzL3NyYy9tYXAvbWFwaGVscGVycy5qcyIsImczdy1vbDMvc3JjL3V0aWxzLmpzIiwiZ3VpL2NvbXBvbmVudC5qcyIsImd1aS9jb21wb25lbnRzcmVnaXN0cnkuanMiLCJndWkvZ3VpLmpzIiwiZ3VpL2xpc3RwYW5lbC5odG1sIiwiZ3VpL2xpc3RwYW5lbC5qcyIsImd1aS9tYXAvbWFwc2VydmljZS5qcyIsImd1aS9tYXAvdnVlL21hcC5odG1sIiwiZ3VpL21hcC92dWUvbWFwLmpzIiwiZ3VpL3BhbmVsLmpzIiwiZ3VpL3NlYXJjaC9zZWFyY2hlc3NlcnZpY2UuanMiLCJndWkvc2VhcmNoL3Z1ZS9wYW5lbC9zZWFyY2hwYW5lbC5odG1sIiwiZ3VpL3NlYXJjaC92dWUvcGFuZWwvc2VhcmNocGFuZWwuanMiLCJndWkvc2VhcmNoL3Z1ZS9yZXN1bHRzL3Jlc3VsdHBhbmVsLmh0bWwiLCJndWkvc2VhcmNoL3Z1ZS9yZXN1bHRzL3Jlc3VsdHBhbmVsLmpzIiwiZ3VpL3NlYXJjaC92dWUvc2VhcmNoLmh0bWwiLCJndWkvc2VhcmNoL3Z1ZS9zZWFyY2guanMiLCJndWkvdG9vbHMvdG9vbHNzZXJ2aWNlLmpzIiwiZ3VpL3Rvb2xzL3Z1ZS90b29scy5odG1sIiwiZ3VpL3Rvb2xzL3Z1ZS90b29scy5qcyIsImd1aS92dWUvY2F0YWxvZy9jYXRhbG9nLmh0bWwiLCJndWkvdnVlL2NhdGFsb2cvY2F0YWxvZy5qcyIsImd1aS92dWUvY2F0YWxvZy9sZWdlbmQuaHRtbCIsImd1aS92dWUvY2F0YWxvZy9sZWdlbmRfaXRlbS5odG1sIiwiZ3VpL3Z1ZS9jYXRhbG9nL3RyaXN0YXRlLXRyZWUuaHRtbCIsImd1aS92dWUvY29tcG9uZW50LmpzIiwiZ3VpL3Z1ZS9nZW9jb2RpbmcvZ2VvY29kaW5nLmh0bWwiLCJndWkvdnVlL2dlb2NvZGluZy9nZW9jb2RpbmcuanMiLCJndWkvdnVlL2dlb2NvZGluZy9nZW9jb2RpbmdzZXJ2aWNlLmpzIiwic2RrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6aUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlqQkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1aWxkLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIHJlamVjdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3Q7XG5cbmZ1bmN0aW9uIEFwaVNlcnZpY2UoKXtcbiAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgdGhpcy5fYmFzZVVybCA9IG51bGw7XG4gIHRoaXMuX2FwaVVybHMgPSB7fTtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcbiAgICB0aGlzLl9iYXNlVXJsID0gY29uZmlnLnVybHMuYXBpO1xuICAgIHRoaXMuX2FwaUVuZHBvaW50cyA9IGNvbmZpZy51cmxzLmFwaUVuZHBvaW50cztcbiAgfTtcbiAgXG4gIHZhciBob3dNYW55QXJlTG9hZGluZyA9IDA7XG4gIHRoaXMuX2luY3JlbWVudExvYWRlcnMgPSBmdW5jdGlvbigpe1xuICAgIGlmIChob3dNYW55QXJlTG9hZGluZyA9PSAwKXtcbiAgICAgIHRoaXMuZW1pdCgnYXBpcXVlcnlzdGFydCcpO1xuICAgIH1cbiAgICBob3dNYW55QXJlTG9hZGluZyArPSAxO1xuICB9O1xuICBcbiAgdGhpcy5fZGVjcmVtZW50TG9hZGVycyA9IGZ1bmN0aW9uKCl7XG4gICAgaG93TWFueUFyZUxvYWRpbmcgLT0gMTtcbiAgICBpZiAoaG93TWFueUFyZUxvYWRpbmcgPT0gMCl7XG4gICAgICB0aGlzLmVtaXQoJ2FwaXF1ZXJ5ZW5kJyk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5nZXQgPSBmdW5jdGlvbihhcGksb3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgYXBpRW5kUG9pbnQgPSB0aGlzLl9hcGlFbmRwb2ludHNbYXBpXTtcbiAgICBpZiAoYXBpRW5kUG9pbnQpIHtcbiAgICAgIHZhciBjb21wbGV0ZVVybCA9IHRoaXMuX2Jhc2VVcmwgKyAnLycgKyBhcGlFbmRQb2ludDtcbiAgICAgIGlmIChvcHRpb25zLnJlcXVlc3QpIHtcbiAgICAgICAgIGNvbXBsZXRlVXJsID0gY29tcGxldGVVcmwgKyAnLycgKyBvcHRpb25zLnJlcXVlc3Q7XG4gICAgICB9XG4gICAgICB2YXIgcGFyYW1zID0gb3B0aW9ucy5wYXJhbXMgfHwge307XG4gICAgICBcbiAgICAgIHNlbGYuZW1pdChhcGkrJ3F1ZXJ5c3RhcnQnKTtcbiAgICAgIHRoaXMuX2luY3JlbWVudExvYWRlcnMoKTtcbiAgICAgIHJldHVybiAkLmdldChjb21wbGV0ZVVybCxwYXJhbXMpXG4gICAgICAuZG9uZShmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHNlbGYuZW1pdChhcGkrJ3F1ZXJ5ZW5kJyxyZXNwb25zZSk7XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbihlKXtcbiAgICAgICAgc2VsZi5lbWl0KGFwaSsncXVlcnlmYWlsJyxlKTtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9KVxuICAgICAgLmFsd2F5cyhmdW5jdGlvbigpe1xuICAgICAgICBzZWxmLl9kZWNyZW1lbnRMb2FkZXJzKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gcmVqZWN0KCk7XG4gICAgfVxuICB9O1xuICBcbiAgYmFzZSh0aGlzKTtcbn1cbmluaGVyaXQoQXBpU2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBBcGlTZXJ2aWNlO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBBcGlTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9hcGlzZXJ2aWNlJyk7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5Jyk7XG52YXIgUGx1Z2luc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wbHVnaW4vcGx1Z2luc3JlZ2lzdHJ5Jyk7XG5cbnZhciBBcHBsaWNhdGlvblNlcnZpY2UgPSBmdW5jdGlvbigpe1xuICB0aGlzLnNlY3JldCA9IFwiIyMjIEczVyBDbGllbnQgQXBwbGljYXRpb24gU2VydmljZSAjIyNcIjtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmluaXRpYWxpemVkID0gZmFsc2U7XG4gIHRoaXMuX21vZGFsT3ZlcmxheSA9IG51bGw7XG4gIHRoaXMuY29uZmlnID0ge307XG5cbiAgLy8gY2hpYW1hIGlsIGNvc3RydXR0b3JlIGRpIEczV09iamVjdCAoY2hlIGluIHF1ZXN0byBtb21lbnRvIG5vbiBmYSBuaWVudGUpXG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcbiAgICB0aGlzLl9ib290c3RyYXAoKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0Q29uZmlnID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcbiAgfTtcbiAgXG4gIHRoaXMuX2Jvb3RzdHJhcCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghdGhpcy5pbml0aWFsaXplZCl7XG4gICAgICAvL2luaXppYWxpenphIGxhIGNvbmZpZ3VyYXppb25lIGRlaSBzZXJ2aXppLiBPZ251bmdvIGNlcmNoZXLDoCBkYWwgY29uZmlnIHF1ZWxsbyBkaSBjdWkgYXZyw6AgYmlzb2dub1xuICAgICAgLy91bmEgdm9sdGEgZmluaXRhIGxhIGNvbmZpZ3VyYXppb25lIGVtZXR0byBsJ2V2ZW50byByZWFkeS4gQSBxdWVzdG8gcHVudG8gcG90csOyIGF2dmlhcmUgbCdpc3RhbnphIFZ1ZSBnbG9iYWxlXG4gICAgICAkLndoZW4oXG4gICAgICAgIEFwaVNlcnZpY2UuaW5pdCh0aGlzLl9jb25maWcpLFxuICAgICAgICBQcm9qZWN0c1JlZ2lzdHJ5LmluaXQodGhpcy5fY29uZmlnKSxcbiAgICAgICAgUGx1Z2luc1JlZ2lzdHJ5LmluaXQodGhpcy5fY29uZmlnLnBsdWdpbnMpXG4gICAgICApLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5lbWl0KCdyZWFkeScpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH07XG59O1xuaW5oZXJpdChBcHBsaWNhdGlvblNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQXBwbGljYXRpb25TZXJ2aWNlO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBub29wID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLm5vb3A7XG5cbi8qKlxuICogVW4gb2dnZXR0byBiYXNlIGluIGdyYWRvIGRpIGdlc3RpcmUgZXZlbnR1YWxpIHNldHRlciBlIHJlbGF0aXZhIGNhdGVuYSBkaSBsaXN0ZW5lcnMuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEczV09iamVjdCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLnNldHRlcnMpe1xuICAgIHRoaXMuX3NldHVwTGlzdGVuZXJzQ2hhaW4odGhpcy5zZXR0ZXJzKTtcbiAgfVxufTtcbmluaGVyaXQoRzNXT2JqZWN0LEV2ZW50RW1pdHRlcik7XG5cbnZhciBwcm90byA9IEczV09iamVjdC5wcm90b3R5cGU7XG5cbi8qKlxuICogSW5zZXJpc2NlIHVuIGxpc3RlbmVyIGRvcG8gY2hlIMOoIHN0YXRvIGVzZWd1aXRvIGlsIHNldHRlclxuICogQHBhcmFtIHtzdHJpbmd9IHNldHRlciAtIElsIG5vbWUgZGVsIG1ldG9kbyBzdSBjdWkgc2kgY3VvbGUgcmVnaXN0cmFyZSB1bmEgZnVuemlvbmUgbGlzdGVuZXJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGxpc3RlbmVyIC0gVW5hIGZ1bnppb25lIGxpc3RlbmVyIChzb2xvIHNpbmNyb25hKVxuICovXG5wcm90by5vbmFmdGVyID0gZnVuY3Rpb24oc2V0dGVyLGxpc3RlbmVyKXtcbiAgcmV0dXJuIHRoaXMuX29uc2V0dGVyKCdhZnRlcicsc2V0dGVyLGxpc3RlbmVyLGZhbHNlKTtcbn07XG5cbi8vIHVuIGxpc3RlbmVyIHB1w7IgcmVnaXN0cmFyc2kgaW4gbW9kbyBkYSBlc3NlcmUgZXNlZ3VpdG8gUFJJTUEgZGVsbCdlc2VjdXppb25lIGRlbCBtZXRvZG8gc2V0dGVyLiBQdcOyIHJpdG9ybmFyZSB0cnVlL2ZhbHNlIHBlclxuLy8gdm90YXJlIGEgZmF2b3JlIG8gbWVubyBkZWxsJ2VzZWN1emlvbmUgZGVsIHNldHRlci4gU2Ugbm9uIHJpdG9ybmEgbnVsbGEgbyB1bmRlZmluZWQsIG5vbiB2aWVuZSBjb25zaWRlcmF0byB2b3RhbnRlXG4vKipcbiAqIEluc2VyaXNjZSB1biBsaXN0ZW5lciBwcmltYSBjaGUgdmVuZ2EgZXNlZ3VpdG8gaWwgc2V0dGVyLiBTZSByaXRvcm5hIGZhbHNlIGlsIHNldHRlciBub24gdmllbmUgZXNlZ3VpdG9cbiAqIEBwYXJhbSB7c3RyaW5nfSBzZXR0ZXIgLSBJbCBub21lIGRlbCBtZXRvZG8gc3UgY3VpIHNpIGN1b2xlIHJlZ2lzdHJhcmUgdW5hIGZ1bnppb25lIGxpc3RlbmVyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBsaXN0ZW5lciAtIFVuYSBmdW56aW9uZSBsaXN0ZW5lciwgYSBjdWkgdmllbmUgcGFzc2F0byB1bmEgZnVuemlvbmUgXCJuZXh0XCIgY29tZSB1bHRpbW8gcGFyYW1ldHJvLCBkYSB1c2FyZSBuZWwgY2FzbyBkaSBsaXN0ZW5lciBhc2luY3JvbmlcbiAqL1xucHJvdG8ub25iZWZvcmUgPSBmdW5jdGlvbihzZXR0ZXIsbGlzdGVuZXIpe1xuICByZXR1cm4gdGhpcy5fb25zZXR0ZXIoJ2JlZm9yZScsc2V0dGVyLGxpc3RlbmVyLGZhbHNlKTtcbn07XG5cbi8qKlxuICogSW5zZXJpc2NlIHVuIGxpc3RlbmVyIHByaW1hIGNoZSB2ZW5nYSBlc2VndWl0byBpbCBzZXR0ZXIuIEFsIGxpc3RlbmVyIHZpZW5lIHBhc3NhdG8gdW5hIGZ1bnppb25lIFwibmV4dFwiIGNvbWUgdWx0aW1vIHBhcmFtZXRybywgZGEgY2hpYW1hcmUgY29uIHBhcmFtZXRybyB0cnVlL2ZhbHNlIHBlciBmYXIgcHJvc2VndWlyZSBvIG1lbm8gaWwgc2V0dGVyXG4gKiBAcGFyYW0ge3N0cmluZ30gc2V0dGVyIC0gSWwgbm9tZSBkZWwgbWV0b2RvIHN1IGN1aSBzaSBjdW9sZSByZWdpc3RyYXJlIHVuYSBmdW56aW9uZSBsaXN0ZW5lclxuICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXIgLSBVbmEgZnVuemlvbmUgbGlzdGVuZXIsIGEgY3VpIFxuICovXG5wcm90by5vbmJlZm9yZWFzeW5jID0gZnVuY3Rpb24oc2V0dGVyLGxpc3RlbmVyKXtcbiAgcmV0dXJuIHRoaXMuX29uc2V0dGVyKCdiZWZvcmUnLHNldHRlcixsaXN0ZW5lcix0cnVlKTtcbn07XG5cbnByb3RvLnVuID0gZnVuY3Rpb24oc2V0dGVyLGtleSl7XG4gIF8uZm9yRWFjaCh0aGlzLnNldHRlcnNMaXN0ZW5lcnMsZnVuY3Rpb24oc2V0dGVyc0xpc3RlbmVycyx3aGVuKXtcbiAgICBfLmZvckVhY2goc2V0dGVyc0xpc3RlbmVyc1tzZXR0ZXJdLGZ1bmN0aW9uKHNldHRlckxpc3RlbmVyKXtcbiAgICAgIGlmKHNldHRlckxpc3RlbmVyLmtleSA9PSBrZXkpe1xuICAgICAgICBkZWxldGUgc2V0dGVyTGlzdGVuZXI7XG4gICAgICB9XG4gICAgfSlcbiAgfSlcbn07XG5cbnByb3RvLl9vbnNldHRlciA9IGZ1bmN0aW9uKHdoZW4sc2V0dGVyLGxpc3RlbmVyLGFzeW5jKXsgLyp3aGVuPWJlZm9yZXxhZnRlciwgdHlwZT1zeW5jfGFzeW5jKi9cbiAgdmFyIHNldHRlcnNMaXN0ZW5lcnMgPSB0aGlzLnNldHRlcnNMaXN0ZW5lcnNbd2hlbl07XG4gIHZhciBsaXN0ZW5lcktleSA9IFwiXCIrTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjEwMDAwMDApK1wiXCIrRGF0ZS5ub3coKTtcbiAgLyppZiAoKHdoZW4gPT0gJ2JlZm9yZScpICYmICFhc3luYyl7XG4gICAgbGlzdGVuZXIgPSB0aGlzLl9tYWtlQ2hhaW5hYmxlKGxpc3RlbmVyKTtcbiAgfSovXG4gIHNldHRlcnNMaXN0ZW5lcnNbc2V0dGVyXS5wdXNoKHtcbiAgICBrZXk6IGxpc3RlbmVyS2V5LFxuICAgIGZuYzogbGlzdGVuZXIsXG4gICAgYXN5bmM6IGFzeW5jXG4gIH0pO1xuICByZXR1cm4gbGlzdGVuZXJLZXk7XG4gIC8vcmV0dXJuIHRoaXMuZ2VuZXJhdGVVbkxpc3RlbmVyKHNldHRlcixsaXN0ZW5lcktleSk7XG59O1xuXG4vLyB0cmFzZm9ybW8gdW4gbGlzdGVuZXIgc2luY3Jvbm8gaW4gbW9kbyBkYSBwb3RlciBlc3NlcmUgdXNhdG8gbmVsbGEgY2F0ZW5hIGRpIGxpc3RlbmVycyAocmljaGlhbWFuZG8gbmV4dCBjb2wgdmFsb3JlIGRpIHJpdG9ybm8gZGVsIGxpc3RlbmVyKVxuLypwcm90by5fbWFrZUNoYWluYWJsZSA9IGZ1bmN0aW9uKGxpc3RlbmVyKXtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHJldHVybiBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAvLyByaW11b3ZvIG5leHQgZGFpIHBhcmFtZXRyaSBwcmltYSBkaSBjaGlhbWFyZSBpbCBsaXN0ZW5lclxuICAgIHZhciBuZXh0ID0gYXJncy5wb3AoKTtcbiAgICB2YXIgY2FuU2V0ID0gbGlzdGVuZXIuYXBwbHkoc2VsZixhcmd1bWVudHMpO1xuICAgIHZhciBfY2FuU2V0ID0gdHJ1ZTtcbiAgICBpZiAoXy5pc0Jvb2xlYW4oY2FuU2V0KSl7XG4gICAgICBfY2FuU2V0ID0gY2FuU2V0O1xuICAgIH1cbiAgICBuZXh0KGNhblNldCk7XG4gIH1cbn07Ki9cblxucHJvdG8uX3NldHVwTGlzdGVuZXJzQ2hhaW4gPSBmdW5jdGlvbihzZXR0ZXJzKXtcbiAgLy8gaW5pemlhbGl6emEgdHV0dGkgaSBtZXRvZGkgZGVmaW5pdGkgbmVsbCdvZ2dldHRvIFwic2V0dGVyc1wiIGRlbGxhIGNsYXNzZSBmaWdsaWEuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5zZXR0ZXJzTGlzdGVuZXJzID0ge1xuICAgIGFmdGVyOnt9LFxuICAgIGJlZm9yZTp7fVxuICB9O1xuICAvLyBwZXIgb2duaSBzZXR0ZXIgdmllbmUgZGVmaW5pdG8gbCdhcnJheSBkZWkgbGlzdGVuZXJzIGUgZmllbmUgc29zdGl0dWl0byBpbCBtZXRvZG8gb3JpZ2luYWxlIGNvbiBsYSBmdW56aW9uaSBjaGUgZ2VzdGlzY2UgbGEgY29kYSBkaSBsaXN0ZW5lcnNcbiAgXy5mb3JFYWNoKHNldHRlcnMsZnVuY3Rpb24oc2V0dGVyT3B0aW9uLHNldHRlcil7XG4gICAgdmFyIHNldHRlckZuYyA9IG5vb3A7XG4gICAgdmFyIHNldHRlckZhbGxiYWNrID0gbm9vcDtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHNldHRlck9wdGlvbikpe1xuICAgICAgc2V0dGVyRm5jID0gc2V0dGVyT3B0aW9uXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc2V0dGVyRm5jID0gc2V0dGVyT3B0aW9uLmZuYztcbiAgICAgIHNldHRlckZhbGxiYWNrID0gc2V0dGVyT3B0aW9uLmZhbGxiYWNrIHx8IG5vb3A7XG4gICAgfVxuICAgIHNlbGYuc2V0dGVyc0xpc3RlbmVycy5hZnRlcltzZXR0ZXJdID0gW107XG4gICAgc2VsZi5zZXR0ZXJzTGlzdGVuZXJzLmJlZm9yZVtzZXR0ZXJdID0gW107XG4gICAgLy8gc2V0dGVyIHNvc3RpdHVpdG9cbiAgICBzZWxmW3NldHRlcl0gPSBmdW5jdGlvbigpe1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAvLyBlc2VndW8gaSBsaXN0ZW5lciByZWdpc3RyYXRpIHBlciBpbCBiZWZvcmVcbiAgICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAgIHZhciByZXR1cm5WYWwgPSBudWxsO1xuICAgICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgICAgdmFyIGNhblNldCA9IHRydWU7XG4gICAgICBcbiAgICAgIC8vIHJpY2hpYW1hdGEgYWxsYSBmaW5lIGRlbGxhIGNhdGVuYSBkaSBsaXN0ZW5lcnNcbiAgICAgIGZ1bmN0aW9uIGRvbmUoKXtcbiAgICAgICAgaWYoY2FuU2V0KXtcbiAgICAgICAgICAvLyBlc2VndW8gbGEgZnVuemlvbmVcbiAgICAgICAgICByZXR1cm5WYWwgPSBzZXR0ZXJGbmMuYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgICAvLyBlIHJpc29sdm8gbGEgcHJvbWVzc2EgKGV2ZW50dWFsbWVudGUgdXRpbGl6emF0YSBkYSBjaGkgaGEgaW52b2NhdG8gaWwgc2V0dGVyXG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5WYWwpO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhciBhZnRlckxpc3RlbmVycyA9IHNlbGYuc2V0dGVyc0xpc3RlbmVycy5hZnRlcltzZXR0ZXJdO1xuICAgICAgICAgIF8uZm9yRWFjaChhZnRlckxpc3RlbmVycyxmdW5jdGlvbihsaXN0ZW5lciwga2V5KXtcbiAgICAgICAgICAgIGxpc3RlbmVyLmZuYy5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgLy8gc2Ugbm9uIHBvc3NvIHByb3NlZ3VpcmUgXG4gICAgICAgICAgLy8gY2hpYW1vIGwnZXZlbnR1YWxlIGZ1bnppb25lIGRpIGZhbGxiYWNrXG4gICAgICAgICAgc2V0dGVyRmFsbGJhY2suYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgICAvLyBlIHJpZ2V0dG8gbGEgcHJvbWVzc2FcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgZnVuY3Rpb24gY29tcGxldGUoKXtcbiAgICAgICAgLy8gZXNlZ3VvIGxhIGZ1bnppb25lXG4gICAgICAgIHJldHVyblZhbCA9IHNldHRlckZuYy5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAvLyBlIHJpc29sdm8gbGEgcHJvbWVzc2EgKGV2ZW50dWFsbWVudGUgdXRpbGl6emF0YSBkYSBjaGkgaGEgaW52b2NhdG8gaWwgc2V0dGVyXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocmV0dXJuVmFsKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBhZnRlckxpc3RlbmVycyA9IHNlbGYuc2V0dGVyc0xpc3RlbmVycy5hZnRlcltzZXR0ZXJdO1xuICAgICAgICBfLmZvckVhY2goYWZ0ZXJMaXN0ZW5lcnMsZnVuY3Rpb24obGlzdGVuZXIsIGtleSl7XG4gICAgICAgICAgbGlzdGVuZXIuZm5jLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGFib3J0KCl7XG4gICAgICAgICAgLy8gc2Ugbm9uIHBvc3NvIHByb3NlZ3VpcmUgLi4uXG4gICAgICAgICAgLy8gY2hpYW1vIGwnZXZlbnR1YWxlIGZ1bnppb25lIGRpIGZhbGxiYWNrXG4gICAgICAgICAgc2V0dGVyRmFsbGJhY2suYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgICAvLyBlIHJpZ2V0dG8gbGEgcHJvbWVzc2FcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIGJlZm9yZUxpc3RlbmVycyA9IHRoaXMuc2V0dGVyc0xpc3RlbmVyc1snYmVmb3JlJ11bc2V0dGVyXTtcbiAgICAgIC8vIGNvbnRhdG9yZSBkZWkgbGlzdGVuZXIgY2hlIHZlcnLDoCBkZWNyZW1lbnRhdG8gYWQgb2duaSBjaGlhbWF0YSBhIG5leHQoKVxuICAgICAgY291bnRlciA9IDA7XG4gICAgICBcbiAgICAgIC8vIGZ1bnppb25lIHBhc3NhdGEgY29tZSB1bHRpbW8gcGFyYW1ldHJvIGFpIGxpc3RlbmVycywgY2hlICoqKlNFIFNPTk8gU1RBVEkgQUdHSVVOVEkgQ09NRSBBU0lOQ1JPTkkgbGEgREVWT05PKioqIHJpY2hpYW1hcmUgcGVyIHBvdGVyIHByb3NlZ3VpcmUgbGEgY2F0ZW5hXG4gICAgICBmdW5jdGlvbiBuZXh0KGJvb2wpe1xuICAgICAgICB2YXIgY29udCA9IHRydWU7XG4gICAgICAgIGlmIChfLmlzQm9vbGVhbihib29sKSl7XG4gICAgICAgICAgY29udCA9IGJvb2w7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9hcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncyk7XG4gICAgICAgIC8vIHNlIGxhIGNhdGVuYSDDqCBzdGF0YSBibG9jY2F0YSBvIHNlIHNpYW1vIGFycml2YXRpIGFsbGEgZmluZSBkZWkgYmVmb3JlbGlzdGVuZXJzXG4gICAgICAgIGlmIChjb250ID09PSBmYWxzZSB8fCAoY291bnRlciA9PSBiZWZvcmVMaXN0ZW5lcnMubGVuZ3RoKSl7XG4gICAgICAgICAgaWYoY29udCA9PT0gZmFsc2UpXG4gICAgICAgICAgICBhYm9ydC5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb21wbGV0ZWQgPSBjb21wbGV0ZS5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgICAgaWYoXy5pc1VuZGVmaW5lZChjb21wbGV0ZWQpIHx8IGNvbXBsZXRlZCA9PT0gdHJ1ZSl7XG4gICAgICAgICAgICAgIHNlbGYuZW1pdEV2ZW50KCdzZXQ6JytzZXR0ZXIsYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChjb250KXtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lckZuYyA9IGJlZm9yZUxpc3RlbmVyc1tjb3VudGVyXS5mbmM7XG4gICAgICAgICAgICBpZiAoYmVmb3JlTGlzdGVuZXJzW2NvdW50ZXJdLmFzeW5jKXtcbiAgICAgICAgICAgICAgLy8gYWdnaXVuZ28gbmV4dCBjb21lIHVsaXRtbyBwYXJhbWV0cm9cbiAgICAgICAgICAgICAgX2FyZ3MucHVzaChuZXh0KTtcbiAgICAgICAgICAgICAgY291bnRlciArPSAxO1xuICAgICAgICAgICAgICBsaXN0ZW5lckZuYy5hcHBseShzZWxmLF9hcmdzKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHZhciBfY29udCA9IGxpc3RlbmVyRm5jLmFwcGx5KHNlbGYsX2FyZ3MpO1xuICAgICAgICAgICAgICBjb3VudGVyICs9IDE7XG4gICAgICAgICAgICAgIG5leHQoX2NvbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICBuZXh0KCk7XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgIH1cbiAgfSlcbn07XG5cbi8qXG5wcm90by5nZW5lcmF0ZVVuTGlzdGVuZXIgPSBmdW5jdGlvbihzZXR0ZXJzTGlzdGVuZXJzLHNldHRlcixsaXN0ZW5lcktleSl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgc2V0dGVyc0xpc3RlbmVyc1tzZXR0ZXJdW2xpc3RlbmVyS2V5XSA9IG51bGw7XG4gICAgZGVsZXRlIHNldHRlcnNMaXN0ZW5lcnNbc2V0dGVyXVtsaXN0ZW5lcktleV07XG4gIH1cbn07XG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEczV09iamVjdDtcbiIsInZhciBnZW9tID0ge1xuICBkaXN0YW5jZTogZnVuY3Rpb24oYzEsYzIpe1xuICAgIHJldHVybiBNYXRoLnNxcnQoZ2VvbS5zcXVhcmVkRGlzdGFuY2UoYzEsYzIpKTtcbiAgfSxcbiAgc3F1YXJlZERpc3RhbmNlOiBmdW5jdGlvbihjMSxjMil7XG4gICAgdmFyIHgxID0gYzFbMF07XG4gICAgdmFyIHkxID0gYzFbMV07XG4gICAgdmFyIHgyID0gYzJbMF07XG4gICAgdmFyIHkyID0gYzJbMV07XG4gICAgdmFyIGR4ID0geDIgLSB4MTtcbiAgICB2YXIgZHkgPSB5MiAtIHkxO1xuICAgIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbiAgfSxcbiAgY2xvc2VzdE9uU2VnbWVudDogZnVuY3Rpb24oY29vcmRpbmF0ZSwgc2VnbWVudCkge1xuICAgIHZhciB4MCA9IGNvb3JkaW5hdGVbMF07XG4gICAgdmFyIHkwID0gY29vcmRpbmF0ZVsxXTtcbiAgICB2YXIgc3RhcnQgPSBzZWdtZW50WzBdO1xuICAgIHZhciBlbmQgPSBzZWdtZW50WzFdO1xuICAgIHZhciB4MSA9IHN0YXJ0WzBdO1xuICAgIHZhciB5MSA9IHN0YXJ0WzFdO1xuICAgIHZhciB4MiA9IGVuZFswXTtcbiAgICB2YXIgeTIgPSBlbmRbMV07XG4gICAgdmFyIGR4ID0geDIgLSB4MTtcbiAgICB2YXIgZHkgPSB5MiAtIHkxO1xuICAgIHZhciBhbG9uZyA9IChkeCA9PT0gMCAmJiBkeSA9PT0gMCkgPyAwIDpcbiAgICAgICAgKChkeCAqICh4MCAtIHgxKSkgKyAoZHkgKiAoeTAgLSB5MSkpKSAvICgoZHggKiBkeCArIGR5ICogZHkpIHx8IDApO1xuICAgIHZhciB4LCB5O1xuICAgIGlmIChhbG9uZyA8PSAwKSB7XG4gICAgICB4ID0geDE7XG4gICAgICB5ID0geTE7XG4gICAgfSBlbHNlIGlmIChhbG9uZyA+PSAxKSB7XG4gICAgICB4ID0geDI7XG4gICAgICB5ID0geTI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHggPSB4MSArIGFsb25nICogZHg7XG4gICAgICB5ID0geTEgKyBhbG9uZyAqIGR5O1xuICAgIH1cbiAgICByZXR1cm4gW3gsIHldO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VvbTtcbiIsInZhciBHZW9tZXRyeSA9IHt9O1xuXG5HZW9tZXRyeS5HZW9tZXRyeVR5cGVzID0ge1xuICBQT0lOVDogXCJQb2ludFwiLFxuICBNVUxUSVBPSU5UOiBcIk11bHRpUG9pbnRcIixcbiAgTElORVNUUklORzogXCJMaW5lXCIsIC8vIHBlciBzZWd1aXJlIGxhIGRlZmluaXppb25lIGRpIFFHaXMuR2VvbWV0cnlUeXBlLCBjaGUgZGVmaW5pc2NlIExpbmUgaW52ZWNlIGRpIExpbmVzdHJpbmcuXG4gIE1VTFRJTElORVNUUklORzogXCJNdWx0aUxpbmVcIixcbiAgUE9MWUdPTjogXCJQb2x5Z29uXCIsXG4gIE1VTFRJUE9MWUdPTjogXCJNdWx0aVBvbHlnb25cIixcbiAgR0VPTUVUUllDT0xMRUNUSU9OOiBcIkdlb21ldHJ5Q29sbGVjdGlvblwiXG59O1xuXG5HZW9tZXRyeS5TdXBwb3J0ZWRHZW9tZXRyeVR5cGVzID0gW1xuICBHZW9tZXRyeS5HZW9tZXRyeVR5cGVzLlBPSU5ULFxuICBHZW9tZXRyeS5HZW9tZXRyeVR5cGVzLk1VTFRJUE9JTlQsXG4gIEdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMuTElORVNUUklORyxcbiAgR2VvbWV0cnkuR2VvbWV0cnlUeXBlcy5NVUxUSUxJTkVTVFJJTkcsXG4gIEdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMuUE9MWUdPTixcbiAgR2VvbWV0cnkuR2VvbWV0cnlUeXBlcy5NVUxUSVBPTFlHT05cbl1cblxubW9kdWxlLmV4cG9ydHMgPSBHZW9tZXRyeTtcbiIsImZ1bmN0aW9uIGluaXQoY29uZmlnKSB7XG4gIGkxOG5leHRcbiAgLnVzZShpMThuZXh0WEhSQmFja2VuZClcbiAgLmluaXQoeyBcbiAgICAgIGxuZzogJ2l0JyxcbiAgICAgIG5zOiAnYXBwJyxcbiAgICAgIGZhbGxiYWNrTG5nOiAnaXQnLFxuICAgICAgcmVzb3VyY2VzOiBjb25maWcucmVzb3VyY2VzXG4gIH0pO1xuICBcbiAganF1ZXJ5STE4bmV4dC5pbml0KGkxOG5leHQsICQsIHtcbiAgICB0TmFtZTogJ3QnLCAvLyAtLT4gYXBwZW5kcyAkLnQgPSBpMThuZXh0LnRcbiAgICBpMThuTmFtZTogJ2kxOG4nLCAvLyAtLT4gYXBwZW5kcyAkLmkxOG4gPSBpMThuZXh0XG4gICAgaGFuZGxlTmFtZTogJ2xvY2FsaXplJywgLy8gLS0+IGFwcGVuZHMgJChzZWxlY3RvcikubG9jYWxpemUob3B0cyk7XG4gICAgc2VsZWN0b3JBdHRyOiAnZGF0YS1pMThuJywgLy8gc2VsZWN0b3IgZm9yIHRyYW5zbGF0aW5nIGVsZW1lbnRzXG4gICAgdGFyZ2V0QXR0cjogJ2RhdGEtaTE4bi10YXJnZXQnLCAvLyBlbGVtZW50IGF0dHJpYnV0ZSB0byBncmFiIHRhcmdldCBlbGVtZW50IHRvIHRyYW5zbGF0ZSAoaWYgZGlmZnJlbnQgdGhlbiBpdHNlbGYpXG4gICAgb3B0aW9uc0F0dHI6ICdkYXRhLWkxOG4tb3B0aW9ucycsIC8vIGVsZW1lbnQgYXR0cmlidXRlIHRoYXQgY29udGFpbnMgb3B0aW9ucywgd2lsbCBsb2FkL3NldCBpZiB1c2VPcHRpb25zQXR0ciA9IHRydWVcbiAgICB1c2VPcHRpb25zQXR0cjogZmFsc2UsIC8vIHNlZSBvcHRpb25zQXR0clxuICAgIHBhcnNlRGVmYXVsdFZhbHVlRnJvbUNvbnRlbnQ6IHRydWUgLy8gcGFyc2VzIGRlZmF1bHQgdmFsdWVzIGZyb20gY29udGVudCBlbGUudmFsIG9yIGVsZS50ZXh0XG4gIH0pO1xufVxuICAgIFxudmFyIHQgPSBmdW5jdGlvbih0ZXh0KXtcbiAgICB2YXIgdHJhZCA9IGkxOG5leHQudCh0ZXh0KTtcbiAgICByZXR1cm4gdHJhZDtcbn07XG4gICAgXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdDogaW5pdCxcbiAgdDogdFxufVxuIiwidmFyIFBpY2tDb29yZGluYXRlc0V2ZW50VHlwZSA9IHtcbiAgUElDS0VEOiAncGlja2VkJ1xufTtcblxudmFyIFBpY2tDb29yZGluYXRlc0V2ZW50ID0gZnVuY3Rpb24odHlwZSwgY29vcmRpbmF0ZSkge1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLmNvb3JkaW5hdGUgPSBjb29yZGluYXRlO1xufTtcblxudmFyIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICB0aGlzLnByZXZpb3VzQ3Vyc29yXyA9IG51bGw7XG4gIFxuICBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyLmNhbGwodGhpcywge1xuICAgIGhhbmRsZURvd25FdmVudDogUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyxcbiAgICBoYW5kbGVVcEV2ZW50OiBQaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbi5oYW5kbGVVcEV2ZW50XyxcbiAgICBoYW5kbGVNb3ZlRXZlbnQ6IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLmhhbmRsZU1vdmVFdmVudF8sXG4gIH0pO1xufTtcbm9sLmluaGVyaXRzKFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLCBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyKTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlVXBFdmVudF8gPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgICAgbmV3IFBpY2tDb29yZGluYXRlc0V2ZW50KFxuICAgICAgICAgICAgICBQaWNrQ29vcmRpbmF0ZXNFdmVudFR5cGUuUElDS0VELFxuICAgICAgICAgICAgICBldmVudC5jb29yZGluYXRlKSk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlTW92ZUV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBlbGVtID0gZXZlbnQubWFwLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgZWxlbS5zdHlsZS5jdXJzb3IgPSAgJ3BvaW50ZXInO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24ucHJvdG90eXBlLnNob3VsZFN0b3BFdmVudCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLnByb3RvdHlwZS5zZXRNYXAgPSBmdW5jdGlvbihtYXApe1xuICBpZiAoIW1hcCkge1xuICAgIHZhciBlbGVtID0gdGhpcy5nZXRNYXAoKS5nZXRUYXJnZXRFbGVtZW50KCk7XG4gICAgZWxlbS5zdHlsZS5jdXJzb3IgPSAnJztcbiAgfVxuICBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyLnByb3RvdHlwZS5zZXRNYXAuY2FsbCh0aGlzLG1hcCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uO1xuIiwidmFyIFBpY2tGZWF0dXJlRXZlbnRUeXBlID0ge1xuICBQSUNLRUQ6ICdwaWNrZWQnXG59O1xuXG52YXIgUGlja0ZlYXR1cmVFdmVudCA9IGZ1bmN0aW9uKHR5cGUsIGNvb3JkaW5hdGUsIGZlYXR1cmUpIHtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy5mZWF0dXJlID0gZmVhdHVyZTtcbiAgdGhpcy5jb29yZGluYXRlID0gY29vcmRpbmF0ZTtcbn07XG5cblxuXG52YXIgUGlja0ZlYXR1cmVJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb2wuaW50ZXJhY3Rpb24uUG9pbnRlci5jYWxsKHRoaXMsIHtcbiAgICBoYW5kbGVEb3duRXZlbnQ6IFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyxcbiAgICBoYW5kbGVVcEV2ZW50OiBQaWNrRmVhdHVyZUludGVyYWN0aW9uLmhhbmRsZVVwRXZlbnRfLFxuICAgIGhhbmRsZU1vdmVFdmVudDogUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5oYW5kbGVNb3ZlRXZlbnRfLFxuICB9KTtcbiAgXG4gIHRoaXMuZmVhdHVyZXNfID0gb3B0aW9ucy5mZWF0dXJlcyB8fCBudWxsO1xuICBcbiAgdGhpcy5sYXllcnNfID0gb3B0aW9ucy5sYXllcnMgfHwgbnVsbDtcbiAgXG4gIHRoaXMucGlja2VkRmVhdHVyZV8gPSBudWxsO1xuICBcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmxheWVyRmlsdGVyXyA9IGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgcmV0dXJuIF8uaW5jbHVkZXMoc2VsZi5sYXllcnNfLCBsYXllcik7XG4gIH07XG59O1xub2wuaW5oZXJpdHMoUGlja0ZlYXR1cmVJbnRlcmFjdGlvbiwgb2wuaW50ZXJhY3Rpb24uUG9pbnRlcik7XG5cblBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlRG93bkV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMucGlja2VkRmVhdHVyZV8gPSB0aGlzLmZlYXR1cmVzQXRQaXhlbF8oZXZlbnQucGl4ZWwsIGV2ZW50Lm1hcCk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5oYW5kbGVVcEV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIGlmKHRoaXMucGlja2VkRmVhdHVyZV8pe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChcbiAgICAgICAgICAgIG5ldyBQaWNrRmVhdHVyZUV2ZW50KFxuICAgICAgICAgICAgICAgIFBpY2tGZWF0dXJlRXZlbnRUeXBlLlBJQ0tFRCxcbiAgICAgICAgICAgICAgICBldmVudC5jb29yZGluYXRlLFxuICAgICAgICAgICAgICAgIHRoaXMucGlja2VkRmVhdHVyZV8pKTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cblBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlTW92ZUV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBlbGVtID0gZXZlbnQubWFwLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgdmFyIGludGVyc2VjdGluZ0ZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzQXRQaXhlbF8oZXZlbnQucGl4ZWwsIGV2ZW50Lm1hcCk7XG5cbiAgaWYgKGludGVyc2VjdGluZ0ZlYXR1cmUpIHtcbiAgICBlbGVtLnN0eWxlLmN1cnNvciA9ICAncG9pbnRlcic7XG4gIH0gZWxzZSB7XG4gICAgZWxlbS5zdHlsZS5jdXJzb3IgPSAnJztcbiAgfVxufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5wcm90b3R5cGUuZmVhdHVyZXNBdFBpeGVsXyA9IGZ1bmN0aW9uKHBpeGVsLCBtYXApIHtcbiAgdmFyIGZvdW5kID0gbnVsbDtcblxuICB2YXIgaW50ZXJzZWN0aW5nRmVhdHVyZSA9IG1hcC5mb3JFYWNoRmVhdHVyZUF0UGl4ZWwocGl4ZWwsXG4gICAgICBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICAgIGlmICh0aGlzLmZlYXR1cmVzXykge1xuICAgICAgICAgIGlmICh0aGlzLmZlYXR1cmVzXy5pbmRleE9mKGZlYXR1cmUpID4gLTEpe1xuICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmVcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmVhdHVyZTtcbiAgICAgIH0sdGhpcyx0aGlzLmxheWVyRmlsdGVyXyk7XG4gIFxuICBpZihpbnRlcnNlY3RpbmdGZWF0dXJlKXtcbiAgICBmb3VuZCA9IGludGVyc2VjdGluZ0ZlYXR1cmU7XG4gIH1cbiAgcmV0dXJuIGZvdW5kO1xufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5wcm90b3R5cGUuc2hvdWxkU3RvcEV2ZW50ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5wcm90b3R5cGUuc2V0TWFwID0gZnVuY3Rpb24obWFwKXtcbiAgaWYgKCFtYXApIHtcbiAgICB2YXIgZWxlbSA9IHRoaXMuZ2V0TWFwKCkuZ2V0VGFyZ2V0RWxlbWVudCgpO1xuICAgIGVsZW0uc3R5bGUuY3Vyc29yID0gJyc7XG4gIH1cbiAgb2wuaW50ZXJhY3Rpb24uUG9pbnRlci5wcm90b3R5cGUuc2V0TWFwLmNhbGwodGhpcyxtYXApO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQaWNrRmVhdHVyZUludGVyYWN0aW9uO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBHZW9tZXRyeVR5cGVzID0gcmVxdWlyZSgnY29yZS9nZW9tZXRyeS9nZW9tZXRyeScpLkdlb21ldHJ5VHlwZXM7XG5cbnZhciBDQVBBQklMSVRJRVMgPSB7XG4gIFFVRVJZOiAxLFxuICBFRElUOiAyXG59O1xuXG52YXIgRURJVE9QUyA9IHtcbiAgSU5TRVJUOiAxLFxuICBVUERBVEU6IDIsXG4gIERFTEVURTogNFxufTtcblxuTGF5ZXJTdGF0ZSA9IHt9O1xuXG5MYXllclN0YXRlLlNlcnZlclR5cGVzID0ge1xuICBPR0M6IFwiT0dDXCIsXG4gIFFHSVM6IFwiUUdJU1wiLFxuICBNYXBzZXJ2ZXI6IFwiTWFwc2VydmVyXCIsXG4gIEdlb3NlcnZlcjogXCJHZW9zZXJ2ZXJcIixcbiAgQXJjR0lTOiBcIkFyY0dJU1wiXG59O1xuXG5MYXllclN0YXRlLmdldEdlb21ldHJ5VHlwZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgcmV0dXJuIGxheWVyU3RhdGUuZ2VvbWV0cnl0eXBlO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24obGF5ZXJTdGF0ZSkge1xuICB2YXIgYXR0cmlidXRlcyA9IFtdO1xuICBpZiAobGF5ZXJTdGF0ZS5hdHRyaWJ1dGVzKSB7XG4gICAgYXR0cmlidXRlcyA9IF8ubWFwKGxheWVyU3RhdGUuYXR0cmlidXRlcyxmdW5jdGlvbihhdHRyaWJ1dGUpIHtcbiAgICAgIHJldHVybiBhdHRyaWJ1dGUubmFtZTtcbiAgICB9KVxuICB9XG4gIHJldHVybiBhdHRyaWJ1dGVzO1xufTtcblxuTGF5ZXJTdGF0ZS5pc1F1ZXJ5YWJsZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpe1xuICB2YXIgcXVlcnlFbmFibGVkID0gZmFsc2U7XG4gIHZhciBxdWVyeWFibGVGb3JDYWJhYmlsaXRpZXMgPSAobGF5ZXJTdGF0ZS5jYXBhYmlsaXRpZXMgJiYgKGxheWVyU3RhdGUuY2FwYWJpbGl0aWVzICYmIENBUEFCSUxJVElFUy5RVUVSWSkpID8gdHJ1ZSA6IGZhbHNlO1xuICBpZiAocXVlcnlhYmxlRm9yQ2FiYWJpbGl0aWVzKSB7XG4gICAgLy8gw6ggaW50ZXJyb2dhYmlsZSBzZSB2aXNpYmlsZSBlIG5vbiBkaXNhYmlsaXRhdG8gKHBlciBzY2FsYSkgb3BwdXJlIHNlIGludGVycm9nYWJpbGUgY29tdW5xdWUgKGZvcnphdG8gZGFsbGEgcHJvcHJpZXTDoCBpbmZvd2hlbm5vdHZpc2libGUpXG4gICAgdmFyIHF1ZXJ5RW5hYmxlZCA9IChsYXllclN0YXRlLnZpc2libGUgJiYgIWxheWVyU3RhdGUuZGlzYWJsZWQpIHx8IChsYXllclN0YXRlLmluZm93aGVubm90dmlzaWJsZSAmJiAobGF5ZXJTdGF0ZS5pbmZvd2hlbm5vdHZpc2libGUgPT09IHRydWUpKTtcbiAgfVxuICByZXR1cm4gcXVlcnlFbmFibGVkO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRRdWVyeUxheWVyTmFtZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgdmFyIHF1ZXJ5TGF5ZXJOYW1lO1xuICBpZiAobGF5ZXJTdGF0ZS5pbmZvbGF5ZXIgJiYgbGF5ZXJTdGF0ZS5pbmZvbGF5ZXIgIT0gJycpIHtcbiAgICBxdWVyeUxheWVyTmFtZSA9IGxheWVyU3RhdGUuaW5mb2xheWVyO1xuICB9XG4gIGVsc2Uge1xuICAgIHF1ZXJ5TGF5ZXJOYW1lID0gbGF5ZXJTdGF0ZS5uYW1lO1xuICB9XG4gIHJldHVybiBxdWVyeUxheWVyTmFtZTtcbn07XG5cbkxheWVyU3RhdGUuZ2V0U2VydmVyVHlwZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgaWYgKGxheWVyU3RhdGUuc2VydmVydHlwZSAmJiBsYXllclN0YXRlLnNlcnZlcnR5cGUgIT0gJycpIHtcbiAgICByZXR1cm4gbGF5ZXJTdGF0ZS5zZXJ2ZXJ0eXBlO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBMYXllclN0YXRlLlNlcnZlclR5cGVzLlFHSVM7XG4gIH1cbn07XG5cbkxheWVyU3RhdGUuaXNFeHRlcm5hbFdNUyA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgcmV0dXJuIChsYXllclN0YXRlLnNvdXJjZSAmJiBsYXllclN0YXRlLnNvdXJjZS51cmwpO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRXTVNMYXllck5hbWUgPSBmdW5jdGlvbihsYXllclN0YXRlKSB7XG4gIHZhciBsYXllck5hbWUgPSBsYXllclN0YXRlLm5hbWU7XG4gIGlmIChsYXllclN0YXRlLnNvdXJjZSAmJiBsYXllclN0YXRlLnNvdXJjZS5sYXllcnMpe1xuICAgIGxheWVyTmFtZSA9IGxheWVyU3RhdGUuc291cmNlLmxheWVyc1xuICB9O1xuICByZXR1cm4gbGF5ZXJOYW1lO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRPcmlnaW5VUkwgPSBmdW5jdGlvbihsYXllclN0YXRlKSB7XG4gIHZhciB1cmw7XG4gIGlmIChsYXllclN0YXRlLnNvdXJjZSAmJiBsYXllclN0YXRlLnNvdXJjZS50eXBlID09ICd3bXMnICYmIGxheWVyU3RhdGUuc291cmNlLnVybCl7XG4gICAgdXJsID0gbGF5ZXJTdGF0ZS5zb3VyY2UudXJsXG4gIH07XG4gIHJldHVybiB1cmw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheWVyU3RhdGU7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIHRydWVmbmMgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykudHJ1ZWZuYztcbnZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgcmVqZWN0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlamVjdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBWZWN0b3JMYXllcihjb25maWcpe1xuICB2YXIgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICB0aGlzLmdlb21ldHJ5dHlwZSA9IGNvbmZpZy5nZW9tZXRyeXR5cGUgfHwgbnVsbDtcbiAgdGhpcy5mb3JtYXQgPSBjb25maWcuZm9ybWF0IHx8IG51bGw7XG4gIHRoaXMuY3JzID0gY29uZmlnLmNycyAgfHwgbnVsbDtcbiAgdGhpcy5pZCA9IGNvbmZpZy5pZCB8fCBudWxsO1xuICB0aGlzLm5hbWUgPSBjb25maWcubmFtZSB8fCBcIlwiO1xuICB0aGlzLnBrID0gY29uZmlnLnBrIHx8IFwiaWRcIjsgLy8gVE9ETzogaWwgR2VvSlNPTiBzZXR0YSBsJ2lkIGRlbGxhIGZlYXR1cmUgZGEgc8OpLCBlIG5hc2NvbmRlIGlsIGNhbXBvIFBLIGRhbGxlIHByb3BlcnRpZXMuIEluIGFsdHJpIGZvcm1hdGkgdmEgdmVyaWZpY2F0bywgZSBjYXNvbWFpIHVzYXJlIGZlYXR1cmUuc2V0SWQoKVxuICBcbiAgdGhpcy5fb2xTb3VyY2UgPSBuZXcgb2wuc291cmNlLlZlY3Rvcih7XG4gICAgZmVhdHVyZXM6IG5ldyBvbC5Db2xsZWN0aW9uKClcbiAgfSk7XG4gIHRoaXMuX29sTGF5ZXIgPSBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgc291cmNlOiB0aGlzLl9vbFNvdXJjZVxuICB9KTtcbiAgXG4gIC8qXG4gICAqIEFycmF5IGRpIG9nZ2V0dGk6XG4gICAqIHtcbiAgICogIG5hbWU6IE5vbWUgZGVsbCdhdHRyaWJ1dG8sXG4gICAqICB0eXBlOiBpbnRlZ2VyIHwgZmxvYXQgfCBzdHJpbmcgfCBib29sZWFuIHwgZGF0ZSB8IHRpbWUgfCBkYXRldGltZSxcbiAgICogIGlucHV0OiB7XG4gICAqICAgIGxhYmVsOiBOb21lIGRlbCBjYW1wbyBkaSBpbnB1dCxcbiAgICogICAgdHlwZTogc2VsZWN0IHwgY2hlY2sgfCByYWRpbyB8IGNvb3Jkc3BpY2tlciB8IGJveHBpY2tlciB8IGxheWVycGlja2VyIHwgZmllbGRkZXBlbmQsXG4gICAqICAgIG9wdGlvbnM6IHtcbiAgICogICAgICBMZSBvcHppb25pIHBlciBsbyBzcGNpZmljbyB0aXBvIGRpIGlucHV0IChlcy4gXCJ2YWx1ZXNcIiBwZXIgbGEgbGlzdGEgZGkgdmFsb3JpIGRpIHNlbGVjdCwgY2hlY2sgZSByYWRpbylcbiAgICogICAgfVxuICAgKiAgfVxuICAgKiB9XG4gICovXG4gIHRoaXMuX1BLaW5BdHRyaWJ1dGVzID0gZmFsc2U7XG4gIHRoaXMuX2ZlYXR1cmVzRmlsdGVyID0gbnVsbDtcbiAgdGhpcy5fZmllbGRzID0gbnVsbFxuICB0aGlzLmxhenlSZWxhdGlvbnMgPSB0cnVlO1xuICB0aGlzLl9yZWxhdGlvbnMgPSBudWxsO1xufVxuaW5oZXJpdChWZWN0b3JMYXllcixHM1dPYmplY3QpO1xubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3JMYXllcjtcblxudmFyIHByb3RvID0gVmVjdG9yTGF5ZXIucHJvdG90eXBlO1xuXG5wcm90by5zZXREYXRhID0gZnVuY3Rpb24oZmVhdHVyZXNEYXRhKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZmVhdHVyZXM7XG4gIGlmICh0aGlzLmZvcm1hdCkge1xuICAgIHN3aXRjaCAodGhpcy5mb3JtYXQpe1xuICAgICAgY2FzZSBcIkdlb0pTT05cIjpcbiAgICAgICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oe1xuICAgICAgICAgIGRlZmF1bHREYXRhUHJvamVjdGlvbjogdGhpcy5jcnMsXG4gICAgICAgICAgZ2VvbWV0cnlOYW1lOiBcImdlb21ldHJ5XCJcbiAgICAgICAgfSk7XG4gICAgICAgIGZlYXR1cmVzID0gZ2VvanNvbi5yZWFkRmVhdHVyZXMoZmVhdHVyZXNEYXRhKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIFxuICAgIGlmIChmZWF0dXJlcyAmJiBmZWF0dXJlcy5sZW5ndGgpIHtcbiAgICAgIGlmICghXy5pc051bGwodGhpcy5fZmVhdHVyZXNGaWx0ZXIpKXtcbiAgICAgICAgdmFyIGZlYXR1cmVzID0gXy5tYXAoZmVhdHVyZXMsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuX2ZlYXR1cmVzRmlsdGVyKGZlYXR1cmUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIGFscmVhZHlMb2FkZWRJZHMgPSB0aGlzLmdldEZlYXR1cmVJZHMoKTtcbiAgICAgIHZhciBmZWF0dXJlc1RvTG9hZCA9IF8uZmlsdGVyKGZlYXR1cmVzLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgICByZXR1cm4gIV8uaW5jbHVkZXMoYWxyZWFkeUxvYWRlZElkcyxmZWF0dXJlLmdldElkKCkpO1xuICAgICAgfSlcbiAgICAgIFxuICAgICAgdGhpcy5fb2xTb3VyY2UuYWRkRmVhdHVyZXMoZmVhdHVyZXNUb0xvYWQpO1xuICAgICAgXG4gICAgICAvLyB2ZXJpZmljbywgcHJlbmRlbmRvIGxhIHByaW1hIGZlYXR1cmUsIHNlIGxhIFBLIMOoIHByZXNlbnRlIG8gbWVubyB0cmEgZ2xpIGF0dHJpYnV0aVxuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSB0aGlzLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKClbMF0uZ2V0UHJvcGVydGllcygpO1xuICAgICAgdGhpcy5fUEtpbkF0dHJpYnV0ZXMgPSBfLmdldChhdHRyaWJ1dGVzLHRoaXMucGspID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1cbiAgfVxuICBlbHNlIHtcbiAgICBjb25zb2xlLmxvZyhcIlZlY3RvckxheWVyIGZvcm1hdCBub3QgZGVmaW5lZFwiKTtcbiAgfVxufTtcblxucHJvdG8uc2V0RmVhdHVyZURhdGEgPSBmdW5jdGlvbihvbGRmaWQsZmlkLGdlb21ldHJ5LGF0dHJpYnV0ZXMpe1xuICB2YXIgZmVhdHVyZSA9IHRoaXMuZ2V0RmVhdHVyZUJ5SWQob2xkZmlkKTtcbiAgaWYgKGZpZCl7XG4gICAgZmVhdHVyZS5zZXRJZChmaWQpO1xuICB9XG4gIFxuICBpZiAoZ2VvbWV0cnkpe1xuICAgIGZlYXR1cmUuc2V0R2VvbWV0cnkoZ2VvbWV0cnkpO1xuICB9XG4gIFxuICBpZiAoYXR0cmlidXRlcyl7XG4gICAgdmFyIG9sZEF0dHJpYnV0ZXMgPSBmZWF0dXJlLmdldFByb3BlcnRpZXMoKTtcbiAgICB2YXIgbmV3QXR0cmlidXRlcyA9Xy5hc3NpZ24ob2xkQXR0cmlidXRlcyxhdHRyaWJ1dGVzKTtcbiAgICBmZWF0dXJlLnNldFByb3BlcnRpZXMobmV3QXR0cmlidXRlcyk7XG4gIH1cbiAgXG4gIHJldHVybiBmZWF0dXJlO1xufTtcblxucHJvdG8uYWRkRmVhdHVyZXMgPSBmdW5jdGlvbihmZWF0dXJlcyl7XG4gIHRoaXMuZ2V0U291cmNlKCkuYWRkRmVhdHVyZXMoZmVhdHVyZXMpO1xufTtcblxucHJvdG8uc2V0RmVhdHVyZXNGaWx0ZXIgPSBmdW5jdGlvbihmZWF0dXJlc0ZpbHRlcil7XG4gIHRoaXMuX2ZlYXR1cmVzRmlsdGVyID0gZmVhdHVyZXNGaWx0ZXI7XG59O1xuXG5wcm90by5zZXRGaWVsZHMgPSBmdW5jdGlvbihmaWVsZHMpe1xuICB0aGlzLl9maWVsZHMgPSBmaWVsZHM7XG59O1xuXG5wcm90by5zZXRQa0ZpZWxkID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgcGtmaWVsZFNldCA9IGZhbHNlO1xuICBfLmZvckVhY2godGhpcy5fZmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICBpZiAoZmllbGQubmFtZSA9PSBzZWxmLnBrICl7XG4gICAgICBwa2ZpZWxkU2V0ID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuICBcbiAgaWYgKCFwa2ZpZWxkU2V0KXtcbiAgICB0aGlzLl9maWVsZHNcbiAgfVxufTtcblxucHJvdG8uZ2V0RmVhdHVyZXMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpO1xufTtcblxucHJvdG8uZ2V0RmVhdHVyZUlkcyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBmZWF0dXJlSWRzID0gXy5tYXAodGhpcy5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgIHJldHVybiBmZWF0dXJlLmdldElkKCk7XG4gIH0pXG4gIHJldHVybiBmZWF0dXJlSWRzXG59O1xuXG5wcm90by5nZXRGaWVsZHMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gXy5jbG9uZURlZXAodGhpcy5fZmllbGRzKTtcbn07XG5cbnByb3RvLmdldEZpZWxkc05hbWVzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIF8ubWFwKHRoaXMuX2ZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgcmV0dXJuIGZpZWxkLm5hbWU7XG4gIH0pO1xufTtcblxucHJvdG8uZ2V0RmllbGRzV2l0aEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihvYmope1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8qdmFyIGZpZWxkcyA9IF8uY2xvbmVEZWVwKF8uZmlsdGVyKHRoaXMuX2ZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgcmV0dXJuICgoZmllbGQubmFtZSAhPSBzZWxmLnBrKSAmJiBmaWVsZC5lZGl0YWJsZSk7XG4gIH0pKTsqL1xuICB2YXIgZmllbGRzID0gXy5jbG9uZURlZXAodGhpcy5fZmllbGRzKTtcbiAgXG4gIHZhciBmZWF0dXJlLCBhdHRyaWJ1dGVzO1xuICBcbiAgLy8gaWwgbWV0b2RvIGFjY2V0dGEgc2lhIGZlYXR1cmUgY2hlIGZpZFxuICBpZiAob2JqIGluc3RhbmNlb2Ygb2wuRmVhdHVyZSl7XG4gICAgZmVhdHVyZSA9IG9iajtcbiAgfVxuICBlbHNlIGlmIChvYmope1xuICAgIGZlYXR1cmUgPSB0aGlzLmdldEZlYXR1cmVCeUlkKG9iaik7XG4gIH1cbiAgaWYgKGZlYXR1cmUpe1xuICAgIGF0dHJpYnV0ZXMgPSBmZWF0dXJlLmdldFByb3BlcnRpZXMoKTtcbiAgfVxuICBcbiAgXy5mb3JFYWNoKGZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgaWYgKGZlYXR1cmUpe1xuICAgICAgaWYgKCF0aGlzLl9QS2luQXR0cmlidXRlcyAmJiBmaWVsZC5uYW1lID09IHNlbGYucGspe1xuICAgICAgICBmaWVsZC52YWx1ZSA9IGZlYXR1cmUuZ2V0SWQoKTtcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIGZpZWxkLnZhbHVlID0gYXR0cmlidXRlc1tmaWVsZC5uYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIGZpZWxkLnZhbHVlID0gbnVsbDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZmllbGRzO1xufTtcblxucHJvdG8uc2V0UmVsYXRpb25zID0gZnVuY3Rpb24ocmVsYXRpb25zKXtcbiAgXy5mb3JFYWNoKHJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbixyZWxhdGlvbktleSl7XG4gICAgcmVsYXRpb24ubmFtZSA9IHJlbGF0aW9uS2V5O1xuICB9KTtcbiAgdGhpcy5fcmVsYXRpb25zID0gcmVsYXRpb25zO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25zID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX3JlbGF0aW9ucztcbn07XG5cbnByb3RvLmhhc1JlbGF0aW9ucyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiAhXy5pc051bGwodGhpcy5fcmVsYXRpb25zKTtcbn07XG5cbnByb3RvLmdldFJlbGF0aW9uc05hbWVzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIF8ua2V5cyh0aGlzLl9yZWxhdGlvbnMpO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25zRmtzS2V5cyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBma3MgPSBbXTtcbiAgXy5mb3JFYWNoKHRoaXMuX3JlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgZmtzLnB1c2gocmVsYXRpb24uZmspO1xuICB9KVxuICByZXR1cm4gZmtzO1xufTtcblxucHJvdG8uZ2V0UmVsYXRpb25GaWVsZHNOYW1lcyA9IGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgdmFyIHJlbGF0aW9uRmllbGRzID0gdGhpcy5fcmVsYXRpb25zW3JlbGF0aW9uXTtcbiAgaWYgKHJlbGF0aW9uRmllbGRzKXtcbiAgICByZXR1cm4gXy5tYXAocmVsYXRpb25GaWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgICAgcmV0dXJuIGZpZWxkLm5hbWU7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59O1xuXG4vLyBvdHRlbmdvIGxlIHJlbGF6aW9uaSBhIHBhcnRpcmUgZGFsIGZpZCBkaSB1bmEgZmVhdHVyZSBlc2lzdGVudGVcbnByb3RvLmdldFJlbGF0aW9uc1dpdGhBdHRyaWJ1dGVzID0gZnVuY3Rpb24oZmlkKXtcbiAgdmFyIHJlbGF0aW9ucyA9IF8uY2xvbmVEZWVwKHRoaXMuX3JlbGF0aW9ucyk7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCFmaWQgfHwgIXRoaXMuZ2V0RmVhdHVyZUJ5SWQoZmlkKSl7XG4gICAgXy5mb3JFYWNoKHJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbixyZWxhdGlvbktleSl7XG4gICAgICAgIC8vIGluaXppYWxtZW50ZSBzZXR0byBhIG51bGwgaSB2YWxvcmlcbiAgICAgIF8uZm9yRWFjaChyZWxhdGlvbi5maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICBmaWVsZC52YWx1ZSA9IG51bGw7XG4gICAgICB9KVxuICAgIH0pO1xuICAgIHJldHVybiByZXNvbHZlKHJlbGF0aW9ucyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMubGF6eVJlbGF0aW9ucyl7XG4gICAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHRoaXMuZ2V0RmVhdHVyZUJ5SWQoZmlkKS5nZXRQcm9wZXJ0aWVzKCk7XG4gICAgICB2YXIgZmtzID0ge307XG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uLHJlbGF0aW9uS2V5KXtcbiAgICAgICAgdmFyIHVybCA9IHJlbGF0aW9uLnVybDtcbiAgICAgICAgdmFyIGtleVZhbHMgPSBbXTtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uLmZrLGZ1bmN0aW9uKGZrS2V5KXtcbiAgICAgICAgICBma3NbZmtLZXldID0gYXR0cmlidXRlc1tma0tleV07XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIFxuICAgICAgdGhpcy5nZXRSZWxhdGlvbnNXaXRoQXR0cmlidXRlc0Zyb21Ga3MoZmtzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVsYXRpb25zUmVzcG9uc2Upe1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlbGF0aW9uc1Jlc3BvbnNlKTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIG90dGVuZ28gbGUgcmVsYXppb25pIHZhbG9yaXp6YXRlIGEgcGFydGlyZSBkYSB1biBvZ2dldHRvIGNvbiBsZSBjaGlhdmkgRksgY29tZSBrZXlzIGUgaSBsb3JvIHZhbG9yaSBjb21lIHZhbHVlc1xucHJvdG8uZ2V0UmVsYXRpb25zV2l0aEF0dHJpYnV0ZXNGcm9tRmtzID0gZnVuY3Rpb24oZmtzKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgcmVsYXRpb25zID0gXy5jbG9uZURlZXAodGhpcy5fcmVsYXRpb25zKTtcbiAgdmFyIHJlbGF0aW9uc1JlcXVlc3RzID0gW107XG5cbiAgXy5mb3JFYWNoKHJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbixyZWxhdGlvbktleSl7XG4gICAgdmFyIHVybCA9IHJlbGF0aW9uLnVybDtcbiAgICB2YXIga2V5VmFscyA9IFtdO1xuICAgIF8uZm9yRWFjaChyZWxhdGlvbi5mayxmdW5jdGlvbihma0tleSl7XG4gICAgICB2YXIgZmtWYWx1ZSA9IGZrc1tma0tleV07XG4gICAgICBrZXlWYWxzLnB1c2goZmtLZXkrXCI9XCIrZmtWYWx1ZSk7XG4gICAgfSk7XG4gICAgdmFyIGZrUGFyYW1zID0gXy5qb2luKGtleVZhbHMsXCImXCIpO1xuICAgIHVybCArPSBcIj9cIitma1BhcmFtcztcbiAgICByZWxhdGlvbnNSZXF1ZXN0cy5wdXNoKCQuZ2V0KHVybClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlbGF0aW9uQXR0cmlidXRlcyl7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbi5maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgIGZpZWxkLnZhbHVlID0gcmVsYXRpb25BdHRyaWJ1dGVzWzBdW2ZpZWxkLm5hbWVdO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgKVxuICB9KVxuICBcbiAgcmV0dXJuICQud2hlbi5hcHBseSh0aGlzLHJlbGF0aW9uc1JlcXVlc3RzKVxuICAudGhlbihmdW5jdGlvbigpe1xuICAgIHJldHVybiByZWxhdGlvbnM7XG4gIH0pO1xufVxuXG5wcm90by5zZXRTdHlsZSA9IGZ1bmN0aW9uKHN0eWxlKXtcbiAgdGhpcy5fb2xMYXllci5zZXRTdHlsZShzdHlsZSk7XG59O1xuXG5wcm90by5nZXRMYXllciA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLl9vbExheWVyO1xufTtcblxucHJvdG8uZ2V0U291cmNlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX29sTGF5ZXIuZ2V0U291cmNlKCk7XG59O1xuXG5wcm90by5nZXRGZWF0dXJlQnlJZCA9IGZ1bmN0aW9uKGlkKXtcbiAgcmV0dXJuIHRoaXMuX29sTGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZUJ5SWQoaWQpO1xufTtcblxucHJvdG8uY2xlYXIgPSBmdW5jdGlvbigpe1xuICB0aGlzLmdldFNvdXJjZSgpLmNsZWFyKCk7XG59O1xuXG5wcm90by5hZGRUb01hcCA9IGZ1bmN0aW9uKG1hcCl7XG4gIG1hcC5hZGRMYXllcih0aGlzLl9vbExheWVyKTtcbn07XG5cbi8vIGRhdGEgdW5hIGZlYXR1cmUgdmVyaWZpY28gc2UgaGEgdHJhIGdsaSBhdHRyaWJ1dGkgaSB2YWxvcmkgZGVsbGUgRksgZGVsbGUgKGV2ZW50dWFsaSkgcmVsYXppb25pXG5wcm90by5mZWF0dXJlSGFzUmVsYXRpb25zRmtzV2l0aFZhbHVlcyA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICB2YXIgYXR0cmlidXRlcyA9IGZlYXR1cmUuZ2V0UHJvcGVydGllcygpO1xuICB2YXIgZmtzS2V5cyA9IHRoaXMuZ2V0UmVsYXRpb25zRmtzS2V5cygpO1xuICByZXR1cm4gXy5ldmVyeShma3NLZXlzLGZ1bmN0aW9uKGZrS2V5KXtcbiAgICB2YXIgdmFsdWUgPSBhdHRyaWJ1dGVzW2ZrS2V5XTtcbiAgICByZXR1cm4gKCFfLmlzTmlsKHZhbHVlKSAmJiB2YWx1ZSAhPSAnJyk7XG4gIH0pXG59O1xuXG4vLyBkYXRhIHVuYSBmZWF0dXJlIHBvcG9sbyB1biBvZ2dldHRvIGNvbiBjaGlhdmkvdmFsb3JpIGRlbGxlIEZLIGRlbGxlIChldmVudHVhbGkpIHJlbGF6aW9uZVxucHJvdG8uZ2V0UmVsYXRpb25zRmtzV2l0aFZhbHVlc0ZvckZlYXR1cmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgdmFyIGF0dHJpYnV0ZXMgPSBmZWF0dXJlLmdldFByb3BlcnRpZXMoKTtcbiAgdmFyIGZrcyA9IHt9O1xuICB2YXIgZmtzS2V5cyA9IHRoaXMuZ2V0UmVsYXRpb25zRmtzS2V5cygpO1xuICBfLmZvckVhY2goZmtzS2V5cyxmdW5jdGlvbihma0tleSl7XG4gICAgZmtzW2ZrS2V5XSA9IGF0dHJpYnV0ZXNbZmtLZXldO1xuICB9KVxuICByZXR1cm4gZmtzO1xufTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIExheWVyU3RhdGUgPSByZXF1aXJlKCdjb3JlL2xheWVyL2xheWVyc3RhdGUnKTtcbnZhciBNYXBMYXllciA9IHJlcXVpcmUoJ2NvcmUvbWFwL21hcGxheWVyJyk7XG52YXIgUmFzdGVyTGF5ZXJzID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvbGF5ZXJzL3Jhc3RlcnMnKTtcblxuZnVuY3Rpb24gV01TTGF5ZXIob3B0aW9ucyxleHRyYVBhcmFtcyl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5MQVlFUlRZUEUgPSB7XG4gICAgTEFZRVI6ICdsYXllcicsXG4gICAgTVVMVElMQVlFUjogJ211bHRpbGF5ZXInXG4gIH07XG5cbiAgdGhpcy5leHRyYVBhcmFtcyA9IGV4dHJhUGFyYW1zXG4gIHRoaXMubGF5ZXJzID0gW107XG4gIFxuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG59XG5pbmhlcml0KFdNU0xheWVyLE1hcExheWVyKVxudmFyIHByb3RvID0gV01TTGF5ZXIucHJvdG90eXBlO1xuXG5wcm90by5nZXRPTExheWVyID0gZnVuY3Rpb24oKXtcbiAgdmFyIG9sTGF5ZXIgPSB0aGlzLl9vbExheWVyO1xuICBpZiAoIW9sTGF5ZXIpe1xuICAgIG9sTGF5ZXIgPSB0aGlzLl9vbExheWVyID0gdGhpcy5fbWFrZU9sTGF5ZXIoKTtcbiAgfVxuICByZXR1cm4gb2xMYXllcjtcbn07XG5cbnByb3RvLmdldFNvdXJjZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLmdldE9MTGF5ZXIoKS5nZXRTb3VyY2UoKTtcbn07XG5cbnByb3RvLmdldEluZm9Gb3JtYXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICdhcHBsaWNhdGlvbi92bmQub2djLmdtbCc7XG59O1xuXG5wcm90by5nZXRHZXRGZWF0dXJlSW5mb1VybCA9IGZ1bmN0aW9uKGNvb3JkaW5hdGUscmVzb2x1dGlvbixlcHNnLHBhcmFtcyl7XG4gIHJldHVybiB0aGlzLmdldE9MTGF5ZXIoKS5nZXRTb3VyY2UoKS5nZXRHZXRGZWF0dXJlSW5mb1VybChjb29yZGluYXRlLHJlc29sdXRpb24sZXBzZyxwYXJhbXMpO1xufTtcblxucHJvdG8uZ2V0TGF5ZXJDb25maWdzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMubGF5ZXJzO1xufTtcblxucHJvdG8uYWRkTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvbmZpZyl7XG4gIHRoaXMubGF5ZXJzLnB1c2gobGF5ZXJDb25maWcpO1xufTtcblxucHJvdG8udG9nZ2xlTGF5ZXIgPSBmdW5jdGlvbihsYXllcil7XG4gIF8uZm9yRWFjaCh0aGlzLmxheWVycyxmdW5jdGlvbihfbGF5ZXIpe1xuICAgIGlmIChfbGF5ZXIuaWQgPT0gbGF5ZXIuaWQpe1xuICAgICAgX2xheWVyLnZpc2libGUgPSBsYXllci52aXNpYmxlO1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuX3VwZGF0ZUxheWVycygpO1xufTtcbiAgXG5wcm90by51cGRhdGUgPSBmdW5jdGlvbihtYXBTdGF0ZSxleHRyYVBhcmFtcyl7XG4gIHRoaXMuX3VwZGF0ZUxheWVycyhtYXBTdGF0ZSxleHRyYVBhcmFtcyk7XG59O1xuXG5wcm90by5pc1Zpc2libGUgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fZ2V0VmlzaWJsZUxheWVycygpLmxlbmd0aCA+IDA7XG59O1xuXG5wcm90by5nZXRRdWVyeVVybCA9IGZ1bmN0aW9uKCl7XG4gIHZhciBsYXllciA9IHRoaXMubGF5ZXJzWzBdO1xuICBpZiAobGF5ZXIuaW5mb3VybCAmJiBsYXllci5pbmZvdXJsICE9ICcnKSB7XG4gICAgcmV0dXJuIGxheWVyLmluZm91cmw7XG4gIH1cbiAgcmV0dXJuIHRoaXMuY29uZmlnLnVybDtcbn07XG5cbnByb3RvLmdldFF1ZXJ5TGF5ZXJzID0gZnVuY3Rpb24oKXsgXG4gIHZhciBsYXllciA9IHRoaXMubGF5ZXJzWzBdO1xuICB2YXIgcXVlcnlMYXllcnMgPSBbXTtcbiAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICBpZiAoTGF5ZXJTdGF0ZS5pc1F1ZXJ5YWJsZShsYXllcikpIHtcbiAgICAgIHF1ZXJ5TGF5ZXJzLnB1c2goe1xuICAgICAgICBsYXllck5hbWU6IExheWVyU3RhdGUuZ2V0V01TTGF5ZXJOYW1lKGxheWVyKSxcbiAgICAgICAgcXVlcnlMYXllck5hbWU6IExheWVyU3RhdGUuZ2V0UXVlcnlMYXllck5hbWUobGF5ZXIpLFxuICAgICAgICBnZW9tZXRyeVR5cGU6IExheWVyU3RhdGUuZ2V0R2VvbWV0cnlUeXBlKGxheWVyKSxcbiAgICAgICAgYXR0cmlidXRlczogTGF5ZXJTdGF0ZS5nZXRBdHRyaWJ1dGVzKGxheWVyKVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHF1ZXJ5TGF5ZXJzO1xufTtcblxucHJvdG8uX21ha2VPbExheWVyID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgd21zQ29uZmlnID0ge1xuICAgIHVybDogdGhpcy5jb25maWcudXJsLFxuICAgIGlkOiB0aGlzLmNvbmZpZy5pZFxuICB9O1xuICBcbiAgdmFyIHJlcHJlc2VudGF0aXZlTGF5ZXIgPSB0aGlzLmxheWVyc1swXTsgLy9CUlVUVE8sIERFVk8gUFJFTkRFUkUgVU4gTEFZRVIgQSBDQVNPIChJTCBQUklNTykgUEVSIFZFREVSRSBTRSBQVU5UQSBBRCBVTiBTT1VSQ0UgRElWRVJTTyAoZG92cmViYmUgYWNjYWRlcmUgc29sbyBwZXIgaSBsYXllciBzaW5nb2xpLCBXTVMgZXN0ZXJuaSlcbiAgXG4gIGlmIChyZXByZXNlbnRhdGl2ZUxheWVyLnNvdXJjZSAmJiByZXByZXNlbnRhdGl2ZUxheWVyLnNvdXJjZS50eXBlID09ICd3bXMnICYmIHJlcHJlc2VudGF0aXZlTGF5ZXIuc291cmNlLnVybCl7XG4gICAgd21zQ29uZmlnLnVybCA9IHJlcHJlc2VudGF0aXZlTGF5ZXIuc291cmNlLnVybDtcbiAgfTtcbiAgXG4gIHZhciBvbExheWVyID0gbmV3IFJhc3RlckxheWVycy5XTVNMYXllcih3bXNDb25maWcsdGhpcy5leHRyYVBhcmFtcyk7XG4gIFxuICBvbExheWVyLmdldFNvdXJjZSgpLm9uKCdpbWFnZWxvYWRzdGFydCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmVtaXQoXCJsb2Fkc3RhcnRcIik7XG4gICAgICB9KTtcbiAgb2xMYXllci5nZXRTb3VyY2UoKS5vbignaW1hZ2Vsb2FkZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmVtaXQoXCJsb2FkZW5kXCIpO1xuICB9KTtcbiAgXG4gIHJldHVybiBvbExheWVyXG59O1xuXG5wcm90by5fZ2V0VmlzaWJsZUxheWVycyA9IGZ1bmN0aW9uKG1hcFN0YXRlKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgdmlzaWJsZUxheWVycyA9IFtdO1xuICBfLmZvckVhY2godGhpcy5sYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgIHZhciByZXNvbHV0aW9uQmFzZWRWaXNpYmlsaXR5ID0gbGF5ZXIubWF4cmVzb2x1dGlvbiA/IChsYXllci5tYXhyZXNvbHV0aW9uICYmIGxheWVyLm1heHJlc29sdXRpb24gPiBtYXBTdGF0ZS5yZXNvbHV0aW9uKSA6IHRydWU7XG4gICAgaWYgKGxheWVyLnZpc2libGUgJiYgcmVzb2x1dGlvbkJhc2VkVmlzaWJpbGl0eSkge1xuICAgICAgdmlzaWJsZUxheWVycy5wdXNoKGxheWVyKTtcbiAgICB9ICAgIFxuICB9KVxuICByZXR1cm4gdmlzaWJsZUxheWVycztcbn07XG5cbnByb3RvLmNoZWNrTGF5ZXJEaXNhYmxlZCA9IGZ1bmN0aW9uKGxheWVyLHJlc29sdXRpb24pIHtcbiAgdmFyIGRpc2FibGVkID0gbGF5ZXIuZGlzYWJsZWQgfHwgZmFsc2U7XG4gIGlmIChsYXllci5tYXhyZXNvbHV0aW9uKXtcbiAgICBkaXNhYmxlZCA9IGxheWVyLm1heHJlc29sdXRpb24gPCByZXNvbHV0aW9uO1xuICB9XG4gIGlmIChsYXllci5taW5yZXNvbHV0aW9uKXtcbiAgICBsYXllci5kaXNhYmxlZCA9IGRpc2FibGVkICYmIChsYXllci5taW5yZXNvbHV0aW9uID4gcmVzb2x1dGlvbik7XG4gIH1cbiAgbGF5ZXIuZGlzYWJsZWQgPSBkaXNhYmxlZDtcbn07XG5cbnByb3RvLmNoZWNrTGF5ZXJzRGlzYWJsZWQgPSBmdW5jdGlvbihyZXNvbHV0aW9uKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBfLmZvckVhY2godGhpcy5sYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgIHNlbGYuY2hlY2tMYXllckRpc2FibGVkKGxheWVyLHJlc29sdXRpb24pO1xuICB9KTtcbn07XG5cbnByb3RvLl91cGRhdGVMYXllcnMgPSBmdW5jdGlvbihtYXBTdGF0ZSxleHRyYVBhcmFtcyl7XG4gIHRoaXMuY2hlY2tMYXllcnNEaXNhYmxlZChtYXBTdGF0ZS5yZXNvbHV0aW9uKTtcbiAgdmFyIHZpc2libGVMYXllcnMgPSB0aGlzLl9nZXRWaXNpYmxlTGF5ZXJzKG1hcFN0YXRlKTtcbiAgaWYgKHZpc2libGVMYXllcnMubGVuZ3RoID4gMCkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBMQVlFUlM6IF8uam9pbihfLm1hcCh2aXNpYmxlTGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgICAgcmV0dXJuIExheWVyU3RhdGUuZ2V0V01TTGF5ZXJOYW1lKGxheWVyKTtcbiAgICAgIH0pLCcsJylcbiAgICB9O1xuICAgIGlmIChleHRyYVBhcmFtcykge1xuICAgICAgcGFyYW1zID0gXy5hc3NpZ24ocGFyYW1zLGV4dHJhUGFyYW1zKTtcbiAgICB9XG4gICAgdGhpcy5fb2xMYXllci5zZXRWaXNpYmxlKHRydWUpO1xuICAgIHRoaXMuX29sTGF5ZXIuZ2V0U291cmNlKCkudXBkYXRlUGFyYW1zKHBhcmFtcyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhpcy5fb2xMYXllci5zZXRWaXNpYmxlKGZhbHNlKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBXTVNMYXllcjtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cblxuZnVuY3Rpb24gTWFwTGF5ZXIoY29uZmlnKXtcbiAgdGhpcy5jb25maWcgPSBjb25maWcgfHwge307XG4gIHRoaXMuaWQgPSBjb25maWcuaWQ7XG4gIFxuICB0aGlzLl9vbExheWVyID0gbnVsbDtcbiAgXG4gIGJhc2UodGhpcyk7XG59XG5pbmhlcml0KE1hcExheWVyLEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IE1hcExheWVyLnByb3RvdHlwZTtcblxucHJvdG8uZ2V0SWQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5pZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwTGF5ZXI7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIEdlb21ldHJ5ID0gcmVxdWlyZSgnY29yZS9nZW9tZXRyeS9nZW9tZXRyeScpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xuXG5cbi8vdmFyIEdVSSA9IHJlcXVpcmUoJ2d1aS9ndWknKTsgLy8gUVVFU1RPIE5PTiBDSSBERVZFIEVTU0VSRSEhIVxuXG5mdW5jdGlvbiBNYXBRdWVyeVNlcnZpY2UoKSB7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKG1hcCl7XG4gICAgdGhpcy5tYXAgPSBtYXA7XG4gIH1cbiAgXG4gIHRoaXMucXVlcnlQb2ludCA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzLG1hcExheWVycykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgdXJsc0ZvckxheWVycyA9IHt9O1xuICAgIF8uZm9yRWFjaChtYXBMYXllcnMsZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgICAgdmFyIHVybCA9IG1hcExheWVyLmdldFF1ZXJ5VXJsKCk7XG4gICAgICB2YXIgdXJsSGFzaCA9IHVybC5oYXNoQ29kZSgpLnRvU3RyaW5nKCk7XG4gICAgICBpZiAoXy5rZXlzKHVybHNGb3JMYXllcnMpLmluZGV4T2YodXJsSGFzaCkgPT0gLTEpIHtcbiAgICAgICAgdXJsc0ZvckxheWVyc1t1cmxIYXNoXSA9IHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBtYXBMYXllcnM6IFtdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICB1cmxzRm9yTGF5ZXJzW3VybEhhc2hdLm1hcExheWVycy5wdXNoKG1hcExheWVyKTtcbiAgICB9KVxuICAgIFxuICAgIHZhciBxdWVyeVVybHNGb3JMYXllcnMgPSBbXTtcbiAgICBfLmZvckVhY2godXJsc0ZvckxheWVycyxmdW5jdGlvbih1cmxGb3JMYXllcnMpe1xuICAgICAgdmFyIGZpcnN0TGF5ZXIgPSB1cmxGb3JMYXllcnMubWFwTGF5ZXJzWzBdO1xuICAgICAgdmFyIF9nZXRGZWF0dXJlSW5mb1VybCA9IHNlbGYuZ2V0R2V0RmVhdHVyZUluZm9VcmwoZmlyc3RMYXllcixjb29yZGluYXRlcyk7XG4gICAgICB2YXIgcXVlcnlCYXNlID0gX2dldEZlYXR1cmVJbmZvVXJsLnNwbGl0KCc/JylbMF07XG4gICAgICB2YXIgcXVlcnlTdHJpbmcgPSBfZ2V0RmVhdHVyZUluZm9Vcmwuc3BsaXQoJz8nKVsxXTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgXy5mb3JFYWNoKHF1ZXJ5U3RyaW5nLnNwbGl0KCcmJyksZnVuY3Rpb24ocXVlcnlTdHJpbmdQYWlyKXtcbiAgICAgICAgdmFyIHF1ZXJ5UGFpciA9IHF1ZXJ5U3RyaW5nUGFpci5zcGxpdCgnPScpO1xuICAgICAgICB2YXIga2V5ID0gcXVlcnlQYWlyWzBdO1xuICAgICAgICB2YXIgdmFsdWUgPSBxdWVyeVBhaXJbMV07XG4gICAgICAgIHF1ZXJ5UGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICB2YXIgbGF5ZXJOYW1lcyA9IFtdO1xuICAgICAgdmFyIHF1ZXJ5TGF5ZXJzID0gW107XG4gICAgICBfLmZvckVhY2godXJsRm9yTGF5ZXJzLm1hcExheWVycyxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICAgIC8vdmFyIG1hcExheWVyTGF5ZXJzTmFtZXMgPSBtYXBMYXllci5nZXRMYXllcigpLmdldFNvdXJjZSgpLmdldFBhcmFtcygpWydMQVlFUlMnXTtcbiAgICAgICAgLy9sYXllck5hbWVzID0gXy5jb25jYXQobGF5ZXJOYW1lcyxtYXBMYXllckxheWVyc05hbWVzKTtcbiAgICAgICAgdmFyIG1hcExheWVyUXVlcnlMYXllcnMgPSBtYXBMYXllci5nZXRRdWVyeUxheWVycygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1hcExheWVyUXVlcnlMYXllcnMubGVuZ3RoKSB7XG4gICAgICAgICAgcXVlcnlMYXllcnMgPSBfLmNvbmNhdChxdWVyeUxheWVycyxtYXBMYXllclF1ZXJ5TGF5ZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgaWYgKHF1ZXJ5TGF5ZXJzLmxlbmd0aCkge1xuICAgICAgICBkZWxldGUgcXVlcnlQYXJhbXNbJ1NUWUxFUyddO1xuICAgICAgXG4gICAgICAgIHF1ZXJ5UGFyYW1zWydMQVlFUlMnXSA9IF8ubWFwKHF1ZXJ5TGF5ZXJzLCdxdWVyeUxheWVyTmFtZScpO1xuICAgICAgICBxdWVyeVBhcmFtc1snUVVFUllfTEFZRVJTJ10gPSBfLm1hcChxdWVyeUxheWVycywncXVlcnlMYXllck5hbWUnKTtcbiAgICAgICAgcXVlcnlQYXJhbXNbJ0ZFQVRVUkVfQ09VTlQnXSA9IDEwMDA7XG4gICAgICAgIFxuICAgICAgICB2YXIgZ2V0RmVhdHVyZUluZm9VcmwgPSBxdWVyeUJhc2U7XG4gICAgICAgIHZhciBuZXdRdWVyeVBhaXJzID0gW107XG4gICAgICAgIF8uZm9yRWFjaChxdWVyeVBhcmFtcyxmdW5jdGlvbih2YWx1ZSxrZXkpe1xuICAgICAgICAgIG5ld1F1ZXJ5UGFpcnMucHVzaChrZXkrJz0nK3ZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGdldEZlYXR1cmVJbmZvVXJsID0gcXVlcnlCYXNlKyc/JytuZXdRdWVyeVBhaXJzLmpvaW4oJyYnKVxuICAgICAgICBcbiAgICAgICAgcXVlcnlVcmxzRm9yTGF5ZXJzLnB1c2goe1xuICAgICAgICAgIHVybDogZ2V0RmVhdHVyZUluZm9VcmwsXG4gICAgICAgICAgcXVlcnlMYXllcnM6IHF1ZXJ5TGF5ZXJzXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gICAgXG4gICAgdmFyIGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyA9IHt9O1xuICAgIGlmIChxdWVyeVVybHNGb3JMYXllcnMubGVuZ3RoID4gMCkge1xuICAgICAgXy5mb3JFYWNoKHF1ZXJ5VXJsc0ZvckxheWVycyxmdW5jdGlvbihxdWVyeVVybEZvckxheWVycyl7XG4gICAgICAgIHZhciB1cmwgPSBxdWVyeVVybEZvckxheWVycy51cmw7XG4gICAgICAgIHZhciBxdWVyeUxheWVycyA9IHF1ZXJ5VXJsRm9yTGF5ZXJzLnF1ZXJ5TGF5ZXJzO1xuXG4gICAgICAgICQuZ2V0KHVybCkuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgIHZhciBqc29ucmVzcG9uc2U7XG4gICAgICAgICAgdmFyIHgyanMgPSBuZXcgWDJKUygpO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoXy5pc1N0cmluZyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAganNvbnJlc3BvbnNlID0geDJqcy54bWxfc3RyMmpzb24ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGpzb25yZXNwb25zZSA9IHgyanMueG1sMmpzb24ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgZC5yZWplY3QoZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByb290Tm9kZSA9IF8ua2V5cyhqc29ucmVzcG9uc2UpWzBdO1xuICAgICAgICAgIHZhciBwYXJzZXIsIGRhdGE7XG4gICAgICAgICAgc3dpdGNoIChyb290Tm9kZSkge1xuICAgICAgICAgICAgY2FzZSAnRmVhdHVyZUNvbGxlY3Rpb24nOlxuICAgICAgICAgICAgICBwYXJzZXIgPSBzZWxmLl9wYXJzZUxheWVyRmVhdHVyZUNvbGxlY3Rpb247XG4gICAgICAgICAgICAgIGRhdGEgPSBqc29ucmVzcG9uc2U7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIm1zR01MT3V0cHV0XCI6XG4gICAgICAgICAgICAgIHBhcnNlciA9IHNlbGYuX3BhcnNlTGF5ZXJtc0dNTE91dHB1dDtcbiAgICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5mZWF0dXJlcyA9IDBcbiAgICAgICAgICBfLmZvckVhY2gocXVlcnlMYXllcnMsZnVuY3Rpb24ocXVlcnlMYXllcil7XG4gICAgICAgICAgICB2YXIgZmVhdHVyZXMgPSBwYXJzZXIuY2FsbChzZWxmLHF1ZXJ5TGF5ZXIsZGF0YSlcbiAgICAgICAgICAgIG5mZWF0dXJlcyArPSBmZWF0dXJlcy5sZW5ndGg7XG4gICAgICAgICAgICBmZWF0dXJlc0ZvckxheWVyTmFtZXNbcXVlcnlMYXllci5sYXllck5hbWVdID0gZmVhdHVyZXM7XG4gICAgICAgICAgfSlcbiAgICAgICAgICBkLnJlc29sdmUoY29vcmRpbmF0ZXMsbmZlYXR1cmVzLGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGQucmVqZWN0KGUpO1xuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZC5yZXNvbHZlKGNvb3JkaW5hdGVzLDAsZmVhdHVyZXNGb3JMYXllck5hbWVzKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgLy8gQnJ1dHRvIG1hIHBlciBvcmEgdW5pY2Egc29sdXppb25lIHRyb3ZhdGEgcGVyIGRpdmlkZXJlIHBlciBsYXllciBpIHJpc3VsdGF0aSBkaSB1biBkb2MgeG1sIHdmcy5GZWF0dXJlQ29sbGVjdGlvbi4gT0wzIGxpIHBhcnNlcml6emEgdHV0dGkgaW5zaWVtZS4uLlxuICB0aGlzLl9wYXJzZUxheWVyRmVhdHVyZUNvbGxlY3Rpb24gPSBmdW5jdGlvbihxdWVyeUxheWVyLGRhdGEpe1xuICAgIHZhciBmZWF0dXJlcyA9IFtdO1xuICAgIHZhciBsYXllck5hbWUgPSBxdWVyeUxheWVyLnF1ZXJ5TGF5ZXJOYW1lO1xuICAgIHZhciBsYXllckRhdGEgPSBfLmNsb25lRGVlcChkYXRhKTtcbiAgICBsYXllckRhdGEuRmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZU1lbWJlciA9IFtdO1xuICAgIFxuICAgIHZhciBmZWF0dXJlTWVtYmVycyA9IGRhdGEuRmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZU1lbWJlcjtcbiAgICBfLmZvckVhY2goZmVhdHVyZU1lbWJlcnMsZnVuY3Rpb24oZmVhdHVyZU1lbWJlcil7XG4gICAgICB2YXIgaXNMYXllck1lbWJlciA9IF8uZ2V0KGZlYXR1cmVNZW1iZXIsbGF5ZXJOYW1lKVxuXG4gICAgICBpZiAoaXNMYXllck1lbWJlcikge1xuICAgICAgICBsYXllckRhdGEuRmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZU1lbWJlci5wdXNoKGZlYXR1cmVNZW1iZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIHZhciB4MmpzID0gbmV3IFgySlMoKTtcbiAgICB2YXIgbGF5ZXJGZWF0dXJlQ29sbGVjdGlvblhNTCA9IHgyanMuanNvbjJ4bWxfc3RyKGxheWVyRGF0YSk7XG4gICAgdmFyIHBhcnNlciA9IG5ldyBvbC5mb3JtYXQuV01TR2V0RmVhdHVyZUluZm8oKTtcbiAgICByZXR1cm4gcGFyc2VyLnJlYWRGZWF0dXJlcyhsYXllckZlYXR1cmVDb2xsZWN0aW9uWE1MKTtcbiAgfTtcbiAgXG4gIC8vIG1lbnRyZSBjb24gaSByaXN1bHRhdGkgaW4gbXNHTE1PdXRwdXQgKGRhIE1hcHNlcnZlcikgaWwgcGFyc2VyIHB1w7IgZXNzZXJlIGlzdHJ1aXRvIHBlciBwYXJzZXJpenphcmUgaW4gYmFzZSBhZCB1biBsYXllciBkaSBmaWx0cm9cbiAgdGhpcy5fcGFyc2VMYXllcm1zR01MT3V0cHV0ID0gZnVuY3Rpb24ocXVlcnlMYXllcixkYXRhKXtcbiAgICB2YXIgcGFyc2VyID0gbmV3IG9sLmZvcm1hdC5XTVNHZXRGZWF0dXJlSW5mbyh7XG4gICAgICBsYXllcnM6IFtxdWVyeUxheWVyLnF1ZXJ5TGF5ZXJOYW1lXVxuICAgIH0pO1xuICAgIHJldHVybiBwYXJzZXIucmVhZEZlYXR1cmVzKGRhdGEpO1xuICB9O1xuICBcbiAgdGhpcy5xdWVyeVJlY3QgPSBmdW5jdGlvbihyZWN0LGxheWVySWQpIHtcbiAgICBcbiAgfTtcbiAgXG4gIHRoaXMuX3F1ZXJ5ID0gZnVuY3Rpb24ocmVjdCxsYXllcklkKSB7XG4gICAgdmFyIFByb2plY3QgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCk7XG4gICAgdmFyIGxheWVycztcbiAgICBpZiAobGF5ZXJJZCkge1xuICAgICAgbGF5ZXJzID0gW1Byb2plY3QuZ2V0TGF5ZXIobGF5ZXJJZCldO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGxheWVycyA9IFByb2plY3QuZ2V0TGF5ZXJzKCk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5nZXRHZXRGZWF0dXJlSW5mb1VybCA9IGZ1bmN0aW9uKG1hcExheWVyLGNvb3JkaW5hdGUpe1xuICAgIC8vdmFyIHBhcnNlciA9IG5ldyBvbC5mb3JtYXQuV01TR2V0RmVhdHVyZUluZm8oKTtcbiAgICB2YXIgcmVzb2x1dGlvbiA9IHRoaXMubWFwLmdldFZpZXcoKS5nZXRSZXNvbHV0aW9uKCk7XG4gICAgdmFyIGVwc2cgPSB0aGlzLm1hcC5nZXRWaWV3KCkuZ2V0UHJvamVjdGlvbigpLmdldENvZGUoKTtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgUVVFUllfTEFZRVJTOiBfLm1hcChtYXBMYXllci5nZXRRdWVyeUxheWVycygpLCdxdWVyeUxheWVyTmFtZScpLFxuICAgICAgSU5GT19GT1JNQVQ6IG1hcExheWVyLmdldEluZm9Gb3JtYXQoKSxcbiAgICAgIC8vIFBBUkFNRVRSSSBESSBUT0xMRVJBTlpBIFBFUiBRR0lTIFNFUlZFUlxuICAgICAgRklfUE9JTlRfVE9MRVJBTkNFOiAxMCxcbiAgICAgIEZJX0xJTkVfVE9MRVJBTkNFOiAxMCxcbiAgICAgIEZJX1BPTFlHT05fVE9MRVJBTkNFOiAxMCAgICAgIFxuICAgIH1cbiAgICB2YXIgdXJsID0gbWFwTGF5ZXIuZ2V0R2V0RmVhdHVyZUluZm9VcmwoY29vcmRpbmF0ZSxyZXNvbHV0aW9uLGVwc2cscGFyYW1zKTtcbiAgICByZXR1cm4gdXJsO1xuICB9O1xufVxuaW5oZXJpdChNYXBRdWVyeVNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTWFwUXVlcnlTZXJ2aWNlO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBHVUkgPSByZXF1aXJlKCdndWkvZ3VpJyk7XG52YXIgQXBwbGljYXRpb25TZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9hcHBsaWNhdGlvbnNlcnZpY2UnKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcbnZhciBQcm9qZWN0VHlwZXMgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHR5cGVzJyk7XG52YXIgR2VvbWV0cnlUeXBlcyA9IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbWV0cnknKS5HZW9tZXRyeVR5cGVzO1xudmFyIG9sM2hlbHBlcnMgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9nM3cub2wzJykuaGVscGVycztcbnZhciBSZXNldENvbnRyb2wgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9jb250cm9scy9yZXNldGNvbnRyb2wnKTtcbnZhciBRdWVyeUNvbnRyb2wgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9jb250cm9scy9xdWVyeWNvbnRyb2wnKTtcbnZhciBab29tQm94Q29udHJvbCA9IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2NvbnRyb2xzL3pvb21ib3hjb250cm9sJyk7XG52YXIgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24gPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9pbnRlcmFjdGlvbnMvcGlja2Nvb3JkaW5hdGVzaW50ZXJhY3Rpb24nKTtcbnZhciBXTVNMYXllciA9IHJlcXVpcmUoJ2NvcmUvbGF5ZXIvd21zbGF5ZXInKTtcbnZhciBNYXBRdWVyeVNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL21hcC9tYXBxdWVyeXNlcnZpY2UnKTtcblxuLy92YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpOyAvLyBRVUVTVE8gTk9OIENJIERFVkUgRVNTRVJFISEhXG5cbnZhciBQaWNrVG9sZXJhbmNlUGFyYW1zID0ge307XG5QaWNrVG9sZXJhbmNlUGFyYW1zW1Byb2plY3RUeXBlcy5RREpBTkdPXSA9IHt9O1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT11bR2VvbWV0cnlUeXBlcy5QT0lOVF0gPSBcIkZJX1BPSU5UX1RPTEVSQU5DRVwiO1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT11bR2VvbWV0cnlUeXBlcy5MSU5FU1RSSU5HXSA9IFwiRklfTElORV9UT0xFUkFOQ0VcIjtcblBpY2tUb2xlcmFuY2VQYXJhbXNbUHJvamVjdFR5cGVzLlFESkFOR09dW0dlb21ldHJ5VHlwZXMuUE9MWUdPTl0gPSBcIkZJX1BPTFlHT05fVE9MRVJBTkNFXCI7XG5cbnZhciBQaWNrVG9sZXJhbmNlVmFsdWVzID0ge31cblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5QT0lOVF0gPSA1O1xuUGlja1RvbGVyYW5jZVZhbHVlc1tHZW9tZXRyeVR5cGVzLkxJTkVTVFJJTkddID0gNTtcblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5QT0xZR09OXSA9IDU7XG5cbmZ1bmN0aW9uIE1hcFNlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgUHJvamVjdCA9IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFNlcnZpY2UoKTtcbiAgdGhpcy5jb25maWc7XG4gIHRoaXMudmlld2VyO1xuICB0aGlzLm1hcExheWVycyA9IHt9O1xuICB0aGlzLm1hcEJhc2VMYXllcnMgPSB7fTtcbiAgdGhpcy5sYXllcnNBc3NvY2lhdGlvbiA9IHt9O1xuICB0aGlzLmxheWVyc0V4dHJhUGFyYW1zID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgICBiYm94OiBbXSxcbiAgICAgIHJlc29sdXRpb246IG51bGwsXG4gICAgICBjZW50ZXI6IG51bGwsXG4gICAgICBsb2FkaW5nOiBmYWxzZVxuICB9O1xuICB0aGlzLmNvbmZpZyA9IEFwcGxpY2F0aW9uU2VydmljZS5nZXRDb25maWcoKS5tYXA7XG4gIFxuICB0aGlzLl9ob3dNYW55QXJlTG9hZGluZyA9IDA7XG4gIHRoaXMuX2luY3JlbWVudExvYWRlcnMgPSBmdW5jdGlvbigpe1xuICAgIGlmICh0aGlzLl9ob3dNYW55QXJlTG9hZGluZyA9PSAwKXtcbiAgICAgIHRoaXMuZW1pdCgnbG9hZHN0YXJ0Jyk7XG4gICAgfVxuICAgIHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nICs9IDE7XG4gIH07XG4gIFxuICB0aGlzLl9kZWNyZW1lbnRMb2FkZXJzID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9ob3dNYW55QXJlTG9hZGluZyAtPSAxO1xuICAgIGlmICh0aGlzLl9ob3dNYW55QXJlTG9hZGluZyA9PSAwKXtcbiAgICAgIHRoaXMuZW1pdCgnbG9hZGVuZCcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrID0gW107XG4gIFxuICBcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIHNldE1hcFZpZXc6IGZ1bmN0aW9uKGJib3gscmVzb2x1dGlvbixjZW50ZXIpe1xuICAgICAgdGhpcy5zdGF0ZS5iYm94ID0gYmJveDtcbiAgICAgIHRoaXMuc3RhdGUucmVzb2x1dGlvbiA9IHJlc29sdXRpb247XG4gICAgICB0aGlzLnN0YXRlLmNlbnRlciA9IGNlbnRlcjtcbiAgICAgIHRoaXMudXBkYXRlTWFwTGF5ZXJzKHRoaXMubWFwTGF5ZXJzKTtcbiAgICB9LFxuICAgIHNldHVwVmlld2VyOiBmdW5jdGlvbigpe1xuICAgICAgdmFyIFByb2plY3QgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRTZXJ2aWNlKCk7XG4gICAgICAvLyRzY3JpcHQoXCJodHRwOi8vZXBzZy5pby9cIitQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmNycytcIi5qc1wiKTtcbiAgICAgIHByb2o0LmRlZnMoXCJFUFNHOlwiK1Byb2plY3Quc3RhdGUucHJvamVjdC5jcnMsIFByb2plY3Quc3RhdGUucHJvamVjdC5wcm9qNCk7XG4gICAgICBpZiAoc2VsZi52aWV3ZXIpIHtcbiAgICAgICAgdGhpcy52aWV3ZXIuZGVzdHJveSgpO1xuICAgICAgICB0aGlzLnZpZXdlciA9IG51bGw7XG4gICAgICB9XG4gICAgICBzZWxmLl9zZXR1cFZpZXdlcigpO1xuICAgICAgc2VsZi5zZXR1cENvbnRyb2xzKCk7XG4gICAgICBzZWxmLnNldHVwTGF5ZXJzKCk7XG4gICAgICBzZWxmLmVtaXQoJ3ZpZXdlcnNldCcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIFByb2plY3RzUmVnaXN0cnkub24oJ3NldEN1cnJlbnRQcm9qZWN0JyxmdW5jdGlvbigpe1xuICAgIHNlbGYuc2V0dXBWaWV3ZXIoKTtcbiAgfSk7XG4gIFxuICBQcm9qZWN0Lm9uKCdzZXRDdXJyZW50UHJvamVjdCcsZnVuY3Rpb24oKXtcbiAgICBzZWxmLnNldHVwTGF5ZXJzKCk7XG4gIH0pO1xuICBcbiAgUHJvamVjdC5vbmFmdGVyKCdzZXRMYXllcnNWaXNpYmxlJyxmdW5jdGlvbihsYXllcnMpe1xuICAgIHZhciBtYXBMYXllcnMgPSBfLm1hcChsYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgcmV0dXJuIHNlbGYuZ2V0TWFwTGF5ZXJGb3JMYXllcihsYXllcik7XG4gICAgfSlcbiAgICBzZWxmLnVwZGF0ZU1hcExheWVycyhtYXBMYXllcnMpO1xuICB9KTtcbiAgXG4gIFByb2plY3Qub25hZnRlcignc2V0QmFzZUxheWVyJyxmdW5jdGlvbigpe1xuICAgIHNlbGYudXBkYXRlTWFwTGF5ZXJzKHNlbGYubWFwQmFzZUxheWVycyk7XG4gIH0pO1xuICBcbiAgdGhpcy5zZXRMYXllcnNFeHRyYVBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcyx1cGRhdGUpe1xuICAgIHRoaXMubGF5ZXJzRXh0cmFQYXJhbXMgPSBfLmFzc2lnbih0aGlzLmxheWVyc0V4dHJhUGFyYW1zLHBhcmFtcyk7XG4gICAgdGhpcy5lbWl0KCdleHRyYVBhcmFtc1NldCcscGFyYW1zLHVwZGF0ZSk7XG4gIH07XG4gIFxuICB0aGlzLl9zZXR1cFZpZXdlciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGV4dGVudCA9IFByb2plY3Quc3RhdGUuZXh0ZW50O1xuICAgIHZhciBwcm9qZWN0aW9uID0gbmV3IG9sLnByb2ouUHJvamVjdGlvbih7XG4gICAgICBjb2RlOiBcIkVQU0c6XCIrUHJvamVjdC5zdGF0ZS5jcnMsXG4gICAgICBleHRlbnQ6IGV4dGVudFxuICAgIH0pO1xuICAgIFxuICAgIC8qdmFyIGNvbnN0cmFpbl9leHRlbnQ7XG4gICAgaWYgKHRoaXMuY29uZmlnLmNvbnN0cmFpbnRleHRlbnQpIHtcbiAgICAgIHZhciBleHRlbnQgPSB0aGlzLmNvbmZpZy5jb25zdHJhaW50ZXh0ZW50O1xuICAgICAgdmFyIGR4ID0gZXh0ZW50WzJdLWV4dGVudFswXTtcbiAgICAgIHZhciBkeSA9IGV4dGVudFszXS1leHRlbnRbMV07XG4gICAgICB2YXIgZHg0ID0gZHgvNDtcbiAgICAgIHZhciBkeTQgPSBkeS80O1xuICAgICAgdmFyIGJib3hfeG1pbiA9IGV4dGVudFswXSArIGR4NDtcbiAgICAgIHZhciBiYm94X3htYXggPSBleHRlbnRbMl0gLSBkeDQ7XG4gICAgICB2YXIgYmJveF95bWluID0gZXh0ZW50WzFdICsgZHk0O1xuICAgICAgdmFyIGJib3hfeW1heCA9IGV4dGVudFszXSAtIGR5NDtcbiAgICAgIFxuICAgICAgY29uc3RyYWluX2V4dGVudCA9IFtiYm94X3htaW4sYmJveF95bWluLGJib3hfeG1heCxiYm94X3ltYXhdO1xuICAgIH0qL1xuICAgIFxuICAgIHRoaXMudmlld2VyID0gb2wzaGVscGVycy5jcmVhdGVWaWV3ZXIoe1xuICAgICAgdmlldzoge1xuICAgICAgICBwcm9qZWN0aW9uOiBwcm9qZWN0aW9uLFxuICAgICAgICAvKmNlbnRlcjogdGhpcy5jb25maWcuaW5pdGNlbnRlciB8fCBvbC5leHRlbnQuZ2V0Q2VudGVyKGV4dGVudCksXG4gICAgICAgIHpvb206IHRoaXMuY29uZmlnLmluaXR6b29tIHx8IDAsXG4gICAgICAgIGV4dGVudDogdGhpcy5jb25maWcuY29uc3RyYWludGV4dGVudCB8fCBleHRlbnQsXG4gICAgICAgIG1pblpvb206IHRoaXMuY29uZmlnLm1pbnpvb20gfHwgMCwgLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wXG4gICAgICAgIG1heFpvb206IHRoaXMuY29uZmlnLm1heHpvb20gfHwgMjggLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wKi9cbiAgICAgICAgY2VudGVyOiBvbC5leHRlbnQuZ2V0Q2VudGVyKGV4dGVudCksXG4gICAgICAgIHpvb206IDAsXG4gICAgICAgIGV4dGVudDogZXh0ZW50LFxuICAgICAgICBtaW5ab29tOiAwLCAvLyBkZWZhdWx0IGRpIE9MMyAzLjE2LjBcbiAgICAgICAgbWF4Wm9vbTogMjggLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wXG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy52aWV3ZXIubWFwLm9uKCdtb3ZlZW5kJyxmdW5jdGlvbihlKXtcbiAgICAgIHNlbGYuX3NldE1hcFZpZXcoKTtcbiAgICB9KTtcbiAgICBcbiAgICBNYXBRdWVyeVNlcnZpY2UuaW5pdCh0aGlzLnZpZXdlci5tYXApO1xuICAgIFxuICAgIHRoaXMuZW1pdCgncmVhZHknKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0Vmlld2VyRWxlbWVudCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy52aWV3ZXIubWFwLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0Vmlld3BvcnQgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLnZpZXdlci5tYXAuZ2V0Vmlld3BvcnQoKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2V0dXBDb250cm9scyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXAgPSBzZWxmLnZpZXdlci5tYXA7XG4gICAgaWYgKHRoaXMuY29uZmlnICYmIHRoaXMuY29uZmlnLmNvbnRyb2xzKSB7XG4gICAgICBfLmZvckVhY2godGhpcy5jb25maWcuY29udHJvbHMsZnVuY3Rpb24oY29udHJvbFR5cGUpe1xuICAgICAgICB2YXIgY29udHJvbDtcbiAgICAgICAgc3dpdGNoIChjb250cm9sVHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3Jlc2V0JzpcbiAgICAgICAgICAgIGlmICghaXNNb2JpbGUuYW55KSB7XG4gICAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgUmVzZXRDb250cm9sKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICd6b29tJzpcbiAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgb2wuY29udHJvbC5ab29tKHtcbiAgICAgICAgICAgICAgem9vbUluTGFiZWw6IFwiXFx1ZTk4YVwiLFxuICAgICAgICAgICAgICB6b29tT3V0TGFiZWw6IFwiXFx1ZTk4YlwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3pvb21ib3gnOiBcbiAgICAgICAgICAgIGlmICghaXNNb2JpbGUuYW55KSB7XG4gICAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgWm9vbUJveENvbnRyb2woKTtcbiAgICAgICAgICAgICAgY29udHJvbC5vbignem9vbWVuZCcsZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgc2VsZi52aWV3ZXIuZml0KGUuZXh0ZW50KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3pvb210b2V4dGVudCc6XG4gICAgICAgICAgICBjb250cm9sID0gbmV3IG9sLmNvbnRyb2wuWm9vbVRvRXh0ZW50KHtcbiAgICAgICAgICAgICAgbGFiZWw6ICBcIlxcdWU5OGNcIixcbiAgICAgICAgICAgICAgZXh0ZW50OiBzZWxmLmNvbmZpZy5jb25zdHJhaW50ZXh0ZW50XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3F1ZXJ5JzpcbiAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgUXVlcnlDb250cm9sKCk7XG4gICAgICAgICAgICBjb250cm9sLm9uKCdwaWNrZWQnLGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICB2YXIgY29vcmRpbmF0ZXMgPSBlLmNvb3JkaW5hdGVzO1xuIFxuICAgICAgICAgICAgICBNYXBRdWVyeVNlcnZpY2UucXVlcnlQb2ludChjb29yZGluYXRlcyxzZWxmLm1hcExheWVycylcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY29vcmRpbmF0ZXMsbmZlYXR1cmVzLGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyl7XG4gICAgICAgICAgICAgICAgdmFyIGZlYXR1cmVzRm9yTGF5ZXJzID0gW107XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyxmdW5jdGlvbihmZWF0dXJlcyxsYXllck5hbWUpe1xuICAgICAgICAgICAgICAgICAgdmFyIGxheWVyID0gUHJvamVjdC5sYXllcnNbbGF5ZXJOYW1lXTtcbiAgICAgICAgICAgICAgICAgIGZlYXR1cmVzRm9yTGF5ZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBsYXllcjogbGF5ZXIsXG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVzOiBmZWF0dXJlc1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbWFwcXVlcnllbmQnLGZlYXR1cmVzRm9yTGF5ZXJzLG5mZWF0dXJlcyxjb29yZGluYXRlcyxzZWxmLnN0YXRlLnJlc29sdXRpb24pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNvbnRyb2wpIHtcbiAgICAgICAgICBzZWxmLmFkZENvbnRyb2woY29udHJvbCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuYWRkQ29udHJvbCA9IGZ1bmN0aW9uKGNvbnRyb2wpe1xuICAgIHRoaXMudmlld2VyLm1hcC5hZGRDb250cm9sKGNvbnRyb2wpO1xuICB9O1xuICBcbiAgdGhpcy5zZXR1cEJhc2VMYXllcnMgPSBmdW5jdGlvbigpe1xuICAgIGlmICghUHJvamVjdHNSZWdpc3RyeS5zdGF0ZS5iYXNlTGF5ZXJzKXtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMubWFwQmFzZUxheWVycyA9IHt9O1xuICAgIFxuICAgIHZhciBpbml0QmFzZUxheWVyID0gUHJvamVjdC5zdGF0ZS5pbml0YmFzZWxheWVyO1xuICAgIHZhciBiYXNlTGF5ZXJzQXJyYXkgPSBQcm9qZWN0LnN0YXRlLmJhc2VMYXllcnM7XG4gICAgXG4gICAgXy5mb3JFYWNoKGJhc2VMYXllcnNBcnJheSxmdW5jdGlvbihiYXNlTGF5ZXIpe1xuICAgICAgdmFyIHZpc2libGUgPSB0cnVlO1xuICAgICAgaWYgKGluaXRCYXNlTGF5ZXIpIHtcbiAgICAgICAgdmlzaWJsZSA9IGJhc2VMYXllci5pZCA9PSAoaW5pdEJhc2VMYXllcik7XG4gICAgICB9XG4gICAgICBpZiAoYmFzZUxheWVyLmZpeGVkKSB7XG4gICAgICAgIHZpc2libGUgPSBiYXNlTGF5ZXIuZml4ZWQ7XG4gICAgICB9XG4gICAgICBiYXNlTGF5ZXIudmlzaWJsZSA9IHZpc2libGU7XG4gICAgfSlcbiAgICBcbiAgICBiYXNlTGF5ZXJzQXJyYXkuZm9yRWFjaChmdW5jdGlvbihsYXllcil7ICAgICBcbiAgICAgIHZhciBjb25maWcgPSB7XG4gICAgICAgIHVybDogUHJvamVjdC5nZXRXbXNVcmwoKSxcbiAgICAgICAgaWQ6IGxheWVyLmlkLFxuICAgICAgICB0aWxlZDogdHJ1ZVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgdmFyIG1hcExheWVyID0gbmV3IFdNU0xheWVyKGNvbmZpZyk7XG4gICAgICBzZWxmLnJlZ2lzdGVyTGlzdGVuZXJzKG1hcExheWVyKTtcbiAgICAgIFxuICAgICAgbWFwTGF5ZXIuYWRkTGF5ZXIobGF5ZXIpO1xuICAgICAgc2VsZi5tYXBCYXNlTGF5ZXJzW2xheWVyLmlkXSA9IG1hcExheWVyO1xuICAgIH0pO1xuICAgIFxuICAgIF8uZm9yRWFjaChfLnZhbHVlcyh0aGlzLm1hcEJhc2VMYXllcnMpLnJldmVyc2UoKSxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICBzZWxmLnZpZXdlci5tYXAuYWRkTGF5ZXIobWFwTGF5ZXIuZ2V0T0xMYXllcigpKTtcbiAgICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlKTtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5zZXR1cExheWVycyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy52aWV3ZXIucmVtb3ZlTGF5ZXJzKCk7XG4gICAgXG4gICAgdGhpcy5zZXR1cEJhc2VMYXllcnMoKTtcbiAgICBcbiAgICB0aGlzLm1hcExheWVycyA9IHt9O1xuICAgIHRoaXMubGF5ZXJzQXNzb2NpYXRpb24gPSB7fTtcbiAgICB2YXIgbGF5ZXJzQXJyYXkgPSB0aGlzLnRyYXZlcnNlTGF5ZXJzVHJlZShQcm9qZWN0LnN0YXRlLmxheWVyc3RyZWUpO1xuICAgIC8vIHByZW5kbyBzb2xvIGkgbGF5ZXIgdmVyaSBlIG5vbiBpIGZvbGRlclxuICAgIHZhciBsZWFmTGF5ZXJzQXJyYXkgPSBfLmZpbHRlcihsYXllcnNBcnJheSxmdW5jdGlvbihsYXllcil7XG4gICAgICByZXR1cm4gIV8uZ2V0KGxheWVyLCdub2RlcycpO1xuICAgIH0pO1xuICAgIHZhciBtdWx0aUxheWVycyA9IF8uZ3JvdXBCeShsZWFmTGF5ZXJzQXJyYXksZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgcmV0dXJuIGxheWVyLm11bHRpbGF5ZXI7XG4gICAgfSk7XG4gICAgXy5mb3JFYWNoKG11bHRpTGF5ZXJzLGZ1bmN0aW9uKGxheWVycyxpZCl7XG4gICAgICB2YXIgbGF5ZXJJZCA9ICdsYXllcl8nK2lkXG4gICAgICB2YXIgbWFwTGF5ZXIgPSBfLmdldChzZWxmLm1hcExheWVycyxsYXllcklkKTtcbiAgICAgIHZhciB0aWxlZCA9IGxheWVyc1swXS50aWxlZCAvLyBCUlVUVE8sIGRhIHNpc3RlbWFyZSBxdWFuZG8gcmlvcmdhbml6emVyZW1vIGkgbWV0YWxheWVyIChkYSBmYXIgZGl2ZW50YXJlIG11bHRpbGF5ZXIpLiBQZXIgb3JhIHBvc3NvIGNvbmZpZ3VyYXJlIHRpbGVkIHNvbG8gaSBsYXllciBzaW5nb2xpXG4gICAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICB1cmw6IFByb2plY3QuZ2V0V21zVXJsKCksXG4gICAgICAgIGlkOiBsYXllcklkLFxuICAgICAgICB0aWxlZDogdGlsZWRcbiAgICAgIH07XG4gICAgICBtYXBMYXllciA9IHNlbGYubWFwTGF5ZXJzW2xheWVySWRdID0gbmV3IFdNU0xheWVyKGNvbmZpZyxzZWxmLmxheWVyc0V4dHJhUGFyYW1zKTtcbiAgICAgIHNlbGYucmVnaXN0ZXJMaXN0ZW5lcnMobWFwTGF5ZXIpO1xuICAgICAgXG4gICAgICBsYXllcnMuZm9yRWFjaChmdW5jdGlvbihsYXllcil7XG4gICAgICAgIG1hcExheWVyLmFkZExheWVyKGxheWVyKTtcbiAgICAgICAgc2VsZi5sYXllcnNBc3NvY2lhdGlvbltsYXllci5pZF0gPSBsYXllcklkO1xuICAgICAgfSk7XG4gICAgfSlcbiAgICBcbiAgICBfLmZvckVhY2goXy52YWx1ZXModGhpcy5tYXBMYXllcnMpLnJldmVyc2UoKSxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICBzZWxmLnZpZXdlci5tYXAuYWRkTGF5ZXIobWFwTGF5ZXIuZ2V0T0xMYXllcigpKTtcbiAgICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlLHNlbGYubGF5ZXJzRXh0cmFQYXJhbXMpO1xuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLnVwZGF0ZU1hcExheWVycyA9IGZ1bmN0aW9uKG1hcExheWVycykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBfLmZvckVhY2goXy52YWx1ZXMobWFwTGF5ZXJzKSxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICBtYXBMYXllci51cGRhdGUoc2VsZi5zdGF0ZSxzZWxmLmxheWVyc0V4dHJhUGFyYW1zKTtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5nZXRNYXBMYXllckZvckxheWVyID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIHJldHVybiB0aGlzLm1hcExheWVyc1snbGF5ZXJfJytsYXllci5tdWx0aWxheWVyXTtcbiAgfTtcbiAgXG4gIHRoaXMudHJhdmVyc2VMYXllcnNUcmVlID0gZnVuY3Rpb24obGF5ZXJzVHJlZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsYXllcnNBcnJheSA9IFtdO1xuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKG9iail7XG4gICAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgaWYgKCFfLmlzTmlsKHZhbC5pZCkpIHtcbiAgICAgICAgICAgICAgbGF5ZXJzQXJyYXkudW5zaGlmdCh2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIV8uaXNOaWwodmFsLm5vZGVzKSkge1xuICAgICAgICAgICAgICB0cmF2ZXJzZSh2YWwubm9kZXMpO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICB0cmF2ZXJzZShsYXllcnNUcmVlKTtcbiAgICByZXR1cm4gbGF5ZXJzQXJyYXk7XG4gIH07XG4gIFxuICB0aGlzLnJlZ2lzdGVyTGlzdGVuZXJzID0gZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgIG1hcExheWVyLm9uKCdsb2Fkc3RhcnQnLGZ1bmN0aW9uKCl7XG4gICAgICBzZWxmLl9pbmNyZW1lbnRMb2FkZXJzKCk7XG4gICAgfSk7XG4gICAgbWFwTGF5ZXIub24oJ2xvYWRlbmQnLGZ1bmN0aW9uKCl7XG4gICAgICBzZWxmLl9kZWNyZW1lbnRMb2FkZXJzKGZhbHNlKTtcbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLm9uKCdleHRyYVBhcmFtc1NldCcsZnVuY3Rpb24oZXh0cmFQYXJhbXMsdXBkYXRlKXtcbiAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgbWFwTGF5ZXIudXBkYXRlKHRoaXMuc3RhdGUsZXh0cmFQYXJhbXMpO1xuICAgICAgfVxuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLnNob3dWaWV3ZXIgPSBmdW5jdGlvbihlbElkKXtcbiAgICB0aGlzLnZpZXdlci5zZXRUYXJnZXQoZWxJZCk7XG4gICAgdmFyIG1hcCA9IHRoaXMudmlld2VyLm1hcDtcbiAgICBHVUkub24oJ2d1aXJlYWR5JyxmdW5jdGlvbigpe1xuICAgICAgc2VsZi5fc2V0TWFwVmlldygpO1xuICAgIH0pO1xuICB9O1xuICBcbiAgXG4gIC8vIHBlciBjcmVhcmUgdW5hIHBpbGEgZGkgb2wuaW50ZXJhY3Rpb24gaW4gY3VpIGwndWx0aW1vIGNoZSBzaSBhZ2dpdW5nZSBkaXNhdHRpdmEgdGVtcG9yYWVtZW50ZSBpIHByZWNlZGVudGkgKHBlciBwb2kgdG9nbGllcnNpIGRpIG1lenpvIGNvbiBwb3BJbnRlcmFjdGlvbiEpXG4gIC8vIFVzYXRvIGFkIGVzLiBkYSBwaWNrZmVhdHVyZXRvb2wgZSBnZXRmZWF0dXJlaW5mb1xuICB0aGlzLnB1c2hJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICBpZiAodGhpcy5faW50ZXJhY3Rpb25zU3RhY2subGVuZ3RoKXtcbiAgICAgIHZhciBwcmV2SW50ZXJhY3Rpb24gPSB0aGlzLl9pbnRlcmFjdGlvbnNTdGFjay5zbGljZSgtMSlbMF07XG4gICAgICBpZiAoXy5pc0FycmF5KHByZXZJbnRlcmFjdGlvbikpe1xuICAgICAgICBfLmZvckVhY2gocHJldkludGVyYWN0aW9uLGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICAgICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgcHJldkludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgICB9O1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnZpZXdlci5tYXAuYWRkSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xuICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICB0aGlzLl9pbnRlcmFjdGlvbnNTdGFjay5wdXNoKGludGVyYWN0aW9uKVxuICB9O1xuICBcbiAgdGhpcy5wb3BJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGludGVyYWN0aW9uID0gdGhpcy5faW50ZXJhY3Rpb25zU3RhY2sucG9wKCk7XG4gICAgdGhpcy52aWV3ZXIubWFwLnJlbW92ZUludGVyYWN0aW9uKGludGVyYWN0aW9uKTtcbiAgICBcbiAgICBpZiAodGhpcy5faW50ZXJhY3Rpb25zU3RhY2subGVuZ3RoKXtcbiAgICAgIHZhciBwcmV2SW50ZXJhY3Rpb24gPSB0aGlzLl9pbnRlcmFjdGlvbnNTdGFjay5zbGljZSgtMSlbMF07XG4gICAgICBpZiAoXy5pc0FycmF5KHByZXZJbnRlcmFjdGlvbikpe1xuICAgICAgICBfLmZvckVhY2gocHJldkludGVyYWN0aW9uLGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICAgICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgICBwcmV2SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLmdvVG8gPSBmdW5jdGlvbihjb29yZGluYXRlcyx6b29tKXtcbiAgICB2YXIgem9vbSA9IHpvb20gfHwgNjtcbiAgICB0aGlzLnZpZXdlci5nb1RvKGNvb3JkaW5hdGVzLHpvb20pO1xuICB9O1xuICBcbiAgdGhpcy5nb1RvV0dTODQgPSBmdW5jdGlvbihjb29yZGluYXRlcyx6b29tKXtcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBvbC5wcm9qLnRyYW5zZm9ybShjb29yZGluYXRlcywnRVBTRzo0MzI2JywnRVBTRzonK1Byb2plY3Quc3RhdGUuY3JzKTtcbiAgICB0aGlzLmdvVG8oY29vcmRpbmF0ZXMsem9vbSk7XG4gIH07XG4gIFxuICB0aGlzLmV4dGVudFRvV0dTODQgPSBmdW5jdGlvbihleHRlbnQpe1xuICAgIHJldHVybiBvbC5wcm9qLnRyYW5zZm9ybUV4dGVudChleHRlbnQsJ0VQU0c6JytQcm9qZWN0LnN0YXRlLmNycywnRVBTRzo0MzI2Jyk7XG4gIH07XG4gIFxuICB0aGlzLmdldEZlYXR1cmVJbmZvID0gZnVuY3Rpb24obGF5ZXJJZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB0aGlzLl9waWNrSW50ZXJhY3Rpb24gPSBuZXcgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24oKTtcbiAgICAvL3RoaXMudmlld2VyLm1hcC5hZGRJbnRlcmFjdGlvbih0aGlzLl9waWNrSW50ZXJhY3Rpb24pO1xuICAgIC8vdGhpcy5fcGlja0ludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICB0aGlzLnB1c2hJbnRlcmFjdGlvbih0aGlzLl9waWNrSW50ZXJhY3Rpb24pO1xuICAgIHRoaXMuX3BpY2tJbnRlcmFjdGlvbi5vbigncGlja2VkJyxmdW5jdGlvbihlKXtcbiAgICAgIHNlbGYuX2NvbXBsZXRlR2V0RmVhdHVyZUluZm8obGF5ZXJJZCxlLmNvb3JkaW5hdGUsZGVmZXJyZWQpO1xuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NvbXBsZXRlR2V0RmVhdHVyZUluZm8gPSBmdW5jdGlvbihsYXllcklkLGNvb3JkaW5hdGUsZGVmZXJyZWQpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcHJvamVjdFR5cGUgPSBQcm9qZWN0LnN0YXRlLnR5cGU7XG4gICAgXG4gICAgdmFyIG1hcExheWVyID0gdGhpcy5tYXBMYXllcnNbdGhpcy5sYXllcnNBc3NvY2lhdGlvbltsYXllcklkXV07XG4gICAgdmFyIHJlc29sdXRpb24gPSBzZWxmLnZpZXdlci5nZXRSZXNvbHV0aW9uKCk7XG4gICAgdmFyIGVwc2cgPSBzZWxmLnZpZXdlci5tYXAuZ2V0VmlldygpLmdldFByb2plY3Rpb24oKS5nZXRDb2RlKCk7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIFFVRVJZX0xBWUVSUzogUHJvamVjdC5nZXRMYXllcihsYXllcklkKS5uYW1lLFxuICAgICAgSU5GT19GT1JNQVQ6IFwidGV4dC94bWxcIlxuICAgIH1cbiAgICBcbiAgICBpZiAocHJvamVjdFR5cGUgPT0gUHJvamVjdFR5cGVzLlFESkFOR08pe1xuICAgICAgdmFyIHRvbGVyYW5jZVBhcmFtcyA9IFBpY2tUb2xlcmFuY2VQYXJhbXNbcHJvamVjdFR5cGVdO1xuICAgICAgaWYgKHRvbGVyYW5jZVBhcmFtcyl7XG4gICAgICAgIHZhciBnZW9tZXRyeXR5cGUgPSBQcm9qZWN0LmdldExheWVyKGxheWVySWQpLmdlb21ldHJ5dHlwZTtcbiAgICAgICAgcGFyYW1zW3RvbGVyYW5jZVBhcmFtc1tnZW9tZXRyeXR5cGVdXSA9IFBpY2tUb2xlcmFuY2VWYWx1ZXNbZ2VvbWV0cnl0eXBlXTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdmFyIGdldEZlYXR1cmVJbmZvVXJsID0gbWFwTGF5ZXIuZ2V0U291cmNlKCkuZ2V0R2V0RmVhdHVyZUluZm9VcmwoY29vcmRpbmF0ZSxyZXNvbHV0aW9uLGVwc2cscGFyYW1zKTtcbiAgICAkLmdldChnZXRGZWF0dXJlSW5mb1VybClcbiAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgIHZhciB4MmpzID0gbmV3IFgySlMoKTtcbiAgICAgIHZhciBqc29uRGF0YSA9IHgyanMueG1sMmpzb24oZGF0YSk7XG4gICAgICBpZiAoanNvbkRhdGEuR2V0RmVhdHVyZUluZm9SZXNwb25zZS5MYXllci5GZWF0dXJlKXtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBqc29uRGF0YS5HZXRGZWF0dXJlSW5mb1Jlc3BvbnNlLkxheWVyLkZlYXR1cmUuQXR0cmlidXRlO1xuICAgICAgICB2YXIgYXR0cmlidXRlc09iaiA9IHt9O1xuICAgICAgICBfLmZvckVhY2goYXR0cmlidXRlcyxmdW5jdGlvbihhdHRyaWJ1dGUpe1xuICAgICAgICAgIGF0dHJpYnV0ZXNPYmpbYXR0cmlidXRlLl9uYW1lXSA9IGF0dHJpYnV0ZS5fdmFsdWU7IC8vIFgySlMgYWdnaXVuZ2UgXCJfXCIgY29tZSBwcmVmaXNzbyBkZWdsaSBhdHRyaWJ1dGlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoYXR0cmlidXRlc09iaik7XG4gICAgICB9XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTs7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfSlcbiAgICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgICAvL3NlbGYudmlld2VyLm1hcC5yZW1vdmVJbnRlcmFjdGlvbihzZWxmLl9waWNrSW50ZXJhY3Rpb24pO1xuICAgICAgc2VsZi5wb3BJbnRlcmFjdGlvbigpO1xuICAgICAgc2VsZi5fcGlja0ludGVyYWN0aW9uID0gbnVsbDtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5oaWdobGlnaHRHZW9tZXRyeSA9IGZ1bmN0aW9uKGdlb21ldHJ5T2JqLG9wdGlvbnMpeyAgICBcbiAgICB2YXIgZ2VvbWV0cnk7XG4gICAgaWYgKGdlb21ldHJ5T2JqIGluc3RhbmNlb2Ygb2wuZ2VvbS5HZW9tZXRyeSl7XG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5T2JqO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZvcm1hdCA9IG5ldyBvbC5mb3JtYXQuR2VvSlNPTjtcbiAgICAgIGdlb21ldHJ5ID0gZm9ybWF0LnJlYWRHZW9tZXRyeShnZW9tZXRyeU9iaik7XG4gICAgfVxuICAgIFxuICAgIGlmIChvcHRpb25zLnpvb20pIHtcbiAgICAgIHRoaXMudmlld2VyLmZpdChnZW9tZXRyeSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24gfHwgNDAwMDtcbiAgICBcbiAgICBpZiAob3B0aW9ucy5mcm9tV0dTODQpIHtcbiAgICAgIGdlb21ldHJ5LnRyYW5zZm9ybSgnRVBTRzo0MzI2JywnRVBTRzonK1Byb2plY3Quc3RhdGUuY3JzKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGZlYXR1cmUgPSBuZXcgb2wuRmVhdHVyZSh7XG4gICAgICBnZW9tZXRyeTogZ2VvbWV0cnlcbiAgICB9KTtcbiAgICB2YXIgc291cmNlID0gbmV3IG9sLnNvdXJjZS5WZWN0b3IoKTtcbiAgICBzb3VyY2UuYWRkRmVhdHVyZXMoW2ZlYXR1cmVdKTtcbiAgICB2YXIgbGF5ZXIgPSBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgc3R5bGU6IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgICB2YXIgc3R5bGVzID0gW107XG4gICAgICAgIHZhciBnZW9tZXRyeVR5cGUgPSBmZWF0dXJlLmdldEdlb21ldHJ5KCkuZ2V0VHlwZSgpO1xuICAgICAgICBpZiAoZ2VvbWV0cnlUeXBlID09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICAgIHZhciBzdHlsZSA9IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICAgICAgICBjb2xvcjogJ3JnYigyNTUsMjU1LDApJyxcbiAgICAgICAgICAgICAgd2lkdGg6IDRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgICBzdHlsZXMucHVzaChzdHlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZ2VvbWV0cnlUeXBlID09ICdQb2ludCcpe1xuICAgICAgICAgIHZhciBzdHlsZSA9IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgICAgICAgIHJhZGl1czogNixcbiAgICAgICAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgICAgICAgIGNvbG9yOiAncmdiKDI1NSwyNTUsMCknLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB6SW5kZXg6IEluZmluaXR5XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc3R5bGVzLnB1c2goc3R5bGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgICAgfVxuICAgIH0pXG4gICAgbGF5ZXIuc2V0TWFwKHRoaXMudmlld2VyLm1hcCk7XG4gICAgXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgbGF5ZXIuc2V0TWFwKG51bGwpO1xuICAgIH0sZHVyYXRpb24pO1xuICB9O1xuICBcbiAgdGhpcy5yZWZyZXNoTWFwID0gZnVuY3Rpb24oKXtcbiAgICBfLmZvckVhY2godGhpcy5tYXBMYXllcnMsZnVuY3Rpb24od21zTGF5ZXIpe1xuICAgICAgd21zTGF5ZXIuZ2V0TGF5ZXIoKS5nZXRTb3VyY2UoKS51cGRhdGVQYXJhbXMoe1widGltZVwiOiBEYXRlLm5vdygpfSk7XG4gICAgfSlcbiAgfTtcbiAgXG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLl9zZXRNYXBWaWV3ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgYmJveCA9IHRoaXMudmlld2VyLmdldEJCT1goKTtcbiAgICB2YXIgcmVzb2x1dGlvbiA9IHRoaXMudmlld2VyLmdldFJlc29sdXRpb24oKTtcbiAgICB2YXIgY2VudGVyID0gdGhpcy52aWV3ZXIuZ2V0Q2VudGVyKCk7XG4gICAgdGhpcy5zZXRNYXBWaWV3KGJib3gscmVzb2x1dGlvbixjZW50ZXIpO1xuICB9O1xufTtcblxuaW5oZXJpdChNYXBTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwU2VydmljZVxuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuZnVuY3Rpb24gTWFwc1JlZ2lzdHJ5KCkge1xuICBiYXNlKHRoaXMpO1xuICBcbiAgdGhpcy5fbWFwc1NlcnZpY2VzID0ge1xuICB9O1xuICBcbiAgdGhpcy5hZGRNYXAgPSBmdW5jdGlvbihtYXBTZXJ2aWNlKSB7XG4gICAgdGhpcy5fcmVnaXN0ZXJNYXBTZXJ2aWNlKG1hcFNlcnZpY2UpO1xuICB9O1xuICBcbiAgdGhpcy5fcmVnaXN0ZXJNYXBTZXJ2aWNlID0gZnVuY3Rpb24obWFwU2VydmljZSkge1xuICAgIHZhciBtYXBTZXJ2aWNlID0gdGhpcy5fbWFwc1NlcnZpY2VzW21hcFNlcnZpY2UuaWRdXG4gICAgaWYgKF8uaXNVbmRlZmluZWQobWFwU2VydmljZSkpIHtcbiAgICAgIHRoaXMuX21hcHNTZXJ2aWNlc1ttYXBTZXJ2aWNlLmlkXSA9IG1hcFNlcnZpY2U7XG4gICAgfVxuICB9O1xufSBcbmluaGVyaXQoTWFwc1JlZ2lzdHJ5LEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwc1JlZ2lzdHJ5O1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBQbHVnaW4oKXtcbiAgdGhpcy5pZCA9IFwicGx1Z2luXCI7XG4gIHRoaXMudG9vbHMgPSBbXTtcbn1cbmluaGVyaXQoUGx1Z2luLEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IFBsdWdpbi5wcm90b3R5cGU7XG5cbnByb3RvLnByb3ZpZGVzVG9vbHMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy50b29scy5sZW5ndGggPiAwO1xufTtcblxucHJvdG8uZ2V0VG9vbHMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy50b29scztcbn07XG5cbnByb3RvLmdldEFjdGlvbnMgPSBmdW5jdGlvbih0b29sKXtcbiAgcmV0dXJuIHRvb2wuYWN0aW9ucztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGx1Z2luO1xuIiwidmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxudmFyIFRvb2xzU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvcGx1Z2luL3Rvb2xzc2VydmljZScpO1xuXG5mdW5jdGlvbiBQbHVnaW5zUmVnaXN0cnkoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIC8vIHVuIGRvbWFuaSBxdWVzdG8gc2Fyw6AgZGluYW1pY29cbiAgdGhpcy5wbHVnaW5zID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgdG9vbHNwcm92aWRlcnM6IFtdXG4gIH07XG4gIFxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0VG9vbHNQcm92aWRlcjogZnVuY3Rpb24ocGx1Z2luKSB7XG4gICAgICBzZWxmLnN0YXRlLnRvb2xzcHJvdmlkZXJzLnB1c2gocGx1Z2luKTtcbiAgICB9XG4gIH1cbiAgXG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICBfLmZvckVhY2goY29uZmlnLnBsdWdpbnMsZnVuY3Rpb24ocGx1Z2luKXtcbiAgICAgIHNlbGYuX3NldHVwKHBsdWdpbik7XG4gICAgfSlcbiAgfTtcbiAgXG4gIC8vIFBlciBwZXJtZXR0ZXJlIGxhIHJlZ2lzdHJhemlvbmUgYW5jaGUgaW4gdW4gc2Vjb25kbyBtb21lbnRvXG4gIHRoaXMucmVnaXN0ZXIgPSBmdW5jdGlvbihwbHVnaW4pe1xuICAgIGlmICghdGhpcy5wbHVnaW5zW3BsdWdpbi5uYW1lXSkge1xuICAgICAgdGhpcy5fc2V0dXAocGx1Z2luKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl9zZXR1cCA9IGZ1bmN0aW9uKHBsdWdpbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcGx1Z2luQ29uZmlnID0gdGhpcy5jb25maWcuY29uZmlnc1twbHVnaW4ubmFtZV07XG4gICAgaWYgKHBsdWdpbkNvbmZpZyl7XG4gICAgICBwbHVnaW4uaW5pdChwbHVnaW5Db25maWcpO1xuICAgICAgc2VsZi5wbHVnaW5zW25hbWVdID0gcGx1Z2luO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuYWN0aXZhdGUgPSBmdW5jdGlvbihwbHVnaW4pIHtcbiAgICB2YXIgdG9vbHMgPSBwbHVnaW4uZ2V0VG9vbHMoKTtcbiAgICBpZiAodG9vbHMubGVuZ3RoKSB7XG4gICAgICBUb29sc1NlcnZpY2UucmVnaXN0ZXJUb29sc1Byb3ZpZGVyKHBsdWdpbik7XG4gICAgfVxuICB9O1xufTtcblxuaW5oZXJpdChQbHVnaW5zUmVnaXN0cnksRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGx1Z2luc1JlZ2lzdHJ5XG4iLCJ2YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBQbHVnaW5zU2VydmljZSgpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgLy8gdW4gZG9tYW5pIHF1ZXN0byBzYXLDoCBkaW5hbWljb1xuICB0aGlzLnBsdWdpbnMgPSB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICB0b29sc3Byb3ZpZGVyczogW11cbiAgfTtcbiAgXG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBzZXRUb29sc1Byb3ZpZGVyOiBmdW5jdGlvbihwbHVnaW4pIHtcbiAgICAgIHNlbGYuc3RhdGUudG9vbHNwcm92aWRlcnMucHVzaChwbHVnaW4pO1xuICAgIH1cbiAgfVxuICBcbiAgYmFzZSh0aGlzKTtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIF8uZm9yRWFjaChjb25maWcucGx1Z2lucyxmdW5jdGlvbihwbHVnaW4pe1xuICAgICAgc2VsZi5fc2V0dXAocGx1Z2luKTtcbiAgICB9KVxuICAgIHRoaXMuZW1pdChcImluaXRlbmRcIik7XG4gIH07XG4gIFxuICAvLyBQZXIgcGVybWV0dGVyZSBsYSByZWdpc3RyYXppb25lIGFuY2hlIGluIHVuIHNlY29uZG8gbW9tZW50b1xuICB0aGlzLnJlZ2lzdGVyID0gZnVuY3Rpb24ocGx1Z2luKXtcbiAgICBpZiAoIXRoaXMucGx1Z2luc1twbHVnaW4ubmFtZV0pIHtcbiAgICAgIHRoaXMuX3NldHVwKHBsdWdpbik7XG4gICAgfVxuICB9XG4gIFxuICB0aGlzLl9zZXR1cCA9IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBwbHVnaW5Db25maWcgPSB0aGlzLmNvbmZpZy5jb25maWdzW3BsdWdpbi5uYW1lXTtcbiAgICBpZiAocGx1Z2luQ29uZmlnKXtcbiAgICAgIHBsdWdpbi5pbml0KHBsdWdpbkNvbmZpZylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYucGx1Z2luc1tuYW1lXSA9IHBsdWdpbjtcbiAgICAgICAgaWYgKHBsdWdpbi5wcm92aWRlc1Rvb2xzKCkpe1xuICAgICAgICAgIHNlbGYuc2V0VG9vbHNQcm92aWRlcihwbHVnaW4pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfVxufTtcblxuaW5oZXJpdChQbHVnaW5zU2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBQbHVnaW5zU2VydmljZVxuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBUb29sc1NlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuX2FjdGlvbnMgPSB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICB0b29sczogW11cbiAgfTtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5zZXRTdGF0ZSgpO1xuICB9O1xuICBcbiAgdGhpcy5zZXRTdGF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fbWVyZ2VUb29scyh0aGlzLmNvbmZpZy50b29scyk7XG4gIH07XG4gIFxuICB0aGlzLnJlZ2lzdGVyVG9vbHNQcm92aWRlciA9IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgc2VsZi5fbWVyZ2VUb29scyhwbHVnaW4uZ2V0VG9vbHMoKSk7XG4gICAgc2VsZi5fYWRkQWN0aW9ucyhwbHVnaW4pO1xuICB9XG4gIFxuICB0aGlzLmZpcmVBY3Rpb24gPSBmdW5jdGlvbihhY3Rpb25pZCl7XG4gICAgdmFyIHBsdWdpbiA9IHRoaXMuX2FjdGlvbnNbYWN0aW9uaWRdO1xuICAgIHZhciBtZXRob2QgPSB0aGlzLl9hY3Rpb25NZXRob2QoYWN0aW9uaWQpO1xuICAgIHBsdWdpblttZXRob2RdKCk7XG4gIH07XG4gIFxuICB0aGlzLl9hY3Rpb25NZXRob2QgPSBmdW5jdGlvbihhY3Rpb25pZCl7XG4gICAgdmFyIG5hbWVzcGFjZSA9IGFjdGlvbmlkLnNwbGl0KFwiOlwiKTtcbiAgICByZXR1cm4gbmFtZXNwYWNlLnBvcCgpO1xuICB9O1xuICBcbiAgdGhpcy5fbWVyZ2VUb29scyA9IGZ1bmN0aW9uKHRvb2xzKXtcbiAgICBzZWxmLnN0YXRlLnRvb2xzID0gXy5jb25jYXQoc2VsZi5zdGF0ZS50b29scyx0b29scyk7XG4gIH07XG4gIFxuICB0aGlzLl9hZGRBY3Rpb25zID0gZnVuY3Rpb24ocGx1Z2luKXtcbiAgICBfLmZvckVhY2gocGx1Z2luLmdldFRvb2xzKCksZnVuY3Rpb24odG9vbCl7XG4gICAgICBfLmZvckVhY2gocGx1Z2luLmdldEFjdGlvbnModG9vbCksZnVuY3Rpb24oYWN0aW9uKXtcbiAgICAgICAgc2VsZi5fYWN0aW9uc1thY3Rpb24uaWRdID0gcGx1Z2luO1xuICAgICAgfSlcbiAgICB9KVxuICB9O1xufTtcblxuLy8gTWFrZSB0aGUgcHVibGljIHNlcnZpY2UgZW4gRXZlbnQgRW1pdHRlclxuaW5oZXJpdChUb29sc1NlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVG9vbHNTZXJ2aWNlXG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzLy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBBcHBsaWNhdGlvblNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL2FwcGxpY2F0aW9uc2VydmljZScpO1xuXG5mdW5jdGlvbiBQcm9qZWN0KHByb2plY3RDb25maWcpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgLyogc3RydXR0dXJhIG9nZ2V0dG8gJ3Byb2plY3QnXG4gIHtcbiAgICBpZCxcbiAgICB0eXBlLFxuICAgIGdpZCxcbiAgICBuYW1lLFxuICAgIGNycyxcbiAgICBleHRlbnQsXG4gICAgbGF5ZXJzdHJlZSxcbiAgICB3aWRnZXRzXG4gIH1cbiAgKi9cbiAgdGhpcy5zdGF0ZSA9IHByb2plY3RDb25maWc7XG4gIFxuICB0aGlzLl9sYXllcnMgPSB7fTtcbiAgZnVuY3Rpb24gdHJhdmVyc2Uob2JqKXtcbiAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKGxheWVyLCBrZXkpIHtcbiAgICAgICAgLy92ZXJpZmljYSBjaGUgaWwgdmFsb3JlIGRlbGwnaWQgbm9uIHNpYSBudWxsb1xuICAgICAgICBpZiAoIV8uaXNOaWwobGF5ZXIuaWQpKSB7XG4gICAgICAgICAgICBzZWxmLl9sYXllcnNbbGF5ZXIuaWRdID0gbGF5ZXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFfLmlzTmlsKGxheWVyLm5vZGVzKSkge1xuICAgICAgICAgICAgdHJhdmVyc2UobGF5ZXIubm9kZXMpO1xuICAgICAgICB9XG4gICAgfSk7XG4gIH1cbiAgdHJhdmVyc2UocHJvamVjdENvbmZpZy5sYXllcnN0cmVlKTtcbiAgXG4gIC8qdmFyIGV2ZW50VHlwZSA9ICdwcm9qZWN0c2V0JztcbiAgaWYgKGRvc3dpdGNoICYmIGRvc3dpdGNoID09PSB0cnVlKSB7XG4gICAgZXZlbnRUeXBlID0gJ3Byb2plY3Rzd2l0Y2gnO1xuICB9XG4gIHRoaXMuZW1pdChldmVudFR5cGUpOyovXG4gIFxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0TGF5ZXJzVmlzaWJsZTogZnVuY3Rpb24obGF5ZXJzLHZpc2libGUpe1xuICAgICAgXy5mb3JFYWNoKGxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgICAgIHNlbGYuX2xheWVyc1tsYXllci5pZF0udmlzaWJsZSA9IHZpc2libGU7XG4gICAgICB9KVxuICAgIH0sXG4gICAgc2V0QmFzZUxheWVyOiBmdW5jdGlvbihpZCl7XG4gICAgICBfLmZvckVhY2goc2VsZi5zdGF0ZS5iYXNlTGF5ZXJzLGZ1bmN0aW9uKGJhc2VMYXllcil7XG4gICAgICAgIGJhc2VMYXllci52aXNpYmxlID0gKGJhc2VMYXllci5pZCA9PSBpZCk7XG4gICAgICB9KVxuICAgIH1cbiAgfTtcblxuICBiYXNlKHRoaXMpO1xufVxuaW5oZXJpdChQcm9qZWN0LEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IFByb2plY3QucHJvdG90eXBlO1xuXG5wcm90by5nZXRMYXllciA9IGZ1bmN0aW9uKGlkKXtcbiAgcmV0dXJuIHRoaXMuX2xheWVyc1tpZF07XG59O1xuXG5wcm90by5nZXRMYXllcnMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fbGF5ZXJzO1xufTtcblxucHJvdG8uZ2V0TGF5ZXJCeUlkID0gZnVuY3Rpb24oaWQpIHtcbiAgdmFyIGxheWVyID0gbnVsbDtcbiAgXy5mb3JFYWNoKHRoaXMuZ2V0TGF5ZXJzKCksZnVuY3Rpb24oX2xheWVyKXtcbiAgICBpZiAoX2xheWVyLmlkID09IGlkKXtcbiAgICAgIGxheWVyID0gX2xheWVyO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBsYXllcjtcbn07XG5cbnByb3RvLmdldExheWVyQnlOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgbGF5ZXIgPSBudWxsO1xuICBfLmZvckVhY2godGhpcy5nZXRMYXllcnMoKSxmdW5jdGlvbihfbGF5ZXIpe1xuICAgIGlmIChfbGF5ZXIubmFtZSA9PSBuYW1lKXtcbiAgICAgIGxheWVyID0gX2xheWVyO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBsYXllcjtcbn07XG5cbnByb3RvLmdldFF1ZXJ5YWJsZUxheWVycyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBxdWVyeWFibGVMYXllcnMgPSBbXTtcbiAgXy5mb3JFYWNoKHRoaXMuZ2V0TGF5ZXJzKCksZnVuY3Rpb24obGF5ZXIpe1xuICAgIGlmIChMYXllclN0YXRlLmlzUXVlcnlhYmxlKGxheWVyKSl7XG4gICAgICBxdWVyeWFibGVMYXllcnMucHVzaChsYXllcik7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHF1ZXJ5YWJsZUxheWVycztcbn07XG5cbnByb3RvLmdldExheWVyQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGlkKXtcbiAgcmV0dXJuIHRoaXMuX2xheWVyc1tpZF0uYXR0cmlidXRlcztcbn07XG5cbnByb3RvLmdldExheWVyQXR0cmlidXRlTGFiZWwgPSBmdW5jdGlvbihpZCxuYW1lKXtcbiAgdmFyIGxhYmVsID0gJyc7XG4gIF8uZm9yRWFjaCh0aGlzLl9sYXllcnNbaWRdLmF0dHJpYnV0ZXMsZnVuY3Rpb24oYXR0cmlidXRlKXtcbiAgICBpZiAoYXR0cmlidXRlLm5hbWUgPT0gbmFtZSl7XG4gICAgICBsYWJlbCA9IGF0dHJpYnV0ZS5sYWJlbDtcbiAgICB9XG4gIH0pXG4gIHJldHVybiBsYWJlbDtcbn07XG5cbnByb3RvLnRvZ2dsZUxheWVyID0gZnVuY3Rpb24obGF5ZXIsdmlzaWJsZSl7XG4gIHZhciB2aXNpYmxlID0gdmlzaWJsZSB8fCAhbGF5ZXIudmlzaWJsZTtcbiAgdGhpcy5zZXRMYXllcnNWaXNpYmxlKFtsYXllcl0sdmlzaWJsZSk7XG59O1xuXG5wcm90by50b2dnbGVMYXllcnMgPSBmdW5jdGlvbihsYXllcnMsdmlzaWJsZSl7XG4gIHRoaXMuc2V0TGF5ZXJzVmlzaWJsZShsYXllcnMsdmlzaWJsZSk7XG59O1xuXG5wcm90by5zZXRHZXRXbXNVcmwgPSBmdW5jdGlvbihnZXRXbXNVcmxGbmMpe1xuICB0aGlzLl9nZXRXbXNVcmxGbmMgPSBnZXRXbXNVcmxGbmM7XG59O1xuXG5wcm90by5nZXRXbXNVcmwgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fZ2V0V21zVXJsRm5jKHRoaXMuc3RhdGUpO1xufTtcblxucHJvdG8uZ2V0TGVnZW5kVXJsID0gZnVuY3Rpb24obGF5ZXIpe1xuICB2YXIgdXJsID0gdGhpcy5nZXRXbXNVcmwoKTtcbiAgc2VwID0gKHVybC5pbmRleE9mKCc/JykgPiAtMSkgPyAnJicgOiAnPyc7XG4gIHJldHVybiB0aGlzLmdldFdtc1VybCgpK3NlcCsnU0VSVklDRT1XTVMmVkVSU0lPTj0xLjMuMCZSRVFVRVNUPUdldExlZ2VuZEdyYXBoaWMmU0xEX1ZFUlNJT049MS4xLjAmRk9STUFUPWltYWdlL3BuZyZUUkFOU1BBUkVOVD10cnVlJklURU1GT05UQ09MT1I9d2hpdGUmTEFZRVJUSVRMRT1GYWxzZSZJVEVNRk9OVFNJWkU9MTAmTEFZRVI9JytsYXllci5uYW1lO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9qZWN0O1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xudmFyIHJlamVjdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZWplY3Q7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBQcm9qZWN0ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3QnKTtcblxuXG4vKiBzZXJ2aWNlXG5GdW56aW9uZSBjb3N0cnV0dG9yZSBjb250ZW50ZW50ZSB0cmUgcHJvcHJpZXRhJzpcbiAgICBzZXR1cDogbWV0b2RvIGRpIGluaXppYWxpenphemlvbmVcbiAgICBnZXRMYXllcnNTdGF0ZTogcml0b3JuYSBsJ29nZ2V0dG8gTGF5ZXJzU3RhdGVcbiAgICBnZXRMYXllcnNUcmVlOiByaXRvcm5hIGwnYXJyYXkgbGF5ZXJzVHJlZSBkYWxsJ29nZ2V0dG8gTGF5ZXJzU3RhdGVcbiovXG5cbi8vIFB1YmxpYyBpbnRlcmZhY2VcbmZ1bmN0aW9uIFByb2plY3RzUmVnaXN0cnkoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgdGhpcy5wcm9qZWN0VHlwZSA9IG51bGw7XG4gIFxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0Q3VycmVudFByb2plY3Q6IGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50UHJvamVjdCA9IHByb2plY3Q7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBiYXNlTGF5ZXJzOiB7fSxcbiAgICBtaW5TY2FsZTogbnVsbCxcbiAgICBtYXhzY2FsZTogbnVsbCxcbiAgICBjdXJyZW50UHJvamVjdDogbnVsbFxuICB9O1xuICBcbiAgLy8gdHV0dGUgbGUgY29uZmlndXJhemlvbmkgZGkgYmFzZSBkZWkgcHJvZ2V0dGksIG1hIGRpIGN1aSBub24gw6ggZGV0dG8gY2hlIHNpYSBhbmNvcmEgZGlzcG9uaWJpbGUgbCdpc3RhbnphIChsYXp5IGxvYWRpbmcpXG4gIHRoaXMuX3BlbmRpbmdQcm9qZWN0cyA9IFtdO1xuICB0aGlzLl9wcm9qZWN0cyA9IHt9O1xuICBcbiAgYmFzZSh0aGlzKTtcbn1cbmluaGVyaXQoUHJvamVjdHNSZWdpc3RyeSwgRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gUHJvamVjdHNSZWdpc3RyeS5wcm90b3R5cGU7XG5cbnByb3RvLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghdGhpcy5pbml0aWFsaXplZCl7XG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy9hZ2dpdW50byB0aXBvIHByb2dldHRvXG4gICAgdGhpcy5wcm9qZWN0VHlwZSA9IHRoaXMuY29uZmlnLmdyb3VwLm92ZXJ2aWV3cHJvamVjdC50eXBlO1xuICAgIHRoaXMuc2V0dXBTdGF0ZSgpO1xuICAgIHJldHVybiB0aGlzLmdldFByb2plY3QoY29uZmlnLmluaXRwcm9qZWN0KVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgICAgc2VsZi5zZXRDdXJyZW50UHJvamVjdChwcm9qZWN0KTtcbiAgICB9KTtcbiAgfVxufTtcbiAgXG5wcm90by5zZXR1cFN0YXRlID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgc2VsZi5zdGF0ZS5iYXNlTGF5ZXJzID0gc2VsZi5jb25maWcuYmFzZWxheWVycztcbiAgc2VsZi5zdGF0ZS5taW5TY2FsZSA9IHNlbGYuY29uZmlnLm1pbnNjYWxlO1xuICBzZWxmLnN0YXRlLm1heFNjYWxlID0gc2VsZi5jb25maWcubWF4c2NhbGU7XG4gIHNlbGYuc3RhdGUuY3JzID0gc2VsZi5jb25maWcuY3JzO1xuICBzZWxmLnN0YXRlLnByb2o0ID0gc2VsZi5jb25maWcucHJvajQ7XG4gIHNlbGYuY29uZmlnLnByb2plY3RzLmZvckVhY2goZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgcHJvamVjdC5iYXNlbGF5ZXJzID0gc2VsZi5jb25maWcuYmFzZWxheWVycztcbiAgICBwcm9qZWN0Lm1pbnNjYWxlID0gc2VsZi5jb25maWcubWluc2NhbGU7XG4gICAgcHJvamVjdC5tYXhzY2FsZSA9IHNlbGYuY29uZmlnLm1heHNjYWxlO1xuICAgIHByb2plY3QuY3JzID0gc2VsZi5jb25maWcuY3JzO1xuICAgIHByb2plY3QucHJvajQgPSBzZWxmLmNvbmZpZy5wcm9qNDtcbiAgICBzZWxmLl9wZW5kaW5nUHJvamVjdHMucHVzaChwcm9qZWN0KTtcbiAgfSlcbiAgLy90aGlzLnN0YXRlLnByb2plY3RzID0gY29uZmlnLmdyb3VwLnByb2plY3RzO1xufTtcblxucHJvdG8uZ2V0UHJvamVjdFR5cGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMucHJvamVjdFR5cGU7XG59O1xuXG5wcm90by5nZXRQZW5kaW5nUHJvamVjdHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQcm9qZWN0cygpO1xufTtcblxucHJvdG8uZ2V0Q3VycmVudFByb2plY3QgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5zdGF0ZS5jdXJyZW50UHJvamVjdDtcbn07XG5cbi8vIG90dGVuZ28gaWwgcHJvZ2V0dG8gZGFsIHN1byBnaWQ7IHJpdG9ybmEgdW5hIHByb21pc2UgbmVsIGNhc28gbm9uIGZvc3NlIHN0YXRvIGFuY29yYSBzY2FyaWNhdG8gaWwgY29uZmlnIGNvbXBsZXRvIChlIHF1aW5kaSBub24gc2lhIGFuY29yYSBpc3RhbnppYXRvIFByb2plY3QpXG5wcm90by5nZXRQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdEdpZCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGQgPSAkLkRlZmVycmVkKCk7XG4gIHZhciBwZW5kaW5nUHJvamVjdCA9IGZhbHNlO1xuICB2YXIgcHJvamVjdCA9IG51bGw7XG4gIHRoaXMuX3BlbmRpbmdQcm9qZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKF9wZW5kaW5nUHJvamVjdCl7XG4gICAgaWYgKF9wZW5kaW5nUHJvamVjdC5naWQgPT0gcHJvamVjdEdpZCkge1xuICAgICAgcGVuZGluZ1Byb2plY3QgPSBfcGVuZGluZ1Byb2plY3Q7XG4gICAgICBwcm9qZWN0ID0gc2VsZi5fcHJvamVjdHNbcHJvamVjdEdpZF07XG4gICAgfVxuICB9KVxuICBpZiAoIXBlbmRpbmdQcm9qZWN0KSB7XG4gICAgcmV0dXJuIHJlamVjdChcIlByb2plY3QgZG9lc24ndCBleGlzdFwiKTtcbiAgfVxuXG4gIGlmIChwcm9qZWN0KXtcbiAgICByZXR1cm4gZC5yZXNvbHZlKHByb2plY3QpO1xuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIHRoaXMuX2dldFByb2plY3RGdWxsQ29uZmlnKHBlbmRpbmdQcm9qZWN0KVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2plY3RGdWxsQ29uZmlnKXtcbiAgICAgIHZhciBwcm9qZWN0Q29uZmlnID0gXy5tZXJnZShwZW5kaW5nUHJvamVjdCxwcm9qZWN0RnVsbENvbmZpZyk7XG4gICAgICBzZWxmLl9idWlsZFByb2plY3RUcmVlKHByb2plY3RDb25maWcpO1xuICAgICAgdmFyIHByb2plY3QgPSBuZXcgUHJvamVjdChwcm9qZWN0Q29uZmlnKTtcbiAgICAgIHByb2plY3Quc2V0R2V0V21zVXJsKHNlbGYuY29uZmlnLmdldFdtc1VybCk7IC8vIEJSVVRUTyBNQSBQRVIgT1JBIFNJIFRJRU5FIENPU0knXG4gICAgICBzZWxmLl9wcm9qZWN0c1twcm9qZWN0Q29uZmlnLmdpZF0gPSBwcm9qZWN0O1xuICAgICAgcmV0dXJuIGQucmVzb2x2ZShwcm9qZWN0KTtcbiAgICB9KTtcbiAgfVxuICBcbiAgcmV0dXJuIGQucHJvbWlzZSgpO1xufTtcbiAgXG4vL3JpdG9ybmEgdW5hIHByb21pc2VzXG5wcm90by5fZ2V0UHJvamVjdEZ1bGxDb25maWcgPSBmdW5jdGlvbihwcm9qZWN0QmFzZUNvbmZpZyl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICB2YXIgdXJsID0gdGhpcy5jb25maWcuZ2V0UHJvamVjdENvbmZpZ1VybChwcm9qZWN0QmFzZUNvbmZpZyk7XG4gICQuZ2V0KHVybCkuZG9uZShmdW5jdGlvbihwcm9qZWN0RnVsbENvbmZpZyl7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb2plY3RGdWxsQ29uZmlnKTtcbiAgfSlcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbn07XG5cbnByb3RvLl9idWlsZFByb2plY3RUcmVlID0gZnVuY3Rpb24ocHJvamVjdCl7XG4gIHZhciBsYXllcnMgPSBfLmtleUJ5KHByb2plY3QubGF5ZXJzLCdpZCcpO1xuICB2YXIgbGF5ZXJzVHJlZSA9IF8uY2xvbmVEZWVwKHByb2plY3QubGF5ZXJzdHJlZSk7XG4gIFxuICBmdW5jdGlvbiB0cmF2ZXJzZShvYmope1xuICAgIF8uZm9ySW4ob2JqLCBmdW5jdGlvbiAobGF5ZXIsIGtleSkge1xuICAgICAgLy92ZXJpZmljYSBjaGUgaWwgbm9kbyBzaWEgdW4gbGF5ZXIgZSBub24gdW4gZm9sZGVyXG4gICAgICBpZiAoIV8uaXNOaWwobGF5ZXIuaWQpKSB7XG4gICAgICAgICAgdmFyIGZ1bGxsYXllciA9IF8ubWVyZ2UobGF5ZXIsbGF5ZXJzW2xheWVyLmlkXSk7XG4gICAgICAgICAgb2JqW3BhcnNlSW50KGtleSldID0gZnVsbGxheWVyO1xuICAgICAgICAgIHZhciBhID0xO1xuICAgICAgfVxuICAgICAgaWYgKCFfLmlzTmlsKGxheWVyLm5vZGVzKSl7XG4gICAgICAgIC8vIGFnZ2l1bmdvIHByb3ByaWV0w6AgdGl0bGUgcGVyIGwnYWxiZXJvXG4gICAgICAgIGxheWVyLnRpdGxlID0gbGF5ZXIubmFtZTtcbiAgICAgICAgdHJhdmVyc2UobGF5ZXIubm9kZXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHRyYXZlcnNlKGxheWVyc1RyZWUpO1xuICBwcm9qZWN0LmxheWVyc3RyZWUgPSBsYXllcnNUcmVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUHJvamVjdHNSZWdpc3RyeSgpO1xuIiwidmFyIFByb2plY3RUeXBlcyA9IHtcbiAgUURKQU5HTzogJ3FkamFuZ28nLFxuICBPR1I6ICdvZ3InXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb2plY3RUeXBlczsiLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBCYXNlNjQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuQmFzZTY0O1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbnZhciBSb3V0ZXJTZXJ2aWNlID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9yb3V0ZSA9ICcnO1xuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0Um91dGU6IGZ1bmN0aW9uKHBhdGgpe1xuICAgICAgdGhpcy5fcm91dGUgPSBwYXRoO1xuICAgIH1cbiAgfVxuICBcbiAgSGlzdG9yeS5BZGFwdGVyLmJpbmQod2luZG93LCdzdGF0ZWNoYW5nZScsZnVuY3Rpb24oKXsgLy8gTm90ZTogV2UgYXJlIHVzaW5nIHN0YXRlY2hhbmdlIGluc3RlYWQgb2YgcG9wc3RhdGVcbiAgICAgIHZhciBzdGF0ZSA9IEhpc3RvcnkuZ2V0U3RhdGUoKTsgLy8gTm90ZTogV2UgYXJlIHVzaW5nIEhpc3RvcnkuZ2V0U3RhdGUoKSBpbnN0ZWFkIG9mIGV2ZW50LnN0YXRlXG4gICAgICB2YXIgaGFzaCA9IHN0YXRlLmhhc2g7XG4gICAgICBzZWxmLnNldFJvdXRlRnJvbUhhc2goaGFzaCk7XG4gIH0pO1xuICBcbiAgYmFzZSh0aGlzKTtcbn07XG5pbmhlcml0KFJvdXRlclNlcnZpY2UsRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gUm91dGVyU2VydmljZS5wcm90b3R5cGU7XG5cbnByb3RvLmluaXRSb3V0ZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBmaXJzdEhhc2ggPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoO1xuICB0aGlzLnNldFJvdXRlRnJvbUhhc2goZmlyc3RIYXNoKTtcbn1cblxucHJvdG8uZ290byA9IGZ1bmN0aW9uKHBhdGgpe1xuICB2YXIgcGF0aGI2NCA9IEJhc2U2NC5lbmNvZGUocGF0aCk7XG4gIEhpc3RvcnkucHVzaFN0YXRlKHtwYXRoOnBhdGh9LG51bGwsJz9wPScrcGF0aGI2NCk7XG4gIC8vdGhpcy5zZXRSb3V0ZShwYXRoKTtcbn07XG5cbnByb3RvLnNldFJvdXRlRnJvbUhhc2ggPSBmdW5jdGlvbihoYXNoKSB7XG4gIHZhciBwYXRoYjY0ID0gdGhpcy5nZXRRdWVyeVBhcmFtcyhoYXNoKVsncCddO1xuICB2YXIgcGF0aCA9IHBhdGhiNjQgPyBCYXNlNjQuZGVjb2RlKHBhdGhiNjQpIDogJyc7XG4gIHRoaXMuc2V0Um91dGUocGF0aCk7XG59XG5cbnByb3RvLnNsaWNlUGF0aCA9IGZ1bmN0aW9uKHBhdGgpe1xuICByZXR1cm4gcGF0aC5zcGxpdCgnPycpWzBdLnNwbGl0KCcvJyk7XG59O1xuICBcbnByb3RvLnNsaWNlRmlyc3QgPSBmdW5jdGlvbihwYXRoKXtcbiAgdmFyIHBhdGhBbmRRdWVyeSA9IHBhdGguc3BsaXQoJz8nKTtcbiAgdmFyIHF1ZXJ5U3RyaW5nID0gcGF0aEFuZFF1ZXJ5WzFdO1xuICB2YXIgcGF0aEFyciA9IHBhdGhBbmRRdWVyeVswXS5zcGxpdCgnLycpXG4gIHZhciBmaXJzdFBhdGggPSBwYXRoQXJyWzBdO1xuICBwYXRoID0gcGF0aEFyci5zbGljZSgxKS5qb2luKCcvJyk7XG4gIHBhdGggPSBbcGF0aCxxdWVyeVN0cmluZ10uam9pbignPycpXG4gIHJldHVybiBbZmlyc3RQYXRoLHBhdGhdO1xufTtcbiAgXG5wcm90by5nZXRRdWVyeVBhcmFtcyA9IGZ1bmN0aW9uKHBhdGgpe1xuICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcbiAgdHJ5IHtcbiAgICB2YXIgcXVlcnlTdHJpbmcgPSBwYXRoLnNwbGl0KCc/JylbMV07XG4gICAgdmFyIHF1ZXJ5UGFpcnMgPSBxdWVyeVN0cmluZy5zcGxpdCgnJicpO1xuICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgIF8uZm9yRWFjaChxdWVyeVBhaXJzLGZ1bmN0aW9uKHF1ZXJ5UGFpcil7XG4gICAgICB2YXIgcGFpciA9IHF1ZXJ5UGFpci5zcGxpdCgnPScpO1xuICAgICAgdmFyIGtleSA9IHBhaXJbMF07XG4gICAgICB2YXIgdmFsdWUgPSBwYWlyWzFdO1xuICAgICAgcXVlcnlQYXJhbXNba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICB9XG4gIGNhdGNoIChlKSB7fVxuICByZXR1cm4gcXVlcnlQYXJhbXM7XG59O1xuXG5wcm90by5nZXRRdWVyeVN0cmluZyA9IGZ1bmN0aW9uKHBhdGgpe1xuICByZXR1cm4gcGF0aC5zcGxpdCgnPycpWzFdO1xufTtcbiAgXG5wcm90by5tYWtlUXVlcnlTdHJpbmcgPSBmdW5jdGlvbihxdWVyeVBhcmFtcyl7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUm91dGVyU2VydmljZTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xuXG5cbi8vIEZJTFRSSVxudmFyIEZpbHRlcnMgPSB7XG4gIGVxOiAnPScsXG4gIGd0OiAnPicsXG4gIGd0ZTogJz49JyxcbiAgbHQ6ICc8JyxcbiAgbHRlOiAnPTwnLFxuICBMSUtFOiAnTElLRScsXG4gIElMSUtFOiAnSUxJS0UnLFxuICBBTkQ6ICdBTkQnLFxuICBPUjogJ09SJyxcbiAgTk9UOiAnIT0nXG59O1xuXG5mdW5jdGlvbiBRdWVyeVFHSVNXTVNQcm92aWRlcigpIHtcblxuICBzZWxmID0gdGhpcztcbiAgLy9mdW56aW9uZSBjaGUgZmEgbGEgcmljaGllc3RhIHZlcmEgZSBwcm9wcmlhIGFsIHNlcnZlciBxZ2lzXG4gIHRoaXMuc3VibWl0R2V0RmVhdHVyZUluZm8gPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cbiAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwgfHwgJyc7XG4gICAgdmFyIHF1ZXJ5bGF5ZXIgPSBvcHRpb25zLnF1ZXJ5bGF5ZXIgfHwgbnVsbDtcbiAgICB2YXIgZmlsdGVyID0gb3B0aW9ucy5maWx0ZXIgfHwgbnVsbDtcbiAgICB2YXIgYmJveCA9IG9wdGlvbnMuYmJveCB8fCBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCkuc3RhdGUuZXh0ZW50LmpvaW4oJywnKTtcbiAgICB2YXIgc2ltcGxlV21zU2VhcmNoTWF4UmVzdWx0cyA9IG51bGw7XG4gICAgdmFyIGNycyA9IG9wdGlvbnMuY3JzIHx8ICc0MzI2OydcbiAgICByZXR1cm4gJC5nZXQoIHVybCwge1xuICAgICAgICAnU0VSVklDRSc6ICdXTVMnLFxuICAgICAgICAnVkVSU0lPTic6ICcxLjMuMCcsXG4gICAgICAgICdSRVFVRVNUJzogJ0dldEZlYXR1cmVJbmZvJyxcbiAgICAgICAgJ0xBWUVSUyc6IHF1ZXJ5bGF5ZXIsXG4gICAgICAgICdRVUVSWV9MQVlFUlMnOiBxdWVyeWxheWVyLFxuICAgICAgICAnRkVBVFVSRV9DT1VOVCc6IHNpbXBsZVdtc1NlYXJjaE1heFJlc3VsdHMgfHwgIDUwLFxuICAgICAgICAnSU5GT19GT1JNQVQnOiAndGV4dC94bWwnLFxuICAgICAgICAnQ1JTJzogJ0VQU0c6JysgY3JzLFxuICAgICAgICAnRklMVEVSJzogZmlsdGVyLFxuICAgICAgICAvLyBUZW1wb3JhcnkgZml4IGZvciBodHRwczovL2h1Yi5xZ2lzLm9yZy9pc3N1ZXMvODY1NiAoZml4ZWQgaW4gUUdJUyBtYXN0ZXIpXG4gICAgICAgICdCQk9YJzogYmJveCAvLyBRVUkgQ0kgVkEgSUwgQkJPWCBERUxMQSBNQVBQQVxuICAgICAgfVxuICAgICk7XG4gICB9O1xuXG4gIC8vZnVuemlvbmUgY2hlIGZhIGxhIHJpY2VyY2FcbiAgdGhpcy5kb1NlYXJjaCA9IGZ1bmN0aW9uKHF1ZXJ5RmlsdGVyT2JqZWN0KSB7XG5cbiAgICB2YXIgdXJsID0gcXVlcnlGaWx0ZXJPYmplY3QudXJsO1xuICAgIHZhciBxdWVyeWxheWVyID0gcXVlcnlGaWx0ZXJPYmplY3QucXVlcnlsYXllcjtcbiAgICB2YXIgZmlsdGVyT2JqZWN0ID0gcXVlcnlGaWx0ZXJPYmplY3QuZmlsdGVyT2JqZWN0O1xuICAgIHZhciBjcnMgPSBxdWVyeUZpbHRlck9iamVjdC5jcnM7XG4gICAgLy9jcmVvIGlsIGZpbHRyb1xuICAgIHZhciBmaWx0ZXIgPSB0aGlzLmNyZWF0ZUZpbHRlcihmaWx0ZXJPYmplY3QsIHF1ZXJ5bGF5ZXIpO1xuICAgIC8vZXNlZ3VvIGxhIHJpY2hpZXN0YSBlIHJlc3RpdHVpc2NvIGNvbWUgcmlzcG9zdGEgbGEgcHJvbWlzZSBkZWwgJC5nZXRcbiAgICB2YXIgcmVzcG9uc2UgPSB0aGlzLnN1Ym1pdEdldEZlYXR1cmVJbmZvKHtcbiAgICAgIHVybDogdXJsLFxuICAgICAgY3JzOiBjcnMsXG4gICAgICBmaWx0ZXI6IGZpbHRlcixcbiAgICAgIHF1ZXJ5bGF5ZXI6IHF1ZXJ5bGF5ZXJcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH07XG5cbiAgdGhpcy5jcmVhdGVGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXJPYmplY3QsIHF1ZXJ5bGF5ZXIpIHtcblxuICAgIC8vLy8vaW5zZXJpc2NvIGlsIG5vbWUgZGVsIGxheWVyICh0eXBlbmFtZSkgLy8vXG4gICAgdmFyIGZpbHRlciA9IFtdO1xuICAgIGZ1bmN0aW9uIGNyZWF0ZVNpbmdsZUZpbHRlcihib29sZWFuT2JqZWN0KSB7XG4gICAgICB2YXIgZmlsdGVyRWxlbWVudHMgPSBbXTtcbiAgICAgIHZhciBmaWx0ZXJFbGVtZW50ID0gJyc7XG4gICAgICB2YXIgdmFsdWVFeHRyYSA9IFwiXCI7XG4gICAgICB2YXIgdmFsdWVRdW90ZXMgPSBcIlwiO1xuICAgICAgdmFyIHJvb3RGaWx0ZXI7XG4gICAgICBfLmZvckVhY2goYm9vbGVhbk9iamVjdCwgZnVuY3Rpb24odiwgaywgb2JqKSB7XG4gICAgICAgIC8vY3JlbyBpbCBmaWx0cm8gcm9vdCBjaGUgc2Fyw6AgQU5EIE9SXG4gICAgICAgIHJvb3RGaWx0ZXIgPSBGaWx0ZXJzW2tdO1xuICAgICAgICAvL3F1aSBjJ8OoIGFycmF5IGRlZ2xpIGVsZW1lbnRpIGRpIHVuIGJvb2xlYW5vXG4gICAgICAgIF8uZm9yRWFjaCh2LCBmdW5jdGlvbihpbnB1dCl7XG4gICAgICAgICAgLy9zY29ycm8gc3Ugb2dnZXR0b1xuICAgICAgICAgIF8uZm9yRWFjaChpbnB1dCwgZnVuY3Rpb24odiwgaywgb2JqKSB7XG4gICAgICAgICAgLy92ZXJpZmljbyBzZSBpbCB2YWxvcmUgZGVsbCdvZ2dldHRvIMOoIGFycmF5IGUgcXVpbmRpIMOoIGFsdHJvIG9nZ2V0dG8gcGFkcmUgYm9vbGVhbm9cbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodikpIHtcbiAgICAgICAgICAgICAgZmlsdGVyRWxlbWVudCA9IGNyZWF0ZVNpbmdsZUZpbHRlcihvYmopO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gw6ggdW4gb2dnZXR0byBvcGVyYXRvcmVcbiAgICAgICAgICAgICAgaWYgKGsgPT0gJ0xJS0UnIHx8IGsgPT0gJ0lMSUtFJykge1xuICAgICAgICAgICAgICAgIHZhbHVlRXh0cmEgPSBcIiVcIjtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgZmlsdGVyT3AgPSBGaWx0ZXJzW2tdO1xuICAgICAgICAgICAgICBfLmZvckVhY2goaW5wdXQsIGZ1bmN0aW9uKHYsIGssIG9iaikge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh2LCBmdW5jdGlvbih2LCBrLCBvYmopIHtcbiAgICAgICAgICAgICAgICAgIC8vdmVyaWZpY28gc2UgaWwgdmFsb3JlIG5vbiDDqCB1biBudW1lcm8gZSBxdWluZGkgYWdnaXVuZ28gc2luZ29sbyBhcGljZVxuICAgICAgICAgICAgICAgICAgaWYoaXNOYU4odikpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVRdW90ZXMgPSBcIidcIjtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlUXVvdGVzID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICBmaWx0ZXJFbGVtZW50ID0gXCJcXFwiXCIgKyBrICsgXCJcXFwiIFwiKyBmaWx0ZXJPcCArXCIgXCIgKyB2YWx1ZVF1b3RlcyArIHZhbHVlRXh0cmEgKyB2ICsgdmFsdWVFeHRyYSArIHZhbHVlUXVvdGVzO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmaWx0ZXJFbGVtZW50cy5wdXNoKGZpbHRlckVsZW1lbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcm9vdEZpbHRlciA9IGZpbHRlckVsZW1lbnRzLmpvaW4oXCIgXCIrIHJvb3RGaWx0ZXIgKyBcIiBcIik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByb290RmlsdGVyO1xuICAgIH07XG4gICAgLy9hc3NlZ25vIGlsIGZpbHRybyBjcmVhdG9cbiAgICBmaWx0ZXIgPSBxdWVyeWxheWVyICsgXCI6XCIgKyBjcmVhdGVTaW5nbGVGaWx0ZXIoZmlsdGVyT2JqZWN0KTtcbiAgICByZXR1cm4gZmlsdGVyO1xuICB9O1xuXG59O1xuXG5pbmhlcml0KFF1ZXJ5UUdJU1dNU1Byb3ZpZGVyLCBHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICBuZXcgUXVlcnlRR0lTV01TUHJvdmlkZXIoKTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xuLy9kZWZpbmlzY28gaWwgZmlsdHJvIG9sM1xudmFyIG9sM09HQ0ZpbHRlciA9IG9sLmZvcm1hdC5vZ2MuZmlsdGVyO1xuXG4vL29nZ2V0dG8gY2hlIHZpZW5lIHBhc3NhdG8gcGVyIGVmZmV0dHVyYXJlIGlsIGxhIHNlYXJjaFxudmFyIG9sM0dldEZlYXR1cmVSZXF1ZXN0T2JqZWN0ID0ge1xuICBzcnNOYW1lOiAnRVBTRzonLFxuICBmZWF0dXJlTlM6ICcnLFxuICBmZWF0dXJlUHJlZml4OiAnJyxcbiAgZmVhdHVyZVR5cGVzOiBbXSxcbiAgb3V0cHV0Rm9ybWF0OiAnYXBwbGljYXRpb24vanNvbicsXG4gIGZpbHRlcjogbnVsbCAvLyBlc2VtcGlvIGZpbHRybyBjb21wb3N0byBvbDNPR0NGaWx0ZXIuYW5kKG9sM09HQ0ZpbHRlci5iYm94KCd0aGVfZ2VvbScsIFsxLCAyLCAzLCA0XSwgJ3VybjpvZ2M6ZGVmOmNyczpFUFNHOjo0MzI2Jyksb2wzT0dDRmlsdGVyLmxpa2UoJ25hbWUnLCAnTmV3KicpKVxufTtcblxuLy8gRklMVFJJIE9MM1xudmFyIG9sM0ZpbHRlcnMgPSB7XG4gIGVxOiBvbDNPR0NGaWx0ZXIuZXF1YWxUbyxcbiAgZ3Q6IG9sM09HQ0ZpbHRlci5ncmVhdGVyVGhhbixcbiAgZ3RlOiBvbDNPR0NGaWx0ZXIuZ3JlYXRlclRoYW5PckVxdWFsVG8sXG4gIGx0OiBvbDNPR0NGaWx0ZXIubGVzc1RoYW4sXG4gIGx0ZTogb2wzT0dDRmlsdGVyLmxlc3NUaGFuT3JFcXVhbFRvLFxuICBsaWtlOiBvbDNPR0NGaWx0ZXIubGlrZSxcbiAgaWxpa2U6IFwiXCIsXG4gIGJib3g6IG9sM09HQ0ZpbHRlci5iYm94LFxuICBBTkQ6IG9sM09HQ0ZpbHRlci5hbmQsXG4gIE9SOiBvbDNPR0NGaWx0ZXIub3IsXG4gIE5PVDogb2wzT0dDRmlsdGVyLm5vdFxufTtcblxuXG4vLyBDUkVBVE8gVU4gRklMVFJPIERJIEVTRU1QSU8gUEVSIFZFUklGSUNBUkUgTEEgQ09SUkVUVEVaWkEgREVMTEEgRlVOWklPTkUgQ1JFQVpJT05FIEZJTFRST1xudmFyIHRlc3RGaWx0ZXIgPSB7XG4gICdBTkQnOlxuICAgIFtcbiAgICAgIHtcbiAgICAgICAgZXE6XG4gICAgICAgICAge1xuICAgICAgICAgICAgZ2lkIDogMTBcbiAgICAgICAgICB9XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAnT1InOlxuICAgICAgICAgIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZXE6IHtcbiAgICAgICAgICAgICAgICBwaXBwbyA6ICdsYWxsbydcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZ3Q6IHtcbiAgICAgICAgICAgICAgICBpZCA6IDVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgXVxuICAgICAgfVxuICAgXVxufVxuLy8vLy8vLy8vLy8vLy9cblxuLy8vRklMVFJJIENVU1RPTVxudmFyIHN0YW5kYXJkRmlsdGVyVGVtcGxhdGVzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjb21tb24gPSB7XG4gICAgcHJvcGVydHlOYW1lOlxuICAgICAgICAgIFwiPFByb3BlcnR5TmFtZT5cIiArXG4gICAgICAgICAgICBcIltQUk9QXVwiICtcbiAgICAgICAgICBcIjwvUHJvcGVydHlOYW1lPlwiLFxuICAgIGxpdGVyYWw6XG4gICAgICAgICAgXCI8TGl0ZXJhbD5cIiArXG4gICAgICAgICAgICBcIltWQUxVRV1cIiArXG4gICAgICAgICAgXCI8L0xpdGVyYWw+XCJcbiAgfTtcbiAgcmV0dXJuIHtcbiAgICBlcTogXCI8UHJvcGVydHlJc0VxdWFsVG8+XCIgK1xuICAgICAgICAgICAgY29tbW9uLnByb3BlcnR5TmFtZSArXG4gICAgICAgICAgICBjb21tb24ubGl0ZXJhbCArXG4gICAgICAgIFwiPC9Qcm9wZXJ0eUlzRXF1YWxUbz5cIixcbiAgICBndDogXCI8UHJvcGVydHlJc0dyZWF0ZXJUaGFuPlwiICtcbiAgICAgICAgICAgIGNvbW1vbi5wcm9wZXJ0eU5hbWUgK1xuICAgICAgICAgICAgY29tbW9uLmxpdGVyYWwgK1xuICAgICAgICAgXCI8L1Byb3BlcnR5SXNHcmVhdGVyVGhhbj5cIixcbiAgICBndGU6XCJcIixcbiAgICBsdDogXCJcIixcbiAgICBsdGU6IFwiXCIsXG4gICAgbGlrZTogXCJcIixcbiAgICBpbGlrZTogXCJcIixcbiAgICBBTkQ6IFwiPEFuZD5bQU5EXTwvQW5kPlwiLFxuICAgIE9SOiBcIjxPcj5bT1JdPC9Pcj5cIixcbiAgfVxufSgpO1xuXG4vLy8vL1xudmFyIHFnaXNGaWx0ZXJUZW1wbGF0ZXMgPSB7XG4gIC8vIGNvZGljZSBxdWlcbn07XG5cbnZhciBtYXBzZXJ2ZXJGaWx0ZXJUZW1wbGF0ZXMgPSB7XG4gIC8vIGNvZGljZSBxdWlcbn07XG5cbnZhciBnZW9zZXJ2ZXJGaWx0ZXJUZW1wbGF0ZXMgPSB7XG4gIC8vIGNvZGljZSBxdWlcbn07XG5cbmZ1bmN0aW9uIFF1ZXJ5V0ZTUHJvdmlkZXIoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZCA9ICQuRGVmZXJyZWQoKTtcbiAgdmFyIHJlc3VsdHMgPSB7XG4gICAgaGVhZGVyczpbXSxcbiAgICB2YWx1ZXM6W11cbiAgfTtcblxuICB0aGlzLmRvU2VhcmNoID0gZnVuY3Rpb24ocXVlcnlGaWx0ZXJPYmplY3Qpe1xuICAgIHZhciBvZ2NzZXJ2ZXJ0eXBlID0gcXVlcnlGaWx0ZXJPYmplY3Quc2VydmVydHlwZTtcbiAgICB2YXIgdXJsID0gcXVlcnlGaWx0ZXJPYmplY3QudXJsO1xuICAgIHZhciBxdWVyeWxheWVyID0gcXVlcnlGaWx0ZXJPYmplY3QucXVlcnlsYXllcjtcbiAgICB2YXIgZmlsdGVyT2JqZWN0ID0gcXVlcnlGaWx0ZXJPYmplY3QuZmlsdGVyT2JqZWN0O1xuICAgIHZhciBjcnMgPSBxdWVyeUZpbHRlck9iamVjdC5jcnM7XG4gICAgLy9zZXR0byBpbCBzcnNcbiAgICBvbDNHZXRGZWF0dXJlUmVxdWVzdE9iamVjdC5zcnNOYW1lKz1jcnMgfHwgJzQzMjYnO1xuICAgIHZhciByZXNwb25zZSwgZmlsdGVyO1xuICAgIHN3aXRjaCAob2djc2VydmVydHlwZSkge1xuICAgICAgY2FzZSAnT0dDJzpcbiAgICAgICAgZmlsdGVyID0gdGhpcy5jcmVhdGVTdGFuZGFyZEZpbHRlcihmaWx0ZXJPYmplY3QsIHF1ZXJ5bGF5ZXIpO1xuICAgICAgICByZXNwb25zZSA9IHRoaXMuc3RhbmRhcmRTZWFyY2godXJsLCBmaWx0ZXIpO1xuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdxZ2lzJzpcbiAgICAgICAgZmlsdGVyID0gdGhpcy5jcmVhdGVRZ2lzRmlsdGVyKGZpbHRlck9iamVjdCk7XG4gICAgICAgIHJlc3BvbnNlID0gdGhpcy5xZ2lzU2VhcmNoKHF1ZXJ5bGF5ZXIsIHVybCwgZmlsdGVyKTtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzcG9uc2UpXG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbWFwc2VydmVyJzpcbiAgICAgICAgZmlsdGVyID0gdGhpcy5jcmVhdGVNYXBzZXJ2ZXJGaWx0ZXIoZmlsdGVyT2JqZWN0KTtcbiAgICAgICAgcmVzcG9uc2UgPSB0aGlzLm1hcHNlcnZlclNlYXJjaChxdWVyeWxheWVyLCB1cmwsIGZpbHRlcik7XG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2dlb3NlcnZlcic6XG4gICAgICAgIGZpbHRlciA9IHRoaXMuY3JlYXRlR2Vvc2VydmVyRmlsdGVyKGZpbHRlck9iamVjdCk7XG4gICAgICAgIHJlc3BvbnNlID0gdGhpcy5nZW9zZXJ2ZXJTZWFyY2gocXVlcnlsYXllciwgdXJsLCBmaWx0ZXIpO1xuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5zdGFuZGFyZFNlYXJjaCA9IGZ1bmN0aW9uKHVybCwgZmlsdGVyKXtcbiAgICBjb25zb2xlLmxvZyhmaWx0ZXIpXG4gIH07XG4gIHRoaXMuY3JlYXRlU3RhbmRhcmRGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXJPYmplY3QsIHF1ZXJ5bGF5ZXIpIHtcbiAgICAvLy8vL2luc2VyaXNjbyBpbCBub21lIGRlbCBsYXllciAodHlwZW5hbWUpIC8vL1xuICAgIG9sM0dldEZlYXR1cmVSZXF1ZXN0T2JqZWN0LmZlYXR1cmVUeXBlcy5wdXNoKHF1ZXJ5bGF5ZXIpO1xuICAgIHZhciBmaWx0ZXIgPSBbXTtcbiAgICBmdW5jdGlvbiBjcmVhdGVTaW5nbGVGaWx0ZXIoYm9vbGVhbk9iamVjdCkge1xuICAgICAgdmFyIGZpbHRlckVsZW1lbnRzID0gW107XG4gICAgICB2YXIgZmlsdGVyRWxlbWVudCA9ICcnO1xuICAgICAgdmFyIHJvb3RGaWx0ZXI7XG4gICAgICBfLmZvckVhY2goYm9vbGVhbk9iamVjdCwgZnVuY3Rpb24odiwgaywgb2JqKSB7XG4gICAgICAgIC8vY3JlbyBpbCBmaWx0cm8gcm9vdCBjaGUgc2Fyw6AgQU5EIE9SXG4gICAgICAgIHJvb3RGaWx0ZXIgPSBvbDNGaWx0ZXJzW2tdO1xuICAgICAgICAvL3F1aSBjJ8OoIGFycmF5IGRlZ2xpIGVsZW1lbnRpIGRpIHVuIGJvb2xlYW5vXG4gICAgICAgIF8uZm9yRWFjaCh2LCBmdW5jdGlvbihpbnB1dCl7XG4gICAgICAgICAgLy9zY29ycm8gc3Ugb2dnZXR0byBvcGVyYXRvcmVcbiAgICAgICAgICBfLmZvckVhY2goaW5wdXQsIGZ1bmN0aW9uKHYsIGssIG9iaikge1xuICAgICAgICAgIC8vw6ggdW4gYXJyYXkgZSBxdWluZGkgw6ggYWx0cm8gb2dnZXR0byBwYWRyZSBib29sZWFub1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2KSkge1xuICAgICAgICAgICAgICBmaWx0ZXJFbGVtZW50ID0gY3JlYXRlU2luZ2xlRmlsdGVyKG9iaik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmaWx0ZXJFbGVtZW50ID0gb2wzRmlsdGVyc1trXTtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKGlucHV0LCBmdW5jdGlvbih2LCBrLCBvYmopIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2godiwgZnVuY3Rpb24odiwgaywgb2JqKSB7XG4gICAgICAgICAgICAgICAgICBmaWx0ZXJFbGVtZW50ID0gZmlsdGVyRWxlbWVudChrLCB2KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZmlsdGVyRWxlbWVudHMucHVzaChmaWx0ZXJFbGVtZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vdmVyaWZpY28gY2hlIGNpIHNpYW5vIGFsbWVubyBkdWUgY29uZGl6aW9uZSBuZWwgZmlsdHJvIEFORC4gTmVsIGNhc28gZGkgdW5hIHNvbGEgY29uZGl6aW9uZSAoZXNlbXBpbyA6IHVuIHNvbG8gaW5wdXQpXG4gICAgICAgIC8vZXN0cmFnZ28gc29sbyBsJ2VsZW1lbnRvIGZpbHRybyBhbHRyaW1lbnRpIGRhIGVycm9yZSAtLSBEQSBWRVJJRklDQVJFIFNFIENBTUJJQVJMT1xuICAgICAgICBpZiAoZmlsdGVyRWxlbWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHJvb3RGaWx0ZXIgPSByb290RmlsdGVyLmFwcGx5KHRoaXMsIGZpbHRlckVsZW1lbnRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb290RmlsdGVyID0gZmlsdGVyRWxlbWVudHNbMF07XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByb290RmlsdGVyO1xuICAgIH07XG4gICAgLy9hc3NlZ25vIGlsIGZpbHRybyBjcmVhdG9cbiAgICBvbDNHZXRGZWF0dXJlUmVxdWVzdE9iamVjdC5maWx0ZXIgPSBjcmVhdGVTaW5nbGVGaWx0ZXIoZmlsdGVyT2JqZWN0KTtcbiAgICAvL2NyZW8gaWwgZmlsdHJvIHV0aWxpenphbmRvIG9sM1xuICAgIGZpbHRlciA9IG5ldyBvbC5mb3JtYXQuV0ZTKCkud3JpdGVHZXRGZWF0dXJlKG9sM0dldEZlYXR1cmVSZXF1ZXN0T2JqZWN0KTtcbiAgICByZXR1cm4gZmlsdGVyO1xuICB9O1xuXG4gIHRoaXMucWdpc1NlYXJjaCA9IGZ1bmN0aW9uKHVybHMsIGZpbHRlcil7XG4gICAgJC5nZXQoc2VhcmNoVXJsKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICBzZWxmLmVtaXQoXCJzZWFyY2hkb25lXCIscmVzdWx0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gZC5wcm9taXNlKCk7XG4gIH07XG4gIHRoaXMuY3JlYXRlUUdpc0ZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlck9iamVjdCkge1xuICAgIHZhciBmaWx0ZXI7XG4gICAgcmV0dXJuIGZpbHRlclxuICB9O1xuICB0aGlzLm1hcHNlcnZlclNlYXJjaCA9IGZ1bmN0aW9uKHF1ZXJ5bGF5ZXIsIHVybCwgZmlsdGVyKXtcbiAgICByZXR1cm4gZC5wcm9taXNlKCk7XG4gIH07XG4gIHRoaXMuY3JlYXRlTWFwc2VydmVyRmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyT2JqZWN0KSB7XG4gICAgdmFyIGZpbHRlcjtcbiAgICByZXR1cm4gZmlsdGVyXG4gIH07XG4gIHRoaXMuZ2Vvc2VydmVyU2VhcmNoID0gZnVuY3Rpb24ocXVlcnlsYXllciwgdXJsLCBmaWx0ZXIpe1xuICAgIHJldHVybiBkLnByb21pc2UoKTtcbiAgfTtcbiAgdGhpcy5jcmVhdGVHZW9zZXJ2ZXJGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXJPYmplY3QpIHtcbiAgICB2YXIgZmlsdGVyO1xuICAgIHJldHVybiBmaWx0ZXJcbiAgfTtcbiAgYmFzZSh0aGlzKTtcbn1cbmluaGVyaXQoUXVlcnlXRlNQcm92aWRlcixHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICBuZXcgUXVlcnlXRlNQcm92aWRlcigpXG5cbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5Jyk7XG52YXIgUXVlcnlXRlNQcm92aWRlciA9IHJlcXVpcmUoJy4vcXVlcnlXRlNQcm92aWRlcicpO1xudmFyIFF1ZXJ5UUdJU1dNU1Byb3ZpZGVyID0gcmVxdWlyZSgnLi9xdWVyeVFHSVNXTVNQcm92aWRlcicpO1xuXG52YXIgUHJvdmlkZXIgPSB7XG4gICdRR0lTJzogUXVlcnlRR0lTV01TUHJvdmlkZXIsXG4gICdPR0MnOiBRdWVyeVdGU1Byb3ZpZGVyXG59O1xuXG5mdW5jdGlvbiBTZWFyY2hRdWVyeVNlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnVybCA9IFwiXCI7XG4gIHRoaXMuZmlsdGVyT2JqZWN0ID0ge307XG4gIHRoaXMucXVlcnlGaWx0ZXJPYmplY3QgPSB7fTtcblxuICB0aGlzLnNldEZpbHRlck9iamVjdCA9IGZ1bmN0aW9uKGZpbHRlck9iamVjdCl7XG4gICAgdGhpcy5maWx0ZXJPYmplY3QgPSBmaWx0ZXJPYmplY3Q7XG4gIH07XG5cbiAgdGhpcy5nZXRGaWx0ZXJPYmplY3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXJPYmplY3Q7XG4gIH07XG4gIC8vZGF0byBsJ29nZ2V0dG8gZmlsdGVyIHJlc3RpdHVpdG8gZGFsIHNlcnZlciByaWNvc3RydWlzY28gbGEgc3RydXR0dXJhIGRlbCBmaWx0ZXJPYmplY3RcbiAgLy9pbnRlcnByZXRhdG8gZGEgcXVlcnlXTVNQcm92aWRlclxuICB0aGlzLmNyZWF0ZVF1ZXJ5RmlsdGVyRnJvbUNvbmZpZyA9IGZ1bmN0aW9uKGZpbHRlcikge1xuXG4gICAgdmFyIHF1ZXJ5RmlsdGVyID0ge307XG4gICAgdmFyIGF0dHJpYnV0ZTtcbiAgICB2YXIgb3BlcmF0b3I7XG4gICAgdmFyIGZpZWxkO1xuICAgIHZhciBvcGVyYXRvck9iamVjdCA9IHt9O1xuICAgIHZhciBib29sZWFuT2JqZWN0ID0ge307XG4gICAgLy9mdW56aW9uZSBjaGUgY29zdHJ1aXNjZSBsJ29nZ2V0dG8gb3BlcmF0b3JlIGVzLiB7Jz0nOnsnbm9tZWNhbXBvJzpudWxsfX1cbiAgICBmdW5jdGlvbiBjcmVhdGVPcGVyYXRvck9iamVjdChvYmopIHtcbiAgICAgIC8vcmluaXppYWxpenpvIGEgb2dnZXR0byB2dW90b1xuICAgICAgZXZhbE9iamVjdCA9IHt9O1xuICAgICAgLy92ZXJpZmljbyBjaGUgbCdvZ2dldHRvIHBhc3NhdG8gbm9uIHNpYSBhIHN1YSB2b2x0YSB1biBvZ2dldHRvICdCT09MRUFOTydcbiAgICAgIF8uZm9yRWFjaChvYmosIGZ1bmN0aW9uKHYsaykge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHYpKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUJvb2xlYW5PYmplY3Qoayx2KTtcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgZmllbGQgPSBvYmouYXR0cmlidXRlO1xuICAgICAgb3BlcmF0b3IgPSBvYmoub3A7XG4gICAgICBldmFsT2JqZWN0W29wZXJhdG9yXSA9IHt9O1xuICAgICAgZXZhbE9iamVjdFtvcGVyYXRvcl1bZmllbGRdID0gbnVsbDtcbiAgICAgIHJldHVybiBldmFsT2JqZWN0O1xuICAgIH07XG4gICAgLy9mdW5jdGlvbmUgY2hlIGNvc3RydWlzY2Ugb2dnZXR0aSBCT09MRUFOSSBjYXNvIEFORCBPUiBjb250ZW5lbnRlIGFycmF5IGRpIG9nZ2V0dGkgZm9ybml0IGRhbGxhIGZ1bnppb25lIGNyZWF0ZU9wZXJhdG9yT2JqZWN0XG4gICAgZnVuY3Rpb24gY3JlYXRlQm9vbGVhbk9iamVjdChib29sZWFuT3BlcmF0b3IsIG9wZXJhdGlvbnMpIHtcbiAgICAgIGJvb2xlYW5PYmplY3QgPSB7fTtcbiAgICAgIGJvb2xlYW5PYmplY3RbYm9vbGVhbk9wZXJhdG9yXSA9IFtdO1xuICAgICAgXy5mb3JFYWNoKG9wZXJhdGlvbnMsIGZ1bmN0aW9uKG9wZXJhdGlvbil7XG4gICAgICAgIGJvb2xlYW5PYmplY3RbYm9vbGVhbk9wZXJhdG9yXS5wdXNoKGNyZWF0ZU9wZXJhdG9yT2JqZWN0KG9wZXJhdGlvbikpO1xuICAgICAgfSlcbiAgICAgIHJldHVybiBib29sZWFuT2JqZWN0O1xuICAgIH07XG4gICAgLypcbiAgICAvLyB2YWRvIGEgY3JlYXJlIGwnb2dnZXR0byBmaWx0cm8gcHJpbmNpcGFsZS4gUXVlc3RvIMOoIHVuIG9nZ2V0dG8gY2hlIGNvbnRpZW5lIGwnb3BlcmF0b3JlIGJvb2xlYW5vIGNvbWUgcm9vdCAoY2hpYXZlKVxuICAgIC8vIGNvbWUgdmFsb3JlIHVuIGFycmF5IGRpIG9nZ2V0dGkgb3BlcmF0b3JpIGNoZSBjb250ZW5nb25vIGlsIHRpcG8gZGkgb3BlcmF0b3JlIGNvbWUgY2hpYXZlIGUgY29tZSB2YWxvcmUgdW4gb2dnZXR0byBjb250ZW5ldGVcbiAgICAvLyBub21lIGNhbXBvIGUgdmFsb3JlIHBhc3NhdG9cbiAgICAqL1xuICAgIF8uZm9yRWFjaChmaWx0ZXIsIGZ1bmN0aW9uKHYsayxvYmopIHtcbiAgICAgIHF1ZXJ5RmlsdGVyID0gY3JlYXRlQm9vbGVhbk9iamVjdChrLHYpO1xuICAgIH0pO1xuICAgIHJldHVybiBxdWVyeUZpbHRlcjtcbiAgfTtcblxuICB0aGlzLmNyZWF0ZVF1ZXJ5RmlsdGVyT2JqZWN0ID0gZnVuY3Rpb24obGF5ZXJJZCwgZmlsdGVyT2JqZWN0KXtcbiAgICB2YXIgbGF5ZXJJbmZvID0gdGhpcy5nZXRMYXllckluZm9VcmxGcm9tUHJvamVjdENvbmZpZyhsYXllcklkKTtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ3N0YW5kYXJkJyxcbiAgICAgIHVybDogbGF5ZXJJbmZvLnVybCxcbiAgICAgIHF1ZXJ5bGF5ZXI6IGxheWVySW5mby5uYW1lLFxuICAgICAgc2VydmVydHlwZTogbGF5ZXJJbmZvLnNlcnZlcnR5cGUsXG4gICAgICBjcnM6IGxheWVySW5mby5jcnMsXG4gICAgICBmaWx0ZXJPYmplY3QgOiBmaWx0ZXJPYmplY3RcbiAgICB9O1xuICB9O1xuXG4gIHRoaXMuZ2V0TGF5ZXJJbmZvVXJsRnJvbVByb2plY3RDb25maWcgPSBmdW5jdGlvbihsYXllcklkKSB7XG4gICAgdmFyIGxheWVyRmlsdGVySW5mbyA9IHt9O1xuICAgIHZhciBQcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICAgIHZhciBsYXllckluZm8gPSBQcm9qZWN0LmdldExheWVyQnlJZChsYXllcklkKTtcbiAgICBpZiAobGF5ZXJJbmZvKSB7XG4gICAgICBsYXllckZpbHRlckluZm8ubmFtZSA9IGxheWVySW5mby5uYW1lO1xuICAgICAgbGF5ZXJGaWx0ZXJJbmZvLmNycyA9IGxheWVySW5mby5jcnM7XG4gICAgICBsYXllckZpbHRlckluZm8uc2VydmVydHlwZSA9IGxheWVySW5mby5zZXJ2ZXJ0eXBlO1xuICAgICAgaWYgKGxheWVySW5mby5zb3VyY2UgJiYgbGF5ZXJJbmZvLnNvdXJjZS51cmwpe1xuICAgICAgICBsYXllckZpbHRlckluZm8udXJsID0gbGF5ZXJJbmZvLnNvdXJjZS51cmw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYXllckZpbHRlckluZm8udXJsID0gUHJvamVjdC5nZXRXbXNVcmwoKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICByZXR1cm4gbGF5ZXJGaWx0ZXJJbmZvO1xuICB9O1xuXG4gIHRoaXMuZG9RdWVyeVNlYXJjaCA9IGZ1bmN0aW9uKHF1ZXJ5RmlsdGVyT2JqZWN0KSB7XG4gICAgdmFyIHByb3ZpZGVyID0gUHJvdmlkZXJbcXVlcnlGaWx0ZXJPYmplY3Quc2VydmVydHlwZV07XG4gICAgcHJvdmlkZXIuZG9TZWFyY2gocXVlcnlGaWx0ZXJPYmplY3QpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICBzZWxmLmVtaXQoXCJzZWFyY2hyZXN1bHRzXCIsIHJlc3VsdClcbiAgICB9KTtcbiAgfTtcbiAgYmFzZSh0aGlzKTtcbn1cbmluaGVyaXQoU2VhcmNoUXVlcnlTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gIG5ldyBTZWFyY2hRdWVyeVNlcnZpY2VcblxuIiwiXG4vKipcbiAqIERlY2ltYWwgYWRqdXN0bWVudCBvZiBhIG51bWJlci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gIHR5cGUgIFRoZSB0eXBlIG9mIGFkanVzdG1lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0gIHZhbHVlIFRoZSBudW1iZXIuXG4gKiBAcGFyYW0ge0ludGVnZXJ9IGV4cCAgIFRoZSBleHBvbmVudCAodGhlIDEwIGxvZ2FyaXRobSBvZiB0aGUgYWRqdXN0bWVudCBiYXNlKS5cbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBhZGp1c3RlZCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gZGVjaW1hbEFkanVzdCh0eXBlLCB2YWx1ZSwgZXhwKSB7XG4gIC8vIElmIHRoZSBleHAgaXMgdW5kZWZpbmVkIG9yIHplcm8uLi5cbiAgaWYgKHR5cGVvZiBleHAgPT09ICd1bmRlZmluZWQnIHx8ICtleHAgPT09IDApIHtcbiAgICByZXR1cm4gTWF0aFt0eXBlXSh2YWx1ZSk7XG4gIH1cbiAgdmFsdWUgPSArdmFsdWU7XG4gIGV4cCA9ICtleHA7XG4gIC8vIElmIHRoZSB2YWx1ZSBpcyBub3QgYSBudW1iZXIgb3IgdGhlIGV4cCBpcyBub3QgYW4gaW50ZWdlci4uLlxuICBpZiAoaXNOYU4odmFsdWUpIHx8ICEodHlwZW9mIGV4cCA9PT0gJ251bWJlcicgJiYgZXhwICUgMSA9PT0gMCkpIHtcbiAgICByZXR1cm4gTmFOO1xuICB9XG4gIC8vIFNoaWZ0XG4gIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKS5zcGxpdCgnZScpO1xuICB2YWx1ZSA9IE1hdGhbdHlwZV0oKyh2YWx1ZVswXSArICdlJyArICh2YWx1ZVsxXSA/ICgrdmFsdWVbMV0gLSBleHApIDogLWV4cCkpKTtcbiAgLy8gU2hpZnQgYmFja1xuICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkuc3BsaXQoJ2UnKTtcbiAgcmV0dXJuICsodmFsdWVbMF0gKyAnZScgKyAodmFsdWVbMV0gPyAoK3ZhbHVlWzFdICsgZXhwKSA6IGV4cCkpO1xufVxuXG4vLyBEZWNpbWFsIHJvdW5kXG5pZiAoIU1hdGgucm91bmQxMCkge1xuICBNYXRoLnJvdW5kMTAgPSBmdW5jdGlvbih2YWx1ZSwgZXhwKSB7XG4gICAgcmV0dXJuIGRlY2ltYWxBZGp1c3QoJ3JvdW5kJywgdmFsdWUsIGV4cCk7XG4gIH07XG59XG4vLyBEZWNpbWFsIGZsb29yXG5pZiAoIU1hdGguZmxvb3IxMCkge1xuICBNYXRoLmZsb29yMTAgPSBmdW5jdGlvbih2YWx1ZSwgZXhwKSB7XG4gICAgcmV0dXJuIGRlY2ltYWxBZGp1c3QoJ2Zsb29yJywgdmFsdWUsIGV4cCk7XG4gIH07XG59XG4vLyBEZWNpbWFsIGNlaWxcbmlmICghTWF0aC5jZWlsMTApIHtcbiAgTWF0aC5jZWlsMTAgPSBmdW5jdGlvbih2YWx1ZSwgZXhwKSB7XG4gICAgcmV0dXJuIGRlY2ltYWxBZGp1c3QoJ2NlaWwnLCB2YWx1ZSwgZXhwKTtcbiAgfTtcbn1cblxuU3RyaW5nLnByb3RvdHlwZS5oYXNoQ29kZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaGFzaCA9IDAsIGksIGNociwgbGVuO1xuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiBoYXNoO1xuICBmb3IgKGkgPSAwLCBsZW4gPSB0aGlzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgY2hyICAgPSB0aGlzLmNoYXJDb2RlQXQoaSk7XG4gICAgaGFzaCAgPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIGNocjtcbiAgICBoYXNoIHw9IDA7XG4gIH1cbiAgcmV0dXJuIGhhc2g7XG59O1xuXG52YXIgQmFzZTY0ID0ge19rZXlTdHI6XCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPVwiLGVuY29kZTpmdW5jdGlvbihlKXt2YXIgdD1cIlwiO3ZhciBuLHIsaSxzLG8sdSxhO3ZhciBmPTA7ZT1CYXNlNjQuX3V0ZjhfZW5jb2RlKGUpO3doaWxlKGY8ZS5sZW5ndGgpe249ZS5jaGFyQ29kZUF0KGYrKyk7cj1lLmNoYXJDb2RlQXQoZisrKTtpPWUuY2hhckNvZGVBdChmKyspO3M9bj4+MjtvPShuJjMpPDw0fHI+PjQ7dT0ociYxNSk8PDJ8aT4+NjthPWkmNjM7aWYoaXNOYU4ocikpe3U9YT02NH1lbHNlIGlmKGlzTmFOKGkpKXthPTY0fXQ9dCt0aGlzLl9rZXlTdHIuY2hhckF0KHMpK3RoaXMuX2tleVN0ci5jaGFyQXQobykrdGhpcy5fa2V5U3RyLmNoYXJBdCh1KSt0aGlzLl9rZXlTdHIuY2hhckF0KGEpfXJldHVybiB0fSxkZWNvZGU6ZnVuY3Rpb24oZSl7dmFyIHQ9XCJcIjt2YXIgbixyLGk7dmFyIHMsbyx1LGE7dmFyIGY9MDtlPWUucmVwbGFjZSgvW15BLVphLXowLTkrLz1dL2csXCJcIik7d2hpbGUoZjxlLmxlbmd0aCl7cz10aGlzLl9rZXlTdHIuaW5kZXhPZihlLmNoYXJBdChmKyspKTtvPXRoaXMuX2tleVN0ci5pbmRleE9mKGUuY2hhckF0KGYrKykpO3U9dGhpcy5fa2V5U3RyLmluZGV4T2YoZS5jaGFyQXQoZisrKSk7YT10aGlzLl9rZXlTdHIuaW5kZXhPZihlLmNoYXJBdChmKyspKTtuPXM8PDJ8bz4+NDtyPShvJjE1KTw8NHx1Pj4yO2k9KHUmMyk8PDZ8YTt0PXQrU3RyaW5nLmZyb21DaGFyQ29kZShuKTtpZih1IT02NCl7dD10K1N0cmluZy5mcm9tQ2hhckNvZGUocil9aWYoYSE9NjQpe3Q9dCtTdHJpbmcuZnJvbUNoYXJDb2RlKGkpfX10PUJhc2U2NC5fdXRmOF9kZWNvZGUodCk7cmV0dXJuIHR9LF91dGY4X2VuY29kZTpmdW5jdGlvbihlKXtlPWUucmVwbGFjZSgvcm4vZyxcIm5cIik7dmFyIHQ9XCJcIjtmb3IodmFyIG49MDtuPGUubGVuZ3RoO24rKyl7dmFyIHI9ZS5jaGFyQ29kZUF0KG4pO2lmKHI8MTI4KXt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKHIpfWVsc2UgaWYocj4xMjcmJnI8MjA0OCl7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42fDE5Mik7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyJjYzfDEyOCl9ZWxzZXt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjEyfDIyNCk7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42JjYzfDEyOCk7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyJjYzfDEyOCl9fXJldHVybiB0fSxfdXRmOF9kZWNvZGU6ZnVuY3Rpb24oZSl7dmFyIHQ9XCJcIjt2YXIgbj0wO3ZhciByPWMxPWMyPTA7d2hpbGUobjxlLmxlbmd0aCl7cj1lLmNoYXJDb2RlQXQobik7aWYocjwxMjgpe3QrPVN0cmluZy5mcm9tQ2hhckNvZGUocik7bisrfWVsc2UgaWYocj4xOTEmJnI8MjI0KXtjMj1lLmNoYXJDb2RlQXQobisxKTt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChyJjMxKTw8NnxjMiY2Myk7bis9Mn1lbHNle2MyPWUuY2hhckNvZGVBdChuKzEpO2MzPWUuY2hhckNvZGVBdChuKzIpO3QrPVN0cmluZy5mcm9tQ2hhckNvZGUoKHImMTUpPDwxMnwoYzImNjMpPDw2fGMzJjYzKTtuKz0zfX1yZXR1cm4gdH19O1xuXG5cbnZhciB1dGlscyA9IHtcbiAgbWl4aW46IGZ1bmN0aW9uIG1peGluKGRlc3RpbmF0aW9uLCBzb3VyY2UpIHtcbiAgICAgIHJldHVybiB1dGlscy5tZXJnZShkZXN0aW5hdGlvbi5wcm90b3R5cGUsIHNvdXJjZSk7XG4gIH0sXG4gIFxuICBtaXhpbmluc3RhbmNlOiBmdW5jdGlvbiBtaXhpbmluc3RhbmNlKGRlc3RpbmF0aW9uLHNvdXJjZSl7XG4gICAgICB2YXIgc291cmNlSW5zdGFuY2UgPSBuZXcgc291cmNlO1xuICAgICAgdXRpbHMubWVyZ2UoZGVzdGluYXRpb24sIHNvdXJjZUluc3RhbmNlKTtcbiAgICAgIHV0aWxzLm1lcmdlKGRlc3RpbmF0aW9uLnByb3RvdHlwZSwgc291cmNlLnByb3RvdHlwZSk7XG4gIH0sXG5cblxuICBtZXJnZTogZnVuY3Rpb24gbWVyZ2UoZGVzdGluYXRpb24sIHNvdXJjZSkge1xuICAgICAgdmFyIGtleTtcblxuICAgICAgZm9yIChrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgaWYgKHV0aWxzLmhhc093bihzb3VyY2UsIGtleSkpIHtcbiAgICAgICAgICAgICAgZGVzdGluYXRpb25ba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgfSxcblxuICBoYXNPd246IGZ1bmN0aW9uIGhhc093bihvYmplY3QsIGtleSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSk7XG4gIH0sXG4gIFxuICBpbmhlcml0OmZ1bmN0aW9uKGNoaWxkQ3RvciwgcGFyZW50Q3Rvcikge1xuICAgIGZ1bmN0aW9uIHRlbXBDdG9yKCkge307XG4gICAgdGVtcEN0b3IucHJvdG90eXBlID0gcGFyZW50Q3Rvci5wcm90b3R5cGU7XG4gICAgY2hpbGRDdG9yLnN1cGVyQ2xhc3NfID0gcGFyZW50Q3Rvci5wcm90b3R5cGU7XG4gICAgY2hpbGRDdG9yLnByb3RvdHlwZSA9IG5ldyB0ZW1wQ3RvcigpO1xuICAgIGNoaWxkQ3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjaGlsZEN0b3I7XG4gIH0sXG4gIFxuICBiYXNlOiBmdW5jdGlvbihtZSwgb3B0X21ldGhvZE5hbWUsIHZhcl9hcmdzKSB7XG4gICAgdmFyIGNhbGxlciA9IGFyZ3VtZW50cy5jYWxsZWUuY2FsbGVyO1xuICAgIGlmIChjYWxsZXIuc3VwZXJDbGFzc18pIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBjb25zdHJ1Y3Rvci4gQ2FsbCB0aGUgc3VwZXJjbGFzcyBjb25zdHJ1Y3Rvci5cbiAgICAgIHJldHVybiBjYWxsZXIuc3VwZXJDbGFzc18uY29uc3RydWN0b3IuYXBwbHkoXG4gICAgICAgICAgbWUsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIH1cblxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgZm91bmRDYWxsZXIgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBjdG9yID0gbWUuY29uc3RydWN0b3I7XG4gICAgICAgICBjdG9yOyBjdG9yID0gY3Rvci5zdXBlckNsYXNzXyAmJiBjdG9yLnN1cGVyQ2xhc3NfLmNvbnN0cnVjdG9yKSB7XG4gICAgICBpZiAoY3Rvci5wcm90b3R5cGVbb3B0X21ldGhvZE5hbWVdID09PSBjYWxsZXIpIHtcbiAgICAgICAgZm91bmRDYWxsZXIgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChmb3VuZENhbGxlcikge1xuICAgICAgICByZXR1cm4gY3Rvci5wcm90b3R5cGVbb3B0X21ldGhvZE5hbWVdLmFwcGx5KG1lLCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBkaWQgbm90IGZpbmQgdGhlIGNhbGxlciBpbiB0aGUgcHJvdG90eXBlIGNoYWluLFxuICAgIC8vIHRoZW4gb25lIG9mIHR3byB0aGluZ3MgaGFwcGVuZWQ6XG4gICAgLy8gMSkgVGhlIGNhbGxlciBpcyBhbiBpbnN0YW5jZSBtZXRob2QuXG4gICAgLy8gMikgVGhpcyBtZXRob2Qgd2FzIG5vdCBjYWxsZWQgYnkgdGhlIHJpZ2h0IGNhbGxlci5cbiAgICBpZiAobWVbb3B0X21ldGhvZE5hbWVdID09PSBjYWxsZXIpIHtcbiAgICAgIHJldHVybiBtZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbb3B0X21ldGhvZE5hbWVdLmFwcGx5KG1lLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICAgJ2Jhc2UgY2FsbGVkIGZyb20gYSBtZXRob2Qgb2Ygb25lIG5hbWUgJyArXG4gICAgICAgICAgJ3RvIGEgbWV0aG9kIG9mIGEgZGlmZmVyZW50IG5hbWUnKTtcbiAgICB9XG4gIH0sXG4gIFxuICBub29wOiBmdW5jdGlvbigpe30sXG4gIFxuICB0cnVlZm5jOiBmdW5jdGlvbigpe3JldHVybiB0cnVlfSxcbiAgXG4gIGZhbHNlZm5jOiBmdW5jdGlvbigpe3JldHVybiB0cnVlfSxcbiAgXG4gIHJlc29sdmU6IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgZGVmZXJyZWQucmVzb2x2ZSh2YWx1ZSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfSxcbiAgXG4gIHJlamVjdDogZnVuY3Rpb24odmFsdWUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBkZWZlcnJlZC5yZWplY3QodmFsdWUpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH0sXG4gIFxuICBCYXNlNjQ6IEJhc2U2NFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcbiIsInZhciBDb250cm9sID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gIHZhciBuYW1lID0gb3B0aW9ucy5uYW1lIHx8IFwiP1wiO1xuICB0aGlzLm5hbWUgPSBuYW1lLnNwbGl0KCcgJykuam9pbignLScpLnRvTG93ZXJDYXNlKCk7XG4gIHRoaXMuaWQgPSB0aGlzLm5hbWUrJ18nKyhNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwKSk7XG4gIFxuICBpZiAoIW9wdGlvbnMuZWxlbWVudCkge1xuICAgIHZhciBjbGFzc05hbWUgPSBcIm9sLVwiK3RoaXMubmFtZS5zcGxpdCgnICcpLmpvaW4oJy0nKS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciB0aXBMYWJlbCA9IG9wdGlvbnMudGlwTGFiZWwgfHwgdGhpcy5uYW1lO1xuICAgIHZhciBsYWJlbCA9IG9wdGlvbnMubGFiZWwgfHwgXCI/XCI7XG4gICAgXG4gICAgb3B0aW9ucy5lbGVtZW50ID0gJCgnPGRpdiBjbGFzcz1cIicrY2xhc3NOYW1lKycgb2wtdW5zZWxlY3RhYmxlIG9sLWNvbnRyb2xcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIicrdGlwTGFiZWwrJ1wiPicrbGFiZWwrJzwvYnV0dG9uPjwvZGl2PicpWzBdO1xuICB9XG4gIFxuICB2YXIgYnV0dG9uQ2xpY2tIYW5kbGVyID0gb3B0aW9ucy5idXR0b25DbGlja0hhbmRsZXIgfHwgQ29udHJvbC5wcm90b3R5cGUuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyk7XG4gIFxuICAkKG9wdGlvbnMuZWxlbWVudCkub24oJ2NsaWNrJyxidXR0b25DbGlja0hhbmRsZXIpO1xuICBcbiAgb2wuY29udHJvbC5Db250cm9sLmNhbGwodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3Bvc3RSZW5kZXIoKTtcbn1cbm9sLmluaGVyaXRzKENvbnRyb2wsIG9sLmNvbnRyb2wuQ29udHJvbCk7XG5cblxudmFyIHByb3RvID0gQ29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLl9oYW5kbGVDbGljayA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIG1hcCA9IHRoaXMuZ2V0TWFwKCk7XG4gIFxuICB2YXIgcmVzZXRDb250cm9sID0gbnVsbDtcbiAgLy8gcmVtb3ZlIGFsbCB0aGUgb3RoZXIsIGV2ZW50dWFsbHkgdG9nZ2xlZCwgaW50ZXJhY3Rpb25jb250cm9sc1xuICB2YXIgY29udHJvbHMgPSBtYXAuZ2V0Q29udHJvbHMoKTtcbiAgY29udHJvbHMuZm9yRWFjaChmdW5jdGlvbihjb250cm9sKXtcbiAgICBpZihjb250cm9sLmlkICYmIGNvbnRyb2wudG9nZ2xlICYmIChjb250cm9sLmlkICE9IHNlbGYuaWQpKSB7XG4gICAgICBjb250cm9sLnRvZ2dsZShmYWxzZSk7XG4gICAgICBpZiAoY29udHJvbC5uYW1lID09ICdyZXNldCcpIHtcbiAgICAgICAgcmVzZXRDb250cm9sID0gY29udHJvbDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBpZiAoIXNlbGYuX3RvZ2dsZWQgJiYgcmVzZXRDb250cm9sKSB7XG4gICAgcmVzZXRDb250cm9sLnRvZ2dsZSh0cnVlKTtcbiAgfVxufTtcblxucHJvdG8uX3Bvc3RSZW5kZXIgPSBmdW5jdGlvbigpe307XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbDtcbiIsInZhciBDb250cm9sID0gcmVxdWlyZSgnLi9jb250cm9sJyk7XG5cbnZhciBJbnRlcmFjdGlvbkNvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdGhpcy5fdG9nZ2xlZCA9IHRoaXMuX3RvZ2dsZWQgfHwgZmFsc2U7XG4gIHRoaXMuX2ludGVyYWN0aW9uID0gb3B0aW9ucy5pbnRlcmFjdGlvbiB8fCBudWxsO1xuICB0aGlzLl9hdXRvdW50b2dnbGUgPSBvcHRpb25zLmF1dG91bnRvZ2dsZSB8fCBmYWxzZTtcbiAgXG4gIG9wdGlvbnMuYnV0dG9uQ2xpY2tIYW5kbGVyID0gSW50ZXJhY3Rpb25Db250cm9sLnByb3RvdHlwZS5faGFuZGxlQ2xpY2suYmluZCh0aGlzKTtcbiAgXG4gIENvbnRyb2wuY2FsbCh0aGlzLG9wdGlvbnMpO1xufTtcbm9sLmluaGVyaXRzKEludGVyYWN0aW9uQ29udHJvbCwgQ29udHJvbCk7XG5cbnZhciBwcm90byA9IEludGVyYWN0aW9uQ29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uKHRvZ2dsZSl7XG4gIHZhciB0b2dnbGUgPSB0b2dnbGUgIT09IHVuZGVmaW5lZCA/IHRvZ2dsZSA6ICF0aGlzLl90b2dnbGVkXG4gIHRoaXMuX3RvZ2dsZWQgPSB0b2dnbGU7XG4gIHZhciBtYXAgPSB0aGlzLmdldE1hcCgpO1xuICB2YXIgY29udHJvbEJ1dHRvbiA9ICQodGhpcy5lbGVtZW50KS5maW5kKCdidXR0b24nKS5maXJzdCgpO1xuICBcbiAgaWYgKHRvZ2dsZSkge1xuICAgIGlmICh0aGlzLl9pbnRlcmFjdGlvbikge1xuICAgICAgbWFwLmFkZEludGVyYWN0aW9uKHRoaXMuX2ludGVyYWN0aW9uKTtcbiAgICB9XG4gICAgY29udHJvbEJ1dHRvbi5hZGRDbGFzcygnZzN3LW9sLXRvZ2dsZWQnKTtcbiAgfVxuICBlbHNlIHtcbiAgICBpZiAodGhpcy5faW50ZXJhY3Rpb24pIHtcbiAgICAgIG1hcC5yZW1vdmVJbnRlcmFjdGlvbih0aGlzLl9pbnRlcmFjdGlvbik7XG4gICAgfVxuICAgIGNvbnRyb2xCdXR0b24ucmVtb3ZlQ2xhc3MoJ2czdy1vbC10b2dnbGVkJyk7XG4gIH1cbn1cblxucHJvdG8uX2hhbmRsZUNsaWNrID0gZnVuY3Rpb24oZSl7XG4gIHRoaXMudG9nZ2xlKCk7XG4gIENvbnRyb2wucHJvdG90eXBlLl9oYW5kbGVDbGljay5jYWxsKHRoaXMsZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyYWN0aW9uQ29udHJvbDtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgSW50ZXJhY3Rpb25Db250cm9sID0gcmVxdWlyZSgnLi9pbnRlcmFjdGlvbmNvbnRyb2wnKTtcblxudmFyIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uID0gcmVxdWlyZSgnLi4vaW50ZXJhY3Rpb25zL3BpY2tjb29yZGluYXRlc2ludGVyYWN0aW9uJyk7XG5cbnZhciBRdWVyeUNvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgX29wdGlvbnMgPSB7XG4gICAgbmFtZTogXCJxdWVyeWxheWVyXCIsXG4gICAgdGlwTGFiZWw6IFwiUXVlcnkgbGF5ZXJcIixcbiAgICBsYWJlbDogXCJcXHVlYTBmXCIsXG4gICAgaW50ZXJhY3Rpb246IG5ldyBQaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvblxuICB9O1xuICBcbiAgb3B0aW9ucyA9IHV0aWxzLm1lcmdlKG9wdGlvbnMsX29wdGlvbnMpO1xuICBcbiAgSW50ZXJhY3Rpb25Db250cm9sLmNhbGwodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX2ludGVyYWN0aW9uLm9uKCdwaWNrZWQnLGZ1bmN0aW9uKGUpe1xuICAgIHNlbGYuZGlzcGF0Y2hFdmVudCh7XG4gICAgICB0eXBlOiAncGlja2VkJyxcbiAgICAgIGNvb3JkaW5hdGVzOiBlLmNvb3JkaW5hdGVcbiAgICB9KTtcbiAgICBpZiAoc2VsZi5fYXV0b3VudG9nZ2xlKSB7XG4gICAgICBzZWxmLnRvZ2dsZSgpO1xuICAgIH1cbiAgfSk7XG59XG5vbC5pbmhlcml0cyhRdWVyeUNvbnRyb2wsIEludGVyYWN0aW9uQ29udHJvbCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUXVlcnlDb250cm9sO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbnZhciBJbnRlcmFjdGlvbkNvbnRyb2wgPSByZXF1aXJlKCcuL2ludGVyYWN0aW9uY29udHJvbCcpO1xuXG52YXIgUmVzZXRDb250cm9sID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fdG9nZ2xlZCA9IHRydWU7XG4gIHRoaXMuX3N0YXJ0Q29vcmRpbmF0ZSA9IG51bGw7XG4gIHZhciBfb3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IFwicmVzZXRcIixcbiAgICAgIHRpcExhYmVsOiBcIlBhblwiLFxuICAgICAgbGFiZWw6IFwiXFx1ZTkwMVwiLFxuICAgIH07XG4gIFxuICBvcHRpb25zID0gdXRpbHMubWVyZ2Uob3B0aW9ucyxfb3B0aW9ucyk7XG4gIFxuICBJbnRlcmFjdGlvbkNvbnRyb2wuY2FsbCh0aGlzLG9wdGlvbnMpO1xufVxub2wuaW5oZXJpdHMoUmVzZXRDb250cm9sLCBJbnRlcmFjdGlvbkNvbnRyb2wpO1xubW9kdWxlLmV4cG9ydHMgPSBSZXNldENvbnRyb2w7XG5cbnZhciBwcm90byA9IFJlc2V0Q29udHJvbC5wcm90b3R5cGU7XG5cbnByb3RvLl9wb3N0UmVuZGVyID0gZnVuY3Rpb24oKXtcbiAgdGhpcy50b2dnbGUodHJ1ZSk7XG59O1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbnZhciBJbnRlcmFjdGlvbkNvbnRyb2wgPSByZXF1aXJlKCcuL2ludGVyYWN0aW9uY29udHJvbCcpO1xuXG52YXIgWm9vbUJveENvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9zdGFydENvb3JkaW5hdGUgPSBudWxsO1xuICB2YXIgX29wdGlvbnMgPSB7XG4gICAgICBuYW1lOiBcInpvb21ib3hcIixcbiAgICAgIHRpcExhYmVsOiBcIlpvb20gdG8gYm94XCIsXG4gICAgICBsYWJlbDogXCJcXHVlOTAwXCIsXG4gICAgICBpbnRlcmFjdGlvbjogbmV3IG9sLmludGVyYWN0aW9uLkRyYWdCb3hcbiAgICB9O1xuICBcbiAgb3B0aW9ucyA9IHV0aWxzLm1lcmdlKG9wdGlvbnMsX29wdGlvbnMpO1xuICBcbiAgSW50ZXJhY3Rpb25Db250cm9sLmNhbGwodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX2ludGVyYWN0aW9uLm9uKCdib3hzdGFydCcsZnVuY3Rpb24oZSl7XG4gICAgc2VsZi5fc3RhcnRDb29yZGluYXRlID0gZS5jb29yZGluYXRlO1xuICB9KTtcbiAgXG4gIHRoaXMuX2ludGVyYWN0aW9uLm9uKCdib3hlbmQnLGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzdGFydF9jb29yZGluYXRlID0gc2VsZi5fc3RhcnRDb29yZGluYXRlO1xuICAgIHZhciBlbmRfY29vcmRpbmF0ZSA9IGUuY29vcmRpbmF0ZTtcbiAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJvdW5kaW5nRXh0ZW50KFtzdGFydF9jb29yZGluYXRlLGVuZF9jb29yZGluYXRlXSk7XG4gICAgc2VsZi5kaXNwYXRjaEV2ZW50KHtcbiAgICAgIHR5cGU6ICd6b29tZW5kJyxcbiAgICAgIGV4dGVudDogZXh0ZW50XG4gICAgfSk7XG4gICAgc2VsZi5fc3RhcnRDb29yZGluYXRlID0gbnVsbDtcbiAgICBpZiAoc2VsZi5fYXV0b3VudG9nZ2xlKSB7XG4gICAgICBzZWxmLnRvZ2dsZSgpO1xuICAgIH1cbiAgfSlcbn1cbm9sLmluaGVyaXRzKFpvb21Cb3hDb250cm9sLCBJbnRlcmFjdGlvbkNvbnRyb2wpO1xubW9kdWxlLmV4cG9ydHMgPSBab29tQm94Q29udHJvbDtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBtYXBoZWxwZXJzID0gcmVxdWlyZSgnLi9tYXAvbWFwaGVscGVycycpO1xuXG4oZnVuY3Rpb24gKG5hbWUsIHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShmYWN0b3J5KTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfVxuICBlbHNlIHtcbiAgICByb290W25hbWVdID0gZmFjdG9yeSgpO1xuICB9XG59KSgnZzN3b2wzJywgdGhpcywgZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIFxuICB2YXIgaGVscGVycyA9IHV0aWxzLm1lcmdlKHt9LG1hcGhlbHBlcnMpO1xuICBcbiAgcmV0dXJuIHtcbiAgICBoZWxwZXJzOiBoZWxwZXJzXG4gIH1cbn0pO1xuIiwidmFyIEJhc2VMYXllcnMgPSB7fTtcblxuQmFzZUxheWVycy5PU00gPSBuZXcgb2wubGF5ZXIuVGlsZSh7XG4gIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5PU00oe1xuICAgIGF0dHJpYnV0aW9uczogW1xuICAgICAgbmV3IG9sLkF0dHJpYnV0aW9uKHtcbiAgICAgICAgaHRtbDogJ0FsbCBtYXBzICZjb3B5OyAnICtcbiAgICAgICAgICAgICc8YSBocmVmPVwiaHR0cDovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9cIj5PcGVuU3RyZWV0TWFwPC9hPidcbiAgICAgIH0pLFxuICAgICAgb2wuc291cmNlLk9TTS5BVFRSSUJVVElPTlxuICAgIF0sXG4gICAgdXJsOiAnaHR0cDovL3thLWN9LnRpbGUub3BlbnN0cmVldG1hcC5vcmcve3p9L3t4fS97eX0ucG5nJyxcbiAgICBjcm9zc09yaWdpbjogbnVsbFxuICB9KSxcbiAgaWQ6ICdvc20nLFxuICB0aXRsZTogJ09TTScsXG4gIGJhc2VtYXA6IHRydWVcbn0pO1xuXG5CYXNlTGF5ZXJzLkJJTkcgPSB7fTtcblxuQmFzZUxheWVycy5CSU5HLlJvYWQgPSBuZXcgb2wubGF5ZXIuVGlsZSh7XG4gIG5hbWU6J1JvYWQnLFxuICB2aXNpYmxlOiBmYWxzZSxcbiAgcHJlbG9hZDogSW5maW5pdHksXG4gIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5CaW5nTWFwcyh7XG4gICAga2V5OiAnQW1fbUFTblVBLWp0VzNPM014SVltT09QTE92TDM5ZHdNdlJueW9IeGZLZl9FUE5ZZ2ZXTTlpbXFHRVRXS0dWbicsXG4gICAgaW1hZ2VyeVNldDogJ1JvYWQnXG4gICAgICAvLyB1c2UgbWF4Wm9vbSAxOSB0byBzZWUgc3RyZXRjaGVkIHRpbGVzIGluc3RlYWQgb2YgdGhlIEJpbmdNYXBzXG4gICAgICAvLyBcIm5vIHBob3RvcyBhdCB0aGlzIHpvb20gbGV2ZWxcIiB0aWxlc1xuICAgICAgLy8gbWF4Wm9vbTogMTlcbiAgfSksXG4gIGJhc2VtYXA6IHRydWVcbn0pO1xuXG5CYXNlTGF5ZXJzLkJJTkcuQWVyaWFsV2l0aExhYmVscyA9IG5ldyBvbC5sYXllci5UaWxlKHtcbiAgbmFtZTogJ0FlcmlhbFdpdGhMYWJlbHMnLFxuICB2aXNpYmxlOiB0cnVlLFxuICBwcmVsb2FkOiBJbmZpbml0eSxcbiAgc291cmNlOiBuZXcgb2wuc291cmNlLkJpbmdNYXBzKHtcbiAgICBrZXk6ICdBbV9tQVNuVUEtanRXM08zTXhJWW1PT1BMT3ZMMzlkd012Um55b0h4ZktmX0VQTllnZldNOWltcUdFVFdLR1ZuJyxcbiAgICBpbWFnZXJ5U2V0OiAnQWVyaWFsV2l0aExhYmVscydcbiAgICAgIC8vIHVzZSBtYXhab29tIDE5IHRvIHNlZSBzdHJldGNoZWQgdGlsZXMgaW5zdGVhZCBvZiB0aGUgQmluZ01hcHNcbiAgICAgIC8vIFwibm8gcGhvdG9zIGF0IHRoaXMgem9vbSBsZXZlbFwiIHRpbGVzXG4gICAgICAvLyBtYXhab29tOiAxOVxuICB9KSxcbiAgYmFzZW1hcDogdHJ1ZVxufSk7XG5cbkJhc2VMYXllcnMuQklORy5BZXJpYWwgPSBuZXcgb2wubGF5ZXIuVGlsZSh7XG4gIG5hbWU6ICdBZXJpYWwnLFxuICB2aXNpYmxlOiBmYWxzZSxcbiAgcHJlbG9hZDogSW5maW5pdHksXG4gIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5CaW5nTWFwcyh7XG4gICAga2V5OiAnQW1fbUFTblVBLWp0VzNPM014SVltT09QTE92TDM5ZHdNdlJueW9IeGZLZl9FUE5ZZ2ZXTTlpbXFHRVRXS0dWbicsXG4gICAgaW1hZ2VyeVNldDogJ0FlcmlhbCdcbiAgICAgIC8vIHVzZSBtYXhab29tIDE5IHRvIHNlZSBzdHJldGNoZWQgdGlsZXMgaW5zdGVhZCBvZiB0aGUgQmluZ01hcHNcbiAgICAgIC8vIFwibm8gcGhvdG9zIGF0IHRoaXMgem9vbSBsZXZlbFwiIHRpbGVzXG4gICAgICAvLyBtYXhab29tOiAxOVxuICB9KSxcbiAgYmFzZW1hcDogdHJ1ZVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZUxheWVycztcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgUmFzdGVyTGF5ZXJzID0ge307XG5cblJhc3RlckxheWVycy5UaWxlZFdNU0xheWVyID0gZnVuY3Rpb24obGF5ZXJPYmosZXh0cmFQYXJhbXMpe1xuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBsYXllck9iajogbGF5ZXJPYmosXG4gICAgZXh0cmFQYXJhbXM6IGV4dHJhUGFyYW1zIHx8IHt9LFxuICAgIHRpbGVkOiB0cnVlXG4gIH1cbiAgcmV0dXJuIFJhc3RlckxheWVycy5fV01TTGF5ZXIob3B0aW9ucyk7XG59O1xuXG5SYXN0ZXJMYXllcnMuV01TTGF5ZXIgPSBmdW5jdGlvbihsYXllck9iaixleHRyYVBhcmFtcyl7XG4gIHZhciBvcHRpb25zID0ge1xuICAgIGxheWVyT2JqOiBsYXllck9iaixcbiAgICBleHRyYVBhcmFtczogZXh0cmFQYXJhbXMgfHwge31cbiAgfVxuICByZXR1cm4gUmFzdGVyTGF5ZXJzLl9XTVNMYXllcihvcHRpb25zKTtcbn07XG5cblJhc3RlckxheWVycy5fV01TTGF5ZXIgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIGxheWVyT2JqID0gb3B0aW9ucy5sYXllck9iajtcbiAgdmFyIGV4dHJhUGFyYW1zID0gb3B0aW9ucy5leHRyYVBhcmFtcztcbiAgdmFyIHRpbGVkID0gb3B0aW9ucy50aWxlZCB8fCBmYWxzZTtcbiAgXG4gIHZhciBwYXJhbXMgPSB7XG4gICAgTEFZRVJTOiBsYXllck9iai5sYXllcnMgfHwgJycsXG4gICAgVkVSU0lPTjogJzEuMy4wJyxcbiAgICBUUkFOU1BBUkVOVDogdHJ1ZSxcbiAgICBTTERfVkVSU0lPTjogJzEuMS4wJ1xuICB9O1xuICBcbiAgcGFyYW1zID0gdXRpbHMubWVyZ2UocGFyYW1zLGV4dHJhUGFyYW1zKTtcbiAgXG4gIHZhciBzb3VyY2VPcHRpb25zID0ge1xuICAgIHVybDogbGF5ZXJPYmoudXJsLFxuICAgIHBhcmFtczogcGFyYW1zLFxuICAgIHJhdGlvOiAxXG4gIH07XG4gIFxuICB2YXIgaW1hZ2VPcHRpb25zID0ge1xuICAgIGlkOiBsYXllck9iai5pZCxcbiAgICBuYW1lOiBsYXllck9iai5uYW1lLFxuICAgIG9wYWNpdHk6IGxheWVyT2JqLm9wYWNpdHkgfHwgMS4wLFxuICAgIHZpc2libGU6bGF5ZXJPYmoudmlzaWJsZSxcbiAgICBtYXhSZXNvbHV0aW9uOiBsYXllck9iai5tYXhSZXNvbHV0aW9uXG4gIH1cbiAgXG4gIHZhciBpbWFnZUNsYXNzO1xuICB2YXIgc291cmNlO1xuICBpZiAodGlsZWQpIHtcbiAgICBzb3VyY2UgPSBuZXcgb2wuc291cmNlLlRpbGVXTVMoc291cmNlT3B0aW9ucyk7XG4gICAgaW1hZ2VDbGFzcyA9IG9sLmxheWVyLlRpbGU7XG4gICAgLy9pbWFnZU9wdGlvbnMuZXh0ZW50ID0gWzExMzQ4NjcsMzg3MzAwMiwyNTA1OTY0LDU1OTY5NDRdO1xuICB9XG4gIGVsc2Uge1xuICAgIHNvdXJjZSA9IG5ldyBvbC5zb3VyY2UuSW1hZ2VXTVMoc291cmNlT3B0aW9ucylcbiAgICBpbWFnZUNsYXNzID0gb2wubGF5ZXIuSW1hZ2U7XG4gIH1cbiAgXG4gIGltYWdlT3B0aW9ucy5zb3VyY2UgPSBzb3VyY2U7XG4gIFxuICB2YXIgbGF5ZXIgPSBuZXcgaW1hZ2VDbGFzcyhpbWFnZU9wdGlvbnMpO1xuICBcbiAgcmV0dXJuIGxheWVyO1xufTtcblxuLypSYXN0ZXJMYXllcnMuVGlsZWRXTVNMYXllciA9IGZ1bmN0aW9uKGxheWVyT2JqKXtcbiAgdmFyIGxheWVyID0gbmV3IG9sLmxheWVyLlRpbGUoe1xuICAgIG5hbWU6IGxheWVyT2JqLm5hbWUsXG4gICAgb3BhY2l0eTogMS4wLFxuICAgIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5UaWxlV01TKHtcbiAgICAgIHVybDogbGF5ZXJPYmoudXJsLFxuICAgICAgcGFyYW1zOiB7XG4gICAgICAgIExBWUVSUzogbGF5ZXJPYmoubGF5ZXJzIHx8ICcnLFxuICAgICAgICBWRVJTSU9OOiAnMS4zLjAnLFxuICAgICAgICBUUkFOU1BBUkVOVDogdHJ1ZVxuICAgICAgfVxuICAgIH0pLFxuICAgIHZpc2libGU6IGxheWVyT2JqLnZpc2libGVcbiAgfSk7XG4gIFxuICByZXR1cm4gbGF5ZXI7XG59OyovXG5cbm1vZHVsZS5leHBvcnRzID0gUmFzdGVyTGF5ZXJzO1xuXG4iLCJCYXNlTGF5ZXJzID0gcmVxdWlyZSgnLi4vbGF5ZXJzL2Jhc2VzJyk7XG5cbnZhciBNYXBIZWxwZXJzID0ge1xuICBjcmVhdGVWaWV3ZXI6IGZ1bmN0aW9uKG9wdHMpe1xuICAgIHJldHVybiBuZXcgX1ZpZXdlcihvcHRzKTtcbiAgfVxufTtcblxudmFyIF9WaWV3ZXIgPSBmdW5jdGlvbihvcHRzKXtcbiAgdmFyIGNvbnRyb2xzID0gb2wuY29udHJvbC5kZWZhdWx0cyh7XG4gICAgYXR0cmlidXRpb25PcHRpb25zOiB7XG4gICAgICBjb2xsYXBzaWJsZTogZmFsc2VcbiAgICB9LFxuICAgIHpvb206IGZhbHNlLFxuICAgIGF0dHJpYnV0aW9uOiBmYWxzZVxuICB9KTsvLy5leHRlbmQoW25ldyBvbC5jb250cm9sLlpvb20oKV0pO1xuICBcbiAgdmFyIGludGVyYWN0aW9ucyA9IG9sLmludGVyYWN0aW9uLmRlZmF1bHRzKClcbiAgICAuZXh0ZW5kKFtcbiAgICAgIG5ldyBvbC5pbnRlcmFjdGlvbi5EcmFnUm90YXRlKClcbiAgICBdKTtcbiAgaW50ZXJhY3Rpb25zLnJlbW92ZUF0KDEpIC8vIHJpbXVvdm8gZG91Y2xpY2t6b29tXG4gIFxuICB2YXIgdmlldztcbiAgaWYgKG9wdHMudmlldyBpbnN0YW5jZW9mIG9sLlZpZXcpIHtcbiAgICB2aWV3ID0gb3B0cy52aWV3O1xuICB9XG4gIGVsc2Uge1xuICAgIHZpZXcgPSBuZXcgb2wuVmlldyhvcHRzLnZpZXcpO1xuICB9XG4gIHZhciBvcHRpb25zID0ge1xuICAgIGNvbnRyb2xzOiBjb250cm9scyxcbiAgICBpbnRlcmFjdGlvbnM6IGludGVyYWN0aW9ucyxcbiAgICBvbDNMb2dvOiBmYWxzZSxcbiAgICB2aWV3OiB2aWV3LFxuICAgIGtleWJvYXJkRXZlbnRUYXJnZXQ6IGRvY3VtZW50XG4gIH07XG4gIGlmIChvcHRzLmlkKXtcbiAgICBvcHRpb25zLnRhcmdldCA9IG9wdHMuaWQ7XG4gIH1cbiAgdmFyIG1hcCAgPSBuZXcgb2wuTWFwKG9wdGlvbnMpO1xuICB0aGlzLm1hcCA9IG1hcDtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuICBpZiAodGhpcy5tYXApIHtcbiAgICB0aGlzLm1hcC5kaXNwb3NlKCk7XG4gICAgdGhpcy5tYXAgPSBudWxsXG4gIH1cbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldFZpZXcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMubWFwLmdldFZpZXcoKTtcbn1cblxuX1ZpZXdlci5wcm90b3R5cGUudXBkYXRlTWFwID0gZnVuY3Rpb24obWFwT2JqZWN0KXt9O1xuXG5fVmlld2VyLnByb3RvdHlwZS51cGRhdGVWaWV3ID0gZnVuY3Rpb24oKXt9O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRNYXAgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5tYXA7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5zZXRUYXJnZXQgPSBmdW5jdGlvbihpZCl7XG4gIHRoaXMubWFwLnNldFRhcmdldChpZCk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nb1RvID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsIHpvb20pe1xuICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBhbmltYXRlID0gb3B0aW9ucy5hbmltYXRlIHx8IHRydWU7XG4gIHZhciB2aWV3ID0gdGhpcy5tYXAuZ2V0VmlldygpO1xuICBcbiAgaWYgKGFuaW1hdGUpIHtcbiAgICB2YXIgcGFuID0gb2wuYW5pbWF0aW9uLnBhbih7XG4gICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgc291cmNlOiB2aWV3LmdldENlbnRlcigpXG4gICAgfSk7XG4gICAgdmFyIHpvb20gPSBvbC5hbmltYXRpb24uem9vbSh7XG4gICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgcmVzb2x1dGlvbjogdmlldy5nZXRSZXNvbHV0aW9uKClcbiAgICB9KTtcbiAgICB0aGlzLm1hcC5iZWZvcmVSZW5kZXIocGFuLHpvb20pO1xuICB9XG4gIFxuICB2aWV3LnNldENlbnRlcihjb29yZGluYXRlcyk7XG4gIHZpZXcuc2V0Wm9vbSh6b29tKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdvVG9SZXMgPSBmdW5jdGlvbihjb29yZGluYXRlcywgcmVzb2x1dGlvbil7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGFuaW1hdGUgPSBvcHRpb25zLmFuaW1hdGUgfHwgdHJ1ZTtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIFxuICBpZiAoYW5pbWF0ZSkge1xuICAgIHZhciBwYW4gPSBvbC5hbmltYXRpb24ucGFuKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICBzb3VyY2U6IHZpZXcuZ2V0Q2VudGVyKClcbiAgICB9KTtcbiAgICB2YXIgem9vbSA9IG9sLmFuaW1hdGlvbi56b29tKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICByZXNvbHV0aW9uOiB2aWV3LmdldFJlc29sdXRpb24oKVxuICAgIH0pO1xuICAgIHRoaXMubWFwLmJlZm9yZVJlbmRlcihwYW4sem9vbSk7XG4gIH1cblxuICB2aWV3LnNldENlbnRlcihjb29yZGluYXRlcyk7XG4gIHZpZXcuc2V0UmVzb2x1dGlvbihyZXNvbHV0aW9uKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmZpdCA9IGZ1bmN0aW9uKGdlb21ldHJ5LCBvcHRpb25zKXtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIFxuICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBhbmltYXRlID0gb3B0aW9ucy5hbmltYXRlIHx8IHRydWU7XG4gIFxuICBpZiAoYW5pbWF0ZSkge1xuICAgIHZhciBwYW4gPSBvbC5hbmltYXRpb24ucGFuKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICBzb3VyY2U6IHZpZXcuZ2V0Q2VudGVyKClcbiAgICB9KTtcbiAgICB2YXIgem9vbSA9IG9sLmFuaW1hdGlvbi56b29tKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICByZXNvbHV0aW9uOiB2aWV3LmdldFJlc29sdXRpb24oKVxuICAgIH0pO1xuICAgIHRoaXMubWFwLmJlZm9yZVJlbmRlcihwYW4sem9vbSk7XG4gIH1cbiAgXG4gIGlmIChvcHRpb25zLmFuaW1hdGUpIHtcbiAgICBkZWxldGUgb3B0aW9ucy5hbmltYXRlOyAvLyBub24gbG8gcGFzc28gYWwgbWV0b2RvIGRpIE9MMyBwZXJjaMOpIMOoIHVuJ29wemlvbmUgaW50ZXJuYVxuICB9XG4gIG9wdGlvbnMuY29uc3RyYWluUmVzb2x1dGlvbiA9IG9wdGlvbnMuY29uc3RyYWluUmVzb2x1dGlvbiB8fCBmYWxzZTtcbiAgXG4gIHZpZXcuZml0KGdlb21ldHJ5LHRoaXMubWFwLmdldFNpemUoKSxvcHRpb25zKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldFpvb20gPSBmdW5jdGlvbigpe1xuICB2YXIgdmlldyA9IHRoaXMubWFwLmdldFZpZXcoKTtcbiAgcmV0dXJuIHZpZXcuZ2V0Wm9vbSgpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0UmVzb2x1dGlvbiA9IGZ1bmN0aW9uKCl7XG4gIHZhciB2aWV3ID0gdGhpcy5tYXAuZ2V0VmlldygpO1xuICByZXR1cm4gdmlldy5nZXRSZXNvbHV0aW9uKCk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRDZW50ZXIgPSBmdW5jdGlvbigpe1xuICB2YXIgdmlldyA9IHRoaXMubWFwLmdldFZpZXcoKTtcbiAgcmV0dXJuIHZpZXcuZ2V0Q2VudGVyKCk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRCQk9YID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMubWFwLmdldFZpZXcoKS5jYWxjdWxhdGVFeHRlbnQodGhpcy5tYXAuZ2V0U2l6ZSgpKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldExheWVyQnlOYW1lID0gZnVuY3Rpb24obGF5ZXJOYW1lKSB7XG4gIHZhciBsYXllcnMgPSB0aGlzLm1hcC5nZXRMYXllcnMoKTtcbiAgdmFyIGxlbmd0aCA9IGxheWVycy5nZXRMZW5ndGgoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChsYXllck5hbWUgPT09IGxheWVycy5pdGVtKGkpLmdldCgnbmFtZScpKSB7XG4gICAgICByZXR1cm4gbGF5ZXJzLml0ZW0oaSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUucmVtb3ZlTGF5ZXJCeU5hbWUgPSBmdW5jdGlvbihsYXllck5hbWUpe1xuICB2YXIgbGF5ZXIgPSB0aGlzLmdldExheWVyQnlOYW1lKGxheWVyTmFtZSk7XG4gIGlmIChsYXllcil7XG4gICAgdGhpcy5tYXAucmVtb3ZlTGF5ZXIobGF5ZXIpO1xuICAgIGRlbGV0ZSBsYXllcjtcbiAgfVxufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0QWN0aXZlTGF5ZXJzID0gZnVuY3Rpb24oKXtcbiAgdmFyIGFjdGl2ZWxheWVycyA9IFtdO1xuICB0aGlzLm1hcC5nZXRMYXllcnMoKS5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgdmFyIHByb3BzID0gbGF5ZXIuZ2V0UHJvcGVydGllcygpO1xuICAgIGlmIChwcm9wcy5iYXNlbWFwICE9IHRydWUgJiYgcHJvcHMudmlzaWJsZSl7XG4gICAgICAgYWN0aXZlbGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgIH1cbiAgfSk7XG4gIFxuICByZXR1cm4gYWN0aXZlbGF5ZXJzO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUucmVtb3ZlTGF5ZXJzID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5tYXAuZ2V0TGF5ZXJzKCkuY2xlYXIoKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldExheWVyc05vQmFzZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBsYXllcnMgPSBbXTtcbiAgdGhpcy5tYXAuZ2V0TGF5ZXJzKCkuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgIHZhciBwcm9wcyA9IGxheWVyLmdldFByb3BlcnRpZXMoKTtcbiAgICBpZiAocHJvcHMuYmFzZW1hcCAhPSB0cnVlKXtcbiAgICAgIGxheWVycy5wdXNoKGxheWVyKTtcbiAgICB9XG4gIH0pO1xuICBcbiAgcmV0dXJuIGxheWVycztcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmFkZEJhc2VMYXllciA9IGZ1bmN0aW9uKHR5cGUpe1xuICB2YXIgbGF5ZXI7XG4gIHR5cGUgPyBsYXllciA9IEJhc2VMYXllcnNbdHlwZV06ICBsYXllciA9IEJhc2VMYXllcnMuQklORy5BZXJpYWw7XG4gIHRoaXMubWFwLmFkZExheWVyKGxheWVyKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmNoYW5nZUJhc2VMYXllciA9IGZ1bmN0aW9uKGxheWVyTmFtZSl7XG4gIHZhciBiYXNlTGF5ZXIgPSB0aGlzLmdldExheWVyQnlOYW1lKGxheWVybmFtZSk7XG4gIHZhciBsYXllcnMgPSB0aGlzLm1hcC5nZXRMYXllcnMoKTtcbiAgbGF5ZXJzLmluc2VydEF0KDAsIGJhc2VMYXllcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcEhlbHBlcnM7XG4iLCJ2YXIgdXRpbHMgPSB7XG4gIG1lcmdlOiBmdW5jdGlvbihvYmoxLG9iajIpe1xuICAgIHZhciBvYmozID0ge307XG4gICAgZm9yICh2YXIgYXR0cm5hbWUgaW4gb2JqMSkgeyBvYmozW2F0dHJuYW1lXSA9IG9iajFbYXR0cm5hbWVdOyB9XG4gICAgZm9yICh2YXIgYXR0cm5hbWUgaW4gb2JqMikgeyBvYmozW2F0dHJuYW1lXSA9IG9iajJbYXR0cm5hbWVdOyB9XG4gICAgcmV0dXJuIG9iajM7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxudmFyIENvbXBvbmVudCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLmlkID0gb3B0aW9ucy5pZCB8fCBNYXRoLnJhbmRvbSgpICogMTAwMDtcbiAgdGhpcy50aXRsZSA9IG9wdGlvbnMudGl0bGUgfHwgJyc7XG4gIHRoaXMuaW50ZXJuYWxDb21wb25lbnQgPSBudWxsO1xufTtcbmluaGVyaXQoQ29tcG9uZW50LEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IENvbXBvbmVudC5wcm90b3R5cGU7XG5cbnByb3RvLmdldElkID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHNlbGYuaWQ7XG59O1xuXG5wcm90by5nZXROYW1lID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBzZWxmLm5hbWU7XG59O1xuXG5wcm90by5nZXRUaXRsZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBzZWxmLnRpdGxlO1xufTtcblxuLyogSE9PS1MgKi9cblxuLyogXG4gKiBJbCBtZXRvZG8gcGVybWV0dGUgYWwgY29tcG9uZW50ZSBkaSBtb250YXJzaSBuZWwgRE9NXG4gKiBwYXJlbnRFbDogZWxlbWVudG8gRE9NIHBhZHJlLCBzdSBjdWkgaW5zZXJpcnNpOyBcbiAqIHJpdG9ybmEgdW5hIHByb21pc2UsIHJpc29sdGEgbmVsIG1vbWVudG8gaW4gY3VpIHNhcsOgIHRlcm1pbmF0byBpbCBtb250YWdnaW9cbiovXG5wcm90by5tb3VudCA9IGZ1bmN0aW9uKHBhcmVudCl7fTtcblxuLypcbiAqIE1ldG9kbyByaWNoaWFtYXRvIHF1YW5kbyBzaSB2dW9sZSByaW11b3ZlcmUgaWwgY29tcG9uZW50ZS5cbiAqIFJpdG9ybmEgdW5hIHByb21lc3NhIGNoZSBzYXLDoCByaXNvbHRhIG5lbCBtb21lbnRvIGluIGN1aSBpbCBjb21wb25lbnRlIGF2csOgIGNvbXBsZXRhdG8gbGEgcHJvcHJpYSByaW1vemlvbmUgKGVkIGV2ZW50dWFsZSByaWxhc2NpbyBkaSByaXNvcnNlIGRpcGVuZGVudGkpXG4qL1xucHJvdG8udW5tb3VudCA9IGZ1bmN0aW9uKCl7fTtcblxuLyogXG4gKiBNZXRvZG8gKG9wemlvbmFsZSkgY2hlIG9mZnJlIGwnb3Bwb3J0dW5pdMOgIGRpIHJpY2FsY29sYXJlIHByb3ByaWV0w6AgZGlwZW5kZW50aSBkYWxsZSBkaW1lbnNpb25pIGRlbCBwYWRyZVxuICogcGFyZW50SGVpZ2h0OiBudW92YSBhbHRlenphIGRlbCBwYXJlbnRcbiAqIHBhcmVudFdpZHRoOiBudW92YSBsYXJnaGV6emEgZGVsIHBhcmVudFxuICogcmljaGlhbWF0byBvZ25pIHZvbHRhIGNoZSBpbCBwYXJlbnQgc3ViaXNjZSB1biByaWRpbWVuc2lvbmFtZW50b1xuKi9cbnByb3RvLm9uUmVzaXplID0gZnVuY3Rpb24ocGFyZW50V2lkdGgscGFyZW50SGVpZ2h0KXt9O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50O1xuIiwidmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcblxuZnVuY3Rpb24gQ29tcG9uZW50c1JlZ2lzdHJ5KCkge1xuICB0aGlzLmNvbXBvbmVudHMgPSB7fTtcbiAgXG4gIHRoaXMuYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgdmFyIGlkID0gY29tcG9uZW50LmdldElkKCk7XG4gICAgaWYgKCF0aGlzLmNvbXBvbmVudHNbaWRdKSB7XG4gICAgICB0aGlzLmNvbXBvbmVudHNbaWRdID0gY29tcG9uZW50O1xuICAgIH1cbiAgfTsgXG4gIFxuICB0aGlzLmdldENvbXBvbmVudCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcG9uZW50c1tpZF07XG4gIH07XG4gIFxuICB0aGlzLnJlbW92ZUNvbXBvbmVudCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIGNvbXBvbmVudCA9IHRoaXMuX2NvbXBvbmVudHNbaWRdO1xuICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oY29tcG9uZW50LmRlc3Ryb3kpKSB7XG4gICAgICAgIGNvbXBvbmVudC5kZXN0cm95KCk7XG4gICAgICB9XG4gICAgICBkZWxldGUgY29tcG9uZW50O1xuICAgICAgdGhpcy5fY29tcG9uZW50c1tpZF0gPSBudWxsO1xuICAgIH1cbiAgfTtcbn1cbmluaGVyaXQoQ29tcG9uZW50c1JlZ2lzdHJ5LEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IENvbXBvbmVudHNSZWdpc3RyeTtcbiIsIm5vb3AgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykubm9vcDtcbnZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBDb21wb25lbnRzUmVnaXN0cnkgPSByZXF1aXJlKCdndWkvY29tcG9uZW50c3JlZ2lzdHJ5Jyk7XG5cbi8vIHJhcHByZXNlbnRhIGwnaW50ZXJmYWNjaWEgZ2xvYmFsZSBkZWxsJ0FQSSBkZWxsYSBHVUkuIFxuLy8gbWV0b2RpIGRldm9ubyBlc3NlcmUgaW1wbGVtZW50YXRpIChkZWZpbml0aSkgZGFsbCdhcHBsaWNhemlvbmUgb3NwaXRlXG4vLyBsJ2FwcCBvc3BpdGUgZG92cmViYmUgY2hpYW1hcmUgYW5jaGUgbGEgZnVuemlvbmUgR1VJLnJlYWR5KCkgcXVhbmRvIGxhIFVJIMOoIHByb250YVxuZnVuY3Rpb24gR1VJKCl7XG4gIC8vIHVybCBkZWxsZSByaXNvcnNlIChpbW1hZ2luaSwgZWNjLilcbiAgdGhpcy5nZXRSZXNvdXJjZXNVcmwgPSBub29wO1xuICAvLyBzaG93IGEgVnVlIGZvcm1cbiAgdGhpcy5zaG93Rm9ybSA9IG5vb3A7XG4gIHRoaXMuY2xvc2VGb3JtID0gbm9vcDtcbiAgXG4gIC8vIG1vc3RyYSB1bmEgbGlzdGEgZGkgb2dnZXR0aSAoZXMuIGxpc3RhIGRpIHJpc3VsdGF0aSlcbiAgdGhpcy5zaG93TGlzdGluZyA9IG5vb3A7XG4gIHRoaXMuY2xvc2VMaXN0aW5nID0gbm9vcDtcbiAgdGhpcy5oaWRlTGlzdGluZyA9IG5vb3A7XG5cbiAgLyogcGFuZWwgKi9cbiAgdGhpcy5zaG93UGFuZWwgPSBub29wO1xuICB0aGlzLmhpZGVQYW5lbCA9IG5vb3A7XG5cbiAgLy9tZXRvZGkgY29tcG9uZW50ZVxuICB0aGlzLmFkZENvbXBvbmVudCA9IG5vb3A7XG4gIHRoaXMucmVtb3ZlQ29tcG9uZW50ID0gbm9vcDtcbiAgdGhpcy5nZXRDb21wb25lbnQgPSBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiBDb21wb25lbnRzUmVnaXN0cnkuZ2V0Q29tcG9uZW50KGlkKTtcbiAgfTtcbiAgLy9maW5lIG1ldG9kaSBjb21wb25lbnRlXG5cbiAgdGhpcy5yZWFkeSA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lbWl0KCdndWlyZWFkeScpO1xuICB9O1xuICBcbiAgdGhpcy5ndWlSZXNpemVkID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmVtaXQoJ2d1aXJlc2l6ZWQnKTtcbiAgfTtcblxuICAvKiBzcGlubmVyICovXG4gIHRoaXMuc2hvd1NwaW5uZXIgPSBub29wOyAvLyBwZXIgbW9zdHJhcmUgdW4naWNvbmEgc3Bpbm5lciBjaGUgbm90aWZpY2EgdW4gY2FyaWNhbWVudG8gZGF0aSBpbiBjb3Jzb1xuICB0aGlzLmhpZGVTcGlubmVyID0gbm9vcDtcbiAgXG4gIHRoaXMubm90aWZ5ID0gbm9vcDtcbiAgdGhpcy5kaWFsb2cgPSBub29wO1xufVxuXG5pbmhlcml0KEdVSSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBHVUk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdj5cXG4gIExpc3RhIGRpIG9nZ2V0dGlcXG48L2Rpdj5cXG5cIjtcbiIsInZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgcmVqZWN0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlamVjdDtcbnZhciBHVUkgPSByZXF1aXJlKCdndWkvZ3VpJyk7XG52YXIgTWFwU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvbWFwL21hcHNlcnZpY2UnKTtcblxudmFyIExpc3RQYW5lbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9saXN0cGFuZWwuaHRtbCcpLFxuICBtZXRob2RzOiB7XG4gICAgZXhlYzogZnVuY3Rpb24oY2JrKXtcbiAgICAgIHZhciByZWxhdGlvbnMgPSB0aGlzLnN0YXRlLnJlbGF0aW9ucyB8fCBudWxsO1xuICAgICAgY2JrKHRoaXMuc3RhdGUuZmllbGRzLHJlbGF0aW9ucyk7XG4gICAgICBHVUkuY2xvc2VGb3JtKCk7XG4gICAgfVxuICB9XG59KTtcblxuXG5mdW5jdGlvbiBMaXN0UGFuZWwob3B0aW9ucyl7XG4gIC8vIHByb3ByaWV0w6AgbmVjZXNzYXJpZS4gSW4gZnV0dXJvIGxlIG1ldHRlcm1vIGluIHVuYSBjbGFzc2UgUGFuZWwgZGEgY3VpIGRlcml2ZXJhbm5vIHR1dHRpIGkgcGFubmVsbGkgY2hlIHZvZ2xpb25vIGVzc2VyZSBtb3N0cmF0aSBuZWxsYSBzaWRlYmFyXG4gIHRoaXMucGFuZWxDb21wb25lbnQgPSBudWxsO1xuICB0aGlzLm9wdGlvbnMgPSAgb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5pZCA9IG9wdGlvbnMuaWQgfHwgbnVsbDsgLy8gaWQgZGVsIGZvcm1cbiAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lIHx8IG51bGw7IC8vIG5vbWUgZGVsIGZvcm1cbiAgXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgbGlzdDogb3B0aW9ucy5saXN0IHx8IFtdXG4gIH1cbiAgXG4gIHRoaXMuX2xpc3RQYW5lbENvbXBvbmVudCA9IG9wdGlvbnMubGlzdFBhbmVsQ29tcG9uZW50IHx8IExpc3RQYW5lbENvbXBvbmVudDtcbn1cblxudmFyIHByb3RvID0gTGlzdFBhbmVsLnByb3RvdHlwZTtcblxuLy8gdmllbmUgcmljaGlhbWF0byBkYWxsYSB0b29sYmFyIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlIHVuIHByb3ByaW8gcGFubmVsbG8gbmVsbGEgR1VJIChHVUkuc2hvd1BhbmVsKVxucHJvdG8ub25TaG93ID0gZnVuY3Rpb24oY29udGFpbmVyKXtcbiAgdmFyIHBhbmVsID0gdGhpcy5fc2V0dXBQYW5lbCgpO1xuICB0aGlzLl9tb3VudFBhbmVsKHBhbmVsLGNvbnRhaW5lcik7XG4gIHJldHVybiByZXNvbHZlKHRydWUpO1xufTtcblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5wcm90by5vbkNsb3NlID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5wYW5lbENvbXBvbmVudC4kZGVzdHJveSh0cnVlKTtcbiAgdGhpcy5wYW5lbENvbXBvbmVudCA9IG51bGw7XG4gIHJldHVybiByZXNvbHZlKHRydWUpO1xufTtcblxucHJvdG8uX3NldHVwUGFuZWwgPSBmdW5jdGlvbigpe1xuICB2YXIgcGFuZWwgPSB0aGlzLnBhbmVsQ29tcG9uZW50ID0gbmV3IHRoaXMuX2xpc3RQYW5lbENvbXBvbmVudCh7XG4gICAgcGFuZWw6IHRoaXNcbiAgfSk7XG4gIHBhbmVsLnN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgcmV0dXJuIHBhbmVsXG59O1xuXG5wcm90by5fbW91bnRQYW5lbCA9IGZ1bmN0aW9uKHBhbmVsLGNvbnRhaW5lcil7XG4gIHBhbmVsLiRtb3VudCgpLiRhcHBlbmRUbyhjb250YWluZXIpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIExpc3RQYW5lbENvbXBvbmVudDogTGlzdFBhbmVsQ29tcG9uZW50LFxuICBMaXN0UGFuZWw6IExpc3RQYW5lbFxufVxuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBHVUkgPSByZXF1aXJlKCdndWkvZ3VpJyk7XG52YXIgQXBwbGljYXRpb25TZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9hcHBsaWNhdGlvbnNlcnZpY2UnKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcbnZhciBQcm9qZWN0VHlwZXMgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHR5cGVzJyk7XG52YXIgR2VvbWV0cnlUeXBlcyA9IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbWV0cnknKS5HZW9tZXRyeVR5cGVzO1xudmFyIG9sM2hlbHBlcnMgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9nM3cub2wzJykuaGVscGVycztcbnZhciBSZXNldENvbnRyb2wgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9jb250cm9scy9yZXNldGNvbnRyb2wnKTtcbnZhciBRdWVyeUNvbnRyb2wgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9jb250cm9scy9xdWVyeWNvbnRyb2wnKTtcbnZhciBab29tQm94Q29udHJvbCA9IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2NvbnRyb2xzL3pvb21ib3hjb250cm9sJyk7XG52YXIgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24gPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9pbnRlcmFjdGlvbnMvcGlja2Nvb3JkaW5hdGVzaW50ZXJhY3Rpb24nKTtcbnZhciBXTVNMYXllciA9IHJlcXVpcmUoJ2NvcmUvbGF5ZXIvd21zbGF5ZXInKTtcbnZhciBNYXBRdWVyeVNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL21hcC9tYXBxdWVyeXNlcnZpY2UnKTtcblxuLy92YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpOyAvLyBRVUVTVE8gTk9OIENJIERFVkUgRVNTRVJFISEhXG5cbnZhciBQaWNrVG9sZXJhbmNlUGFyYW1zID0ge307XG5QaWNrVG9sZXJhbmNlUGFyYW1zW1Byb2plY3RUeXBlcy5RREpBTkdPXSA9IHt9O1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT11bR2VvbWV0cnlUeXBlcy5QT0lOVF0gPSBcIkZJX1BPSU5UX1RPTEVSQU5DRVwiO1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT11bR2VvbWV0cnlUeXBlcy5MSU5FU1RSSU5HXSA9IFwiRklfTElORV9UT0xFUkFOQ0VcIjtcblBpY2tUb2xlcmFuY2VQYXJhbXNbUHJvamVjdFR5cGVzLlFESkFOR09dW0dlb21ldHJ5VHlwZXMuUE9MWUdPTl0gPSBcIkZJX1BPTFlHT05fVE9MRVJBTkNFXCI7XG5cbnZhciBQaWNrVG9sZXJhbmNlVmFsdWVzID0ge31cblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5QT0lOVF0gPSA1O1xuUGlja1RvbGVyYW5jZVZhbHVlc1tHZW9tZXRyeVR5cGVzLkxJTkVTVFJJTkddID0gNTtcblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5QT0xZR09OXSA9IDU7XG5cbmZ1bmN0aW9uIE1hcFNlcnZpY2UocHJvamVjdCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWc7XG4gIHRoaXMudmlld2VyO1xuICB0aGlzLm1hcExheWVycyA9IHt9O1xuICB0aGlzLm1hcEJhc2VMYXllcnMgPSB7fTtcbiAgdGhpcy5sYXllcnNBc3NvY2lhdGlvbiA9IHt9O1xuICB0aGlzLmxheWVyc0V4dHJhUGFyYW1zID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgICBiYm94OiBbXSxcbiAgICAgIHJlc29sdXRpb246IG51bGwsXG4gICAgICBjZW50ZXI6IG51bGwsXG4gICAgICBsb2FkaW5nOiBmYWxzZVxuICB9O1xuICB0aGlzLmNvbmZpZyA9IEFwcGxpY2F0aW9uU2VydmljZS5nZXRDb25maWcoKS5tYXA7XG4gIFxuICB0aGlzLl9ob3dNYW55QXJlTG9hZGluZyA9IDA7XG4gIHRoaXMuX2luY3JlbWVudExvYWRlcnMgPSBmdW5jdGlvbigpe1xuICAgIGlmICh0aGlzLl9ob3dNYW55QXJlTG9hZGluZyA9PSAwKXtcbiAgICAgIHRoaXMuZW1pdCgnbG9hZHN0YXJ0Jyk7XG4gICAgfVxuICAgIHRoaXMuX2hvd01hbnlBcmVMb2FkaW5nICs9IDE7XG4gIH07XG4gIFxuICB0aGlzLl9kZWNyZW1lbnRMb2FkZXJzID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9ob3dNYW55QXJlTG9hZGluZyAtPSAxO1xuICAgIGlmICh0aGlzLl9ob3dNYW55QXJlTG9hZGluZyA9PSAwKXtcbiAgICAgIHRoaXMuZW1pdCgnbG9hZGVuZCcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrID0gW107XG4gIFxuICBpZighXy5pc05pbChwcm9qZWN0KSkge1xuICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhpcy5wcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICB9XG4gIFxuICBcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIHNldE1hcFZpZXc6IGZ1bmN0aW9uKGJib3gscmVzb2x1dGlvbixjZW50ZXIpe1xuICAgICAgdGhpcy5zdGF0ZS5iYm94ID0gYmJveDtcbiAgICAgIHRoaXMuc3RhdGUucmVzb2x1dGlvbiA9IHJlc29sdXRpb247XG4gICAgICB0aGlzLnN0YXRlLmNlbnRlciA9IGNlbnRlcjtcbiAgICAgIHRoaXMudXBkYXRlTWFwTGF5ZXJzKHRoaXMubWFwTGF5ZXJzKTtcbiAgICB9LFxuICAgIHNldHVwVmlld2VyOiBmdW5jdGlvbigpe1xuICAgICAgLy8kc2NyaXB0KFwiaHR0cDovL2Vwc2cuaW8vXCIrUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC5jcnMrXCIuanNcIik7XG4gICAgICBwcm9qNC5kZWZzKFwiRVBTRzpcIitzZWxmLnByb2plY3Quc3RhdGUuY3JzLHRoaXMucHJvamVjdC5zdGF0ZS5wcm9qNCk7XG4gICAgICBpZiAoc2VsZi52aWV3ZXIpIHtcbiAgICAgICAgc2VsZi52aWV3ZXIuZGVzdHJveSgpO1xuICAgICAgICBzZWxmLnZpZXdlciA9IG51bGw7XG4gICAgICB9XG4gICAgICBzZWxmLl9zZXR1cFZpZXdlcigpO1xuICAgICAgc2VsZi5zZXR1cENvbnRyb2xzKCk7XG4gICAgICBzZWxmLnNldHVwTGF5ZXJzKCk7XG4gICAgICBzZWxmLmVtaXQoJ3ZpZXdlcnNldCcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwVmlld2VyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZXh0ZW50ID0gdGhpcy5wcm9qZWN0LnN0YXRlLmV4dGVudDtcbiAgICB2YXIgcHJvamVjdGlvbiA9IG5ldyBvbC5wcm9qLlByb2plY3Rpb24oe1xuICAgICAgY29kZTogXCJFUFNHOlwiK3RoaXMucHJvamVjdC5zdGF0ZS5jcnMsXG4gICAgICBleHRlbnQ6IGV4dGVudFxuICAgIH0pO1xuICAgIFxuICAgIC8qdmFyIGNvbnN0cmFpbl9leHRlbnQ7XG4gICAgaWYgKHRoaXMuY29uZmlnLmNvbnN0cmFpbnRleHRlbnQpIHtcbiAgICAgIHZhciBleHRlbnQgPSB0aGlzLmNvbmZpZy5jb25zdHJhaW50ZXh0ZW50O1xuICAgICAgdmFyIGR4ID0gZXh0ZW50WzJdLWV4dGVudFswXTtcbiAgICAgIHZhciBkeSA9IGV4dGVudFszXS1leHRlbnRbMV07XG4gICAgICB2YXIgZHg0ID0gZHgvNDtcbiAgICAgIHZhciBkeTQgPSBkeS80O1xuICAgICAgdmFyIGJib3hfeG1pbiA9IGV4dGVudFswXSArIGR4NDtcbiAgICAgIHZhciBiYm94X3htYXggPSBleHRlbnRbMl0gLSBkeDQ7XG4gICAgICB2YXIgYmJveF95bWluID0gZXh0ZW50WzFdICsgZHk0O1xuICAgICAgdmFyIGJib3hfeW1heCA9IGV4dGVudFszXSAtIGR5NDtcbiAgICAgIFxuICAgICAgY29uc3RyYWluX2V4dGVudCA9IFtiYm94X3htaW4sYmJveF95bWluLGJib3hfeG1heCxiYm94X3ltYXhdO1xuICAgIH0qL1xuICAgIFxuICAgIHRoaXMudmlld2VyID0gb2wzaGVscGVycy5jcmVhdGVWaWV3ZXIoe1xuICAgICAgdmlldzoge1xuICAgICAgICBwcm9qZWN0aW9uOiBwcm9qZWN0aW9uLFxuICAgICAgICAvKmNlbnRlcjogdGhpcy5jb25maWcuaW5pdGNlbnRlciB8fCBvbC5leHRlbnQuZ2V0Q2VudGVyKGV4dGVudCksXG4gICAgICAgIHpvb206IHRoaXMuY29uZmlnLmluaXR6b29tIHx8IDAsXG4gICAgICAgIGV4dGVudDogdGhpcy5jb25maWcuY29uc3RyYWludGV4dGVudCB8fCBleHRlbnQsXG4gICAgICAgIG1pblpvb206IHRoaXMuY29uZmlnLm1pbnpvb20gfHwgMCwgLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wXG4gICAgICAgIG1heFpvb206IHRoaXMuY29uZmlnLm1heHpvb20gfHwgMjggLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wKi9cbiAgICAgICAgY2VudGVyOiBvbC5leHRlbnQuZ2V0Q2VudGVyKGV4dGVudCksXG4gICAgICAgIHpvb206IDAsXG4gICAgICAgIGV4dGVudDogZXh0ZW50LFxuICAgICAgICBtaW5ab29tOiAwLCAvLyBkZWZhdWx0IGRpIE9MMyAzLjE2LjBcbiAgICAgICAgbWF4Wm9vbTogMjggLy8gZGVmYXVsdCBkaSBPTDMgMy4xNi4wXG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy52aWV3ZXIubWFwLm9uKCdtb3ZlZW5kJyxmdW5jdGlvbihlKXtcbiAgICAgIHNlbGYuX3NldE1hcFZpZXcoKTtcbiAgICB9KTtcbiAgICBcbiAgICBNYXBRdWVyeVNlcnZpY2UuaW5pdCh0aGlzLnZpZXdlci5tYXApO1xuICAgIFxuICAgIHRoaXMuZW1pdCgncmVhZHknKTtcbiAgfTtcbiAgXG4gIHRoaXMucHJvamVjdC5vbigncHJvamVjdHNldCcsZnVuY3Rpb24oKXtcbiAgICBzZWxmLnNldHVwVmlld2VyKCk7XG4gIH0pO1xuICBcbiAgdGhpcy5wcm9qZWN0Lm9uKCdwcm9qZWN0c3dpdGNoJyxmdW5jdGlvbigpe1xuICAgIHNlbGYuc2V0dXBMYXllcnMoKTtcbiAgfSk7XG4gIFxuICB0aGlzLnByb2plY3Qub25hZnRlcignc2V0TGF5ZXJzVmlzaWJsZScsZnVuY3Rpb24obGF5ZXJzKXtcbiAgICB2YXIgbWFwTGF5ZXJzID0gXy5tYXAobGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIHJldHVybiBzZWxmLmdldE1hcExheWVyRm9yTGF5ZXIobGF5ZXIpO1xuICAgIH0pXG4gICAgc2VsZi51cGRhdGVNYXBMYXllcnMobWFwTGF5ZXJzKTtcbiAgfSk7XG4gIFxuICB0aGlzLnByb2plY3Qub25hZnRlcignc2V0QmFzZUxheWVyJyxmdW5jdGlvbigpe1xuICAgIHNlbGYudXBkYXRlTWFwTGF5ZXJzKHNlbGYubWFwQmFzZUxheWVycyk7XG4gIH0pO1xuICBcbiAgYmFzZSh0aGlzKTtcbiAgXG4gIHRoaXMuc2V0dXBWaWV3ZXIoKTtcbn07XG5cbmluaGVyaXQoTWFwU2VydmljZSxHM1dPYmplY3QpO1xuXG52YXIgcHJvdG8gPSBNYXBTZXJ2aWNlLnByb3RvdHlwZTtcblxuLy8gcmVuZGUgcXVlc3RvIG1hcHNlcnZpY2Ugc2xhdmUgZGkgdW4gYWx0cm8gTWFwU2VydmljZVxucHJvdG8uc2xhdmVPZiA9IGZ1bmN0aW9uKG1hcFNlcnZpY2UsIHNhbWVMYXllcnMpe1xuICAvLyBzZSBpbXBvc3RhcmUgaSBsYXllciBpbml6aWFsaSB1Z3VhbGkgYSBxdWVsbGkgZGVsIG1hcFNlcnZpY2UgbWFzdGVyXG4gIHZhciBzYW1lTGF5ZXJzID0gc2FtZUxheWVycyB8fCBmYWxzZTtcbn07XG5cbnByb3RvLnNldExheWVyc0V4dHJhUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zLHVwZGF0ZSl7XG4gIHRoaXMubGF5ZXJzRXh0cmFQYXJhbXMgPSBfLmFzc2lnbih0aGlzLmxheWVyc0V4dHJhUGFyYW1zLHBhcmFtcyk7XG4gIHRoaXMuZW1pdCgnZXh0cmFQYXJhbXNTZXQnLHBhcmFtcyx1cGRhdGUpO1xufTtcblxucHJvdG8uZ2V0TWFwID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnZpZXdlci5tYXA7XG59O1xuXG5wcm90by5nZXRWaWV3ZXJFbGVtZW50ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMudmlld2VyLm1hcC5nZXRUYXJnZXRFbGVtZW50KCk7XG59O1xuXG5wcm90by5nZXRWaWV3cG9ydCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLnZpZXdlci5tYXAuZ2V0Vmlld3BvcnQoKTtcbn07XG5cbnByb3RvLnNldHVwQ29udHJvbHMgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBtYXAgPSBzZWxmLnZpZXdlci5tYXA7XG4gIGlmICh0aGlzLmNvbmZpZyAmJiB0aGlzLmNvbmZpZy5jb250cm9scykge1xuICAgIF8uZm9yRWFjaCh0aGlzLmNvbmZpZy5jb250cm9scyxmdW5jdGlvbihjb250cm9sVHlwZSl7XG4gICAgICB2YXIgY29udHJvbDtcbiAgICAgIHN3aXRjaCAoY29udHJvbFR5cGUpIHtcbiAgICAgICAgY2FzZSAncmVzZXQnOlxuICAgICAgICAgIGlmICghaXNNb2JpbGUuYW55KSB7XG4gICAgICAgICAgICBjb250cm9sID0gbmV3IFJlc2V0Q29udHJvbCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnem9vbSc6XG4gICAgICAgICAgY29udHJvbCA9IG5ldyBvbC5jb250cm9sLlpvb20oe1xuICAgICAgICAgICAgem9vbUluTGFiZWw6IFwiXFx1ZTk4YVwiLFxuICAgICAgICAgICAgem9vbU91dExhYmVsOiBcIlxcdWU5OGJcIlxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd6b29tYm94JzogXG4gICAgICAgICAgaWYgKCFpc01vYmlsZS5hbnkpIHtcbiAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgWm9vbUJveENvbnRyb2woKTtcbiAgICAgICAgICAgIGNvbnRyb2wub24oJ3pvb21lbmQnLGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICBzZWxmLnZpZXdlci5maXQoZS5leHRlbnQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3pvb210b2V4dGVudCc6XG4gICAgICAgICAgY29udHJvbCA9IG5ldyBvbC5jb250cm9sLlpvb21Ub0V4dGVudCh7XG4gICAgICAgICAgICBsYWJlbDogIFwiXFx1ZTk4Y1wiLFxuICAgICAgICAgICAgZXh0ZW50OiBzZWxmLmNvbmZpZy5jb25zdHJhaW50ZXh0ZW50XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3F1ZXJ5JzpcbiAgICAgICAgICBjb250cm9sID0gbmV3IFF1ZXJ5Q29udHJvbCgpO1xuICAgICAgICAgIGNvbnRyb2wub24oJ3BpY2tlZCcsZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICB2YXIgY29vcmRpbmF0ZXMgPSBlLmNvb3JkaW5hdGVzO1xuXG4gICAgICAgICAgICBNYXBRdWVyeVNlcnZpY2UucXVlcnlQb2ludChjb29yZGluYXRlcyxzZWxmLm1hcExheWVycylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNvb3JkaW5hdGVzLG5mZWF0dXJlcyxmZWF0dXJlc0ZvckxheWVyTmFtZXMpe1xuICAgICAgICAgICAgICB2YXIgZmVhdHVyZXNGb3JMYXllcnMgPSBbXTtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKGZlYXR1cmVzRm9yTGF5ZXJOYW1lcyxmdW5jdGlvbihmZWF0dXJlcyxsYXllck5hbWUpe1xuICAgICAgICAgICAgICAgIHZhciBsYXllciA9IHRoaXMucHJvamVjdC5sYXllcnNbbGF5ZXJOYW1lXTtcbiAgICAgICAgICAgICAgICBmZWF0dXJlc0ZvckxheWVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIGxheWVyOiBsYXllcixcbiAgICAgICAgICAgICAgICAgIGZlYXR1cmVzOiBmZWF0dXJlc1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBzZWxmLmVtaXQoJ21hcHF1ZXJ5ZW5kJyxmZWF0dXJlc0ZvckxheWVycyxuZmVhdHVyZXMsY29vcmRpbmF0ZXMsc2VsZi5zdGF0ZS5yZXNvbHV0aW9uKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChjb250cm9sKSB7XG4gICAgICAgIHNlbGYuYWRkQ29udHJvbChjb250cm9sKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxucHJvdG8uYWRkQ29udHJvbCA9IGZ1bmN0aW9uKGNvbnRyb2wpe1xuICB0aGlzLnZpZXdlci5tYXAuYWRkQ29udHJvbChjb250cm9sKTtcbn07XG5cbnByb3RvLnNldHVwQmFzZUxheWVycyA9IGZ1bmN0aW9uKCl7XG4gIGlmICghdGhpcy5wcm9qZWN0LnN0YXRlLmJhc2VsYXllcnMpe1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMubWFwQmFzZUxheWVycyA9IHt9O1xuICBcbiAgdmFyIGluaXRCYXNlTGF5ZXIgPSBQcm9qZWN0c1JlZ2lzdHJ5LmNvbmZpZy5pbml0YmFzZWxheWVyO1xuICB2YXIgYmFzZUxheWVyc0FycmF5ID0gdGhpcy5wcm9qZWN0LnN0YXRlLmJhc2VsYXllcnM7XG4gIFxuICBfLmZvckVhY2goYmFzZUxheWVyc0FycmF5LGZ1bmN0aW9uKGJhc2VMYXllcil7XG4gICAgdmFyIHZpc2libGUgPSB0cnVlO1xuICAgIGlmICh0aGlzLnByb2plY3Quc3RhdGUuaW5pdGJhc2VsYXllcikge1xuICAgICAgdmlzaWJsZSA9IGJhc2VMYXllci5pZCA9PSAodGhpcy5wcm9qZWN0LnN0YXRlLmluaXRiYXNlbGF5ZXIpO1xuICAgIH1cbiAgICBpZiAoYmFzZUxheWVyLmZpeGVkKSB7XG4gICAgICB2aXNpYmxlID0gYmFzZUxheWVyLmZpeGVkO1xuICAgIH1cbiAgICBiYXNlTGF5ZXIudmlzaWJsZSA9IHZpc2libGU7XG4gIH0pXG4gIFxuICBiYXNlTGF5ZXJzQXJyYXkuZm9yRWFjaChmdW5jdGlvbihsYXllcil7ICAgICBcbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgdXJsOiB0aGlzLnByb2plY3QuZ2V0V21zVXJsKCksXG4gICAgICBpZDogbGF5ZXIuaWQsXG4gICAgICB0aWxlZDogdHJ1ZVxuICAgIH07XG4gICAgXG4gICAgdmFyIG1hcExheWVyID0gbmV3IFdNU0xheWVyKGNvbmZpZyk7XG4gICAgc2VsZi5yZWdpc3Rlckxpc3RlbmVycyhtYXBMYXllcik7XG4gICAgXG4gICAgbWFwTGF5ZXIuYWRkTGF5ZXIobGF5ZXIpO1xuICAgIHNlbGYubWFwQmFzZUxheWVyc1tsYXllci5pZF0gPSBtYXBMYXllcjtcbiAgfSk7XG4gIFxuICBfLmZvckVhY2goXy52YWx1ZXModGhpcy5tYXBCYXNlTGF5ZXJzKS5yZXZlcnNlKCksZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgIHNlbGYudmlld2VyLm1hcC5hZGRMYXllcihtYXBMYXllci5nZXRPTExheWVyKCkpO1xuICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlKTtcbiAgfSlcbn07XG5cbnByb3RvLnNldHVwTGF5ZXJzID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnZpZXdlci5yZW1vdmVMYXllcnMoKTtcbiAgdGhpcy5zZXR1cEJhc2VMYXllcnMoKTtcbiAgXG4gIHRoaXMubWFwTGF5ZXJzID0ge307XG4gIHRoaXMubGF5ZXJzQXNzb2NpYXRpb24gPSB7fTtcbiAgdmFyIGxheWVyc0FycmF5ID0gdGhpcy50cmF2ZXJzZUxheWVyc1RyZWUodGhpcy5wcm9qZWN0LnN0YXRlLmxheWVyc3RyZWUpO1xuICAvLyBwcmVuZG8gc29sbyBpIGxheWVyIHZlcmkgZSBub24gaSBmb2xkZXJcbiAgdmFyIGxlYWZMYXllcnNBcnJheSA9IF8uZmlsdGVyKGxheWVyc0FycmF5LGZ1bmN0aW9uKGxheWVyKXtcbiAgICByZXR1cm4gIV8uZ2V0KGxheWVyLCdub2RlcycpO1xuICB9KTtcbiAgdmFyIG11bHRpTGF5ZXJzID0gXy5ncm91cEJ5KGxlYWZMYXllcnNBcnJheSxmdW5jdGlvbihsYXllcil7XG4gICAgcmV0dXJuIGxheWVyLm11bHRpbGF5ZXI7XG4gIH0pO1xuICBfLmZvckVhY2gobXVsdGlMYXllcnMsZnVuY3Rpb24obGF5ZXJzLGlkKXtcbiAgICB2YXIgbGF5ZXJJZCA9ICdsYXllcl8nK2lkXG4gICAgdmFyIG1hcExheWVyID0gXy5nZXQoc2VsZi5tYXBMYXllcnMsbGF5ZXJJZCk7XG4gICAgdmFyIHRpbGVkID0gbGF5ZXJzWzBdLnRpbGVkIC8vIEJSVVRUTywgZGEgc2lzdGVtYXJlIHF1YW5kbyByaW9yZ2FuaXp6ZXJlbW8gaSBtZXRhbGF5ZXIgKGRhIGZhciBkaXZlbnRhcmUgbXVsdGlsYXllcikuIFBlciBvcmEgcG9zc28gY29uZmlndXJhcmUgdGlsZWQgc29sbyBpIGxheWVyIHNpbmdvbGlcbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgdXJsOiBzZWxmLnByb2plY3QuZ2V0V21zVXJsKCksXG4gICAgICBpZDogbGF5ZXJJZCxcbiAgICAgIHRpbGVkOiB0aWxlZFxuICAgIH07XG4gICAgbWFwTGF5ZXIgPSBzZWxmLm1hcExheWVyc1tsYXllcklkXSA9IG5ldyBXTVNMYXllcihjb25maWcsc2VsZi5sYXllcnNFeHRyYVBhcmFtcyk7XG4gICAgc2VsZi5yZWdpc3Rlckxpc3RlbmVycyhtYXBMYXllcik7XG4gICAgXG4gICAgbGF5ZXJzLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgbWFwTGF5ZXIuYWRkTGF5ZXIobGF5ZXIpO1xuICAgICAgc2VsZi5sYXllcnNBc3NvY2lhdGlvbltsYXllci5pZF0gPSBsYXllcklkO1xuICAgIH0pO1xuICB9KVxuICBcbiAgXy5mb3JFYWNoKF8udmFsdWVzKHRoaXMubWFwTGF5ZXJzKS5yZXZlcnNlKCksZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgIHNlbGYudmlld2VyLm1hcC5hZGRMYXllcihtYXBMYXllci5nZXRPTExheWVyKCkpO1xuICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlLHNlbGYubGF5ZXJzRXh0cmFQYXJhbXMpO1xuICB9KVxufTtcblxucHJvdG8udXBkYXRlTWFwTGF5ZXJzID0gZnVuY3Rpb24obWFwTGF5ZXJzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgXy5mb3JFYWNoKF8udmFsdWVzKG1hcExheWVycyksZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlLHNlbGYubGF5ZXJzRXh0cmFQYXJhbXMpO1xuICB9KVxufTtcblxucHJvdG8uZ2V0TWFwTGF5ZXJGb3JMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgcmV0dXJuIHRoaXMubWFwTGF5ZXJzWydsYXllcl8nK2xheWVyLm11bHRpbGF5ZXJdO1xufTtcblxucHJvdG8udHJhdmVyc2VMYXllcnNUcmVlID0gZnVuY3Rpb24obGF5ZXJzVHJlZSl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGxheWVyc0FycmF5ID0gW107XG4gIGZ1bmN0aW9uIHRyYXZlcnNlKG9iail7XG4gICAgXy5mb3JJbihvYmosIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICBpZiAoIV8uaXNOaWwodmFsLmlkKSkge1xuICAgICAgICAgICAgbGF5ZXJzQXJyYXkudW5zaGlmdCh2YWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghXy5pc05pbCh2YWwubm9kZXMpKSB7XG4gICAgICAgICAgICB0cmF2ZXJzZSh2YWwubm9kZXMpO1xuICAgICAgICB9XG4gICAgfSk7XG4gIH1cbiAgdHJhdmVyc2UobGF5ZXJzVHJlZSk7XG4gIHJldHVybiBsYXllcnNBcnJheTtcbn07XG5cbnByb3RvLnJlZ2lzdGVyTGlzdGVuZXJzID0gZnVuY3Rpb24obWFwTGF5ZXIpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG1hcExheWVyLm9uKCdsb2Fkc3RhcnQnLGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5faW5jcmVtZW50TG9hZGVycygpO1xuICB9KTtcbiAgbWFwTGF5ZXIub24oJ2xvYWRlbmQnLGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5fZGVjcmVtZW50TG9hZGVycyhmYWxzZSk7XG4gIH0pO1xuICBcbiAgdGhpcy5vbignZXh0cmFQYXJhbXNTZXQnLGZ1bmN0aW9uKGV4dHJhUGFyYW1zLHVwZGF0ZSl7XG4gICAgaWYgKHVwZGF0ZSkge1xuICAgICAgbWFwTGF5ZXIudXBkYXRlKHRoaXMuc3RhdGUsZXh0cmFQYXJhbXMpO1xuICAgIH1cbiAgfSlcbn07XG5cbnByb3RvLnNob3dWaWV3ZXIgPSBmdW5jdGlvbihlbElkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnZpZXdlci5zZXRUYXJnZXQoZWxJZCk7XG4gIHZhciBtYXAgPSB0aGlzLnZpZXdlci5tYXA7XG4gIEdVSS5vbignZ3VpcmVhZHknLGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5fc2V0TWFwVmlldygpO1xuICB9KTtcbn07XG5cblxuLy8gcGVyIGNyZWFyZSB1bmEgcGlsYSBkaSBvbC5pbnRlcmFjdGlvbiBpbiBjdWkgbCd1bHRpbW8gY2hlIHNpIGFnZ2l1bmdlIGRpc2F0dGl2YSB0ZW1wb3JhZW1lbnRlIGkgcHJlY2VkZW50aSAocGVyIHBvaSB0b2dsaWVyc2kgZGkgbWV6em8gY29uIHBvcEludGVyYWN0aW9uISlcbi8vIFVzYXRvIGFkIGVzLiBkYSBwaWNrZmVhdHVyZXRvb2wgZSBnZXRmZWF0dXJlaW5mb1xucHJvdG8ucHVzaEludGVyYWN0aW9uID0gZnVuY3Rpb24oaW50ZXJhY3Rpb24pe1xuICBpZiAodGhpcy5faW50ZXJhY3Rpb25zU3RhY2subGVuZ3RoKXtcbiAgICB2YXIgcHJldkludGVyYWN0aW9uID0gdGhpcy5faW50ZXJhY3Rpb25zU3RhY2suc2xpY2UoLTEpWzBdO1xuICAgIGlmIChfLmlzQXJyYXkocHJldkludGVyYWN0aW9uKSl7XG4gICAgICBfLmZvckVhY2gocHJldkludGVyYWN0aW9uLGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2V7XG4gICAgICBwcmV2SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9O1xuICB9XG4gIFxuICB0aGlzLnZpZXdlci5tYXAuYWRkSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xuICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gIHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrLnB1c2goaW50ZXJhY3Rpb24pXG59O1xuXG5wcm90by5wb3BJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gIHZhciBpbnRlcmFjdGlvbiA9IHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrLnBvcCgpO1xuICB0aGlzLnZpZXdlci5tYXAucmVtb3ZlSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xuICBcbiAgaWYgKHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrLmxlbmd0aCl7XG4gICAgdmFyIHByZXZJbnRlcmFjdGlvbiA9IHRoaXMuX2ludGVyYWN0aW9uc1N0YWNrLnNsaWNlKC0xKVswXTtcbiAgICBpZiAoXy5pc0FycmF5KHByZXZJbnRlcmFjdGlvbikpe1xuICAgICAgXy5mb3JFYWNoKHByZXZJbnRlcmFjdGlvbixmdW5jdGlvbihpbnRlcmFjdGlvbil7XG4gICAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2V7XG4gICAgICBwcmV2SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIH07XG4gIH1cbn07XG5cbnByb3RvLmdvVG8gPSBmdW5jdGlvbihjb29yZGluYXRlcyx6b29tKXtcbiAgdmFyIHpvb20gPSB6b29tIHx8IDY7XG4gIHRoaXMudmlld2VyLmdvVG8oY29vcmRpbmF0ZXMsem9vbSk7XG59O1xuXG5wcm90by5nb1RvV0dTODQgPSBmdW5jdGlvbihjb29yZGluYXRlcyx6b29tKXtcbiAgdmFyIGNvb3JkaW5hdGVzID0gb2wucHJvai50cmFuc2Zvcm0oY29vcmRpbmF0ZXMsJ0VQU0c6NDMyNicsJ0VQU0c6Jyt0aGlzLnByb2plY3Quc3RhdGUuY3JzKTtcbiAgdGhpcy5nb1RvKGNvb3JkaW5hdGVzLHpvb20pO1xufTtcblxucHJvdG8uZXh0ZW50VG9XR1M4NCA9IGZ1bmN0aW9uKGV4dGVudCl7XG4gIHJldHVybiBvbC5wcm9qLnRyYW5zZm9ybUV4dGVudChleHRlbnQsJ0VQU0c6Jyt0aGlzLnByb2plY3Quc3RhdGUuY3JzLCdFUFNHOjQzMjYnKTtcbn07XG5cbnByb3RvLmdldEZlYXR1cmVJbmZvID0gZnVuY3Rpb24obGF5ZXJJZCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9waWNrSW50ZXJhY3Rpb24gPSBuZXcgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24oKTtcbiAgLy90aGlzLnZpZXdlci5tYXAuYWRkSW50ZXJhY3Rpb24odGhpcy5fcGlja0ludGVyYWN0aW9uKTtcbiAgLy90aGlzLl9waWNrSW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICB0aGlzLnB1c2hJbnRlcmFjdGlvbih0aGlzLl9waWNrSW50ZXJhY3Rpb24pO1xuICB0aGlzLl9waWNrSW50ZXJhY3Rpb24ub24oJ3BpY2tlZCcsZnVuY3Rpb24oZSl7XG4gICAgc2VsZi5fY29tcGxldGVHZXRGZWF0dXJlSW5mbyhsYXllcklkLGUuY29vcmRpbmF0ZSxkZWZlcnJlZCk7XG4gIH0pXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG59O1xuXG5wcm90by5fY29tcGxldGVHZXRGZWF0dXJlSW5mbyA9IGZ1bmN0aW9uKGxheWVySWQsY29vcmRpbmF0ZSxkZWZlcnJlZCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHByb2plY3RUeXBlID0gdGhpcy5wcm9qZWN0LnN0YXRlLnR5cGU7XG4gIFxuICB2YXIgbWFwTGF5ZXIgPSB0aGlzLm1hcExheWVyc1t0aGlzLmxheWVyc0Fzc29jaWF0aW9uW2xheWVySWRdXTtcbiAgdmFyIHJlc29sdXRpb24gPSBzZWxmLnZpZXdlci5nZXRSZXNvbHV0aW9uKCk7XG4gIHZhciBlcHNnID0gc2VsZi52aWV3ZXIubWFwLmdldFZpZXcoKS5nZXRQcm9qZWN0aW9uKCkuZ2V0Q29kZSgpO1xuICB2YXIgcGFyYW1zID0ge1xuICAgIFFVRVJZX0xBWUVSUzogUHJvamVjdC5nZXRMYXllcihsYXllcklkKS5uYW1lLFxuICAgIElORk9fRk9STUFUOiBcInRleHQveG1sXCJcbiAgfVxuICBcbiAgaWYgKHByb2plY3RUeXBlID09IFByb2plY3RUeXBlcy5RREpBTkdPKXtcbiAgICB2YXIgdG9sZXJhbmNlUGFyYW1zID0gUGlja1RvbGVyYW5jZVBhcmFtc1twcm9qZWN0VHlwZV07XG4gICAgaWYgKHRvbGVyYW5jZVBhcmFtcyl7XG4gICAgICB2YXIgZ2VvbWV0cnl0eXBlID0gdGhpcy5wcm9qZWN0LmdldExheWVyKGxheWVySWQpLmdlb21ldHJ5dHlwZTtcbiAgICAgIHBhcmFtc1t0b2xlcmFuY2VQYXJhbXNbZ2VvbWV0cnl0eXBlXV0gPSBQaWNrVG9sZXJhbmNlVmFsdWVzW2dlb21ldHJ5dHlwZV07XG4gICAgfVxuICB9XG4gIFxuICB2YXIgZ2V0RmVhdHVyZUluZm9VcmwgPSBtYXBMYXllci5nZXRTb3VyY2UoKS5nZXRHZXRGZWF0dXJlSW5mb1VybChjb29yZGluYXRlLHJlc29sdXRpb24sZXBzZyxwYXJhbXMpO1xuICAkLmdldChnZXRGZWF0dXJlSW5mb1VybClcbiAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgdmFyIHgyanMgPSBuZXcgWDJKUygpO1xuICAgIHZhciBqc29uRGF0YSA9IHgyanMueG1sMmpzb24oZGF0YSk7XG4gICAgaWYgKGpzb25EYXRhLkdldEZlYXR1cmVJbmZvUmVzcG9uc2UuTGF5ZXIuRmVhdHVyZSl7XG4gICAgICB2YXIgYXR0cmlidXRlcyA9IGpzb25EYXRhLkdldEZlYXR1cmVJbmZvUmVzcG9uc2UuTGF5ZXIuRmVhdHVyZS5BdHRyaWJ1dGU7XG4gICAgICB2YXIgYXR0cmlidXRlc09iaiA9IHt9O1xuICAgICAgXy5mb3JFYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24oYXR0cmlidXRlKXtcbiAgICAgICAgYXR0cmlidXRlc09ialthdHRyaWJ1dGUuX25hbWVdID0gYXR0cmlidXRlLl92YWx1ZTsgLy8gWDJKUyBhZ2dpdW5nZSBcIl9cIiBjb21lIHByZWZpc3NvIGRlZ2xpIGF0dHJpYnV0aVxuICAgICAgfSlcbiAgICAgIFxuICAgICAgZGVmZXJyZWQucmVzb2x2ZShhdHRyaWJ1dGVzT2JqKTtcbiAgICB9XG4gICAgZGVmZXJyZWQucmVqZWN0KCk7O1xuICB9KVxuICAuZmFpbChmdW5jdGlvbigpe1xuICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICB9KVxuICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgLy9zZWxmLnZpZXdlci5tYXAucmVtb3ZlSW50ZXJhY3Rpb24oc2VsZi5fcGlja0ludGVyYWN0aW9uKTtcbiAgICBzZWxmLnBvcEludGVyYWN0aW9uKCk7XG4gICAgc2VsZi5fcGlja0ludGVyYWN0aW9uID0gbnVsbDtcbiAgfSlcbn07XG5cbnByb3RvLmhpZ2hsaWdodEdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnlPYmosb3B0aW9ucyl7ICAgIFxuICB2YXIgZ2VvbWV0cnk7XG4gIGlmIChnZW9tZXRyeU9iaiBpbnN0YW5jZW9mIG9sLmdlb20uR2VvbWV0cnkpe1xuICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnlPYmo7XG4gIH1cbiAgZWxzZSB7XG4gICAgZm9ybWF0ID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OO1xuICAgIGdlb21ldHJ5ID0gZm9ybWF0LnJlYWRHZW9tZXRyeShnZW9tZXRyeU9iaik7XG4gIH1cbiAgXG4gIGlmIChvcHRpb25zLnpvb20pIHtcbiAgICB0aGlzLnZpZXdlci5maXQoZ2VvbWV0cnkpO1xuICB9XG4gIFxuICB2YXIgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uIHx8IDQwMDA7XG4gIFxuICBpZiAob3B0aW9ucy5mcm9tV0dTODQpIHtcbiAgICBnZW9tZXRyeS50cmFuc2Zvcm0oJ0VQU0c6NDMyNicsJ0VQU0c6Jyt0aGlzLnByb2plY3QucHJvamVjdC5jcnMpO1xuICB9XG4gIFxuICB2YXIgZmVhdHVyZSA9IG5ldyBvbC5GZWF0dXJlKHtcbiAgICBnZW9tZXRyeTogZ2VvbWV0cnlcbiAgfSk7XG4gIHZhciBzb3VyY2UgPSBuZXcgb2wuc291cmNlLlZlY3RvcigpO1xuICBzb3VyY2UuYWRkRmVhdHVyZXMoW2ZlYXR1cmVdKTtcbiAgdmFyIGxheWVyID0gbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgc291cmNlOiBzb3VyY2UsXG4gICAgc3R5bGU6IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHN0eWxlcyA9IFtdO1xuICAgICAgdmFyIGdlb21ldHJ5VHlwZSA9IGZlYXR1cmUuZ2V0R2VvbWV0cnkoKS5nZXRUeXBlKCk7XG4gICAgICBpZiAoZ2VvbWV0cnlUeXBlID09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICB2YXIgc3R5bGUgPSBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgICBjb2xvcjogJ3JnYigyNTUsMjU1LDApJyxcbiAgICAgICAgICAgIHdpZHRoOiA0XG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgc3R5bGVzLnB1c2goc3R5bGUpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoZ2VvbWV0cnlUeXBlID09ICdQb2ludCcpe1xuICAgICAgICB2YXIgc3R5bGUgPSBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgICAgIHJhZGl1czogNixcbiAgICAgICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICAgICAgY29sb3I6ICdyZ2IoMjU1LDI1NSwwKScsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHpJbmRleDogSW5maW5pdHlcbiAgICAgICAgfSk7XG4gICAgICAgIHN0eWxlcy5wdXNoKHN0eWxlKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmV0dXJuIHN0eWxlcztcbiAgICB9XG4gIH0pXG4gIGxheWVyLnNldE1hcCh0aGlzLnZpZXdlci5tYXApO1xuICBcbiAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgIGxheWVyLnNldE1hcChudWxsKTtcbiAgfSxkdXJhdGlvbik7XG59O1xuXG5wcm90by5yZWZyZXNoTWFwID0gZnVuY3Rpb24oKXtcbiAgXy5mb3JFYWNoKHRoaXMubWFwTGF5ZXJzLGZ1bmN0aW9uKHdtc0xheWVyKXtcbiAgICB3bXNMYXllci5nZXRMYXllcigpLmdldFNvdXJjZSgpLnVwZGF0ZVBhcmFtcyh7XCJ0aW1lXCI6IERhdGUubm93KCl9KTtcbiAgfSlcbn07XG5cbnByb3RvLl9zZXRNYXBWaWV3ID0gZnVuY3Rpb24oKXtcbiAgdmFyIGJib3ggPSB0aGlzLnZpZXdlci5nZXRCQk9YKCk7XG4gIHZhciByZXNvbHV0aW9uID0gdGhpcy52aWV3ZXIuZ2V0UmVzb2x1dGlvbigpO1xuICB2YXIgY2VudGVyID0gdGhpcy52aWV3ZXIuZ2V0Q2VudGVyKCk7XG4gIHRoaXMuc2V0TWFwVmlldyhiYm94LHJlc29sdXRpb24sY2VudGVyKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwU2VydmljZVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcIm1hcFxcXCIgc3R5bGU9XFxcIndpZHRoOjEwMCU7aGVpZ2h0OjEwMCVcXFwiPlxcbjwvZGl2PlxcblwiO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgbWVyZ2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykubWVyZ2U7XG52YXIgdCA9IHJlcXVpcmUoJ2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnKS50O1xudmFyIHJlc29sdmUgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykucmVzb2x2ZTtcbnZhciBHVUkgPSByZXF1aXJlKCdndWkvZ3VpJyk7ICAgXG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnZ3VpL3Z1ZS9jb21wb25lbnQnKTtcbnZhciBSb3V0ZXJTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9yb3V0ZXInKTtcbnZhciBvbDNoZWxwZXJzID0gcmVxdWlyZSgnZzN3LW9sMy9zcmMvZzN3Lm9sMycpLmhlbHBlcnM7XG52YXIgTWFwc1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9tYXAvbWFwc3JlZ2lzdHJ5Jyk7XG52YXIgTWFwU2VydmljZSA9IHJlcXVpcmUoJy4uL21hcHNlcnZpY2UnKTtcblxuZnVuY3Rpb24gbWFpbkhlaWdodCgpe1xuICAvL3JldHVybiAkKHdpbmRvdykuaW5uZXJIZWlnaHQoKS0kKFwiLm5hdmJhclwiKS5pbm5lckhlaWdodCgpO1xuICAvL3JldHVybiAkKHdpbmRvdykuaW5uZXJIZWlnaHQoKTtcbiAgdmFyIHRvcEhlaWdodCA9ICQoXCIubmF2YmFyXCIpLmlubmVySGVpZ2h0KCk7XG4gIHZhciBib3R0b21IZWlnaHQgPSAwO1xuICBcbiAgaWYgKCQoXCIuYm90dG9tYmFyXCIpLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICBib3R0b21IZWlnaHQgPSAkKFwiLmJvdHRvbWJhclwiKS5pbm5lckhlaWdodCgpXG4gIH1cbiAgcmV0dXJuICQod2luZG93KS5pbm5lckhlaWdodCgpIC0gdG9wSGVpZ2h0IC0gYm90dG9tSGVpZ2h0O1xufVxuXG4vKiBtYXAgcmVzaXplIGNhbGN1bGF0aW9ucyAqL1xuZnVuY3Rpb24gc2V0TWFwRGl2SGVpZ2h0KG1hcCl7XG4gIHZhciBoZWlnaHQgPSBtYWluSGVpZ2h0KCk7XG4gICQoXCIjbWFwXCIpLmhlaWdodChoZWlnaHQpO1xuICBtYXAudXBkYXRlU2l6ZSgpO1xufVxuXG5mdW5jdGlvbiBzZXRNYXBEaXZXaWR0aChtYXApe1xuICB2YXIgb2Zmc2V0ID0gJChcIi5tYWluLXNpZGViYXJcIikub2Zmc2V0KCkubGVmdDtcbiAgdmFyIHdpZHRoID0gJChcIi5tYWluLXNpZGViYXJcIikuaW5uZXJXaWR0aCgpO1xuICB2YXIgc2lkZUJhclNwYWNlID0gd2lkdGggKyBvZmZzZXQ7XG4gICQoXCIjbWFwXCIpLndpZHRoKCQod2luZG93KS5pbm5lcldpZHRoKCkgLSBzaWRlQmFyU3BhY2UpO1xuICBtYXAudXBkYXRlU2l6ZSgpO1xufVxuXG52YXIgdnVlQ29tcG9uZW50T3B0aW9ucyA9IHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vbWFwLmh0bWwnKSxcbiAgcmVhZHk6IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFxuICAgIHZhciBtYXBTZXJ2aWNlID0gdGhpcy4kb3B0aW9ucy5tYXBTZXJ2aWNlO1xuICAgIFxuICAgIG1hcFNlcnZpY2Uuc2hvd1ZpZXdlcih0aGlzLiRlbC5pZCk7XG4gICAgXG4gICAgLy8gcXVlc3RvIHNlcnZlIHBlciBxdWFuZG8gdmllbmUgY2FtYmlhdG8gcHJvZ2V0dG8vdmlzdGEgY2FydG9ncmFmaWNhLCBpbiBjdWkgdmllbmUgcmljcmVhdG8gaWwgdmlld2VyIChlIHF1aW5kaSBsYSBtYXBwYSlcbiAgICBtYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldHVwVmlld2VyJyxmdW5jdGlvbigpe1xuICAgICAgbWFwU2VydmljZS5zaG93Vmlld2VyKHNlbGYuJGVsLmlkKTtcbiAgICB9KTtcbiAgICBcbiAgICBHVUkub24oJ2d1aXJlYWR5JyxmdW5jdGlvbigpe1xuICAgICAgc2V0TWFwRGl2SGVpZ2h0KG1hcFNlcnZpY2UuZ2V0TWFwKCkpO1xuICAgICAgXG4gICAgICAkKCcubWFpbi1zaWRlYmFyJykub24oJ3dlYmtpdFRyYW5zaXRpb25FbmQgdHJhbnNpdGlvbmVuZCBtc1RyYW5zaXRpb25FbmQgb1RyYW5zaXRpb25FbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCd0cmFucy1lbmQnKTtcbiAgICAgICAgICBzZXRNYXBEaXZXaWR0aChtYXBTZXJ2aWNlLmdldE1hcCgpKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICB2YXIgZHJhd2luZyA9IGZhbHNlO1xuICAgICAgdmFyIHJlc2l6ZUZpcmVkID0gZmFsc2U7XG4gICAgICBcbiAgICAgIEdVSS5vbignZ3VpcmVzaXplZCcsZnVuY3Rpb24oKXtcbiAgICAgICAgcmVzaXplRmlyZWQgPSB0cnVlO1xuICAgICAgICBkcmF3UmVzaXplKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gc2V0IHJlc2l6ZWRGaXJlZCB0byB0cnVlIGFuZCBleGVjdXRlIGRyYXdSZXNpemUgaWYgaXQncyBub3QgYWxyZWFkeSBydW5uaW5nXG4gICAgICAgIGlmIChkcmF3aW5nID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmVzaXplRmlyZWQgPSB0cnVlO1xuICAgICAgICAgICAgZHJhd1Jlc2l6ZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gZHJhd1Jlc2l6ZSgpIHtcbiAgICAgICAgdmFyIGhlaWdodDtcbiAgICAgICAgLy8gcmVuZGVyIGZyaWVuZGx5IHJlc2l6ZSBsb29wXG4gICAgICAgIGlmIChyZXNpemVGaXJlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgcmVzaXplRmlyZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGRyYXdpbmcgPSB0cnVlO1xuICAgICAgICAgICAgc2V0TWFwRGl2SGVpZ2h0KG1hcFNlcnZpY2UuZ2V0TWFwKCkpO1xuICAgICAgICAgICAgc2V0TWFwRGl2V2lkdGgobWFwU2VydmljZS5nZXRNYXAoKSk7XG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhd1Jlc2l6ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkcmF3aW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgIH0pXG4gIH1cbn1cblxudmFyIEludGVybmFsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh2dWVDb21wb25lbnRPcHRpb25zKTtcblxuVnVlLmNvbXBvbmVudCgnZzN3LW1hcCcsIHZ1ZUNvbXBvbmVudE9wdGlvbnMpO1xuXG5mdW5jdGlvbiBNYXBDb21wb25lbnQob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5pZCA9IFwibWFwLWNvbXBvbmVudFwiO1xuICB0aGlzLnRpdGxlID0gXCJDYXRhbG9nbyBkYXRpXCI7XG4gIHRoaXMubWFwU2VydmljZSA9IG5ldyBNYXBTZXJ2aWNlO1xuICBtZXJnZSh0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5pbnRlcm5hbENvbXBvbmVudCA9IG5ldyBJbnRlcm5hbENvbXBvbmVudCh7XG4gICAgbWFwU2VydmljZTogdGhpcy5tYXBTZXJ2aWNlXG4gIH0pO1xufVxuaW5oZXJpdChNYXBDb21wb25lbnQsIENvbXBvbmVudCk7XG5cbnZhciBwcm90byA9IE1hcENvbXBvbmVudC5wcm90b3R5cGU7XG5cbm1vZHVsZS5leHBvcnRzID0gIE1hcENvbXBvbmVudDtcbiIsInZhciBsb2NhbGl6ZSA9IHJlcXVpcmUoJ2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnKS50O1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciByZXNvbHZlZFZhbHVlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxudmFyIFBhbmVsID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBzZWxmID0gdGhpcztcbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBzZWxmLmlkID0gb3B0aW9ucy5pZCB8fCBudWxsO1xuICBzZWxmLnRpdGxlID0gb3B0aW9ucy50aXRsZSB8fCAnJztcbn07XG5cbmluaGVyaXQoUGFuZWwsIEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IFBhbmVsLnByb3RvdHlwZTtcblxucHJvdG8uZ2V0SWQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gc2VsZi5pZDtcbn07XG5cbnByb3RvLmdldFRpdGxlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHNlbGYudGl0bGU7XG59O1xuXG4vKiBIT09LUyAqL1xuXG4vKlxuICogSWwgbWV0b2RvIHBlcm1ldHRlIGFsIHBhbm5lbGxvIGRpIG1vbnRhcnNpIG5lbCBET01cbiAqIHBhcmVudDogZWxlbWVudG8gRE9NIHBhZHJlLCBzdSBjdWkgaW5zZXJpcnNpO1xuICogcml0b3JuYSB1bmEgcHJvbWlzZSwgcmlzb2x0YSBuZWwgbW9tZW50byBpbiBjdWkgc2Fyw6AgdGVybWluYXRvIGlsIG1vbnRhZ2dpb1xuKi9cblxuLy8gU09OTyBEVUUgVElQT0xPR0lFIERJIE1PTlRBR0dJTyBDT04gSUwgUVVBTEUgSUwgUEFOTkVMTE9cbi8vIENIRSBWRVJSQScgTU9OVEFUTyBBTCBWT0xPIENPTiBJTCBNRVRPRE8gTU9VTlQgQSBTRUNPTkRBIERFTCBUSVBPIERJIFBBTk5FTExPIFJJQ0hJRVNUT1xuXG4vLyByaWNoaWFtYXRvIHF1YW5kbyBsYSBHVUkgY2hpZWRlIGRpIGNoaXVkZXJlIGlsIHBhbm5lbGxvLiBTZSByaXRvcm5hIGZhbHNlIGlsIHBhbm5lbGxvIG5vbiB2aWVuZSBjaGl1c29cblxucHJvdG8ubW91bnQgPSBmdW5jdGlvbihwYXJlbnQpIHtcbiAgdmFyIHBhbmVsID0gdGhpcy5JbnRlcm5hbFBhbmVsO1xuICBwYW5lbC4kbW91bnQoKS4kYXBwZW5kVG8ocGFyZW50KTtcbiAgbG9jYWxpemUoKTtcbiAgcmV0dXJuIHJlc29sdmVkVmFsdWUodHJ1ZSk7XG59O1xuXG4vKlxuICogTWV0b2RvIHJpY2hpYW1hdG8gcXVhbmRvIHNpIHZ1b2xlIHJpbXVvdmVyZSBpbCBwYW5lbGxvLlxuICogUml0b3JuYSB1bmEgcHJvbWVzc2EgY2hlIHNhcsOgIHJpc29sdGEgbmVsIG1vbWVudG8gaW4gY3VpIGlsIHBhbm5lbGxvIGF2csOgIGNvbXBsZXRhdG8gbGEgcHJvcHJpYSByaW1vemlvbmUgKGVkIGV2ZW50dWFsZSByaWxhc2NpbyBkaSByaXNvcnNlIGRpcGVuZGVudGkpXG4qL1xucHJvdG8udW5tb3VudCA9IGZ1bmN0aW9uKCl7XG4gIHZhciBwYW5lbCA9IHRoaXMuSW50ZXJuYWxQYW5lbDtcbiAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICBwYW5lbC4kZGVzdHJveSh0cnVlKTtcbiAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxuLypcbiAqIE1ldG9kbyAob3B6aW9uYWxlKSBjaGUgb2ZmcmUgbCdvcHBvcnR1bml0w6AgZGkgcmljYWxjb2xhcmUgcHJvcHJpZXTDoCBkaXBlbmRlbnRpIGRhbGxlIGRpbWVuc2lvbmkgZGVsIHBhZHJlXG4gKiBwYXJlbnRIZWlnaHQ6IG51b3ZhIGFsdGV6emEgZGVsIHBhcmVudFxuICogcGFyZW50V2lkdGg6IG51b3ZhIGxhcmdoZXp6YSBkZWwgcGFyZW50XG4gKiByaWNoaWFtYXRvIG9nbmkgdm9sdGEgY2hlIGlsIHBhcmVudCBzdWJpc2NlIHVuIHJpZGltZW5zaW9uYW1lbnRvXG4qL1xucHJvdG8ub25SZXNpemUgPSBmdW5jdGlvbihwYXJlbnRXaWR0aCxwYXJlbnRIZWlnaHQpe307XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQYW5lbDtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgU2VhcmNoUGFuZWwgPSByZXF1aXJlKCdndWkvc2VhcmNoL3Z1ZS9wYW5lbC9zZWFyY2hwYW5lbCcpO1xuXG5mdW5jdGlvbiBTZWFyY2hlc1NlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmluaXQgPSBmdW5jdGlvbihzZWFyY2hlc09iamVjdCkge1xuICAgIHZhciBzZWFyY2hlcyA9IHNlYXJjaGVzT2JqZWN0IHx8IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKS5zdGF0ZS5zZWFyY2g7XG4gICAgdGhpcy5zdGF0ZS5zZWFyY2hlcyA9IHNlYXJjaGVzO1xuICB9O1xuXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgc2VhcmNoZXM6IFtdXG4gIH07XG5cbiAgdGhpcy5zaG93U2VhcmNoUGFuZWwgPSBmdW5jdGlvbihwYW5lbENvbmZpZykge1xuICAgIHBhbmVsID0gbmV3IFNlYXJjaFBhbmVsKCk7Ly8gY3JlbyBwYW5lbGxvIHNlYXJjaFxuICAgIHBhbmVsLmluaXQocGFuZWxDb25maWcpOy8vaW5pemlhbGl6em8gcGFubmVsbG8gc2VyYWNoXG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gICAgcmV0dXJuIHBhbmVsO1xuICB9O1xuXG4gIHRoaXMuY2xlYW5TZWFyY2hQYW5lbHMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0YXRlLnBhbmVscyA9IHt9O1xuICB9O1xuXG4gIHRoaXMuc3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xufTtcblxuLy8gTWFrZSB0aGUgcHVibGljIHNlcnZpY2UgZW4gRXZlbnQgRW1pdHRlclxuaW5oZXJpdChTZWFyY2hlc1NlcnZpY2UsIEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFNlYXJjaGVzU2VydmljZSgpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImczdy1zZWFyY2gtcGFuZWwgZm9ybS1ncm91cFxcXCI+XFxuICA8Zm9ybSBpZD1cXFwiZzN3LXNlYXJjaC1mb3JtXFxcIj5cXG4gICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJmb3JtaW5wdXQgaW4gZm9ybWlucHV0c1xcXCI+XFxuICAgICAgIDx0ZW1wbGF0ZSB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAnbnVtYmVyZmllbGQnXFxcIiBjbGFzcz1cXFwibnVtZXJpY1xcXCI+XFxuICAgICAgICAgPGxhYmVsIGZvcj1cXFwie3sgZm9ybWlucHV0LmlkIH19IFxcXCI+e3sgZm9ybWlucHV0LmxhYmVsIH19PC9sYWJlbD5cXG4gICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbJGluZGV4XS52YWx1ZVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgaWQ9XFxcInt7IGZvcm1pbnB1dC5pZCB9fVxcXCI+XFxuICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgPHRlbXBsYXRlIHYtaWY9XFxcImZvcm1pbnB1dC5pbnB1dC50eXBlID09ICd0ZXh0ZmllbGQnXFxcIiBjbGFzcz1cXFwidGV4dFxcXCI+XFxuICAgICAgICAgPGxhYmVsIGZvcj1cXFwie3sgZm9ybWlucHV0LmlkIH19XFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbJGluZGV4XS52YWx1ZVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgaWQ9XFxcInt7IGZvcm1pbnB1dC5pZCB9fVxcXCI+XFxuICAgICAgIDwvdGVtcGxhdGU+XFxuICAgIDwvdGVtcGxhdGU+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgQGNsaWNrPVxcXCJkb1NlYXJjaCgkZXZlbnQpXFxcIiBkYXRhLWkxOG49XFxcImRvc2VhcmNoXFxcIj5TZWFyY2g8L2J1dHRvbj5cXG4gIDwvZm9ybT5cXG48L2Rpdj5cXG5cIjtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgbG9jYWxpemUgPSByZXF1aXJlKCdjb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJykudDtcbnZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIFNlYXJjaFF1ZXJ5U2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvc2VhcmNoL3NlYXJjaHF1ZXJ5c2VydmljZScpO1xudmFyIExpc3RQYW5lbCA9IHJlcXVpcmUoJ2d1aS9saXN0cGFuZWwnKS5MaXN0UGFuZWw7XG52YXIgUGFuZWwgPSByZXF1aXJlKCdndWkvcGFuZWwnKTtcbnZhciBTZWFyY2hSZXN1bHRQYW5lbENvbXBvbmVudCA9IHJlcXVpcmUoJ2d1aS9zZWFyY2gvdnVlL3Jlc3VsdHMvcmVzdWx0cGFuZWwnKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcblxuLy9jb21wb25lbnRlIHZ1ZSBwYW5uZWxsbyBzZWFyY2hcbnZhciBTZWFyY2hQYW5lbENvbXBvbmV0ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3NlYXJjaHBhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZvcm1pbnB1dHM6IFtdLFxuICAgICAgZmlsdGVyT2JqZWN0OiB7fSxcbiAgICAgIGZvcm1JbnB1dFZhbHVlcyA6IFtdXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgZG9TZWFyY2g6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgLy9hbCBtb21lbnRvIG1vbHRvIGZhcnJhZ2dpbm9zbyBtYSBkYSByaXZlZGVyZVxuICAgICAgLy9wZXIgYXNzb2NpYXppb25lIHZhbG9yZSBpbnB1dFxuICAgICAgdGhpcy5maWx0ZXJPYmplY3QgPSBmaWxsRmlsdGVySW5wdXRzV2l0aFZhbHVlcyh0aGlzLmZpbHRlck9iamVjdCwgdGhpcy5mb3JtSW5wdXRWYWx1ZXMpO1xuICAgICAgU2VhcmNoUXVlcnlTZXJ2aWNlLmRvUXVlcnlTZWFyY2godGhpcy5maWx0ZXJPYmplY3QpO1xuICAgIH1cbiAgfVxufSk7XG5cbi8vZnVuemlvbmUgY2hlIGFzc29jaWEgaSB2YWxvcmkgZGVsbCdpbnB1dHMgZm9ybSBhbCByZWxhdGl2byBvZ2dldHRvIFwib3BlcmF6aW9uZGUgZGVsIGZpbHRyb1wiXG5cbmZ1bmN0aW9uIGZpbGxGaWx0ZXJJbnB1dHNXaXRoVmFsdWVzIChmaWx0ZXJPYmplY3QsIGZvcm1JbnB1dFZhbHVlcywgZ2xvYmFsSW5kZXgpIHtcbiAgLy9mdW56aW9uZSBjb252ZXJzaW9uZSBkYSB2YWxvcmUgcmVzdGl0dWl0byBkYWxsJ2lucHV0IChzZW1wcmUgc3RyaW5nYSkgYWwgdmVybyB0aXBvIGRpIHZhbG9yZVxuICBmdW5jdGlvbiBjb252ZXJ0SW5wdXRWYWx1ZVRvSW5wdXRUeXBlKHR5cGUsIHZhbHVlKSB7XG4gICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgIGNhc2UgJ251bWJlcmZpZWxkJzpcbiAgICAgICAgICAgdmFsdWUgPSBwYXJzZUludCh2YWx1ZSk7XG4gICAgICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICAvL2NpY2xvIHN1bGwnb2dnZXR0byBmaWx0cm8gY2hlIGhhIGNvbWUgY2hpYXZlIHJvb3QgJ0FORCcgbyAnT1InXG4gIF8uZm9yRWFjaChmaWx0ZXJPYmplY3QuZmlsdGVyT2JqZWN0LCBmdW5jdGlvbih2LGspIHtcbiAgICAvL3Njb3JybyBhdHRyYXZlcnNvIGwnYXJyYXkgZGkgZWxlbWVudGkgb3BlcmF6aW9uYWxpIGRhIGNvbmZyb250YXJlXG4gICAgXy5mb3JFYWNoKHYsIGZ1bmN0aW9uKGlucHV0LCBpZHgpIHtcbiAgICAgIC8vZWxlbWVudG8gb3BlcmF6aW9uYWxlIHsnPSc6e319XG4gICAgICBfLmZvckVhY2goaW5wdXQsIGZ1bmN0aW9uKHYsIGssIG9iaikge1xuICAgICAgICAvL3ZhZG8gYSBsZWdnZXJlIGwnb2dnZXR0byBhdHRyaWJ1dG9cbiAgICAgICAgaWYgKF8uaXNBcnJheSh2KSkge1xuICAgICAgICAgIC8vcmljaGlhbWEgbGEgZnVuemlvbmUgcmljb3JzaXZhbWVudGUgLi4gYW5kcsOgIGJlbmUgP1xuICAgICAgICAgIGZpbGxGaWx0ZXJJbnB1dHNXaXRoVmFsdWVzKGlucHV0LCBmb3JtSW5wdXRWYWx1ZXMsIGlkeCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHYsIGZ1bmN0aW9uKHYsIGssIG9iaikge1xuICAgICAgICAgICAgLy9jb25zaWRlcm8gbCdpbmRleCBnbG9iYWxlIGluIG1vZG8gY2hlIGlucHV0cyBkaSBvcGVyYXppb25pIGJvb2xlYW5lIGludGVybmVcbiAgICAgICAgICAgIC8vdmVuZ29ubyBjb25zaWRlcmF0ZVxuICAgICAgICAgICAgaW5kZXggPSAoZ2xvYmFsSW5kZXgpID8gZ2xvYmFsSW5kZXggKyBpZHggOiBpZHg7XG4gICAgICAgICAgICBvYmpba10gPSBjb252ZXJ0SW5wdXRWYWx1ZVRvSW5wdXRUeXBlKGZvcm1JbnB1dFZhbHVlc1tpbmRleF0udHlwZSwgZm9ybUlucHV0VmFsdWVzW2luZGV4XS52YWx1ZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBmaWx0ZXJPYmplY3Q7XG59O1xuXG4vL2Nvc3RydXR0b3JlIGRlbCBwYW5uZWxsbyBlIGRlbCBzdW8gY29tcG9uZW50ZSB2dWVcbmZ1bmN0aW9uIFNlYXJjaFBhbmVsKCkge1xuICBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWcgPSB7fTtcbiAgdGhpcy5maWx0ZXIgPSB7fTtcbiAgdGhpcy5pZCA9IG51bGw7XG4gIHRoaXMucXVlcnlsYXllcmlkID0gbnVsbDtcbiAgdGhpcy5JbnRlcm5hbFBhbmVsID0gbmV3IFNlYXJjaFBhbmVsQ29tcG9uZXQoKTtcbiAgLy9mdW56aW9uZSBpbml6aWFsaXp6YXppb25lXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICAgIHRoaXMubmFtZSA9IHRoaXMuY29uZmlnLm5hbWUgfHwgdGhpcy5uYW1lO1xuICAgIHRoaXMuaWQgPSB0aGlzLmNvbmZpZy5pZCB8fCB0aGlzLmlkO1xuICAgIHRoaXMuZmlsdGVyID0gdGhpcy5jb25maWcub3B0aW9ucy5maWx0ZXIgfHwgdGhpcy5maWx0ZXI7XG4gICAgdGhpcy5xdWVyeWxheWVyaWQgPSB0aGlzLmNvbmZpZy5vcHRpb25zLnF1ZXJ5bGF5ZXJpZCB8fCB0aGlzLnF1ZXJ5bGF5ZXJpZDtcbiAgICAvL3ZhZG8gYSByaWVtcGlyZSBnbGkgaW5wdXQgZGVsIGZvcm0gZGVsIHBhbm5lbGxvXG4gICAgdGhpcy5maWxsSW5wdXRzRm9ybUZyb21GaWx0ZXIoKTtcbiAgICAvL2NyZW8gZSBhc3NlZ25vIGwnb2dnZXR0byBmaWx0cm9cbiAgICB2YXIgZmlsdGVyT2JqRnJvbUNvbmZpZyA9IFNlYXJjaFF1ZXJ5U2VydmljZS5jcmVhdGVRdWVyeUZpbHRlckZyb21Db25maWcodGhpcy5maWx0ZXIpO1xuICAgIC8vYWxsYSBmaW5lIGNyZW8gbCdnZ2V0dG8gZmluYWxlIGRlbCBmaWx0cm8gZGEgcGFzc2FyZSBwb2kgYWwgcHJvdmlkZXIgUUdJU1dNUyBvIFdGUyBldGMuLiBjaGUgY29udGllbmUgc2lhXG4gICAgLy9pbCBmaWx0cm8gY2hlIHVybCwgaWwgbm9tZSBkZWwgbGF5ZXIgaWwgdGlwbyBkaSBzZXJ2ZXIgZXRjIC4uXG4gICAgdGhpcy5JbnRlcm5hbFBhbmVsLmZpbHRlck9iamVjdCA9IFNlYXJjaFF1ZXJ5U2VydmljZS5jcmVhdGVRdWVyeUZpbHRlck9iamVjdCh0aGlzLnF1ZXJ5bGF5ZXJpZCwgZmlsdGVyT2JqRnJvbUNvbmZpZyk7XG4gIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgcG9wb2xhIGdsaSBpbnB1dHMgY2hlIGNpIHNhcmFubm8gbmVsIGZvcm0gZGVsIHBhbm5lbGxvIHJpY2VyY2FcbiAgLy9vbHRyZSBjb3N0cnVpcmUgdW4gb2dnZXR0byBjaGUgbGVnaGVyw6AgaSB2YWxvcmkgZGVnbGkgaW5wdXRzIGRlbCBmb3JtIGNvbiBnbGkgb2dnZXR0aVxuICAvLydvcGVyYXppb25hbGknIGRlbCBmaWx0cm9cbiAgdGhpcy5maWxsSW5wdXRzRm9ybUZyb21GaWx0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaWQgPSAwO1xuICAgIHZhciBmb3JtVmFsdWU7XG4gICAgXy5mb3JFYWNoKHRoaXMuZmlsdGVyLGZ1bmN0aW9uKHYsayxvYmopIHtcbiAgICAgIF8uZm9yRWFjaCh2LCBmdW5jdGlvbihpbnB1dCl7XG4gICAgICAgIC8vc2VtcHJlIG51b3ZvIG9nZ2V0dG9cbiAgICAgICAgZm9ybVZhbHVlID0ge307XG4gICAgICAgIC8vaW5zZXJpc2NvIGwnaWQgYWxsJ2lucHV0XG4gICAgICAgIGlucHV0LmlkID0gaWRcbiAgICAgICAgLy9hZ2dpdW5nbyBpbCB0aXBvIGFsIHZhbG9yZSBwZXIgZmFyZSBjb252ZXJzaW9uZSBkYSBzdHJpbmdhIGEgdGlwbyBpbnB1dFxuICAgICAgICBmb3JtVmFsdWUudHlwZSA9IGlucHV0LmlucHV0LnR5cGU7XG4gICAgICAgIC8vLy9URU1QT1JBTkVPICEhISBERVZPIFBSRU5ERVJFIElMIFZFUk8gVkFMT1JFIERJIERFRkFVTFRcbiAgICAgICAgZm9ybVZhbHVlLnZhbHVlID0gbnVsbDtcbiAgICAgICAgLy9wb3BvbG8gZ2xpIGlucHV0czpcblxuICAgICAgICAvLyB2YWxvcmlcbiAgICAgICAgc2VsZi5JbnRlcm5hbFBhbmVsLmZvcm1JbnB1dFZhbHVlcy5wdXNoKGZvcm1WYWx1ZSk7XG4gICAgICAgIC8vaW5wdXRcbiAgICAgICAgc2VsZi5JbnRlcm5hbFBhbmVsLmZvcm1pbnB1dHMucHVzaChpbnB1dCk7XG4gICAgICAgIGlkKz0xO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG59O1xuXG5pbmhlcml0KFNlYXJjaFBhbmVsLCBQYW5lbCk7XG5cbi8vc2VhcmNoIHF1ZXJ5XG5TZWFyY2hRdWVyeVNlcnZpY2Uub24oXCJzZWFyY2hyZXN1bHRzXCIsZnVuY3Rpb24ocmVzdWx0cyl7XG4gIHZhciBsaXN0UGFuZWwgPSBuZXcgTGlzdFBhbmVsKHtcbiAgICBuYW1lOiBcIlJpc3VsdGF0aSByaWNlcmNhXCIsXG4gICAgaWQ6ICdub21pbmF0aW1fcmVzdWx0cycsXG4gICAgbGlzdDogcmVzdWx0cyxcbiAgICBsaXN0UGFuZWxDb21wb25lbnQ6IFNlYXJjaFJlc3VsdFBhbmVsQ29tcG9uZW50XG4gIH0pO1xuICBHVUkuc2hvd0xpc3RpbmcobGlzdFBhbmVsKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaFBhbmVsO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcInNlYXJjaC1yZXN1bHRzXFxcIj5cXG4gIDx0YWJsZSBzdHlsZT1cXFwid2lkdGg6MTAwcHg7XFxcIiBpZD1cXFwic2VhcmNoLXJlc3VsdHMtdGFibGVcXFwiPlxcbiAgICA8dGhlYWQ+XFxuICAgICAgPHRyPlxcbiAgICAgICAgPHRoIHYtZm9yPVxcXCJoZWFkZXIgaW4gc3RhdGUubGlzdC5oZWFkZXJzXFxcIiAgc3R5bGU9XFxcImN1cnNvcjpwb2ludGVyXFxcIj57eyBoZWFkZXIgfX08L3RoPlxcbiAgICAgIDwvdHI+XFxuICAgIDwvdGhlYWQ+XFxuICAgIDx0Ym9keT5cXG4gICAgICA8dHIgdi1mb3I9XFxcInZhbHVlcyBpbiBzdGF0ZS5saXN0LnZhbHVlc1xcXCIgc3R5bGU9XFxcImN1cnNvcjpwb2ludGVyXFxcIj5cXG4gICAgICAgIDx0ZCB2LWZvcj1cXFwidmFsdWUgaW4gdmFsdWVzXFxcIj5cXG4gICAgICAgICAge3sgdmFsdWUgfX1cXG4gICAgICAgIDwvdGQ+XFxuICAgICAgPC90cj5cXG4gICAgPC90Ym9keT5cXG4gIDwvdGFibGU+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgU2VhcmNoUmVzdWx0UGFuZWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vcmVzdWx0cGFuZWwuaHRtbCcpLFxuICBtZXRob2RzOiB7fSxcbiAgY3JlYXRlZDogZnVuY3Rpb24oKXtcbiAgICAkKFwiI3NlYXJjaC1yZXN1bHRzLXRhYmxlXCIpLmZvb3RhYmxlKHtcbiAgICAgIGNhbGN1bGF0ZVdpZHRoT3ZlcnJpZGU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgd2lkdGg6ICQoJyNzZWFyY2gtcmVzdWx0cycpLndpZHRoKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZWFyY2hSZXN1bHRQYW5lbENvbXBvbmVudDtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGlkPVxcXCJnM3ctc2VhcmNoXFxcIiBjbGFzcz1cXFwiZzN3LXNlYXJjaCBnM3ctdG9vbHNcXFwiPlxcbiAgPHVsPlxcbiAgICA8bGkgdi1mb3I9XFxcInNlYXJjaCBpbiBzZWFyY2hlcy5zZWFyY2hcXFwiPlxcbiAgICAgIDxkaXYgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206IDVweDtcXFwiY2xhc3M9XFxcInNlYXJjaC1oZWFkZXIgdG9vbC1oZWFkZXJcXFwiIEBjbGljaz1cXFwic2hvd1NlYXJjaFBhbmVsKHNlYXJjaClcXFwiPlxcbiAgICAgICAgPHNwYW4gc3R5bGU9XFxcIlxcXCI+e3sgc2VhcmNoLm5hbWUgfX08L3NwYW4+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvbGk+XFxuICA8L3VsPlxcbjwvZGl2PlxcblxcblwiO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgbWVyZ2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykubWVyZ2U7XG52YXIgdCA9IHJlcXVpcmUoJ2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnKS50O1xudmFyIHJlc29sdmUgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykucmVzb2x2ZTtcbnZhciBDb21wb25lbnQgPSByZXF1aXJlKCdndWkvdnVlL2NvbXBvbmVudCcpO1xudmFyIEdVSSA9IHJlcXVpcmUoJ2d1aS9ndWknKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIFNlYXJjaFBhbmVsID0gcmVxdWlyZSgnZ3VpL3NlYXJjaC92dWUvcGFuZWwvc2VhcmNocGFuZWwnKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcbnZhciBTZWFyY2hlc1NlcnZpY2UgPSByZXF1aXJlKCdndWkvc2VhcmNoL3NlYXJjaGVzc2VydmljZScpO1xuXG52YXIgdnVlQ29tcG9uZW50T3B0aW9ucyA9IHtcbiAgIHRlbXBsYXRlOiByZXF1aXJlKCcuL3NlYXJjaC5odG1sJyksXG4gICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICBcdHJldHVybiB7XG4gICAgXHQgIHNlYXJjaGVzOiBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCkuc3RhdGVcbiAgICBcdH07XG4gICB9LFxuICAgbWV0aG9kczoge1xuICAgIHNob3dTZWFyY2hQYW5lbDogZnVuY3Rpb24oc2VhcmNoKSB7XG4gICAgICAgIHZhciBwYW5lbCA9IFNlYXJjaGVzU2VydmljZS5zaG93U2VhcmNoUGFuZWwoc2VhcmNoKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIHNlIGxvIHZvZ2xpbyBpc3RhbnppYXJlIG1hbnVhbG1lbnRlXG52YXIgSW50ZXJuYWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHZ1ZUNvbXBvbmVudE9wdGlvbnMpO1xuLy8gc2UgbG8gdm9nbGlvIHVzYXJlIGNvbWUgY29tcG9uZW50ZSBjb21lIGVsZW1lbnRvIGh0bWxcbi8vVnVlLmNvbXBvbmVudCgnZzN3LXNlYXJjaCcsdnVlQ29tcG9uZW50T3B0aW9ucyk7XG5cbi8qIENPTVBPTkVOVEkgRklHTEkgKi9cbi8qIEZJTkUgQ09NUE9ORU5USSBGSUdMSSAqL1xuXG4vKiBJTlRFUkZBQ0NJQSBQVUJCTElDQSAqL1xuZnVuY3Rpb24gU2VhcmNoQ29tcG9uZW50KG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIHRoaXMuaWQgPSBcInNlYXJjaC1jb21wb25lbnRcIjtcbiAgdGhpcy50aXRsZSA9IFwic2VhcmNoXCI7XG4gIHRoaXMuaW50ZXJuYWxDb21wb25lbnQgPSBuZXcgSW50ZXJuYWxDb21wb25lbnQ7XG4gIG1lcmdlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLmluaXRTZXJ2aWNlID0gZnVuY3Rpb24oKSB7XG4gICAgLy9pbml6aWFsaXp6byBpbCBzZXJ2aXppb1xuICAgIFNlYXJjaGVzU2VydmljZS5pbml0KCk7XG4gIH07XG59O1xuXG5pbmhlcml0KFNlYXJjaENvbXBvbmVudCwgQ29tcG9uZW50KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaENvbXBvbmVudDtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuZnVuY3Rpb24gVG9vbHNTZXJ2aWNlKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLl9hY3Rpb25zID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgdG9vbHM6IFtdXG4gIH07XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuc2V0U3RhdGUoKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2V0U3RhdGUgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX21lcmdlVG9vbHModGhpcy5jb25maWcudG9vbHMpO1xuICB9O1xuICBcbiAgdGhpcy5yZWdpc3RlclRvb2xzUHJvdmlkZXIgPSBmdW5jdGlvbihwbHVnaW4pe1xuICAgIHNlbGYuX21lcmdlVG9vbHMocGx1Z2luLmdldFRvb2xzKCkpO1xuICAgIHNlbGYuX2FkZEFjdGlvbnMocGx1Z2luKTtcbiAgfVxuICBcbiAgdGhpcy5maXJlQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uaWQpe1xuICAgIHZhciBwbHVnaW4gPSB0aGlzLl9hY3Rpb25zW2FjdGlvbmlkXTtcbiAgICB2YXIgbWV0aG9kID0gdGhpcy5fYWN0aW9uTWV0aG9kKGFjdGlvbmlkKTtcbiAgICBwbHVnaW5bbWV0aG9kXSgpO1xuICB9O1xuICBcbiAgdGhpcy5fYWN0aW9uTWV0aG9kID0gZnVuY3Rpb24oYWN0aW9uaWQpe1xuICAgIHZhciBuYW1lc3BhY2UgPSBhY3Rpb25pZC5zcGxpdChcIjpcIik7XG4gICAgcmV0dXJuIG5hbWVzcGFjZS5wb3AoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX21lcmdlVG9vbHMgPSBmdW5jdGlvbih0b29scyl7XG4gICAgc2VsZi5zdGF0ZS50b29scyA9IF8uY29uY2F0KHNlbGYuc3RhdGUudG9vbHMsdG9vbHMpO1xuICB9O1xuICBcbiAgdGhpcy5fYWRkQWN0aW9ucyA9IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgXy5mb3JFYWNoKHBsdWdpbi5nZXRUb29scygpLGZ1bmN0aW9uKHRvb2wpe1xuICAgICAgXy5mb3JFYWNoKHBsdWdpbi5nZXRBY3Rpb25zKHRvb2wpLGZ1bmN0aW9uKGFjdGlvbil7XG4gICAgICAgIHNlbGYuX2FjdGlvbnNbYWN0aW9uLmlkXSA9IHBsdWdpbjtcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcbn07XG5cbi8vIE1ha2UgdGhlIHB1YmxpYyBzZXJ2aWNlIGVuIEV2ZW50IEVtaXR0ZXJcbmluaGVyaXQoVG9vbHNTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVG9vbHNTZXJ2aWNlXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiZzN3LXRvb2xzXFxcIj5cXG4gIDx1bD5cXG4gICAgPGxpIHYtZm9yPVxcXCJ0b29sIGluIHRvb2xzXFxcIj5cXG4gICAgICA8ZGl2IGRhdGEtdG9nZ2xlPVxcXCJjb2xsYXBzZVxcXCIgZGF0YS10YXJnZXQ9XFxcIiNpdGVybmV0LXRvb2xzXFxcIiBjbGFzcz1cXFwidG9vbC1oZWFkZXJcXFwiPlxcbiAgICAgICAgPHNwYW4gc3R5bGU9XFxcIlxcXCI+e3sgdG9vbC5uYW1lIH19PC9zcGFuPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgaWQ9XFxcIml0ZXJuZXQtdG9vbHNcXFwiIGNsYXNzPVxcXCJ0b29sLWJveCBjb2xsYXBzZVxcXCI+XFxuICAgICAgICA8dGVtcGxhdGUgdi1mb3I9XFxcImFjdGlvbiBpbiB0b29sLmFjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8aSBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1jb2dcXFwiPjwvaT5cXG4gICAgICAgICAgPHNwYW4gQGNsaWNrPVxcXCJmaXJlQWN0aW9uKGFjdGlvbi5pZClcXFwiPnt7IGFjdGlvbi5uYW1lIH19PC9zcGFuPlxcbiAgICAgICAgPC90ZW1wbGF0ZT5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9saT5cXG4gIDwvdWw+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgdCA9IHJlcXVpcmUoJ2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnKS50O1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgbWVyZ2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykubWVyZ2U7XG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnZ3VpL3Z1ZS9jb21wb25lbnQnKTtcblxudmFyIFRvb2xzU2VydmljZSA9IHJlcXVpcmUoJ2d1aS90b29scy90b29sc3NlcnZpY2UnKTtcblxudmFyIEludGVybmFsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vdG9vbHMuaHRtbCcpLFxuICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLy90b29sczogVG9vbHNTZXJ2aWNlLnN0YXRlLnRvb2xzXG4gICAgICB9XG4gICAgfSxcbiAgICBtZXRob2RzOiB7XG4gICAgICBmaXJlQWN0aW9uOiBmdW5jdGlvbihhY3Rpb25pZCl7XG4gICAgICAgIC8vVG9vbHNTZXJ2aWNlLmZpcmVBY3Rpb24oYWN0aW9uaWQpO1xuICAgICAgfVxuICAgIH1cbn0pO1xuXG5mdW5jdGlvbiBUb29sc0NvbXBvbmVudChvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICB0aGlzLmlkID0gXCJ0b29scy1jb21wb25lbnRcIjtcbiAgdGhpcy50aXRsZSA9IFwidG9vbHNcIjtcbiAgdGhpcy50b29sc1NlcnZpY2UgPSBuZXcgVG9vbHNTZXJ2aWNlKCk7XG4gIG1lcmdlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLmludGVybmFsQ29tcG9uZW50ID0gbmV3IEludGVybmFsQ29tcG9uZW50KHtcbiAgICB0b29sc1NlcnZpY2U6IHRoaXMudG9vbHNTZXJ2aWNlXG4gIH0pO1xufVxuXG5pbmhlcml0KFRvb2xzQ29tcG9uZW50LCBDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xzQ29tcG9uZW50O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjwhLS0gaXRlbSB0ZW1wbGF0ZSAtLT5cXG48ZGl2IGlkPVxcXCJjYXRhbG9nXFxcIiBjbGFzcz1cXFwidGFiYmFibGUtcGFuZWwgY2F0YWxvZ1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJiYWJsZS1saW5lXFxcIj5cXG4gICAgPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXRhYnNcXFwiIHJvbGU9XFxcInRhYmxpc3RcXFwiPlxcbiAgICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIGNsYXNzPVxcXCJhY3RpdmVcXFwiPjxhIGhyZWY9XFxcIiN0cmVlXFxcIiBhcmlhLWNvbnRyb2xzPVxcXCJ0cmVlXFxcIiByb2xlPVxcXCJ0YWJcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0YWJcXFwiIGRhdGEtaTE4bj1cXFwidHJlZVxcXCI+RGF0YTwvYT48L2xpPlxcbiAgICAgIDxsaSB2LWlmPVxcXCJoYXNCYXNlTGF5ZXJzXFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPjxhIGhyZWY9XFxcIiNiYXNlbGF5ZXJzXFxcIiBhcmlhLWNvbnRyb2xzPVxcXCJiYXNlbGF5ZXJzXFxcIiByb2xlPVxcXCJ0YWJcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0YWJcXFwiIGRhdGEtaTE4bj1cXFwiYmFzZWxheWVyc1xcXCI+TGF5ZXIgQmFzZTwvYT48L2xpPlxcbiAgICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPjxhIGhyZWY9XFxcIiNsZWdlbmRcXFwiIGFyaWEtY29udHJvbHM9XFxcImxlZ2VuZFxcXCIgcm9sZT1cXFwidGFiXFxcIiBkYXRhLXRvZ2dsZT1cXFwidGFiXFxcIiBkYXRhLWkxOG49XFxcImxlZ2VuZFxcXCI+TGVnZW5kYTwvYT48L2xpPlxcbiAgICA8L3VsPlxcbiAgICA8ZGl2ICBjbGFzcz1cXFwidGFiLWNvbnRlbnRcXFwiPlxcbiAgICAgIDxkaXYgcm9sZT1cXFwidGFicGFuZWxcXFwiIGNsYXNzPVxcXCJ0YWItcGFuZSBhY3RpdmUgdHJlZVxcXCIgaWQ9XFxcInRyZWVcXFwiPlxcbiAgICAgICAgPHVsIGNsYXNzPVxcXCJ0cmVlLXJvb3RcXFwiPlxcbiAgICAgICAgICA8dHJpc3RhdGUtdHJlZSB2LWlmPVxcXCIhaXNIaWRkZW5cXFwiIDpsYXllcnN0cmVlPVxcXCJsYXllcnN0cmVlXFxcIiBjbGFzcz1cXFwiaXRlbVxcXCIgdi1mb3I9XFxcImxheWVyc3RyZWUgaW4gbGF5ZXJzdHJlZVxcXCI+XFxuICAgICAgICAgIDwvdHJpc3RhdGUtdHJlZT5cXG4gICAgICAgIDwvdWw+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJoYXNCYXNlTGF5ZXJzXFxcIiByb2xlPVxcXCJ0YWJwYW5lbFxcXCIgY2xhc3M9XFxcInRhYi1wYW5lIGJhc2VsYXllcnNcXFwiIGlkPVxcXCJiYXNlbGF5ZXJzXFxcIj5cXG4gICAgICAgIDxmb3JtPlxcbiAgICAgICAgICA8dWw+XFxuICAgICAgICAgICAgPGxpIHYtaWY9XFxcIiFiYXNlbGF5ZXIuZml4ZWRcXFwiIHYtZm9yPVxcXCJiYXNlbGF5ZXIgaW4gYmFzZWxheWVyc1xcXCI+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJyYWRpb1xcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5hbWU9XFxcImJhc2VsYXllclxcXCIgdi1jaGVja2VkPVxcXCJiYXNlbGF5ZXIudmlzaWJsZVxcXCIgQGNsaWNrPVxcXCJzZXRCYXNlTGF5ZXIoYmFzZWxheWVyLmlkKVxcXCI+e3sgYmFzZWxheWVyLnRpdGxlIH19PC9sYWJlbD5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvbGk+XFxuICAgICAgICAgIDwvdWw+XFxuICAgICAgICA8L2Zvcm0+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGxlZ2VuZCA6bGF5ZXJzdHJlZT1cXFwibGF5ZXJzdHJlZVxcXCI+PC9sZWdlbmQ+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBtZXJnZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5tZXJnZTtcbnZhciB0ID0gcmVxdWlyZSgnY29yZS9pMThuL2kxOG4uc2VydmljZScpLnQ7XG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5yZXNvbHZlO1xudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJ2d1aS92dWUvY29tcG9uZW50Jyk7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xuXG52YXIgdnVlQ29tcG9uZW50T3B0aW9ucyA9IHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2F0YWxvZy5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0OiBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KClcbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgbGF5ZXJzdHJlZTogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiB0aGlzLnByb2plY3Quc3RhdGUubGF5ZXJzdHJlZTtcbiAgICB9LFxuICAgIGJhc2VsYXllcnM6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5wcm9qZWN0LnN0YXRlLmJhc2VsYXllcnM7XG4gICAgfSxcbiAgICBoYXNCYXNlTGF5ZXJzOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMucHJvamVjdC5zdGF0ZS5iYXNlbGF5ZXJzLmxlbmd0aD4wO1xuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHNldEJhc2VMYXllcjogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHRoaXMucHJvamVjdC5zZXRCYXNlTGF5ZXIoaWQpO1xuICAgIH1cbiAgfSxcbiAgcmVhZHk6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLiRvbigndHJlZW5vZGV0b29nbGVkJyxmdW5jdGlvbihub2RlKXtcbiAgICAgIHNlbGYucHJvamVjdC50b2dnbGVMYXllcihub2RlKTtcbiAgICB9KTtcblxuICAgIHRoaXMuJG9uKCd0cmVlbm9kZXN0b29nbGVkJyxmdW5jdGlvbihub2RlcyxwYXJlbnRDaGVja2VkKXtcbiAgICAgIHNlbGYucHJvamVjdC50b2dnbGVMYXllcnMobm9kZXMscGFyZW50Q2hlY2tlZCk7XG4gICAgfSk7XG4gIH1cbn1cblxuLy8gc2UgbG8gdm9nbGlvIGlzdGFuemlhcmUgbWFudWFsbWVudGVcbnZhciBJbnRlcm5hbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQodnVlQ29tcG9uZW50T3B0aW9ucyk7XG5cbi8vIHNlIGxvIHZvZ2xpbyB1c2FyZSBjb21lIGNvbXBvbmVudGUgY29tZSBlbGVtZW50byBodG1sXG5WdWUuY29tcG9uZW50KCdnM3ctY2F0YWxvZycsIHZ1ZUNvbXBvbmVudE9wdGlvbnMpO1xuXG5cbi8qIENPTVBPTkVOVEkgRklHTEkgKi9cblxuLy8gdHJlZSBjb21wb25lbnRcblxuXG5WdWUuY29tcG9uZW50KCd0cmlzdGF0ZS10cmVlJywge1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi90cmlzdGF0ZS10cmVlLmh0bWwnKSxcbiAgcHJvcHM6IHtcbiAgICBsYXllcnN0cmVlOiBbXSxcbiAgICAvL2VyZWRpdG8gaWwgbnVtZXJvIGRpIGNoaWxkcyBkYWwgcGFyZW50XG4gICAgbl9wYXJlbnRDaGlsZHMgOiAwLFxuICAgIGNoZWNrZWQ6IGZhbHNlXG4gIH0sXG4gIGRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXhwYW5kZWQ6IHRoaXMubGF5ZXJzdHJlZS5leHBhbmRlZCxcbiAgICAgIHBhcmVudENoZWNrZWQ6IGZhbHNlLFxuICAgICAgLy9wcm9wcmlldGEgY2hlIHNlcnZlIHBlciBmYXJlIGNvbmZyb250byBwZXIgaWwgdHJpc3RhdGVcbiAgICAgIG5fY2hpbGRzOiB0aGlzLmxheWVyc3RyZWUubm9kZXMgPyB0aGlzLmxheWVyc3RyZWUubm9kZXMubGVuZ3RoIDogMFxuICAgIH1cbiAgfSxcbiAgd2F0Y2g6IHtcbiAgICAgICdjaGVja2VkJzogZnVuY3Rpb24gKHZhbCl7XG4gICAgICAgIHRoaXMubGF5ZXJzdHJlZS52aXNpYmxlID0gdmFsO1xuICAgICAgfVxuICB9LFxuICBjb21wdXRlZDoge1xuICAgIGlzRm9sZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaXNGb2xkZXIgPSB0aGlzLm5fY2hpbGRzID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgaWYgKGlzRm9sZGVyKSB7XG4gICAgICAgIHZhciBfdmlzaWJsZUNoaWxkcyA9IDA7XG4gICAgICAgIF8uZm9yRWFjaCh0aGlzLmxheWVyc3RyZWUubm9kZXMsZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgICAgIGlmIChsYXllci52aXNpYmxlKXtcbiAgICAgICAgICAgIF92aXNpYmxlQ2hpbGRzICs9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5uX3BhcmVudENoaWxkcyA9IHRoaXMubl9jaGlsZHMgLSBfdmlzaWJsZUNoaWxkcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBpc0ZvbGRlclxuICAgIH0sXG4gICAgaXNIaWRkZW46IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubGF5ZXJzdHJlZS5oaWRkZW4gJiYgKHRoaXMubGF5ZXJzdHJlZS5oaWRkZW4gPT09IHRydWUpO1xuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHRvZ2dsZTogZnVuY3Rpb24gKGNoZWNrQWxsTGF5ZXJzKSB7XG4gICAgICB2YXIgY2hlY2tBbGwgPSBjaGVja0FsbExheWVycyA9PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG4gICAgICBpZiAodGhpcy5pc0ZvbGRlciAmJiAhY2hlY2tBbGwpIHtcbiAgICAgICAgdGhpcy5sYXllcnN0cmVlLmV4cGFuZGVkID0gIXRoaXMubGF5ZXJzdHJlZS5leHBhbmRlZDtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGNoZWNrQWxsKXtcbiAgICAgICAgaWYgKHRoaXMucGFyZW50Q2hlY2tlZCAmJiAhdGhpcy5uX3BhcmVudENoaWxkcyl7XG4gICAgICAgICAgdGhpcy5wYXJlbnRDaGVja2VkID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5wYXJlbnRDaGVja2VkICYmIHRoaXMubl9wYXJlbnRDaGlsZHMpIHtcbiAgICAgICAgICB0aGlzLnBhcmVudENoZWNrZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMucGFyZW50Q2hlY2tlZCA9ICF0aGlzLnBhcmVudENoZWNrZWQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kZGlzcGF0Y2goJ3RyZWVub2Rlc3Rvb2dsZWQnLHRoaXMubGF5ZXJzdHJlZS5ub2Rlcyx0aGlzLnBhcmVudENoZWNrZWQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuJGRpc3BhdGNoKCd0cmVlbm9kZXRvb2dsZWQnLHRoaXMubGF5ZXJzdHJlZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICB0cmlDbGFzczogZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCF0aGlzLm5fcGFyZW50Q2hpbGRzKSB7XG4gICAgICAgIHJldHVybiAnZmEtY2hlY2stc3F1YXJlLW8nO1xuICAgICAgfSBlbHNlIGlmICgodGhpcy5uX3BhcmVudENoaWxkcyA+IDApICYmICh0aGlzLm5fcGFyZW50Q2hpbGRzIDwgdGhpcy5uX2NoaWxkcykpIHtcbiAgICAgICAgcmV0dXJuICdmYS1zcXVhcmUnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICdmYS1zcXVhcmUtbyc7XG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuXG5WdWUuY29tcG9uZW50KCdsZWdlbmQnLHtcbiAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9sZWdlbmQuaHRtbCcpLFxuICAgIHByb3BzOiBbJ2xheWVyc3RyZWUnXSxcbiAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIC8vZGF0YSBxdWlcbiAgICAgIH1cbiAgICB9LFxuICAgIGNvbXB1dGVkOiB7XG4gICAgICB2aXNpYmxlbGF5ZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgX3Zpc2libGVsYXllcnMgPSBbXTtcbiAgICAgICAgdmFyIGxheWVyc3RyZWUgPSB0aGlzLmxheWVyc3RyZWU7XG4gICAgICAgIGZ1bmN0aW9uIHRyYXZlcnNlKG9iail7XG4gICAgICAgIF8uZm9ySW4ob2JqLCBmdW5jdGlvbiAobGF5ZXIsIGtleSkge1xuICAgICAgICAgICAgICAvL3ZlcmlmaWNhIGNoZSBpbCB2YWxvcmUgZGVsbCdpZCBub24gc2lhIG51bGxvXG4gICAgICAgICAgICAgIGlmICghXy5pc05pbChsYXllci5pZCkgJiYgbGF5ZXIudmlzaWJsZSkge1xuICAgICAgICAgICAgICAgICAgX3Zpc2libGVsYXllcnMucHVzaChsYXllcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCFfLmlzTmlsKGxheWVyLm5vZGVzKSkge1xuICAgICAgICAgICAgICAgICAgdHJhdmVyc2UobGF5ZXIubm9kZXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJhdmVyc2UobGF5ZXJzdHJlZSk7XG4gICAgICAgIHJldHVybiBfdmlzaWJsZWxheWVycztcbiAgICAgIH1cbiAgICB9LFxuICAgIHdhdGNoOiB7XG4gICAgICAnbGF5ZXJzdHJlZSc6IHtcbiAgICAgICAgaGFuZGxlcjogZnVuY3Rpb24odmFsLCBvbGQpe1xuICAgICAgICAgIC8vY29kaWNlIHF1aVxuICAgICAgICB9LFxuICAgICAgICBkZWVwOiB0cnVlXG4gICAgICB9XG4gICAgfSxcbiAgICByZWFkeTogZnVuY3Rpb24oKSB7XG4gICAgICAvL2NvZGljZSBxdWlcbiAgICB9XG59KTtcblxuVnVlLmNvbXBvbmVudCgnbGVnZW5kLWl0ZW0nLHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vbGVnZW5kX2l0ZW0uaHRtbCcpLFxuICBwcm9wczogWydsYXllciddLFxuICBjb21wdXRlZDoge1xuICAgIGxlZ2VuZHVybDogZnVuY3Rpb24oKXtcbiAgICAgIC8vIGluIGF0dGVzYSBkaSByaXNvbHZlcmUgbG8gc2NoaWFudG8gZGkgUUdTSSBTZXJ2ZXIuLi5cbiAgICAgIC8vcmV0dXJuIFwiaHR0cDovL2xvY2FsaG9zdC9jZ2ktYmluL3FnaXNfbWFwc2Vydi5mY2dpP21hcD0vaG9tZS9naW9oYXBweS9TY3JpdmFuaWEvRGV2L0czVy9nM3ctY2xpZW50L3Rlc3QvcHJvZ2V0dG8vdGVzdC5xZ3MmU0VSVklDRT1XTVMmVkVSU0lPTj0xLjMuMCZSRVFVRVNUPUdldExlZ2VuZEdyYXBoaWMmRk9STUFUPWltYWdlL3BuZyZMQVlFUlRJVExFPUZhbHNlJklURU1GT05UU0laRT0xMCZMQVlFUj1cIit0aGlzLmxheWVyLm5hbWU7XG4gICAgICByZXR1cm4gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpLmdldExlZ2VuZFVybCh0aGlzLmxheWVyKTtcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICAvLyBlc2VtcGlvIHV0aWxpenpvIGRlbCBzZXJ2aXppbyBHVUlcbiAgICBvcGVuZm9ybTogZnVuY3Rpb24oKXtcbiAgICAgIC8vR1VJLm5vdGlmeS5zdWNjZXNzKFwiQXBybyB1biBmb3JtXCIpO1xuICAgICAgLy9HVUkuc2hvd0Zvcm0oKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vKiBGSU5FIENPTVBPTkVOVEkgRklHTEkgKi9cblxuLyogSU5URVJGQUNDSUEgUFVCQkxJQ0EgKi9cbmZ1bmN0aW9uIENhdGFsb2dDb21wb25lbnQob3B0aW9ucyl7XG4gIHRoaXMuaWQgPSBcImNhdGFsb2ctY29tcG9uZW50XCI7XG4gIHRoaXMudGl0bGUgPSBcImNhdGFsb2dcIjtcbiAgdGhpcy5pbnRlcm5hbENvbXBvbmVudCA9IG5ldyBJbnRlcm5hbENvbXBvbmVudDtcbiAgLy9tZXJnaW8gb3B6aW9uaSBjb24gcHJvcHJpdMOgIGRpIGRlZmF1bHQgZGVsIGNvbXBvbmVudGVcbiAgbWVyZ2UodGhpcywgb3B0aW9ucyk7XG59XG5cbmluaGVyaXQoQ2F0YWxvZ0NvbXBvbmVudCwgQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYXRhbG9nQ29tcG9uZW50O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgcm9sZT1cXFwidGFicGFuZWxcXFwiIGNsYXNzPVxcXCJ0YWItcGFuZVxcXCIgaWQ9XFxcImxlZ2VuZFxcXCI+XFxuICA8bGVnZW5kLWl0ZW0gOmxheWVyPVxcXCJsYXllclxcXCIgdi1mb3I9XFxcImxheWVyIGluIHZpc2libGVsYXllcnNcXFwiPjwvbGVnZW5kLWl0ZW0+XFxuPC9kaXY+XFxuXCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBAY2xpY2s9XFxcIm9wZW5mb3JtKClcXFwiPnt7IGxheWVyLnRpdGxlIH19PC9kaXY+XFxuPGRpdj48aW1nIDpzcmM9XFxcImxlZ2VuZHVybFxcXCI+PC9kaXY+XFxuXCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGxpIGNsYXNzPVxcXCJ0cmVlLWl0ZW1cXFwiPlxcbiAgPHNwYW4gOmNsYXNzPVxcXCJ7Ym9sZDogaXNGb2xkZXIsICdmYS1jaGV2cm9uLWRvd24nOiBsYXllcnN0cmVlLmV4cGFuZGVkLCAnZmEtY2hldnJvbi1yaWdodCc6ICFsYXllcnN0cmVlLmV4cGFuZGVkfVxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVcXFwiIHYtaWY9XFxcImlzRm9sZGVyXFxcIiBjbGFzcz1cXFwiZmFcXFwiPjwvc3Bhbj5cXG4gIDxzcGFuIHYtaWY9XFxcImlzRm9sZGVyXFxcIiBAY2xpY2s9XFxcInRvZ2dsZSgndHJ1ZScpXFxcIiA6Y2xhc3M9XFxcIlt0cmlDbGFzcygpXVxcXCIgY2xhc3M9XFxcImZhXFxcIj48L3NwYW4+XFxuICA8c3BhbiB2LWVsc2UgQGNsaWNrPVxcXCJ0b2dnbGVcXFwiIDpjbGFzcz1cXFwiW2xheWVyc3RyZWUudmlzaWJsZSAgPyAnZmEtY2hlY2stc3F1YXJlLW8nOiAnZmEtc3F1YXJlLW8nLGxheWVyc3RyZWUuZGlzYWJsZWQgID8gJ2Rpc2FibGVkJzogJyddXFxcIiBjbGFzcz1cXFwiZmFcXFwiIHN0eWxlPVxcXCJjdXJzb3I6ZGVmYXVsdFxcXCI+PC9zcGFuPlxcbiAgPHNwYW4gOmNsYXNzPVxcXCJ7Ym9sZDogaXNGb2xkZXIsIGRpc2FibGVkOiBsYXllcnN0cmVlLmRpc2FibGVkfVxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVcXFwiPnt7bGF5ZXJzdHJlZS50aXRsZX19PC9zcGFuPlxcbiAgPHVsIHYtc2hvdz1cXFwibGF5ZXJzdHJlZS5leHBhbmRlZFxcXCIgdi1pZj1cXFwiaXNGb2xkZXJcXFwiPlxcbiAgICA8dHJpc3RhdGUtdHJlZSA6bl9wYXJlbnQtY2hpbGRzLnN5bmM9XFxcIm5fcGFyZW50Q2hpbGRzXFxcIiA6bGF5ZXJzdHJlZT1cXFwibGF5ZXJzdHJlZVxcXCIgOmNoZWNrZWQ9XFxcInBhcmVudENoZWNrZWRcXFwiIHYtZm9yPVxcXCJsYXllcnN0cmVlIGluIGxheWVyc3RyZWUubm9kZXNcXFwiPlxcbiAgICA8L3RyaXN0YXRlLXRyZWU+XFxuICA8L3VsPlxcbjwvbGk+XFxuXFxuXFxuXFxuXFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciByZXNvbHZlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlc29sdmU7XG52YXIgcmVqZWN0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlamVjdDtcbnZhciBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnZ3VpL2NvbXBvbmVudCcpO1xuXG52YXIgQ29tcG9uZW50ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG59O1xuXG5pbmhlcml0KENvbXBvbmVudCwgQmFzZUNvbXBvbmVudCk7XG5cbnZhciBwcm90byA9IENvbXBvbmVudC5wcm90b3R5cGU7XG5cbi8vIHZpZW5lIHJpY2hpYW1hdG8gZGFsbGEgdG9vbGJhciBxdWFuZG8gaWwgcGx1Z2luIGNoaWVkZSBkaSBtb3N0cmFyZSB1biBwcm9wcmlvIHBhbm5lbGxvIG5lbGxhIEdVSSAoR1VJLnNob3dQYW5lbClcbnByb3RvLm1vdW50ID0gZnVuY3Rpb24ocGFyZW50KXtcbiAgdGhpcy5pbnRlcm5hbENvbXBvbmVudC4kbW91bnQocGFyZW50KTtcbiAgcmV0dXJuIHJlc29sdmUodHJ1ZSk7XG59O1xuXG4vLyByaWNoaWFtYXRvIHF1YW5kbyBsYSBHVUkgY2hpZWRlIGRpIGNoaXVkZXJlIGlsIHBhbm5lbGxvLiBTZSByaXRvcm5hIGZhbHNlIGlsIHBhbm5lbGxvIG5vbiB2aWVuZSBjaGl1c29cbnByb3RvLnVubW91bnQgPSBmdW5jdGlvbigpe1xuICB0aGlzLmludGVybmFsQ29tcG9uZW50LiRkZXN0cm95KHRydWUpO1xuICB0aGlzLmludGVybmFsQ29tcG9uZW50ID0gbnVsbDtcbiAgcmV0dXJuIHJlc29sdmUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxmb3JtIGNsYXNzPVxcXCJuYXZiYXItZm9ybVxcXCIgcm9sZT1cXFwic2VhcmNoXFxcIiBAc3VibWl0LnByZXZlbnQ+XFxuICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1ncm91cFxcXCI+XFxuICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiA6cGxhY2Vob2xkZXI9XFxcInBsYWNlaG9sZGVyXFxcIiB2LW1vZGVsPVxcXCJxdWVyeVxcXCIgIG5hbWU9XFxcInNyY2gtdGVybVxcXCIgaWQ9XFxcInNyY2gtdGVybVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWdyb3VwLWJ0blxcXCI+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiIHR5cGU9XFxcInN1Ym1pdFxcXCIgQGNsaWNrPVxcXCJzZWFyY2hcXFwiPjxpIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXNlYXJjaFxcXCI+PC9pPjwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZm9ybT5cXG5cIjtcbiIsInZhciB0ID0gcmVxdWlyZSgnY29yZS9pMThuL2kxOG4uc2VydmljZScpLnQ7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIEdlb2NvZGluZ1NlcnZpY2UgPSByZXF1aXJlKCcuL2dlb2NvZGluZ3NlcnZpY2UnKTtcblxuVnVlLmNvbXBvbmVudChcImdlb2NvZGVyXCIse1xuICB0ZW1wbGF0ZTogcmVxdWlyZShcIi4vZ2VvY29kaW5nLmh0bWxcIiksXG4gIHByb3BzOiBbJ3R5cGUnXSxcbiAgZGF0YTogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4ge1xuICAgICAgcXVlcnk6IFwiXCIsXG4gICAgICBwbGFjZWhvbGRlcjogdChcInN0cmVldF9zZWFyY2hcIilcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBzZWFyY2g6IGZ1bmN0aW9uKGUpe1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdmFyIHF1ZXJ5ID0gdGhpcy5xdWVyeTtcbiAgICAgIHRoaXMuc2VydmljZS5zZWFyY2gocXVlcnkpO1xuICAgIH1cbiAgfSxcbiAgcmVhZHk6IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuc2VydmljZSA9IEdlb2NvZGluZ1NlcnZpY2VbdGhpcy50eXBlXTtcbiAgICB0aGlzLnNlcnZpY2Uub24oXCJyZXN1bHRzXCIsZnVuY3Rpb24oKXtcbiAgICAgIHNlbGYucXVlcnkgPSBcIlwiO1xuICAgIH0pXG4gIH1cbn0pO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzcmVnaXN0cnknKTtcbnZhciBNYXBTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9tYXAvbWFwc2VydmljZScpO1xuXG5mdW5jdGlvbiBOb21pbmF0aW0oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnVybCA9IFwiaHR0cDovL25vbWluYXRpbS5vcGVuc3RyZWV0bWFwLm9yZ1wiO1xuICBcbiAgdGhpcy5zZWFyY2ggPSBmdW5jdGlvbihxdWVyeSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBleHRlbnQgPSBNYXBTZXJ2aWNlLmV4dGVudFRvV0dTODQoUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpLnN0YXRlLmV4dGVudCk7XG4gICAgYmJveHN0cmluZyA9IF8uam9pbihleHRlbnQsJywnKTtcbiAgICB2YXIgc2VhcmNoVXJsID0gdGhpcy51cmwrXCIvc2VhcmNoP3ZpZXdib3hsYnJ0PVwiK2Jib3hzdHJpbmcrXCImYm91bmRlZD0xJmZvcm1hdD1qc29uJnBvbHlnb25fZ2VvanNvbj0xJnE9XCIrcXVlcnk7XG4gICAgJC5nZXQoc2VhcmNoVXJsLGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICBzZWxmLmVtaXQoXCJyZXN1bHRzXCIscmVzdWx0LHF1ZXJ5KTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIGJhc2UodGhpcyk7XG59XG5pbmhlcml0KE5vbWluYXRpbSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgTm9taW5hdGltOiBuZXcgTm9taW5hdGltXG59O1xuIiwidmFyIGczdyA9IGczdyB8fCB7fTtcblxuZzN3LmNvcmUgPSB7XG4gICBHM1dPYmplY3Q6IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0JyksXG4gICB1dGlsczogcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLFxuICAgQXBwbGljYXRpb25TZXJ2aWNlOiByZXF1aXJlKCdjb3JlL2FwcGxpY2F0aW9uc2VydmljZScpLFxuICAgQXBpU2VydmljZTogcmVxdWlyZSgnY29yZS9hcGlzZXJ2aWNlJyksXG4gICBSb3V0ZXI6IHJlcXVpcmUoJ2NvcmUvcm91dGVyJyksXG4gICBQcm9qZWN0c1JlZ2lzdHJ5OiByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpLFxuICAgUHJvamVjdDogcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3QnKSxcbiAgIE1hcFF1ZXJ5U2VydmljZTogcmVxdWlyZSgnY29yZS9tYXAvbWFwcXVlcnlzZXJ2aWNlJyksXG4gICBNYXBMYXllcjogcmVxdWlyZSgnY29yZS9tYXAvbWFwbGF5ZXInKSxcbiAgIExheWVyU3RhdGU6IHJlcXVpcmUoJ2NvcmUvbGF5ZXIvbGF5ZXJzdGF0ZScpLFxuICAgVmVjdG9yTGF5ZXI6IHJlcXVpcmUoJ2NvcmUvbGF5ZXIvdmVjdG9ybGF5ZXInKSxcbiAgIFdtc0xheWVyOiByZXF1aXJlKCdjb3JlL2xheWVyL3dtc2xheWVyJyksXG4gICBHZW9tZXRyeTogcmVxdWlyZSgnY29yZS9nZW9tZXRyeS9nZW9tZXRyeScpLFxuICAgZ2VvbTogcmVxdWlyZSgnY29yZS9nZW9tZXRyeS9nZW9tJyksXG4gICBQaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbjogcmVxdWlyZSgnY29yZS9pbnRlcmFjdGlvbnMvcGlja2Nvb3JkaW5hdGVzaW50ZXJhY3Rpb24nKSxcbiAgIFBpY2tGZWF0dXJlSW50ZXJhY3Rpb246IHJlcXVpcmUoJ2NvcmUvaW50ZXJhY3Rpb25zL3BpY2tmZWF0dXJlaW50ZXJhY3Rpb24nKSxcbiAgIGkxOG46IHJlcXVpcmUoJ2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnKSxcbiAgIFBsdWdpbjogcmVxdWlyZSgnY29yZS9wbHVnaW4vcGx1Z2luJyksXG4gICBQbHVnaW5zUmVnaXN0cnk6IHJlcXVpcmUoJ2NvcmUvcGx1Z2luL3BsdWdpbnNyZWdpc3RyeScpLFxuICAgUGx1Z2luc1NlcnZpY2U6IHJlcXVpcmUoJ2NvcmUvcGx1Z2luL3BsdWdpbnNzZXJ2aWNlJyksXG59O1xuXG5nM3cuZ3VpID0ge1xuICBndWk6IHJlcXVpcmUoJ2d1aS9ndWknKSxcbiAgdnVlOiB7XG4gICAgR2VvY29kaW5nQ29tcG9uZW50OiByZXF1aXJlKCdndWkvdnVlL2dlb2NvZGluZy9nZW9jb2RpbmcnKSxcbiAgICBTZWFyY2hDb21wb25lbnQ6IHJlcXVpcmUoJ2d1aS9zZWFyY2gvdnVlL3NlYXJjaCcpLFxuICAgIENhdGFsb2dDb21wb25lbnQ6IHJlcXVpcmUoJ2d1aS92dWUvY2F0YWxvZy9jYXRhbG9nJyksXG4gICAgTWFwQ29tcG9uZW50OiByZXF1aXJlKCdndWkvbWFwL3Z1ZS9tYXAnKSxcbiAgICBUb29sc0NvbXBvbmVudDogcmVxdWlyZSgnZ3VpL3Rvb2xzL3Z1ZS90b29scycpXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjb3JlOiBnM3cuY29yZSxcbiAgZ3VpOiBnM3cuZ3VpXG59O1xuIl19
