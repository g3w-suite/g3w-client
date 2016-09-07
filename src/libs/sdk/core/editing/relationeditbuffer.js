var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function RelationEditBuffer(editor,relationName){
  this._relationName = relationName;
  this._editor = editor;

  // buffer degli elementi
  this._elementsBuffer = {};
}
inherit(RelationEditBuffer,G3WObject);
module.exports = RelationEditBuffer;

var proto = RelationEditBuffer.prototype;

proto.commit = function(){
  this._clearBuffers();
};

proto.undoAll = function(){
  this._clearBuffers();
};

proto.destroy = function(){
  this._clearBuffers();
};

proto.getRelationName = function(){
  return this._relationName;
};

proto.generateId = function(){
  return this._editor.generateId();
};

proto.getAddedElements = function() {

};

proto.getDeletedElements = function() {

};

proto.getUpdatedElements = function() {

};

proto.updateRelation = function(relation){
  var self = this;
  _.forEach(relation.elements,function(element){
    self._editBuffer(element);
    console.log("Modificata elemento relazione  "+self._relationName +" (ID: "+element.id+" nel buffer");
  })
};

proto._editBuffer = function(element){
  // un elemento con tutti i campi vuoti non lo aggiungo
  var filled = _.some(element.fields,function (field) {
    return !_.isNil(field.value);
  });

  if (!filled) {
    return;
  }

  var id = element.id;

  if (!_.has(this._elementsBuffer,id)){
    this._elementsBuffer[id] = [];
  }

  this._elementsBuffer[id].push(element);
  this._setDirty();
};

// il filtro puÃ² essere 'ALL', 'NEW', 'OLD', 'DELETED'
proto.getRelationElements = function(filter){
  var elements = [];
  _.forEach(this._elementsBuffer,function(elementBuffer){
    var element = elementBuffer.slice(-1)[0];
    if (element || (filter=='ALL')) { // lo prenso solo se non Ã¨ null
      if (!filter || (filter && element.state==filter)) {
        elements.push(element);
      }
    }
  });
  return elements;
};

proto.hasRelationElements = function(){
  var hasEdits = false;
  _.forEach(this._elementsBuffer,function(elementBuffer){
    hasEdits = hasEdits || (elementBuffer.length > 0);
  });
  return hasEdits;
};

proto._setDirty = function(bool){
  this._editor._setDirty(bool);
};

proto._clearBuffers = function(){
  this._elementsBuffer = {};
  this._setDirty(false);
};