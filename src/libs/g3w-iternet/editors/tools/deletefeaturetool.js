var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var MapService = require('g3w/core/mapservice');

var DeleteInteraction = require('./deletefeatureinteraction');

function DeleteFeatureTool(editor){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;

  this.setters = {
    deleteFeature: {
      fnc: DeleteFeatureTool.prototype._deleteFeature,
      fallback: DeleteFeatureTool.prototype._fallBack
    }
  };
  
  base(this);
}
inherit(DeleteFeatureTool,G3WObject);
module.exports = DeleteFeatureTool;

var proto = DeleteFeatureTool.prototype;

var styles = ol.style.createDefaultEditingStyles();

var blue = [0, 153, 255, 1];
var red = [255, 0, 0, 1];
var white = [255, 255, 255, 1];
var width = 3;
styles[ol.geom.GeometryType.LINE_STRING][1] = new ol.style.Style({
  stroke: new ol.style.Stroke({
    color: red,
    width: width
  })
});

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

ol.array.extend(styles[ol.geom.GeometryType.POLYGON],
    styles[ol.geom.GeometryType.LINE_STRING]);
ol.array.extend(styles[ol.geom.GeometryType.GEOMETRY_COLLECTION],
    styles[ol.geom.GeometryType.LINE_STRING]);

proto.run = function(){
  var self = this;
  var map = MapService.viewer.map;
  this.layer = this.editor.getVectorLayer().getLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
    condition: ol.events.condition.click,
    style: function(feature, resolution) {
      return styles[feature.getGeometry().getType()];
    }
  });
  map.addInteraction(this._selectInteraction);
  
  this._deleteInteraction = new DeleteInteraction({
    features: this._selectInteraction.getFeatures()
  });
  map.addInteraction(this._deleteInteraction);
  
  var origGeometry = null;
  
  this._deleteInteraction.on('deletestart',function(e){
    var feature = e.features.getArray()[0];
    origGeometry = feature.getGeometry();
  });
  
  this._deleteInteraction.on('deleteend',function(e){
    var feature = e.features.getArray()[0];
    var isNew = self._isNew(feature);
    try {
      if (!self._busy){
        self._busy = true;
        self.pause(true);
        self.deleteFeature(feature,isNew)
        .then(function(res){
          self.pause(false);
        })
        .fail(function(){
          feature.setGeometry(origGeometry);
        });
      }
    }
    catch (error){
      console.log(error);
      feature.setGeometry(origGeometry);
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
  var map = MapService.viewer.map;
  this._selectInteraction.getFeatures().clear();
  map.removeInteraction(this._selectInteraction);
  map.removeInteraction(this._deleteInteraction);
  return true;
};

proto._deleteFeature = function(feature,isNew){
  this.editor.deleteFeature(feature,isNew);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};
