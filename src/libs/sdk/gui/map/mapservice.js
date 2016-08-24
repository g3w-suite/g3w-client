var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var ApplicationService = require('core/applicationservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectTypes = require('core/project/projecttypes');
var GeometryTypes = require('core/geometry/geometry').GeometryTypes;
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var WMSLayer = require('core/map/layer/wmslayer');
var ControlsFactory = require('gui/map/control/factory');
var QueryService = require('core/query/queryservice');

function MapService(project){
  var self = this;
  this.config;
  this.viewer;
  this.target;
  this._mapControls = [],
  this._mapLayers = [];
  this.mapBaseLayers = {};
  this.layersExtraParams = {};
  this.state = {
      bbox: [],
      resolution: null,
      center: null,
      loading: false
  };
  this.config = ApplicationService.getConfig();
  
  this._howManyAreLoading = 0;
  this._incrementLoaders = function(){
    if (this._howManyAreLoading == 0){
      this.emit('loadstart');
      GUI.showSpinner({
        container: $('#map-spinner'),
        id: 'maploadspinner',
        style: 'blue'
      });
    }
    this._howManyAreLoading += 1;
  };
  
  this._decrementLoaders = function(){
    this._howManyAreLoading -= 1;
    if (this._howManyAreLoading == 0){
      this.emit('loadend');
      GUI.hideSpinner('maploadspinner');
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
    setupViewer: function(initialResolution){
      //$script("http://epsg.io/"+ProjectService.state.project.crs+".js");
      proj4.defs("EPSG:"+self.project.state.crs,this.project.state.proj4);
      if (self.viewer) {
        self.viewer.destroy();
        self.viewer = null;
      }
      self._setupViewer(initialResolution);
      self.setupControls();
      self.setupLayers();
      self.emit('viewerset');
    }
  };
  
  this._setupViewer = function(initialResolution){
    var extent = this.project.state.extent;
    var projection = this.getProjection();
    
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
      id: this.target,
      view: {
        projection: projection,
        /*center: this.config.initcenter || ol.extent.getCenter(extent),
        zoom: this.config.initzoom || 0,
        extent: this.config.constraintextent || extent,
        minZoom: this.config.minzoom || 0, // default di OL3 3.16.0
        maxZoom: this.config.maxzoom || 28 // default di OL3 3.16.0*/
        center: ol.extent.getCenter(extent),
        extent: extent,
        //minZoom: 0, // default di OL3 3.16.0
        //maxZoom: 28 // default di OL3 3.16.0
        maxResolution: initialResolution
      }
    });
    
    if (this.config.background_color) {
      $('#'+this.target).css('background-color',this.config.background_color);;
    }
    
    $(this.viewer.map.getViewport()).prepend('<div id="map-spinner" style="position:absolute;right:0px;"></div>');
    
    this.viewer.map.getInteractions().forEach(function(interaction){
      self._watchInteraction(interaction);
    });
    
    this.viewer.map.getInteractions().on('add',function(interaction){
      self._watchInteraction(interaction.element);
    })
    
    this.viewer.map.getInteractions().on('remove',function(interaction){
      //self._onRemoveInteraction(interaction);
    });
  
    
    this.viewer.map.getView().setResolution(initialResolution);
    
    this.viewer.map.on('moveend',function(e){
      self._setMapView();
    });

    //AL MOMENTO LASCIO COSÌ POI VEDIAMO
    QueryService.setMapService(this);

    this.emit('ready');
  };
  
  this.project.on('projectswitch',function(){
    self.setupLayers();
  });
  
  this.project.onafter('setLayersVisible',function(layersIds){
    var mapLayers = _.map(layersIds,function(layerId){
      var layer = self.project.getLayerById(layerId);
      return self.getMapLayerForLayer(layer);
    })
    self.updateMapLayers(self.getMapLayers());
  });
  
  this.project.onafter('setBaseLayer',function(){
    self.updateMapLayers(self.mapBaseLayers);
  });
  
  base(this);
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

proto.getProject = function() {
  return this.project;
};

proto.getMap = function() {
  return this.viewer.map;
};

proto.getProjection = function() {
  var extent = this.project.state.extent;
  var projection = new ol.proj.Projection({
    code: "EPSG:"+this.project.state.crs,
    extent: extent
  });
  return projection;
};

proto.getViewerElement = function(){
  return this.viewer.map.getTargetElement();
};

proto.getViewport = function(){
  return this.viewer.map.getViewport();
};

proto.getResolution = function() {
  return this.viewer.map.getView().getResolution();
};

proto.getEpsg = function() {
  return this.viewer.map.getView().getProjection().getCode();
};

proto.getGetFeatureInfoUrlForLayer = function(layer,coordinates,resolution,epsg,params) {
  var mapLayer = this.getMapLayerForLayer(layer);
  return mapLayer.getGetFeatureInfoUrl(coordinates,resolution,epsg,params);
};

proto.setupControls = function(){
  var self = this;
  var map = self.viewer.map;
  if (this.config && this.config.mapcontrols) {
    _.forEach(this.config.mapcontrols,function(controlType){
      var control;
      switch (controlType) {
        case 'reset':
          if (!isMobile.any) {
            control = ControlsFactory.create({
              type: controlType
            });
          }
          self.addControl(control);
          break;
        case 'zoom':
          control = ControlsFactory.create({
            type: controlType,
            zoomInLabel: "\ue98a",
            zoomOutLabel: "\ue98b"
          });
          self.addControl(control);
          break;
        case 'zoombox': 
          if (!isMobile.any) {
            control = ControlsFactory.create({
              type: controlType
            });
            control.on('zoomend',function(e){
              self.viewer.fit(e.extent);
            })
          }
          self.addControl(control);
          break;
        case 'zoomtoextent':
          control = ControlsFactory.create({
            type: controlType,
            label:  "\ue98c",
            extent: self.config.constraintextent
          });
          self.addControl(control);
          break;
        case 'query':
          control = ControlsFactory.create({
            type: controlType
          });
          control.on('picked',function(e){
            var coordinates = e.coordinates;
            var showQueryResults = GUI.showResultsFactory('query');
            
            var layers = self.project.getLayers({
              QUERYABLE: true,
              SELECTEDORALL: true
            });
            
            //faccio query by location su i layers selezionati o tutti
            var queryResultsPanel = showQueryResults('interrogazione');
            QueryService.queryByLocation(coordinates, layers)
            .then(function(results){
              queryResultsPanel.setQueryResponse(results);
            });
          });
          self.addControl(control);
          break;
        case 'scaleline':
          control = ControlsFactory.create({
            type: controlType,
            position: 'br'
          });
          self.addControl(control);
          break;
        case 'overview':
          var overviewProjectGid = self.project.getOverviewProjectGid();
          if (overviewProjectGid) {
            ProjectsRegistry.getProject(overviewProjectGid)
            .then(function(project){
              var overViewMapLayers = self.getOverviewMapLayers(project);
              control = ControlsFactory.create({
                type: controlType,
                position: 'bl',
                className: 'ol-overviewmap ol-custom-overviewmap',
                collapseLabel: $('<span class="glyphicon glyphicon-menu-left"></span>')[0],
                label: $('<span class="glyphicon glyphicon-menu-right"></span>')[0],
                collapsed: false,
                layers: overViewMapLayers,
                view: new ol.View({
                  projection: self.getProjection()
                })
              });
              self.addControl(control);
            });
          }
          break;
      };
    });
  }
};

proto.addControl = function(control){
  this.viewer.map.addControl(control);
  this._mapControls.push(control);
};

proto.addMapLayer = function(mapLayer) {
  this._mapLayers.push(mapLayer);
};

proto.getMapLayers = function() {
  return this._mapLayers;
};

proto.getMapLayerForLayer = function(layer){
  var mapLayer;
  var multilayerId = 'layer_'+layer.state.multilayer;
  _.forEach(this.getMapLayers(),function(_mapLayer){
    if (_mapLayer.getId() == multilayerId) {
      mapLayer = _mapLayer;
    }
  })
  return mapLayer;
};

proto.setupBaseLayers = function(){
  var self = this;
  if (!this.project.state.baselayers){
    return;
  }
  var self = this;
  this.mapBaseLayers = {};
  
  var initBaseLayer = ProjectsRegistry.config.initbaselayer;
  var baseLayersArray = this.project.state.baselayers;
  
  _.forEach(baseLayersArray,function(baseLayer){
    var visible = true;
    if (self.project.state.initbaselayer) {
      visible = baseLayer.id == (self.project.state.initbaselayer);
    }
    if (baseLayer.fixed) {
      visible = baseLayer.fixed;
    }
    baseLayer.visible = visible;
  })
  
  baseLayersArray.forEach(function(layer){     
    var config = {
      url: self.project.getWmsUrl(),
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
  this._reset();
  var layers = this.project.getLayers();
  //raggruppo per valore del multilayer con chiave valore multilayer e valore array
  var multiLayers = _.groupBy(layers,function(layer){
    return layer.state.multilayer;
  });
  _.forEach(multiLayers,function(layers,id){
    var multilayerId = 'layer_'+id
    var tiled = layers[0].state.tiled;
    var config = {
      url: self.project.getWmsUrl(),
      id: multilayerId,
      tiled: tiled
    };
    var mapLayer = new WMSLayer(config,self.layersExtraParams);
    self.addMapLayer(mapLayer);
    self.registerListeners(mapLayer);
    _.forEach(layers.reverse(),function(layer){
      mapLayer.addLayer(layer);
    });
  })
  
  _.forEach(this.getMapLayers().reverse(),function(mapLayer){
    self.viewer.map.addLayer(mapLayer.getOLLayer());
    mapLayer.update(self.state,self.layersExtraParams);
  })
  return this.mapLayers;
};

proto.getOverviewMapLayers = function(project) {
  var self = this;
  var projectLayers = project.getLayers({
    'VISIBLE': true
  });

  var multiLayers = _.groupBy(projectLayers,function(layer){
    return layer.state.multilayer;
  });
  
  var overviewMapLayers = [];
  _.forEach(multiLayers,function(layers,id){
    var multilayerId = 'overview_layer_'+id
    var tiled = layers[0].state.tiled;
    var config = {
      url: project.getWmsUrl(),
      id: multilayerId,
      tiled: tiled
    };
    var mapLayer = new WMSLayer(config);
    _.forEach(layers.reverse(),function(layer){
      mapLayer.addLayer(layer);
    });
    overviewMapLayers.push(mapLayer.getOLLayer(true));
  })
  
  return overviewMapLayers.reverse();
};

proto.updateMapLayers = function(mapLayers) {
  var self = this;
  _.forEach(mapLayers,function(mapLayer){
    mapLayer.update(self.state,self.layersExtraParams);
  })
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

proto.setTarget = function(elId){
  this.target = elId;
};

proto.addInteraction = function(interaction){
  this._unsetControls();
  this.viewer.map.addInteraction(interaction);
  interaction.setActive(true);
};

proto.removeInteraction = function(interaction){
  this.viewer.map.removeInteraction(interaction);
};

// emetto evento quando viene attivata un interazione di tipo Pointer (utile ad es. per disattivare/riattivare i tool di editing)
proto._watchInteraction = function(interaction) {
  var self = this;
  interaction.on('change:active',function(e){
    if ((e.target instanceof ol.interaction.Pointer) && e.target.getActive()) {
      self.emit('pointerInteractionSet',e.target);
    }
  })
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
    wmsLayer.getOLLayer().getSource().updateParams({"time": Date.now()});
  })
};

proto.resize = function(width,height) {
  if (!this.viewer) {
    var initialExtent = this.project.state.extent;
    var xRes = ol.extent.getWidth(initialExtent) / width;
    var yRes = ol.extent.getHeight(initialExtent) / height;
    var res = Math.max(xRes,yRes);
    this.setupViewer(res);
  }
  this.getMap().updateSize();
  this._setMapView();
};

proto._reset = function() {
  this._mapLayers = [];
};

proto._unsetControls = function() {
  _.forEach(this._mapControls,function(control){
    if (control.toggle) {
      control.toggle(false);
    }
  })
};

proto._setMapView = function(){
  var bbox = this.viewer.getBBOX();
  var resolution = this.viewer.getResolution();
  var center = this.viewer.getCenter();
  this.setMapView(bbox,resolution,center);
};

module.exports = MapService
