var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var GUI = require('g3w/gui/gui');
var Editor = require('g3w-editing/editor');
var Form = require('./attributesform');

function IternetEditor(options){
  base(this,options);
  
  // apre form attributi per inserimento
  this._askConfirmToDeleteEditingListener = function(){
    var self = this;
    this.onbeforeasync('deleteFeature',function(feature,isNew,next){
      GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato?",function(result){
        next(result);
      })
    });
  };
  
  // apre form attributi per inserimento
  this._setupAddFeatureAttributesEditingListeners = function(){
    var self = this;
    this.onbeforeasync('addFeature',function(feature,next){
      self._openEditorForm('new',feature,next)
    });
  };
  
  // apre form attributi per editazione
  this._setupEditAttributesListeners = function(){
    var self = this;
    this.onafter('pickFeature',function(feature){
      self._openEditorForm('old',feature)
    });
  };
  
  this._openEditorForm = function(isNew,feature,next){
    var self = this;
    var fid = feature.getId();
    var vectorLayer = this.getVectorLayer();
    var fields = vectorLayer.getFieldsWithAttributes(feature);
    
    // nel caso qualcuno, durante la catena di setterListeners, abbia settato un attributo (solo nel caso di un nuovo inserimento)
    // usato ad esempio nell'editing delle strade, dove viene settato in fase di inserimento/modifica il codice dei campi nod_ini e nod_fin
    var pk = vectorLayer.pk;
    if (pk && _.isNull(this.getField(pk))){
      _.forEach(feature.getProperties(),function(value,attribute){
        var field = self.getField(attribute,fields);
        if(field){
          field.value = value;
        }
      });
    }
    
    var relationsPromise = this.getRelationsWithAttributes(feature);
    relationsPromise
    .then(function(relations){
      var form = new Form({
        name: "Edita attributi "+vectorLayer.name,
        id: "attributes-edit-"+vectorLayer.name,
        dataid: vectorLayer.name,
        pk: vectorLayer.pk,
        isnew: self.isNewFeature(feature.getId()),
        fields: fields,
        relations: relations,
        buttons:[
          {
            title: "Salva",
            class: "btn-danger",
            cbk: function(fields,relations){
              self.setFieldsWithAttributes(feature,fields,relations);
              if (next){
                next(true);
              }
            }
          },
          {
            title: "Cancella",
            class: "btn-primary",
            cbk: function(){
              if (next){
                next(false);
              }
            }
          }
        ]
      });
      GUI.showForm(form,true);
    })
    .fail(function(){
      if (next){
        next(false);
      }
    })
  };
}
inherit(IternetEditor,Editor);
module.exports = IternetEditor;

var proto = IternetEditor.prototype;

proto.start = function(){
  var ret = Editor.prototype.start.call(this);
  this._setupAddFeatureAttributesEditingListeners();
  this._setupEditAttributesListeners();
  this._askConfirmToDeleteEditingListener();
  return ret;
};
