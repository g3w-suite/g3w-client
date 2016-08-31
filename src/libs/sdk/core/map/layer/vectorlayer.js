var inherit = require('core/utils/utils').inherit;
var truefnc = require('core/utils/utils').truefnc;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var G3WObject = require('core/g3wobject');

function VectorLayer(config){
  var config = config || {};
  this.geometrytype = config.geometrytype || null;
  this.format = config.format || null;
  this.crs = config.crs  || null;
  this.id = config.id || null;
  this.name = config.name || "";
  this.pk = config.pk || "id"; // TODO: il GeoJSON setta l'id della feature da sé, e nasconde il campo PK dalle properties. In altri formati va verificato, e casomai usare feature.setId()
  
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

proto.setFeatureData = function(oldfid,fid,geometry,attributes){
  var feature = this.getFeatureById(oldfid);
  if (fid){
    feature.setId(fid);
  }
  
  if (geometry){
    feature.setGeometry(geometry);
  }
  
  if (attributes){
    var oldAttributes = feature.getProperties();
    var newAttributes =_.assign(oldAttributes,attributes);
    feature.setProperties(newAttributes);
  }
  
  return feature;
};

proto.addFeatures = function(features){
  this.getSource().addFeatures(features);
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

proto.getFeatures = function(){
  return this.getSource().getFeatures();
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

proto.getFieldsNames = function(){
  return _.map(this._fields,function(field){
    return field.name;
  });
};

proto.getFieldsWithValues = function(obj){
  var self = this;
  /*var fields = _.cloneDeep(_.filter(this._fields,function(field){
    return ((field.name != self.pk) && field.editable);
  }));*/
  var fields = _.cloneDeep(this._fields);
  
  var feature, attributes;
  
  // il metodo accetta sia feature che fid
  if (obj instanceof ol.Feature){
    feature = obj;
  }
  else if (obj){
    feature = this.getFeatureById(obj);
  }
  if (feature){
    attributes = feature.getProperties();
  }
  
  _.forEach(fields,function(field){
    if (feature){
      if (!this._PKinAttributes && field.name == self.pk){
        field.value = feature.getId();
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
  this._relations = relations;
  _.forEach(relations,function(relation){
    _.forEach(relation.fields,function(field,idx){
      if (field.name == relation.pk) {
        relation.pkFieldIndex = idx
      }
    })
  })
};

proto.getRelations = function(){
  return this._relations;
};

proto.getRelation = function(relationName) {
  var relation;
  _.forEach(this._relations,function(_relation){
    if (_relation.name == relationName) {
      relation = _relation;
    }
  })
  return relation;
};

proto.hasRelations = function(){
  return !_.isNull(this._relations);
};

proto.getRelationPkFieldIndex = function(relation) {
  var pkFieldIndex;
  _.forEach(relation.fields,function(field,idx){
    if (field.name == relation.pk) {
      pkFieldIndex = idx;
    }
  })
  return pkFieldIndex;
};

proto.getRelationElementPkValue = function(relation,element) {
  var pkFieldIndex = this.getRelationPkFieldIndex(relation);
  return element.fields[pkFieldIndex].value;
};

proto.getRelationsFksKeys = function(){
  var fks = [];
  _.forEach(this._relations,function(relation){
    fks.push(relation.fk);
  })
  return fks;
};

proto.getRelationFields = function(relation) {
  return relation.fields;
};

proto.getRelationFieldsNames = function(relation){
  return _.map(relationFields,function(field){
    return field.name;
  });
};

// ottengo le relazioni a partire dal fid di una feature esistente
proto.getRelationsWithValues = function(fid){
  if (!this._relations) {
    resolve([]);
  }
  var relations = _.cloneDeep(this._relations);
  var self = this;
  if (!fid || !this.getFeatureById(fid)){
    _.forEach(relations,function(relation){
      relation.elements = [];
    });
    return resolve(relations);
  }
  else {
    if (this.lazyRelations){
      var deferred = $.Deferred();
      var attributes = this.getFeatureById(fid).getProperties();
      var fks = {};
      _.forEach(relations,function(relation){
        var keyVals = [];
        _.forEach(relation.fk,function(fkKey){
          fks[fkKey] = attributes[fkKey];
        });
      })
      
      this.getRelationsWithValuesFromFks(fks)
      .then(function(relationsResponse){
        deferred.resolve(relationsResponse);
      })
      .fail(function(){
        deferred.reject();
      });
      return deferred.promise();
    }
  }
};

// ottengo le relazioni valorizzate a partire da un oggetto con le chiavi FK come keys e i loro valori come values
proto.getRelationsWithValuesFromFks = function(fks){
  var self = this;
  var relations = _.cloneDeep(this._relations);
  var relationsRequests = [];

  _.forEach(relations,function(relation){
    relation.elements = []; // creo la proprietà che accoglierà gli elementi della relazione
    var url = relation.url;
    var keyVals = [];
    _.forEach(relation.fk,function(fkKey){
      var fkValue = fks[fkKey];
      keyVals.push(fkKey+"="+fkValue);
    });
    var fkParams = _.join(keyVals,"&");
    url += "?"+fkParams;
    relationsRequests.push($.get(url)
      .then(function(relationsElements){
        if (relationsElements.length) {
          _.forEach(relationsElements,function(relationElement){
            var element = {};
            element.fields = _.cloneDeep(relation.fields);
            _.forEach(element.fields,function(field){
              field.value = relationElement[field.name];
              if (field.name == relation.pk) {
                element.id = field.value // aggiungo element.id dandogli il valore della chiave primaria della relazione
              }
            });
            
            relation.elements.push(element);
          })
        }
      })
    )
  })
  
  return $.when.apply(this,relationsRequests)
  .then(function(){
    return relations;
  });
}

proto.setStyle = function(style){
  this._olLayer.setStyle(style);
};

proto.getMapLayer = function(){
  return this._olLayer;
};

proto.getSource = function(){
  return this._olLayer.getSource();
};

proto.getFeatureById = function(id){
  return this._olLayer.getSource().getFeatureById(id);
};

proto.clear = function(){
  this.getSource().clear();
};

proto.addToMap = function(map){
  map.addLayer(this._olLayer);
};

// data una feature verifico se ha tra gli attributi i valori delle FK delle (eventuali) relazioni
proto.featureHasRelationsFksWithValues = function(feature){
  var attributes = feature.getProperties();
  var fksKeys = this.getRelationsFksKeys();
  return _.every(fksKeys,function(fkKey){
    var value = attributes[fkKey];
    return (!_.isNil(value) && value != '');
  })
};

// data una feature popolo un oggetto con chiavi/valori delle FK delle (eventuali) relazione
proto.getRelationsFksWithValuesForFeature = function(feature){
  var attributes = feature.getProperties();
  var fks = {};
  var fksKeys = this.getRelationsFksKeys();
  _.forEach(fksKeys,function(fkKey){
    fks[fkKey] = attributes[fkKey];
  })
  return fks;
};
