import G3WObject from 'core/g3wobject';

class MapsRegistry extends G3WObject {
  constructor() {
    super();
    this._mapsServices = {};
  }

  addMap(mapService) {
    this._registerMapService(mapService);
  }

  _registerMapService(mapService) {
    if (!this._mapsServices[mapService.id]) this._mapsServices[mapService.id] = mapService;
  }
}

export default MapsRegistry;
