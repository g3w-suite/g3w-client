import ApplicationService from 'core/applicationservice';
import G3WObject from 'core/g3wobject';
import GUI from 'gui/gui';

class ControlsRegistry extends G3WObject {
  constructor(options = {}) {
    super({
      setters: {
        registerControl(id, control) {
          this._registerControl(id, control);
        },
      },
    });
    this._controls = {};
    this._offlineids = [];
    ApplicationService.onbefore('offline', () => {
      this._offlineids.forEach((controlItem) => {
        const { id } = controlItem;
        const control = this._controls[id];
        controlItem.enable = control.getEnable();
        control.setEnable(false);
      });
    });

    ApplicationService.onbefore('online', () => {
      this._offlineids.forEach((controlItem) => {
        const { id, enable } = controlItem;
        this._controls[id].setEnable(enable);
      });
    });
  }

  _registerControl(id, control) {
    this._controls[id] = control;
    if (control.offline === false) {
      this._offlineids.push({
        id,
        enable: control.getEnable(),
      });
      control.getEnable() && control.setEnable(ApplicationService.isOnline());
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
    const mapService = GUI.getComponent('map').getService();
    const map = mapService.getMap();
    if (control) {
      map.removeControl(control);
      delete this._controls[id];
      this._offlineids = this._offlineids.filter((_id) => _id !== id);
      return true;
    }
    return false;
  }
}

export default new ControlsRegistry();
