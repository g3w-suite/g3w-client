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
  GUI.on('guiready',function(){
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
