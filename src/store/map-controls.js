/**
 * ORIGINAL SOURCE: src/app/gui/map/control/registry.js@v3.4
 */

const ApplicationService = require('core/applicationservice');
const {base, inherit} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');

function ControlsRegistry() {
  this._controls = {};
  this._offlineids = [];
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
    }
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
