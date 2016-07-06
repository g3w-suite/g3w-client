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
module.exports = "<!-- item template -->\n<div id=\"catalog\" class=\"tabbable-panel catalog\">\n  <div class=\"tabbable-line\">\n    <ul class=\"nav nav-tabs\" role=\"tablist\">\n      <li role=\"presentation\" class=\"active\"><a href=\"#tree\" aria-controls=\"tree\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"tree\"></a></li>\n      <li v-if=\"hasBaseLayers\" role=\"presentation\"><a href=\"#baselayers\" aria-controls=\"baselayers\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"baselayers\"></a></li>\n      <li role=\"presentation\"><a href=\"#legend\" aria-controls=\"legend\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"legend\"></a></li>\n    </ul>\n    <div  class=\"tab-content\">\n      <div role=\"tabpanel\" class=\"tab-pane active tree\" id=\"tree\">\n        <ul class=\"tree-root\">\n          <tristate-tree :layerstree=\"layerstree\" class=\"item\" v-for=\"layerstree in layerstree\">\n          </tristate-tree>\n        </ul>\n      </div>\n      <div v-if=\"hasBaseLayers\" role=\"tabpanel\" class=\"tab-pane baselayers\" id=\"baselayers\">\n        <form>\n          <ul>\n            <li v-if=\"!baselayer.fixed\" v-for=\"baselayer in baselayers\">\n              <div class=\"radio\">\n                <label><input type=\"radio\" name=\"baselayer\" v-checked=\"baselayer.visible\" @click=\"setBaseLayer(baselayer.id)\">{{ baselayer.title }}</label>\n              </div>\n            </li>\n          </ul>\n        </form>\n      </div>\n      <legend :layerstree=\"layerstree\"></legend>\n    </div>\n  </div>\n</div>\n";

},{}],35:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectService = require('core/project/projectservice').ProjectService;

Vue.component('g3w-catalog',{
    template: require('./catalog.html'),
    data: function() {
      return {
        state: ProjectService.state
      }
    },
    computed: {
      layerstree: function(){
        return this.state.project.layerstree;
      },
      baselayers: function(){
        return this.state.baseLayers;
      },
      hasBaseLayers: function(){
        return this.state.baseLayers.length>0;
      }
    },
    methods: {
      setBaseLayer: function(id) {
        ProjectService.setBaseLayer(id);
      }
    },
    ready: function() {
      //
    }
});

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
        ProjectService.toggleLayers(this.layerstree.nodes,this.parentChecked);
      }
      else {
        ProjectService.toggleLayer(this.layerstree);
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
      return ProjectService.getLegendUrl(this.layer);
    }
  },
  methods: {
    // esempio utilizzo del servizio GUI
    openform: function(){
      //GUI.notify.success("Apro un form");
      //GUI.showForm();
    }
  }
})

},{"./catalog.html":34,"./legend.html":36,"./legend_item.html":37,"./tristate-tree.html":38,"core/i18n/i18n.service":6,"core/project/projectservice":19,"core/project/projectsregistry":20,"gui/gui":44}],36:[function(require,module,exports){
module.exports = "<div role=\"tabpanel\" class=\"tab-pane\" id=\"legend\">\n  <legend-item :layer=\"layer\" v-for=\"layer in visiblelayers\"></legend-item>\n</div>\n";

},{}],37:[function(require,module,exports){
module.exports = "<div @click=\"openform()\">{{ layer.title }}</div>\n<div><img :src=\"legendurl\"></div>\n";

},{}],38:[function(require,module,exports){
module.exports = "<li v-if=\"!isHidden\" class=\"tree-item\">\n  <span :class=\"{bold: isFolder, 'fa-chevron-down': layerstree.expanded, 'fa-chevron-right': !layerstree.expanded}\" @click=\"toggle\" v-if=\"isFolder\" class=\"fa\"></span>\n  <span v-if=\"isFolder\" @click=\"toggle('true')\" :class=\"[triClass()]\" class=\"fa\"></span>\n  <span v-else @click=\"toggle\" :class=\"[layerstree.visible  ? 'fa-check-square-o': 'fa-square-o',layerstree.disabled  ? 'disabled': '']\" class=\"fa\" style=\"cursor:default\"></span>\n  <span :class=\"{bold: isFolder, disabled: layerstree.disabled}\" @click=\"toggle\">{{layerstree.title}}</span>\n  <ul v-show=\"layerstree.expanded\" v-if=\"isFolder\">\n    <tristate-tree :n_parent-childs.sync=\"n_parentChilds\" :layerstree=\"layerstree\" :checked=\"parentChecked\" v-for=\"layerstree in layerstree.nodes\">\n    </tristate-tree>\n  </ul>\n</li>\n\n\n\n";

},{}],39:[function(require,module,exports){
module.exports = "<form class=\"navbar-form\" role=\"search\" @submit.prevent>\n  <div class=\"input-group\">\n    <input type=\"text\" class=\"form-control\" :placeholder=\"placeholder\" v-model=\"query\"  name=\"srch-term\" id=\"srch-term\">\n    <div class=\"input-group-btn\">\n        <button class=\"btn btn-default\" type=\"submit\" @click=\"search\"><i class=\"glyphicon glyphicon-search\"></i></button>\n    </div>\n  </div>\n</form>\n";

},{}],40:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;
var GUI = require('gui/gui');
var GeocodingService = require('gui/components/geocoding/geocodingservice');

Vue.component("geocoder",{
  template: require("gui/components/geocoding/geocoding.html"),
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

},{"core/i18n/i18n.service":6,"gui/components/geocoding/geocoding.html":39,"gui/components/geocoding/geocodingservice":41,"gui/gui":44}],41:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectService = require('core/project/projectservice').ProjectService;
var MapService = require('core/map/mapservice');

