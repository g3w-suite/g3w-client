var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var MapService = require('g3w/core/mapservice');
var GUI = require('g3w/gui/gui');
var IternetEditor = require('./iterneteditor');

function StradeEditor(options){
  base(this,options);
  
  this._service = null;
  this._giunzioniEditor = null;
  
  /* CONTROLLO GIUNZIONI PER LE STRADE NON COMPLETAMENTE CONTENUTE NELLA VISTA */
  
  // per le strade presenti nella vista carica le giunzioni eventualmente mancanti (esterne alla vista)
  this._loadMissingGiunzioniInView = function(){
    var vectorLayer = this.getVectorLayer();
    var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
    
    var stradeSource = vectorLayer.getSource();
    var extent = ol.extent.buffer(stradeSource.getExtent(),1);
    this._service._loadVectorData(giunzioniVectorLayer,extent);
  };
  
  /* FINE */
  
  /* INIZIO GESTIONE VINCOLO SNAP SU GIUNZIONI DURANTE IL DISEGNO DELLE STRADE */
  
  this._stradeSnaps = new function(){
    var snaps = [];
    this.length = 0;
    
    this.push = function(feature){
      snaps.push(feature);
      this.length += 1;
    };
    
    this.getLast = function(){
      return snaps[snaps.length-1];
    };
    
    this.getFirst = function(){
      return snaps[0];
    };
    
    this.clear = function(){
      snaps.splice(0,snaps.length);
      this.length = 0;
    };
    
    this.getSnaps = function(){
      return snaps;
    };
  };
  
  this._isFeatureSnappable = function(feature){
    var cod_gnz = feature.get('cod_gnz');
    return (!_.isNil(cod_gnz) && cod_gnz != '');
  };
  
  this._drawRemoveLastPoint = _.bind(function(e){
    var self = this;
    var toolType = this.getActiveTool().getType();
    // il listener viene attivato per tutti i tool dell'editor strade, per cui devo controllare che sia quello giusto
    if (toolType == 'addfeature'){
      // CANC
      if(e.keyCode==46){
        e.preventDefault();
        e.stopPropagation();
        self.getActiveTool().getTool().removeLastPoint();
      }
    }
  },this);
  
  this._setupDrawStradeConstraints = function(){
    var mapId = MapService.viewer.map.getTargetElement().id;
    var self = this;
    var map = MapService.viewer.map;

    $('body').keyup(this._drawRemoveLastPoint);
    
    var snaps = this._stradeSnaps;
    snaps.clear();
    var drawingGeometry = null;
    
    this.on('drawstart',function(e){
      console.log("inizio");
      var geometry = e.feature.getGeometry();
      var coordsLength = null;
      geometry.on('change',function(e,geometry){
        self._drawingGeometry = e.target;
        /*var coordinates = e.target.getCoordinates();
        if(!coordsLength){  
          coordsLength = coordinates.length;
        }
        if (coordinates.length != coordsLength){
          console.log(coordinates.length);
          coordsLength = coordinates.length;
        }*/
      })
    })
    
    this.onbefore('addFeature',function(feature){
      var snaps = self._stradeSnaps.getSnaps();
      if (snaps.length == 2){
        feature.set('nod_ini',snaps[0].get('cod_gnz'));
        feature.set('nod_fin',snaps[1].get('cod_gnz'));
        self._stradeSnaps.clear();
        return true;
      }
      return false;
    });
  };
  
  this._getCheckSnapsCondition = function(snaps){
    // ad ogni click controllo se ci sono degli snap con le giunzioni
    return function(e){
      /*if (snaps.length == 2){
        return true;
      }
      GUI.notify.error("L'ultimo vertice deve corrispondere con una giunzione");*/
      return true;
    }
  };
  
  // ad ogni click controllo se ci sono degli snap con le giunzioni
  this._getStradaIsBeingSnappedCondition = function(snaps){
    var self = this;
    var map = MapService.viewer.map;
    var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
    
    return function(e){
      var interaction = this;
      var coordinates;
      if(self._drawingGeometry){
        coordinates = self._drawingGeometry.getCoordinates();
        //console.log(self._drawingGeometry.getCoordinates().length);
      }
      else {
        coordinates = [map.getCoordinateFromPixel(e.pixel)];
      }

      /*var c = map.getCoordinateFromPixel(e.pixel);
      var giunzioniSource = self._layers[self.layerCodes.GIUNZIONI].vector.getSource();
      var extent = ol.extent.buffer([c[0],c[1],c[0],c[1]],1);
      var snappedFeature = giunzioniSource.getFeaturesInExtent(extent)[0];
      
      // se ho già due snap e questo click non è su un'altra giunzione, oppure se ho più di 2 snap, non posso inserire un ulteriore vertice
      if ((snaps.length == 2 && (!snappedFeature || snappedFeature != snaps.getSnaps()[1]))){
        var lastSnapped
        GUI.notify.error("Una strada non può avere vertici intermedi in corrispondenza di giunzioni.<br> Premere <b>CANC</b> per rimuovere l'ultimo vertice.");
        return false;
      }
      
      if (snappedFeature && self._isFeatureSnappable(snappedFeature) && snaps.length < 2){
        snaps.push(snappedFeature);
      }
      
      // se non ci sono snap, vuol dire che sono ancora al primo click e non ho snappato con la giunzione iniziale
      if (snaps.length == 0){
        GUI.notify.error("Il primo vertice deve corrispondere con una giunzione");
        return false;
      }
      return true;*/
      

      var snaps = self._stradeSnaps;
      snaps.clear();
      
      var firstVertexSnapped = false;
      var lastVertexSnapped = false;  
      
      _.forEach(coordinates,function(c,index){      
        var giunzioniSource = giunzioniVectorLayer.getSource();
        var extent = ol.extent.buffer([c[0],c[1],c[0],c[1]],1);
        var snappedFeature = giunzioniSource.getFeaturesInExtent(extent)[0];
        
        if (snappedFeature && self._isFeatureSnappable(snappedFeature)){
          if (snaps.getSnaps()[snaps.length-1] == snappedFeature){
            interaction.removeLastPoint();
            coordinates = self._drawingGeometry.getCoordinates();
          }
          if (index == 0){
            firstVertexSnapped = true;
          }
          else if (index == (coordinates.length-1)){
            lastVertexSnapped = true;
          }
          snaps.push(snappedFeature);
        }
      })
      console.log("N.snap "+snaps.length+" n.coordinate: "+coordinates.length)
      
      if (snaps.length > 2){
        GUI.notify.error("Una strada non può avere vertici intermedi in corrispondenza di giunzioni.<br> Premere <b>CANC</b> per rimuovere l'ultimo vertice.");
        return false;
      }
      
      // se non ci sono snap, vuol dire che sono ancora al primo click e non ho snappato con la giunzione iniziale
      if (!firstVertexSnapped){
        GUI.notify.error("Il primo vertice deve corrispondere con una giunzione");
        return false;
      }
      
      if (snaps.length == 2 && !lastVertexSnapped){
        GUI.notify.error("L'ultimo vertice deve corrispondere con una giunzione");
        return false;
      }
      return true;
    }
  };
  
  this._modifyRemovePoint = _.bind(function(e){
    var self = this;
    var toolType = editor.getActiveTool().getType();
    // il listener viene attivato per tutti i tool dell'editor strade, per cui devo controllare che sia quello giusto
    if (toolType == 'modifyvertex'){
    // CANC
      if(e.keyCode==46){
        e.preventDefault();
        e.stopPropagation();
        self.getActiveTool().getTool().removePoint();
      }
    }
  },this);
  
  this._setupModifyVertexStradeConstraints = function(){
    var self = this;
    var map = MapService.viewer.map;
    this._stradeSnaps.clear();
    $('body').keyup(this._modifyRemovePoint);
    this.onbefore('modifyFeature',function(feature){
      return self._checkStradaIsCorrectlySnapped(feature.getGeometry);
    });
  };
  
  this._checkStradaIsCorrectlySnapped = function(geometry){
    var self = this;
    var ret = true;
    var map = MapService.viewer.map;
    var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
    this._stradeSnaps.clear();
    var snaps = this._stradeSnaps;
    var coordinates = geometry.getCoordinates();
    
    var firstVertexSnapped = false;
    var lastVertexSnapped = false;
    
    _.forEach(coordinates,function(c,index){      
      var giunzioniSource = giunzioniVectorLayer.getSource();
      
      var extent = ol.extent.buffer([c[0],c[1],c[0],c[1]],0.1);
      
      var snappedFeature = giunzioniSource.getFeaturesInExtent(extent)[0];
      
      if (snappedFeature && self._isFeatureSnappable(snappedFeature)){
        if (index == 0){
          firstVertexSnapped = true;
        }
        else if (index == (coordinates.length-1)){
          lastVertexSnapped = true;
        }
        snaps.push(snappedFeature);
      }
    });
    
    if (snaps.length > 2){
      GUI.notify.error("Una strada non può avere vertici intermedi in corrispondenza di giunzioni");
      ret = false;
    }
    
    if (!firstVertexSnapped){
      GUI.notify.error("Il primo vertice deve corrispondere con una giunzione");
      ret = false;
    }
    
    if (!lastVertexSnapped){
      GUI.notify.error("L'ultimo vertice deve corrispondere con una giunzione");
      ret = false;
    }
    return ret;
  };
  
  /* FINE VINCOLO SNAP DELLE STRADE */
}
inherit(StradeEditor,IternetEditor);
module.exports = StradeEditor;

var proto = StradeEditor.prototype;

proto.start = function(iternetService){
  this._service = iternetService;
  this._giunzioniEditor = iternetService._layers[iternetService.layerCodes.GIUNZIONI].editor;
  
  this._loadMissingGiunzioniInView();
  this._setupDrawStradeConstraints();
  this._setupModifyVertexStradeConstraints();
        
  return IternetEditor.prototype.start.call(this);
};

proto.setTool = function(toolType){
  var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
  var options;
  if (toolType=='addfeature'){
    options = {
      snap: {
        vectorLayer: giunzioniVectorLayer
      },
      finishCondition: this._getCheckSnapsCondition(this._stradeSnaps),
      condition: this._getStradaIsBeingSnappedCondition(this._stradeSnaps)
    }
  }
  if (toolType=='modifyvertex'){
    options = {
      snap: {
        vectorLayer: giunzioniVectorLayer
      },
      deleteCondition: _.constant(false)
    }
  }
  
  return IternetEditor.prototype.setTool.call(this,toolType,options);
};

proto.stopTool = function(){
  $('body').off('keyup',this._drawRemoveLastPoint);
  $('body').off('keyup',this._modifyRemovePoint);
  
  return IternetEditor.prototype.stopTool.call(this);
};
