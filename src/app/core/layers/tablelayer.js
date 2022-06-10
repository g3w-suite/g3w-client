import {DEFAULT_EDITING_CAPABILITIES} from 'constant';
import ProjectsRegistry  from 'core/project/projectsregistry';
import CatalogLayersStoresRegistry  from 'core/catalog/cataloglayersstoresregistry';
import Layer  from './layer';
import Editor  from 'core/editing/editor';
import FeaturesStore  from './features/featuresstore';
import Feature  from './features/feature';
import {Feature as OLFeature} from "ol/Feature";

// Base Layer that support editing
class TableLayer extends Layer {
  constructor(config = {}, options = {}) {
    super({
      setters: {
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
        getFeatures(options = {}) {
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
            .fail((err) => {
              d.reject(err);
            });
          return d.promise();
        },
        setColor(color) {
          this._setColor(color)
        }
      }
    });
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
            // creare an instance of editor
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
      this.state = _.merge({
        editing: {
          started: false,
          modified: false,
          ready: false
        }
      }, this.state);

    }
    this._featuresstore = new FeaturesStore({
      provider: this.providers.data
    });
  }

  //sync selection
  syncSelectionFilterFeatures(commitItems){
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

  setFormPercentage(perc){
    this.config.editing.form.perc = perc;
  };

  getFormPercentage(){
    return this.config.editing.form.perc;
  };

  clone() {
    return _.cloneDeep(this);
  };

  cloneFeatures() {
    return this._featuresstore.clone();
  };

  setVectorUrl(url) {
    this.vectorUrl = url;
  };

  setProjectType(projectType) {
    this.projectType = projectType;
  };

  _setColor(color) {
    this._color = color;
  };

  getColor() {
    return this._color;
  };

  readFeatures() {
    return this._featuresstore.readFeatures();
  };

// return layer for editing
  getLayerForEditing = async function({vectorurl, project_type}={}) {
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

  getEditingSource() {
    return this._editor.getEditingSource();
  };

  readEditingFeatures() {
    return this._editor.readEditingFeatures();
  };

  getEditingLayer() {
    return this;
  };

//check if is editingLayer useful to get editingstyle
  isEditingLayer(){
    return !!this.config.editing
  };

  getEditingStyle() {
    return this.config.editing.style;
  };

  setEditingStyle(style={}) {
    this.config.editing.style = style;
  };

  getEditingConstrains() {
    return this.config.editing.constraints;
  };

  getEditingCapabilities(){
    return this.config.editing.capabilities;
  };

  isFieldRequired(fieldName) {
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
  unlock() {
    const d = $.Deferred();
    this._featuresstore.unlock()
      .then(() => d.resolve())
      .fail(err => d.reject(err));
    return d.promise();
  };

  _setOtherConfigParameters(config) {
    // overwrite by vector layer
  };

// return layer fields
  getEditingFields(editable=false) {
    let fields = this.config.editing.fields.length ? this.config.editing.fields: this.config.fields;
    if (editable) fields = fields.filter(field => field.editable);
    return fields;
  };

  isPkField(field){
    const find_field = this.getEditingFields().find(_field => _field.name === field);
    return find_field && find_field.pk;
  };

  isEditingFieldEditable(field) {
    const find_field = this.getEditingFields().find(_field => _field.name === field);
    return find_field ? find_field.editable : false;
  };

  getEditingNotEditableFields() {
    return this.config.editing.fields.filter(field => !field.editable).map(field => field.name);
  };

  getEditingMediaFields(options=null){
    return this.config.editing.fields.filter(field => field.input.type === 'media').map(field => field.name);
  };

  getFieldsLabel() {
    const labels = [];
    this.getEditingFields().forEach(field => labels.push(field.label));
    return labels;
  };

  getDataFormat() {
    return this.config.editing.format;
  };

// raw data
  getEditingFormat() {
    return this.config.editing.format;
  };

  isReady() {
    return this.state.editing.ready;
  };

  setReady(bool=false) {
    this.state.editing.ready = bool;
  };

// get configuration from server
  getEditingConfig(options={}) {
    const d = $.Deferred();
    const provider = this.getProvider('data');
    provider.getConfig(options)
      .then(config => d.resolve(config))
      .fail(err => d.reject(err));
    return d.promise();
  };

  addEditingConfigFieldOption({field, key, value} = {}) {
    const options = field.input.options;
    options[key] = value;
    return options[key];
  };

  getWidgetData(options) {
    const provider = this.getProvider('data');
    const d = $.Deferred();
    provider.getWidgetData(options)
      .then(response => d.resolve(response))
      .fail(err => d.reject(err));
    return d.promise()
  };

  getCommitUrl() {
    return this.config.urls.commit;
  };

  setCommitUrl(url) {
    this.config.urls.commit = url;
  };

  getEditingUrl() {
    return this.config.urls.editing;
  };

  getUnlockUrl() {
    return this.config.url.unlock;
  };

  setUnlockUrl(url) {
    this.config.urls.unlock = url;
  };

  getWidgetUrl() {
    return this.config.urls.widget;
  };

// set data url
  setDataUrl(url) {
    this.config.urls.data = url;
  };

  getDataUrl() {
    return this.config.urls.data;
  };

// url to get config layer
  getConfigUrl() {
    return this.config.urls.config;
  };

  setConfigUrl(url) {
    this.config.urls.index = url;
  };

  getEditor() {
    return this._editor;
  };

  isStarted(){
    return this.getEditor().isStarted()
  };

  setEditor(editor) {
    this._editor = editor;
  };

  getFeaturesStore() {
    return this._featuresstore;
  };

  setFeaturesStore(featuresstore) {
    this._featuresstore = featuresstore;
  };

  setSource(source) {
    this.setFeaturesStore(source);
  };

  getSource() {
    return this._featuresstore;
  };

// get editing style
  getEditingStyle(){
    return this.config.editing.style;
  };

  _setFeatures(features) {
    this._featuresstore.setFeatures(features);
  };

  addFeatures(features) {
    features.forEach(feature => this.addFeature(feature));
  };

  _addFeature(feature) {
    this._featuresstore.addFeature(feature);
  };

  _deleteFeature(feature) {
    return feature.getId();
  };

  _updateFeature(feature) {};

  _clearFeatures() {
    this._featuresstore.clearFeatures();
  };

  addLockIds(lockIds) {
    this._featuresstore.addLockIds(lockIds);
  };

  setFieldsWithValues(feature, fields) {
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

  getFieldsWithValues(obj, options={}) {
    const exclude = options.exclude || [];
    let fields = JSON.parse(JSON.stringify(this.getEditingFields()));
    let feature;
    if (obj instanceof Feature) feature = obj;
    else if (obj instanceof OLFeature) feature = new Feature({
      feature: obj
    });
    else feature = obj && this.getFeatureById(obj);
    if (feature) {
      const attributes = feature.getProperties();
      fields = fields.filter(field => exclude.indexOf(field.name) === -1);
      fields.forEach(field => {
        field.value = attributes[field.name];
        if (field.type !== 'child' && field.input && field.input.type === 'select_autocomplete' && !field.input.options.usecompleter) {
          const _configField = this.getEditingFields().find(_field => _field.name === field.name);
          const options = _configField.input.options;
          field.input.options.loading = options.loading;
          field.input.options.values = options.values;
        }
        // for editing purpose
        if (field.validate === undefined) field.validate = {};
        field.forceNull = false;
        field.validate.valid = true;
        field.validate._valid = true; //useful to get previous value in certain case
        field.validate.unique = true;
        field.validate.required = field.validate.required === undefined ? false : field.validate.required;
        field.validate.mutually_valid = true;
        field.validate.empty = !field.validate.required;
        field.validate.message = null;
        // end editing purpose
      });
    }
    return fields;
  };

  createNewFeature() {
    let feature = new OLFeature();
    const properties = {};
    this.getEditingFields().forEach(field => properties[field.name] = null);
    feature.setProperties(properties);
    feature = new Feature({
      feature
    });
    feature.setNew();
    return feature;
  };


}




export default  TableLayer;
