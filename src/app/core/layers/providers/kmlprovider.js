import Provider from 'core/layers/providers/provider';

class KMLDataProvider extends Provider{
  constructor(options = {}) {
    super(options);
    this._name = 'kml';
  }
}

export default KMLDataProvider;