function Nominatim(){
  var self = this;
  this.url = "http://nominatim.openstreetmap.org";
  
  this.search = function(query){
    var deferred = $.Deferred();
    var extent = MapService.extentToWGS84(ProjectService.state.project.extent);
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

},{"core/g3wobject":3,"core/map/mapservice":14,"core/project/projectservice":19,"core/utils/utils":22}],42:[function(require,module,exports){
module.exports = "<li>\n<form role=\"form\">\n  <div class=\"box-body\">\n    <div class=\"form-group\">\n      <label for=\"exampleInputEmail1\" style=\"color: white\">Email address</label>\n      <input type=\"email\" class=\"form-control\" id=\"exampleInputEmail1\" placeholder=\"\">\n    </div>\n    <div class=\"form-group\">\n      <button type=\"button\" class=\"btn btn-primary\">Ciao</button>\n    </div>\n  </div>\n</form>\n</li>";

},{}],43:[function(require,module,exports){
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

},{"core/i18n/i18n.service":6,"gui/components/search/search.html":42}],44:[function(require,module,exports){
noop = require('core/utils/utils').noop;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

// rappresenta l'interfaccia globale dell'API della GUI. 
// metodi devono essere implementati (definiti) dall'applicazione ospite
// l'app ospite dovrebbe chiamare anche la funzione GUI.ready() quando la UI è pronta
function GUI(){
  // url delle risorse
  this.getResourcesUrl = noop;
  // show a Vue form
  this.showForm = noop;
  this.closeForm = noop;
  
  // mostra una lista di oggetti (es. lista di risultati)
  this.showListing = noop;
  this.closeListing = noop;
  this.hideListing = noop;

  this.showPanel = noop;
  
  this.ready = function(){
    this.emit('guiready');
  };
  
  this.guiResized = function(){
    this.emit('guiresized');
  };
  
  this.showSpinner = noop; // per mostrare un'icona spinner che notifica un caricamento dati in corso
  this.hideSpinner = noop;
  
  toastr.options.positionClass = 'toast-top-center';
  toastr.options.preventDuplicates = true;
  // proxy della libreria toastr
  this.notify = toastr;
  this.dialog = bootbox;
}
inherit(GUI,G3WObject);

module.exports = new GUI;

},{"core/g3wobject":3,"core/utils/utils":22}],45:[function(require,module,exports){
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
  Geocoding: require('gui/components/geocoding/geocoding'),
  Search: require('gui/components/search/search'),
  Catalog: require('gui/components/catalog/catalog')
};

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

},{"core/apiservice":1,"core/application":2,"core/g3wobject":3,"core/geometry/geom":4,"core/geometry/geometry":5,"core/i18n/i18n.service":6,"core/interactions/pickcoordinatesinteraction":7,"core/interactions/pickfeatureinteraction":8,"core/layer/layerstate":9,"core/layer/vectorlayer":10,"core/layer/wmslayer":11,"core/map/maplayer":12,"core/map/mapqueryservice":13,"core/map/mapservice":14,"core/plugin/plugin":15,"core/plugin/pluginsregistry":16,"core/plugin/pluginsservice":17,"core/plugin/toolsservice":18,"core/project/projectservice":19,"core/project/projectsregistry":20,"core/router":21,"core/utils/utils":22,"gui/components/catalog/catalog":35,"gui/components/geocoding/geocoding":40,"gui/components/search/search":43}]},{},[45])(45)
});


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb3JlL2FwaXNlcnZpY2UuanMiLCJjb3JlL2FwcGxpY2F0aW9uLmpzIiwiY29yZS9nM3dvYmplY3QuanMiLCJjb3JlL2dlb21ldHJ5L2dlb20uanMiLCJjb3JlL2dlb21ldHJ5L2dlb21ldHJ5LmpzIiwiY29yZS9pMThuL2kxOG4uc2VydmljZS5qcyIsImNvcmUvaW50ZXJhY3Rpb25zL3BpY2tjb29yZGluYXRlc2ludGVyYWN0aW9uLmpzIiwiY29yZS9pbnRlcmFjdGlvbnMvcGlja2ZlYXR1cmVpbnRlcmFjdGlvbi5qcyIsImNvcmUvbGF5ZXIvbGF5ZXJzdGF0ZS5qcyIsImNvcmUvbGF5ZXIvdmVjdG9ybGF5ZXIuanMiLCJjb3JlL2xheWVyL3dtc2xheWVyLmpzIiwiY29yZS9tYXAvbWFwbGF5ZXIuanMiLCJjb3JlL21hcC9tYXBxdWVyeXNlcnZpY2UuanMiLCJjb3JlL21hcC9tYXBzZXJ2aWNlLmpzIiwiY29yZS9wbHVnaW4vcGx1Z2luLmpzIiwiY29yZS9wbHVnaW4vcGx1Z2luc3JlZ2lzdHJ5LmpzIiwiY29yZS9wbHVnaW4vcGx1Z2luc3NlcnZpY2UuanMiLCJjb3JlL3BsdWdpbi90b29sc3NlcnZpY2UuanMiLCJjb3JlL3Byb2plY3QvcHJvamVjdHNlcnZpY2UuanMiLCJjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeS5qcyIsImNvcmUvcm91dGVyLmpzIiwiY29yZS91dGlscy91dGlscy5qcyIsImczdy1vbDMvc3JjL2NvbnRyb2xzL2NvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy9pbnRlcmFjdGlvbmNvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy9xdWVyeWNvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy9yZXNldGNvbnRyb2wuanMiLCJnM3ctb2wzL3NyYy9jb250cm9scy96b29tYm94Y29udHJvbC5qcyIsImczdy1vbDMvc3JjL2czdy5vbDMuanMiLCJnM3ctb2wzL3NyYy9sYXllcnMvYmFzZXMuanMiLCJnM3ctb2wzL3NyYy9sYXllcnMvcmFzdGVycy5qcyIsImczdy1vbDMvc3JjL21hcC9tYXBoZWxwZXJzLmpzIiwiZzN3LW9sMy9zcmMvdXRpbHMuanMiLCJndWkvY29tcG9uZW50cy9jYXRhbG9nL2NhdGFsb2cuaHRtbCIsImd1aS9jb21wb25lbnRzL2NhdGFsb2cvY2F0YWxvZy5qcyIsImd1aS9jb21wb25lbnRzL2NhdGFsb2cvbGVnZW5kLmh0bWwiLCJndWkvY29tcG9uZW50cy9jYXRhbG9nL2xlZ2VuZF9pdGVtLmh0bWwiLCJndWkvY29tcG9uZW50cy9jYXRhbG9nL3RyaXN0YXRlLXRyZWUuaHRtbCIsImd1aS9jb21wb25lbnRzL2dlb2NvZGluZy9nZW9jb2RpbmcuaHRtbCIsImd1aS9jb21wb25lbnRzL2dlb2NvZGluZy9nZW9jb2RpbmcuanMiLCJndWkvY29tcG9uZW50cy9nZW9jb2RpbmcvZ2VvY29kaW5nc2VydmljZS5qcyIsImd1aS9jb21wb25lbnRzL3NlYXJjaC9zZWFyY2guaHRtbCIsImd1aS9jb21wb25lbnRzL3NlYXJjaC9zZWFyY2guanMiLCJndWkvZ3VpLmpzIiwiaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciByZWplY3RlZFZhbHVlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlamVjdGVkVmFsdWU7XG5cbmZ1bmN0aW9uIEFwaVNlcnZpY2UoKXtcbiAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgdGhpcy5fYmFzZVVybCA9IG51bGw7XG4gIHRoaXMuX2FwaVVybHMgPSB7fTtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcbiAgICB0aGlzLl9iYXNlVXJsID0gY29uZmlnLnVybHMuYXBpO1xuICAgIHRoaXMuX2FwaUVuZHBvaW50cyA9IGNvbmZpZy51cmxzLmFwaUVuZHBvaW50cztcbiAgfTtcbiAgXG4gIHZhciBob3dNYW55QXJlTG9hZGluZyA9IDA7XG4gIHRoaXMuX2luY3JlbWVudExvYWRlcnMgPSBmdW5jdGlvbigpe1xuICAgIGlmIChob3dNYW55QXJlTG9hZGluZyA9PSAwKXtcbiAgICAgIHRoaXMuZW1pdCgnYXBpcXVlcnlzdGFydCcpO1xuICAgIH1cbiAgICBob3dNYW55QXJlTG9hZGluZyArPSAxO1xuICB9O1xuICBcbiAgdGhpcy5fZGVjcmVtZW50TG9hZGVycyA9IGZ1bmN0aW9uKCl7XG4gICAgaG93TWFueUFyZUxvYWRpbmcgLT0gMTtcbiAgICBpZiAoaG93TWFueUFyZUxvYWRpbmcgPT0gMCl7XG4gICAgICB0aGlzLmVtaXQoJ2FwaXF1ZXJ5ZW5kJyk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5nZXQgPSBmdW5jdGlvbihhcGksb3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgYXBpRW5kUG9pbnQgPSB0aGlzLl9hcGlFbmRwb2ludHNbYXBpXTtcbiAgICBpZiAoYXBpRW5kUG9pbnQpIHtcbiAgICAgIHZhciBjb21wbGV0ZVVybCA9IHRoaXMuX2Jhc2VVcmwgKyAnLycgKyBhcGlFbmRQb2ludDtcbiAgICAgIGlmIChvcHRpb25zLnJlcXVlc3QpIHtcbiAgICAgICAgIGNvbXBsZXRlVXJsID0gY29tcGxldGVVcmwgKyAnLycgKyBvcHRpb25zLnJlcXVlc3Q7XG4gICAgICB9XG4gICAgICB2YXIgcGFyYW1zID0gb3B0aW9ucy5wYXJhbXMgfHwge307XG4gICAgICBcbiAgICAgIHNlbGYuZW1pdChhcGkrJ3F1ZXJ5c3RhcnQnKTtcbiAgICAgIHRoaXMuX2luY3JlbWVudExvYWRlcnMoKTtcbiAgICAgIHJldHVybiAkLmdldChjb21wbGV0ZVVybCxwYXJhbXMpXG4gICAgICAuZG9uZShmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHNlbGYuZW1pdChhcGkrJ3F1ZXJ5ZW5kJyxyZXNwb25zZSk7XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbihlKXtcbiAgICAgICAgc2VsZi5lbWl0KGFwaSsncXVlcnlmYWlsJyxlKTtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9KVxuICAgICAgLmFsd2F5cyhmdW5jdGlvbigpe1xuICAgICAgICBzZWxmLl9kZWNyZW1lbnRMb2FkZXJzKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gcmVqZWN0ZWRWYWx1ZSgpO1xuICAgIH1cbiAgfTtcbiAgXG4gIGJhc2UodGhpcyk7XG59XG5pbmhlcml0KEFwaVNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQXBpU2VydmljZTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgQXBpU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvYXBpc2VydmljZScpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xudmFyIFBsdWdpbnNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcGx1Z2luL3BsdWdpbnNyZWdpc3RyeScpO1xuXG52YXIgQXBwU2VydmljZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5pbml0aWFsaXplZCA9IGZhbHNlO1xuICB0aGlzLl9tb2RhbE92ZXJsYXkgPSBudWxsO1xuICB0aGlzLmNvbmZpZyA9IHt9O1xuXG4gIC8vIGNoaWFtYSBpbCBjb3N0cnV0dG9yZSBkaSBHM1dPYmplY3QgKGNoZSBpbiBxdWVzdG8gbW9tZW50byBub24gZmEgbmllbnRlKVxuICBiYXNlKHRoaXMpO1xufTtcbmluaGVyaXQoQXBwU2VydmljZSxHM1dPYmplY3QpO1xuXG52YXIgcHJvdG8gPSBBcHBTZXJ2aWNlLnByb3RvdHlwZTtcblxucHJvdG8uaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICB0aGlzLl9ib290c3RyYXAoKTtcbn07XG5cbnByb3RvLl9ib290c3RyYXAgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghdGhpcy5pbml0aWFsaXplZCl7XG4gICAgLy9pbml6aWFsaXp6YSBsYSBjb25maWd1cmF6aW9uZSBkZWkgc2Vydml6aS4gT2dudW5nbyBjZXJjaGVyw6AgZGFsIGNvbmZpZyBxdWVsbG8gZGkgY3VpIGF2csOgIGJpc29nbm9cbiAgICAvL3VuYSB2b2x0YSBmaW5pdGEgbGEgY29uZmlndXJhemlvbmUgZW1ldHRvIGwnZXZlbnRvIHJlYWR5LiBBIHF1ZXN0byBwdW50byBwb3Ryw7IgYXZ2aWFyZSBsJ2lzdGFuemEgVnVlIGdsb2JhbGVcbiAgICAkLndoZW4oXG4gICAgICBBcGlTZXJ2aWNlLmluaXQodGhpcy5jb25maWcpLFxuICAgICAgUHJvamVjdHNSZWdpc3RyeS5pbml0KHRoaXMuY29uZmlnKSxcbiAgICAgIFBsdWdpbnNSZWdpc3RyeS5pbml0KHRoaXMuY29uZmlnLnBsdWdpbnMpXG4gICAgKS50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICBzZWxmLmVtaXQoJ3JlYWR5Jyk7XG4gICAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEFwcFNlcnZpY2U7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIG5vb3AgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykubm9vcDtcblxuLyoqXG4gKiBVbiBvZ2dldHRvIGJhc2UgaW4gZ3JhZG8gZGkgZ2VzdGlyZSBldmVudHVhbGkgc2V0dGVyIGUgcmVsYXRpdmEgY2F0ZW5hIGRpIGxpc3RlbmVycy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgRzNXT2JqZWN0ID0gZnVuY3Rpb24oKXtcbiAgaWYgKHRoaXMuc2V0dGVycyl7XG4gICAgdGhpcy5fc2V0dXBMaXN0ZW5lcnNDaGFpbih0aGlzLnNldHRlcnMpO1xuICB9XG59O1xuaW5oZXJpdChHM1dPYmplY3QsRXZlbnRFbWl0dGVyKTtcblxudmFyIHByb3RvID0gRzNXT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBJbnNlcmlzY2UgdW4gbGlzdGVuZXIgZG9wbyBjaGUgw6ggc3RhdG8gZXNlZ3VpdG8gaWwgc2V0dGVyXG4gKiBAcGFyYW0ge3N0cmluZ30gc2V0dGVyIC0gSWwgbm9tZSBkZWwgbWV0b2RvIHN1IGN1aSBzaSBjdW9sZSByZWdpc3RyYXJlIHVuYSBmdW56aW9uZSBsaXN0ZW5lclxuICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXIgLSBVbmEgZnVuemlvbmUgbGlzdGVuZXIgKHNvbG8gc2luY3JvbmEpXG4gKi9cbnByb3RvLm9uYWZ0ZXIgPSBmdW5jdGlvbihzZXR0ZXIsbGlzdGVuZXIpe1xuICByZXR1cm4gdGhpcy5fb25zZXR0ZXIoJ2FmdGVyJyxzZXR0ZXIsbGlzdGVuZXIsZmFsc2UpO1xufTtcblxuLy8gdW4gbGlzdGVuZXIgcHXDsiByZWdpc3RyYXJzaSBpbiBtb2RvIGRhIGVzc2VyZSBlc2VndWl0byBQUklNQSBkZWxsJ2VzZWN1emlvbmUgZGVsIG1ldG9kbyBzZXR0ZXIuIFB1w7Igcml0b3JuYXJlIHRydWUvZmFsc2UgcGVyXG4vLyB2b3RhcmUgYSBmYXZvcmUgbyBtZW5vIGRlbGwnZXNlY3V6aW9uZSBkZWwgc2V0dGVyLiBTZSBub24gcml0b3JuYSBudWxsYSBvIHVuZGVmaW5lZCwgbm9uIHZpZW5lIGNvbnNpZGVyYXRvIHZvdGFudGVcbi8qKlxuICogSW5zZXJpc2NlIHVuIGxpc3RlbmVyIHByaW1hIGNoZSB2ZW5nYSBlc2VndWl0byBpbCBzZXR0ZXIuIFNlIHJpdG9ybmEgZmFsc2UgaWwgc2V0dGVyIG5vbiB2aWVuZSBlc2VndWl0b1xuICogQHBhcmFtIHtzdHJpbmd9IHNldHRlciAtIElsIG5vbWUgZGVsIG1ldG9kbyBzdSBjdWkgc2kgY3VvbGUgcmVnaXN0cmFyZSB1bmEgZnVuemlvbmUgbGlzdGVuZXJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGxpc3RlbmVyIC0gVW5hIGZ1bnppb25lIGxpc3RlbmVyLCBhIGN1aSB2aWVuZSBwYXNzYXRvIHVuYSBmdW56aW9uZSBcIm5leHRcIiBjb21lIHVsdGltbyBwYXJhbWV0cm8sIGRhIHVzYXJlIG5lbCBjYXNvIGRpIGxpc3RlbmVyIGFzaW5jcm9uaVxuICovXG5wcm90by5vbmJlZm9yZSA9IGZ1bmN0aW9uKHNldHRlcixsaXN0ZW5lcil7XG4gIHJldHVybiB0aGlzLl9vbnNldHRlcignYmVmb3JlJyxzZXR0ZXIsbGlzdGVuZXIsZmFsc2UpO1xufTtcblxuLyoqXG4gKiBJbnNlcmlzY2UgdW4gbGlzdGVuZXIgcHJpbWEgY2hlIHZlbmdhIGVzZWd1aXRvIGlsIHNldHRlci4gQWwgbGlzdGVuZXIgdmllbmUgcGFzc2F0byB1bmEgZnVuemlvbmUgXCJuZXh0XCIgY29tZSB1bHRpbW8gcGFyYW1ldHJvLCBkYSBjaGlhbWFyZSBjb24gcGFyYW1ldHJvIHRydWUvZmFsc2UgcGVyIGZhciBwcm9zZWd1aXJlIG8gbWVubyBpbCBzZXR0ZXJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZXR0ZXIgLSBJbCBub21lIGRlbCBtZXRvZG8gc3UgY3VpIHNpIGN1b2xlIHJlZ2lzdHJhcmUgdW5hIGZ1bnppb25lIGxpc3RlbmVyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBsaXN0ZW5lciAtIFVuYSBmdW56aW9uZSBsaXN0ZW5lciwgYSBjdWkgXG4gKi9cbnByb3RvLm9uYmVmb3JlYXN5bmMgPSBmdW5jdGlvbihzZXR0ZXIsbGlzdGVuZXIpe1xuICByZXR1cm4gdGhpcy5fb25zZXR0ZXIoJ2JlZm9yZScsc2V0dGVyLGxpc3RlbmVyLHRydWUpO1xufTtcblxucHJvdG8udW4gPSBmdW5jdGlvbihzZXR0ZXIsa2V5KXtcbiAgXy5mb3JFYWNoKHRoaXMuc2V0dGVyc0xpc3RlbmVycyxmdW5jdGlvbihzZXR0ZXJzTGlzdGVuZXJzLHdoZW4pe1xuICAgIF8uZm9yRWFjaChzZXR0ZXJzTGlzdGVuZXJzW3NldHRlcl0sZnVuY3Rpb24oc2V0dGVyTGlzdGVuZXIpe1xuICAgICAgaWYoc2V0dGVyTGlzdGVuZXIua2V5ID09IGtleSl7XG4gICAgICAgIGRlbGV0ZSBzZXR0ZXJMaXN0ZW5lcjtcbiAgICAgIH1cbiAgICB9KVxuICB9KVxufTtcblxucHJvdG8uX29uc2V0dGVyID0gZnVuY3Rpb24od2hlbixzZXR0ZXIsbGlzdGVuZXIsYXN5bmMpeyAvKndoZW49YmVmb3JlfGFmdGVyLCB0eXBlPXN5bmN8YXN5bmMqL1xuICB2YXIgc2V0dGVyc0xpc3RlbmVycyA9IHRoaXMuc2V0dGVyc0xpc3RlbmVyc1t3aGVuXTtcbiAgdmFyIGxpc3RlbmVyS2V5ID0gXCJcIitNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMTAwMDAwMCkrXCJcIitEYXRlLm5vdygpO1xuICAvKmlmICgod2hlbiA9PSAnYmVmb3JlJykgJiYgIWFzeW5jKXtcbiAgICBsaXN0ZW5lciA9IHRoaXMuX21ha2VDaGFpbmFibGUobGlzdGVuZXIpO1xuICB9Ki9cbiAgc2V0dGVyc0xpc3RlbmVyc1tzZXR0ZXJdLnB1c2goe1xuICAgIGtleTogbGlzdGVuZXJLZXksXG4gICAgZm5jOiBsaXN0ZW5lcixcbiAgICBhc3luYzogYXN5bmNcbiAgfSk7XG4gIHJldHVybiBsaXN0ZW5lcktleTtcbiAgLy9yZXR1cm4gdGhpcy5nZW5lcmF0ZVVuTGlzdGVuZXIoc2V0dGVyLGxpc3RlbmVyS2V5KTtcbn07XG5cbi8vIHRyYXNmb3JtbyB1biBsaXN0ZW5lciBzaW5jcm9ubyBpbiBtb2RvIGRhIHBvdGVyIGVzc2VyZSB1c2F0byBuZWxsYSBjYXRlbmEgZGkgbGlzdGVuZXJzIChyaWNoaWFtYW5kbyBuZXh0IGNvbCB2YWxvcmUgZGkgcml0b3JubyBkZWwgbGlzdGVuZXIpXG4vKnByb3RvLl9tYWtlQ2hhaW5hYmxlID0gZnVuY3Rpb24obGlzdGVuZXIpe1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIC8vIHJpbXVvdm8gbmV4dCBkYWkgcGFyYW1ldHJpIHByaW1hIGRpIGNoaWFtYXJlIGlsIGxpc3RlbmVyXG4gICAgdmFyIG5leHQgPSBhcmdzLnBvcCgpO1xuICAgIHZhciBjYW5TZXQgPSBsaXN0ZW5lci5hcHBseShzZWxmLGFyZ3VtZW50cyk7XG4gICAgdmFyIF9jYW5TZXQgPSB0cnVlO1xuICAgIGlmIChfLmlzQm9vbGVhbihjYW5TZXQpKXtcbiAgICAgIF9jYW5TZXQgPSBjYW5TZXQ7XG4gICAgfVxuICAgIG5leHQoY2FuU2V0KTtcbiAgfVxufTsqL1xuXG5wcm90by5fc2V0dXBMaXN0ZW5lcnNDaGFpbiA9IGZ1bmN0aW9uKHNldHRlcnMpe1xuICAvLyBpbml6aWFsaXp6YSB0dXR0aSBpIG1ldG9kaSBkZWZpbml0aSBuZWxsJ29nZ2V0dG8gXCJzZXR0ZXJzXCIgZGVsbGEgY2xhc3NlIGZpZ2xpYS5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNldHRlcnNMaXN0ZW5lcnMgPSB7XG4gICAgYWZ0ZXI6e30sXG4gICAgYmVmb3JlOnt9XG4gIH07XG4gIC8vIHBlciBvZ25pIHNldHRlciB2aWVuZSBkZWZpbml0byBsJ2FycmF5IGRlaSBsaXN0ZW5lcnMgZSBmaWVuZSBzb3N0aXR1aXRvIGlsIG1ldG9kbyBvcmlnaW5hbGUgY29uIGxhIGZ1bnppb25pIGNoZSBnZXN0aXNjZSBsYSBjb2RhIGRpIGxpc3RlbmVyc1xuICBfLmZvckVhY2goc2V0dGVycyxmdW5jdGlvbihzZXR0ZXJPcHRpb24sc2V0dGVyKXtcbiAgICB2YXIgc2V0dGVyRm5jID0gbm9vcDtcbiAgICB2YXIgc2V0dGVyRmFsbGJhY2sgPSBub29wO1xuICAgIGlmIChfLmlzRnVuY3Rpb24oc2V0dGVyT3B0aW9uKSl7XG4gICAgICBzZXR0ZXJGbmMgPSBzZXR0ZXJPcHRpb25cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZXR0ZXJGbmMgPSBzZXR0ZXJPcHRpb24uZm5jO1xuICAgICAgc2V0dGVyRmFsbGJhY2sgPSBzZXR0ZXJPcHRpb24uZmFsbGJhY2sgfHwgbm9vcDtcbiAgICB9XG4gICAgc2VsZi5zZXR0ZXJzTGlzdGVuZXJzLmFmdGVyW3NldHRlcl0gPSBbXTtcbiAgICBzZWxmLnNldHRlcnNMaXN0ZW5lcnMuYmVmb3JlW3NldHRlcl0gPSBbXTtcbiAgICAvLyBzZXR0ZXIgc29zdGl0dWl0b1xuICAgIHNlbGZbc2V0dGVyXSA9IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIC8vIGVzZWd1byBpIGxpc3RlbmVyIHJlZ2lzdHJhdGkgcGVyIGlsIGJlZm9yZVxuICAgICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgICAgdmFyIHJldHVyblZhbCA9IG51bGw7XG4gICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICB2YXIgY2FuU2V0ID0gdHJ1ZTtcbiAgICAgIFxuICAgICAgLy8gcmljaGlhbWF0YSBhbGxhIGZpbmUgZGVsbGEgY2F0ZW5hIGRpIGxpc3RlbmVyc1xuICAgICAgZnVuY3Rpb24gZG9uZSgpe1xuICAgICAgICBpZihjYW5TZXQpe1xuICAgICAgICAgIC8vIGVzZWd1byBsYSBmdW56aW9uZVxuICAgICAgICAgIHJldHVyblZhbCA9IHNldHRlckZuYy5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIC8vIGUgcmlzb2x2byBsYSBwcm9tZXNzYSAoZXZlbnR1YWxtZW50ZSB1dGlsaXp6YXRhIGRhIGNoaSBoYSBpbnZvY2F0byBpbCBzZXR0ZXJcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJldHVyblZhbCk7XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIGFmdGVyTGlzdGVuZXJzID0gc2VsZi5zZXR0ZXJzTGlzdGVuZXJzLmFmdGVyW3NldHRlcl07XG4gICAgICAgICAgXy5mb3JFYWNoKGFmdGVyTGlzdGVuZXJzLGZ1bmN0aW9uKGxpc3RlbmVyLCBrZXkpe1xuICAgICAgICAgICAgbGlzdGVuZXIuZm5jLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAvLyBzZSBub24gcG9zc28gcHJvc2VndWlyZSBcbiAgICAgICAgICAvLyBjaGlhbW8gbCdldmVudHVhbGUgZnVuemlvbmUgZGkgZmFsbGJhY2tcbiAgICAgICAgICBzZXR0ZXJGYWxsYmFjay5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIC8vIGUgcmlnZXR0byBsYSBwcm9tZXNzYVxuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgXG4gICAgICBmdW5jdGlvbiBjb21wbGV0ZSgpe1xuICAgICAgICAvLyBlc2VndW8gbGEgZnVuemlvbmVcbiAgICAgICAgcmV0dXJuVmFsID0gc2V0dGVyRm5jLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgIC8vIGUgcmlzb2x2byBsYSBwcm9tZXNzYSAoZXZlbnR1YWxtZW50ZSB1dGlsaXp6YXRhIGRhIGNoaSBoYSBpbnZvY2F0byBpbCBzZXR0ZXJcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5WYWwpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGFmdGVyTGlzdGVuZXJzID0gc2VsZi5zZXR0ZXJzTGlzdGVuZXJzLmFmdGVyW3NldHRlcl07XG4gICAgICAgIF8uZm9yRWFjaChhZnRlckxpc3RlbmVycyxmdW5jdGlvbihsaXN0ZW5lciwga2V5KXtcbiAgICAgICAgICBsaXN0ZW5lci5mbmMuYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gYWJvcnQoKXtcbiAgICAgICAgICAvLyBzZSBub24gcG9zc28gcHJvc2VndWlyZSAuLi5cbiAgICAgICAgICAvLyBjaGlhbW8gbCdldmVudHVhbGUgZnVuemlvbmUgZGkgZmFsbGJhY2tcbiAgICAgICAgICBzZXR0ZXJGYWxsYmFjay5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgIC8vIGUgcmlnZXR0byBsYSBwcm9tZXNzYVxuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfVxuICAgICAgXG4gICAgICB2YXIgYmVmb3JlTGlzdGVuZXJzID0gdGhpcy5zZXR0ZXJzTGlzdGVuZXJzWydiZWZvcmUnXVtzZXR0ZXJdO1xuICAgICAgLy8gY29udGF0b3JlIGRlaSBsaXN0ZW5lciBjaGUgdmVycsOgIGRlY3JlbWVudGF0byBhZCBvZ25pIGNoaWFtYXRhIGEgbmV4dCgpXG4gICAgICBjb3VudGVyID0gMDtcbiAgICAgIFxuICAgICAgLy8gZnVuemlvbmUgcGFzc2F0YSBjb21lIHVsdGltbyBwYXJhbWV0cm8gYWkgbGlzdGVuZXJzLCBjaGUgKioqU0UgU09OTyBTVEFUSSBBR0dJVU5USSBDT01FIEFTSU5DUk9OSSBsYSBERVZPTk8qKiogcmljaGlhbWFyZSBwZXIgcG90ZXIgcHJvc2VndWlyZSBsYSBjYXRlbmFcbiAgICAgIGZ1bmN0aW9uIG5leHQoYm9vbCl7XG4gICAgICAgIHZhciBjb250ID0gdHJ1ZTtcbiAgICAgICAgaWYgKF8uaXNCb29sZWFuKGJvb2wpKXtcbiAgICAgICAgICBjb250ID0gYm9vbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgX2FyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzKTtcbiAgICAgICAgLy8gc2UgbGEgY2F0ZW5hIMOoIHN0YXRhIGJsb2NjYXRhIG8gc2Ugc2lhbW8gYXJyaXZhdGkgYWxsYSBmaW5lIGRlaSBiZWZvcmVsaXN0ZW5lcnNcbiAgICAgICAgaWYgKGNvbnQgPT09IGZhbHNlIHx8IChjb3VudGVyID09IGJlZm9yZUxpc3RlbmVycy5sZW5ndGgpKXtcbiAgICAgICAgICBpZihjb250ID09PSBmYWxzZSlcbiAgICAgICAgICAgIGFib3J0LmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbXBsZXRlZCA9IGNvbXBsZXRlLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgICAgICBpZihfLmlzVW5kZWZpbmVkKGNvbXBsZXRlZCkgfHwgY29tcGxldGVkID09PSB0cnVlKXtcbiAgICAgICAgICAgICAgc2VsZi5lbWl0RXZlbnQoJ3NldDonK3NldHRlcixhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKGNvbnQpe1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyRm5jID0gYmVmb3JlTGlzdGVuZXJzW2NvdW50ZXJdLmZuYztcbiAgICAgICAgICAgIGlmIChiZWZvcmVMaXN0ZW5lcnNbY291bnRlcl0uYXN5bmMpe1xuICAgICAgICAgICAgICAvLyBhZ2dpdW5nbyBuZXh0IGNvbWUgdWxpdG1vIHBhcmFtZXRyb1xuICAgICAgICAgICAgICBfYXJncy5wdXNoKG5leHQpO1xuICAgICAgICAgICAgICBjb3VudGVyICs9IDE7XG4gICAgICAgICAgICAgIGxpc3RlbmVyRm5jLmFwcGx5KHNlbGYsX2FyZ3MpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIF9jb250ID0gbGlzdGVuZXJGbmMuYXBwbHkoc2VsZixfYXJncyk7XG4gICAgICAgICAgICAgIGNvdW50ZXIgKz0gMTtcbiAgICAgICAgICAgICAgbmV4dChfY29udCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIG5leHQoKTtcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgfVxuICB9KVxufTtcblxuLypcbnByb3RvLmdlbmVyYXRlVW5MaXN0ZW5lciA9IGZ1bmN0aW9uKHNldHRlcnNMaXN0ZW5lcnMsc2V0dGVyLGxpc3RlbmVyS2V5KXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICBzZXR0ZXJzTGlzdGVuZXJzW3NldHRlcl1bbGlzdGVuZXJLZXldID0gbnVsbDtcbiAgICBkZWxldGUgc2V0dGVyc0xpc3RlbmVyc1tzZXR0ZXJdW2xpc3RlbmVyS2V5XTtcbiAgfVxufTtcbiovXG5cbm1vZHVsZS5leHBvcnRzID0gRzNXT2JqZWN0O1xuIiwidmFyIGdlb20gPSB7XG4gIGRpc3RhbmNlOiBmdW5jdGlvbihjMSxjMil7XG4gICAgcmV0dXJuIE1hdGguc3FydChnZW9tLnNxdWFyZWREaXN0YW5jZShjMSxjMikpO1xuICB9LFxuICBzcXVhcmVkRGlzdGFuY2U6IGZ1bmN0aW9uKGMxLGMyKXtcbiAgICB2YXIgeDEgPSBjMVswXTtcbiAgICB2YXIgeTEgPSBjMVsxXTtcbiAgICB2YXIgeDIgPSBjMlswXTtcbiAgICB2YXIgeTIgPSBjMlsxXTtcbiAgICB2YXIgZHggPSB4MiAtIHgxO1xuICAgIHZhciBkeSA9IHkyIC0geTE7XG4gICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xuICB9LFxuICBjbG9zZXN0T25TZWdtZW50OiBmdW5jdGlvbihjb29yZGluYXRlLCBzZWdtZW50KSB7XG4gICAgdmFyIHgwID0gY29vcmRpbmF0ZVswXTtcbiAgICB2YXIgeTAgPSBjb29yZGluYXRlWzFdO1xuICAgIHZhciBzdGFydCA9IHNlZ21lbnRbMF07XG4gICAgdmFyIGVuZCA9IHNlZ21lbnRbMV07XG4gICAgdmFyIHgxID0gc3RhcnRbMF07XG4gICAgdmFyIHkxID0gc3RhcnRbMV07XG4gICAgdmFyIHgyID0gZW5kWzBdO1xuICAgIHZhciB5MiA9IGVuZFsxXTtcbiAgICB2YXIgZHggPSB4MiAtIHgxO1xuICAgIHZhciBkeSA9IHkyIC0geTE7XG4gICAgdmFyIGFsb25nID0gKGR4ID09PSAwICYmIGR5ID09PSAwKSA/IDAgOlxuICAgICAgICAoKGR4ICogKHgwIC0geDEpKSArIChkeSAqICh5MCAtIHkxKSkpIC8gKChkeCAqIGR4ICsgZHkgKiBkeSkgfHwgMCk7XG4gICAgdmFyIHgsIHk7XG4gICAgaWYgKGFsb25nIDw9IDApIHtcbiAgICAgIHggPSB4MTtcbiAgICAgIHkgPSB5MTtcbiAgICB9IGVsc2UgaWYgKGFsb25nID49IDEpIHtcbiAgICAgIHggPSB4MjtcbiAgICAgIHkgPSB5MjtcbiAgICB9IGVsc2Uge1xuICAgICAgeCA9IHgxICsgYWxvbmcgKiBkeDtcbiAgICAgIHkgPSB5MSArIGFsb25nICogZHk7XG4gICAgfVxuICAgIHJldHVybiBbeCwgeV07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZW9tO1xuIiwidmFyIEdlb21ldHJ5ID0ge307XG5cbkdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMgPSB7XG4gIFBPSU5UOiBcIlBvaW50XCIsXG4gIE1VTFRJUE9JTlQ6IFwiTXVsdGlQb2ludFwiLFxuICBMSU5FU1RSSU5HOiBcIkxpbmVcIiwgLy8gcGVyIHNlZ3VpcmUgbGEgZGVmaW5pemlvbmUgZGkgUUdpcy5HZW9tZXRyeVR5cGUsIGNoZSBkZWZpbmlzY2UgTGluZSBpbnZlY2UgZGkgTGluZXN0cmluZy5cbiAgTVVMVElMSU5FU1RSSU5HOiBcIk11bHRpTGluZVwiLFxuICBQT0xZR09OOiBcIlBvbHlnb25cIixcbiAgTVVMVElQT0xZR09OOiBcIk11bHRpUG9seWdvblwiLFxuICBHRU9NRVRSWUNPTExFQ1RJT046IFwiR2VvbWV0cnlDb2xsZWN0aW9uXCJcbn07XG5cbkdlb21ldHJ5LlN1cHBvcnRlZEdlb21ldHJ5VHlwZXMgPSBbXG4gIEdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMuUE9JTlQsXG4gIEdlb21ldHJ5Lkdlb21ldHJ5VHlwZXMuTVVMVElQT0lOVCxcbiAgR2VvbWV0cnkuR2VvbWV0cnlUeXBlcy5MSU5FU1RSSU5HLFxuICBHZW9tZXRyeS5HZW9tZXRyeVR5cGVzLk1VTFRJTElORVNUUklORyxcbiAgR2VvbWV0cnkuR2VvbWV0cnlUeXBlcy5QT0xZR09OLFxuICBHZW9tZXRyeS5HZW9tZXRyeVR5cGVzLk1VTFRJUE9MWUdPTlxuXVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdlb21ldHJ5O1xuIiwiZnVuY3Rpb24gaW5pdChjb25maWcpIHtcbiAgaTE4bmV4dFxuICAudXNlKGkxOG5leHRYSFJCYWNrZW5kKVxuICAuaW5pdCh7IFxuICAgICAgbG5nOiAnaXQnLFxuICAgICAgbnM6ICdhcHAnLFxuICAgICAgZmFsbGJhY2tMbmc6ICdpdCcsXG4gICAgICByZXNvdXJjZXM6IGNvbmZpZy5yZXNvdXJjZXNcbiAgfSk7XG4gIFxuICBqcXVlcnlJMThuZXh0LmluaXQoaTE4bmV4dCwgJCwge1xuICAgIHROYW1lOiAndCcsIC8vIC0tPiBhcHBlbmRzICQudCA9IGkxOG5leHQudFxuICAgIGkxOG5OYW1lOiAnaTE4bicsIC8vIC0tPiBhcHBlbmRzICQuaTE4biA9IGkxOG5leHRcbiAgICBoYW5kbGVOYW1lOiAnbG9jYWxpemUnLCAvLyAtLT4gYXBwZW5kcyAkKHNlbGVjdG9yKS5sb2NhbGl6ZShvcHRzKTtcbiAgICBzZWxlY3RvckF0dHI6ICdkYXRhLWkxOG4nLCAvLyBzZWxlY3RvciBmb3IgdHJhbnNsYXRpbmcgZWxlbWVudHNcbiAgICB0YXJnZXRBdHRyOiAnZGF0YS1pMThuLXRhcmdldCcsIC8vIGVsZW1lbnQgYXR0cmlidXRlIHRvIGdyYWIgdGFyZ2V0IGVsZW1lbnQgdG8gdHJhbnNsYXRlIChpZiBkaWZmcmVudCB0aGVuIGl0c2VsZilcbiAgICBvcHRpb25zQXR0cjogJ2RhdGEtaTE4bi1vcHRpb25zJywgLy8gZWxlbWVudCBhdHRyaWJ1dGUgdGhhdCBjb250YWlucyBvcHRpb25zLCB3aWxsIGxvYWQvc2V0IGlmIHVzZU9wdGlvbnNBdHRyID0gdHJ1ZVxuICAgIHVzZU9wdGlvbnNBdHRyOiBmYWxzZSwgLy8gc2VlIG9wdGlvbnNBdHRyXG4gICAgcGFyc2VEZWZhdWx0VmFsdWVGcm9tQ29udGVudDogdHJ1ZSAvLyBwYXJzZXMgZGVmYXVsdCB2YWx1ZXMgZnJvbSBjb250ZW50IGVsZS52YWwgb3IgZWxlLnRleHRcbiAgfSk7XG59XG4gICAgXG52YXIgdCA9IGZ1bmN0aW9uKHRleHQpe1xuICAgIHZhciB0cmFkID0gaTE4bmV4dC50KHRleHQpO1xuICAgIHJldHVybiB0cmFkO1xufTtcbiAgICBcbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbml0OiBpbml0LFxuICB0OiB0XG59XG4iLCJ2YXIgUGlja0Nvb3JkaW5hdGVzRXZlbnRUeXBlID0ge1xuICBQSUNLRUQ6ICdwaWNrZWQnXG59O1xuXG52YXIgUGlja0Nvb3JkaW5hdGVzRXZlbnQgPSBmdW5jdGlvbih0eXBlLCBjb29yZGluYXRlKSB7XG4gIHRoaXMudHlwZSA9IHR5cGU7XG4gIHRoaXMuY29vcmRpbmF0ZSA9IGNvb3JkaW5hdGU7XG59O1xuXG52YXIgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHRoaXMucHJldmlvdXNDdXJzb3JfID0gbnVsbDtcbiAgXG4gIG9sLmludGVyYWN0aW9uLlBvaW50ZXIuY2FsbCh0aGlzLCB7XG4gICAgaGFuZGxlRG93bkV2ZW50OiBQaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbi5oYW5kbGVEb3duRXZlbnRfLFxuICAgIGhhbmRsZVVwRXZlbnQ6IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uLmhhbmRsZVVwRXZlbnRfLFxuICAgIGhhbmRsZU1vdmVFdmVudDogUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24uaGFuZGxlTW92ZUV2ZW50XyxcbiAgfSk7XG59O1xub2wuaW5oZXJpdHMoUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24sIG9sLmludGVyYWN0aW9uLlBvaW50ZXIpO1xuXG5QaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbi5oYW5kbGVEb3duRXZlbnRfID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5QaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbi5oYW5kbGVVcEV2ZW50XyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMuZGlzcGF0Y2hFdmVudChcbiAgICAgICAgICBuZXcgUGlja0Nvb3JkaW5hdGVzRXZlbnQoXG4gICAgICAgICAgICAgIFBpY2tDb29yZGluYXRlc0V2ZW50VHlwZS5QSUNLRUQsXG4gICAgICAgICAgICAgIGV2ZW50LmNvb3JkaW5hdGUpKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5QaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbi5oYW5kbGVNb3ZlRXZlbnRfID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGVsZW0gPSBldmVudC5tYXAuZ2V0VGFyZ2V0RWxlbWVudCgpO1xuICBlbGVtLnN0eWxlLmN1cnNvciA9ICAncG9pbnRlcic7XG59O1xuXG5QaWNrQ29vcmRpbmF0ZXNJbnRlcmFjdGlvbi5wcm90b3R5cGUuc2hvdWxkU3RvcEV2ZW50ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24ucHJvdG90eXBlLnNldE1hcCA9IGZ1bmN0aW9uKG1hcCl7XG4gIGlmICghbWFwKSB7XG4gICAgdmFyIGVsZW0gPSB0aGlzLmdldE1hcCgpLmdldFRhcmdldEVsZW1lbnQoKTtcbiAgICBlbGVtLnN0eWxlLmN1cnNvciA9ICcnO1xuICB9XG4gIG9sLmludGVyYWN0aW9uLlBvaW50ZXIucHJvdG90eXBlLnNldE1hcC5jYWxsKHRoaXMsbWFwKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb247XG4iLCJ2YXIgUGlja0ZlYXR1cmVFdmVudFR5cGUgPSB7XG4gIFBJQ0tFRDogJ3BpY2tlZCdcbn07XG5cbnZhciBQaWNrRmVhdHVyZUV2ZW50ID0gZnVuY3Rpb24odHlwZSwgY29vcmRpbmF0ZSwgZmVhdHVyZSkge1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLmZlYXR1cmUgPSBmZWF0dXJlO1xuICB0aGlzLmNvb3JkaW5hdGUgPSBjb29yZGluYXRlO1xufTtcblxuXG5cbnZhciBQaWNrRmVhdHVyZUludGVyYWN0aW9uID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyLmNhbGwodGhpcywge1xuICAgIGhhbmRsZURvd25FdmVudDogUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5oYW5kbGVEb3duRXZlbnRfLFxuICAgIGhhbmRsZVVwRXZlbnQ6IFBpY2tGZWF0dXJlSW50ZXJhY3Rpb24uaGFuZGxlVXBFdmVudF8sXG4gICAgaGFuZGxlTW92ZUV2ZW50OiBQaWNrRmVhdHVyZUludGVyYWN0aW9uLmhhbmRsZU1vdmVFdmVudF8sXG4gIH0pO1xuICBcbiAgdGhpcy5mZWF0dXJlc18gPSBvcHRpb25zLmZlYXR1cmVzIHx8IG51bGw7XG4gIFxuICB0aGlzLmxheWVyc18gPSBvcHRpb25zLmxheWVycyB8fCBudWxsO1xuICBcbiAgdGhpcy5waWNrZWRGZWF0dXJlXyA9IG51bGw7XG4gIFxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMubGF5ZXJGaWx0ZXJfID0gZnVuY3Rpb24obGF5ZXIpIHtcbiAgICByZXR1cm4gXy5pbmNsdWRlcyhzZWxmLmxheWVyc18sIGxheWVyKTtcbiAgfTtcbn07XG5vbC5pbmhlcml0cyhQaWNrRmVhdHVyZUludGVyYWN0aW9uLCBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyKTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5oYW5kbGVEb3duRXZlbnRfID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdGhpcy5waWNrZWRGZWF0dXJlXyA9IHRoaXMuZmVhdHVyZXNBdFBpeGVsXyhldmVudC5waXhlbCwgZXZlbnQubWFwKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5QaWNrRmVhdHVyZUludGVyYWN0aW9uLmhhbmRsZVVwRXZlbnRfID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgaWYodGhpcy5waWNrZWRGZWF0dXJlXyl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KFxuICAgICAgICAgICAgbmV3IFBpY2tGZWF0dXJlRXZlbnQoXG4gICAgICAgICAgICAgICAgUGlja0ZlYXR1cmVFdmVudFR5cGUuUElDS0VELFxuICAgICAgICAgICAgICAgIGV2ZW50LmNvb3JkaW5hdGUsXG4gICAgICAgICAgICAgICAgdGhpcy5waWNrZWRGZWF0dXJlXykpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuUGlja0ZlYXR1cmVJbnRlcmFjdGlvbi5oYW5kbGVNb3ZlRXZlbnRfID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGVsZW0gPSBldmVudC5tYXAuZ2V0VGFyZ2V0RWxlbWVudCgpO1xuICB2YXIgaW50ZXJzZWN0aW5nRmVhdHVyZSA9IHRoaXMuZmVhdHVyZXNBdFBpeGVsXyhldmVudC5waXhlbCwgZXZlbnQubWFwKTtcblxuICBpZiAoaW50ZXJzZWN0aW5nRmVhdHVyZSkge1xuICAgIGVsZW0uc3R5bGUuY3Vyc29yID0gICdwb2ludGVyJztcbiAgfSBlbHNlIHtcbiAgICBlbGVtLnN0eWxlLmN1cnNvciA9ICcnO1xuICB9XG59O1xuXG5QaWNrRmVhdHVyZUludGVyYWN0aW9uLnByb3RvdHlwZS5mZWF0dXJlc0F0UGl4ZWxfID0gZnVuY3Rpb24ocGl4ZWwsIG1hcCkge1xuICB2YXIgZm91bmQgPSBudWxsO1xuXG4gIHZhciBpbnRlcnNlY3RpbmdGZWF0dXJlID0gbWFwLmZvckVhY2hGZWF0dXJlQXRQaXhlbChwaXhlbCxcbiAgICAgIGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgICAgaWYgKHRoaXMuZmVhdHVyZXNfKSB7XG4gICAgICAgICAgaWYgKHRoaXMuZmVhdHVyZXNfLmluZGV4T2YoZmVhdHVyZSkgPiAtMSl7XG4gICAgICAgICAgICByZXR1cm4gZmVhdHVyZVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmZWF0dXJlO1xuICAgICAgfSx0aGlzLHRoaXMubGF5ZXJGaWx0ZXJfKTtcbiAgXG4gIGlmKGludGVyc2VjdGluZ0ZlYXR1cmUpe1xuICAgIGZvdW5kID0gaW50ZXJzZWN0aW5nRmVhdHVyZTtcbiAgfVxuICByZXR1cm4gZm91bmQ7XG59O1xuXG5QaWNrRmVhdHVyZUludGVyYWN0aW9uLnByb3RvdHlwZS5zaG91bGRTdG9wRXZlbnQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gZmFsc2U7XG59O1xuXG5QaWNrRmVhdHVyZUludGVyYWN0aW9uLnByb3RvdHlwZS5zZXRNYXAgPSBmdW5jdGlvbihtYXApe1xuICBpZiAoIW1hcCkge1xuICAgIHZhciBlbGVtID0gdGhpcy5nZXRNYXAoKS5nZXRUYXJnZXRFbGVtZW50KCk7XG4gICAgZWxlbS5zdHlsZS5jdXJzb3IgPSAnJztcbiAgfVxuICBvbC5pbnRlcmFjdGlvbi5Qb2ludGVyLnByb3RvdHlwZS5zZXRNYXAuY2FsbCh0aGlzLG1hcCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tGZWF0dXJlSW50ZXJhY3Rpb247XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIEdlb21ldHJ5VHlwZXMgPSByZXF1aXJlKCdjb3JlL2dlb21ldHJ5L2dlb21ldHJ5JykuR2VvbWV0cnlUeXBlcztcblxudmFyIENBUEFCSUxJVElFUyA9IHtcbiAgUVVFUlk6IDEsXG4gIEVESVQ6IDJcbn07XG5cbnZhciBFRElUT1BTID0ge1xuICBJTlNFUlQ6IDEsXG4gIFVQREFURTogMixcbiAgREVMRVRFOiA0XG59O1xuXG5MYXllclN0YXRlID0ge307XG5cbkxheWVyU3RhdGUuU2VydmVyVHlwZXMgPSB7XG4gIE9HQzogXCJPR0NcIixcbiAgUUdJUzogXCJRR0lTXCIsXG4gIE1hcHNlcnZlcjogXCJNYXBzZXJ2ZXJcIixcbiAgR2Vvc2VydmVyOiBcIkdlb3NlcnZlclwiLFxuICBBcmNHSVM6IFwiQXJjR0lTXCJcbn07XG5cbkxheWVyU3RhdGUuZ2V0R2VvbWV0cnlUeXBlID0gZnVuY3Rpb24obGF5ZXJTdGF0ZSkge1xuICByZXR1cm4gbGF5ZXJTdGF0ZS5nZW9tZXRyeXR5cGU7XG59O1xuXG5MYXllclN0YXRlLmdldEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihsYXllclN0YXRlKSB7XG4gIHZhciBhdHRyaWJ1dGVzID0gW107XG4gIGlmIChsYXllclN0YXRlLmF0dHJpYnV0ZXMpIHtcbiAgICBhdHRyaWJ1dGVzID0gXy5tYXAobGF5ZXJTdGF0ZS5hdHRyaWJ1dGVzLGZ1bmN0aW9uKGF0dHJpYnV0ZSkge1xuICAgICAgcmV0dXJuIGF0dHJpYnV0ZS5uYW1lO1xuICAgIH0pXG4gIH1cbiAgcmV0dXJuIGF0dHJpYnV0ZXM7XG59O1xuXG5MYXllclN0YXRlLmlzUXVlcnlhYmxlID0gZnVuY3Rpb24obGF5ZXJTdGF0ZSl7XG4gIHZhciBxdWVyeUVuYWJsZWQgPSBmYWxzZTtcbiAgdmFyIHF1ZXJ5YWJsZUZvckNhYmFiaWxpdGllcyA9IChsYXllclN0YXRlLmNhcGFiaWxpdGllcyAmJiAobGF5ZXJTdGF0ZS5jYXBhYmlsaXRpZXMgJiYgQ0FQQUJJTElUSUVTLlFVRVJZKSkgPyB0cnVlIDogZmFsc2U7XG4gIGlmIChxdWVyeWFibGVGb3JDYWJhYmlsaXRpZXMpIHtcbiAgICAvLyDDqCBpbnRlcnJvZ2FiaWxlIHNlIHZpc2liaWxlIGUgbm9uIGRpc2FiaWxpdGF0byAocGVyIHNjYWxhKSBvcHB1cmUgc2UgaW50ZXJyb2dhYmlsZSBjb211bnF1ZSAoZm9yemF0byBkYWxsYSBwcm9wcmlldMOgIGluZm93aGVubm90dmlzaWJsZSlcbiAgICB2YXIgcXVlcnlFbmFibGVkID0gKGxheWVyU3RhdGUudmlzaWJsZSAmJiAhbGF5ZXJTdGF0ZS5kaXNhYmxlZCkgfHwgKGxheWVyU3RhdGUuaW5mb3doZW5ub3R2aXNpYmxlICYmIChsYXllclN0YXRlLmluZm93aGVubm90dmlzaWJsZSA9PT0gdHJ1ZSkpO1xuICB9XG4gIHJldHVybiBxdWVyeUVuYWJsZWQ7XG59O1xuXG5MYXllclN0YXRlLmdldFF1ZXJ5TGF5ZXJOYW1lID0gZnVuY3Rpb24obGF5ZXJTdGF0ZSkge1xuICB2YXIgcXVlcnlMYXllck5hbWU7XG4gIGlmIChsYXllclN0YXRlLmluZm9sYXllciAmJiBsYXllclN0YXRlLmluZm9sYXllciAhPSAnJykge1xuICAgIHF1ZXJ5TGF5ZXJOYW1lID0gbGF5ZXJTdGF0ZS5pbmZvbGF5ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgcXVlcnlMYXllck5hbWUgPSBsYXllclN0YXRlLm5hbWU7XG4gIH1cbiAgcmV0dXJuIHF1ZXJ5TGF5ZXJOYW1lO1xufTtcblxuTGF5ZXJTdGF0ZS5nZXRTZXJ2ZXJUeXBlID0gZnVuY3Rpb24obGF5ZXJTdGF0ZSkge1xuICBpZiAobGF5ZXJTdGF0ZS5zZXJ2ZXJ0eXBlICYmIGxheWVyU3RhdGUuc2VydmVydHlwZSAhPSAnJykge1xuICAgIHJldHVybiBsYXllclN0YXRlLnNlcnZlcnR5cGU7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIExheWVyU3RhdGUuU2VydmVyVHlwZXMuUUdJUztcbiAgfVxufTtcblxuTGF5ZXJTdGF0ZS5pc0V4dGVybmFsV01TID0gZnVuY3Rpb24obGF5ZXJTdGF0ZSkge1xuICByZXR1cm4gKGxheWVyU3RhdGUuc291cmNlICYmIGxheWVyU3RhdGUuc291cmNlLnVybCk7XG59O1xuXG5MYXllclN0YXRlLmdldFdNU0xheWVyTmFtZSA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgdmFyIGxheWVyTmFtZSA9IGxheWVyU3RhdGUubmFtZTtcbiAgaWYgKGxheWVyU3RhdGUuc291cmNlICYmIGxheWVyU3RhdGUuc291cmNlLmxheWVycyl7XG4gICAgbGF5ZXJOYW1lID0gbGF5ZXJTdGF0ZS5zb3VyY2UubGF5ZXJzXG4gIH07XG4gIHJldHVybiBsYXllck5hbWU7XG59O1xuXG5MYXllclN0YXRlLmdldE9yaWdpblVSTCA9IGZ1bmN0aW9uKGxheWVyU3RhdGUpIHtcbiAgdmFyIHVybDtcbiAgaWYgKGxheWVyU3RhdGUuc291cmNlICYmIGxheWVyU3RhdGUuc291cmNlLnR5cGUgPT0gJ3dtcycgJiYgbGF5ZXJTdGF0ZS5zb3VyY2UudXJsKXtcbiAgICB1cmwgPSBsYXllclN0YXRlLnNvdXJjZS51cmxcbiAgfTtcbiAgcmV0dXJuIHVybDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTGF5ZXJTdGF0ZTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgdHJ1ZWZuYyA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS50cnVlZm5jO1xudmFyIHJlc29sdmVkVmFsdWUgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykucmVzb2x2ZWRWYWx1ZTtcbnZhciByZWplY3RlZFZhbHVlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlamVjdGVkVmFsdWU7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxuZnVuY3Rpb24gVmVjdG9yTGF5ZXIoY29uZmlnKXtcbiAgdmFyIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgdGhpcy5nZW9tZXRyeXR5cGUgPSBjb25maWcuZ2VvbWV0cnl0eXBlIHx8IG51bGw7XG4gIHRoaXMuZm9ybWF0ID0gY29uZmlnLmZvcm1hdCB8fCBudWxsO1xuICB0aGlzLmNycyA9IGNvbmZpZy5jcnMgIHx8IG51bGw7XG4gIHRoaXMuaWQgPSBjb25maWcuaWQgfHwgbnVsbDtcbiAgdGhpcy5uYW1lID0gY29uZmlnLm5hbWUgfHwgXCJcIjtcbiAgdGhpcy5wayA9IGNvbmZpZy5wayB8fCBcImlkXCI7IC8vIFRPRE86IGlsIEdlb0pTT04gc2V0dGEgbCdpZCBkZWxsYSBmZWF0dXJlIGRhIHPDqSwgZSBuYXNjb25kZSBpbCBjYW1wbyBQSyBkYWxsZSBwcm9wZXJ0aWVzLiBJbiBhbHRyaSBmb3JtYXRpIHZhIHZlcmlmaWNhdG8sIGUgY2Fzb21haSB1c2FyZSBmZWF0dXJlLnNldElkKClcbiAgXG4gIHRoaXMuX29sU291cmNlID0gbmV3IG9sLnNvdXJjZS5WZWN0b3Ioe1xuICAgIGZlYXR1cmVzOiBuZXcgb2wuQ29sbGVjdGlvbigpXG4gIH0pO1xuICB0aGlzLl9vbExheWVyID0gbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgbmFtZTogdGhpcy5uYW1lLFxuICAgIHNvdXJjZTogdGhpcy5fb2xTb3VyY2VcbiAgfSk7XG4gIFxuICAvKlxuICAgKiBBcnJheSBkaSBvZ2dldHRpOlxuICAgKiB7XG4gICAqICBuYW1lOiBOb21lIGRlbGwnYXR0cmlidXRvLFxuICAgKiAgdHlwZTogaW50ZWdlciB8IGZsb2F0IHwgc3RyaW5nIHwgYm9vbGVhbiB8IGRhdGUgfCB0aW1lIHwgZGF0ZXRpbWUsXG4gICAqICBpbnB1dDoge1xuICAgKiAgICBsYWJlbDogTm9tZSBkZWwgY2FtcG8gZGkgaW5wdXQsXG4gICAqICAgIHR5cGU6IHNlbGVjdCB8IGNoZWNrIHwgcmFkaW8gfCBjb29yZHNwaWNrZXIgfCBib3hwaWNrZXIgfCBsYXllcnBpY2tlciB8IGZpZWxkZGVwZW5kLFxuICAgKiAgICBvcHRpb25zOiB7XG4gICAqICAgICAgTGUgb3B6aW9uaSBwZXIgbG8gc3BjaWZpY28gdGlwbyBkaSBpbnB1dCAoZXMuIFwidmFsdWVzXCIgcGVyIGxhIGxpc3RhIGRpIHZhbG9yaSBkaSBzZWxlY3QsIGNoZWNrIGUgcmFkaW8pXG4gICAqICAgIH1cbiAgICogIH1cbiAgICogfVxuICAqL1xuICB0aGlzLl9QS2luQXR0cmlidXRlcyA9IGZhbHNlO1xuICB0aGlzLl9mZWF0dXJlc0ZpbHRlciA9IG51bGw7XG4gIHRoaXMuX2ZpZWxkcyA9IG51bGxcbiAgdGhpcy5sYXp5UmVsYXRpb25zID0gdHJ1ZTtcbiAgdGhpcy5fcmVsYXRpb25zID0gbnVsbDtcbn1cbmluaGVyaXQoVmVjdG9yTGF5ZXIsRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yTGF5ZXI7XG5cbnZhciBwcm90byA9IFZlY3RvckxheWVyLnByb3RvdHlwZTtcblxucHJvdG8uc2V0RGF0YSA9IGZ1bmN0aW9uKGZlYXR1cmVzRGF0YSl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGZlYXR1cmVzO1xuICBpZiAodGhpcy5mb3JtYXQpIHtcbiAgICBzd2l0Y2ggKHRoaXMuZm9ybWF0KXtcbiAgICAgIGNhc2UgXCJHZW9KU09OXCI6XG4gICAgICAgIHZhciBnZW9qc29uID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKHtcbiAgICAgICAgICBkZWZhdWx0RGF0YVByb2plY3Rpb246IHRoaXMuY3JzLFxuICAgICAgICAgIGdlb21ldHJ5TmFtZTogXCJnZW9tZXRyeVwiXG4gICAgICAgIH0pO1xuICAgICAgICBmZWF0dXJlcyA9IGdlb2pzb24ucmVhZEZlYXR1cmVzKGZlYXR1cmVzRGF0YSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZmVhdHVyZXMgJiYgZmVhdHVyZXMubGVuZ3RoKSB7XG4gICAgICBpZiAoIV8uaXNOdWxsKHRoaXMuX2ZlYXR1cmVzRmlsdGVyKSl7XG4gICAgICAgIHZhciBmZWF0dXJlcyA9IF8ubWFwKGZlYXR1cmVzLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgICAgIHJldHVybiBzZWxmLl9mZWF0dXJlc0ZpbHRlcihmZWF0dXJlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciBhbHJlYWR5TG9hZGVkSWRzID0gdGhpcy5nZXRGZWF0dXJlSWRzKCk7XG4gICAgICB2YXIgZmVhdHVyZXNUb0xvYWQgPSBfLmZpbHRlcihmZWF0dXJlcyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgICAgcmV0dXJuICFfLmluY2x1ZGVzKGFscmVhZHlMb2FkZWRJZHMsZmVhdHVyZS5nZXRJZCgpKTtcbiAgICAgIH0pXG4gICAgICBcbiAgICAgIHRoaXMuX29sU291cmNlLmFkZEZlYXR1cmVzKGZlYXR1cmVzVG9Mb2FkKTtcbiAgICAgIFxuICAgICAgLy8gdmVyaWZpY28sIHByZW5kZW5kbyBsYSBwcmltYSBmZWF0dXJlLCBzZSBsYSBQSyDDqCBwcmVzZW50ZSBvIG1lbm8gdHJhIGdsaSBhdHRyaWJ1dGlcbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gdGhpcy5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpWzBdLmdldFByb3BlcnRpZXMoKTtcbiAgICAgIHRoaXMuX1BLaW5BdHRyaWJ1dGVzID0gXy5nZXQoYXR0cmlidXRlcyx0aGlzLnBrKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgY29uc29sZS5sb2coXCJWZWN0b3JMYXllciBmb3JtYXQgbm90IGRlZmluZWRcIik7XG4gIH1cbn07XG5cbnByb3RvLnNldEZlYXR1cmVEYXRhID0gZnVuY3Rpb24ob2xkZmlkLGZpZCxnZW9tZXRyeSxhdHRyaWJ1dGVzKXtcbiAgdmFyIGZlYXR1cmUgPSB0aGlzLmdldEZlYXR1cmVCeUlkKG9sZGZpZCk7XG4gIGlmIChmaWQpe1xuICAgIGZlYXR1cmUuc2V0SWQoZmlkKTtcbiAgfVxuICBcbiAgaWYgKGdlb21ldHJ5KXtcbiAgICBmZWF0dXJlLnNldEdlb21ldHJ5KGdlb21ldHJ5KTtcbiAgfVxuICBcbiAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgIHZhciBvbGRBdHRyaWJ1dGVzID0gZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCk7XG4gICAgdmFyIG5ld0F0dHJpYnV0ZXMgPV8uYXNzaWduKG9sZEF0dHJpYnV0ZXMsYXR0cmlidXRlcyk7XG4gICAgZmVhdHVyZS5zZXRQcm9wZXJ0aWVzKG5ld0F0dHJpYnV0ZXMpO1xuICB9XG4gIFxuICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnByb3RvLmFkZEZlYXR1cmVzID0gZnVuY3Rpb24oZmVhdHVyZXMpe1xuICB0aGlzLmdldFNvdXJjZSgpLmFkZEZlYXR1cmVzKGZlYXR1cmVzKTtcbn07XG5cbnByb3RvLnNldEZlYXR1cmVzRmlsdGVyID0gZnVuY3Rpb24oZmVhdHVyZXNGaWx0ZXIpe1xuICB0aGlzLl9mZWF0dXJlc0ZpbHRlciA9IGZlYXR1cmVzRmlsdGVyO1xufTtcblxucHJvdG8uc2V0RmllbGRzID0gZnVuY3Rpb24oZmllbGRzKXtcbiAgdGhpcy5fZmllbGRzID0gZmllbGRzO1xufTtcblxucHJvdG8uc2V0UGtGaWVsZCA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHBrZmllbGRTZXQgPSBmYWxzZTtcbiAgXy5mb3JFYWNoKHRoaXMuX2ZpZWxkcyxmdW5jdGlvbihmaWVsZCl7XG4gICAgaWYgKGZpZWxkLm5hbWUgPT0gc2VsZi5wayApe1xuICAgICAgcGtmaWVsZFNldCA9IHRydWU7XG4gICAgfVxuICB9KTtcbiAgXG4gIGlmICghcGtmaWVsZFNldCl7XG4gICAgdGhpcy5fZmllbGRzXG4gIH1cbn07XG5cbnByb3RvLmdldEZlYXR1cmVzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKTtcbn07XG5cbnByb3RvLmdldEZlYXR1cmVJZHMgPSBmdW5jdGlvbigpe1xuICB2YXIgZmVhdHVyZUlkcyA9IF8ubWFwKHRoaXMuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKSxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICByZXR1cm4gZmVhdHVyZS5nZXRJZCgpO1xuICB9KVxuICByZXR1cm4gZmVhdHVyZUlkc1xufTtcblxucHJvdG8uZ2V0RmllbGRzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIF8uY2xvbmVEZWVwKHRoaXMuX2ZpZWxkcyk7XG59O1xuXG5wcm90by5nZXRGaWVsZHNOYW1lcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBfLm1hcCh0aGlzLl9maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiBmaWVsZC5uYW1lO1xuICB9KTtcbn07XG5cbnByb3RvLmdldEZpZWxkc1dpdGhBdHRyaWJ1dGVzID0gZnVuY3Rpb24ob2JqKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvKnZhciBmaWVsZHMgPSBfLmNsb25lRGVlcChfLmZpbHRlcih0aGlzLl9maWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiAoKGZpZWxkLm5hbWUgIT0gc2VsZi5waykgJiYgZmllbGQuZWRpdGFibGUpO1xuICB9KSk7Ki9cbiAgdmFyIGZpZWxkcyA9IF8uY2xvbmVEZWVwKHRoaXMuX2ZpZWxkcyk7XG4gIFxuICB2YXIgZmVhdHVyZSwgYXR0cmlidXRlcztcbiAgXG4gIC8vIGlsIG1ldG9kbyBhY2NldHRhIHNpYSBmZWF0dXJlIGNoZSBmaWRcbiAgaWYgKG9iaiBpbnN0YW5jZW9mIG9sLkZlYXR1cmUpe1xuICAgIGZlYXR1cmUgPSBvYmo7XG4gIH1cbiAgZWxzZSBpZiAob2JqKXtcbiAgICBmZWF0dXJlID0gdGhpcy5nZXRGZWF0dXJlQnlJZChvYmopO1xuICB9XG4gIGlmIChmZWF0dXJlKXtcbiAgICBhdHRyaWJ1dGVzID0gZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCk7XG4gIH1cbiAgXG4gIF8uZm9yRWFjaChmaWVsZHMsZnVuY3Rpb24oZmllbGQpe1xuICAgIGlmIChmZWF0dXJlKXtcbiAgICAgIGlmICghdGhpcy5fUEtpbkF0dHJpYnV0ZXMgJiYgZmllbGQubmFtZSA9PSBzZWxmLnBrKXtcbiAgICAgICAgZmllbGQudmFsdWUgPSBmZWF0dXJlLmdldElkKCk7XG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgICBmaWVsZC52YWx1ZSA9IGF0dHJpYnV0ZXNbZmllbGQubmFtZV07XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICBmaWVsZC52YWx1ZSA9IG51bGw7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGZpZWxkcztcbn07XG5cbnByb3RvLnNldFJlbGF0aW9ucyA9IGZ1bmN0aW9uKHJlbGF0aW9ucyl7XG4gIF8uZm9yRWFjaChyZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24scmVsYXRpb25LZXkpe1xuICAgIHJlbGF0aW9uLm5hbWUgPSByZWxhdGlvbktleTtcbiAgfSk7XG4gIHRoaXMuX3JlbGF0aW9ucyA9IHJlbGF0aW9ucztcbn07XG5cbnByb3RvLmdldFJlbGF0aW9ucyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLl9yZWxhdGlvbnM7XG59O1xuXG5wcm90by5oYXNSZWxhdGlvbnMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gIV8uaXNOdWxsKHRoaXMuX3JlbGF0aW9ucyk7XG59O1xuXG5wcm90by5nZXRSZWxhdGlvbnNOYW1lcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBfLmtleXModGhpcy5fcmVsYXRpb25zKTtcbn07XG5cbnByb3RvLmdldFJlbGF0aW9uc0Zrc0tleXMgPSBmdW5jdGlvbigpe1xuICB2YXIgZmtzID0gW107XG4gIF8uZm9yRWFjaCh0aGlzLl9yZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24pe1xuICAgIGZrcy5wdXNoKHJlbGF0aW9uLmZrKTtcbiAgfSlcbiAgcmV0dXJuIGZrcztcbn07XG5cbnByb3RvLmdldFJlbGF0aW9uRmllbGRzTmFtZXMgPSBmdW5jdGlvbihyZWxhdGlvbil7XG4gIHZhciByZWxhdGlvbkZpZWxkcyA9IHRoaXMuX3JlbGF0aW9uc1tyZWxhdGlvbl07XG4gIGlmIChyZWxhdGlvbkZpZWxkcyl7XG4gICAgcmV0dXJuIF8ubWFwKHJlbGF0aW9uRmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgIHJldHVybiBmaWVsZC5uYW1lO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBudWxsO1xufTtcblxuLy8gb3R0ZW5nbyBsZSByZWxhemlvbmkgYSBwYXJ0aXJlIGRhbCBmaWQgZGkgdW5hIGZlYXR1cmUgZXNpc3RlbnRlXG5wcm90by5nZXRSZWxhdGlvbnNXaXRoQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGZpZCl7XG4gIHZhciByZWxhdGlvbnMgPSBfLmNsb25lRGVlcCh0aGlzLl9yZWxhdGlvbnMpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghZmlkIHx8ICF0aGlzLmdldEZlYXR1cmVCeUlkKGZpZCkpe1xuICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24scmVsYXRpb25LZXkpe1xuICAgICAgICAvLyBpbml6aWFsbWVudGUgc2V0dG8gYSBudWxsIGkgdmFsb3JpXG4gICAgICBfLmZvckVhY2gocmVsYXRpb24uZmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgZmllbGQudmFsdWUgPSBudWxsO1xuICAgICAgfSlcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzb2x2ZWRWYWx1ZShyZWxhdGlvbnMpO1xuICB9XG4gIGVsc2Uge1xuICAgIGlmICh0aGlzLmxhenlSZWxhdGlvbnMpe1xuICAgICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSB0aGlzLmdldEZlYXR1cmVCeUlkKGZpZCkuZ2V0UHJvcGVydGllcygpO1xuICAgICAgdmFyIGZrcyA9IHt9O1xuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbixyZWxhdGlvbktleSl7XG4gICAgICAgIHZhciB1cmwgPSByZWxhdGlvbi51cmw7XG4gICAgICAgIHZhciBrZXlWYWxzID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbi5mayxmdW5jdGlvbihma0tleSl7XG4gICAgICAgICAgZmtzW2ZrS2V5XSA9IGF0dHJpYnV0ZXNbZmtLZXldO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgICBcbiAgICAgIHRoaXMuZ2V0UmVsYXRpb25zV2l0aEF0dHJpYnV0ZXNGcm9tRmtzKGZrcylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlbGF0aW9uc1Jlc3BvbnNlKXtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZWxhdGlvbnNSZXNwb25zZSk7XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgfVxuICB9XG59O1xuXG4vLyBvdHRlbmdvIGxlIHJlbGF6aW9uaSB2YWxvcml6emF0ZSBhIHBhcnRpcmUgZGEgdW4gb2dnZXR0byBjb24gbGUgY2hpYXZpIEZLIGNvbWUga2V5cyBlIGkgbG9ybyB2YWxvcmkgY29tZSB2YWx1ZXNcbnByb3RvLmdldFJlbGF0aW9uc1dpdGhBdHRyaWJ1dGVzRnJvbUZrcyA9IGZ1bmN0aW9uKGZrcyl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHJlbGF0aW9ucyA9IF8uY2xvbmVEZWVwKHRoaXMuX3JlbGF0aW9ucyk7XG4gIHZhciByZWxhdGlvbnNSZXF1ZXN0cyA9IFtdO1xuXG4gIF8uZm9yRWFjaChyZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24scmVsYXRpb25LZXkpe1xuICAgIHZhciB1cmwgPSByZWxhdGlvbi51cmw7XG4gICAgdmFyIGtleVZhbHMgPSBbXTtcbiAgICBfLmZvckVhY2gocmVsYXRpb24uZmssZnVuY3Rpb24oZmtLZXkpe1xuICAgICAgdmFyIGZrVmFsdWUgPSBma3NbZmtLZXldO1xuICAgICAga2V5VmFscy5wdXNoKGZrS2V5K1wiPVwiK2ZrVmFsdWUpO1xuICAgIH0pO1xuICAgIHZhciBma1BhcmFtcyA9IF8uam9pbihrZXlWYWxzLFwiJlwiKTtcbiAgICB1cmwgKz0gXCI/XCIrZmtQYXJhbXM7XG4gICAgcmVsYXRpb25zUmVxdWVzdHMucHVzaCgkLmdldCh1cmwpXG4gICAgICAudGhlbihmdW5jdGlvbihyZWxhdGlvbkF0dHJpYnV0ZXMpe1xuICAgICAgICBfLmZvckVhY2gocmVsYXRpb24uZmllbGRzLGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICBmaWVsZC52YWx1ZSA9IHJlbGF0aW9uQXR0cmlidXRlc1swXVtmaWVsZC5uYW1lXTtcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgIClcbiAgfSlcbiAgXG4gIHJldHVybiAkLndoZW4uYXBwbHkodGhpcyxyZWxhdGlvbnNSZXF1ZXN0cylcbiAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gcmVsYXRpb25zO1xuICB9KTtcbn1cblxucHJvdG8uc2V0U3R5bGUgPSBmdW5jdGlvbihzdHlsZSl7XG4gIHRoaXMuX29sTGF5ZXIuc2V0U3R5bGUoc3R5bGUpO1xufTtcblxucHJvdG8uZ2V0TGF5ZXIgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fb2xMYXllcjtcbn07XG5cbnByb3RvLmdldFNvdXJjZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLl9vbExheWVyLmdldFNvdXJjZSgpO1xufTtcblxucHJvdG8uZ2V0RmVhdHVyZUJ5SWQgPSBmdW5jdGlvbihpZCl7XG4gIHJldHVybiB0aGlzLl9vbExheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVCeUlkKGlkKTtcbn07XG5cbnByb3RvLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5nZXRTb3VyY2UoKS5jbGVhcigpO1xufTtcblxucHJvdG8uYWRkVG9NYXAgPSBmdW5jdGlvbihtYXApe1xuICBtYXAuYWRkTGF5ZXIodGhpcy5fb2xMYXllcik7XG59O1xuXG4vLyBkYXRhIHVuYSBmZWF0dXJlIHZlcmlmaWNvIHNlIGhhIHRyYSBnbGkgYXR0cmlidXRpIGkgdmFsb3JpIGRlbGxlIEZLIGRlbGxlIChldmVudHVhbGkpIHJlbGF6aW9uaVxucHJvdG8uZmVhdHVyZUhhc1JlbGF0aW9uc0Zrc1dpdGhWYWx1ZXMgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgdmFyIGF0dHJpYnV0ZXMgPSBmZWF0dXJlLmdldFByb3BlcnRpZXMoKTtcbiAgdmFyIGZrc0tleXMgPSB0aGlzLmdldFJlbGF0aW9uc0Zrc0tleXMoKTtcbiAgcmV0dXJuIF8uZXZlcnkoZmtzS2V5cyxmdW5jdGlvbihma0tleSl7XG4gICAgdmFyIHZhbHVlID0gYXR0cmlidXRlc1tma0tleV07XG4gICAgcmV0dXJuICghXy5pc05pbCh2YWx1ZSkgJiYgdmFsdWUgIT0gJycpO1xuICB9KVxufTtcblxuLy8gZGF0YSB1bmEgZmVhdHVyZSBwb3BvbG8gdW4gb2dnZXR0byBjb24gY2hpYXZpL3ZhbG9yaSBkZWxsZSBGSyBkZWxsZSAoZXZlbnR1YWxpKSByZWxhemlvbmVcbnByb3RvLmdldFJlbGF0aW9uc0Zrc1dpdGhWYWx1ZXNGb3JGZWF0dXJlID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gIHZhciBhdHRyaWJ1dGVzID0gZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCk7XG4gIHZhciBma3MgPSB7fTtcbiAgdmFyIGZrc0tleXMgPSB0aGlzLmdldFJlbGF0aW9uc0Zrc0tleXMoKTtcbiAgXy5mb3JFYWNoKGZrc0tleXMsZnVuY3Rpb24oZmtLZXkpe1xuICAgIGZrc1tma0tleV0gPSBhdHRyaWJ1dGVzW2ZrS2V5XTtcbiAgfSlcbiAgcmV0dXJuIGZrcztcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBMYXllclN0YXRlID0gcmVxdWlyZSgnY29yZS9sYXllci9sYXllcnN0YXRlJyk7XG52YXIgTWFwTGF5ZXIgPSByZXF1aXJlKCdjb3JlL21hcC9tYXBsYXllcicpO1xudmFyIFJhc3RlckxheWVycyA9IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2xheWVycy9yYXN0ZXJzJyk7XG5cbmZ1bmN0aW9uIFdNU0xheWVyKG9wdGlvbnMsZXh0cmFQYXJhbXMpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuTEFZRVJUWVBFID0ge1xuICAgIExBWUVSOiAnbGF5ZXInLFxuICAgIE1VTFRJTEFZRVI6ICdtdWx0aWxheWVyJ1xuICB9O1xuXG4gIHRoaXMuZXh0cmFQYXJhbXMgPSBleHRyYVBhcmFtc1xuICB0aGlzLmxheWVycyA9IFtdO1xuICBcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xufVxuaW5oZXJpdChXTVNMYXllcixNYXBMYXllcilcbnZhciBwcm90byA9IFdNU0xheWVyLnByb3RvdHlwZTtcblxucHJvdG8uZ2V0T0xMYXllciA9IGZ1bmN0aW9uKCl7XG4gIHZhciBvbExheWVyID0gdGhpcy5fb2xMYXllcjtcbiAgaWYgKCFvbExheWVyKXtcbiAgICBvbExheWVyID0gdGhpcy5fb2xMYXllciA9IHRoaXMuX21ha2VPbExheWVyKCk7XG4gIH1cbiAgcmV0dXJuIG9sTGF5ZXI7XG59O1xuXG5wcm90by5nZXRTb3VyY2UgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5nZXRPTExheWVyKCkuZ2V0U291cmNlKCk7XG59O1xuXG5wcm90by5nZXRJbmZvRm9ybWF0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnYXBwbGljYXRpb24vdm5kLm9nYy5nbWwnO1xufTtcblxucHJvdG8uZ2V0R2V0RmVhdHVyZUluZm9VcmwgPSBmdW5jdGlvbihjb29yZGluYXRlLHJlc29sdXRpb24sZXBzZyxwYXJhbXMpe1xuICByZXR1cm4gdGhpcy5nZXRPTExheWVyKCkuZ2V0U291cmNlKCkuZ2V0R2V0RmVhdHVyZUluZm9VcmwoY29vcmRpbmF0ZSxyZXNvbHV0aW9uLGVwc2cscGFyYW1zKTtcbn07XG5cbnByb3RvLmdldExheWVyQ29uZmlncyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLmxheWVycztcbn07XG5cbnByb3RvLmFkZExheWVyID0gZnVuY3Rpb24obGF5ZXJDb25maWcpe1xuICB0aGlzLmxheWVycy5wdXNoKGxheWVyQ29uZmlnKTtcbn07XG5cbnByb3RvLnRvZ2dsZUxheWVyID0gZnVuY3Rpb24obGF5ZXIpe1xuICBfLmZvckVhY2godGhpcy5sYXllcnMsZnVuY3Rpb24oX2xheWVyKXtcbiAgICBpZiAoX2xheWVyLmlkID09IGxheWVyLmlkKXtcbiAgICAgIF9sYXllci52aXNpYmxlID0gbGF5ZXIudmlzaWJsZTtcbiAgICB9XG4gIH0pO1xuICB0aGlzLl91cGRhdGVMYXllcnMoKTtcbn07XG4gIFxucHJvdG8udXBkYXRlID0gZnVuY3Rpb24obWFwU3RhdGUsZXh0cmFQYXJhbXMpe1xuICB0aGlzLl91cGRhdGVMYXllcnMobWFwU3RhdGUsZXh0cmFQYXJhbXMpO1xufTtcblxucHJvdG8uaXNWaXNpYmxlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX2dldFZpc2libGVMYXllcnMoKS5sZW5ndGggPiAwO1xufTtcblxucHJvdG8uZ2V0UXVlcnlVcmwgPSBmdW5jdGlvbigpe1xuICB2YXIgbGF5ZXIgPSB0aGlzLmxheWVyc1swXTtcbiAgaWYgKGxheWVyLmluZm91cmwgJiYgbGF5ZXIuaW5mb3VybCAhPSAnJykge1xuICAgIHJldHVybiBsYXllci5pbmZvdXJsO1xuICB9XG4gIHJldHVybiB0aGlzLmNvbmZpZy51cmw7XG59O1xuXG5wcm90by5nZXRRdWVyeUxheWVycyA9IGZ1bmN0aW9uKCl7IFxuICB2YXIgbGF5ZXIgPSB0aGlzLmxheWVyc1swXTtcbiAgdmFyIHF1ZXJ5TGF5ZXJzID0gW107XG4gIF8uZm9yRWFjaCh0aGlzLmxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgaWYgKExheWVyU3RhdGUuaXNRdWVyeWFibGUobGF5ZXIpKSB7XG4gICAgICBxdWVyeUxheWVycy5wdXNoKHtcbiAgICAgICAgbGF5ZXJOYW1lOiBMYXllclN0YXRlLmdldFdNU0xheWVyTmFtZShsYXllciksXG4gICAgICAgIHF1ZXJ5TGF5ZXJOYW1lOiBMYXllclN0YXRlLmdldFF1ZXJ5TGF5ZXJOYW1lKGxheWVyKSxcbiAgICAgICAgZ2VvbWV0cnlUeXBlOiBMYXllclN0YXRlLmdldEdlb21ldHJ5VHlwZShsYXllciksXG4gICAgICAgIGF0dHJpYnV0ZXM6IExheWVyU3RhdGUuZ2V0QXR0cmlidXRlcyhsYXllcilcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBxdWVyeUxheWVycztcbn07XG5cbnByb3RvLl9tYWtlT2xMYXllciA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHdtc0NvbmZpZyA9IHtcbiAgICB1cmw6IHRoaXMuY29uZmlnLnVybCxcbiAgICBpZDogdGhpcy5jb25maWcuaWRcbiAgfTtcbiAgXG4gIHZhciByZXByZXNlbnRhdGl2ZUxheWVyID0gdGhpcy5sYXllcnNbMF07IC8vQlJVVFRPLCBERVZPIFBSRU5ERVJFIFVOIExBWUVSIEEgQ0FTTyAoSUwgUFJJTU8pIFBFUiBWRURFUkUgU0UgUFVOVEEgQUQgVU4gU09VUkNFIERJVkVSU08gKGRvdnJlYmJlIGFjY2FkZXJlIHNvbG8gcGVyIGkgbGF5ZXIgc2luZ29saSwgV01TIGVzdGVybmkpXG4gIFxuICBpZiAocmVwcmVzZW50YXRpdmVMYXllci5zb3VyY2UgJiYgcmVwcmVzZW50YXRpdmVMYXllci5zb3VyY2UudHlwZSA9PSAnd21zJyAmJiByZXByZXNlbnRhdGl2ZUxheWVyLnNvdXJjZS51cmwpe1xuICAgIHdtc0NvbmZpZy51cmwgPSByZXByZXNlbnRhdGl2ZUxheWVyLnNvdXJjZS51cmw7XG4gIH07XG4gIFxuICB2YXIgb2xMYXllciA9IG5ldyBSYXN0ZXJMYXllcnMuV01TTGF5ZXIod21zQ29uZmlnLHRoaXMuZXh0cmFQYXJhbXMpO1xuICBcbiAgb2xMYXllci5nZXRTb3VyY2UoKS5vbignaW1hZ2Vsb2Fkc3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5lbWl0KFwibG9hZHN0YXJ0XCIpO1xuICAgICAgfSk7XG4gIG9sTGF5ZXIuZ2V0U291cmNlKCkub24oJ2ltYWdlbG9hZGVuZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5lbWl0KFwibG9hZGVuZFwiKTtcbiAgfSk7XG4gIFxuICByZXR1cm4gb2xMYXllclxufTtcblxucHJvdG8uX2dldFZpc2libGVMYXllcnMgPSBmdW5jdGlvbihtYXBTdGF0ZSl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHZpc2libGVMYXllcnMgPSBbXTtcbiAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICB2YXIgcmVzb2x1dGlvbkJhc2VkVmlzaWJpbGl0eSA9IGxheWVyLm1heHJlc29sdXRpb24gPyAobGF5ZXIubWF4cmVzb2x1dGlvbiAmJiBsYXllci5tYXhyZXNvbHV0aW9uID4gbWFwU3RhdGUucmVzb2x1dGlvbikgOiB0cnVlO1xuICAgIGlmIChsYXllci52aXNpYmxlICYmIHJlc29sdXRpb25CYXNlZFZpc2liaWxpdHkpIHtcbiAgICAgIHZpc2libGVMYXllcnMucHVzaChsYXllcik7XG4gICAgfSAgICBcbiAgfSlcbiAgcmV0dXJuIHZpc2libGVMYXllcnM7XG59O1xuXG5wcm90by5jaGVja0xheWVyRGlzYWJsZWQgPSBmdW5jdGlvbihsYXllcixyZXNvbHV0aW9uKSB7XG4gIHZhciBkaXNhYmxlZCA9IGxheWVyLmRpc2FibGVkIHx8IGZhbHNlO1xuICBpZiAobGF5ZXIubWF4cmVzb2x1dGlvbil7XG4gICAgZGlzYWJsZWQgPSBsYXllci5tYXhyZXNvbHV0aW9uIDwgcmVzb2x1dGlvbjtcbiAgfVxuICBpZiAobGF5ZXIubWlucmVzb2x1dGlvbil7XG4gICAgbGF5ZXIuZGlzYWJsZWQgPSBkaXNhYmxlZCAmJiAobGF5ZXIubWlucmVzb2x1dGlvbiA+IHJlc29sdXRpb24pO1xuICB9XG4gIGxheWVyLmRpc2FibGVkID0gZGlzYWJsZWQ7XG59O1xuXG5wcm90by5jaGVja0xheWVyc0Rpc2FibGVkID0gZnVuY3Rpb24ocmVzb2x1dGlvbil7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICBzZWxmLmNoZWNrTGF5ZXJEaXNhYmxlZChsYXllcixyZXNvbHV0aW9uKTtcbiAgfSk7XG59O1xuXG5wcm90by5fdXBkYXRlTGF5ZXJzID0gZnVuY3Rpb24obWFwU3RhdGUsZXh0cmFQYXJhbXMpe1xuICB0aGlzLmNoZWNrTGF5ZXJzRGlzYWJsZWQobWFwU3RhdGUucmVzb2x1dGlvbik7XG4gIHZhciB2aXNpYmxlTGF5ZXJzID0gdGhpcy5fZ2V0VmlzaWJsZUxheWVycyhtYXBTdGF0ZSk7XG4gIGlmICh2aXNpYmxlTGF5ZXJzLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgTEFZRVJTOiBfLmpvaW4oXy5tYXAodmlzaWJsZUxheWVycyxmdW5jdGlvbihsYXllcil7XG4gICAgICAgIHJldHVybiBMYXllclN0YXRlLmdldFdNU0xheWVyTmFtZShsYXllcik7XG4gICAgICB9KSwnLCcpXG4gICAgfTtcbiAgICBpZiAoZXh0cmFQYXJhbXMpIHtcbiAgICAgIHBhcmFtcyA9IF8uYXNzaWduKHBhcmFtcyxleHRyYVBhcmFtcyk7XG4gICAgfVxuICAgIHRoaXMuX29sTGF5ZXIuc2V0VmlzaWJsZSh0cnVlKTtcbiAgICB0aGlzLl9vbExheWVyLmdldFNvdXJjZSgpLnVwZGF0ZVBhcmFtcyhwYXJhbXMpO1xuICB9XG4gIGVsc2Uge1xuICAgIHRoaXMuX29sTGF5ZXIuc2V0VmlzaWJsZShmYWxzZSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gV01TTGF5ZXI7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5cbmZ1bmN0aW9uIE1hcExheWVyKGNvbmZpZyl7XG4gIHRoaXMuY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICB0aGlzLmlkID0gY29uZmlnLmlkO1xuICBcbiAgdGhpcy5fb2xMYXllciA9IG51bGw7XG4gIFxuICBiYXNlKHRoaXMpO1xufVxuaW5oZXJpdChNYXBMYXllcixHM1dPYmplY3QpO1xuXG52YXIgcHJvdG8gPSBNYXBMYXllci5wcm90b3R5cGU7XG5cbnByb3RvLmdldElkID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuaWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcExheWVyO1xuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBiYXNlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBHZW9tZXRyeSA9IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbWV0cnknKTtcbnZhciBQcm9qZWN0U2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c2VydmljZScpLlByb2plY3RTZXJ2aWNlO1xuXG4vL3ZhciBHVUkgPSByZXF1aXJlKCdndWkvZ3VpJyk7IC8vIFFVRVNUTyBOT04gQ0kgREVWRSBFU1NFUkUhISFcblxuZnVuY3Rpb24gTWFwUXVlcnlTZXJ2aWNlKCkge1xuICBiYXNlKHRoaXMpO1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24obWFwKXtcbiAgICB0aGlzLm1hcCA9IG1hcDtcbiAgfVxuICBcbiAgdGhpcy5xdWVyeVBvaW50ID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsbWFwTGF5ZXJzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciB1cmxzRm9yTGF5ZXJzID0ge307XG4gICAgXy5mb3JFYWNoKG1hcExheWVycyxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICB2YXIgdXJsID0gbWFwTGF5ZXIuZ2V0UXVlcnlVcmwoKTtcbiAgICAgIHZhciB1cmxIYXNoID0gdXJsLmhhc2hDb2RlKCkudG9TdHJpbmcoKTtcbiAgICAgIGlmIChfLmtleXModXJsc0ZvckxheWVycykuaW5kZXhPZih1cmxIYXNoKSA9PSAtMSkge1xuICAgICAgICB1cmxzRm9yTGF5ZXJzW3VybEhhc2hdID0ge1xuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIG1hcExheWVyczogW11cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHVybHNGb3JMYXllcnNbdXJsSGFzaF0ubWFwTGF5ZXJzLnB1c2gobWFwTGF5ZXIpO1xuICAgIH0pXG4gICAgXG4gICAgdmFyIHF1ZXJ5VXJsc0ZvckxheWVycyA9IFtdO1xuICAgIF8uZm9yRWFjaCh1cmxzRm9yTGF5ZXJzLGZ1bmN0aW9uKHVybEZvckxheWVycyl7XG4gICAgICB2YXIgZmlyc3RMYXllciA9IHVybEZvckxheWVycy5tYXBMYXllcnNbMF07XG4gICAgICB2YXIgX2dldEZlYXR1cmVJbmZvVXJsID0gc2VsZi5nZXRHZXRGZWF0dXJlSW5mb1VybChmaXJzdExheWVyLGNvb3JkaW5hdGVzKTtcbiAgICAgIHZhciBxdWVyeUJhc2UgPSBfZ2V0RmVhdHVyZUluZm9Vcmwuc3BsaXQoJz8nKVswXTtcbiAgICAgIHZhciBxdWVyeVN0cmluZyA9IF9nZXRGZWF0dXJlSW5mb1VybC5zcGxpdCgnPycpWzFdO1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge307XG4gICAgICBfLmZvckVhY2gocXVlcnlTdHJpbmcuc3BsaXQoJyYnKSxmdW5jdGlvbihxdWVyeVN0cmluZ1BhaXIpe1xuICAgICAgICB2YXIgcXVlcnlQYWlyID0gcXVlcnlTdHJpbmdQYWlyLnNwbGl0KCc9Jyk7XG4gICAgICAgIHZhciBrZXkgPSBxdWVyeVBhaXJbMF07XG4gICAgICAgIHZhciB2YWx1ZSA9IHF1ZXJ5UGFpclsxXTtcbiAgICAgICAgcXVlcnlQYXJhbXNba2V5XSA9IHZhbHVlO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHZhciBsYXllck5hbWVzID0gW107XG4gICAgICB2YXIgcXVlcnlMYXllcnMgPSBbXTtcbiAgICAgIF8uZm9yRWFjaCh1cmxGb3JMYXllcnMubWFwTGF5ZXJzLGZ1bmN0aW9uKG1hcExheWVyKXtcbiAgICAgICAgLy92YXIgbWFwTGF5ZXJMYXllcnNOYW1lcyA9IG1hcExheWVyLmdldExheWVyKCkuZ2V0U291cmNlKCkuZ2V0UGFyYW1zKClbJ0xBWUVSUyddO1xuICAgICAgICAvL2xheWVyTmFtZXMgPSBfLmNvbmNhdChsYXllck5hbWVzLG1hcExheWVyTGF5ZXJzTmFtZXMpO1xuICAgICAgICB2YXIgbWFwTGF5ZXJRdWVyeUxheWVycyA9IG1hcExheWVyLmdldFF1ZXJ5TGF5ZXJzKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAobWFwTGF5ZXJRdWVyeUxheWVycy5sZW5ndGgpIHtcbiAgICAgICAgICBxdWVyeUxheWVycyA9IF8uY29uY2F0KHF1ZXJ5TGF5ZXJzLG1hcExheWVyUXVlcnlMYXllcnMpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgXG4gICAgICBpZiAocXVlcnlMYXllcnMubGVuZ3RoKSB7XG4gICAgICAgIGRlbGV0ZSBxdWVyeVBhcmFtc1snU1RZTEVTJ107XG4gICAgICBcbiAgICAgICAgcXVlcnlQYXJhbXNbJ0xBWUVSUyddID0gXy5tYXAocXVlcnlMYXllcnMsJ3F1ZXJ5TGF5ZXJOYW1lJyk7XG4gICAgICAgIHF1ZXJ5UGFyYW1zWydRVUVSWV9MQVlFUlMnXSA9IF8ubWFwKHF1ZXJ5TGF5ZXJzLCdxdWVyeUxheWVyTmFtZScpO1xuICAgICAgICBxdWVyeVBhcmFtc1snRkVBVFVSRV9DT1VOVCddID0gMTAwMDtcbiAgICAgICAgXG4gICAgICAgIHZhciBnZXRGZWF0dXJlSW5mb1VybCA9IHF1ZXJ5QmFzZTtcbiAgICAgICAgdmFyIG5ld1F1ZXJ5UGFpcnMgPSBbXTtcbiAgICAgICAgXy5mb3JFYWNoKHF1ZXJ5UGFyYW1zLGZ1bmN0aW9uKHZhbHVlLGtleSl7XG4gICAgICAgICAgbmV3UXVlcnlQYWlycy5wdXNoKGtleSsnPScrdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgZ2V0RmVhdHVyZUluZm9VcmwgPSBxdWVyeUJhc2UrJz8nK25ld1F1ZXJ5UGFpcnMuam9pbignJicpXG4gICAgICAgIFxuICAgICAgICBxdWVyeVVybHNGb3JMYXllcnMucHVzaCh7XG4gICAgICAgICAgdXJsOiBnZXRGZWF0dXJlSW5mb1VybCxcbiAgICAgICAgICBxdWVyeUxheWVyczogcXVlcnlMYXllcnNcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgICBcbiAgICB2YXIgZmVhdHVyZXNGb3JMYXllck5hbWVzID0ge307XG4gICAgaWYgKHF1ZXJ5VXJsc0ZvckxheWVycy5sZW5ndGggPiAwKSB7XG4gICAgICBfLmZvckVhY2gocXVlcnlVcmxzRm9yTGF5ZXJzLGZ1bmN0aW9uKHF1ZXJ5VXJsRm9yTGF5ZXJzKXtcbiAgICAgICAgdmFyIHVybCA9IHF1ZXJ5VXJsRm9yTGF5ZXJzLnVybDtcbiAgICAgICAgdmFyIHF1ZXJ5TGF5ZXJzID0gcXVlcnlVcmxGb3JMYXllcnMucXVlcnlMYXllcnM7XG5cbiAgICAgICAgJC5nZXQodXJsKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgdmFyIGpzb25yZXNwb25zZTtcbiAgICAgICAgICB2YXIgeDJqcyA9IG5ldyBYMkpTKCk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChfLmlzU3RyaW5nKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICBqc29ucmVzcG9uc2UgPSB4MmpzLnhtbF9zdHIyanNvbihyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAganNvbnJlc3BvbnNlID0geDJqcy54bWwyanNvbihyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBkLnJlamVjdChlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJvb3ROb2RlID0gXy5rZXlzKGpzb25yZXNwb25zZSlbMF07XG4gICAgICAgICAgdmFyIHBhcnNlciwgZGF0YTtcbiAgICAgICAgICBzd2l0Y2ggKHJvb3ROb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdGZWF0dXJlQ29sbGVjdGlvbic6XG4gICAgICAgICAgICAgIHBhcnNlciA9IHNlbGYuX3BhcnNlTGF5ZXJGZWF0dXJlQ29sbGVjdGlvbjtcbiAgICAgICAgICAgICAgZGF0YSA9IGpzb25yZXNwb25zZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwibXNHTUxPdXRwdXRcIjpcbiAgICAgICAgICAgICAgcGFyc2VyID0gc2VsZi5fcGFyc2VMYXllcm1zR01MT3V0cHV0O1xuICAgICAgICAgICAgICBkYXRhID0gcmVzcG9uc2U7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbmZlYXR1cmVzID0gMFxuICAgICAgICAgIF8uZm9yRWFjaChxdWVyeUxheWVycyxmdW5jdGlvbihxdWVyeUxheWVyKXtcbiAgICAgICAgICAgIHZhciBmZWF0dXJlcyA9IHBhcnNlci5jYWxsKHNlbGYscXVlcnlMYXllcixkYXRhKVxuICAgICAgICAgICAgbmZlYXR1cmVzICs9IGZlYXR1cmVzLmxlbmd0aDtcbiAgICAgICAgICAgIGZlYXR1cmVzRm9yTGF5ZXJOYW1lc1txdWVyeUxheWVyLmxheWVyTmFtZV0gPSBmZWF0dXJlcztcbiAgICAgICAgICB9KVxuICAgICAgICAgIGQucmVzb2x2ZShjb29yZGluYXRlcyxuZmVhdHVyZXMsZmVhdHVyZXNGb3JMYXllck5hbWVzKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oZSl7XG4gICAgICAgICAgZC5yZWplY3QoZSk7XG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBkLnJlc29sdmUoY29vcmRpbmF0ZXMsMCxmZWF0dXJlc0ZvckxheWVyTmFtZXMpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICAvLyBCcnV0dG8gbWEgcGVyIG9yYSB1bmljYSBzb2x1emlvbmUgdHJvdmF0YSBwZXIgZGl2aWRlcmUgcGVyIGxheWVyIGkgcmlzdWx0YXRpIGRpIHVuIGRvYyB4bWwgd2ZzLkZlYXR1cmVDb2xsZWN0aW9uLiBPTDMgbGkgcGFyc2VyaXp6YSB0dXR0aSBpbnNpZW1lLi4uXG4gIHRoaXMuX3BhcnNlTGF5ZXJGZWF0dXJlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKHF1ZXJ5TGF5ZXIsZGF0YSl7XG4gICAgdmFyIGZlYXR1cmVzID0gW107XG4gICAgdmFyIGxheWVyTmFtZSA9IHF1ZXJ5TGF5ZXIucXVlcnlMYXllck5hbWU7XG4gICAgdmFyIGxheWVyRGF0YSA9IF8uY2xvbmVEZWVwKGRhdGEpO1xuICAgIGxheWVyRGF0YS5GZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlTWVtYmVyID0gW107XG4gICAgXG4gICAgdmFyIGZlYXR1cmVNZW1iZXJzID0gZGF0YS5GZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlTWVtYmVyO1xuICAgIF8uZm9yRWFjaChmZWF0dXJlTWVtYmVycyxmdW5jdGlvbihmZWF0dXJlTWVtYmVyKXtcbiAgICAgIHZhciBpc0xheWVyTWVtYmVyID0gXy5nZXQoZmVhdHVyZU1lbWJlcixsYXllck5hbWUpXG5cbiAgICAgIGlmIChpc0xheWVyTWVtYmVyKSB7XG4gICAgICAgIGxheWVyRGF0YS5GZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlTWVtYmVyLnB1c2goZmVhdHVyZU1lbWJlcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgdmFyIHgyanMgPSBuZXcgWDJKUygpO1xuICAgIHZhciBsYXllckZlYXR1cmVDb2xsZWN0aW9uWE1MID0geDJqcy5qc29uMnhtbF9zdHIobGF5ZXJEYXRhKTtcbiAgICB2YXIgcGFyc2VyID0gbmV3IG9sLmZvcm1hdC5XTVNHZXRGZWF0dXJlSW5mbygpO1xuICAgIHJldHVybiBwYXJzZXIucmVhZEZlYXR1cmVzKGxheWVyRmVhdHVyZUNvbGxlY3Rpb25YTUwpO1xuICB9O1xuICBcbiAgLy8gbWVudHJlIGNvbiBpIHJpc3VsdGF0aSBpbiBtc0dMTU91dHB1dCAoZGEgTWFwc2VydmVyKSBpbCBwYXJzZXIgcHXDsiBlc3NlcmUgaXN0cnVpdG8gcGVyIHBhcnNlcml6emFyZSBpbiBiYXNlIGFkIHVuIGxheWVyIGRpIGZpbHRyb1xuICB0aGlzLl9wYXJzZUxheWVybXNHTUxPdXRwdXQgPSBmdW5jdGlvbihxdWVyeUxheWVyLGRhdGEpe1xuICAgIHZhciBwYXJzZXIgPSBuZXcgb2wuZm9ybWF0LldNU0dldEZlYXR1cmVJbmZvKHtcbiAgICAgIGxheWVyczogW3F1ZXJ5TGF5ZXIucXVlcnlMYXllck5hbWVdXG4gICAgfSk7XG4gICAgcmV0dXJuIHBhcnNlci5yZWFkRmVhdHVyZXMoZGF0YSk7XG4gIH07XG4gIFxuICB0aGlzLnF1ZXJ5UmVjdCA9IGZ1bmN0aW9uKHJlY3QsbGF5ZXJJZCkge1xuICAgIFxuICB9O1xuICBcbiAgdGhpcy5fcXVlcnkgPSBmdW5jdGlvbihyZWN0LGxheWVySWQpIHtcbiAgICB2YXIgbGF5ZXJzO1xuICAgIGlmIChsYXllcklkKSB7XG4gICAgICBsYXllcnMgPSBbUHJvamVjdFNlcnZpY2UuZ2V0TGF5ZXIobGF5ZXJJZCldO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGxheWVycyA9IFByb2plY3RTZXJ2aWNlLmdldExheWVycygpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuZ2V0R2V0RmVhdHVyZUluZm9VcmwgPSBmdW5jdGlvbihtYXBMYXllcixjb29yZGluYXRlKXtcbiAgICAvL3ZhciBwYXJzZXIgPSBuZXcgb2wuZm9ybWF0LldNU0dldEZlYXR1cmVJbmZvKCk7XG4gICAgdmFyIHJlc29sdXRpb24gPSB0aGlzLm1hcC5nZXRWaWV3KCkuZ2V0UmVzb2x1dGlvbigpO1xuICAgIHZhciBlcHNnID0gdGhpcy5tYXAuZ2V0VmlldygpLmdldFByb2plY3Rpb24oKS5nZXRDb2RlKCk7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIFFVRVJZX0xBWUVSUzogXy5tYXAobWFwTGF5ZXIuZ2V0UXVlcnlMYXllcnMoKSwncXVlcnlMYXllck5hbWUnKSxcbiAgICAgIElORk9fRk9STUFUOiBtYXBMYXllci5nZXRJbmZvRm9ybWF0KCksXG4gICAgICAvLyBQQVJBTUVUUkkgREkgVE9MTEVSQU5aQSBQRVIgUUdJUyBTRVJWRVJcbiAgICAgIEZJX1BPSU5UX1RPTEVSQU5DRTogMTAsXG4gICAgICBGSV9MSU5FX1RPTEVSQU5DRTogMTAsXG4gICAgICBGSV9QT0xZR09OX1RPTEVSQU5DRTogMTAgICAgICBcbiAgICB9XG4gICAgdmFyIHVybCA9IG1hcExheWVyLmdldEdldEZlYXR1cmVJbmZvVXJsKGNvb3JkaW5hdGUscmVzb2x1dGlvbixlcHNnLHBhcmFtcyk7XG4gICAgcmV0dXJuIHVybDtcbiAgfTtcbn1cbmluaGVyaXQoTWFwUXVlcnlTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE1hcFF1ZXJ5U2VydmljZTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c3JlZ2lzdHJ5Jyk7XG52YXIgUHJvamVjdFNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNlcnZpY2UnKS5Qcm9qZWN0U2VydmljZTtcbnZhciBQcm9qZWN0VHlwZXMgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNlcnZpY2UnKS5Qcm9qZWN0VHlwZXM7XG52YXIgR2VvbWV0cnlUeXBlcyA9IHJlcXVpcmUoJ2NvcmUvZ2VvbWV0cnkvZ2VvbWV0cnknKS5HZW9tZXRyeVR5cGVzO1xudmFyIG9sM2hlbHBlcnMgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9nM3cub2wzJykuaGVscGVycztcbnZhciBSZXNldENvbnRyb2wgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9jb250cm9scy9yZXNldGNvbnRyb2wnKTtcbnZhciBRdWVyeUNvbnRyb2wgPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9jb250cm9scy9xdWVyeWNvbnRyb2wnKTtcbnZhciBab29tQm94Q29udHJvbCA9IHJlcXVpcmUoJ2czdy1vbDMvc3JjL2NvbnRyb2xzL3pvb21ib3hjb250cm9sJyk7XG52YXIgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24gPSByZXF1aXJlKCdnM3ctb2wzL3NyYy9pbnRlcmFjdGlvbnMvcGlja2Nvb3JkaW5hdGVzaW50ZXJhY3Rpb24nKTtcbnZhciBXTVNMYXllciA9IHJlcXVpcmUoJ2NvcmUvbGF5ZXIvd21zbGF5ZXInKTtcbnZhciBNYXBRdWVyeVNlcnZpY2UgPSByZXF1aXJlKCdjb3JlL21hcC9tYXBxdWVyeXNlcnZpY2UnKTtcblxuLy92YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpOyAvLyBRVUVTVE8gTk9OIENJIERFVkUgRVNTRVJFISEhXG5cbnZhciBQaWNrVG9sZXJhbmNlUGFyYW1zID0ge307XG5QaWNrVG9sZXJhbmNlUGFyYW1zW1Byb2plY3RUeXBlcy5RREpBTkdPXSA9IHt9O1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT11bR2VvbWV0cnlUeXBlcy5QT0lOVF0gPSBcIkZJX1BPSU5UX1RPTEVSQU5DRVwiO1xuUGlja1RvbGVyYW5jZVBhcmFtc1tQcm9qZWN0VHlwZXMuUURKQU5HT11bR2VvbWV0cnlUeXBlcy5MSU5FU1RSSU5HXSA9IFwiRklfTElORV9UT0xFUkFOQ0VcIjtcblBpY2tUb2xlcmFuY2VQYXJhbXNbUHJvamVjdFR5cGVzLlFESkFOR09dW0dlb21ldHJ5VHlwZXMuUE9MWUdPTl0gPSBcIkZJX1BPTFlHT05fVE9MRVJBTkNFXCI7XG5cbnZhciBQaWNrVG9sZXJhbmNlVmFsdWVzID0ge31cblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5QT0lOVF0gPSA1O1xuUGlja1RvbGVyYW5jZVZhbHVlc1tHZW9tZXRyeVR5cGVzLkxJTkVTVFJJTkddID0gNTtcblBpY2tUb2xlcmFuY2VWYWx1ZXNbR2VvbWV0cnlUeXBlcy5QT0xZR09OXSA9IDU7XG5cbmZ1bmN0aW9uIE1hcFNlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZztcbiAgdGhpcy52aWV3ZXI7XG4gIHRoaXMubWFwTGF5ZXJzID0ge307XG4gIHRoaXMubWFwQmFzZUxheWVycyA9IHt9O1xuICB0aGlzLmxheWVyc0Fzc29jaWF0aW9uID0ge307XG4gIHRoaXMubGF5ZXJzRXh0cmFQYXJhbXMgPSB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGJib3g6IFtdLFxuICAgICAgcmVzb2x1dGlvbjogbnVsbCxcbiAgICAgIGNlbnRlcjogbnVsbCxcbiAgICAgIGxvYWRpbmc6IGZhbHNlXG4gIH07XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgfVxuICBcbiAgdGhpcy5faG93TWFueUFyZUxvYWRpbmcgPSAwO1xuICB0aGlzLl9pbmNyZW1lbnRMb2FkZXJzID0gZnVuY3Rpb24oKXtcbiAgICBpZiAodGhpcy5faG93TWFueUFyZUxvYWRpbmcgPT0gMCl7XG4gICAgICB0aGlzLmVtaXQoJ2xvYWRzdGFydCcpO1xuICAgIH1cbiAgICB0aGlzLl9ob3dNYW55QXJlTG9hZGluZyArPSAxO1xuICB9O1xuICBcbiAgdGhpcy5fZGVjcmVtZW50TG9hZGVycyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5faG93TWFueUFyZUxvYWRpbmcgLT0gMTtcbiAgICBpZiAodGhpcy5faG93TWFueUFyZUxvYWRpbmcgPT0gMCl7XG4gICAgICB0aGlzLmVtaXQoJ2xvYWRlbmQnKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl9pbnRlcmFjdGlvbnNTdGFjayA9IFtdO1xuICBcbiAgXG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBzZXRNYXBWaWV3OiBmdW5jdGlvbihiYm94LHJlc29sdXRpb24sY2VudGVyKXtcbiAgICAgIHRoaXMuc3RhdGUuYmJveCA9IGJib3g7XG4gICAgICB0aGlzLnN0YXRlLnJlc29sdXRpb24gPSByZXNvbHV0aW9uO1xuICAgICAgdGhpcy5zdGF0ZS5jZW50ZXIgPSBjZW50ZXI7XG4gICAgICB0aGlzLnVwZGF0ZU1hcExheWVycyh0aGlzLm1hcExheWVycyk7XG4gICAgfSxcbiAgICBzZXR1cFZpZXdlcjogZnVuY3Rpb24oKXtcbiAgICAgIC8vJHNjcmlwdChcImh0dHA6Ly9lcHNnLmlvL1wiK1Byb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuY3JzK1wiLmpzXCIpO1xuICAgICAgcHJvajQuZGVmcyhcIkVQU0c6XCIrUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC5jcnMsUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC5wcm9qNCk7XG4gICAgICBpZiAoc2VsZi52aWV3ZXIpIHtcbiAgICAgICAgdGhpcy52aWV3ZXIuZGVzdHJveSgpO1xuICAgICAgICB0aGlzLnZpZXdlciA9IG51bGw7XG4gICAgICB9XG4gICAgICBzZWxmLl9zZXR1cFZpZXdlcigpO1xuICAgICAgc2VsZi5zZXR1cENvbnRyb2xzKCk7XG4gICAgICBzZWxmLnNldHVwTGF5ZXJzKCk7XG4gICAgICBzZWxmLmVtaXQoJ3ZpZXdlcnNldCcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIFByb2plY3RTZXJ2aWNlLm9uKCdwcm9qZWN0c2V0JyxmdW5jdGlvbigpe1xuICAgIHNlbGYuc2V0dXBWaWV3ZXIoKTtcbiAgfSk7XG4gIFxuICBQcm9qZWN0U2VydmljZS5vbigncHJvamVjdHN3aXRjaCcsZnVuY3Rpb24oKXtcbiAgICBzZWxmLnNldHVwTGF5ZXJzKCk7XG4gIH0pO1xuICBcbiAgUHJvamVjdFNlcnZpY2Uub25hZnRlcignc2V0TGF5ZXJzVmlzaWJsZScsZnVuY3Rpb24obGF5ZXJzKXtcbiAgICB2YXIgbWFwTGF5ZXJzID0gXy5tYXAobGF5ZXJzLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIHJldHVybiBzZWxmLmdldE1hcExheWVyRm9yTGF5ZXIobGF5ZXIpO1xuICAgIH0pXG4gICAgc2VsZi51cGRhdGVNYXBMYXllcnMobWFwTGF5ZXJzKTtcbiAgfSk7XG4gIFxuICBQcm9qZWN0U2VydmljZS5vbmFmdGVyKCdzZXRCYXNlTGF5ZXInLGZ1bmN0aW9uKCl7XG4gICAgc2VsZi51cGRhdGVNYXBMYXllcnMoc2VsZi5tYXBCYXNlTGF5ZXJzKTtcbiAgfSk7XG4gIFxuICB0aGlzLnNldExheWVyc0V4dHJhUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zLHVwZGF0ZSl7XG4gICAgdGhpcy5sYXllcnNFeHRyYVBhcmFtcyA9IF8uYXNzaWduKHRoaXMubGF5ZXJzRXh0cmFQYXJhbXMscGFyYW1zKTtcbiAgICB0aGlzLmVtaXQoJ2V4dHJhUGFyYW1zU2V0JyxwYXJhbXMsdXBkYXRlKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwVmlld2VyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZXh0ZW50ID0gUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC5leHRlbnQ7XG4gICAgdmFyIHByb2plY3Rpb24gPSBuZXcgb2wucHJvai5Qcm9qZWN0aW9uKHtcbiAgICAgIGNvZGU6IFwiRVBTRzpcIitQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmNycyxcbiAgICAgIGV4dGVudDogZXh0ZW50XG4gICAgfSk7XG4gICAgXG4gICAgLyp2YXIgY29uc3RyYWluX2V4dGVudDtcbiAgICBpZiAodGhpcy5jb25maWcuY29uc3RyYWludGV4dGVudCkge1xuICAgICAgdmFyIGV4dGVudCA9IHRoaXMuY29uZmlnLmNvbnN0cmFpbnRleHRlbnQ7XG4gICAgICB2YXIgZHggPSBleHRlbnRbMl0tZXh0ZW50WzBdO1xuICAgICAgdmFyIGR5ID0gZXh0ZW50WzNdLWV4dGVudFsxXTtcbiAgICAgIHZhciBkeDQgPSBkeC80O1xuICAgICAgdmFyIGR5NCA9IGR5LzQ7XG4gICAgICB2YXIgYmJveF94bWluID0gZXh0ZW50WzBdICsgZHg0O1xuICAgICAgdmFyIGJib3hfeG1heCA9IGV4dGVudFsyXSAtIGR4NDtcbiAgICAgIHZhciBiYm94X3ltaW4gPSBleHRlbnRbMV0gKyBkeTQ7XG4gICAgICB2YXIgYmJveF95bWF4ID0gZXh0ZW50WzNdIC0gZHk0O1xuICAgICAgXG4gICAgICBjb25zdHJhaW5fZXh0ZW50ID0gW2Jib3hfeG1pbixiYm94X3ltaW4sYmJveF94bWF4LGJib3hfeW1heF07XG4gICAgfSovXG4gICAgXG4gICAgdGhpcy52aWV3ZXIgPSBvbDNoZWxwZXJzLmNyZWF0ZVZpZXdlcih7XG4gICAgICB2aWV3OiB7XG4gICAgICAgIHByb2plY3Rpb246IHByb2plY3Rpb24sXG4gICAgICAgIGNlbnRlcjogdGhpcy5jb25maWcuaW5pdGNlbnRlciB8fCBvbC5leHRlbnQuZ2V0Q2VudGVyKFByb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuZXh0ZW50KSxcbiAgICAgICAgem9vbTogdGhpcy5jb25maWcuaW5pdHpvb20gfHwgMCxcbiAgICAgICAgZXh0ZW50OiB0aGlzLmNvbmZpZy5jb25zdHJhaW50ZXh0ZW50IHx8IGV4dGVudCxcbiAgICAgICAgbWluWm9vbTogdGhpcy5jb25maWcubWluem9vbSB8fCAwLCAvLyBkZWZhdWx0IGRpIE9MMyAzLjE2LjBcbiAgICAgICAgbWF4Wm9vbTogdGhpcy5jb25maWcubWF4em9vbSB8fCAyOCAvLyBkZWZhdWx0IGRpIE9MMyAzLjE2LjBcbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLnZpZXdlci5tYXAub24oJ21vdmVlbmQnLGZ1bmN0aW9uKGUpe1xuICAgICAgc2VsZi5fc2V0TWFwVmlldygpO1xuICAgIH0pO1xuICAgIFxuICAgIE1hcFF1ZXJ5U2VydmljZS5pbml0KHRoaXMudmlld2VyLm1hcCk7XG4gICAgXG4gICAgdGhpcy5lbWl0KCdyZWFkeScpO1xuICB9O1xuICBcbiAgdGhpcy5nZXRWaWV3ZXJFbGVtZW50ID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLnZpZXdlci5tYXAuZ2V0VGFyZ2V0RWxlbWVudCgpO1xuICB9O1xuICBcbiAgdGhpcy5nZXRWaWV3cG9ydCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMudmlld2VyLm1hcC5nZXRWaWV3cG9ydCgpO1xuICB9O1xuICBcbiAgdGhpcy5zZXR1cENvbnRyb2xzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcCA9IHNlbGYudmlld2VyLm1hcDtcbiAgICBpZiAodGhpcy5jb25maWcgJiYgdGhpcy5jb25maWcuY29udHJvbHMpIHtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmNvbmZpZy5jb250cm9scyxmdW5jdGlvbihjb250cm9sVHlwZSl7XG4gICAgICAgIHZhciBjb250cm9sO1xuICAgICAgICBzd2l0Y2ggKGNvbnRyb2xUeXBlKSB7XG4gICAgICAgICAgY2FzZSAncmVzZXQnOlxuICAgICAgICAgICAgaWYgKCFpc01vYmlsZS5hbnkpIHtcbiAgICAgICAgICAgICAgY29udHJvbCA9IG5ldyBSZXNldENvbnRyb2woKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3pvb20nOlxuICAgICAgICAgICAgY29udHJvbCA9IG5ldyBvbC5jb250cm9sLlpvb20oe1xuICAgICAgICAgICAgICB6b29tSW5MYWJlbDogXCJcXHVlOThhXCIsXG4gICAgICAgICAgICAgIHpvb21PdXRMYWJlbDogXCJcXHVlOThiXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnem9vbWJveCc6IFxuICAgICAgICAgICAgaWYgKCFpc01vYmlsZS5hbnkpIHtcbiAgICAgICAgICAgICAgY29udHJvbCA9IG5ldyBab29tQm94Q29udHJvbCgpO1xuICAgICAgICAgICAgICBjb250cm9sLm9uKCd6b29tZW5kJyxmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBzZWxmLnZpZXdlci5maXQoZS5leHRlbnQpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnem9vbXRvZXh0ZW50JzpcbiAgICAgICAgICAgIGNvbnRyb2wgPSBuZXcgb2wuY29udHJvbC5ab29tVG9FeHRlbnQoe1xuICAgICAgICAgICAgICBsYWJlbDogIFwiXFx1ZTk4Y1wiLFxuICAgICAgICAgICAgICBleHRlbnQ6IHNlbGYuY29uZmlnLmNvbnN0cmFpbnRleHRlbnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAncXVlcnknOlxuICAgICAgICAgICAgY29udHJvbCA9IG5ldyBRdWVyeUNvbnRyb2woKTtcbiAgICAgICAgICAgIGNvbnRyb2wub24oJ3BpY2tlZCcsZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgIHZhciBjb29yZGluYXRlcyA9IGUuY29vcmRpbmF0ZXM7XG4gXG4gICAgICAgICAgICAgIE1hcFF1ZXJ5U2VydmljZS5xdWVyeVBvaW50KGNvb3JkaW5hdGVzLHNlbGYubWFwTGF5ZXJzKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihjb29yZGluYXRlcyxuZmVhdHVyZXMsZmVhdHVyZXNGb3JMYXllck5hbWVzKXtcbiAgICAgICAgICAgICAgICB2YXIgZmVhdHVyZXNGb3JMYXllcnMgPSBbXTtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZmVhdHVyZXNGb3JMYXllck5hbWVzLGZ1bmN0aW9uKGZlYXR1cmVzLGxheWVyTmFtZSl7XG4gICAgICAgICAgICAgICAgICB2YXIgbGF5ZXIgPSBQcm9qZWN0U2VydmljZS5sYXllcnNbbGF5ZXJOYW1lXTtcbiAgICAgICAgICAgICAgICAgIGZlYXR1cmVzRm9yTGF5ZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBsYXllcjogbGF5ZXIsXG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVzOiBmZWF0dXJlc1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbWFwcXVlcnllbmQnLGZlYXR1cmVzRm9yTGF5ZXJzLG5mZWF0dXJlcyxjb29yZGluYXRlcyxzZWxmLnN0YXRlLnJlc29sdXRpb24pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNvbnRyb2wpIHtcbiAgICAgICAgICBzZWxmLmFkZENvbnRyb2woY29udHJvbCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuYWRkQ29udHJvbCA9IGZ1bmN0aW9uKGNvbnRyb2wpe1xuICAgIHRoaXMudmlld2VyLm1hcC5hZGRDb250cm9sKGNvbnRyb2wpO1xuICB9O1xuICBcbiAgdGhpcy5zZXR1cEJhc2VMYXllcnMgPSBmdW5jdGlvbigpe1xuICAgIGlmICghUHJvamVjdHNSZWdpc3RyeS5zdGF0ZS5iYXNlTGF5ZXJzKXtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMubWFwQmFzZUxheWVycyA9IHt9O1xuICAgIFxuICAgIHZhciBpbml0QmFzZUxheWVyID0gUHJvamVjdFNlcnZpY2UuY29uZmlnLmluaXRiYXNlbGF5ZXI7XG4gICAgdmFyIGJhc2VMYXllcnNBcnJheSA9IFByb2plY3RTZXJ2aWNlLnN0YXRlLmJhc2VMYXllcnM7XG4gICAgXG4gICAgXy5mb3JFYWNoKGJhc2VMYXllcnNBcnJheSxmdW5jdGlvbihiYXNlTGF5ZXIpe1xuICAgICAgdmFyIHZpc2libGUgPSB0cnVlO1xuICAgICAgaWYgKFByb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuaW5pdGJhc2VsYXllcikge1xuICAgICAgICB2aXNpYmxlID0gYmFzZUxheWVyLmlkID09IChQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmluaXRiYXNlbGF5ZXIpO1xuICAgICAgfVxuICAgICAgaWYgKGJhc2VMYXllci5maXhlZCkge1xuICAgICAgICB2aXNpYmxlID0gYmFzZUxheWVyLmZpeGVkO1xuICAgICAgfVxuICAgICAgYmFzZUxheWVyLnZpc2libGUgPSB2aXNpYmxlO1xuICAgIH0pXG4gICAgXG4gICAgYmFzZUxheWVyc0FycmF5LmZvckVhY2goZnVuY3Rpb24obGF5ZXIpeyAgICAgXG4gICAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICB1cmw6IFByb2plY3RTZXJ2aWNlLmdldFdtc1VybCgpLFxuICAgICAgICBpZDogbGF5ZXIuaWQsXG4gICAgICAgIHRpbGVkOiB0cnVlXG4gICAgICB9O1xuICAgICAgXG4gICAgICB2YXIgbWFwTGF5ZXIgPSBuZXcgV01TTGF5ZXIoY29uZmlnKTtcbiAgICAgIHNlbGYucmVnaXN0ZXJMaXN0ZW5lcnMobWFwTGF5ZXIpO1xuICAgICAgXG4gICAgICBtYXBMYXllci5hZGRMYXllcihsYXllcik7XG4gICAgICBzZWxmLm1hcEJhc2VMYXllcnNbbGF5ZXIuaWRdID0gbWFwTGF5ZXI7XG4gICAgfSk7XG4gICAgXG4gICAgXy5mb3JFYWNoKF8udmFsdWVzKHRoaXMubWFwQmFzZUxheWVycykucmV2ZXJzZSgpLGZ1bmN0aW9uKG1hcExheWVyKXtcbiAgICAgIHNlbGYudmlld2VyLm1hcC5hZGRMYXllcihtYXBMYXllci5nZXRPTExheWVyKCkpO1xuICAgICAgbWFwTGF5ZXIudXBkYXRlKHNlbGYuc3RhdGUpO1xuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLnNldHVwTGF5ZXJzID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLnZpZXdlci5yZW1vdmVMYXllcnMoKTtcbiAgICBcbiAgICB0aGlzLnNldHVwQmFzZUxheWVycygpO1xuICAgIFxuICAgIHRoaXMubWFwTGF5ZXJzID0ge307XG4gICAgdGhpcy5sYXllcnNBc3NvY2lhdGlvbiA9IHt9O1xuICAgIHZhciBsYXllcnNBcnJheSA9IHRoaXMudHJhdmVyc2VMYXllcnNUcmVlKFByb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QubGF5ZXJzdHJlZSk7XG4gICAgLy8gcHJlbmRvIHNvbG8gaSBsYXllciB2ZXJpIGUgbm9uIGkgZm9sZGVyXG4gICAgdmFyIGxlYWZMYXllcnNBcnJheSA9IF8uZmlsdGVyKGxheWVyc0FycmF5LGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIHJldHVybiAhXy5nZXQobGF5ZXIsJ25vZGVzJyk7XG4gICAgfSk7XG4gICAgdmFyIG11bHRpTGF5ZXJzID0gXy5ncm91cEJ5KGxlYWZMYXllcnNBcnJheSxmdW5jdGlvbihsYXllcil7XG4gICAgICByZXR1cm4gbGF5ZXIubXVsdGlsYXllcjtcbiAgICB9KTtcbiAgICBfLmZvckVhY2gobXVsdGlMYXllcnMsZnVuY3Rpb24obGF5ZXJzLGlkKXtcbiAgICAgIHZhciBsYXllcklkID0gJ2xheWVyXycraWRcbiAgICAgIHZhciBtYXBMYXllciA9IF8uZ2V0KHNlbGYubWFwTGF5ZXJzLGxheWVySWQpO1xuICAgICAgdmFyIHRpbGVkID0gbGF5ZXJzWzBdLnRpbGVkIC8vIEJSVVRUTywgZGEgc2lzdGVtYXJlIHF1YW5kbyByaW9yZ2FuaXp6ZXJlbW8gaSBtZXRhbGF5ZXIgKGRhIGZhciBkaXZlbnRhcmUgbXVsdGlsYXllcikuIFBlciBvcmEgcG9zc28gY29uZmlndXJhcmUgdGlsZWQgc29sbyBpIGxheWVyIHNpbmdvbGlcbiAgICAgIHZhciBjb25maWcgPSB7XG4gICAgICAgIHVybDogUHJvamVjdFNlcnZpY2UuZ2V0V21zVXJsKCksXG4gICAgICAgIGlkOiBsYXllcklkLFxuICAgICAgICB0aWxlZDogdGlsZWRcbiAgICAgIH07XG4gICAgICBtYXBMYXllciA9IHNlbGYubWFwTGF5ZXJzW2xheWVySWRdID0gbmV3IFdNU0xheWVyKGNvbmZpZyxzZWxmLmxheWVyc0V4dHJhUGFyYW1zKTtcbiAgICAgIHNlbGYucmVnaXN0ZXJMaXN0ZW5lcnMobWFwTGF5ZXIpO1xuICAgICAgXG4gICAgICBsYXllcnMuZm9yRWFjaChmdW5jdGlvbihsYXllcil7XG4gICAgICAgIG1hcExheWVyLmFkZExheWVyKGxheWVyKTtcbiAgICAgICAgc2VsZi5sYXllcnNBc3NvY2lhdGlvbltsYXllci5pZF0gPSBsYXllcklkO1xuICAgICAgfSk7XG4gICAgfSlcbiAgICBcbiAgICBfLmZvckVhY2goXy52YWx1ZXModGhpcy5tYXBMYXllcnMpLnJldmVyc2UoKSxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICBzZWxmLnZpZXdlci5tYXAuYWRkTGF5ZXIobWFwTGF5ZXIuZ2V0T0xMYXllcigpKTtcbiAgICAgIG1hcExheWVyLnVwZGF0ZShzZWxmLnN0YXRlLHNlbGYubGF5ZXJzRXh0cmFQYXJhbXMpO1xuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLnVwZGF0ZU1hcExheWVycyA9IGZ1bmN0aW9uKG1hcExheWVycykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBfLmZvckVhY2goXy52YWx1ZXMobWFwTGF5ZXJzKSxmdW5jdGlvbihtYXBMYXllcil7XG4gICAgICBtYXBMYXllci51cGRhdGUoc2VsZi5zdGF0ZSxzZWxmLmxheWVyc0V4dHJhUGFyYW1zKTtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5nZXRNYXBMYXllckZvckxheWVyID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIHJldHVybiB0aGlzLm1hcExheWVyc1snbGF5ZXJfJytsYXllci5tdWx0aWxheWVyXTtcbiAgfTtcbiAgXG4gIHRoaXMudHJhdmVyc2VMYXllcnNUcmVlID0gZnVuY3Rpb24obGF5ZXJzVHJlZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsYXllcnNBcnJheSA9IFtdO1xuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKG9iail7XG4gICAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgaWYgKCFfLmlzTmlsKHZhbC5pZCkpIHtcbiAgICAgICAgICAgICAgbGF5ZXJzQXJyYXkudW5zaGlmdCh2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIV8uaXNOaWwodmFsLm5vZGVzKSkge1xuICAgICAgICAgICAgICB0cmF2ZXJzZSh2YWwubm9kZXMpO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICB0cmF2ZXJzZShsYXllcnNUcmVlKTtcbiAgICByZXR1cm4gbGF5ZXJzQXJyYXk7XG4gIH07XG4gIFxuICB0aGlzLnJlZ2lzdGVyTGlzdGVuZXJzID0gZnVuY3Rpb24obWFwTGF5ZXIpe1xuICAgIG1hcExheWVyLm9uKCdsb2Fkc3RhcnQnLGZ1bmN0aW9uKCl7XG4gICAgICBzZWxmLl9pbmNyZW1lbnRMb2FkZXJzKCk7XG4gICAgfSk7XG4gICAgbWFwTGF5ZXIub24oJ2xvYWRlbmQnLGZ1bmN0aW9uKCl7XG4gICAgICBzZWxmLl9kZWNyZW1lbnRMb2FkZXJzKGZhbHNlKTtcbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLm9uKCdleHRyYVBhcmFtc1NldCcsZnVuY3Rpb24oZXh0cmFQYXJhbXMsdXBkYXRlKXtcbiAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgbWFwTGF5ZXIudXBkYXRlKHRoaXMuc3RhdGUsZXh0cmFQYXJhbXMpO1xuICAgICAgfVxuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLnNob3dWaWV3ZXIgPSBmdW5jdGlvbihlbElkKXtcbiAgICB0aGlzLnZpZXdlci5zZXRUYXJnZXQoZWxJZCk7XG4gICAgdmFyIG1hcCA9IHRoaXMudmlld2VyLm1hcDtcbiAgICBHVUkub24oJ2d1aXJlYWR5JyxmdW5jdGlvbigpe1xuICAgICAgc2VsZi5fc2V0TWFwVmlldygpO1xuICAgIH0pO1xuICB9O1xuICBcbiAgXG4gIC8vIHBlciBjcmVhcmUgdW5hIHBpbGEgZGkgb2wuaW50ZXJhY3Rpb24gaW4gY3VpIGwndWx0aW1vIGNoZSBzaSBhZ2dpdW5nZSBkaXNhdHRpdmEgdGVtcG9yYWVtZW50ZSBpIHByZWNlZGVudGkgKHBlciBwb2kgdG9nbGllcnNpIGRpIG1lenpvIGNvbiBwb3BJbnRlcmFjdGlvbiEpXG4gIC8vIFVzYXRvIGFkIGVzLiBkYSBwaWNrZmVhdHVyZXRvb2wgZSBnZXRmZWF0dXJlaW5mb1xuICB0aGlzLnB1c2hJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICBpZiAodGhpcy5faW50ZXJhY3Rpb25zU3RhY2subGVuZ3RoKXtcbiAgICAgIHZhciBwcmV2SW50ZXJhY3Rpb24gPSB0aGlzLl9pbnRlcmFjdGlvbnNTdGFjay5zbGljZSgtMSlbMF07XG4gICAgICBpZiAoXy5pc0FycmF5KHByZXZJbnRlcmFjdGlvbikpe1xuICAgICAgICBfLmZvckVhY2gocHJldkludGVyYWN0aW9uLGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICAgICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgcHJldkludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgICB9O1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnZpZXdlci5tYXAuYWRkSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xuICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICB0aGlzLl9pbnRlcmFjdGlvbnNTdGFjay5wdXNoKGludGVyYWN0aW9uKVxuICB9O1xuICBcbiAgdGhpcy5wb3BJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGludGVyYWN0aW9uID0gdGhpcy5faW50ZXJhY3Rpb25zU3RhY2sucG9wKCk7XG4gICAgdGhpcy52aWV3ZXIubWFwLnJlbW92ZUludGVyYWN0aW9uKGludGVyYWN0aW9uKTtcbiAgICBcbiAgICBpZiAodGhpcy5faW50ZXJhY3Rpb25zU3RhY2subGVuZ3RoKXtcbiAgICAgIHZhciBwcmV2SW50ZXJhY3Rpb24gPSB0aGlzLl9pbnRlcmFjdGlvbnNTdGFjay5zbGljZSgtMSlbMF07XG4gICAgICBpZiAoXy5pc0FycmF5KHByZXZJbnRlcmFjdGlvbikpe1xuICAgICAgICBfLmZvckVhY2gocHJldkludGVyYWN0aW9uLGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICAgICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgICBwcmV2SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLmdvVG8gPSBmdW5jdGlvbihjb29yZGluYXRlcyx6b29tKXtcbiAgICB2YXIgem9vbSA9IHpvb20gfHwgNjtcbiAgICB0aGlzLnZpZXdlci5nb1RvKGNvb3JkaW5hdGVzLHpvb20pO1xuICB9O1xuICBcbiAgdGhpcy5nb1RvV0dTODQgPSBmdW5jdGlvbihjb29yZGluYXRlcyx6b29tKXtcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBvbC5wcm9qLnRyYW5zZm9ybShjb29yZGluYXRlcywnRVBTRzo0MzI2JywnRVBTRzonK1Byb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuY3JzKTtcbiAgICB0aGlzLmdvVG8oY29vcmRpbmF0ZXMsem9vbSk7XG4gIH07XG4gIFxuICB0aGlzLmV4dGVudFRvV0dTODQgPSBmdW5jdGlvbihleHRlbnQpe1xuICAgIHJldHVybiBvbC5wcm9qLnRyYW5zZm9ybUV4dGVudChleHRlbnQsJ0VQU0c6JytQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LmNycywnRVBTRzo0MzI2Jyk7XG4gIH07XG4gIFxuICB0aGlzLmdldEZlYXR1cmVJbmZvID0gZnVuY3Rpb24obGF5ZXJJZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB0aGlzLl9waWNrSW50ZXJhY3Rpb24gPSBuZXcgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24oKTtcbiAgICAvL3RoaXMudmlld2VyLm1hcC5hZGRJbnRlcmFjdGlvbih0aGlzLl9waWNrSW50ZXJhY3Rpb24pO1xuICAgIC8vdGhpcy5fcGlja0ludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICB0aGlzLnB1c2hJbnRlcmFjdGlvbih0aGlzLl9waWNrSW50ZXJhY3Rpb24pO1xuICAgIHRoaXMuX3BpY2tJbnRlcmFjdGlvbi5vbigncGlja2VkJyxmdW5jdGlvbihlKXtcbiAgICAgIHNlbGYuX2NvbXBsZXRlR2V0RmVhdHVyZUluZm8obGF5ZXJJZCxlLmNvb3JkaW5hdGUsZGVmZXJyZWQpO1xuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NvbXBsZXRlR2V0RmVhdHVyZUluZm8gPSBmdW5jdGlvbihsYXllcklkLGNvb3JkaW5hdGUsZGVmZXJyZWQpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcHJvamVjdFR5cGUgPSBQcm9qZWN0U2VydmljZS5zdGF0ZS5wcm9qZWN0LnR5cGU7XG4gICAgXG4gICAgdmFyIG1hcExheWVyID0gdGhpcy5tYXBMYXllcnNbdGhpcy5sYXllcnNBc3NvY2lhdGlvbltsYXllcklkXV07XG4gICAgdmFyIHJlc29sdXRpb24gPSBzZWxmLnZpZXdlci5nZXRSZXNvbHV0aW9uKCk7XG4gICAgdmFyIGVwc2cgPSBzZWxmLnZpZXdlci5tYXAuZ2V0VmlldygpLmdldFByb2plY3Rpb24oKS5nZXRDb2RlKCk7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIFFVRVJZX0xBWUVSUzogUHJvamVjdFNlcnZpY2UuZ2V0TGF5ZXIobGF5ZXJJZCkubmFtZSxcbiAgICAgIElORk9fRk9STUFUOiBcInRleHQveG1sXCJcbiAgICB9XG4gICAgXG4gICAgaWYgKHByb2plY3RUeXBlID09IFByb2plY3RUeXBlcy5RREpBTkdPKXtcbiAgICAgIHZhciB0b2xlcmFuY2VQYXJhbXMgPSBQaWNrVG9sZXJhbmNlUGFyYW1zW3Byb2plY3RUeXBlXTtcbiAgICAgIGlmICh0b2xlcmFuY2VQYXJhbXMpe1xuICAgICAgICB2YXIgZ2VvbWV0cnl0eXBlID0gUHJvamVjdFNlcnZpY2UuZ2V0TGF5ZXIobGF5ZXJJZCkuZ2VvbWV0cnl0eXBlO1xuICAgICAgICBwYXJhbXNbdG9sZXJhbmNlUGFyYW1zW2dlb21ldHJ5dHlwZV1dID0gUGlja1RvbGVyYW5jZVZhbHVlc1tnZW9tZXRyeXR5cGVdO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB2YXIgZ2V0RmVhdHVyZUluZm9VcmwgPSBtYXBMYXllci5nZXRTb3VyY2UoKS5nZXRHZXRGZWF0dXJlSW5mb1VybChjb29yZGluYXRlLHJlc29sdXRpb24sZXBzZyxwYXJhbXMpO1xuICAgICQuZ2V0KGdldEZlYXR1cmVJbmZvVXJsKVxuICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgdmFyIHgyanMgPSBuZXcgWDJKUygpO1xuICAgICAgdmFyIGpzb25EYXRhID0geDJqcy54bWwyanNvbihkYXRhKTtcbiAgICAgIGlmIChqc29uRGF0YS5HZXRGZWF0dXJlSW5mb1Jlc3BvbnNlLkxheWVyLkZlYXR1cmUpe1xuICAgICAgICB2YXIgYXR0cmlidXRlcyA9IGpzb25EYXRhLkdldEZlYXR1cmVJbmZvUmVzcG9uc2UuTGF5ZXIuRmVhdHVyZS5BdHRyaWJ1dGU7XG4gICAgICAgIHZhciBhdHRyaWJ1dGVzT2JqID0ge307XG4gICAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLGZ1bmN0aW9uKGF0dHJpYnV0ZSl7XG4gICAgICAgICAgYXR0cmlidXRlc09ialthdHRyaWJ1dGUuX25hbWVdID0gYXR0cmlidXRlLl92YWx1ZTsgLy8gWDJKUyBhZ2dpdW5nZSBcIl9cIiBjb21lIHByZWZpc3NvIGRlZ2xpIGF0dHJpYnV0aVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShhdHRyaWJ1dGVzT2JqKTtcbiAgICAgIH1cbiAgICAgIGRlZmVycmVkLnJlamVjdCgpOztcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9KVxuICAgIC5hbHdheXMoZnVuY3Rpb24oKXtcbiAgICAgIC8vc2VsZi52aWV3ZXIubWFwLnJlbW92ZUludGVyYWN0aW9uKHNlbGYuX3BpY2tJbnRlcmFjdGlvbik7XG4gICAgICBzZWxmLnBvcEludGVyYWN0aW9uKCk7XG4gICAgICBzZWxmLl9waWNrSW50ZXJhY3Rpb24gPSBudWxsO1xuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLmhpZ2hsaWdodEdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnlPYmosb3B0aW9ucyl7ICAgIFxuICAgIHZhciBnZW9tZXRyeTtcbiAgICBpZiAoZ2VvbWV0cnlPYmogaW5zdGFuY2VvZiBvbC5nZW9tLkdlb21ldHJ5KXtcbiAgICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnlPYmo7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZm9ybWF0ID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OO1xuICAgICAgZ2VvbWV0cnkgPSBmb3JtYXQucmVhZEdlb21ldHJ5KGdlb21ldHJ5T2JqKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKG9wdGlvbnMuem9vbSkge1xuICAgICAgdGhpcy52aWV3ZXIuZml0KGdlb21ldHJ5KTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiB8fCA0MDAwO1xuICAgIFxuICAgIGlmIChvcHRpb25zLmZyb21XR1M4NCkge1xuICAgICAgZ2VvbWV0cnkudHJhbnNmb3JtKCdFUFNHOjQzMjYnLCdFUFNHOicrUHJvamVjdFNlcnZpY2Uuc3RhdGUucHJvamVjdC5jcnMpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgZmVhdHVyZSA9IG5ldyBvbC5GZWF0dXJlKHtcbiAgICAgIGdlb21ldHJ5OiBnZW9tZXRyeVxuICAgIH0pO1xuICAgIHZhciBzb3VyY2UgPSBuZXcgb2wuc291cmNlLlZlY3RvcigpO1xuICAgIHNvdXJjZS5hZGRGZWF0dXJlcyhbZmVhdHVyZV0pO1xuICAgIHZhciBsYXllciA9IG5ldyBvbC5sYXllci5WZWN0b3Ioe1xuICAgICAgc291cmNlOiBzb3VyY2UsXG4gICAgICBzdHlsZTogZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAgIHZhciBzdHlsZXMgPSBbXTtcbiAgICAgICAgdmFyIGdlb21ldHJ5VHlwZSA9IGZlYXR1cmUuZ2V0R2VvbWV0cnkoKS5nZXRUeXBlKCk7XG4gICAgICAgIGlmIChnZW9tZXRyeVR5cGUgPT0gJ0xpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgdmFyIHN0eWxlID0gbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgICAgIGNvbG9yOiAncmdiKDI1NSwyNTUsMCknLFxuICAgICAgICAgICAgICB3aWR0aDogNFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICAgIHN0eWxlcy5wdXNoKHN0eWxlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChnZW9tZXRyeVR5cGUgPT0gJ1BvaW50Jyl7XG4gICAgICAgICAgdmFyIHN0eWxlID0gbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgICAgICAgcmFkaXVzOiA2LFxuICAgICAgICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgICAgICAgY29sb3I6ICdyZ2IoMjU1LDI1NSwwKScsXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHpJbmRleDogSW5maW5pdHlcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBzdHlsZXMucHVzaChzdHlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzdHlsZXM7XG4gICAgICB9XG4gICAgfSlcbiAgICBsYXllci5zZXRNYXAodGhpcy52aWV3ZXIubWFwKTtcbiAgICBcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBsYXllci5zZXRNYXAobnVsbCk7XG4gICAgfSxkdXJhdGlvbik7XG4gIH07XG4gIFxuICB0aGlzLnJlZnJlc2hNYXAgPSBmdW5jdGlvbigpe1xuICAgIF8uZm9yRWFjaCh0aGlzLm1hcExheWVycyxmdW5jdGlvbih3bXNMYXllcil7XG4gICAgICB3bXNMYXllci5nZXRMYXllcigpLmdldFNvdXJjZSgpLnVwZGF0ZVBhcmFtcyh7XCJ0aW1lXCI6IERhdGUubm93KCl9KTtcbiAgICB9KVxuICB9O1xuICBcbiAgYmFzZSh0aGlzKTtcbiAgXG4gIHRoaXMuX3NldE1hcFZpZXcgPSBmdW5jdGlvbigpe1xuICAgIHZhciBiYm94ID0gdGhpcy52aWV3ZXIuZ2V0QkJPWCgpO1xuICAgIHZhciByZXNvbHV0aW9uID0gdGhpcy52aWV3ZXIuZ2V0UmVzb2x1dGlvbigpO1xuICAgIHZhciBjZW50ZXIgPSB0aGlzLnZpZXdlci5nZXRDZW50ZXIoKTtcbiAgICB0aGlzLnNldE1hcFZpZXcoYmJveCxyZXNvbHV0aW9uLGNlbnRlcik7XG4gIH07XG59O1xuXG5pbmhlcml0KE1hcFNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTWFwU2VydmljZVxuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBQbHVnaW4oKXtcbiAgdGhpcy5pZCA9IFwicGx1Z2luXCI7XG4gIHRoaXMudG9vbHMgPSBbXTtcbn1cbmluaGVyaXQoUGx1Z2luLEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IFBsdWdpbi5wcm90b3R5cGU7XG5cbnByb3RvLnByb3ZpZGVzVG9vbHMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy50b29scy5sZW5ndGggPiAwO1xufTtcblxucHJvdG8uZ2V0VG9vbHMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy50b29scztcbn07XG5cbnByb3RvLmdldEFjdGlvbnMgPSBmdW5jdGlvbih0b29sKXtcbiAgcmV0dXJuIHRvb2wuYWN0aW9ucztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGx1Z2luO1xuIiwidmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcblxudmFyIFRvb2xzU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvcGx1Z2luL3Rvb2xzc2VydmljZScpO1xuXG5mdW5jdGlvbiBQbHVnaW5zUmVnaXN0cnkoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIC8vIHVuIGRvbWFuaSBxdWVzdG8gc2Fyw6AgZGluYW1pY29cbiAgdGhpcy5wbHVnaW5zID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgdG9vbHNwcm92aWRlcnM6IFtdXG4gIH07XG4gIFxuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0VG9vbHNQcm92aWRlcjogZnVuY3Rpb24ocGx1Z2luKSB7XG4gICAgICBzZWxmLnN0YXRlLnRvb2xzcHJvdmlkZXJzLnB1c2gocGx1Z2luKTtcbiAgICB9XG4gIH1cbiAgXG4gIGJhc2UodGhpcyk7XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICBfLmZvckVhY2goY29uZmlnLnBsdWdpbnMsZnVuY3Rpb24ocGx1Z2luKXtcbiAgICAgIHNlbGYuX3NldHVwKHBsdWdpbik7XG4gICAgfSlcbiAgfTtcbiAgXG4gIC8vIFBlciBwZXJtZXR0ZXJlIGxhIHJlZ2lzdHJhemlvbmUgYW5jaGUgaW4gdW4gc2Vjb25kbyBtb21lbnRvXG4gIHRoaXMucmVnaXN0ZXIgPSBmdW5jdGlvbihwbHVnaW4pe1xuICAgIGlmICghdGhpcy5wbHVnaW5zW3BsdWdpbi5uYW1lXSkge1xuICAgICAgdGhpcy5fc2V0dXAocGx1Z2luKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl9zZXR1cCA9IGZ1bmN0aW9uKHBsdWdpbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcGx1Z2luQ29uZmlnID0gdGhpcy5jb25maWcuY29uZmlnc1twbHVnaW4ubmFtZV07XG4gICAgaWYgKHBsdWdpbkNvbmZpZyl7XG4gICAgICBwbHVnaW4uaW5pdChwbHVnaW5Db25maWcpO1xuICAgICAgc2VsZi5wbHVnaW5zW25hbWVdID0gcGx1Z2luO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuYWN0aXZhdGUgPSBmdW5jdGlvbihwbHVnaW4pIHtcbiAgICB2YXIgdG9vbHMgPSBwbHVnaW4uZ2V0VG9vbHMoKTtcbiAgICBpZiAodG9vbHMubGVuZ3RoKSB7XG4gICAgICBUb29sc1NlcnZpY2UucmVnaXN0ZXJUb29sc1Byb3ZpZGVyKHBsdWdpbik7XG4gICAgfVxuICB9O1xufTtcblxuaW5oZXJpdChQbHVnaW5zUmVnaXN0cnksRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGx1Z2luc1JlZ2lzdHJ5XG4iLCJ2YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBQbHVnaW5zU2VydmljZSgpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgLy8gdW4gZG9tYW5pIHF1ZXN0byBzYXLDoCBkaW5hbWljb1xuICB0aGlzLnBsdWdpbnMgPSB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICB0b29sc3Byb3ZpZGVyczogW11cbiAgfTtcbiAgXG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBzZXRUb29sc1Byb3ZpZGVyOiBmdW5jdGlvbihwbHVnaW4pIHtcbiAgICAgIHNlbGYuc3RhdGUudG9vbHNwcm92aWRlcnMucHVzaChwbHVnaW4pO1xuICAgIH1cbiAgfVxuICBcbiAgYmFzZSh0aGlzKTtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIF8uZm9yRWFjaChjb25maWcucGx1Z2lucyxmdW5jdGlvbihwbHVnaW4pe1xuICAgICAgc2VsZi5fc2V0dXAocGx1Z2luKTtcbiAgICB9KVxuICAgIHRoaXMuZW1pdChcImluaXRlbmRcIik7XG4gIH07XG4gIFxuICAvLyBQZXIgcGVybWV0dGVyZSBsYSByZWdpc3RyYXppb25lIGFuY2hlIGluIHVuIHNlY29uZG8gbW9tZW50b1xuICB0aGlzLnJlZ2lzdGVyID0gZnVuY3Rpb24ocGx1Z2luKXtcbiAgICBpZiAoIXRoaXMucGx1Z2luc1twbHVnaW4ubmFtZV0pIHtcbiAgICAgIHRoaXMuX3NldHVwKHBsdWdpbik7XG4gICAgfVxuICB9XG4gIFxuICB0aGlzLl9zZXR1cCA9IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBwbHVnaW5Db25maWcgPSB0aGlzLmNvbmZpZy5jb25maWdzW3BsdWdpbi5uYW1lXTtcbiAgICBpZiAocGx1Z2luQ29uZmlnKXtcbiAgICAgIHBsdWdpbi5pbml0KHBsdWdpbkNvbmZpZylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYucGx1Z2luc1tuYW1lXSA9IHBsdWdpbjtcbiAgICAgICAgaWYgKHBsdWdpbi5wcm92aWRlc1Rvb2xzKCkpe1xuICAgICAgICAgIHNlbGYuc2V0VG9vbHNQcm92aWRlcihwbHVnaW4pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfVxufTtcblxuaW5oZXJpdChQbHVnaW5zU2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBQbHVnaW5zU2VydmljZVxuIiwidmFyIGluaGVyaXQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xuXG5mdW5jdGlvbiBUb29sc1NlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuX2FjdGlvbnMgPSB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICB0b29sczogW11cbiAgfTtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5zZXRTdGF0ZSgpO1xuICB9O1xuICBcbiAgdGhpcy5zZXRTdGF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fbWVyZ2VUb29scyh0aGlzLmNvbmZpZy50b29scyk7XG4gIH07XG4gIFxuICB0aGlzLnJlZ2lzdGVyVG9vbHNQcm92aWRlciA9IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgc2VsZi5fbWVyZ2VUb29scyhwbHVnaW4uZ2V0VG9vbHMoKSk7XG4gICAgc2VsZi5fYWRkQWN0aW9ucyhwbHVnaW4pO1xuICB9XG4gIFxuICB0aGlzLmZpcmVBY3Rpb24gPSBmdW5jdGlvbihhY3Rpb25pZCl7XG4gICAgdmFyIHBsdWdpbiA9IHRoaXMuX2FjdGlvbnNbYWN0aW9uaWRdO1xuICAgIHZhciBtZXRob2QgPSB0aGlzLl9hY3Rpb25NZXRob2QoYWN0aW9uaWQpO1xuICAgIHBsdWdpblttZXRob2RdKCk7XG4gIH07XG4gIFxuICB0aGlzLl9hY3Rpb25NZXRob2QgPSBmdW5jdGlvbihhY3Rpb25pZCl7XG4gICAgdmFyIG5hbWVzcGFjZSA9IGFjdGlvbmlkLnNwbGl0KFwiOlwiKTtcbiAgICByZXR1cm4gbmFtZXNwYWNlLnBvcCgpO1xuICB9O1xuICBcbiAgdGhpcy5fbWVyZ2VUb29scyA9IGZ1bmN0aW9uKHRvb2xzKXtcbiAgICBzZWxmLnN0YXRlLnRvb2xzID0gXy5jb25jYXQoc2VsZi5zdGF0ZS50b29scyx0b29scyk7XG4gIH07XG4gIFxuICB0aGlzLl9hZGRBY3Rpb25zID0gZnVuY3Rpb24ocGx1Z2luKXtcbiAgICBfLmZvckVhY2gocGx1Z2luLmdldFRvb2xzKCksZnVuY3Rpb24odG9vbCl7XG4gICAgICBfLmZvckVhY2gocGx1Z2luLmdldEFjdGlvbnModG9vbCksZnVuY3Rpb24oYWN0aW9uKXtcbiAgICAgICAgc2VsZi5fYWN0aW9uc1thY3Rpb24uaWRdID0gcGx1Z2luO1xuICAgICAgfSlcbiAgICB9KVxuICB9O1xufTtcblxuLy8gTWFrZSB0aGUgcHVibGljIHNlcnZpY2UgZW4gRXZlbnQgRW1pdHRlclxuaW5oZXJpdChUb29sc1NlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVG9vbHNTZXJ2aWNlXG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzLy91dGlscycpLmJhc2U7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBMYXllclN0YXRlID0gcmVxdWlyZSgnY29yZS9sYXllci9sYXllcnN0YXRlLmpzJyk7XG5cbnZhciBQcm9qZWN0VHlwZXMgPSB7XG4gIFFESkFOR086ICdxZGphbmdvJyxcbiAgT0dSOiAnb2dyJ1xufTtcblxuZnVuY3Rpb24gUHJvamVjdFNlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMubGF5ZXJzID0ge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgcHJvamVjdDogbnVsbCxcbiAgICBiYXNlTGF5ZXJzOiBbXVxuICB9O1xuICBcbiAgdGhpcy5zZXR0ZXJzID0ge1xuICAgIHNldExheWVyc1Zpc2libGU6IGZ1bmN0aW9uKGxheWVycyx2aXNpYmxlKXtcbiAgICAgIF8uZm9yRWFjaChsYXllcnMsZnVuY3Rpb24obGF5ZXIpe1xuICAgICAgICBzZWxmLmxheWVyc1tsYXllci5pZF0udmlzaWJsZSA9IHZpc2libGU7XG4gICAgICB9KVxuICAgIH0sXG4gICAgc2V0QmFzZUxheWVyOiBmdW5jdGlvbihpZCl7XG4gICAgICBfLmZvckVhY2goc2VsZi5zdGF0ZS5iYXNlTGF5ZXJzLGZ1bmN0aW9uKGJhc2VMYXllcil7XG4gICAgICAgIGJhc2VMYXllci52aXNpYmxlID0gKGJhc2VMYXllci5pZCA9PSBpZCk7XG4gICAgICB9KVxuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gIH07XG4gIFxuICAvLyBnZW5lcmEgbCdvZ2dldHRvIGxheWVycyAocGVyIHJpZmVyaW1lbnRvKSwgcGVyIHNlbXBsaWZpY2FyZSBnbGkgYWdnaW9ybmFtZW50aSBkZWxsbyBzdGF0byBkZWwgbGF5ZXJzdHJlZVxuICB0aGlzLm1ha2VMYXllcnNPYmogPSBmdW5jdGlvbihsYXllcnN0cmVlKXtcbiAgICB0aGlzLmxheWVycyA9IHt9O1xuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKG9iail7XG4gICAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKGxheWVyLCBrZXkpIHtcbiAgICAgICAgICAgIC8vdmVyaWZpY2EgY2hlIGlsIHZhbG9yZSBkZWxsJ2lkIG5vbiBzaWEgbnVsbG9cbiAgICAgICAgICAgIGlmICghXy5pc05pbChsYXllci5pZCkpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmxheWVyc1tsYXllci5pZF0gPSBsYXllcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghXy5pc05pbChsYXllci5ub2RlcykpIHtcbiAgICAgICAgICAgICAgICB0cmF2ZXJzZShsYXllci5ub2Rlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB0cmF2ZXJzZShsYXllcnN0cmVlKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0Q3VycmVudFByb2plY3QgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLnN0YXRlLnByb2plY3Q7XG4gIH07XG4gIFxuICB0aGlzLnNldFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0LGRvc3dpdGNoKXtcbiAgICAvKiBzdHJ1dHR1cmEgb2dnZXR0byAncHJvamVjdCdcbiAgICB7XG4gICAgICBpZCxcbiAgICAgIHR5cGUsXG4gICAgICBnaWQsXG4gICAgICBuYW1lLFxuICAgICAgY3JzLFxuICAgICAgZXh0ZW50LFxuICAgICAgbGF5ZXJzdHJlZSxcbiAgICAgIHdpZGdldHNcbiAgICB9XG4gICAgKi9cbiAgICB0aGlzLnN0YXRlLnByb2plY3QgPSBwcm9qZWN0O1xuICAgIHRoaXMuc3RhdGUuYmFzZUxheWVycyA9IHByb2plY3QuYmFzZUxheWVycztcbiAgICB0aGlzLm1ha2VMYXllcnNPYmoocHJvamVjdC5sYXllcnN0cmVlKTtcbiAgICB2YXIgZXZlbnRUeXBlID0gJ3Byb2plY3RzZXQnO1xuICAgIGlmIChkb3N3aXRjaCAmJiBkb3N3aXRjaCA9PT0gdHJ1ZSkge1xuICAgICAgZXZlbnRUeXBlID0gJ3Byb2plY3Rzd2l0Y2gnO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoZXZlbnRUeXBlKTtcbiAgfTtcbiAgXG4gIHRoaXMuc3dpdGNoUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICB0aGlzLnNldFByb2plY3QocHJvamVjdCx0cnVlKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0TGF5ZXIgPSBmdW5jdGlvbihpZCl7XG4gICAgcmV0dXJuIHRoaXMubGF5ZXJzW2lkXTtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0TGF5ZXJzID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5sYXllcnM7XG4gIH07XG4gIFxuICB0aGlzLmdldExheWVyQnlJZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIGxheWVyID0gbnVsbDtcbiAgICBfLmZvckVhY2godGhpcy5nZXRMYXllcnMoKSxmdW5jdGlvbihfbGF5ZXIpe1xuICAgICAgaWYgKF9sYXllci5pZCA9PSBpZCl7XG4gICAgICAgIGxheWVyID0gX2xheWVyO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBsYXllcjtcbiAgfTtcbiAgXG4gIHRoaXMuZ2V0TGF5ZXJCeU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGxheWVyID0gbnVsbDtcbiAgICBfLmZvckVhY2godGhpcy5nZXRMYXllcnMoKSxmdW5jdGlvbihfbGF5ZXIpe1xuICAgICAgaWYgKF9sYXllci5uYW1lID09IG5hbWUpe1xuICAgICAgICBsYXllciA9IF9sYXllcjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbGF5ZXI7XG4gIH07XG4gIFxuICB0aGlzLmdldFF1ZXJ5YWJsZUxheWVycyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHF1ZXJ5YWJsZUxheWVycyA9IFtdO1xuICAgIF8uZm9yRWFjaCh0aGlzLmdldExheWVycygpLGZ1bmN0aW9uKGxheWVyKXtcbiAgICAgIGlmIChMYXllclN0YXRlLmlzUXVlcnlhYmxlKGxheWVyKSl7XG4gICAgICAgIHF1ZXJ5YWJsZUxheWVycy5wdXNoKGxheWVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcXVlcnlhYmxlTGF5ZXJzO1xuICB9O1xuICBcbiAgdGhpcy5nZXRMYXllckF0dHJpYnV0ZXMgPSBmdW5jdGlvbihpZCl7XG4gICAgcmV0dXJuIHRoaXMubGF5ZXJzW2lkXS5hdHRyaWJ1dGVzO1xuICB9O1xuICBcbiAgdGhpcy5nZXRMYXllckF0dHJpYnV0ZUxhYmVsID0gZnVuY3Rpb24oaWQsbmFtZSl7XG4gICAgdmFyIGxhYmVsID0gJyc7XG4gICAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzW2lkXS5hdHRyaWJ1dGVzLGZ1bmN0aW9uKGF0dHJpYnV0ZSl7XG4gICAgICBpZiAoYXR0cmlidXRlLm5hbWUgPT0gbmFtZSl7XG4gICAgICAgIGxhYmVsID0gYXR0cmlidXRlLmxhYmVsO1xuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGxhYmVsO1xuICB9O1xuICBcbiAgdGhpcy50b2dnbGVMYXllciA9IGZ1bmN0aW9uKGxheWVyLHZpc2libGUpe1xuICAgIHZhciB2aXNpYmxlID0gdmlzaWJsZSB8fCAhbGF5ZXIudmlzaWJsZTtcbiAgICBzZWxmLnNldExheWVyc1Zpc2libGUoW2xheWVyXSx2aXNpYmxlKTtcbiAgfTtcbiAgXG4gIHRoaXMudG9nZ2xlTGF5ZXJzID0gZnVuY3Rpb24obGF5ZXJzLHZpc2libGUpe1xuICAgIHNlbGYuc2V0TGF5ZXJzVmlzaWJsZShsYXllcnMsdmlzaWJsZSk7XG4gIH07XG4gIFxuICB0aGlzLmdldFdtc1VybCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldFdtc1VybCh0aGlzLnN0YXRlLnByb2plY3QpO1xuICB9O1xuICBcbiAgdGhpcy5nZXRMZWdlbmRVcmwgPSBmdW5jdGlvbihsYXllcil7XG4gICAgdmFyIHVybCA9IHRoaXMuZ2V0V21zVXJsKHRoaXMuc3RhdGUpO1xuICAgIHNlcCA9ICh1cmwuaW5kZXhPZignPycpID4gLTEpID8gJyYnIDogJz8nO1xuICAgIHJldHVybiB0aGlzLmdldFdtc1VybCh0aGlzLnN0YXRlKStzZXArJ1NFUlZJQ0U9V01TJlZFUlNJT049MS4zLjAmUkVRVUVTVD1HZXRMZWdlbmRHcmFwaGljJlNMRF9WRVJTSU9OPTEuMS4wJkZPUk1BVD1pbWFnZS9wbmcmVFJBTlNQQVJFTlQ9dHJ1ZSZJVEVNRk9OVENPTE9SPXdoaXRlJkxBWUVSVElUTEU9RmFsc2UmSVRFTUZPTlRTSVpFPTEwJkxBWUVSPScrbGF5ZXIubmFtZTtcbiAgfTtcbiAgXG4gIGJhc2UodGhpcyk7XG59O1xuXG5pbmhlcml0KFByb2plY3RTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBQcm9qZWN0U2VydmljZTogbmV3IFByb2plY3RTZXJ2aWNlLFxuICBQcm9qZWN0VHlwZXM6IFByb2plY3RUeXBlc1xufTtcbiIsInZhciBpbmhlcml0ID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLmluaGVyaXQ7XG52YXIgYmFzZSA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5iYXNlO1xudmFyIHJlc29sdmVkVmFsdWUgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykucmVzb2x2ZWRWYWx1ZTtcbnZhciByZWplY3RlZFZhbHVlID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLnJlamVjdGVkVmFsdWU7XG52YXIgRzNXT2JqZWN0ID0gcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKTtcbnZhciBQcm9qZWN0U2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c2VydmljZScpLlByb2plY3RTZXJ2aWNlO1xuXG4vKiBzZXJ2aWNlXG5GdW56aW9uZSBjb3N0cnV0dG9yZSBjb250ZW50ZW50ZSB0cmUgcHJvcHJpZXRhJzpcbiAgICBzZXR1cDogbWV0b2RvIGRpIGluaXppYWxpenphemlvbmVcbiAgICBnZXRMYXllcnNTdGF0ZTogcml0b3JuYSBsJ29nZ2V0dG8gTGF5ZXJzU3RhdGVcbiAgICBnZXRMYXllcnNUcmVlOiByaXRvcm5hIGwnYXJyYXkgbGF5ZXJzVHJlZSBkYWxsJ29nZ2V0dG8gTGF5ZXJzU3RhdGVcbiovXG5cbi8vIFB1YmxpYyBpbnRlcmZhY2VcbmZ1bmN0aW9uIFByb2plY3RzUmVnaXN0cnkoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgXG4gIHRoaXMuc2V0dGVycyA9IHtcbiAgICBzZXRDdXJyZW50UHJvamVjdDogZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgICB0aGlzLnN0YXRlLmN1cnJlbnRQcm9qZWN0ID0gcHJvamVjdDtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLnN0YXRlID0ge1xuICAgIGJhc2VMYXllcnM6IHt9LFxuICAgIG1pblNjYWxlOiBudWxsLFxuICAgIG1heHNjYWxlOiBudWxsLFxuICAgIHByb2plY3RzOiBbXSxcbiAgICBjdXJyZW50UHJvamVjdDogbnVsbFxuICB9XG4gIFxuICBiYXNlKHRoaXMpO1xufVxuaW5oZXJpdChQcm9qZWN0c1JlZ2lzdHJ5LEczV09iamVjdCk7XG5cbnZhciBwcm90byA9IFByb2plY3RzUmVnaXN0cnkucHJvdG90eXBlO1xuXG5wcm90by5pbml0ID0gZnVuY3Rpb24oY29uZmlnKXtcbiAgaWYgKCF0aGlzLmluaXRpYWxpemVkKXtcbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICB0aGlzLnNldHVwU3RhdGUoKTtcbiAgICBQcm9qZWN0U2VydmljZS5pbml0KGNvbmZpZyk7XG4gICAgcmV0dXJuIHRoaXMuc2V0UHJvamVjdChjb25maWcuaW5pdHByb2plY3QpO1xuICB9XG59O1xuICBcbnByb3RvLnNldHVwU3RhdGUgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIFxuICBzZWxmLnN0YXRlLmJhc2VMYXllcnMgPSBzZWxmLmNvbmZpZy5iYXNlbGF5ZXJzO1xuICBzZWxmLnN0YXRlLm1pblNjYWxlID0gc2VsZi5jb25maWcubWluc2NhbGU7XG4gIHNlbGYuc3RhdGUubWF4U2NhbGUgPSBzZWxmLmNvbmZpZy5tYXhzY2FsZTtcbiAgc2VsZi5zdGF0ZS5jcnMgPSBzZWxmLmNvbmZpZy5jcnM7XG4gIHNlbGYuc3RhdGUucHJvajQgPSBzZWxmLmNvbmZpZy5wcm9qNDtcbiAgc2VsZi5jb25maWcucHJvamVjdHMuZm9yRWFjaChmdW5jdGlvbihwcm9qZWN0KXtcbiAgICBwcm9qZWN0LmJhc2VMYXllcnMgPSBzZWxmLmNvbmZpZy5iYXNlbGF5ZXJzO1xuICAgIHByb2plY3QubWluU2NhbGUgPSBzZWxmLmNvbmZpZy5taW5zY2FsZTtcbiAgICBwcm9qZWN0Lm1heFNjYWxlID0gc2VsZi5jb25maWcubWF4c2NhbGU7XG4gICAgcHJvamVjdC5jcnMgPSBzZWxmLmNvbmZpZy5jcnM7XG4gICAgcHJvamVjdC5wcm9qNCA9IHNlbGYuY29uZmlnLnByb2o0O1xuICAgIHNlbGYuc3RhdGUucHJvamVjdHMucHVzaChwcm9qZWN0KTtcbiAgfSlcbiAgLy90aGlzLnN0YXRlLnByb2plY3RzID0gY29uZmlnLmdyb3VwLnByb2plY3RzO1xufTtcblxucHJvdG8uZ2V0Q3VycmVudFByb2plY3QgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5zdGF0ZS5jdXJyZW50UHJvamVjdDtcbn07XG4gIFxucHJvdG8uc2V0UHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3RHaWQpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiB0aGlzLmdldFByb2plY3QocHJvamVjdEdpZCkuXG4gIHRoZW4oZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgUHJvamVjdFNlcnZpY2Uuc2V0UHJvamVjdChwcm9qZWN0KTtcbiAgICBzZWxmLnNldEN1cnJlbnRQcm9qZWN0KHByb2plY3QpO1xuICB9KVxufTtcbiAgXG5wcm90by5zd2l0Y2hQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdEdpZCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiB0aGlzLmdldFByb2plY3QocHJvamVjdEdpZCkuXG4gIHRoZW4oZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgUHJvamVjdFNlcnZpY2Uuc3dpdGNoUHJvamVjdChwcm9qZWN0KTtcbiAgICBzZWxmLnNldEN1cnJlbnRQcm9qZWN0KHByb2plY3QpO1xuICB9KVxufTtcbiAgXG5wcm90by5idWlsZFByb2plY3RUcmVlID0gZnVuY3Rpb24ocHJvamVjdCl7XG4gIHZhciBsYXllcnMgPSBfLmtleUJ5KHByb2plY3QubGF5ZXJzLCdpZCcpO1xuICB2YXIgbGF5ZXJzVHJlZSA9IF8uY2xvbmVEZWVwKHByb2plY3QubGF5ZXJzdHJlZSk7XG4gIFxuICBmdW5jdGlvbiB0cmF2ZXJzZShvYmope1xuICAgIF8uZm9ySW4ob2JqLCBmdW5jdGlvbiAobGF5ZXIsIGtleSkge1xuICAgICAgICAvL3ZlcmlmaWNhIGNoZSBpbCBub2RvIHNpYSB1biBsYXllciBlIG5vbiB1biBmb2xkZXJcbiAgICAgICAgaWYgKCFfLmlzTmlsKGxheWVyLmlkKSkge1xuICAgICAgICAgICAgdmFyIGZ1bGxsYXllciA9IF8ubWVyZ2UobGF5ZXIsbGF5ZXJzW2xheWVyLmlkXSk7XG4gICAgICAgICAgICBvYmpbcGFyc2VJbnQoa2V5KV0gPSBmdWxsbGF5ZXI7XG4gICAgICAgICAgICB2YXIgYSA9MTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIV8uaXNOaWwobGF5ZXIubm9kZXMpKXtcbiAgICAgICAgICAvLyBhZ2dpdW5nbyBwcm9wcmlldMOgIHRpdGxlIHBlciBsJ2FsYmVyb1xuICAgICAgICAgIGxheWVyLnRpdGxlID0gbGF5ZXIubmFtZTtcbiAgICAgICAgICB0cmF2ZXJzZShsYXllci5ub2Rlcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gIHRyYXZlcnNlKGxheWVyc1RyZWUpO1xuICBwcm9qZWN0LmxheWVyc3RyZWUgPSBsYXllcnNUcmVlO1xufTtcblxucHJvdG8uZ2V0UHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3RHaWQpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkID0gJC5EZWZlcnJlZCgpO1xuICB2YXIgcHJvamVjdCA9IG51bGw7XG4gIHRoaXMuc3RhdGUucHJvamVjdHMuZm9yRWFjaChmdW5jdGlvbihfcHJvamVjdCl7XG4gICAgaWYgKF9wcm9qZWN0LmdpZCA9PSBwcm9qZWN0R2lkKSB7XG4gICAgICBwcm9qZWN0ID0gX3Byb2plY3Q7XG4gICAgfVxuICB9KVxuICBpZiAoIXByb2plY3QpIHtcbiAgICByZXR1cm4gcmVqZWN0ZWRWYWx1ZShcIlByb2plY3QgZG9lc24ndCBleGlzdFwiKTtcbiAgfVxuXG4gIHZhciBpc0Z1bGxGaWxsZWQgPSAhXy5pc05pbChwcm9qZWN0LmxheWVycyk7XG4gIGlmIChpc0Z1bGxGaWxsZWQpe1xuICAgIHJldHVybiBkLnJlc29sdmUocHJvamVjdCk7XG4gIH1cbiAgZWxzZXtcbiAgICByZXR1cm4gdGhpcy5nZXRQcm9qZWN0RnVsbENvbmZpZyhwcm9qZWN0KVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2plY3RGdWxsQ29uZmlnKXtcbiAgICAgIHByb2plY3QgPSBfLm1lcmdlKHByb2plY3QscHJvamVjdEZ1bGxDb25maWcpO1xuICAgICAgc2VsZi5idWlsZFByb2plY3RUcmVlKHByb2plY3QpO1xuICAgICAgcmV0dXJuIGQucmVzb2x2ZShwcm9qZWN0KTtcbiAgICB9KTtcbiAgfVxuICBcbiAgcmV0dXJuIGQucHJvbWlzZSgpO1xufTtcbiAgXG4gIC8vcml0b3JuYSB1bmEgcHJvbWlzZXNcbnByb3RvLmdldFByb2plY3RGdWxsQ29uZmlnID0gZnVuY3Rpb24ocHJvamVjdEJhc2VDb25maWcpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgdmFyIHVybCA9IHRoaXMuY29uZmlnLmdldFByb2plY3RDb25maWdVcmwocHJvamVjdEJhc2VDb25maWcpO1xuICAkLmdldCh1cmwpLmRvbmUoZnVuY3Rpb24ocHJvamVjdEZ1bGxDb25maWcpe1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZShwcm9qZWN0RnVsbENvbmZpZyk7XG4gIH0pXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBQcm9qZWN0c1JlZ2lzdHJ5KCk7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBCYXNlNjQgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuQmFzZTY0O1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbnZhciBSb3V0ZXJTZXJ2aWNlID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9yb3V0ZSA9ICcnO1xuICB0aGlzLnNldHRlcnMgPSB7XG4gICAgc2V0Um91dGU6IGZ1bmN0aW9uKHBhdGgpe1xuICAgICAgdGhpcy5fcm91dGUgPSBwYXRoO1xuICAgIH1cbiAgfVxuICBcbiAgSGlzdG9yeS5BZGFwdGVyLmJpbmQod2luZG93LCdzdGF0ZWNoYW5nZScsZnVuY3Rpb24oKXsgLy8gTm90ZTogV2UgYXJlIHVzaW5nIHN0YXRlY2hhbmdlIGluc3RlYWQgb2YgcG9wc3RhdGVcbiAgICAgIHZhciBzdGF0ZSA9IEhpc3RvcnkuZ2V0U3RhdGUoKTsgLy8gTm90ZTogV2UgYXJlIHVzaW5nIEhpc3RvcnkuZ2V0U3RhdGUoKSBpbnN0ZWFkIG9mIGV2ZW50LnN0YXRlXG4gICAgICB2YXIgaGFzaCA9IHN0YXRlLmhhc2g7XG4gICAgICBzZWxmLnNldFJvdXRlRnJvbUhhc2goaGFzaCk7XG4gIH0pO1xuICBcbiAgYmFzZSh0aGlzKTtcbn07XG5pbmhlcml0KFJvdXRlclNlcnZpY2UsRzNXT2JqZWN0KTtcblxudmFyIHByb3RvID0gUm91dGVyU2VydmljZS5wcm90b3R5cGU7XG5cbnByb3RvLmluaXRSb3V0ZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBmaXJzdEhhc2ggPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoO1xuICB0aGlzLnNldFJvdXRlRnJvbUhhc2goZmlyc3RIYXNoKTtcbn1cblxucHJvdG8uZ290byA9IGZ1bmN0aW9uKHBhdGgpe1xuICB2YXIgcGF0aGI2NCA9IEJhc2U2NC5lbmNvZGUocGF0aCk7XG4gIEhpc3RvcnkucHVzaFN0YXRlKHtwYXRoOnBhdGh9LG51bGwsJz9wPScrcGF0aGI2NCk7XG4gIC8vdGhpcy5zZXRSb3V0ZShwYXRoKTtcbn07XG5cbnByb3RvLnNldFJvdXRlRnJvbUhhc2ggPSBmdW5jdGlvbihoYXNoKSB7XG4gIHZhciBwYXRoYjY0ID0gdGhpcy5nZXRRdWVyeVBhcmFtcyhoYXNoKVsncCddO1xuICB2YXIgcGF0aCA9IHBhdGhiNjQgPyBCYXNlNjQuZGVjb2RlKHBhdGhiNjQpIDogJyc7XG4gIHRoaXMuc2V0Um91dGUocGF0aCk7XG59XG5cbnByb3RvLnNsaWNlUGF0aCA9IGZ1bmN0aW9uKHBhdGgpe1xuICByZXR1cm4gcGF0aC5zcGxpdCgnPycpWzBdLnNwbGl0KCcvJyk7XG59O1xuICBcbnByb3RvLnNsaWNlRmlyc3QgPSBmdW5jdGlvbihwYXRoKXtcbiAgdmFyIHBhdGhBbmRRdWVyeSA9IHBhdGguc3BsaXQoJz8nKTtcbiAgdmFyIHF1ZXJ5U3RyaW5nID0gcGF0aEFuZFF1ZXJ5WzFdO1xuICB2YXIgcGF0aEFyciA9IHBhdGhBbmRRdWVyeVswXS5zcGxpdCgnLycpXG4gIHZhciBmaXJzdFBhdGggPSBwYXRoQXJyWzBdO1xuICBwYXRoID0gcGF0aEFyci5zbGljZSgxKS5qb2luKCcvJyk7XG4gIHBhdGggPSBbcGF0aCxxdWVyeVN0cmluZ10uam9pbignPycpXG4gIHJldHVybiBbZmlyc3RQYXRoLHBhdGhdO1xufTtcbiAgXG5wcm90by5nZXRRdWVyeVBhcmFtcyA9IGZ1bmN0aW9uKHBhdGgpe1xuICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcbiAgdHJ5IHtcbiAgICB2YXIgcXVlcnlTdHJpbmcgPSBwYXRoLnNwbGl0KCc/JylbMV07XG4gICAgdmFyIHF1ZXJ5UGFpcnMgPSBxdWVyeVN0cmluZy5zcGxpdCgnJicpO1xuICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgIF8uZm9yRWFjaChxdWVyeVBhaXJzLGZ1bmN0aW9uKHF1ZXJ5UGFpcil7XG4gICAgICB2YXIgcGFpciA9IHF1ZXJ5UGFpci5zcGxpdCgnPScpO1xuICAgICAgdmFyIGtleSA9IHBhaXJbMF07XG4gICAgICB2YXIgdmFsdWUgPSBwYWlyWzFdO1xuICAgICAgcXVlcnlQYXJhbXNba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICB9XG4gIGNhdGNoIChlKSB7fVxuICByZXR1cm4gcXVlcnlQYXJhbXM7XG59O1xuXG5wcm90by5nZXRRdWVyeVN0cmluZyA9IGZ1bmN0aW9uKHBhdGgpe1xuICByZXR1cm4gcGF0aC5zcGxpdCgnPycpWzFdO1xufTtcbiAgXG5wcm90by5tYWtlUXVlcnlTdHJpbmcgPSBmdW5jdGlvbihxdWVyeVBhcmFtcyl7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUm91dGVyU2VydmljZTtcbiIsIlxuLyoqXG4gKiBEZWNpbWFsIGFkanVzdG1lbnQgb2YgYSBudW1iZXIuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9ICB0eXBlICBUaGUgdHlwZSBvZiBhZGp1c3RtZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9ICB2YWx1ZSBUaGUgbnVtYmVyLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBleHAgICBUaGUgZXhwb25lbnQgKHRoZSAxMCBsb2dhcml0aG0gb2YgdGhlIGFkanVzdG1lbnQgYmFzZSkuXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYWRqdXN0ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGRlY2ltYWxBZGp1c3QodHlwZSwgdmFsdWUsIGV4cCkge1xuICAvLyBJZiB0aGUgZXhwIGlzIHVuZGVmaW5lZCBvciB6ZXJvLi4uXG4gIGlmICh0eXBlb2YgZXhwID09PSAndW5kZWZpbmVkJyB8fCArZXhwID09PSAwKSB7XG4gICAgcmV0dXJuIE1hdGhbdHlwZV0odmFsdWUpO1xuICB9XG4gIHZhbHVlID0gK3ZhbHVlO1xuICBleHAgPSArZXhwO1xuICAvLyBJZiB0aGUgdmFsdWUgaXMgbm90IGEgbnVtYmVyIG9yIHRoZSBleHAgaXMgbm90IGFuIGludGVnZXIuLi5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCAhKHR5cGVvZiBleHAgPT09ICdudW1iZXInICYmIGV4cCAlIDEgPT09IDApKSB7XG4gICAgcmV0dXJuIE5hTjtcbiAgfVxuICAvLyBTaGlmdFxuICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkuc3BsaXQoJ2UnKTtcbiAgdmFsdWUgPSBNYXRoW3R5cGVdKCsodmFsdWVbMF0gKyAnZScgKyAodmFsdWVbMV0gPyAoK3ZhbHVlWzFdIC0gZXhwKSA6IC1leHApKSk7XG4gIC8vIFNoaWZ0IGJhY2tcbiAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnNwbGl0KCdlJyk7XG4gIHJldHVybiArKHZhbHVlWzBdICsgJ2UnICsgKHZhbHVlWzFdID8gKCt2YWx1ZVsxXSArIGV4cCkgOiBleHApKTtcbn1cblxuLy8gRGVjaW1hbCByb3VuZFxuaWYgKCFNYXRoLnJvdW5kMTApIHtcbiAgTWF0aC5yb3VuZDEwID0gZnVuY3Rpb24odmFsdWUsIGV4cCkge1xuICAgIHJldHVybiBkZWNpbWFsQWRqdXN0KCdyb3VuZCcsIHZhbHVlLCBleHApO1xuICB9O1xufVxuLy8gRGVjaW1hbCBmbG9vclxuaWYgKCFNYXRoLmZsb29yMTApIHtcbiAgTWF0aC5mbG9vcjEwID0gZnVuY3Rpb24odmFsdWUsIGV4cCkge1xuICAgIHJldHVybiBkZWNpbWFsQWRqdXN0KCdmbG9vcicsIHZhbHVlLCBleHApO1xuICB9O1xufVxuLy8gRGVjaW1hbCBjZWlsXG5pZiAoIU1hdGguY2VpbDEwKSB7XG4gIE1hdGguY2VpbDEwID0gZnVuY3Rpb24odmFsdWUsIGV4cCkge1xuICAgIHJldHVybiBkZWNpbWFsQWRqdXN0KCdjZWlsJywgdmFsdWUsIGV4cCk7XG4gIH07XG59XG5cblN0cmluZy5wcm90b3R5cGUuaGFzaENvZGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGhhc2ggPSAwLCBpLCBjaHIsIGxlbjtcbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gaGFzaDtcbiAgZm9yIChpID0gMCwgbGVuID0gdGhpcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNociAgID0gdGhpcy5jaGFyQ29kZUF0KGkpO1xuICAgIGhhc2ggID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjaHI7XG4gICAgaGFzaCB8PSAwO1xuICB9XG4gIHJldHVybiBoYXNoO1xufTtcblxudmFyIEJhc2U2NCA9IHtfa2V5U3RyOlwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz1cIixlbmNvZGU6ZnVuY3Rpb24oZSl7dmFyIHQ9XCJcIjt2YXIgbixyLGkscyxvLHUsYTt2YXIgZj0wO2U9QmFzZTY0Ll91dGY4X2VuY29kZShlKTt3aGlsZShmPGUubGVuZ3RoKXtuPWUuY2hhckNvZGVBdChmKyspO3I9ZS5jaGFyQ29kZUF0KGYrKyk7aT1lLmNoYXJDb2RlQXQoZisrKTtzPW4+PjI7bz0obiYzKTw8NHxyPj40O3U9KHImMTUpPDwyfGk+PjY7YT1pJjYzO2lmKGlzTmFOKHIpKXt1PWE9NjR9ZWxzZSBpZihpc05hTihpKSl7YT02NH10PXQrdGhpcy5fa2V5U3RyLmNoYXJBdChzKSt0aGlzLl9rZXlTdHIuY2hhckF0KG8pK3RoaXMuX2tleVN0ci5jaGFyQXQodSkrdGhpcy5fa2V5U3RyLmNoYXJBdChhKX1yZXR1cm4gdH0sZGVjb2RlOmZ1bmN0aW9uKGUpe3ZhciB0PVwiXCI7dmFyIG4scixpO3ZhciBzLG8sdSxhO3ZhciBmPTA7ZT1lLnJlcGxhY2UoL1teQS1aYS16MC05Ky89XS9nLFwiXCIpO3doaWxlKGY8ZS5sZW5ndGgpe3M9dGhpcy5fa2V5U3RyLmluZGV4T2YoZS5jaGFyQXQoZisrKSk7bz10aGlzLl9rZXlTdHIuaW5kZXhPZihlLmNoYXJBdChmKyspKTt1PXRoaXMuX2tleVN0ci5pbmRleE9mKGUuY2hhckF0KGYrKykpO2E9dGhpcy5fa2V5U3RyLmluZGV4T2YoZS5jaGFyQXQoZisrKSk7bj1zPDwyfG8+PjQ7cj0obyYxNSk8PDR8dT4+MjtpPSh1JjMpPDw2fGE7dD10K1N0cmluZy5mcm9tQ2hhckNvZGUobik7aWYodSE9NjQpe3Q9dCtTdHJpbmcuZnJvbUNoYXJDb2RlKHIpfWlmKGEhPTY0KXt0PXQrU3RyaW5nLmZyb21DaGFyQ29kZShpKX19dD1CYXNlNjQuX3V0ZjhfZGVjb2RlKHQpO3JldHVybiB0fSxfdXRmOF9lbmNvZGU6ZnVuY3Rpb24oZSl7ZT1lLnJlcGxhY2UoL3JuL2csXCJuXCIpO3ZhciB0PVwiXCI7Zm9yKHZhciBuPTA7bjxlLmxlbmd0aDtuKyspe3ZhciByPWUuY2hhckNvZGVBdChuKTtpZihyPDEyOCl7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyKX1lbHNlIGlmKHI+MTI3JiZyPDIwNDgpe3QrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+NnwxOTIpO3QrPVN0cmluZy5mcm9tQ2hhckNvZGUociY2M3wxMjgpfWVsc2V7dCs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj4xMnwyMjQpO3QrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+NiY2M3wxMjgpO3QrPVN0cmluZy5mcm9tQ2hhckNvZGUociY2M3wxMjgpfX1yZXR1cm4gdH0sX3V0ZjhfZGVjb2RlOmZ1bmN0aW9uKGUpe3ZhciB0PVwiXCI7dmFyIG49MDt2YXIgcj1jMT1jMj0wO3doaWxlKG48ZS5sZW5ndGgpe3I9ZS5jaGFyQ29kZUF0KG4pO2lmKHI8MTI4KXt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKHIpO24rK31lbHNlIGlmKHI+MTkxJiZyPDIyNCl7YzI9ZS5jaGFyQ29kZUF0KG4rMSk7dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgociYzMSk8PDZ8YzImNjMpO24rPTJ9ZWxzZXtjMj1lLmNoYXJDb2RlQXQobisxKTtjMz1lLmNoYXJDb2RlQXQobisyKTt0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChyJjE1KTw8MTJ8KGMyJjYzKTw8NnxjMyY2Myk7bis9M319cmV0dXJuIHR9fTtcblxuXG52YXIgdXRpbHMgPSB7XG4gIG1peGluOiBmdW5jdGlvbiBtaXhpbihkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICByZXR1cm4gdXRpbHMubWVyZ2UoZGVzdGluYXRpb24ucHJvdG90eXBlLCBzb3VyY2UpO1xuICB9LFxuICBcbiAgbWl4aW5pbnN0YW5jZTogZnVuY3Rpb24gbWl4aW5pbnN0YW5jZShkZXN0aW5hdGlvbixzb3VyY2Upe1xuICAgICAgdmFyIHNvdXJjZUluc3RhbmNlID0gbmV3IHNvdXJjZTtcbiAgICAgIHV0aWxzLm1lcmdlKGRlc3RpbmF0aW9uLCBzb3VyY2VJbnN0YW5jZSk7XG4gICAgICB1dGlscy5tZXJnZShkZXN0aW5hdGlvbi5wcm90b3R5cGUsIHNvdXJjZS5wcm90b3R5cGUpO1xuICB9LFxuXG5cbiAgbWVyZ2U6IGZ1bmN0aW9uIG1lcmdlKGRlc3RpbmF0aW9uLCBzb3VyY2UpIHtcbiAgICAgIHZhciBrZXk7XG5cbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmICh1dGlscy5oYXNPd24oc291cmNlLCBrZXkpKSB7XG4gICAgICAgICAgICAgIGRlc3RpbmF0aW9uW2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gIH0sXG5cbiAgaGFzT3duOiBmdW5jdGlvbiBoYXNPd24ob2JqZWN0LCBrZXkpIHtcbiAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpO1xuICB9LFxuICBcbiAgaW5oZXJpdDpmdW5jdGlvbihjaGlsZEN0b3IsIHBhcmVudEN0b3IpIHtcbiAgICBmdW5jdGlvbiB0ZW1wQ3RvcigpIHt9O1xuICAgIHRlbXBDdG9yLnByb3RvdHlwZSA9IHBhcmVudEN0b3IucHJvdG90eXBlO1xuICAgIGNoaWxkQ3Rvci5zdXBlckNsYXNzXyA9IHBhcmVudEN0b3IucHJvdG90eXBlO1xuICAgIGNoaWxkQ3Rvci5wcm90b3R5cGUgPSBuZXcgdGVtcEN0b3IoKTtcbiAgICBjaGlsZEN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY2hpbGRDdG9yO1xuICB9LFxuICBcbiAgYmFzZTogZnVuY3Rpb24obWUsIG9wdF9tZXRob2ROYW1lLCB2YXJfYXJncykge1xuICAgIHZhciBjYWxsZXIgPSBhcmd1bWVudHMuY2FsbGVlLmNhbGxlcjtcbiAgICBpZiAoY2FsbGVyLnN1cGVyQ2xhc3NfKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgY29uc3RydWN0b3IuIENhbGwgdGhlIHN1cGVyY2xhc3MgY29uc3RydWN0b3IuXG4gICAgICByZXR1cm4gY2FsbGVyLnN1cGVyQ2xhc3NfLmNvbnN0cnVjdG9yLmFwcGx5KFxuICAgICAgICAgIG1lLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICB9XG5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGZvdW5kQ2FsbGVyID0gZmFsc2U7XG4gICAgZm9yICh2YXIgY3RvciA9IG1lLmNvbnN0cnVjdG9yO1xuICAgICAgICAgY3RvcjsgY3RvciA9IGN0b3Iuc3VwZXJDbGFzc18gJiYgY3Rvci5zdXBlckNsYXNzXy5jb25zdHJ1Y3Rvcikge1xuICAgICAgaWYgKGN0b3IucHJvdG90eXBlW29wdF9tZXRob2ROYW1lXSA9PT0gY2FsbGVyKSB7XG4gICAgICAgIGZvdW5kQ2FsbGVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZm91bmRDYWxsZXIpIHtcbiAgICAgICAgcmV0dXJuIGN0b3IucHJvdG90eXBlW29wdF9tZXRob2ROYW1lXS5hcHBseShtZSwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgZGlkIG5vdCBmaW5kIHRoZSBjYWxsZXIgaW4gdGhlIHByb3RvdHlwZSBjaGFpbixcbiAgICAvLyB0aGVuIG9uZSBvZiB0d28gdGhpbmdzIGhhcHBlbmVkOlxuICAgIC8vIDEpIFRoZSBjYWxsZXIgaXMgYW4gaW5zdGFuY2UgbWV0aG9kLlxuICAgIC8vIDIpIFRoaXMgbWV0aG9kIHdhcyBub3QgY2FsbGVkIGJ5IHRoZSByaWdodCBjYWxsZXIuXG4gICAgaWYgKG1lW29wdF9tZXRob2ROYW1lXSA9PT0gY2FsbGVyKSB7XG4gICAgICByZXR1cm4gbWUuY29uc3RydWN0b3IucHJvdG90eXBlW29wdF9tZXRob2ROYW1lXS5hcHBseShtZSwgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgICdiYXNlIGNhbGxlZCBmcm9tIGEgbWV0aG9kIG9mIG9uZSBuYW1lICcgK1xuICAgICAgICAgICd0byBhIG1ldGhvZCBvZiBhIGRpZmZlcmVudCBuYW1lJyk7XG4gICAgfVxuICB9LFxuICBcbiAgbm9vcDogZnVuY3Rpb24oKXt9LFxuICBcbiAgdHJ1ZWZuYzogZnVuY3Rpb24oKXtyZXR1cm4gdHJ1ZX0sXG4gIFxuICBmYWxzZWZuYzogZnVuY3Rpb24oKXtyZXR1cm4gdHJ1ZX0sXG4gIFxuICByZXNvbHZlZFZhbHVlOiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH0sXG4gIFxuICByZWplY3RlZFZhbHVlOiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGRlZmVycmVkLnJlamVjdCh2YWx1ZSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfSxcbiAgXG4gIEJhc2U2NDogQmFzZTY0XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWxzO1xuIiwidmFyIENvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIG5hbWUgPSBvcHRpb25zLm5hbWUgfHwgXCI/XCI7XG4gIHRoaXMubmFtZSA9IG5hbWUuc3BsaXQoJyAnKS5qb2luKCctJykudG9Mb3dlckNhc2UoKTtcbiAgdGhpcy5pZCA9IHRoaXMubmFtZSsnXycrKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApKTtcbiAgXG4gIGlmICghb3B0aW9ucy5lbGVtZW50KSB7XG4gICAgdmFyIGNsYXNzTmFtZSA9IFwib2wtXCIrdGhpcy5uYW1lLnNwbGl0KCcgJykuam9pbignLScpLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHRpcExhYmVsID0gb3B0aW9ucy50aXBMYWJlbCB8fCB0aGlzLm5hbWU7XG4gICAgdmFyIGxhYmVsID0gb3B0aW9ucy5sYWJlbCB8fCBcIj9cIjtcbiAgICBcbiAgICBvcHRpb25zLmVsZW1lbnQgPSAkKCc8ZGl2IGNsYXNzPVwiJytjbGFzc05hbWUrJyBvbC11bnNlbGVjdGFibGUgb2wtY29udHJvbFwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiJyt0aXBMYWJlbCsnXCI+JytsYWJlbCsnPC9idXR0b24+PC9kaXY+JylbMF07XG4gIH1cbiAgXG4gIHZhciBidXR0b25DbGlja0hhbmRsZXIgPSBvcHRpb25zLmJ1dHRvbkNsaWNrSGFuZGxlciB8fCBDb250cm9sLnByb3RvdHlwZS5faGFuZGxlQ2xpY2suYmluZCh0aGlzKTtcbiAgXG4gICQob3B0aW9ucy5lbGVtZW50KS5vbignY2xpY2snLGJ1dHRvbkNsaWNrSGFuZGxlcik7XG4gIFxuICBvbC5jb250cm9sLkNvbnRyb2wuY2FsbCh0aGlzLG9wdGlvbnMpO1xuICBcbiAgdGhpcy5fcG9zdFJlbmRlcigpO1xufVxub2wuaW5oZXJpdHMoQ29udHJvbCwgb2wuY29udHJvbC5Db250cm9sKTtcblxuXG52YXIgcHJvdG8gPSBDb250cm9sLnByb3RvdHlwZTtcblxucHJvdG8uX2hhbmRsZUNsaWNrID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbWFwID0gdGhpcy5nZXRNYXAoKTtcbiAgXG4gIHZhciByZXNldENvbnRyb2wgPSBudWxsO1xuICAvLyByZW1vdmUgYWxsIHRoZSBvdGhlciwgZXZlbnR1YWxseSB0b2dnbGVkLCBpbnRlcmFjdGlvbmNvbnRyb2xzXG4gIHZhciBjb250cm9scyA9IG1hcC5nZXRDb250cm9scygpO1xuICBjb250cm9scy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRyb2wpe1xuICAgIGlmKGNvbnRyb2wuaWQgJiYgY29udHJvbC50b2dnbGUgJiYgKGNvbnRyb2wuaWQgIT0gc2VsZi5pZCkpIHtcbiAgICAgIGNvbnRyb2wudG9nZ2xlKGZhbHNlKTtcbiAgICAgIGlmIChjb250cm9sLm5hbWUgPT0gJ3Jlc2V0Jykge1xuICAgICAgICByZXNldENvbnRyb2wgPSBjb250cm9sO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIGlmICghc2VsZi5fdG9nZ2xlZCAmJiByZXNldENvbnRyb2wpIHtcbiAgICByZXNldENvbnRyb2wudG9nZ2xlKHRydWUpO1xuICB9XG59O1xuXG5wcm90by5fcG9zdFJlbmRlciA9IGZ1bmN0aW9uKCl7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sO1xuIiwidmFyIENvbnRyb2wgPSByZXF1aXJlKCcuL2NvbnRyb2wnKTtcblxudmFyIEludGVyYWN0aW9uQ29udHJvbCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICB0aGlzLl90b2dnbGVkID0gdGhpcy5fdG9nZ2xlZCB8fCBmYWxzZTtcbiAgdGhpcy5faW50ZXJhY3Rpb24gPSBvcHRpb25zLmludGVyYWN0aW9uIHx8IG51bGw7XG4gIHRoaXMuX2F1dG91bnRvZ2dsZSA9IG9wdGlvbnMuYXV0b3VudG9nZ2xlIHx8IGZhbHNlO1xuICBcbiAgb3B0aW9ucy5idXR0b25DbGlja0hhbmRsZXIgPSBJbnRlcmFjdGlvbkNvbnRyb2wucHJvdG90eXBlLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpO1xuICBcbiAgQ29udHJvbC5jYWxsKHRoaXMsb3B0aW9ucyk7XG59O1xub2wuaW5oZXJpdHMoSW50ZXJhY3Rpb25Db250cm9sLCBDb250cm9sKTtcblxudmFyIHByb3RvID0gSW50ZXJhY3Rpb25Db250cm9sLnByb3RvdHlwZTtcblxucHJvdG8udG9nZ2xlID0gZnVuY3Rpb24odG9nZ2xlKXtcbiAgdmFyIHRvZ2dsZSA9IHRvZ2dsZSAhPT0gdW5kZWZpbmVkID8gdG9nZ2xlIDogIXRoaXMuX3RvZ2dsZWRcbiAgdGhpcy5fdG9nZ2xlZCA9IHRvZ2dsZTtcbiAgdmFyIG1hcCA9IHRoaXMuZ2V0TWFwKCk7XG4gIHZhciBjb250cm9sQnV0dG9uID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoJ2J1dHRvbicpLmZpcnN0KCk7XG4gIFxuICBpZiAodG9nZ2xlKSB7XG4gICAgaWYgKHRoaXMuX2ludGVyYWN0aW9uKSB7XG4gICAgICBtYXAuYWRkSW50ZXJhY3Rpb24odGhpcy5faW50ZXJhY3Rpb24pO1xuICAgIH1cbiAgICBjb250cm9sQnV0dG9uLmFkZENsYXNzKCdnM3ctb2wtdG9nZ2xlZCcpO1xuICB9XG4gIGVsc2Uge1xuICAgIGlmICh0aGlzLl9pbnRlcmFjdGlvbikge1xuICAgICAgbWFwLnJlbW92ZUludGVyYWN0aW9uKHRoaXMuX2ludGVyYWN0aW9uKTtcbiAgICB9XG4gICAgY29udHJvbEJ1dHRvbi5yZW1vdmVDbGFzcygnZzN3LW9sLXRvZ2dsZWQnKTtcbiAgfVxufVxuXG5wcm90by5faGFuZGxlQ2xpY2sgPSBmdW5jdGlvbihlKXtcbiAgdGhpcy50b2dnbGUoKTtcbiAgQ29udHJvbC5wcm90b3R5cGUuX2hhbmRsZUNsaWNrLmNhbGwodGhpcyxlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJhY3Rpb25Db250cm9sO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbnZhciBJbnRlcmFjdGlvbkNvbnRyb2wgPSByZXF1aXJlKCcuL2ludGVyYWN0aW9uY29udHJvbCcpO1xuXG52YXIgUGlja0Nvb3JkaW5hdGVzSW50ZXJhY3Rpb24gPSByZXF1aXJlKCcuLi9pbnRlcmFjdGlvbnMvcGlja2Nvb3JkaW5hdGVzaW50ZXJhY3Rpb24nKTtcblxudmFyIFF1ZXJ5Q29udHJvbCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBfb3B0aW9ucyA9IHtcbiAgICBuYW1lOiBcInF1ZXJ5bGF5ZXJcIixcbiAgICB0aXBMYWJlbDogXCJRdWVyeSBsYXllclwiLFxuICAgIGxhYmVsOiBcIlxcdWVhMGZcIixcbiAgICBpbnRlcmFjdGlvbjogbmV3IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uXG4gIH07XG4gIFxuICBvcHRpb25zID0gdXRpbHMubWVyZ2Uob3B0aW9ucyxfb3B0aW9ucyk7XG4gIFxuICBJbnRlcmFjdGlvbkNvbnRyb2wuY2FsbCh0aGlzLG9wdGlvbnMpO1xuICBcbiAgdGhpcy5faW50ZXJhY3Rpb24ub24oJ3BpY2tlZCcsZnVuY3Rpb24oZSl7XG4gICAgc2VsZi5kaXNwYXRjaEV2ZW50KHtcbiAgICAgIHR5cGU6ICdwaWNrZWQnLFxuICAgICAgY29vcmRpbmF0ZXM6IGUuY29vcmRpbmF0ZVxuICAgIH0pO1xuICAgIGlmIChzZWxmLl9hdXRvdW50b2dnbGUpIHtcbiAgICAgIHNlbGYudG9nZ2xlKCk7XG4gICAgfVxuICB9KTtcbn1cbm9sLmluaGVyaXRzKFF1ZXJ5Q29udHJvbCwgSW50ZXJhY3Rpb25Db250cm9sKTtcblxubW9kdWxlLmV4cG9ydHMgPSBRdWVyeUNvbnRyb2w7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xudmFyIEludGVyYWN0aW9uQ29udHJvbCA9IHJlcXVpcmUoJy4vaW50ZXJhY3Rpb25jb250cm9sJyk7XG5cbnZhciBSZXNldENvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl90b2dnbGVkID0gdHJ1ZTtcbiAgdGhpcy5fc3RhcnRDb29yZGluYXRlID0gbnVsbDtcbiAgdmFyIF9vcHRpb25zID0ge1xuICAgICAgbmFtZTogXCJyZXNldFwiLFxuICAgICAgdGlwTGFiZWw6IFwiUGFuXCIsXG4gICAgICBsYWJlbDogXCJcXHVlOTAxXCIsXG4gICAgfTtcbiAgXG4gIG9wdGlvbnMgPSB1dGlscy5tZXJnZShvcHRpb25zLF9vcHRpb25zKTtcbiAgXG4gIEludGVyYWN0aW9uQ29udHJvbC5jYWxsKHRoaXMsb3B0aW9ucyk7XG59XG5vbC5pbmhlcml0cyhSZXNldENvbnRyb2wsIEludGVyYWN0aW9uQ29udHJvbCk7XG5tb2R1bGUuZXhwb3J0cyA9IFJlc2V0Q29udHJvbDtcblxudmFyIHByb3RvID0gUmVzZXRDb250cm9sLnByb3RvdHlwZTtcblxucHJvdG8uX3Bvc3RSZW5kZXIgPSBmdW5jdGlvbigpe1xuICB0aGlzLnRvZ2dsZSh0cnVlKTtcbn07XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xudmFyIEludGVyYWN0aW9uQ29udHJvbCA9IHJlcXVpcmUoJy4vaW50ZXJhY3Rpb25jb250cm9sJyk7XG5cbnZhciBab29tQm94Q29udHJvbCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3N0YXJ0Q29vcmRpbmF0ZSA9IG51bGw7XG4gIHZhciBfb3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IFwiem9vbWJveFwiLFxuICAgICAgdGlwTGFiZWw6IFwiWm9vbSB0byBib3hcIixcbiAgICAgIGxhYmVsOiBcIlxcdWU5MDBcIixcbiAgICAgIGludGVyYWN0aW9uOiBuZXcgb2wuaW50ZXJhY3Rpb24uRHJhZ0JveFxuICAgIH07XG4gIFxuICBvcHRpb25zID0gdXRpbHMubWVyZ2Uob3B0aW9ucyxfb3B0aW9ucyk7XG4gIFxuICBJbnRlcmFjdGlvbkNvbnRyb2wuY2FsbCh0aGlzLG9wdGlvbnMpO1xuICBcbiAgdGhpcy5faW50ZXJhY3Rpb24ub24oJ2JveHN0YXJ0JyxmdW5jdGlvbihlKXtcbiAgICBzZWxmLl9zdGFydENvb3JkaW5hdGUgPSBlLmNvb3JkaW5hdGU7XG4gIH0pO1xuICBcbiAgdGhpcy5faW50ZXJhY3Rpb24ub24oJ2JveGVuZCcsZnVuY3Rpb24oZSl7XG4gICAgdmFyIHN0YXJ0X2Nvb3JkaW5hdGUgPSBzZWxmLl9zdGFydENvb3JkaW5hdGU7XG4gICAgdmFyIGVuZF9jb29yZGluYXRlID0gZS5jb29yZGluYXRlO1xuICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYm91bmRpbmdFeHRlbnQoW3N0YXJ0X2Nvb3JkaW5hdGUsZW5kX2Nvb3JkaW5hdGVdKTtcbiAgICBzZWxmLmRpc3BhdGNoRXZlbnQoe1xuICAgICAgdHlwZTogJ3pvb21lbmQnLFxuICAgICAgZXh0ZW50OiBleHRlbnRcbiAgICB9KTtcbiAgICBzZWxmLl9zdGFydENvb3JkaW5hdGUgPSBudWxsO1xuICAgIGlmIChzZWxmLl9hdXRvdW50b2dnbGUpIHtcbiAgICAgIHNlbGYudG9nZ2xlKCk7XG4gICAgfVxuICB9KVxufVxub2wuaW5oZXJpdHMoWm9vbUJveENvbnRyb2wsIEludGVyYWN0aW9uQ29udHJvbCk7XG5tb2R1bGUuZXhwb3J0cyA9IFpvb21Cb3hDb250cm9sO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIG1hcGhlbHBlcnMgPSByZXF1aXJlKCcuL21hcC9tYXBoZWxwZXJzJyk7XG5cbihmdW5jdGlvbiAobmFtZSwgcm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKGZhY3RvcnkpO1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9XG4gIGVsc2Uge1xuICAgIHJvb3RbbmFtZV0gPSBmYWN0b3J5KCk7XG4gIH1cbn0pKCdnM3dvbDMnLCB0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgXG4gIHZhciBoZWxwZXJzID0gdXRpbHMubWVyZ2Uoe30sbWFwaGVscGVycyk7XG4gIFxuICByZXR1cm4ge1xuICAgIGhlbHBlcnM6IGhlbHBlcnNcbiAgfVxufSk7XG4iLCJ2YXIgQmFzZUxheWVycyA9IHt9O1xuXG5CYXNlTGF5ZXJzLk9TTSA9IG5ldyBvbC5sYXllci5UaWxlKHtcbiAgc291cmNlOiBuZXcgb2wuc291cmNlLk9TTSh7XG4gICAgYXR0cmlidXRpb25zOiBbXG4gICAgICBuZXcgb2wuQXR0cmlidXRpb24oe1xuICAgICAgICBodG1sOiAnQWxsIG1hcHMgJmNvcHk7ICcgK1xuICAgICAgICAgICAgJzxhIGhyZWY9XCJodHRwOi8vd3d3Lm9wZW5zdHJlZXRtYXAub3JnL1wiPk9wZW5TdHJlZXRNYXA8L2E+J1xuICAgICAgfSksXG4gICAgICBvbC5zb3VyY2UuT1NNLkFUVFJJQlVUSU9OXG4gICAgXSxcbiAgICB1cmw6ICdodHRwOi8ve2EtY30udGlsZS5vcGVuc3RyZWV0bWFwLm9yZy97en0ve3h9L3t5fS5wbmcnLFxuICAgIGNyb3NzT3JpZ2luOiBudWxsXG4gIH0pLFxuICBpZDogJ29zbScsXG4gIHRpdGxlOiAnT1NNJyxcbiAgYmFzZW1hcDogdHJ1ZVxufSk7XG5cbkJhc2VMYXllcnMuQklORyA9IHt9O1xuXG5CYXNlTGF5ZXJzLkJJTkcuUm9hZCA9IG5ldyBvbC5sYXllci5UaWxlKHtcbiAgbmFtZTonUm9hZCcsXG4gIHZpc2libGU6IGZhbHNlLFxuICBwcmVsb2FkOiBJbmZpbml0eSxcbiAgc291cmNlOiBuZXcgb2wuc291cmNlLkJpbmdNYXBzKHtcbiAgICBrZXk6ICdBbV9tQVNuVUEtanRXM08zTXhJWW1PT1BMT3ZMMzlkd012Um55b0h4ZktmX0VQTllnZldNOWltcUdFVFdLR1ZuJyxcbiAgICBpbWFnZXJ5U2V0OiAnUm9hZCdcbiAgICAgIC8vIHVzZSBtYXhab29tIDE5IHRvIHNlZSBzdHJldGNoZWQgdGlsZXMgaW5zdGVhZCBvZiB0aGUgQmluZ01hcHNcbiAgICAgIC8vIFwibm8gcGhvdG9zIGF0IHRoaXMgem9vbSBsZXZlbFwiIHRpbGVzXG4gICAgICAvLyBtYXhab29tOiAxOVxuICB9KSxcbiAgYmFzZW1hcDogdHJ1ZVxufSk7XG5cbkJhc2VMYXllcnMuQklORy5BZXJpYWxXaXRoTGFiZWxzID0gbmV3IG9sLmxheWVyLlRpbGUoe1xuICBuYW1lOiAnQWVyaWFsV2l0aExhYmVscycsXG4gIHZpc2libGU6IHRydWUsXG4gIHByZWxvYWQ6IEluZmluaXR5LFxuICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuQmluZ01hcHMoe1xuICAgIGtleTogJ0FtX21BU25VQS1qdFczTzNNeElZbU9PUExPdkwzOWR3TXZSbnlvSHhmS2ZfRVBOWWdmV005aW1xR0VUV0tHVm4nLFxuICAgIGltYWdlcnlTZXQ6ICdBZXJpYWxXaXRoTGFiZWxzJ1xuICAgICAgLy8gdXNlIG1heFpvb20gMTkgdG8gc2VlIHN0cmV0Y2hlZCB0aWxlcyBpbnN0ZWFkIG9mIHRoZSBCaW5nTWFwc1xuICAgICAgLy8gXCJubyBwaG90b3MgYXQgdGhpcyB6b29tIGxldmVsXCIgdGlsZXNcbiAgICAgIC8vIG1heFpvb206IDE5XG4gIH0pLFxuICBiYXNlbWFwOiB0cnVlXG59KTtcblxuQmFzZUxheWVycy5CSU5HLkFlcmlhbCA9IG5ldyBvbC5sYXllci5UaWxlKHtcbiAgbmFtZTogJ0FlcmlhbCcsXG4gIHZpc2libGU6IGZhbHNlLFxuICBwcmVsb2FkOiBJbmZpbml0eSxcbiAgc291cmNlOiBuZXcgb2wuc291cmNlLkJpbmdNYXBzKHtcbiAgICBrZXk6ICdBbV9tQVNuVUEtanRXM08zTXhJWW1PT1BMT3ZMMzlkd012Um55b0h4ZktmX0VQTllnZldNOWltcUdFVFdLR1ZuJyxcbiAgICBpbWFnZXJ5U2V0OiAnQWVyaWFsJ1xuICAgICAgLy8gdXNlIG1heFpvb20gMTkgdG8gc2VlIHN0cmV0Y2hlZCB0aWxlcyBpbnN0ZWFkIG9mIHRoZSBCaW5nTWFwc1xuICAgICAgLy8gXCJubyBwaG90b3MgYXQgdGhpcyB6b29tIGxldmVsXCIgdGlsZXNcbiAgICAgIC8vIG1heFpvb206IDE5XG4gIH0pLFxuICBiYXNlbWFwOiB0cnVlXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlTGF5ZXJzO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbnZhciBSYXN0ZXJMYXllcnMgPSB7fTtcblxuUmFzdGVyTGF5ZXJzLlRpbGVkV01TTGF5ZXIgPSBmdW5jdGlvbihsYXllck9iaixleHRyYVBhcmFtcyl7XG4gIHZhciBvcHRpb25zID0ge1xuICAgIGxheWVyT2JqOiBsYXllck9iaixcbiAgICBleHRyYVBhcmFtczogZXh0cmFQYXJhbXMgfHwge30sXG4gICAgdGlsZWQ6IHRydWVcbiAgfVxuICByZXR1cm4gUmFzdGVyTGF5ZXJzLl9XTVNMYXllcihvcHRpb25zKTtcbn07XG5cblJhc3RlckxheWVycy5XTVNMYXllciA9IGZ1bmN0aW9uKGxheWVyT2JqLGV4dHJhUGFyYW1zKXtcbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgbGF5ZXJPYmo6IGxheWVyT2JqLFxuICAgIGV4dHJhUGFyYW1zOiBleHRyYVBhcmFtcyB8fCB7fVxuICB9XG4gIHJldHVybiBSYXN0ZXJMYXllcnMuX1dNU0xheWVyKG9wdGlvbnMpO1xufTtcblxuUmFzdGVyTGF5ZXJzLl9XTVNMYXllciA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICB2YXIgbGF5ZXJPYmogPSBvcHRpb25zLmxheWVyT2JqO1xuICB2YXIgZXh0cmFQYXJhbXMgPSBvcHRpb25zLmV4dHJhUGFyYW1zO1xuICB2YXIgdGlsZWQgPSBvcHRpb25zLnRpbGVkIHx8IGZhbHNlO1xuICBcbiAgdmFyIHBhcmFtcyA9IHtcbiAgICBMQVlFUlM6IGxheWVyT2JqLmxheWVycyB8fCAnJyxcbiAgICBWRVJTSU9OOiAnMS4zLjAnLFxuICAgIFRSQU5TUEFSRU5UOiB0cnVlLFxuICAgIFNMRF9WRVJTSU9OOiAnMS4xLjAnXG4gIH07XG4gIFxuICBwYXJhbXMgPSB1dGlscy5tZXJnZShwYXJhbXMsZXh0cmFQYXJhbXMpO1xuICBcbiAgdmFyIHNvdXJjZU9wdGlvbnMgPSB7XG4gICAgdXJsOiBsYXllck9iai51cmwsXG4gICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgcmF0aW86IDFcbiAgfTtcbiAgXG4gIHZhciBpbWFnZU9wdGlvbnMgPSB7XG4gICAgaWQ6IGxheWVyT2JqLmlkLFxuICAgIG5hbWU6IGxheWVyT2JqLm5hbWUsXG4gICAgb3BhY2l0eTogbGF5ZXJPYmoub3BhY2l0eSB8fCAxLjAsXG4gICAgdmlzaWJsZTpsYXllck9iai52aXNpYmxlLFxuICAgIG1heFJlc29sdXRpb246IGxheWVyT2JqLm1heFJlc29sdXRpb25cbiAgfVxuICBcbiAgdmFyIGltYWdlQ2xhc3M7XG4gIHZhciBzb3VyY2U7XG4gIGlmICh0aWxlZCkge1xuICAgIHNvdXJjZSA9IG5ldyBvbC5zb3VyY2UuVGlsZVdNUyhzb3VyY2VPcHRpb25zKTtcbiAgICBpbWFnZUNsYXNzID0gb2wubGF5ZXIuVGlsZTtcbiAgICAvL2ltYWdlT3B0aW9ucy5leHRlbnQgPSBbMTEzNDg2NywzODczMDAyLDI1MDU5NjQsNTU5Njk0NF07XG4gIH1cbiAgZWxzZSB7XG4gICAgc291cmNlID0gbmV3IG9sLnNvdXJjZS5JbWFnZVdNUyhzb3VyY2VPcHRpb25zKVxuICAgIGltYWdlQ2xhc3MgPSBvbC5sYXllci5JbWFnZTtcbiAgfVxuICBcbiAgaW1hZ2VPcHRpb25zLnNvdXJjZSA9IHNvdXJjZTtcbiAgXG4gIHZhciBsYXllciA9IG5ldyBpbWFnZUNsYXNzKGltYWdlT3B0aW9ucyk7XG4gIFxuICByZXR1cm4gbGF5ZXI7XG59O1xuXG4vKlJhc3RlckxheWVycy5UaWxlZFdNU0xheWVyID0gZnVuY3Rpb24obGF5ZXJPYmope1xuICB2YXIgbGF5ZXIgPSBuZXcgb2wubGF5ZXIuVGlsZSh7XG4gICAgbmFtZTogbGF5ZXJPYmoubmFtZSxcbiAgICBvcGFjaXR5OiAxLjAsXG4gICAgc291cmNlOiBuZXcgb2wuc291cmNlLlRpbGVXTVMoe1xuICAgICAgdXJsOiBsYXllck9iai51cmwsXG4gICAgICBwYXJhbXM6IHtcbiAgICAgICAgTEFZRVJTOiBsYXllck9iai5sYXllcnMgfHwgJycsXG4gICAgICAgIFZFUlNJT046ICcxLjMuMCcsXG4gICAgICAgIFRSQU5TUEFSRU5UOiB0cnVlXG4gICAgICB9XG4gICAgfSksXG4gICAgdmlzaWJsZTogbGF5ZXJPYmoudmlzaWJsZVxuICB9KTtcbiAgXG4gIHJldHVybiBsYXllcjtcbn07Ki9cblxubW9kdWxlLmV4cG9ydHMgPSBSYXN0ZXJMYXllcnM7XG5cbiIsIkJhc2VMYXllcnMgPSByZXF1aXJlKCcuLi9sYXllcnMvYmFzZXMnKTtcblxudmFyIE1hcEhlbHBlcnMgPSB7XG4gIGNyZWF0ZVZpZXdlcjogZnVuY3Rpb24ob3B0cyl7XG4gICAgcmV0dXJuIG5ldyBfVmlld2VyKG9wdHMpO1xuICB9XG59O1xuXG52YXIgX1ZpZXdlciA9IGZ1bmN0aW9uKG9wdHMpe1xuICB2YXIgY29udHJvbHMgPSBvbC5jb250cm9sLmRlZmF1bHRzKHtcbiAgICBhdHRyaWJ1dGlvbk9wdGlvbnM6IHtcbiAgICAgIGNvbGxhcHNpYmxlOiBmYWxzZVxuICAgIH0sXG4gICAgem9vbTogZmFsc2UsXG4gICAgYXR0cmlidXRpb246IGZhbHNlXG4gIH0pOy8vLmV4dGVuZChbbmV3IG9sLmNvbnRyb2wuWm9vbSgpXSk7XG4gIFxuICB2YXIgaW50ZXJhY3Rpb25zID0gb2wuaW50ZXJhY3Rpb24uZGVmYXVsdHMoKVxuICAgIC5leHRlbmQoW1xuICAgICAgbmV3IG9sLmludGVyYWN0aW9uLkRyYWdSb3RhdGUoKVxuICAgIF0pO1xuICBpbnRlcmFjdGlvbnMucmVtb3ZlQXQoMSkgLy8gcmltdW92byBkb3VjbGlja3pvb21cbiAgXG4gIHZhciB2aWV3ID0gbmV3IG9sLlZpZXcob3B0cy52aWV3KTtcbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgY29udHJvbHM6IGNvbnRyb2xzLFxuICAgIGludGVyYWN0aW9uczogaW50ZXJhY3Rpb25zLFxuICAgIG9sM0xvZ286IGZhbHNlLFxuICAgIHZpZXc6IHZpZXcsXG4gICAga2V5Ym9hcmRFdmVudFRhcmdldDogZG9jdW1lbnRcbiAgfTtcbiAgaWYgKG9wdHMuaWQpe1xuICAgIG9wdGlvbnMudGFyZ2V0ID0gb3B0cy5pZDtcbiAgfVxuICB2YXIgbWFwICA9IG5ldyBvbC5NYXAob3B0aW9ucyk7XG4gIHRoaXMubWFwID0gbWFwO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLm1hcCkge1xuICAgIHRoaXMubWFwLmRpc3Bvc2UoKTtcbiAgICB0aGlzLm1hcCA9IG51bGxcbiAgfVxufTtcblxuX1ZpZXdlci5wcm90b3R5cGUudXBkYXRlTWFwID0gZnVuY3Rpb24obWFwT2JqZWN0KXt9O1xuXG5fVmlld2VyLnByb3RvdHlwZS51cGRhdGVWaWV3ID0gZnVuY3Rpb24oKXt9O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRNYXAgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5tYXA7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5zZXRUYXJnZXQgPSBmdW5jdGlvbihpZCl7XG4gIHRoaXMubWFwLnNldFRhcmdldChpZCk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nb1RvID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsIHpvb20pe1xuICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBhbmltYXRlID0gb3B0aW9ucy5hbmltYXRlIHx8IHRydWU7XG4gIHZhciB2aWV3ID0gdGhpcy5tYXAuZ2V0VmlldygpO1xuICBcbiAgaWYgKGFuaW1hdGUpIHtcbiAgICB2YXIgcGFuID0gb2wuYW5pbWF0aW9uLnBhbih7XG4gICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgc291cmNlOiB2aWV3LmdldENlbnRlcigpXG4gICAgfSk7XG4gICAgdmFyIHpvb20gPSBvbC5hbmltYXRpb24uem9vbSh7XG4gICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgcmVzb2x1dGlvbjogdmlldy5nZXRSZXNvbHV0aW9uKClcbiAgICB9KTtcbiAgICB0aGlzLm1hcC5iZWZvcmVSZW5kZXIocGFuLHpvb20pO1xuICB9XG4gIFxuICB2aWV3LnNldENlbnRlcihjb29yZGluYXRlcyk7XG4gIHZpZXcuc2V0Wm9vbSh6b29tKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdvVG9SZXMgPSBmdW5jdGlvbihjb29yZGluYXRlcywgcmVzb2x1dGlvbil7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGFuaW1hdGUgPSBvcHRpb25zLmFuaW1hdGUgfHwgdHJ1ZTtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIFxuICBpZiAoYW5pbWF0ZSkge1xuICAgIHZhciBwYW4gPSBvbC5hbmltYXRpb24ucGFuKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICBzb3VyY2U6IHZpZXcuZ2V0Q2VudGVyKClcbiAgICB9KTtcbiAgICB2YXIgem9vbSA9IG9sLmFuaW1hdGlvbi56b29tKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICByZXNvbHV0aW9uOiB2aWV3LmdldFJlc29sdXRpb24oKVxuICAgIH0pO1xuICAgIHRoaXMubWFwLmJlZm9yZVJlbmRlcihwYW4sem9vbSk7XG4gIH1cblxuICB2aWV3LnNldENlbnRlcihjb29yZGluYXRlcyk7XG4gIHZpZXcuc2V0UmVzb2x1dGlvbihyZXNvbHV0aW9uKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmZpdCA9IGZ1bmN0aW9uKGdlb21ldHJ5LCBvcHRpb25zKXtcbiAgdmFyIHZpZXcgPSB0aGlzLm1hcC5nZXRWaWV3KCk7XG4gIFxuICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBhbmltYXRlID0gb3B0aW9ucy5hbmltYXRlIHx8IHRydWU7XG4gIFxuICBpZiAoYW5pbWF0ZSkge1xuICAgIHZhciBwYW4gPSBvbC5hbmltYXRpb24ucGFuKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICBzb3VyY2U6IHZpZXcuZ2V0Q2VudGVyKClcbiAgICB9KTtcbiAgICB2YXIgem9vbSA9IG9sLmFuaW1hdGlvbi56b29tKHtcbiAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICByZXNvbHV0aW9uOiB2aWV3LmdldFJlc29sdXRpb24oKVxuICAgIH0pO1xuICAgIHRoaXMubWFwLmJlZm9yZVJlbmRlcihwYW4sem9vbSk7XG4gIH1cbiAgXG4gIGlmIChvcHRpb25zLmFuaW1hdGUpIHtcbiAgICBkZWxldGUgb3B0aW9ucy5hbmltYXRlOyAvLyBub24gbG8gcGFzc28gYWwgbWV0b2RvIGRpIE9MMyBwZXJjaMOpIMOoIHVuJ29wemlvbmUgaW50ZXJuYVxuICB9XG4gIG9wdGlvbnMuY29uc3RyYWluUmVzb2x1dGlvbiA9IG9wdGlvbnMuY29uc3RyYWluUmVzb2x1dGlvbiB8fCBmYWxzZTtcbiAgXG4gIHZpZXcuZml0KGdlb21ldHJ5LHRoaXMubWFwLmdldFNpemUoKSxvcHRpb25zKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldFpvb20gPSBmdW5jdGlvbigpe1xuICB2YXIgdmlldyA9IHRoaXMubWFwLmdldFZpZXcoKTtcbiAgcmV0dXJuIHZpZXcuZ2V0Wm9vbSgpO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0UmVzb2x1dGlvbiA9IGZ1bmN0aW9uKCl7XG4gIHZhciB2aWV3ID0gdGhpcy5tYXAuZ2V0VmlldygpO1xuICByZXR1cm4gdmlldy5nZXRSZXNvbHV0aW9uKCk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRDZW50ZXIgPSBmdW5jdGlvbigpe1xuICB2YXIgdmlldyA9IHRoaXMubWFwLmdldFZpZXcoKTtcbiAgcmV0dXJuIHZpZXcuZ2V0Q2VudGVyKCk7XG59O1xuXG5fVmlld2VyLnByb3RvdHlwZS5nZXRCQk9YID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMubWFwLmdldFZpZXcoKS5jYWxjdWxhdGVFeHRlbnQodGhpcy5tYXAuZ2V0U2l6ZSgpKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldExheWVyQnlOYW1lID0gZnVuY3Rpb24obGF5ZXJOYW1lKSB7XG4gIHZhciBsYXllcnMgPSB0aGlzLm1hcC5nZXRMYXllcnMoKTtcbiAgdmFyIGxlbmd0aCA9IGxheWVycy5nZXRMZW5ndGgoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChsYXllck5hbWUgPT09IGxheWVycy5pdGVtKGkpLmdldCgnbmFtZScpKSB7XG4gICAgICByZXR1cm4gbGF5ZXJzLml0ZW0oaSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUucmVtb3ZlTGF5ZXJCeU5hbWUgPSBmdW5jdGlvbihsYXllck5hbWUpe1xuICB2YXIgbGF5ZXIgPSB0aGlzLmdldExheWVyQnlOYW1lKGxheWVyTmFtZSk7XG4gIGlmIChsYXllcil7XG4gICAgdGhpcy5tYXAucmVtb3ZlTGF5ZXIobGF5ZXIpO1xuICAgIGRlbGV0ZSBsYXllcjtcbiAgfVxufTtcblxuX1ZpZXdlci5wcm90b3R5cGUuZ2V0QWN0aXZlTGF5ZXJzID0gZnVuY3Rpb24oKXtcbiAgdmFyIGFjdGl2ZWxheWVycyA9IFtdO1xuICB0aGlzLm1hcC5nZXRMYXllcnMoKS5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgdmFyIHByb3BzID0gbGF5ZXIuZ2V0UHJvcGVydGllcygpO1xuICAgIGlmIChwcm9wcy5iYXNlbWFwICE9IHRydWUgJiYgcHJvcHMudmlzaWJsZSl7XG4gICAgICAgYWN0aXZlbGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgIH1cbiAgfSk7XG4gIFxuICByZXR1cm4gYWN0aXZlbGF5ZXJzO1xufTtcblxuX1ZpZXdlci5wcm90b3R5cGUucmVtb3ZlTGF5ZXJzID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5tYXAuZ2V0TGF5ZXJzKCkuY2xlYXIoKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmdldExheWVyc05vQmFzZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBsYXllcnMgPSBbXTtcbiAgdGhpcy5tYXAuZ2V0TGF5ZXJzKCkuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgIHZhciBwcm9wcyA9IGxheWVyLmdldFByb3BlcnRpZXMoKTtcbiAgICBpZiAocHJvcHMuYmFzZW1hcCAhPSB0cnVlKXtcbiAgICAgIGxheWVycy5wdXNoKGxheWVyKTtcbiAgICB9XG4gIH0pO1xuICBcbiAgcmV0dXJuIGxheWVycztcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmFkZEJhc2VMYXllciA9IGZ1bmN0aW9uKHR5cGUpe1xuICB2YXIgbGF5ZXI7XG4gIHR5cGUgPyBsYXllciA9IEJhc2VMYXllcnNbdHlwZV06ICBsYXllciA9IEJhc2VMYXllcnMuQklORy5BZXJpYWw7XG4gIHRoaXMubWFwLmFkZExheWVyKGxheWVyKTtcbn07XG5cbl9WaWV3ZXIucHJvdG90eXBlLmNoYW5nZUJhc2VMYXllciA9IGZ1bmN0aW9uKGxheWVyTmFtZSl7XG4gIHZhciBiYXNlTGF5ZXIgPSB0aGlzLmdldExheWVyQnlOYW1lKGxheWVybmFtZSk7XG4gIHZhciBsYXllcnMgPSB0aGlzLm1hcC5nZXRMYXllcnMoKTtcbiAgbGF5ZXJzLmluc2VydEF0KDAsIGJhc2VMYXllcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcEhlbHBlcnM7XG4iLCJ2YXIgdXRpbHMgPSB7XG4gIG1lcmdlOiBmdW5jdGlvbihvYmoxLG9iajIpe1xuICAgIHZhciBvYmozID0ge307XG4gICAgZm9yICh2YXIgYXR0cm5hbWUgaW4gb2JqMSkgeyBvYmozW2F0dHJuYW1lXSA9IG9iajFbYXR0cm5hbWVdOyB9XG4gICAgZm9yICh2YXIgYXR0cm5hbWUgaW4gb2JqMikgeyBvYmozW2F0dHJuYW1lXSA9IG9iajJbYXR0cm5hbWVdOyB9XG4gICAgcmV0dXJuIG9iajM7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8IS0tIGl0ZW0gdGVtcGxhdGUgLS0+XFxuPGRpdiBpZD1cXFwiY2F0YWxvZ1xcXCIgY2xhc3M9XFxcInRhYmJhYmxlLXBhbmVsIGNhdGFsb2dcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFiYmFibGUtbGluZVxcXCI+XFxuICAgIDx1bCBjbGFzcz1cXFwibmF2IG5hdi10YWJzXFxcIiByb2xlPVxcXCJ0YWJsaXN0XFxcIj5cXG4gICAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBjbGFzcz1cXFwiYWN0aXZlXFxcIj48YSBocmVmPVxcXCIjdHJlZVxcXCIgYXJpYS1jb250cm9scz1cXFwidHJlZVxcXCIgcm9sZT1cXFwidGFiXFxcIiBkYXRhLXRvZ2dsZT1cXFwidGFiXFxcIiBkYXRhLWkxOG49XFxcInRyZWVcXFwiPjwvYT48L2xpPlxcbiAgICAgIDxsaSB2LWlmPVxcXCJoYXNCYXNlTGF5ZXJzXFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPjxhIGhyZWY9XFxcIiNiYXNlbGF5ZXJzXFxcIiBhcmlhLWNvbnRyb2xzPVxcXCJiYXNlbGF5ZXJzXFxcIiByb2xlPVxcXCJ0YWJcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0YWJcXFwiIGRhdGEtaTE4bj1cXFwiYmFzZWxheWVyc1xcXCI+PC9hPjwvbGk+XFxuICAgICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCI+PGEgaHJlZj1cXFwiI2xlZ2VuZFxcXCIgYXJpYS1jb250cm9scz1cXFwibGVnZW5kXFxcIiByb2xlPVxcXCJ0YWJcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0YWJcXFwiIGRhdGEtaTE4bj1cXFwibGVnZW5kXFxcIj48L2E+PC9saT5cXG4gICAgPC91bD5cXG4gICAgPGRpdiAgY2xhc3M9XFxcInRhYi1jb250ZW50XFxcIj5cXG4gICAgICA8ZGl2IHJvbGU9XFxcInRhYnBhbmVsXFxcIiBjbGFzcz1cXFwidGFiLXBhbmUgYWN0aXZlIHRyZWVcXFwiIGlkPVxcXCJ0cmVlXFxcIj5cXG4gICAgICAgIDx1bCBjbGFzcz1cXFwidHJlZS1yb290XFxcIj5cXG4gICAgICAgICAgPHRyaXN0YXRlLXRyZWUgOmxheWVyc3RyZWU9XFxcImxheWVyc3RyZWVcXFwiIGNsYXNzPVxcXCJpdGVtXFxcIiB2LWZvcj1cXFwibGF5ZXJzdHJlZSBpbiBsYXllcnN0cmVlXFxcIj5cXG4gICAgICAgICAgPC90cmlzdGF0ZS10cmVlPlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IHYtaWY9XFxcImhhc0Jhc2VMYXllcnNcXFwiIHJvbGU9XFxcInRhYnBhbmVsXFxcIiBjbGFzcz1cXFwidGFiLXBhbmUgYmFzZWxheWVyc1xcXCIgaWQ9XFxcImJhc2VsYXllcnNcXFwiPlxcbiAgICAgICAgPGZvcm0+XFxuICAgICAgICAgIDx1bD5cXG4gICAgICAgICAgICA8bGkgdi1pZj1cXFwiIWJhc2VsYXllci5maXhlZFxcXCIgdi1mb3I9XFxcImJhc2VsYXllciBpbiBiYXNlbGF5ZXJzXFxcIj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInJhZGlvXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgbmFtZT1cXFwiYmFzZWxheWVyXFxcIiB2LWNoZWNrZWQ9XFxcImJhc2VsYXllci52aXNpYmxlXFxcIiBAY2xpY2s9XFxcInNldEJhc2VMYXllcihiYXNlbGF5ZXIuaWQpXFxcIj57eyBiYXNlbGF5ZXIudGl0bGUgfX08L2xhYmVsPlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9saT5cXG4gICAgICAgICAgPC91bD5cXG4gICAgICAgIDwvZm9ybT5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8bGVnZW5kIDpsYXllcnN0cmVlPVxcXCJsYXllcnN0cmVlXFxcIj48L2xlZ2VuZD5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiIsInZhciB0ID0gcmVxdWlyZSgnY29yZS9pMThuL2kxOG4uc2VydmljZScpLnQ7XG52YXIgR1VJID0gcmVxdWlyZSgnZ3VpL2d1aScpO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpO1xudmFyIFByb2plY3RTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzZXJ2aWNlJykuUHJvamVjdFNlcnZpY2U7XG5cblZ1ZS5jb21wb25lbnQoJ2czdy1jYXRhbG9nJyx7XG4gICAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2F0YWxvZy5odG1sJyksXG4gICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0ZTogUHJvamVjdFNlcnZpY2Uuc3RhdGVcbiAgICAgIH1cbiAgICB9LFxuICAgIGNvbXB1dGVkOiB7XG4gICAgICBsYXllcnN0cmVlOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZS5wcm9qZWN0LmxheWVyc3RyZWU7XG4gICAgICB9LFxuICAgICAgYmFzZWxheWVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGUuYmFzZUxheWVycztcbiAgICAgIH0sXG4gICAgICBoYXNCYXNlTGF5ZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZS5iYXNlTGF5ZXJzLmxlbmd0aD4wO1xuICAgICAgfVxuICAgIH0sXG4gICAgbWV0aG9kczoge1xuICAgICAgc2V0QmFzZUxheWVyOiBmdW5jdGlvbihpZCkge1xuICAgICAgICBQcm9qZWN0U2VydmljZS5zZXRCYXNlTGF5ZXIoaWQpO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVhZHk6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9cbiAgICB9XG59KTtcblxuLy8gdHJlZSBjb21wb25lbnRcblZ1ZS5jb21wb25lbnQoJ3RyaXN0YXRlLXRyZWUnLCB7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3RyaXN0YXRlLXRyZWUuaHRtbCcpLFxuICBwcm9wczoge1xuICAgIGxheWVyc3RyZWU6IFtdLFxuICAgIC8vZXJlZGl0byBpbCBudW1lcm8gZGkgY2hpbGRzIGRhbCBwYXJlbnRcbiAgICBuX3BhcmVudENoaWxkcyA6IDAsXG4gICAgY2hlY2tlZDogZmFsc2VcbiAgfSxcbiAgZGF0YTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICBleHBhbmRlZDogdGhpcy5sYXllcnN0cmVlLmV4cGFuZGVkLFxuICAgICAgcGFyZW50Q2hlY2tlZDogZmFsc2UsXG4gICAgICAvL3Byb3ByaWV0YSBjaGUgc2VydmUgcGVyIGZhcmUgY29uZnJvbnRvIHBlciBpbCB0cmlzdGF0ZVxuICAgICAgbl9jaGlsZHM6IHRoaXMubGF5ZXJzdHJlZS5ub2RlcyA/IHRoaXMubGF5ZXJzdHJlZS5ub2Rlcy5sZW5ndGggOiAwXG4gICAgfVxuICB9LFxuICB3YXRjaDoge1xuICAgICAgJ2NoZWNrZWQnOiBmdW5jdGlvbiAodmFsKXtcbiAgICAgICAgdGhpcy5sYXllcnN0cmVlLnZpc2libGUgPSB2YWw7XG4gICAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgaXNGb2xkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpc0ZvbGRlciA9IHRoaXMubl9jaGlsZHMgPyB0cnVlIDogZmFsc2U7XG4gICAgICBpZiAoaXNGb2xkZXIpIHtcbiAgICAgICAgdmFyIF92aXNpYmxlQ2hpbGRzID0gMDtcbiAgICAgICAgXy5mb3JFYWNoKHRoaXMubGF5ZXJzdHJlZS5ub2RlcyxmdW5jdGlvbihsYXllcil7XG4gICAgICAgICAgaWYgKGxheWVyLnZpc2libGUpe1xuICAgICAgICAgICAgX3Zpc2libGVDaGlsZHMgKz0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLm5fcGFyZW50Q2hpbGRzID0gdGhpcy5uX2NoaWxkcyAtIF92aXNpYmxlQ2hpbGRzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlzRm9sZGVyXG4gICAgfSxcbiAgICBpc0hpZGRlbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5sYXllcnN0cmVlLmhpZGRlbiAmJiAodGhpcy5sYXllcnN0cmVlLmhpZGRlbiA9PT0gdHJ1ZSk7XG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgdG9nZ2xlOiBmdW5jdGlvbiAoY2hlY2tBbGxMYXllcnMpIHtcbiAgICAgIHZhciBjaGVja0FsbCA9IGNoZWNrQWxsTGF5ZXJzID09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmlzRm9sZGVyICYmICFjaGVja0FsbCkge1xuICAgICAgICB0aGlzLmxheWVyc3RyZWUuZXhwYW5kZWQgPSAhdGhpcy5sYXllcnN0cmVlLmV4cGFuZGVkO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoY2hlY2tBbGwpe1xuICAgICAgICBpZiAodGhpcy5wYXJlbnRDaGVja2VkICYmICF0aGlzLm5fcGFyZW50Q2hpbGRzKXtcbiAgICAgICAgICB0aGlzLnBhcmVudENoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBhcmVudENoZWNrZWQgJiYgdGhpcy5uX3BhcmVudENoaWxkcykge1xuICAgICAgICAgIHRoaXMucGFyZW50Q2hlY2tlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5wYXJlbnRDaGVja2VkID0gIXRoaXMucGFyZW50Q2hlY2tlZDtcbiAgICAgICAgfVxuICAgICAgICBQcm9qZWN0U2VydmljZS50b2dnbGVMYXllcnModGhpcy5sYXllcnN0cmVlLm5vZGVzLHRoaXMucGFyZW50Q2hlY2tlZCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgUHJvamVjdFNlcnZpY2UudG9nZ2xlTGF5ZXIodGhpcy5sYXllcnN0cmVlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHRyaUNsYXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIXRoaXMubl9wYXJlbnRDaGlsZHMpIHtcbiAgICAgICAgcmV0dXJuICdmYS1jaGVjay1zcXVhcmUtbyc7XG4gICAgICB9IGVsc2UgaWYgKCh0aGlzLm5fcGFyZW50Q2hpbGRzID4gMCkgJiYgKHRoaXMubl9wYXJlbnRDaGlsZHMgPCB0aGlzLm5fY2hpbGRzKSkge1xuICAgICAgICByZXR1cm4gJ2ZhLXNxdWFyZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJ2ZhLXNxdWFyZS1vJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pXG5cblZ1ZS5jb21wb25lbnQoJ2xlZ2VuZCcse1xuICAgIHRlbXBsYXRlOiByZXF1aXJlKCcuL2xlZ2VuZC5odG1sJyksXG4gICAgcHJvcHM6IFsnbGF5ZXJzdHJlZSddLFxuICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLy9kYXRhIHF1aVxuICAgICAgfVxuICAgIH0sXG4gICAgY29tcHV0ZWQ6IHtcbiAgICAgIHZpc2libGVsYXllcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBfdmlzaWJsZWxheWVycyA9IFtdO1xuICAgICAgICB2YXIgbGF5ZXJzdHJlZSA9IHRoaXMubGF5ZXJzdHJlZTtcbiAgICAgICAgZnVuY3Rpb24gdHJhdmVyc2Uob2JqKXtcbiAgICAgICAgXy5mb3JJbihvYmosIGZ1bmN0aW9uIChsYXllciwga2V5KSB7XG4gICAgICAgICAgICAgIC8vdmVyaWZpY2EgY2hlIGlsIHZhbG9yZSBkZWxsJ2lkIG5vbiBzaWEgbnVsbG9cbiAgICAgICAgICAgICAgaWYgKCFfLmlzTmlsKGxheWVyLmlkKSAmJiBsYXllci52aXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgICBfdmlzaWJsZWxheWVycy5wdXNoKGxheWVyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoIV8uaXNOaWwobGF5ZXIubm9kZXMpKSB7XG4gICAgICAgICAgICAgICAgICB0cmF2ZXJzZShsYXllci5ub2Rlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0cmF2ZXJzZShsYXllcnN0cmVlKTtcbiAgICAgICAgcmV0dXJuIF92aXNpYmxlbGF5ZXJzO1xuICAgICAgfVxuICAgIH0sXG4gICAgd2F0Y2g6IHtcbiAgICAgICdsYXllcnN0cmVlJzoge1xuICAgICAgICBoYW5kbGVyOiBmdW5jdGlvbih2YWwsIG9sZCl7XG4gICAgICAgICAgLy9jb2RpY2UgcXVpXG4gICAgICAgIH0sXG4gICAgICAgIGRlZXA6IHRydWVcbiAgICAgIH1cbiAgICB9LFxuICAgIHJlYWR5OiBmdW5jdGlvbigpIHtcbiAgICAgIC8vY29kaWNlIHF1aVxuICAgIH1cbn0pO1xuXG5WdWUuY29tcG9uZW50KCdsZWdlbmQtaXRlbScse1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9sZWdlbmRfaXRlbS5odG1sJyksXG4gIHByb3BzOiBbJ2xheWVyJ10sXG4gIGNvbXB1dGVkOiB7XG4gICAgbGVnZW5kdXJsOiBmdW5jdGlvbigpe1xuICAgICAgLy8gaW4gYXR0ZXNhIGRpIHJpc29sdmVyZSBsbyBzY2hpYW50byBkaSBRR1NJIFNlcnZlci4uLlxuICAgICAgLy9yZXR1cm4gXCJodHRwOi8vbG9jYWxob3N0L2NnaS1iaW4vcWdpc19tYXBzZXJ2LmZjZ2k/bWFwPS9ob21lL2dpb2hhcHB5L1Njcml2YW5pYS9EZXYvRzNXL2czdy1jbGllbnQvdGVzdC9wcm9nZXR0by90ZXN0LnFncyZTRVJWSUNFPVdNUyZWRVJTSU9OPTEuMy4wJlJFUVVFU1Q9R2V0TGVnZW5kR3JhcGhpYyZGT1JNQVQ9aW1hZ2UvcG5nJkxBWUVSVElUTEU9RmFsc2UmSVRFTUZPTlRTSVpFPTEwJkxBWUVSPVwiK3RoaXMubGF5ZXIubmFtZTtcbiAgICAgIHJldHVybiBQcm9qZWN0U2VydmljZS5nZXRMZWdlbmRVcmwodGhpcy5sYXllcik7XG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgLy8gZXNlbXBpbyB1dGlsaXp6byBkZWwgc2Vydml6aW8gR1VJXG4gICAgb3BlbmZvcm06IGZ1bmN0aW9uKCl7XG4gICAgICAvL0dVSS5ub3RpZnkuc3VjY2VzcyhcIkFwcm8gdW4gZm9ybVwiKTtcbiAgICAgIC8vR1VJLnNob3dGb3JtKCk7XG4gICAgfVxuICB9XG59KVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgcm9sZT1cXFwidGFicGFuZWxcXFwiIGNsYXNzPVxcXCJ0YWItcGFuZVxcXCIgaWQ9XFxcImxlZ2VuZFxcXCI+XFxuICA8bGVnZW5kLWl0ZW0gOmxheWVyPVxcXCJsYXllclxcXCIgdi1mb3I9XFxcImxheWVyIGluIHZpc2libGVsYXllcnNcXFwiPjwvbGVnZW5kLWl0ZW0+XFxuPC9kaXY+XFxuXCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBAY2xpY2s9XFxcIm9wZW5mb3JtKClcXFwiPnt7IGxheWVyLnRpdGxlIH19PC9kaXY+XFxuPGRpdj48aW1nIDpzcmM9XFxcImxlZ2VuZHVybFxcXCI+PC9kaXY+XFxuXCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGxpIHYtaWY9XFxcIiFpc0hpZGRlblxcXCIgY2xhc3M9XFxcInRyZWUtaXRlbVxcXCI+XFxuICA8c3BhbiA6Y2xhc3M9XFxcIntib2xkOiBpc0ZvbGRlciwgJ2ZhLWNoZXZyb24tZG93bic6IGxheWVyc3RyZWUuZXhwYW5kZWQsICdmYS1jaGV2cm9uLXJpZ2h0JzogIWxheWVyc3RyZWUuZXhwYW5kZWR9XFxcIiBAY2xpY2s9XFxcInRvZ2dsZVxcXCIgdi1pZj1cXFwiaXNGb2xkZXJcXFwiIGNsYXNzPVxcXCJmYVxcXCI+PC9zcGFuPlxcbiAgPHNwYW4gdi1pZj1cXFwiaXNGb2xkZXJcXFwiIEBjbGljaz1cXFwidG9nZ2xlKCd0cnVlJylcXFwiIDpjbGFzcz1cXFwiW3RyaUNsYXNzKCldXFxcIiBjbGFzcz1cXFwiZmFcXFwiPjwvc3Bhbj5cXG4gIDxzcGFuIHYtZWxzZSBAY2xpY2s9XFxcInRvZ2dsZVxcXCIgOmNsYXNzPVxcXCJbbGF5ZXJzdHJlZS52aXNpYmxlICA/ICdmYS1jaGVjay1zcXVhcmUtbyc6ICdmYS1zcXVhcmUtbycsbGF5ZXJzdHJlZS5kaXNhYmxlZCAgPyAnZGlzYWJsZWQnOiAnJ11cXFwiIGNsYXNzPVxcXCJmYVxcXCIgc3R5bGU9XFxcImN1cnNvcjpkZWZhdWx0XFxcIj48L3NwYW4+XFxuICA8c3BhbiA6Y2xhc3M9XFxcIntib2xkOiBpc0ZvbGRlciwgZGlzYWJsZWQ6IGxheWVyc3RyZWUuZGlzYWJsZWR9XFxcIiBAY2xpY2s9XFxcInRvZ2dsZVxcXCI+e3tsYXllcnN0cmVlLnRpdGxlfX08L3NwYW4+XFxuICA8dWwgdi1zaG93PVxcXCJsYXllcnN0cmVlLmV4cGFuZGVkXFxcIiB2LWlmPVxcXCJpc0ZvbGRlclxcXCI+XFxuICAgIDx0cmlzdGF0ZS10cmVlIDpuX3BhcmVudC1jaGlsZHMuc3luYz1cXFwibl9wYXJlbnRDaGlsZHNcXFwiIDpsYXllcnN0cmVlPVxcXCJsYXllcnN0cmVlXFxcIiA6Y2hlY2tlZD1cXFwicGFyZW50Q2hlY2tlZFxcXCIgdi1mb3I9XFxcImxheWVyc3RyZWUgaW4gbGF5ZXJzdHJlZS5ub2Rlc1xcXCI+XFxuICAgIDwvdHJpc3RhdGUtdHJlZT5cXG4gIDwvdWw+XFxuPC9saT5cXG5cXG5cXG5cXG5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8Zm9ybSBjbGFzcz1cXFwibmF2YmFyLWZvcm1cXFwiIHJvbGU9XFxcInNlYXJjaFxcXCIgQHN1Ym1pdC5wcmV2ZW50PlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtZ3JvdXBcXFwiPlxcbiAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgOnBsYWNlaG9sZGVyPVxcXCJwbGFjZWhvbGRlclxcXCIgdi1tb2RlbD1cXFwicXVlcnlcXFwiICBuYW1lPVxcXCJzcmNoLXRlcm1cXFwiIGlkPVxcXCJzcmNoLXRlcm1cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1ncm91cC1idG5cXFwiPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiB0eXBlPVxcXCJzdWJtaXRcXFwiIEBjbGljaz1cXFwic2VhcmNoXFxcIj48aSBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1zZWFyY2hcXFwiPjwvaT48L2J1dHRvbj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Zvcm0+XFxuXCI7XG4iLCJ2YXIgdCA9IHJlcXVpcmUoJ2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnKS50O1xudmFyIEdVSSA9IHJlcXVpcmUoJ2d1aS9ndWknKTtcbnZhciBHZW9jb2RpbmdTZXJ2aWNlID0gcmVxdWlyZSgnZ3VpL2NvbXBvbmVudHMvZ2VvY29kaW5nL2dlb2NvZGluZ3NlcnZpY2UnKTtcblxuVnVlLmNvbXBvbmVudChcImdlb2NvZGVyXCIse1xuICB0ZW1wbGF0ZTogcmVxdWlyZShcImd1aS9jb21wb25lbnRzL2dlb2NvZGluZy9nZW9jb2RpbmcuaHRtbFwiKSxcbiAgcHJvcHM6IFsndHlwZSddLFxuICBkYXRhOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiB7XG4gICAgICBxdWVyeTogXCJcIixcbiAgICAgIHBsYWNlaG9sZGVyOiB0KFwic3RyZWV0X3NlYXJjaFwiKVxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHNlYXJjaDogZnVuY3Rpb24oZSl7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJ5O1xuICAgICAgdGhpcy5zZXJ2aWNlLnNlYXJjaChxdWVyeSk7XG4gICAgfVxuICB9LFxuICByZWFkeTogZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5zZXJ2aWNlID0gR2VvY29kaW5nU2VydmljZVt0aGlzLnR5cGVdO1xuICAgIHRoaXMuc2VydmljZS5vbihcInJlc3VsdHNcIixmdW5jdGlvbigpe1xuICAgICAgc2VsZi5xdWVyeSA9IFwiXCI7XG4gICAgfSlcbiAgfVxufSk7XG4iLCJ2YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIGJhc2UgPSByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJykuYmFzZTtcbnZhciBHM1dPYmplY3QgPSByZXF1aXJlKCdjb3JlL2czd29iamVjdCcpO1xudmFyIFByb2plY3RTZXJ2aWNlID0gcmVxdWlyZSgnY29yZS9wcm9qZWN0L3Byb2plY3RzZXJ2aWNlJykuUHJvamVjdFNlcnZpY2U7XG52YXIgTWFwU2VydmljZSA9IHJlcXVpcmUoJ2NvcmUvbWFwL21hcHNlcnZpY2UnKTtcblxuZnVuY3Rpb24gTm9taW5hdGltKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy51cmwgPSBcImh0dHA6Ly9ub21pbmF0aW0ub3BlbnN0cmVldG1hcC5vcmdcIjtcbiAgXG4gIHRoaXMuc2VhcmNoID0gZnVuY3Rpb24ocXVlcnkpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgZXh0ZW50ID0gTWFwU2VydmljZS5leHRlbnRUb1dHUzg0KFByb2plY3RTZXJ2aWNlLnN0YXRlLnByb2plY3QuZXh0ZW50KTtcbiAgICBiYm94c3RyaW5nID0gXy5qb2luKGV4dGVudCwnLCcpO1xuICAgIHZhciBzZWFyY2hVcmwgPSB0aGlzLnVybCtcIi9zZWFyY2g/dmlld2JveGxicnQ9XCIrYmJveHN0cmluZytcIiZib3VuZGVkPTEmZm9ybWF0PWpzb24mcG9seWdvbl9nZW9qc29uPTEmcT1cIitxdWVyeTtcbiAgICAkLmdldChzZWFyY2hVcmwsZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgIHNlbGYuZW1pdChcInJlc3VsdHNcIixyZXN1bHQscXVlcnkpO1xuICAgIH0pO1xuICB9O1xuICBcbiAgYmFzZSh0aGlzKTtcbn1cbmluaGVyaXQoTm9taW5hdGltLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBOb21pbmF0aW06IG5ldyBOb21pbmF0aW1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGxpPlxcbjxmb3JtIHJvbGU9XFxcImZvcm1cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiYm94LWJvZHlcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJleGFtcGxlSW5wdXRFbWFpbDFcXFwiIHN0eWxlPVxcXCJjb2xvcjogd2hpdGVcXFwiPkVtYWlsIGFkZHJlc3M8L2xhYmVsPlxcbiAgICAgIDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgaWQ9XFxcImV4YW1wbGVJbnB1dEVtYWlsMVxcXCIgcGxhY2Vob2xkZXI9XFxcIlxcXCI+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCI+Q2lhbzwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZm9ybT5cXG48L2xpPlwiO1xuIiwidmFyIHQgPSByZXF1aXJlKCdjb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJykudDtcblxuVnVlLmNvbXBvbmVudCgnZzN3LXNlYXJjaCcse1xuICAgIHRlbXBsYXRlOiByZXF1aXJlKCdndWkvY29tcG9uZW50cy9zZWFyY2gvc2VhcmNoLmh0bWwnKSxcbiAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICBcdHJldHVybiB7XG4gICAgICAgIFx0XG4gICAgICAgIH07XG4gICAgfSxcbiAgICBtZXRob2RzOiB7XG4gICAgXHRcblx0fVxufSk7XG4iLCJub29wID0gcmVxdWlyZSgnY29yZS91dGlscy91dGlscycpLm5vb3A7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2NvcmUvdXRpbHMvdXRpbHMnKS5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IHJlcXVpcmUoJ2NvcmUvZzN3b2JqZWN0Jyk7XG5cbi8vIHJhcHByZXNlbnRhIGwnaW50ZXJmYWNjaWEgZ2xvYmFsZSBkZWxsJ0FQSSBkZWxsYSBHVUkuIFxuLy8gbWV0b2RpIGRldm9ubyBlc3NlcmUgaW1wbGVtZW50YXRpIChkZWZpbml0aSkgZGFsbCdhcHBsaWNhemlvbmUgb3NwaXRlXG4vLyBsJ2FwcCBvc3BpdGUgZG92cmViYmUgY2hpYW1hcmUgYW5jaGUgbGEgZnVuemlvbmUgR1VJLnJlYWR5KCkgcXVhbmRvIGxhIFVJIMOoIHByb250YVxuZnVuY3Rpb24gR1VJKCl7XG4gIC8vIHVybCBkZWxsZSByaXNvcnNlXG4gIHRoaXMuZ2V0UmVzb3VyY2VzVXJsID0gbm9vcDtcbiAgLy8gc2hvdyBhIFZ1ZSBmb3JtXG4gIHRoaXMuc2hvd0Zvcm0gPSBub29wO1xuICB0aGlzLmNsb3NlRm9ybSA9IG5vb3A7XG4gIFxuICAvLyBtb3N0cmEgdW5hIGxpc3RhIGRpIG9nZ2V0dGkgKGVzLiBsaXN0YSBkaSByaXN1bHRhdGkpXG4gIHRoaXMuc2hvd0xpc3RpbmcgPSBub29wO1xuICB0aGlzLmNsb3NlTGlzdGluZyA9IG5vb3A7XG4gIHRoaXMuaGlkZUxpc3RpbmcgPSBub29wO1xuXG4gIHRoaXMuc2hvd1BhbmVsID0gbm9vcDtcbiAgXG4gIHRoaXMucmVhZHkgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZW1pdCgnZ3VpcmVhZHknKTtcbiAgfTtcbiAgXG4gIHRoaXMuZ3VpUmVzaXplZCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lbWl0KCdndWlyZXNpemVkJyk7XG4gIH07XG4gIFxuICB0aGlzLnNob3dTcGlubmVyID0gbm9vcDsgLy8gcGVyIG1vc3RyYXJlIHVuJ2ljb25hIHNwaW5uZXIgY2hlIG5vdGlmaWNhIHVuIGNhcmljYW1lbnRvIGRhdGkgaW4gY29yc29cbiAgdGhpcy5oaWRlU3Bpbm5lciA9IG5vb3A7XG4gIFxuICB0b2FzdHIub3B0aW9ucy5wb3NpdGlvbkNsYXNzID0gJ3RvYXN0LXRvcC1jZW50ZXInO1xuICB0b2FzdHIub3B0aW9ucy5wcmV2ZW50RHVwbGljYXRlcyA9IHRydWU7XG4gIC8vIHByb3h5IGRlbGxhIGxpYnJlcmlhIHRvYXN0clxuICB0aGlzLm5vdGlmeSA9IHRvYXN0cjtcbiAgdGhpcy5kaWFsb2cgPSBib290Ym94O1xufVxuaW5oZXJpdChHVUksRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgR1VJO1xuIiwidmFyIGczdyA9IHt9O1xuXG5nM3cuY29yZSA9IHtcbiAgIEczV09iamVjdDogcmVxdWlyZSgnY29yZS9nM3dvYmplY3QnKSxcbiAgIHV0aWxzOiByZXF1aXJlKCdjb3JlL3V0aWxzL3V0aWxzJyksXG4gICBBcHBsaWNhdGlvbjogcmVxdWlyZSgnY29yZS9hcHBsaWNhdGlvbicpLFxuICAgQXBpU2VydmljZTogcmVxdWlyZSgnY29yZS9hcGlzZXJ2aWNlJyksXG4gICBSb3V0ZXI6IHJlcXVpcmUoJ2NvcmUvcm91dGVyJyksXG4gICBQcm9qZWN0c1JlZ2lzdHJ5OiByZXF1aXJlKCdjb3JlL3Byb2plY3QvcHJvamVjdHNyZWdpc3RyeScpLFxuICAgUHJvamVjdFNlcnZpY2U6IHJlcXVpcmUoJ2NvcmUvcHJvamVjdC9wcm9qZWN0c2VydmljZScpLFxuICAgTWFwU2VydmljZTogcmVxdWlyZSgnY29yZS9tYXAvbWFwc2VydmljZScpLFxuICAgTWFwUXVlcnlTZXJ2aWNlOiByZXF1aXJlKCdjb3JlL21hcC9tYXBxdWVyeXNlcnZpY2UnKSxcbiAgIE1hcExheWVyOiByZXF1aXJlKCdjb3JlL21hcC9tYXBsYXllcicpLFxuICAgTGF5ZXJTdGF0ZTogcmVxdWlyZSgnY29yZS9sYXllci9sYXllcnN0YXRlJyksXG4gICBWZWN0b3JMYXllcjogcmVxdWlyZSgnY29yZS9sYXllci92ZWN0b3JsYXllcicpLFxuICAgV21zTGF5ZXI6IHJlcXVpcmUoJ2NvcmUvbGF5ZXIvd21zbGF5ZXInKSxcbiAgIEdlb21ldHJ5OiByZXF1aXJlKCdjb3JlL2dlb21ldHJ5L2dlb21ldHJ5JyksXG4gICBnZW9tOiByZXF1aXJlKCdjb3JlL2dlb21ldHJ5L2dlb20nKSxcbiAgIFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uOiByZXF1aXJlKCdjb3JlL2ludGVyYWN0aW9ucy9waWNrY29vcmRpbmF0ZXNpbnRlcmFjdGlvbicpLFxuICAgUGlja0ZlYXR1cmVJbnRlcmFjdGlvbjogcmVxdWlyZSgnY29yZS9pbnRlcmFjdGlvbnMvcGlja2ZlYXR1cmVpbnRlcmFjdGlvbicpLFxuICAgaTE4bjogcmVxdWlyZSgnY29yZS9pMThuL2kxOG4uc2VydmljZScpLFxuICAgUGx1Z2luOiByZXF1aXJlKCdjb3JlL3BsdWdpbi9wbHVnaW4nKSxcbiAgIFBsdWdpbnNSZWdpc3RyeTogcmVxdWlyZSgnY29yZS9wbHVnaW4vcGx1Z2luc3JlZ2lzdHJ5JyksXG4gICBQbHVnaW5zU2VydmljZTogcmVxdWlyZSgnY29yZS9wbHVnaW4vcGx1Z2luc3NlcnZpY2UnKSxcbiAgIFRvb2xzU2VydmljZTogcmVxdWlyZSgnY29yZS9wbHVnaW4vdG9vbHNzZXJ2aWNlJylcbn07XG5cbmczdy5ndWkgPSB7XG4gIEdlb2NvZGluZzogcmVxdWlyZSgnZ3VpL2NvbXBvbmVudHMvZ2VvY29kaW5nL2dlb2NvZGluZycpLFxuICBTZWFyY2g6IHJlcXVpcmUoJ2d1aS9jb21wb25lbnRzL3NlYXJjaC9zZWFyY2gnKSxcbiAgQ2F0YWxvZzogcmVxdWlyZSgnZ3VpL2NvbXBvbmVudHMvY2F0YWxvZy9jYXRhbG9nJylcbn07XG5cbihmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBnM3c7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpe1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGczdztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGV4cG9ydHMuZzN3ID0gZzN3O1xuICAgIH1cbn0odGhpcyB8fCB7fSkpO1xuIl19
