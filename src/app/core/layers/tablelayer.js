import {DEFAULT_EDITING_CAPABILITIES} from 'constant';
const {base, inherit} = require('core/utils/utils');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const Layer = require('./layer');
const Editor = require('core/editing/editor');
const FeaturesStore = require('./features/featuresstore');
const Feature = require('./features/feature');

// Base Layer that support editing
function TableLayer(config={}, options={}) {
  const ProjectsRegistry = require('core/project/projectsregistry');
  // setters
  this.setters = {
    // delete all features
    clearFeatures() {
      this._clearFeatures();
    },
    addFeature(feature) {
      this._addFeature(feature);
    },
    deleteFeature(feature) {
      this._deleteFeature(feature);
    },
    updateFeature(feature) {
      this._updateFeature(feature);
    },
    setFeatures(features) {
      this._setFeatures(features);
    },
    // get data from every sources (server, wms, etc..)
    // throught provider related to featuresstore
    getFeatures(options={}) {
      const d = $.Deferred();
      this._featuresstore.getFeatures(options)
        .then(promise => {
          promise.then(features => {
            this.emit('getFeatures', features);
            return d.resolve(features);
          }).fail(err => d.reject(err))
        })
        .fail(err => d.reject(err));
      return d.promise();
    },
    commit(commitItems) {
      const d = $.Deferred();
      this._featuresstore.commit(commitItems)
        .then(promise => {
          promise
            .then(response => {
              response && response.result && this.syncSelectionFilterFeatures(commitItems);
              d.resolve(response)
            })
            .fail(err => d.reject(err))
        })
        .fail((err)  => {
          d.reject(err);
        });
      return d.promise();
    },
    setColor(color) {
      this._setColor(color)
    }
  };
  /*
   * editing url api:
   * /api/vector/<type of request: data/editing/config>/<project_type>/<project_id>/<layer_id>
   * example: /api/vector/config/qdjango/10/points273849503023
   *
  */
  this.type = Layer.LayerTypes.TABLE;
  // color
  this._color = null;
  options.project = options.project || ProjectsRegistry.getCurrentProject();
  this.layerId = config.id;
  // add urls
  config.urls = config.urls || {};
  // add editing configurations
  config.editing = {
    fields: [] // editing fields
  };
  // call base layer
  base(this, config, options);

  // get configuration from server if is editable
  this._editatbleLayer;
  if (this.isEditable()) {
    // add state info for the layer
    this.layerForEditing = new Promise((resolve, reject) => {
      this.getEditingConfig()
        .then(({vector, constraints={}, capabilities=DEFAULT_EDITING_CAPABILITIES}={}) => {
          this.config.editing.fields = vector.fields;
          this.config.editing.format = vector.format;
          this.config.editing.constraints = constraints;
          //set default editing capabilities
          this.config.editing.capabilities = capabilities;
          this.config.editing.style = vector.style;
          this.config.editing.form = {
            perc: null
          };
          this._setOtherConfigParameters(vector);
          vector.style && this.setColor(vector.style.color);
          // create an instance of editor
          this._editor = new Editor({
            layer: this
          });

          resolve(this);
          this.setReady(true);
        })
        .fail(err => {
          reject(this);
          this.setReady(false);
        })
    });
    this.state = {
      ...this.state,
      editing: {
        started: false,
        modified: false,
        ready: false
      }
    };
  }
  this._featuresstore = new FeaturesStore({
    provider: this.providers.data
  });
}

inherit(TableLayer, Layer);

const proto = TableLayer.prototype;

//sync selection
proto.syncSelectionFilterFeatures = function(commitItems){
  try {
    const layer = CatalogLayersStoresRegistry.getLayerById(this.getId());
    layer.isGeoLayer() && commitItems.update.forEach(updateItem =>{
      const {id, geometry} = updateItem;
      layer.getOlSelectionFeature(id) && layer.updateOlSelectionFeature({id,geometry});
    });
    commitItems.delete.forEach(id =>{
      layer.hasSelectionFid(id) && layer.excludeSelectionFid(id);
    })
  } catch(err){}
};

proto.setFormPercentage = function(perc){
  this.config.editing.form.perc = perc;
};

proto.getFormPercentage = function(){
  return this.config.editing.form.perc;
};

