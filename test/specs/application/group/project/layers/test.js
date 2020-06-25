export default function TestLayers({projectId, layers=[], config={}}={}) {
  describe(`#ProjectId[${projectId}]: test layers `, function() {
    it(`Project[${projectId}]: layers is array`, function() {
      assert.instanceOf(layers, Array)
    });
    it(`Project[${projectId}]: count baselayer`, function() {
      if (config.baselayers) {
        const count = config.baselayers.count;
        const baseLayers = layers.filter(layer => layer.baselayer);
        expect(baseLayers).to.be.length(count)
      } else {
        console.log('No base layer to test');
        expect([]).to.be.length(0);
      }
    })
  })
}