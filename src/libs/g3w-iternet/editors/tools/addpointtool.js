var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');

var MapService = require('g3w/core/mapservice');

function AddPointFeatureTool(editor){
  var self = this;
  this.editor = editor;
  this.drawInteraction = null;
  
  // qui si definiscono i metodi che vogliamo poter intercettare, ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    addFeature: AddPointFeatureTool.prototype._addFeature
  };
  
  base(this);
}
inherit(AddPointFeatureTool,G3WObject);
module.exports = AddPointFeatureTool;

var proto = AddPointFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(){
  console.log("Avvio inserimento nuova feature");
  var self = this;
  var map = MapService.viewer.map;
  var source = this.editor.getEditVector().getLayer().getSource();;
  
  source.on('addfeature',function(e){
    console.log("Disegnata nuova potenziale feature");
    try {
      // richiamo il setter e se la promessa viene risolta proseguo
      self.addFeature(e.feature)
      .then(function(res){
        console.log("Feature inserita");
      })
      .fail(function(){
        console.log("Qualcuno ha bloccato l'inserimento della feature. La rimuovo");
        source.removeFeature(e.feature);
      });
    }
    catch (error){
      console.log(error);
      source.removeFeature(e.feature);
    }
  });
  
  this.drawInteraction = new ol.interaction.Draw({
    type: 'Point',
    source: source,
    geometryFunction: function(coordinates, geometry){
      return new ol.geom.Point(coordinates);
    }
  });
  map.addInteraction(this.drawInteraction);
  this.drawInteraction.setActive(true);
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  var map = MapService.viewer.map;
  console.log("Terminato inserimento nuova feature");
  map.removeInteraction(this.drawInteraction);
};

proto._addFeature = function(feature){
  console.log("Ok, allora aggiuno una nuova feature");
  return true;
};