proto.clone = function() {
  return _.cloneDeep(this);
};

proto.cloneFeatures = function() {
  return this._featuresstore.clone();
};

proto.setVectorUrl = function(url) {
  this.vectorUrl = url;
};

proto.setProjectType = function(projectType) {
  this.projectType = projectType;
};

proto._setColor = function(color) {
  this._color = color;
};

proto.getColor = function() {
  return this._color;
};

proto.readFeatures = function() {
  return this._featuresstore.readFeatures();
};

// return layer for editing
proto.getLayerForEditing = async function({vectorurl, project_type}={}) {
  vectorurl && this.setVectorUrl(vectorurl);
  project_type && this.setProjectType(project_type);
  this.setEditingUrl();
  const editableLayer = this.clone();
  try {
    return await editableLayer.layerForEditing;
  } catch(err) {
    return err
  }
};

proto.getEditingSource = function() {
  return this._editor.getEditingSource();
};

proto.readEditingFeatures = function() {
  return this._editor.readEditingFeatures();
};

proto.getEditingLayer = function() {
  return this;
};

//check if is editingLayer useful to get editingstyle
proto.isEditingLayer = function(){
  return !!this.config.editing
};

proto.getEditingStyle = function() {
  return this.config.editing.style;
};

proto.setEditingStyle = function(style={}) {
  this.config.editing.style = style;
};

proto.getEditingConstrains = function() {
  return this.config.editing.constraints;
};

proto.getEditingCapabilities = function(){
  return this.config.editing.capabilities;
};

proto.isFieldRequired = function(fieldName) {
  let required = false;
  this.getEditingFields().forEach(field => {
    if (fieldName === field.name) {
      required = !!field.validate.required;
      return false;
    }
  });
  return required;
};

// unlock editng features
proto.unlock = function() {
  const d = $.Deferred();
  this._featuresstore.unlock()
    .then(() => d.resolve())
    .fail(err => d.reject(err));
  return d.promise();
};

proto._setOtherConfigParameters = function(config) {
  // overwrite by vector layer
};

// return layer fields
proto.getEditingFields = function(editable=false) {
  let fields = this.config.editing.fields.length ? this.config.editing.fields: this.config.fields;
  if (editable) fields = fields.filter(field => field.editable);
  return fields;
};

proto.isPkField = function(field){
  const find_field = this.getEditingFields().find(_field => _field.name === field);
  return find_field && find_field.pk;
};

proto.isEditingFieldEditable = function(field) {
  const find_field = this.getEditingFields().find(_field => _field.name === field);
  return find_field ? find_field.editable : false;
};

proto.getEditingNotEditableFields = function() {
  return this.config.editing.fields.filter(field => !field.editable).map(field => field.name);
};

proto.getEditingMediaFields = function(options=null){
  return this.config.editing.fields.filter(field => field.input.type === 'media').map(field => field.name);
};

proto.getFieldsLabel = function() {
  const labels = [];
  this.getEditingFields().forEach(field => labels.push(field.label));
  return labels;
};

proto.getDataFormat = function() {
  return this.config.editing.format;
};

// raw data
proto.getEditingFormat = function() {
  return this.config.editing.format;
};

proto.isReady = function() {
  return this.state.editing.ready;
};

proto.setReady = function(bool=false) {
  this.state.editing.ready = bool;
};

// get configuration from server
proto.getEditingConfig = function(options={}) {
  const d = $.Deferred();
  const provider = this.getProvider('data');
  provider.getConfig(options)
    .then(config => d.resolve(config))
    .fail(err => d.reject(err));
  return d.promise();
};

proto.addEditingConfigFieldOption = function({field, key, value} = {}) {
  const options = field.input.options;
  options[key] = value;
  return options[key];
};

proto.getWidgetData = function(options) {
  const provider = this.getProvider('data');
  const d = $.Deferred();
  provider.getWidgetData(options)
    .then(response => d.resolve(response))
    .fail(err => d.reject(err));
  return d.promise()
};

proto.getCommitUrl = function() {
  return this.config.urls.commit;
};

proto.setCommitUrl = function(url) {
  this.config.urls.commit = url;
};

proto.getEditingUrl = function() {
  return this.config.urls.editing;
};

