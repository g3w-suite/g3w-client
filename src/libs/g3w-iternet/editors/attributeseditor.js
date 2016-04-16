function AttributesEditor(options){
  this.options = options || {};
  
  this._fields = options.fields || null;
  
  /*
   * Field:
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
  
  this.setForLayer = function(iternetLayer){
    iternetLayer.editor.onbeforeasync('addFeature',function(feature,next){
      var fields = self._layers.accessi.vector.getFieldsWithAttributes();
      var relations = self._layers.accessi.vector.getRelationsAsArray();
      console.log("Prima di aggiungere una nuova feature...");
      var form = new Form({
        name: "Inserisci attributi",
        id: "attributes-edit",
        dataid: "accessi",
        fields: fields,
        relations: relations,
        buttons:[
          {
            title: "Salva",
            class: "btn-danger",
            cbk: function(fields){
              next(true);
            }
          },
          {
            title: "Cancella",
            class: "btn-primary",
            cbk: function(fields){
              next(false);
            }
          }
        ]
      });
      GUI.showForm(form,true);
      /*var attreditor = new(AttributesEditor);
      attreditor.editFeature(feature)
      .done(function(){
        next()
      })
      .fail(function(){
        next(false);
      });*/
    });
  };
}

module.exports = AttributesEditor
