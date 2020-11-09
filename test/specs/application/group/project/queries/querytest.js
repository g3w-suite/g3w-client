import api from 'api';
const { geoutils } = api.core;
const Service = require('./service');
const { vue: {MapComponent}} = api.gui;
const {assert, expect} = require('chai');
const mapDOM = {
  width: 1168,
  height: 899
}
export default function TestQuery ({mapcontrols=[], testConfig}={}) {
    describe('#Query', function() {
      this.timeout(0);
      const mapService = new MapComponent({}).getService();
      const {query, querybypolygon, querybbox} = testConfig;
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
            const promise = new Service.query.run({
              coordinates,
              mapService
            })
            it ('#features query', async function() {
              const {count} = features;
              const response = await promise;
              const results = geoutils.parseQueryLayersPromiseResponses(response);
              const {data=[]} = results;
              const layerResult = data.find(obj => obj.layer.getId() === id);
              expect(layerResult.features).to.be.length(count);
            })
          }
        }
      }
      if (mapcontrols.find(mapcontrol => mapcontrol === 'querybbox')) {
        for (const config of querybbox) {
          const {bbox, layers} = config;
          it('#bbox is Array', async function () {
            assert.isArray(bbox);
          })
          it('#bbox lenght 4', function () {
            expect(bbox).to.be.length(4);
          })
          it('#response QueryBBOX', async function () {
            const data = await Service.querybbox.run({
              mapService,
              bbox
            })
            layers.forEach(layer => {
              const layerResponse = data.find(dataObj => dataObj.layer.getId() == layer.id);
              layerResponse && expect(layerResponse.features).to.be.length(layer.features.count);
            })
          })
        }
      }
      if (mapcontrols.find(mapcontrol => mapcontrol === 'querybypolygon')) {
        for (const config of querybypolygon) {
          const {coordinates, layer, layers } = config;
          it('#coordinate is Array', async function() {
            assert.isArray(coordinates);
          })
          it('#coordinate lenght 4', function() {
            expect(coordinates).to.be.length(2);
          })
          it('#response QueryByPolygon', async function() {
            const data = await Service.querybypolygon.run({
              mapService,
              coordinates,
              layer
            })
            expect(data).length(config.layers.count);
            assert.strictEqual(data.reduce((sum, layer) => sum +=layer.features.length, 0), config.features.count);
          })
        }
      }
      mapService.clear();
    })
}