proto.getUnlockUrl = function() {
  return this.config.url.unlock;
};

proto.setUnlockUrl = function(url) {
  this.config.urls.unlock = url;
};

proto.getWidgetUrl = function() {
  return this.config.urls.widget;
};

// set data url
proto.setDataUrl = function(url) {
  this.config.urls.data = url;
};

proto.getDataUrl = function() {
  return this.config.urls.data;
};

// url to get config layer
proto.getConfigUrl = function() {
  return this.config.urls.config;
};

proto.setConfigUrl = function(url) {
  this.config.urls.index = url;
};

proto.getEditor = function() {
  return this._editor;
};

proto.isStarted = function(){
  return this.getEditor().isStarted()
};

proto.setEditor = function(editor) {
  this._editor = editor;
};

proto.getFeaturesStore = function() {
  return this._featuresstore;
};

proto.setFeaturesStore = function(featuresstore) {
  this._featuresstore = featuresstore;
};

proto.setSource = function(source) {
  this.setFeaturesStore(source);
};

proto.getSource = function() {
  return this._featuresstore;
};

// get editing style
proto.getEditingStyle = function(){
  return this.config.editing.style;
};

proto._setFeatures = function(features) {
  this._featuresstore.setFeatures(features);
};

proto.addFeatures = function(features) {
  features.forEach(feature => this.addFeature(feature));
};

proto._addFeature = function(feature) {
  this._featuresstore.addFeature(feature);
};

proto._deleteFeature = function(feature) {
  return feature.getId();
};

proto._updateFeature = function(feature) {};

proto._clearFeatures = function() {
  this._featuresstore.clearFeatures();
};

proto.addLockIds = function(lockIds) {
  this._featuresstore.addLockIds(lockIds);
};

proto.setFieldsWithValues = function(feature, fields) {
  const createAttributesFromFields = fields => {
    const attributes = {};
    fields.forEach(field => {
      if (field.type === 'child') {
        attributes[field.name] = createAttributesFromFields(field.fields);
      } else if (field.value === 'null') {
        field.value = null;
      }
      attributes[field.name] = field.value;
    });
    return attributes;
  };
  const attributes = createAttributesFromFields(fields);
  feature.setProperties(attributes);
  return attributes;
};

proto.getFieldsWithValues = function(obj, options = {}) {

  const {
    exclude = [],
    get_default_value = true
  }  = options;

  let fields = JSON.parse(JSON.stringify(this.getEditingFields()));
  let feature;

  if (obj instanceof Feature) {
    feature = obj;
  } else if (obj instanceof ol.Feature) {
    feature = new Feature({ feature: obj });
  } else if (obj) {
    feature = this.getFeatureById(obj);
  } else {
    return fields;
  }

  const attributes = feature.getProperties();

  fields.forEach(field => {

    field.value = attributes[field.name];

    // store original value
    field._value = attributes[field.name];

    // at beginning set update false. Used to form
    field.update = false;

    if (field.input) {
      const options = this.getEditingFields().find(_field => _field.name === field.name).input.options;
      field.input.options.loading = options.loading || { state: null };
      field.input.options.values = options.values;
    }

    // exclude contain field to set visible false
    field.visible = exclude.indexOf(field.name) === -1;

    // for editing purpose
    if (undefined === field.validate) {
      field.validate = {};
    }

    field.forceNull = false;

    field.validate.valid = true;

    //useful to get previous value in certain case
    field.validate._valid = true;

    // need to be check if default value is set by server configuration field
    field.value_from_default_value = false;

    // specify if need to get value from form field.input.options.default value in case of missing value of field.value
    field.get_default_value = get_default_value;

    field.validate.unique = field.validate.unique || false;

    // for validate.unique purpose to check is new value iserted or change need to be di
    field.validate.exclude_values = new Set();

    field.validate.required = field.validate.required || false;

    field.validate.mutually_valid = true;

    field.validate.empty = !field.validate.required;

    field.validate.message = null;

  });

  return fields;
};

proto.createNewFeature = function() {
  let feature = new ol.Feature();
  const properties = {};
  this.getEditingFields().forEach(field => properties[field.name] = null);
  feature.setProperties(properties);
  feature = new Feature({
    feature
  });
  feature.setNew();
  return feature;
};


module.exports = TableLayer;
