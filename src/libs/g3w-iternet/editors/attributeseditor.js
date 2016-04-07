function AttributesEditor(options){
  this.options = options || {};
  
  this.editFeature = function(feature){
    var deferred = $.Deferred();
    console.log("Pronto ad editare gli attributi della feature "+feature);
    deferred.resolve();
    return deferred.promise();
  };
}

module.exports = AttributesEditor
