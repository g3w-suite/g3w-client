
module.exports = class PickCoordinatesInteraction extends ol.interaction.Pointer {
  constructor(opts = {}) {
    super({
      handleDownEvent(e) {
        this._centerMap = e.map.getView().getCenter();
        // set timeout to avoid blocking pan
        setTimeout(() => {
          if (this._centerMap === e.map.getView().getCenter()) {
            this.handleUpEvent(e);
          }
        }, 300);
        // return false to avoid start of drag event
        return false
      },
      handleUpEvent(e) {
        this.dispatchEvent({
          type:       'picked',
          coordinate: e.coordinate,
        })
        // it used to stop drag event
        return false;
      },
      handleMoveEvent(e) {
        e.map.getTargetElement().style.cursor = 'pointer';
        return true;
      },
      ...opts
    });
    this.previousCursor_ = null;
    this._centerMap      = null;
  }

  shouldStopEvent() { return false }

  setActive(bool) {
    const map = this.getMap();
    if (map) {
      const elem        = map.getTargetElement();
      elem.style.cursor = '';
    }
    super.setActive(bool);
  };

  setMap(map) {
    if (!map) { this.getMap().getTargetElement().style.cursor = '' }
    super.setMap(map);
  }

};
