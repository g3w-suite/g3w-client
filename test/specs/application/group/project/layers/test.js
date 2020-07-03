export default function TestLayers({layers=[], testConfig={}}={}) {
  describe(`#Test layers `, function() {
    it(`Layers is array`, function() {
      assert.instanceOf(layers, Array)
    });
    it(`Count baselayer`, function() {
      if (testConfig.baselayers) {
        const count = testConfig.baselayers.count;
        const baseLayers = layers.filter(layer => layer.baselayer);
        expect(baseLayers).to.be.length(count)
      }
    })
  })
}