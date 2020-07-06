import ServiceCatalog from './service';
const {assert, expect} = require('chai');
export default function TestCatalog({gid, testConfig={}}={}) {
  const {layers, groups} = ServiceCatalog.getCatalogInfoTree(gid);
  describe(`#Catalog `, async function() {
    it(`Test catalog groups`, function() {
      const count = testConfig.groups.count;
      expect(groups).to.be.length(count)
    })
    it(`Test catalog Layers`, function() {
      const count = testConfig.layers.count;
      const testDisabledLayersCount = testConfig.layers.disabled.count;
      const testVisibleLayersCount = testConfig.layers.visible.count;
      const testTableLayersCount = testConfig.layers.table.count;
      const testVectorLayersCount = testConfig.layers.vector.count;
      const disabledLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'disabled'
      });
      const visibleLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'visible'
      });
      const tableLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'table'
      });
      const vectorLayers = ServiceCatalog.getLayersByType({
        layers,
        type: 'vector'
      });
      expect(layers).to.be.length(count);
      expect(disabledLayers).to.be.length(testDisabledLayersCount);
      expect(visibleLayers).to.be.length(testVisibleLayersCount);
      expect(tableLayers).to.be.length(testTableLayersCount);
      expect(vectorLayers).to.be.length(testVectorLayersCount);
    })
  })
}
