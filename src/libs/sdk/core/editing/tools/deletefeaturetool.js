var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var DeleteInteraction = require('g3w-ol3/src/interactions/deletefeatureinteraction');
var EditingTool = require('./editingtool');

function DeleteFeatureTool(editor) {
  this.editor = editor;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;
  this.setters = {
    deleteFeature: DeleteFeatureTool.prototype._deleteFeature
  };
  
  base(this,editor);
}
inherit(DeleteFeatureTool, EditingTool);
module.exports = DeleteFeatureTool;

var proto = DeleteFeatureTool.prototype;

/* BRUTTISSIMO! Tocca ridefinire tutte le parti internet di OL3 non esposte dalle API */

ol.geom.GeometryType = {
  POINT: 'Point',
  LINE_STRING: 'LineString',
  LINEAR_RING: 'LinearRing',
  POLYGON: 'Polygon',
  MULTI_POINT: 'MultiPoint',
  MULTI_LINE_STRING: 'MultiLineString',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
  CIRCLE: 'Circle'
};

var styles = {};
var white = [255, 255, 255, 1];
var blue = [0, 153, 255, 1];
var red = [255, 0, 0, 1];
var width = 3;
styles[ol.geom.GeometryType.POLYGON] = [
  new ol.style.Style({
    fill: new ol.style.Fill({
      color: [255, 255, 255, 0.5]
    })
  })
];
styles[ol.geom.GeometryType.MULTI_POLYGON] =
    styles[ol.geom.GeometryType.POLYGON];

styles[ol.geom.GeometryType.LINE_STRING] = [
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: white,
      width: width + 2
    })
  }),
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: red,
      width: width
    })
  })
];
styles[ol.geom.GeometryType.MULTI_LINE_STRING] =
    styles[ol.geom.GeometryType.LINE_STRING];

styles[ol.geom.GeometryType.CIRCLE] =
    styles[ol.geom.GeometryType.POLYGON].concat(
        styles[ol.geom.GeometryType.LINE_STRING]
    );


styles[ol.geom.GeometryType.POINT] = [
  new ol.style.Style({
    image: new ol.style.Circle({
      radius: width * 2,
      fill: new ol.style.Fill({
        color: red
      }),
      stroke: new ol.style.Stroke({
        color: white,
        width: width / 2
      })
    }),
    zIndex: Infinity
  })
];
styles[ol.geom.GeometryType.MULTI_POINT] =
    styles[ol.geom.GeometryType.POINT];

styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] =
    styles[ol.geom.GeometryType.POLYGON].concat(
        styles[ol.geom.GeometryType.LINE_STRING],
        styles[ol.geom.GeometryType.POINT]
    );


styles[ol.geom.GeometryType.POLYGON] = _.concat(styles[ol.geom.GeometryType.POLYGON],styles[ol.geom.GeometryType.LINE_STRING]);
styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] = _.concat(styles[ol.geom.GeometryType.GEOMETRY_COLLECTION],styles[ol.geom.GeometryType.LINE_STRING]);
    
/* FINE BRUTTISSIMO! */
// run del tool di delete feature
proto.run = function() {
  var self = this;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer, this.editingLayer],
    condition: ol.events.condition.click,
    style: function(feature, resolution) {
      var style = self.editor._editingVectorStyle.delete || styles[feature.getGeometry().getType()];
      return style;
    }
  });
  this.addInteraction(this._selectInteraction);
  this._deleteInteraction = new DeleteInteraction({
    features: this._selectInteraction.getFeatures()
  });
  this.addInteraction(this._deleteInteraction);
  this._deleteInteraction.on('deleteend',function(e){
    var feature = e.features.getArray()[0];
    var isNew = self._isNew(feature);
    if (!self._busy){
      self._busy = true;
      self.pause(true);
      self.deleteFeature(feature, isNew)
      .always(function() {
        self._busy = false;
        self.pause(false);
      })
    }
  });

};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._selectInteraction.setActive(false);
    this._deleteInteraction.setActive(false);
  }
  else {
    this._selectInteraction.setActive(true);
    this._deleteInteraction.setActive(true);
  }
};

proto.stop = function(){
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._deleteInteraction);
  this._deleteInteraction = null;
  return true;
};

proto._deleteFeature = function(feature, isNew) {
  var relations = [];
  var relationsPromise = this.editor.getRelationsWithValues(feature);
  relationsPromise
  .then(function(relationsArray) {
    relations = relationsArray;
  });
  this.editor.deleteFeature(feature, relations, isNew);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature) {
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};
