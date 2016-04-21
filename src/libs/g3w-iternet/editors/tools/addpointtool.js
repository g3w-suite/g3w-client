var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');

var MapService = require('g3w/core/mapservice');

function AddPointFeatureTool(editor){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this._running = false;
  this._busy = false;
  
  // qui si definiscono i metodi che vogliamo poter intercettare, ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    addFeature: {
      fnc: AddPointFeatureTool.prototype._addFeature,
      fallback: AddPointFeatureTool.prototype._fallBack
    }
  };
  
  base(this);
}
inherit(AddPointFeatureTool,G3WObject);
module.exports = AddPointFeatureTool;

var proto = AddPointFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(){
  var self = this;
  var map = MapService.viewer.map;
  var source = this.editor.getEditVectorLayer().getLayer().getSource();;
  
  source.on('addfeature',function(e){
    //try {
      // richiamo il setter e se la promessa viene risolta proseguo
      if (!self._busy){
        self._busy = true;
        self.pause();
        self.addFeature(e.feature)
        .then(function(res){
        })
        .fail(function(){
          source.removeFeature(e.feature);
        });
      }
    //}
    /*catch (error){
      console.log(error);
      source.removeFeature(e.feature);
    }*/
  });
  
  this.drawInteraction = new ol.interaction.Draw({
    type: 'Point',
    source: source,
  });
  map.addInteraction(this.drawInteraction);
  this.drawInteraction.setActive(true);
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this.drawInteraction.setActive(false);
  }
  else {
    this.drawInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  var map = MapService.viewer.map;
  map.removeInteraction(this.drawInteraction);
  return true;
};

proto._addFeature = function(feature){
  this.editor.addFeature(feature);
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};
