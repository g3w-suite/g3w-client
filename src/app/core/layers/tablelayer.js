import { TIMEOUT }                        from "constant";
import CatalogLayersStoresRegistry      from 'store/catalog-layers';
import ProjectsRegistry                 from 'store/projects';

const { base, inherit }                 = require('utils');
const Layer                             = require('core/layers/layer');
const FeaturesStore                     = require('core/layers/features/featuresstore');
const Feature                           = require('core/layers/features/feature');

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

/**
 * Function to wait for predicates.
 * 
 * @param { () => Boolean } predicate - A function that returns a bool
 * @param { number }        [timeout] - Optional maximum waiting time in ms after rejected
 * 
 * @see https://gist.github.com/chrisjhoughton/7890239?permalink_comment_id=4411125#gistcomment-4411125
 */
function _waitFor(predicate, timeout) {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (!predicate()) return;
      clearInterval(interval);
      resolve();
    };
    const interval = setInterval(check, 100);
    check();
    if (timeout) {
      setTimeout(() => { clearInterval(interval); reject(); }, timeout);
    }
  });
}

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
function TableLayer(config = {}, options = {}) {

  /**
   * Hook setters methods
   */
  this.setters = {
    clearFeatures:  this._clearFeatures,
    addFeature:     this._addFeature,
    deleteFeature:  this._deleteFeature,
    updateFeature:  this._updateFeature,
    setFeatures:    this._setFeatures,
    setColor:       this._setColor,

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


  // call base layer
  base(this, config, options);

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
          await _waitFor(() => window.g3wsdk.core.hasOwnProperty('editing'), TIMEOUT);    // wait unitil "editing" plugin is loaded
          this.config.editing.fields       = vector.fields;
          this.config.editing.format       = vector.format;
          this.config.editing.constraints  = constraints;
          this.config.editing.capabilities = capabilities || window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES; // set default editing capabilities
          this.config.editing.form = { perc: null };       // set editing form `perc` to null at beginning
          this.config.editing.style = vector.style;        // get vector layer style
          if (vector.style) {                              // set vector layer color 
            this.setColor(vector.style.color);
          }
          this._setOtherConfigParameters(vector);
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

inherit(TableLayer, Layer);

const proto = TableLayer.prototype;

/**
 * sync selection
 *
 * @param {*} commitItems
 */
proto.syncSelectionFilterFeatures = function(commitItems) {
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
};

proto.setFormPercentage = function(perc) {
  this.config.editing.form.perc = perc;
};

proto.getFormPercentage = function() {
  return this.config.editing.form.perc;
};

proto.clone = function() {
  return _cloneDeep(this);
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

/**
 * Get editing layer
 *
 * @param vectorurl
 * @param project_type
 *
 * @returns { Promise }
 */
proto.getLayerForEditing = async function({
  vectorurl,
  project_type
} = {}) {

  if (vectorurl) {
    this.setVectorUrl(vectorurl);
  }

  if (project_type) {
    this.setProjectType(project_type);
  }

  this.setEditingUrl();

  try {
    return await this.clone().layerForEditing; // cloned editable layer
  } catch(err) {
    return err;
  }

};

/**
 *
 * @returns return ol source of features
 */
proto.getEditingSource = function() {
  return this._editor.getEditingSource();
};

/**
 *
 * @returns Array of features
 */
proto.readEditingFeatures = function() {
  return this._editor.readEditingFeatures();
};

proto.getEditingLayer = function() {
  return this;
};

/**
 * @returns whether editingLayer is useful to get editingstyle
 */
proto.isEditingLayer = function() {
  return !!this.config.editing;
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

proto.getEditingCapabilities = function() {
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

/**
 * Unlock editing features
 *
 * @returns jQuery Promise
 */
proto.unlock = function() {
  const d = $.Deferred();
  this._featuresstore
    .unlock()
    .then(() => d.resolve())
    .fail(d.reject);
  return d.promise();
};

proto._setOtherConfigParameters = function(config) {
  // overwrite by vector layer
};

/**
 * @returns layer fields
 */
proto.getEditingFields = function(editable = false) {
  let fields = this.config.editing.fields.length
    ? this.config.editing.fields
    : this.config.fields;
  if (editable) {
    fields = fields.filter(f => f.editable);
  }
  return fields;
};

/**
 * Return pk field
 * 
 * @since 3.9.0
 */
proto.getPkField = function() {
  return this.getEditingFields().find(f => f.pk);
}

/**
 * @param field
 *
 * @returns {boolean} whether field is a Primary Key
 */
proto.isPkField = function(field) {
  const find_field = this.getEditingFields().find(f => f.name === field);
  return find_field && find_field.pk;
};

proto.isEditingFieldEditable = function(field) {
  const find_field = this.getEditingFields().find(f => f.name === field);
  return find_field ? find_field.editable : false;
};

proto.getEditingNotEditableFields = function() {
  return this.config.editing.fields.filter(f => !f.editable).map(f => f.name);
};

proto.getEditingMediaFields = function(options = null) {
  return this.config.editing.fields.filter(f => f.input.type === 'media').map(f => f.name);
};

proto.getFieldsLabel = function() {
  const labels = [];
  this.getEditingFields().forEach(f => labels.push(f.label));
  return labels;
};

proto.getDataFormat = function() {
  return this.config.editing.format;
};

/**
 * @returns raw data
 */
proto.getEditingFormat = function() {
  return this.config.editing.format;
};

proto.isReady = function() {
  return this.state.editing.ready;
};

proto.setReady = function(bool=false) {
  this.state.editing.ready = bool;
};

/**
 * Get configuration from server
 *
 * @param {*} options
 *
 * @returns jQuery Promise
 */
proto.getEditingConfig = function(options={}) {
  const d = $.Deferred();
  this
    .getProvider('data')
    .getConfig(options)
    .then(d.resolve)
    .fail(d.reject);
  return d.promise();
};

proto.addEditingConfigFieldOption = function({
  field,
  key,
  value,
} = {}) {
  field.input.options[key] = value;
  return field.input.options[key];
};

proto.getWidgetData = function(options) {
  const d = $.Deferred();
  this
    .getProvider('data')
    .getWidgetData(options)
    .then(d.resolve)
    .fail(d.reject);
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

/**
 * Set data url
 */
proto.setDataUrl = function(url) {
  this.config.urls.data = url;
};

proto.getDataUrl = function() {
  return this.config.urls.data;
};

/**
 * @returns url to get config layer
 */
proto.getConfigUrl = function() {
  return this.config.urls.config;
};

proto.setConfigUrl = function(url) {
  this.config.urls.index = url;
};

proto.getEditor = function() {
  return this._editor;
};

proto.isStarted = function() {
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

/**
 * @returns editing style
 */
proto.getEditingStyle = function() {
  return this.config.editing.style;
};

proto._setFeatures = function(features) {
  this._featuresstore.setFeatures(features);
};

proto.addFeatures = function(features) {
  features.forEach(f => this.addFeature(f));
};

proto._addFeature = function(feature) {
  this._featuresstore.addFeature(feature);
};

proto._deleteFeature = function(feature) {
  return feature.getId();
};

proto._updateFeature = function(feature) {};

/**
 * Delete all features
 */
proto._clearFeatures = function() {
  this._featuresstore.clearFeatures();
};

proto.addLockIds = function(lockIds) {
  this._featuresstore.addLockIds(lockIds);
};

proto.setFieldsWithValues = function(feature, fields) {
  const attributes = _createAttributesFromFields(fields);
  feature.setProperties(attributes);
  return attributes;
};

proto.getFieldsWithValues = function(obj, options = {}) {
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
};

proto.createNewFeature = function() {
  let feature      = new ol.Feature();
  const properties = {};
  this.getEditingFields().forEach(f => properties[f.name] = null);
  feature.setProperties(properties);
  feature = new Feature({ feature });
  feature.setNew();
  return feature;
};

module.exports = TableLayer;
