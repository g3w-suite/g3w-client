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

function ProjectLayer(state) {
  /*this.state = {
    attributes: options.attributes,
    bbox: options.bbox,
    capabilities: options.capabilities,
    crs: options.crs,
    disabled: options.disabled,
    editops: options.editops,
    geometrytype: options.geometrytype,
    id: options.id,
    infoformat: options.infoformat,
    infourl: options.infourl,
    maxscale: options.maxscale,
    minscale: options.minscale,
    multilayer: options.multilayer,
    name: options.name,
    origname: options.origname,
    relations: options.relations,
    scalebasedvisibility: options.scalebasedvisibility,
    selected: options.selected,
    servertype: options.servertype,
    source: options.source,
    title: options.title,
    visible: options.visible,
    selected: options.selected | false,
    disabled: options.disabled | false
  }*/
  
  // lo stato è sincronizzato con quello del layerstree
  this.state = state;
  
  this._project = null;
  
  // in teoria questo non dovrebbe interessare il ProjectLayer, che è indipendente dalla presenza o meno di una mappa, 
  //ma per comodità in varie parti del codice teniamo anche questo riferimento.
  this._mapLayer = null;
};

var proto = ProjectLayer.prototype;

proto.getProject = function() {
  return this._project;
};

proto.setProject = function(project) {
  this._project = project
};

proto.getId = function() {
  return this.state.id;
};

proto.getMapLayer = function() {
  return this._mapLayer;
}

proto.setMapLayer = function(mapLayer) {
  this._mapLayer = mapLayer;
};

proto.getGeometryType = function() {
  return this.state.geometrytype;
};

proto.getAttributes = function() {
  return this.state.attributes;
};

proto.isSelected = function() {
  return this.state.selected;
};

proto.isDisabled = function() {
  return this.state.disabled;
};

proto.isQueryable = function(){
  var queryEnabled = false;
  var queryableForCababilities = (this.state.capabilities && (this.state.capabilities && CAPABILITIES.QUERY)) ? true : false;
  if (queryableForCababilities) {
    // è interrogabile se visibile e non disabilitato (per scala) oppure se interrogabile comunque (forzato dalla proprietà infowhennotvisible)
    var queryEnabled = (this.state.visible && !this.state.disabled) || (this.state.infowhennotvisible && (this.state.infowhennotvisible === true));
  }
  return queryEnabled;
};

proto.getQueryLayerName = function() {
  var queryLayerName;
  if (this.state.infolayer && this.state.infolayer != '') {
    queryLayerName = this.state.infolayer;
  }
  else {
    queryLayerName = this.state.name;
  }
  return queryLayerName;
};

proto.getServerType = function() {
  if (this.state.servertype && this.state.servertype != '') {
    return this.state.servertype;
  }
  else {
    return ProjectLayer.ServerTypes.QGIS;
  }
};

proto.getCrs = function() {
  return this.getProject().getCrs();
}

proto.isExternalWMS = function() {
  return (this.state.source && this.state.source.url);
};

proto.getWMSLayerName = function() {
  var layerName = this.state.name;
  if (this.state.source && this.state.source.layers){
    layerName = this.state.source.layers;
  };
  return layerName;
};

proto.getQueryUrl = function() {
  if (this.state.infourl && this.state.infourl != '') {
    return this.state.infourl;
  }
  else {
    return this.getProject().getWmsUrl();
  }
};

proto.setQueryUrl = function(queryUrl) {
  this.state.inforurl = queryUrl;
};

proto.getInfoFormat = function() {
  if (this.state.infoformat && this.state.infoformat != '') {
    return this.state.infoformat;
  }
  else {
    return this.getProject().getInfoFormat();
  }
};

proto.setInfoFormat = function(infoFormat) {
  this.state.infoformat = infoFormat;
};

proto.getOriginURL = function() {
  var url;
  if (this.state.source && this.state.source.type == 'wms' && this.state.source.url){
    url = this.state.source.url
  };
  return url;
};

ProjectLayer.ServerTypes = {
  OGC: "OGC",
  QGIS: "QGIS",
  Mapserver: "Mapserver",
  Geoserver: "Geoserver",
  ArcGIS: "ArcGIS"
};

module.exports = ProjectLayer;
