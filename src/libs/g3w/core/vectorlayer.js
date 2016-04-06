var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

function VectorLayer(options){
  this.geometrytype = options.type || "Point";
  this.format = options.format || "GeoJSON";
  this.crs = options.crs  || "EPSG:4326";
  this.id = options.id || null;
  this.name = options.name || "";
  this.pk = options.pk || "id";
  
  this.olSource = new ol.source.Vector({
    format: ol.format.GeoJSON
  });
  
  this.olLayer = new ol.layer.Vector({
    name: this.name,
    source: this.olSource
  });
  
  this.addFeatures = function(features){
    var geojson = new ol.format.GeoJSON({
      defaultDataProjection: this.crs,
      geometryName: "geometry"
    });
    var features = geojson.readFeatures(features)
    this.olSource.addFeatures(features);
  };
}
inherit(VectorLayer,G3WObject);
module.exports = VectorLayer
