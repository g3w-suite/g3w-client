/**
 * @file Store Open Layers controls (zoom, streetrview, screnshoot, ruler, ...)
 * @since v3.6
 */

import ApplicationService from 'services/application';
import ComponentsRegistry from 'store/components';
import { VM }             from 'app/eventbus';
import G3WObject          from 'core/g3wobject';

console.assert(undefined !== ApplicationService, 'ApplicationService is undefined');
console.assert(undefined !== ComponentsRegistry, 'ComponentsRegistry is undefined');

class ControlsRegistry extends G3WObject {

  constructor() {

    super();

    this._controls   = {};

    this._offlineids = [];
  
    /**
     * @since 3.8.0
     */
    this.selectedLayer = null;
  
    /**
     * @since 3.8.0
     */
    this.externalLayers = [];
  
    ApplicationService.on('complete', this._handleTempLayers.bind(this));
    ApplicationService.onbefore('offline', this._handleOffline.bind(this));
    ApplicationService.onbefore('online', this._handleOnline.bind(this));

    this.setters = {
      registerControl(id, control) {
        this._registerControl(id, control);
      },
    };

  }

  /**
   * @param { unknown | null } layer
   * 
   * @since 3.8.0
   */
  setSelectedLayer(layer) {
    this.selectedLayer = layer;
  }

  /**
   * @since 3.8.0
   */
  getSelectedLayer() {
    return this.selectedLayer;
  }

  /**
   * @returns {Array}
   * 
   * @since 3.8.0
   */
  getExternalLayers() {
    return this.externalLayers;
  }

  /**
   * @since 3.8.0
   */
  catalogSelectedLayer(layer) {
    this.setSelectedLayer(layer.isSelected() ? layer : null);

    this.callControlsEventHandler({
      handler: 'onSelectLayer',
      param: this.selectedLayer
    });
  }

  /**
   * NB `handler` = method name
   * 
   * @param {{ handler: string, param: any }}
   * 
   * @since 3.8.0
   */
  callControlsEventHandler({handler, param}) {
    Object.values(this._controls).forEach((control) => {
      if ('function' === typeof control[handler]) {
        control[handler](param)
      }
    })
  }

  _registerControl(id, control) {
    this._controls[id] = control;
    if (control.offline === false) {
      this._offlineids.push({
        id,
        enable: control.getEnable()
      });
      control.getEnable() && control.setEnable(ApplicationService.isOnline())
    }
  }

  getControl(id) {
    return this._controls[id];
  }

  getControls() {
    return this._controls;
  }

  unregisterControl(id) {
    const control = this.getControl(id);
    if (!control) {
      return false;
    }
    ComponentsRegistry.getComponent('map').getService().getMap().removeControl(control);
    delete this._controls[id];
    this._offlineids = this._offlineids.filter(_id => _id !== id);
    return true;
  };

  /**
   * Handle temporary layers added by `addlayers` map control (Polygon or Multipolygon)
   *
   * @listens CatalogService~addExternalLayer
   * @listens CatalogService~removeExternalLayer
   *
   * @since 3.9.0
   */
    _handleTempLayers() {

      const CatalogService = ComponentsRegistry.getComponent('catalog').getService();

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

    /**
     * @since 3.9.0
     */
    _handleOffline() {
      this._offlineids.forEach(controlItem => {
        const control = this._controls[controlItem.id];
        controlItem.enable = control.getEnable();
        control.setEnable(false);
      })
    }

    /**
     * @since 3.9.0
     */
    _handleOnline() {
      this._offlineids.forEach(controlItem => {
        this._controls[controlItem.id].setEnable(controlItem.enable);
      })
    }

}

export default new ControlsRegistry();
