/**
 * @file Store Open Layers controls (zoom, streetrview, screnshoot, ruler, ...)
 * @since v3.6
 */

import ApplicationService from 'services/application';
import GUI from 'services/gui';

const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function ControlsRegistry() {
  this._controls = {};
  this._offlineids = [];
  this.selectedLayer = null;
  this.externalLayers = [];

  ApplicationService.on('complete', ()=> {
    /**
     * since 3.8.0
     */
    const CatalogService = GUI.getService('catalog');

    // 0. store unwatches of external layers (selected or visible)
    const unWatches = {};

    /**
     * Handle temporary layers added by `addlayers` map control (Polygon or Multipolygon)
     *
     * @listens CatalogService~addExternalLayer
     * @listens CatalogService~removeExternalLayer
     *
     * @since 3.8.0
     */

    // 1. update list `this.externalLayers`
    // 2. update list `unWatches` of layer un-watchers (based on unique name of layer)
    // 3. call `this.onAddExternalLayer`
    CatalogService.onafter('addExternalLayer', ({layer, type}) => {
      if ('vector' === type) {
        this.externalLayers.push(layer);
        unWatches[layer.name] = [];
        this.callControlsEventHandler({
          handler: 'onAddExternalLayer',
          param: {
            layer,
            unWatches
          }
        });
      }
    });

    // 4. clean up any previously attached event listener
    CatalogService.onafter('removeExternalLayer', ({name, type}) => {
      if ('vector' === type) {
        this.externalLayers = this.externalLayers.filter(layer => {
          if (name === layer.name) {
            this.callControlsEventHandler({
              handler: 'handleRemoveExternalLayer',
              param: layer
            });
            (layer === this.selectedLayer) && this.setSelectedLayer(null);
          }
          return name !== layer.name;
        });
        unWatches[name].forEach(unWatch => unWatch());
        delete unWatches[name];
      }
    });
  });

  ApplicationService.onbefore('offline', () =>{
    this._offlineids.forEach(controlItem => {
      const {id} = controlItem;
      const control = this._controls[id];
      controlItem.enable = control.getEnable();
      control.setEnable(false);
    })
  });

  ApplicationService.onbefore('online', ()=>{
    this._offlineids.forEach(controlItem => {
      const {id, enable} = controlItem;
      this._controls[id].setEnable(enable);
    })
  });

  this.setters = {
    registerControl(id, control) {
      this._registerControl(id, control);
    },
    /**
     * @since 3.8.0
     * @param { unknown | null } layer
     */
    setSelectedLayer(layer) {
      this.selectedLayer = layer;
    }
  };

  /**
   * @since 3.8.0
   */
  this.getSelectedLayer = function(){
    return this.selectedLayer;
  };

  /**
   * @since 3.8.0
   * @returns {Array}
   */
  this.getExternalLayers = function(){
    return this.externalLayers;
  };

  /**
   * @since 3.8.0
   */
  this.catalogSelectedLayer = function(layer){
    if (layer.isSelected()){
      this.setSelectedLayer(layer);
    } else {
      this.setSelectedLayer(layer);
    }
    this.callControlsEventHandler({
      handler: 'onSelectLayer',
      param: this.selectedLayer
    });
  };

  /**
   * @since 3.8.0
   * @param handler <String> method name
   * @param param <Any>
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
    const mapService = GUI.getService('map');
    const map = mapService.getMap();
    if (control) {
      map.removeControl(control);
      delete this._controls[id];
      this._offlineids = this._offlineids.filter(_id => _id !== id);
      return true
    }
    return false
  };
  base(this);
}

inherit(ControlsRegistry, G3WObject);

export default new ControlsRegistry();
