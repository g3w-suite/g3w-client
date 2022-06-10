import {Control, Zoom, ZoomToExtent, ScaleLine, OverviewMap} from 'ol/control'

class OLControl extends Control {
  constructor(options={}) {
    let control;
    const {position = 'tl'} = options;
    switch (options.type) {
      case 'zoom':
        control = new Zoom(options);
        break;
      case 'zoomtoextent':
        control = new ZoomToExtent(options);
        break;
      case 'scaleline':
        control = new ScaleLine(options);
        break;
      case 'overview':
        control = new OverviewMap(options);
        break;
    }
    $(control.element).addClass(`ol-control-${position}`);

    super({element: control.element});
    this._control = control;
    this.positionCode = position;
  }

  offline = true;

  /**
   * Return Ol Control
   * @returns {*}
   */
  getOlControl() {
    return this._control;
  };

  getPosition(positionCode) {
    positionCode = positionCode || this.positionCode;
    const position = {};
    position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
    position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
    return position;
  };

  layout(map) {
    if (map) {
      const position =  this.getPosition();
      const viewPort = map.getViewport();
      let previusControls = $(viewPort).find(`.ol-control-${this.positionCode}`);
      if (previusControls.length) {
        const previusControl = previusControls.last();
        const previousOffset = position.left ? previusControl.position().left : previusControl.position().right;
        const hWhere = position.left ? 'left' : 'right';
        const previousWidth = previusControl[0].offsetWidth;
        const hOffset = $(this.element).position()[hWhere] + previousOffset + previousWidth + 2;
        $(this.element).css(hWhere, hOffset+'px');
      }
    }
  };

  changelayout() {};

  showHide() {
    $(this.element).toggle();
  };

  setMap(map) {
    this.layout(map);
    this._control.setMap(map);
  };

};

// subclass of OpenLayer Control

export default  OLControl;


