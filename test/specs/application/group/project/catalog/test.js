import ServiceCatalog from './service';
const {assert, expect} = require('chai');
export default function TestCatalog({gid, testConfig={}}={}) {
  describe(`#Catalog `, function() {
    this.timeout(0);
    ServiceCatalog.init(gid);
    let layers, groups, visibleLayers, disabledLayers, tableLayers, geoSpatialLayers,
      filtrableLayers, openAttributeTableLayers;
    before(() => {
      const infoTree = ServiceCatalog.getCatalogInfoTree();
      layers = infoTree.layers;
      groups = infoTree.groups;
      visibleLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'visible'
      });
      disabledLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'disabled'
      });

      tableLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'table'
      });

      geoSpatialLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'geolayer'
      });

      filtrableLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'filtrable'
      });

      openAttributeTableLayers = ServiceCatalog.getOpenAttributeLayers();
    });

    it(`Test catalog groups`, function() {
      const count = testConfig.groups.count;
      expect(groups).to.be.length(count)
    });

    it(`Test catalog Layers count`, () => {
      const count = testConfig.layers.count;
      expect(layers).to.be.length(count);
    });

    it(`Test catalog Layers visible`, () => {
      const count = testConfig.layers.visible.count;
      expect(visibleLayers).to.be.length(count);
    });

    it(`Test catalog Layers disabled`, () => {
      const count = testConfig.layers.disabled.count;
      expect(disabledLayers).to.be.length(count);
    });

    it(`Test catalog Layers table`, () => {
      const count = testConfig.layers.table.count;
      expect(tableLayers).to.be.length(count);
    });

    it(`Test catalog Layers geoSpatial`, () => {
      const count = testConfig.layers.geospatial.count;
      expect(geoSpatialLayers).to.be.length(count);
    });

    it(`Test catalog Layers filtrable`, () => {
      const count = testConfig.layers.filtrable.count;
      expect(filtrableLayers).to.be.length(count);
    });

    it(`Test catalog Layers open attribute table`, async () => {
      const count = testConfig.openattributetable.count;
      const promises = [];
      expect(openAttributeTableLayers).to.be.length(count);
      openAttributeTableLayers.forEach(layer =>{
        promises.push(ServiceCatalog.getDataTable(layer))
      });
      try {
        const responses = await Promise.all(promises);
        expect(responses).to.be.length(count);
      } catch (e) {
        assert.fail();
      }
    });

    it('test catalog menu context', ()=>{
      const context_status = ServiceCatalog.testContextMenu();
      assert.isOk(context_status.status, context_status.message)
    });

    describe('Download formats', ()=>{
      const downloadableLayers = ServiceCatalog.getDownloadableLayers();
      const {csv, shp, gpx, xls} = downloadableLayers;
      Object.keys(downloadableLayers).forEach(type => {
        it(`${type.toUpperCase()}`, async ()=>{
          const count = testConfig.download[type] ? testConfig.download[type].count : 0;
          if (count > 0) {
            const promises = [];
            expect(downloadableLayers[type]).to.be.length(count);
            downloadableLayers[type].forEach(layer => {
              promises.push(layer[`get${type.charAt(0).toUpperCase()}${type.slice(1)}`]())
            });
            const responses = await Promise.all(promises);
            expect(responses).to.be.length(count);
          } else assert.isOk(`${type.toUpperCase()}`, 'skipped')
        })
      })
    })
  })
}
