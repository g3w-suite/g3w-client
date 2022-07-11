import { MousePosition } from 'ol/control';

class MousePositionControl extends MousePosition {
  constructor(options = {}) {
    options.target = options.target || 'mouse-position-control';
    super(options);
  }

  offline = true;

  setEnable(bool) {
    bool ? $(this.element) : $(this.element);
  }

  setMap(map) {
    if (map) {
      $(this.element).removeClass('ol-control');
      super.setMap(map);
    }
  }
}

export default MousePositionControl;
