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
  
  this._olSource = new ol.source.Vector();
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
  this._fields = null
}
inherit(VectorLayer,G3WObject);
module.exports = VectorLayer;

var proto = VectorLayer.prototype;

proto.setData = function(features,format){
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
    this._olSource.addFeatures(features);
  }
};

proto.setFields = function(fields){
  this._fields = fields;
};

proto.setStyle = function(options){
  var style = new ol.style.Style(options);
  this._olLayer.setStyle(style);
};

proto.getLayer = function(){
  return this._olLayer;
};

proto.addToMap = function(map){
  map.addLayer(this._olLayer);
};
