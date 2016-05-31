var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('g3w/core/g3wobject');
var GUI = require('g3w/gui/gui');
var ProjectsRegistry = require('./projectsregistry');
var ProjectService = require('./projectservice').ProjectService;
var ProjectTypes = require('./projectservice').ProjectTypes;
var GeometryTypes = require('./projectservice').GeometryTypes;
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var QueryControl = require('g3w-ol3/src/controls/querycontrol');
var ZoomBoxControl = require('g3w-ol3/src/controls/zoomboxcontrol');
var PickCoordinatesInteraction = require('g3w-ol3/src/interactions/pickcoordinatesinteraction');
var WMSSingleLayer = require('./wmssinglelayer');
var WMSMultiLayer = require('./wmsmultilayer');
var MapQueryService = require('./mapqueryservice');

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
  
  this._interactionsStack = [];
  
  this.setters = {
    setMapView: function(bbox,resolution,center){
      this.state.bbox = bbox;
      this.state.resolution = resolution;
      this.state.center = center;
      this.checkLayersDisabled(resolution);
    },
    setIsLoading: function(bool){
      var delta = bool ? 1 : -1;
      var isFirstIncrement = (this._howManyAreLoading == 0) && (delta == 1);
      var isLastDecrement = (this._howManyAreLoading == 1) && (delta == -1);
      this._howManyAreLoading += delta;

      if (isFirstIncrement || isLastDecrement){
        this.state.loading = bool;
        if (bool) {
          this.emit('loadstart');
        }
        else {
          this.emit('loadend');
        }
      }
    },
    setupviewer: function(){
      $script("http://epsg.io/"+ProjectService.state.project.crs+".js");
      if (!self.viewer){
        self.setupViewer();
      }
      self.setupControls();
      self.setupLayers();
      self.emit('viewerset');
    }
  };
  
  ProjectService.on('projectset',function(){
    self.setupviewer();
  });
  
  ProjectService.onafter('setLayersVisible',function(layers){
    _.forEach(layers,function(layer){
      var mapLayer = self.getMapLayerForLayer(layer);
      mapLayer.update();
    })
  });
  
  this.checkLayerDisabled = function(layer,resolution) {
    var disabled = layer.disabled || false;
    if (layer.maxresolution){
      disabled = layer.maxresolution < resolution;
    }
    if (layer.minresolution){
      layer.disabled = disabled && (layer.minresolution > resolution);
    }
    layer.disabled = disabled;
  };
  
  this.checkLayersDisabled = function(resolution){
    var self = this;
    _.forEach(this.mapLayers,function(mapLayer){
      _.forEach(mapLayer.getLayerConfigs(),function(layer){
        self.checkLayerDisabled(layer,resolution);
      }); 
    })
  };
  
  ProjectService.onafter('setBaseLayer',function(){
    _.forEach(self.mapBaseLayers,function(mapBaseLayer){
      mapBaseLayer.update();
    })
  })
  
  this.setupViewer = function(){
    var extent = ProjectService.state.project.extent;
    var projection = new ol.proj.Projection({
      code: "EPSG:"+ProjectService.state.project.crs,
      extent: extent
    });
    
    var constrain_extent;
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
    }
    
    this.viewer = ol3helpers.createViewer({
      view: {
        projection: projection,
        center: this.config.initcenter || ol.extent.getCenter(ProjectService.state.project.extent),
        zoom: this.config.initzoom | 0,
        extent: constrain_extent || ProjectService.state.project.extent
      }
    });
    
    //var view = this.viewer.map.getView();
    /*view.on('change:resolution',function(e){
      self.setViewBBOX(self.viewer.getBBOX());
      self.setResolution(self.viewer.getResolution());
    });*/
    
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
          case 'zoom':
            control = new ol.control.Zoom({
              zoomInLabel: "\ue98a",
              zoomOutLabel: "\ue98b"
            });
            break;
          case 'zoombox': 
            control = new ZoomBoxControl();
            control.on('zoomend',function(e){
              var pan = ol.animation.pan({
                duration: 500,
                source: self.state.center
              });
              var zoom = ol.animation.zoom({
                duration: 500,
                resolution: self.state.resolution
              });
              self.viewer.map.beforeRender(pan,zoom);
              self.viewer.fit(e.extent,{
                constrainResolution: false
              });
            })
            break;
          case 'zoomtoextent':
            control = new ol.control.ZoomToExtent({
              label:  "\ue98c",
            });
            break;
          case 'query':
            control = new QueryControl();
            control.on('picked',function(e){
              var coordinates = e.coordinates;
              var visibleMapLayers = _.filter(self.mapLayers,function(mapLayer){ 
                return mapLayer.isVisible();
              });
              MapQueryService.queryPoint(coordinates,visibleMapLayers)
              .then(function(featuresForLayerNames){
                var featuresForLayers = [];
                _.forEach(featuresForLayerNames,function(features,layerName){
                  var layer = ProjectService.layers[layerName];
                  featuresForLayers.push({
                    layer: layer,
                    features: features
                  })
                })
                
                self.emit('mapqueryend',featuresForLayers);
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
  
  this.setLayersExtraParams = function(params){
    this.layersExtraParams = params;
    this.emit('extraParamsSet',params);
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
        defaultUrl: ProjectService.getWmsUrl(),
        id: layer.id,
        tiled: true
      };
      
      var mapLayer = new WMSSingleLayer(config);
      self.registerListeners(mapLayer);
      
      mapLayer.addLayer(layer);
      self.mapBaseLayers[layer.id] = mapLayer;
    });
    
    _.forEach(_.values(this.mapBaseLayers).reverse(),function(mapLayer){
      self.viewer.map.addLayer(mapLayer.getLayer());
      mapLayer.update();
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
    var metaLayers = _.groupBy(leafLayersArray,function(layer){
      return layer.metalayer;
    });
    _.forEach(metaLayers,function(layers,id){
      var n = layers.length;
      var layerId = 'layer_'+id
      var mapLayer = _.get(self.mapLayers,layerId);
      // se ho più layer per un dato metalayer significa... che si tratta effettivamente di un metalyer
      var WMSLayerClass = n>1 ? WMSMultiLayer : WMSSingleLayer;
      var config = {
        defaultUrl: ProjectService.getWmsUrl(),
        id: layerId
      };
      mapLayer = self.mapLayers[layerId] = new WMSLayerClass(config,self.layersExtraParams);
      self.registerListeners(mapLayer);
      
      layers.forEach(function(layer){
        // INIETTO QUA LA PROPRIETA' "disabled" per gestire i layer grigiati
        var resolution = self.viewer.map.getView().getResolution();
        self.checkLayerDisabled(layer,resolution);
        mapLayer.addLayer(layer);
        self.layersAssociation[layer.id] = layerId;
      });
    })
    
    _.forEach(_.values(this.mapLayers).reverse(),function(mapLayer){
      self.viewer.map.addLayer(mapLayer.getLayer());
      mapLayer.update();
    })
  };
  
  this.getMapLayerForLayer = function(layer){
    return this.mapLayers['layer_'+layer.metalayer];
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
      self.setIsLoading(true);
    });
    mapLayer.on('loadend',function(){
      self.setIsLoading(false);
    });
    
    this.on('extraParamsSet',function(extraParams){
      mapLayer.update(extraParams);
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
  
  this.highlightGeometry = function(geometryObj,duration,fromWGS84){
    var geometry;
    if (geometryObj instanceof ol.geom.Geometry){
      geometry = geometryObj;
    }
    else {
      format = new ol.format.GeoJSON;
      geometry = format.readGeometry(geometryObj);
    }
    
    if (fromWGS84) {
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
        if (geometryType == ol.geom.GeometryType.LINE_STRING) {
          var style = new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: 'rgb(255,255,0)',
              width: 4
            })
          })
          styles.push(style);
        }
        else if (geometryType == ol.geom.GeometryType.POINT){
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
