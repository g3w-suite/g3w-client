const {assert, expect} = require('chai');
const SearchService = require('gui/search/vue/panel/searchservice');
export default function TestSearches({projectId, searches=[], config={}}={}) {
  describe(`#ProjectId[${projectId}]: test relations `, function() {
    it(`count searches`, function() {
      const count = config.count;
      expect(searches).to.be.length(count)
    })
    for (const searchTest of config.searches) {
      const {id, count, attributes} = searchTest;
      it(`#search id[${id}] count [${count}]`, async function (){
        const search = searches.find(search => search.id === searchTest.id);
        const service = new SearchService(search);
        Object.entries(attributes).forEach(([attribute, value]) => {
          service.changeInput({
            attribute,
            value
          })
        })
        const results = await service.doSearch();
        expect(results.data[0].features).to.be.length(count)
      })
    }
  })
}
