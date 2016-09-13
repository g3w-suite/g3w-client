var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

// Oggetto RelationEditBuffer
// Utilizzato dall'editor per tenere traccia delle modifiche alle relazioni
// legate alla particolare feature del layer in editing in quel momento
function RelationEditBuffer(editor, relationName) {
  // i due parametry sono l'editor buffer a cui si lega la relazione/i
  //il nome della relazione che non è altro che il nome del layer legato al
  // layer che stiamo editando
  this._relationName = relationName;
  this._editor = editor;
  // buffer degli elementi
  this._elementsBuffer = {};
}
inherit(RelationEditBuffer, G3WObject);

module.exports = RelationEditBuffer;

var proto = RelationEditBuffer.prototype;
// clear Buffer
proto.commit = function() {
  this._clearBuffers();
};
// undoAll Relation
proto.undoAll = function(){
  this._clearBuffers();
};
// distrugge tutte le relaioni
proto.destroy = function(){
  this._clearBuffers();
};
//restituisce il nome della relazione
proto.getRelationName = function() {
  return this._relationName;
};
// generare id della relazione (utile quando si crea una nuova relazione)
proto.generateId = function(){
  return this._editor.generateId();
};

proto.getAddedElements = function() {

};

proto.getDeletedElements = function() {

};

proto.getUpdatedElements = function() {

};
//metodo che fa l'aggiornamento della relazione
proto.updateRelation = function(relation) {
  var self = this;
  // ciclo sugli emeneti della relazione
  _.forEach(relation.elements, function(element) {
    //chiama l'aggiornamento dell'elemento nel buffer
    self._editBuffer(element);
    console.log("Modificata elemento relazione  "+self._relationName +" (ID: "+element.id+" nel buffer");
  })
};
// Modifica elemento nel buffer
proto._editBuffer = function(element) {
  // un elemento con tutti i campi vuoti non lo aggiungo
  var filled = _.some(element.fields, function (field) {
    // verifica se il valore è nullo o undefined
    return !_.isNil(field.value);
  });
  // se sono tutti vuoti
  if (!filled) {
    return;
  }
  // estraggo l'id dell'elemento
  var id = element.id;
  // verifico se esiste già tra le chiavi del buffer degli elementi
  if (!_.has(this._elementsBuffer, id)) {
    // se non esiste come nel caso del buffere delle feature creo l'array associandolo
    // alla chiave id dell'elemento
    this._elementsBuffer[id] = [];
  }
  // aggiungo all'array delle modifiche dell'elelemento
  this._elementsBuffer[id].push(element);
  // richiamo la funzione SetDirty
  this._setDirty(true);
};

// il filtro può essere 'ALL', 'NEW', 'OLD', 'DELETED'
proto.getRelationElements = function(filter, onlyfieldsvalues) {
  var elements = [];
  _.forEach(this._elementsBuffer, function(elementBuffer) {
    // element buffer sono gli arry ( e quindi le modifche) di ogni elemento della
    // relazione
    var element = elementBuffer.slice(-1)[0];
    if (element || (filter=='ALL')) { // lo prenso solo se non Ã¨ null
      if (!filter || (filter && element.state==filter)) {

        if(onlyfieldsvalues) {
          element = _.cloneDeep(element);
          element.fields = _.map(element.fields,function(field){
            return {
              name: field.name,
              value: field.value
            }
          })
        }

        elements.push(element);
      }
    }
  });
  return elements;
};

proto.getRelationElementsOnlyFieldsValues = function(filter) {
  return this.getRelationElements(filter,true);
};

// funzione ha elementi
proto.hasRelationElements = function(){
  var hasEdits = false;
  _.forEach(this._elementsBuffer, function(elementBuffer) {
    hasEdits = hasEdits || (elementBuffer.length > 0);
  });
  return hasEdits;
};
// la funzione setDirty server per far scatenre la funzione
// _setDirtu dall 'editor delle relazioni (qui) all'editor buffer all' editor
proto._setDirty = function(bool) {
  this._editor._setDirty(bool);
};
// non fa altro che risettare gli elements buffer a oggetto vuoto
// e settare _setDirty a false
proto._clearBuffers = function(){
  this._elementsBuffer = {};
  this._setDirty(false);
};