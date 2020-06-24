const {assert, expect} = require('chai');
export default function TestSearches({projectId, searches=[], config={}}={}) {
  describe(`#ProjectId[${projectId}]: test relations `, function() {
    it(`count searches`, function() {
      const count = config.count;
      expect(searches).to.be.length(count)
    })
    for (const searchTest of config.searches) {
      const promise = new Promise((resolve, reject) => {
        setTimeout(()=>{
          resolve();
        }, 1000)
      })
      it(`#search id[${searchTest.id}]`, async function (){
        await promise;
        const search = searches.find(search => search.id === searchTest.id);
        assert.equal(search.id, 1)
      })
    }
  })
}
