class MousePositionControl extends ol.control.MousePosition {

  constructor(options= {}) {
    options.target = options.target || 'mouse-position-control';
    super(options);
  }

  setEnable(bool) {
    bool ? $(this.element) : $(this.element)
  }

  setMap(map) {
    if (map) {
      $(this.element).removeClass('ol-control');
      ol.control.MousePosition.prototype.setMap.call(this, map);
    }
  }

}

MousePositionControl.prototype.offline = true;

module.exports = MousePositionControl;