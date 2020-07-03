export default function TestRelations({relations=[], testConfig={}}={}) {
  describe('#Test relations', function() {
    it(`count relations`, function() {
      const count = testConfig.count;
      expect(relations).to.be.length(count);
    })
  })
}
