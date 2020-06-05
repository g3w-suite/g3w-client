const MousePositionControl = function(options= {}) {
  options.target = 'mouse-position-control';
  ol.control.MousePosition.call(this, options);
};

ol.inherits(MousePositionControl, ol.control.MousePosition);

module.exports = MousePositionControl;

const proto = MousePositionControl.prototype;

proto.offline = true;


proto.setEnable = function(bool) {
  bool ? $(this.element) : $(this.element)
};

proto.setMap = function(map) {
  if (map) {
    $(this.element).removeClass('ol-control');
    ol.control.MousePosition.prototype.setMap.call(this, map);
  }
};




