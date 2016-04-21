var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');

var MapService = require('g3w/core/mapservice');

function AddFeatureTool(editor,options){
  var self = this;
  var options = options || {};
  this._running = false;
  this._busy = false;
  this.editor = editor;
  this.isPausable = true;
  
  this.drawInteraction = null;
  this._snap = options.snap || null;
  this._snapInteraction = null; 
  
  this._finishFunction = options.finishFunction || _.constant(true);
  
  // qui si definiscono i metodi che vogliamo poter intercettare, ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    addFeature: {
      fnc: AddFeatureTool.prototype._addFeature,
      fallback: AddFeatureTool.prototype._fallBack
    }
  };
  
  base(this);
}
inherit(AddFeatureTool,G3WObject);
module.exports = AddFeatureTool;

var proto = AddFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(){
  var self = this;
  var map = MapService.viewer.map;
  var source = this.editor.getEditVectorLayer().getLayer().getSource();
  
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
  
  
  // TODO: Monkey patching in attesa della pull request https://github.com/openlayers/ol3/pull/5258
  (function(self){
    ol.interaction.Draw.handleUpEvent_ = function(event){
      this.freehand_ = false;
      var downPx = this.downPx_;
      var clickPx = event.pixel;
      var dx = downPx[0] - clickPx[0];
      var dy = downPx[1] - clickPx[1];
      var squaredDistance = dx * dx + dy * dy;
      var pass = true;
      if (squaredDistance <= this.squaredClickTolerance_) {
        this.handlePointerMove_(event);
        if (!this.finishCoordinate_) {
          this.startDrawing_(event);
          if (this.mode_ === ol.interaction.DrawMode.POINT) {
            this.finishDrawing();
          }
        } else if (this.mode_ === ol.interaction.DrawMode.CIRCLE) {
          this.finishDrawing();
        } else if (this.atFinish_(event)) {
          if(self._finishFunction(event)){
            this.finishDrawing();
          }
        } else {
          this.addToDrawing_(event);
        }
        pass = false;
      }
      return pass;
    }
  })(this);
  
  this.drawInteraction = new ol.interaction.Draw({
    type: this.editor.getEditVectorLayer().geometrytype,
    source: source,
  });
  map.addInteraction(this.drawInteraction);
  this.drawInteraction.setActive(true);
  
  this.drawInteraction.on('drawstart',function(e){
    self.editor.emit('drawstart',e);
  });
  
  this.drawInteraction.on('drawend',function(e){
    self.editor.emit('drawend',e);
  });
  
  if (this._snap){
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    map.addInteraction(this._snapInteraction);
  }
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    if (this._snapInteraction){
      this._snapInteraction.setActive(false);
    }
    this.drawInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction){
      this._snapInteraction.setActive(true);
    }
    this.drawInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  var map = MapService.viewer.map;
  if (this._snapInteraction){
       map.removeInteraction(this._snapInteraction);
    }
  map.removeInteraction(this.drawInteraction);
  return true;
};

proto.removeLastPoint = function(){
  if (this.drawInteraction){
    this.drawInteraction.removeLastPoint();
  }
};

proto.abortDrawing = function(){
  if (this.drawInteraction){
    this.drawInteraction.abortDrawing_();
  }
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
