export default function TestLayers({projectId, layers=[], config={}}={}) {
  describe(`#ProjectId[${projectId}]: test layers `, function() {
    it(`Project[${projectId}]: layers is array`, function() {
      assert.instanceOf(layers, Array)
    });
    it(`Project[${projectId}]: count base layer`, function() {
      const count = config.baselayers.count;
      const baseLayers = layers.filter(layer => layer.baselayer);
      expect(baseLayers).to.be.length(count)
    })
  })
}