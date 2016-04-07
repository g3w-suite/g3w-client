var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

function VectorLayer(options){
  var options = options || {};
  this.geometrytype = options.geometrytype || null;
  this.format = options.format || null;
  this.crs = options.crs  || null;
  this.id = options.id || null;
  this.name = options.name || "";
  this.pk = options.pk || "id";
  
  this.olSource = new ol.source.Vector();
  
  this.olLayer = new ol.layer.Vector({
    name: this.name,
    source: this.olSource
  });
  
  this.addData = function(features,format){
    var features;
    switch (format){
      case "GeoJSON":
        var geojson = new ol.format.GeoJSON({
          defaultDataProjection: this.crs,
          geometryName: "geometry"
        });
        features = geojson.readFeatures(features);
        break;
    }
    
    if (features) {
      this.olSource.addFeatures(features);
    }
  };
  
  this.setStyle = function(options){
    var style = new ol.style.Style(options);
    this.olLayer.setStyle(style);
  }
  
  this.addToMap = function(map){
    map.addLayer(this.olLayer);
  };
}
inherit(VectorLayer,G3WObject);
module.exports = VectorLayer
