module.exports = class Projection extends ol.proj.Projection {
  constructor(opts = {}) {
    super(opts);
    if (!opts.crs) { return null }
    // structure of information crs from server set on each layer and base layer
    const {
      epsg,
      extent,
      proj4: proj4def,
      geographic   = false,
      axisinverted = false,
    } = opts.crs;

    if (proj4def) { proj4.defs(epsg, proj4def) }

    const axisOrientation = axisinverted ? 'neu' : 'enu';

    super({
      code: epsg,
      extent,
      axisOrientation,
      units: geographic ? 'degrees' : 'm'
    });

    this._axisOrientation = axisOrientation;
  }

  getOlProjection() {}

  isInvertedAxisOrientation() {
    return 'neu' === this._axisOrientation;
  }

  getAxisOrientation() {
    return this._axisOrientation;
  }

};
