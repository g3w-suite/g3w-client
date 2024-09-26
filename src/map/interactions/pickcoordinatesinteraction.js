/**
 * @file ORIGINAL SOURCE: src/app/g3w-ol/interactions/pickcoordinatesinteraction.js@v3.10.2
 * @since 3.11.0
 */

export default class PickCoordinatesInteraction extends ol.interaction.Pointer {
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
        e.map.getViewport().classList.add(this._cursor);
        return true;
      },
      ...opts
    });
    this._cursor = opts.cursor || 'ol-pointer';
    // this.previousCursor_ = null;
    this._centerMap      = null;
  }

  shouldStopEvent() { return false }

  setActive(bool) {
    const map = this.getMap();
    if (map) {
      map.getViewport().classList.remove(this._cursor);
    }
    super.setActive(bool);
  };

  setMap(map) {
    if (!map) {
      this.getMap().getViewport().classList.remove(this._cursor);
    }
    super.setMap(map);
  }

}