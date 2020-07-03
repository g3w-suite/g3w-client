import ServiceCataolog from './service';
const {assert, expect} = require('chai');
export default function TestCatalog({gid, testConfig={}}={}) {
  const infoLayersTree = ServiceCataolog.getCatalogInfoTree(gid);
  describe(`#Catalog `, async function() {
    it(`Test catalog groups`, function() {
      const count = testConfig.groups.count;
      expect(infoLayersTree.groups).to.be.length(count)
    })
    it(`Test catalog Layers`, function() {
      const count = testConfig.layers.count;
      const testDisabledLayersCount = testConfig.layers.disabled.count;
      const testVisibleLayersCount = testConfig.layers.visible.count;
      const disabledLayers = infoLayersTree.layers.filter(layer => layer.disabled);
      const visibleLayers = infoLayersTree.layers.filter(layer => layer.visible);
      expect(infoLayersTree.layers).to.be.length(count)
      expect(disabledLayers).to.be.length(testDisabledLayersCount)
    })
  })
}
