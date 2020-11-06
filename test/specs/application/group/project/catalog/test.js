import ServiceCatalog from './service';
const {assert, expect} = require('chai');
export default function TestCatalog({gid, testConfig={}}={}) {
  const {layers, groups} = ServiceCatalog.getCatalogInfoTree(gid);
  describe(`#Catalog `, function() {
   const visibleLayers = ServiceCatalog.getLayersByType({
     layers,
     type: 'visible'
   });
   const disabledLayers = ServiceCatalog.getLayersByType({
     layers,
     type: 'disabled'
   });
   const tableLayers = ServiceCatalog.getLayersByType({
     layers,
     type: 'table'
   });
   const geoSpatialLayers = ServiceCatalog.getLayersByType({
     layers,
     type: 'geolayer'
   });
   const filtrableLayers = ServiceCatalog.getLayersByType({
     layers,
     type: 'filtrable'
   });

   it(`Test catalog groups`, function() {
     const count = testConfig.groups.count;
     expect(groups).to.be.length(count)
    })

   it(`Test catalog Layers count`, () => {
      const count = testConfig.layers.count;
      expect(layers).to.be.length(count);
    })
    // it(`Test catalog Layers visible`, () => {
    //   const count = testConfig.layers.visible.count;
    //   expect(visibleLayers).to.be.length(count);
    // })
    it(`Test catalog Layers disabled`, () => {
      const count = testConfig.layers.disabled.count;
      expect(disabledLayers).to.be.length(count);
    })
    it(`Test catalog Layers table`, () => {
      const count = testConfig.layers.table.count;
      expect(tableLayers).to.be.length(count);
    })
    it(`Test catalog Layers geoSpatial`, () => {
      const count = testConfig.layers.geospatial.count;
      expect(geoSpatialLayers).to.be.length(count);
    })
    it(`Test catalog Layers filtrable`, () => {
      const count = testConfig.layers.filtrable.count;
      expect(filtrableLayers).to.be.length(count);
    })
  })
}
