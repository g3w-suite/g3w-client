import api from 'api';
const { geoutils } = api.core;
const { vue: {MapComponent}} = api.gui;
const {assert, expect} = require('chai');
const mapDOM = {
  width: 1168,
  height: 899
}
export default function TestQuery ({mapcontrols=[], testConfig}={}) {
    describe('#Query', function() {
      const mapService = new MapComponent({}).getService();
      const {query, querybypolygon, querybybbox} = testConfig;
      mapService.setupViewer(mapDOM.width, mapDOM.height);
      const map = mapService.getMap();
      if (mapcontrols.find(mapcontrol => mapcontrol === 'query')) {
        for (const config of query) {
          const {coordinates, layers } = config;
          it('#coordinate is Array', async function() {
            assert.isArray(coordinates);
          })
          it('#coordinate lenght 2', function() {
            expect(coordinates).to.be.length(2);
          })
          for (const layer of layers) {
            const { id, features } = layer;
            const layers = geoutils.getMapLayersByFilter({
              IDS: [id]
            });
            const promise = new Promise((resolve, reject) => {
              geoutils.getQueryLayersPromisesByCoordinates(layers, {
                coordinates,
                map
              }).then(response => resolve(response))
                .fail(error => reject(error))
            })
            it ('#features', async function() {
              const {count} = features;
              const response = await promise;
              const results = geoutils.parseQueryLayersPromiseResponses(response);
              const {data=[]} = results;
              expect(data).to.be.length(1);
              expect(data[0].features).to.be.length(count);
            })
          }
        }
      }
      mapService.clear();
    })
}