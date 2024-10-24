/**
 * @file ORIGINAL SOURCE: src/app/core/layers/tablelayer.js@v3.10.2
 * @since 3.11.0
 */

import { TIMEOUT }                      from 'g3w-constants';
import { waitFor }                      from 'utils/waitFor';
import { $promisify, promisify }        from 'utils/promisify';
import { XHR }                          from 'utils/XHR';
import { getCatalogLayerById }          from 'utils/getCatalogLayerById';

import { Layer }                        from 'map/layers/layer';
import { FeaturesStore }                from 'map/layers/featuresstore';
import { Feature }                      from 'map/layers/feature';

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

/**
 * Base Layer that support editing
 */
export class TableLayer extends Layer {
  
  constructor(config = {}, opts = {}) {

    super(config, opts);

    /**
     * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
     * Hook setters methods
     */
    this.setters = {
      /**
       * Clear all features of the layer
       */
      clearFeatures()        { this._featuresstore.clearFeatures(); },
      addFeature(feature)    { this._featuresstore.addFeature(feature); },
      /**
       * @TODO it used ????
       * @param feature
       */
      updateFeature(feature) { this._featuresstore.updateFeature(feature);},
      setFeatures(features)  { this._featuresstore.setFeatures(features); },
      setColor(color)        { this._color = color; },

      /**
       * get data from every sources (server, wms, etc..)
       * through provider related to featuresstore
       *
       * @param {*} opts
       */
      getFeatures(opts = {}) {
        return $promisify(async () => {
          const features = await promisify(this._featuresstore.getFeatures(opts));
          this.emit('getFeatures', features);
          return features;
        });
      },

      commit(commitItems) {
        return $promisify(async () => {
          const response = await promisify(this._featuresstore.commit(commitItems));
          // sync selection filter features
          if (response && response.result) {
            try {
              const layer = getCatalogLayerById(this.getId());
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
            } catch(e) {
              console.warn(e);
            }
          }
          return response;
        });
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

    /**
     * @FIXME add description
     */
    this.layerId = config.id;

    // @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
    // editable layer -- > update layer config info
    if (this.isEditable()) {
      this.layerForEditing = (async () => {
        // get layer editing config (from server)
        try {
          const {
            vector,
            constraints = {},
            capabilities,
          } = await promisify(this.getProvider('data').getConfig(opts));

          await waitFor(() => window.g3wsdk.core.hasOwnProperty('editing'), TIMEOUT);    // wait until "editing" plugin is loaded
            // add editing configurations
            this.config.editing =  {
              fields:       vector.fields,
              format:       vector.format,
              constraints,
              capabilities: capabilities || window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES, // default editing capabilities
              form:         { perc: null },                                                      // set editing form `perc` to null at beginning
              style:        vector.style,                                                        // get vector layer style
              geometrytype: vector.geometrytype,                                                 // whether is a vector layer,
              visible:      (vector.editing || { visible: true }).visible,                                      //@since 3.11.0 let know if layer should be editable directly (true) or through relation layer (false)
            }

            if (vector.style) {                              // set vector layer color 
              this.setColor(vector.style.color);
            }

            this._editor = new window.g3wsdk.core.editing.Editor({ layer: this }); // create an instance of editor
            this.setReady(true);                             // set ready
            return this;
        } catch (e) {
          console.warn(e);
          this.setReady(false);
          return Promise.reject(this);
        }
      })();

      this.state           = {
        ...this.state,
        editing: {
          started:  false,
          modified: false,
          ready:    false
        }
      };
    }

    /**
     * Feature wrapper (to store feature)
     */
    this._featuresstore = new FeaturesStore({ provider: this.providers.data });

  }

  /**
   *
   * @param perc
   */
  setFormPercentage(perc) {
    this.config.editing.form.perc = perc;
  }

  getFormPercentage() {
    return this.config.editing.form.perc;
  }

  clone() {
    return _cloneDeep(this);
  }

  getColor() {
    return this._color;
  }

  readFeatures() {
    return this._featuresstore.readFeatures();
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * Get editing layer
   *
   * @param vectorurl
   *
   * @returns { Promise }
   */
  async getLayerForEditing({ vectorurl } = {}) {

    if (vectorurl) {
      //@TODO Check if it used otherwise delete it
      this.vectorUrl = vectorurl;
    }

    try {
      return await this.clone().layerForEditing; // cloned editable layer
    } catch(e) {
      console.warn(e);
      return e;
    }

  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @returns return ol source of features
   */
  getEditingSource() {
    return this._editor.getEditingSource();
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @returns Array of features
   */
  readEditingFeatures() {
    return this._editor.readEditingFeatures();
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {TableLayer}
   */
  getEditingLayer() {
    return this;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {{}}
   */
  getEditingConstrains() {
    return this.config.editing.constraints;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {*|string[]}
   */
  getEditingCapabilities() {
    return this.config.editing.capabilities;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param fieldName
   * @return {boolean}
   */
  isFieldRequired(fieldName) {
    return (this.getEditingFields().find(f => fieldName === f.name) || { validate: { required: false } }).validate.required;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * Unlock editing features
   *
   * @returns jQuery Promise
   */
  unlock() {
    return $promisify(async () => { await promisify(this._featuresstore.unlock()); });
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
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
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param field
   *
   * @returns {boolean} whether field is a Primary Key
   */
  isPkField(field) {
    return (this.getEditingFields().find(f => field === f.name) || {}).pk;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param field
   * @return {boolean}
   */
  isEditingFieldEditable(field) {
    return (this.getEditingFields().find(f => f.name === field) || { editable: false }).editable;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {*}
   */
  getEditingNotEditableFields() {
    return this.config.editing.fields.filter(f => !f.editable).map(f => f.name);
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param opts
   * @return {*}
   */
  getEditingMediaFields(opts = null) {
    return this.config.editing.fields.filter(f => 'media' === f.input.type).map(f => f.name);
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {boolean}
   */
  isReady() {
    return this.state.editing.ready;
  };

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param bool
   */
  setReady(bool = false) {
    this.state.editing.ready = bool;
  }

  getWidgetData(opts = {}) {
    return $promisify(async () => await XHR.get({
      url:    this.getProvider('data')._layer.getUrl('widget')[opts.type],
      params: { fields: opts.fields }
    }));
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {*}
   */
  getEditor() {
    return this._editor;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {*}
   */
  isStarted() {
    return this._editor.isStarted()
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

  addFeatures(features = []) {
    features.forEach(f => this.addFeature(f));
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param lockIds
   */
  addLockIds(lockIds) {
    this._featuresstore.addLockIds(lockIds);
  }

  /**
   * create attributes from fields
   */
  setFieldsWithValues(feature, fields) {
    const createAttrs = (fields = []) => fields.reduce((acc, f) => { 
      if ('child' === f.type) {
        acc[f.name] = createAttrs(f.fields);
      } else if ('null' === f.value) {
        f.value = null;
      }
      acc[f.name] = f.value;
      return acc;
    }, {});
    const attributes = createAttrs(fields);
    feature.setProperties(attributes);
    return attributes;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param obj
   * @param opts
   * @return {*}
   */
  getFieldsWithValues(obj, opts = {}) {
    const {
      exclude = [],
      get_default_value = true
    }  = opts;

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

      field.visible = exclude.indexOf(field.name) === -1; // exclude contain field to set visible false

      // for editing purpose
      if (undefined === field.validate) {
        field.validate = {};
      }

      field.nullOption               = undefined === field.nullOption || field.nullOption ; //@since 3.11.0 used in InputSelect.vue component.
      field.forceNull                = false;
      field.validate.valid           = true;
      field.validate._valid          = true;                            // useful to get previous value in certain case
      field.value_from_default_value = false;                           // need to be checked if the default value is set by server configuration field
      field.get_default_value        = get_default_value;               // specify if you need to get value from form field.input.options.default value in case of missing value of field.value
      field.validate.exclude_values  = new Set();                       // for validate.unique purpose to check is new value inserted or change needs to be di
      field.validate.unique          = field.validate.unique   || false;
      field.validate.required        = field.validate.required || false;
      field.validate.mutually_valid  = true;
      field.validate.empty           = false; // Mean no value (field.value) set start value to false. It will be set once the input field is show
      field.validate.message         = null;

      if (field.input) {
        const options = this.getEditingFields().find(f => f.name === field.name).input.options;
        field.input.options.loading = options.loading || { state: null };
        //check if value is defined otherwise set empty array (e.g., required for field.validate unique)
        field.input.options.values  = options.values || [];
      }

    });

    return fields;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {Feature}
   */
  createNewFeature() {
    const feature = new Feature({
      feature: new ol.Feature(this.getEditingFields().reduce((props, f) => { props[f.name] = null; return props }, {}))
    });
    feature.setNew();
    return feature;
  }

}