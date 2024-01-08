/**
 * @file Store Open Layers controls (zoom, streetrview, screnshoot, ruler, ...)
 * @since v3.6
 */

import ApplicationService from 'services/application';
import GUI from 'services/gui';
import { VM } from 'app/eventbus';

const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');

function ControlsRegistry() {

  this._controls = {};

  this._offlineids = [];

  /**
   * @since 3.8.0
   */
  this.selectedLayer = null;

  /**
   * @since 3.8.0
   */
  this.externalLayers = [];

  ApplicationService.on('complete',
    /**
     * @TODO extract this into a class function (named callback function)
     * 
     * Handle temporary layers added by `addlayers` map control (Polygon or Multipolygon)
     *
     * @listens CatalogService~addExternalLayer
     * @listens CatalogService~removeExternalLayer
     *
     * @since 3.8.0
     */
      () => {

      const CatalogService = GUI.getService('catalog');

      // 0. store unwatches of external layers (selected or visible)
      const unWatches = {};

      // 1. update list `this.externalLayers`
      // 2. update list `unWatches` of layer un-watchers (based on unique name of layer)
      // 3. call `this.onAddExternalLayer`
      CatalogService.onafter('addExternalLayer', ({layer, type}) => {
        if ('vector' === type) {
          this.externalLayers.push(layer);
          // Add event listener of selected property to set selected layer
          unWatches[layer.name] = [
            VM.$watch(() => layer.selected, // watch `layer.selected` property
              selected => {
                this.setSelectedLayer(true === selected ? layer : null);
              })
          ];

          this.callControlsEventHandler({
            handler: 'onAddExternalLayer',
            param: {
              layer,
              unWatches: unWatches[layer.name]
            }
          });
        }
      });

      // 4. clean up any previously attached event listener
      CatalogService.onafter('removeExternalLayer', ({name, type}) => {
        if ('vector' === type) {
          this.externalLayers = this.externalLayers.filter(layer => {
            if (name === layer.name) {
              this.callControlsEventHandler({ handler: 'handleRemoveExternalLayer', param: layer });
            }
            if (name === layer.name && layer === this.selectedLayer) {
              this.setSelectedLayer(null);
            }
            return name !== layer.name;
          });
          unWatches[name].forEach(unWatch => unWatch());
          delete unWatches[name];
        }
      });
    }
  );

  ApplicationService.onbefore('offline',
    /**
     * @TODO extract this into a class function (named callback function)
     * 
     * @since 3.8.0
     */
    () => {
      this._offlineids.forEach(controlItem => {
        const control = this._controls[controlItem.id];
        controlItem.enable = control.getEnable();
        control.setEnable(false);
      })
    }
  );

  ApplicationService.onbefore('online',
    /**
     * @TODO extract this into a class function (named callback function)
     * 
     * @since 3.8.0
     */
    () => {
      this._offlineids.forEach(controlItem => {
        this._controls[controlItem.id].setEnable(controlItem.enable);
      })
    }
  );

  this.setters = {
    registerControl(id, control) {
      this._registerControl(id, control);
    },
  };

  /**
   * @param { unknown | null } layer
   * 
   * @since 3.8.0
   */
  this.setSelectedLayer= function(layer) {
    this.selectedLayer = layer;
  };

  /**
   * @since 3.8.0
   */
  this.getSelectedLayer = function(){
    return this.selectedLayer;
  };

  /**
   * @returns {Array}
   * 
   * @since 3.8.0
   */
  this.getExternalLayers = function(){
    return this.externalLayers;
  };

  /**
   * @since 3.8.0
   */
  this.catalogSelectedLayer = function(layer){
    this.setSelectedLayer(layer.isSelected() ? layer : null);

    this.callControlsEventHandler({
      handler: 'onSelectLayer',
      param: this.selectedLayer
    });
  };

  /**
   * NB `handler` = method name
   * 
   * @param {{ handler: string, param: any }}
   * 
   * @since 3.8.0
   */
  this.callControlsEventHandler = function({handler, param}){
    Object.values(this._controls).forEach((control) => {
      if ('function' === typeof control[handler]) {
        control[handler](param)
      }
    })
  };

  this._registerControl = function(id, control) {
    this._controls[id] = control;
    if (control.offline === false) {
      this._offlineids.push({
        id,
        enable: control.getEnable()
      });
      control.getEnable() && control.setEnable(ApplicationService.isOnline())
    }
  };

  this.getControl = function(id) {
    return this._controls[id];
  };

  this.getControls = function() {
    return this._controls;
  };

  this.unregisterControl = function(id) {
    const control = this.getControl(id);
    if (!control) {
      return false;
    }
    GUI.getService('map').getMap().removeControl(control);
    delete this._controls[id];
    this._offlineids = this._offlineids.filter(_id => _id !== id);
    return true;
  };

  base(this);

}

inherit(ControlsRegistry, G3WObject);

export default new ControlsRegistry();
