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
  
  this.editFeature = function(feature){
    var deferred = $.Deferred();
    console.log("Pronto ad editare gli attributi della feature "+feature);
    deferred.resolve();
    return deferred.promise();
  };
}

module.exports = AttributesEditor
