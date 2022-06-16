import ApplicationState from 'core/applicationstate';
import G3WObject from 'core/g3wobject';
import GUI from 'gui/gui';
import StreetViewComponent from 'gui/streetview/vue/streetview';

class StreetViewService extends G3WObject {
  constructor() {
    super({
      setters: {
        postRender(position) {},
      },
    });
    this._position = null;
  }

  init() {
    const KEY = ApplicationState.keys.vendorkeys.google;
    return KEY ? new Promise((resolve) => {
      $script(`https://maps.googleapis.com/maps/api/js?key=${KEY}`, () => {
        resolve();
      });
    }) : Promise.reject();
  }

  getPosition() {
    return this._position;
  }

  showStreetView(position) {
    this._position = position;
    GUI.setContent({
      content: new StreetViewComponent({
        service: this,
      }),
      title: 'StreetView',
    });
  }
}

export default StreetViewService;
