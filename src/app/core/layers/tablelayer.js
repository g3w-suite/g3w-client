import { TIMEOUT }                      from "constant";
import CatalogLayersStoresRegistry      from 'store/catalog-layers';
import ProjectsRegistry                 from 'store/projects';
import { waitFor }                      from 'utils/waitFor';

const Layer                             = require('core/layers/layer');
const FeaturesStore                     = require('core/layers/features/featuresstore');
const Feature                           = require('core/layers/features/feature');

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

function _createAttributesFromFields(fields) {
  const attributes = {};
  fields.forEach(field => {
    if ('child' === field.type) {
      attributes[field.name] = _createAttributesFromFields(field.fields);
    } else if ('null' === field.value) {
      field.value = null;
    }
    attributes[field.name] = field.value;
  });
  return attributes;
}

/**
 * Base Layer that support editing
 */
module.exports = class TableLayer extends Layer {
  
  constructor(config = {}, options = {}) {

    super(config, options);

    /**
     * Hook setters methods
     */
    this.setters = {

      clearFeatures()        { this._featuresstore.clearFeatures(); },
      addFeature(feature)    { this._featuresstore.addFeature(feature); },
      deleteFeature(feature) { return feature.getId(); },
      updateFeature()        {},
      setFeatures(features)  { this._featuresstore.setFeatures(features); },
      setColor(color)        { this._color = color; },

      /**
       * get data from every sources (server, wms, etc..)
       * through provider related to featuresstore
       *
       * @param {*} options
       */
      getFeatures(options = {}) {
        const d = $.Deferred();
        this._featuresstore
          .getFeatures(options)
          .then(promise => {
            promise
              .then(features => {
                this.emit('getFeatures', features);
                return d.resolve(features);
              })
              .fail(d.reject)
          })
          .fail(d.reject);

        return d.promise();
      },

      commit(commitItems) {
        const d = $.Deferred();
        this._featuresstore
          .commit(commitItems)
          .then(promise => {
            promise
              .then(response => {
                if(response) {
                  response.result && this.syncSelectionFilterFeatures(commitItems);
                }
                d.resolve(response)
              })
              .fail(d.reject)
          })
          .fail(d.reject);
        return d.promise();
      },

    };

    /**
     * EDITING API URL: /api/vector/<type of request: data/editing/config>/<project_type>/<project_id>/<layer_id>
     *
     * @example /api/vector/config/qdjango/10/points273849503023
     */
    this.type = Layer.LayerTypes.TABLE;

    /**
     * color
     */
    this._color = null;

    options.project = options.project || ProjectsRegistry.getCurrentProject();

    /**
     * @FIXME add description
     */
    this.layerId = config.id;

    /**
     * add urls
     */
    config.urls = config.urls || {};

    /**
     * add editing configurations
     */
    config.editing = {
      fields: [] // editing fields
    };

    /**
     * @FIXME set a default value
     *
     * get configuration from server if is editable
     */
    this._editatbleLayer;

    const is_editable = this.isEditable();

    // editable layer -- > update layer config info
    if (is_editable) {
      this.layerForEditing = new Promise((resolve, reject) => {
        this
          .getEditingConfig()                                // get editing layer config
          .then(async ({
            vector,
            constraints = {},
            capabilities,
          } = {}) => {
            await waitFor(() => window.g3wsdk.core.hasOwnProperty('editing'), TIMEOUT);    // wait unitil "editing" plugin is loaded
            Object.assign(this.config.editing, {
              fields: vector.fields,
              format: vector.format,
              constraints,
              capabilities: capabilities || window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES, // default editing capabilities
              form: { perc: null },                                                              // set editing form `perc` to null at beginning
              style: vector.style,                                                               // get vector layer style
              geometrytype: vector.geometrytype                                                  // whether is a vector layer
            })
            if (vector.style) {                              // set vector layer color 
              this.setColor(vector.style.color);
            }
            this._editor = new window.g3wsdk.core.editing.Editor({ layer: this }); // create an instance of editor
            resolve(this);
            this.setReady(true);                             // set ready
          })
          .fail(e => {
            console.warn(e);
            reject(this);
            this.setReady(false);
          })
      });
    }

    // editable layer --> add editing state info
    if (is_editable) {
      this.state = {
        ...this.state,
        editing: {
          started: false,
          modified: false,
          ready: false
        }
      };
    }

    /**
     * Feature wrapper (to store feature)
     */
    this._featuresstore = new FeaturesStore({ provider: this.providers.data });

  }

  /**
   * sync selection
   *
   * @param {*} commitItems
   */
  syncSelectionFilterFeatures(commitItems) {
    try {
      const layer = CatalogLayersStoresRegistry.getLayerById(this.getId());
      //if layer has geometry
      if (layer.isGeoLayer()) {
        commitItems.update.forEach(({ id, geometry } = {}) => {
          if (layer.getOlSelectionFeature(id)) {
            layer.updateOlSelectionFeature({id, geometry});
          }
        });
      }
      commitItems.delete.forEach(id => {
        if (layer.hasSelectionFid(id)) {
          layer.excludeSelectionFid(id);
        }
      })
    } catch(err) {}
  }

  setFormPercentage(perc) {
    this.config.editing.form.perc = perc;
  }

  getFormPercentage() {
    return this.config.editing.form.perc;
  }

  clone() {
    return _cloneDeep(this);
  }

  cloneFeatures() {
    return this._featuresstore.clone();
  }

  setVectorUrl(url) {
    this.vectorUrl = url;
  }

  setProjectType(projectType) {
    this.projectType = projectType;
  }

  getColor() {
    return this._color;
  }

  readFeatures() {
    return this._featuresstore.readFeatures();
  }

  /**
   * Get editing layer
   *
   * @param vectorurl
   * @param project_type
   *
   * @returns { Promise }
   */
  async getLayerForEditing({
    vectorurl,
    project_type
  } = {}) {

    if (vectorurl) {
      this.setVectorUrl(vectorurl);
    }

    if (project_type) {
      this.setProjectType(project_type);
    }

    try {
      return await this.clone().layerForEditing; // cloned editable layer
    } catch(e) {
      return e;
    }

  }

  /**
   *
   * @returns return ol source of features
   */
  getEditingSource() {
    return this._editor.getEditingSource();
  }

  /**
   *
   * @returns Array of features
   */
  readEditingFeatures() {
    return this._editor.readEditingFeatures();
  }

  getEditingLayer() {
    return this;
  }

  /**
   * @returns whether editingLayer is useful to get editingstyle
   */
  isEditingLayer() {
    return !!this.config.editing;
  }

  getEditingStyle() {
    return this.config.editing.style;
  }

  setEditingStyle(style={}) {
    this.config.editing.style = style;
  }

  getEditingConstrains() {
    return this.config.editing.constraints;
  }

  getEditingCapabilities() {
    return this.config.editing.capabilities;
  }

  isFieldRequired(fieldName) {
    let required = false;
    this.getEditingFields().forEach(field => {
      if (fieldName === field.name) {
        required = !!field.validate.required;
        return false;
      }
    });
    return required;
  }

  /**
   * Unlock editing features
   *
   * @returns jQuery Promise
   */
  unlock() {
    const d = $.Deferred();
    this._featuresstore
      .unlock()
      .then(() => d.resolve())
      .fail(d.reject);
    return d.promise();
  }

  /**
   * @returns layer fields
   */
  getEditingFields(editable = false) {
    let fields = this.config.editing.fields.length
      ? this.config.editing.fields
      : this.config.fields;
    if (editable) {
      fields = fields.filter(f => f.editable);
    }
    return fields;
  }

  /**
   * Return pk field
   * 
   * @since 3.9.0
   */
  getPkField() {
    return this.getEditingFields().find(f => f.pk);
  }

  /**
   * @param field
   *
   * @returns {boolean} whether field is a Primary Key
   */
  isPkField(field) {
    const find_field = this.getEditingFields().find(f => f.name === field);
    return find_field && find_field.pk;
  }

  isEditingFieldEditable(field) {
    const find_field = this.getEditingFields().find(f => f.name === field);
    return find_field ? find_field.editable : false;
  }

  getEditingNotEditableFields() {
    return this.config.editing.fields.filter(f => !f.editable).map(f => f.name);
  }

  getEditingMediaFields(options = null) {
    return this.config.editing.fields.filter(f => f.input.type === 'media').map(f => f.name);
  }

  getFieldsLabel() {
    const labels = [];
    this.getEditingFields().forEach(f => labels.push(f.label));
    return labels;
  }

  getDataFormat() {
    return this.config.editing.format;
  }

  /**
   * @returns raw data
   */
  getEditingFormat() {
    return this.config.editing.format;
  }

  isReady() {
    return this.state.editing.ready;
  };

  setReady(bool=false) {
    this.state.editing.ready = bool;
  }

  /**
   * Get configuration from server
   *
   * @param {*} options
   *
   * @returns jQuery Promise
   */
  getEditingConfig(options={}) {
    const d = $.Deferred();
    this
      .getProvider('data')
      .getConfig(options)
      .then(d.resolve)
      .fail(d.reject);
    return d.promise();
  }

  addEditingConfigFieldOption({
    field,
    key,
    value,
  } = {}) {
    field.input.options[key] = value;
    return field.input.options[key];
  }

  getWidgetData(options) {
    const d = $.Deferred();
    this
      .getProvider('data')
      .getWidgetData(options)
      .then(d.resolve)
      .fail(d.reject);
    return d.promise()
  }

  getCommitUrl() {
    return this.config.urls.commit;
  }

  setCommitUrl(url) {
    this.config.urls.commit = url;
  }

  getEditingUrl() {
    return this.config.urls.editing;
  }

  getUnlockUrl() {
    return this.config.url.unlock;
  }

  setUnlockUrl(url) {
    this.config.urls.unlock = url;
  }

  getWidgetUrl() {
    return this.config.urls.widget;
  }

  /**
   * Set data url
   */
  setDataUrl(url) {
    this.config.urls.data = url;
  }

  getDataUrl() {
    return this.config.urls.data;
  }

  /**
   * @returns url to get config layer
   */
  getConfigUrl() {
    return this.config.urls.config;
  }

  setConfigUrl(url) {
    this.config.urls.index = url;
  }

  getEditor() {
    return this._editor;
  }

  isStarted() {
    return this.getEditor().isStarted()
  }

  setEditor(editor) {
    this._editor = editor;
  }

  getFeaturesStore() {
    return this._featuresstore;
  }

  setFeaturesStore(featuresstore) {
    this._featuresstore = featuresstore;
  }

  setSource(source) {
    this.setFeaturesStore(source);
  }

  getSource() {
    return this._featuresstore;
  }

  /**
   * @returns editing style
   */
  getEditingStyle() {
    return this.config.editing.style;
  }

  addFeatures(features) {
    features.forEach(f => this.addFeature(f));
  }

  addLockIds(lockIds) {
    this._featuresstore.addLockIds(lockIds);
  }

  setFieldsWithValues(feature, fields) {
    const attributes = _createAttributesFromFields(fields);
    feature.setProperties(attributes);
    return attributes;
  }

  getFieldsWithValues(obj, options = {}) {
    const {
      exclude = [],
      get_default_value = true
    }  = options;

    let fields = _cloneDeep(this.getEditingFields());
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

      field.value  = attributes[field.name];
      field._value = attributes[field.name];     // store original value
      field.update = false;                      // at beginning set update false. Used to form

      if (field.input) {
        const options = this.getEditingFields().find(f => f.name === field.name).input.options;
        field.input.options.loading = options.loading || { state: null };
        field.input.options.values  = options.values;
      }

      field.visible = exclude.indexOf(field.name) === -1; // exclude contain field to set visible false

      // for editing purpose
      if (undefined === field.validate) {
        field.validate = {};
      }
    
      field.forceNull                = false;
      field.validate.valid           = true;
      field.validate._valid          = true;                            // useful to get previous value in certain case
      field.value_from_default_value = false;                           // need to be check if default value is set by server configuration field
      field.get_default_value        = get_default_value;               // specify if need to get value from form field.input.options.default value in case of missing value of field.value
      field.validate.exclude_values  = new Set();                       // for validate.unique purpose to check is new value iserted or change need to be di
      field.validate.unique          = field.validate.unique   || false;
      field.validate.required        = field.validate.required || false;
      field.validate.mutually_valid  = true;
      field.validate.empty           = !field.validate.required;
      field.validate.message         = null;
    });

    return fields;
  }

  createNewFeature() {
    let feature      = new ol.Feature();
    const properties = {};
    this.getEditingFields().forEach(f => properties[f.name] = null);
    feature.setProperties(properties);
    feature = new Feature({ feature });
    feature.setNew();
    return feature;
  }

}