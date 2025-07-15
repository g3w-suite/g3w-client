/**
 * @file ORIGINAL SOURCE: src/app/core/layers/tablelayer.js@v3.10.2
 * @since 3.11.0
 */

import { $promisify, promisify }        from 'utils/promisify';
import { getCatalogLayerById }          from 'utils/getCatalogLayerById';

import { Layer }                        from 'map/layers/layer';
import { FeaturesStore }                from 'map/layers/featuresstore';
import { Feature }                      from 'map/layers/feature';

/** @deprecated */
import _cloneDeep                       from 'lodash.clonedeep';

/**
 * Base Layer that support editing
 */
export class TableLayer extends Layer {
  
  constructor(config = {}, opts = {}) {

    super(config, opts);

    /**
     * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
     */
    this.setters = [
      'clearFeatures',
      'addFeature',
      'updateFeature',
      'setFeatures',
      'setColor',
      'getFeatures',
      'commit',
    ];

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

    /**
     * Feature wrapper (to store feature)
     */
    this._featuresstore = new FeaturesStore({ provider: this.providers.data });

  }

  /**
   * Clear all features of the layer
   * 
   * @since 4.0.0
   */
  clearFeatures()        { this._featuresstore.clearFeatures(); }

  /**
   * @since 4.0.0 
   */
  addFeature(feature)    { this._featuresstore.addFeature(feature); }

  /**
   * @TODO check if it unusued
   * 
   * @since 4.0.0
   */
  updateFeature(feature) { this._featuresstore.updateFeature(feature);}

  /**
   * @TODO check if it unusued
   * 
   * @since 4.0.0
   */
  setFeatures(features)  { this._featuresstore.setFeatures(features); }

  /**
   * @TODO check if it unusued
   * 
   * @since 4.0.0
   */
  setColor(color)        { this._color = color; }

  /**
   * get data from every sources (server, wms, etc..)
   * through provider related to featuresstore
   *
   * @param {*} opts
   * 
   * @since 4.0.0
   */
  getFeatures(opts = {}) {
    return $promisify(async () => {
      const features = await promisify(this._featuresstore.getFeatures(opts));
      this.emit('getFeatures', features);
      return features;
    });
  }

  /**
   * @since 4.0.0 
   */
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
                const selected = layer.getOlSelectionFeature(id);
                if (selected) {
                  selected.feature = geometry;
                  GUI.getService('map').setSelectionFeatures('update', { feature: geometry });
                }
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
   * @return {TableLayer}
   */
  getEditingLayer() {
    return this;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * Unlock editing features
   *
   * @returns jQuery Promise
   */
  unlock() {
    return $promisify(async () => await promisify(this._featuresstore.unlock()));
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param { Boolean }  editable In case we want only editable fields
   * @returns layer fields
   */
  getEditingFields(editable = false) {
    return editable ? (this.config.editing.fields || []).filter(f => f.editable) : (this.config.editing.fields || []);
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
}