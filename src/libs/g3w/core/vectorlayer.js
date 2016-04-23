var inherit = require('g3w/core/utils').inherit;
var truefnc = require('g3w/core/utils').truefnc;
var resolvedValue = require('g3w/core/utils').resolvedValue;
var rejectedValue = require('g3w/core/utils').rejectedValue;
var G3WObject = require('g3w/core/g3wobject');

function VectorLayer(options){
  var options = options || {};
  this.geometrytype = options.geometrytype || null;
  this.format = options.format || null;
  this.crs = options.crs  || null;
  this.id = options.id || null;
  this.name = options.name || "";
  this.pk = options.pk || "id"; // TODO: il GeoJSON setta l'id della feature da sé, e nasconde il campo PK dalle properties. In altri formati va verificato, e casomai usare feature.setId()
  
  this._olSource = new ol.source.Vector({
    features: new ol.Collection()
  });
  this._olLayer = new ol.layer.Vector({
    name: this.name,
    source: this._olSource
  });
  
  /*
   * Array di oggetti:
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
  this._PKinAttributes = false;
  this._featuresFilter = null;
  this._fields = null
  this.lazyRelations = true;
  this._relations = null;
}
inherit(VectorLayer,G3WObject);
module.exports = VectorLayer;

var proto = VectorLayer.prototype;

proto.setData = function(featuresData){
  var self = this;
  var features;
  if (this.format) {
    switch (this.format){
      case "GeoJSON":
        var geojson = new ol.format.GeoJSON({
          defaultDataProjection: this.crs,
          geometryName: "geometry"
        });
        features = geojson.readFeatures(featuresData);
        break;
    }
    
    if (features && features.length) {
      if (!_.isNull(this._featuresFilter)){
        var features = _.map(features,function(feature){
          return self._featuresFilter(feature);
        });
      }
      
      var alreadyLoadedIds = this.getFeatureIds();
      var featuresToLoad = _.filter(features,function(feature){
        return !_.includes(alreadyLoadedIds,feature.getId());
      })
      
      this._olSource.addFeatures(featuresToLoad);
      
      // verifico, prendendo la prima feature, se la PK è presente o meno tra gli attributi
      var attributes = this.getSource().getFeatures()[0].getProperties();
      this._PKinAttributes = _.get(attributes,this.pk) ? true : false;
    }
  }
  else {
    console.log("VectorLayer format not defined");
  }
};

proto.setFeaturesFilter = function(featuresFilter){
  this._featuresFilter = featuresFilter;
};

proto.setFields = function(fields){
  this._fields = fields;
};

proto.setPkField = function(){
  var self = this;
  var pkfieldSet = false;
  _.forEach(this._fields,function(field){
    if (field.name == self.pk ){
      pkfieldSet = true;
    }
  });
  
  if (!pkfieldSet){
    this._fields
  }
};

proto.getFeatureIds = function(){
  var featureIds = _.map(this.getSource().getFeatures(),function(feature){
    return feature.getId();
  })
  return featureIds
};

proto.getFields = function(){
  return _.cloneDeep(this._fields);
};

proto.getFieldsWithAttributes = function(fid){
  var self = this;
  /*var fields = _.cloneDeep(_.filter(this._fields,function(field){
    return ((field.name != self.pk) && field.editable);
  }));*/
  var fields = _.cloneDeep(this._fields);
  
  var feature, attributes;
  if (fid){
    feature = this.getSource().getFeatureById(fid);
    attributes = feature.getProperties();
  }
  
  _.forEach(fields,function(field){
    if (feature){
      if (!this._PKinAttributes && field.name == self.pk){
        field.value = fid;
      }
      else{
        field.value = attributes[field.name];
      }
    }
    else{
      field.value = null;
    }
  });
  return fields;
};

proto.setRelations = function(relations){
  _.forEach(relations,function(relation,relationKey){
    relation.name = relationKey;
  });
  this._relations = relations;
};

proto.getRelations = function(){
  return this._relations;
};

proto.getRelationsWithAttributes = function(fid){
  var relations = _.cloneDeep(this._relations);
  var self = this;
  if (!fid){
    _.forEach(relations,function(relation,relationKey){
        // inizialmente setto a null i valori
      _.forEach(relation.fields,function(field){
        field.value = null;
      })
    });
    return resolvedValue(relations);
  }
  else {
    if (this.lazyRelations){
      var deferred = $.Deferred();
      var relationsRequests = [];
      var attributes = this.getFeatureById(fid).getProperties();
      _.forEach(relations,function(relation,relationKey){
        var url = relation.url;
        var keyVals = [];
        _.forEach(relation.fk,function(fkKey){
          var fkValue = attributes[fkKey];
          keyVals.push(fkKey+"="+fkValue);
        });
        var fkParams = _.join(keyVals,"&");
        url += "?"+fkParams;
        relationsRequests.push($.get(url)
          .then(function(relationAttributes){
            _.forEach(relation.fields,function(field){
              field.value = relationAttributes[0][field.name];
            });
          })
        )
      })
      
      $.when.apply(this,relationsRequests)
      .then(function(){
        deferred.resolve(relations);
      })
      .fail(function(){
        deferred.reject();
      });
      return deferred.promise();
    }
  }
};

proto.setStyle = function(style){
  this._olLayer.setStyle(style);
};

proto.getLayer = function(){
  return this._olLayer;
};

proto.getSource = function(){
  return this._olLayer.getSource();
};

proto.getFeatureById = function(id){
  return this._olLayer.getSource().getFeatureById(id);
};

proto.addToMap = function(map){
  map.addLayer(this._olLayer);
};
