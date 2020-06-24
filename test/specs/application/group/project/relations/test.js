export default function TestRelations({projectId, relations=[], config={}}={}) {
  describe(`#ProjectId[${projectId}]: test relations `, function() {
    it(`count relations`, function() {
      const count = config.count;
      expect(relations).to.be.length(count)
    })
  })
}
