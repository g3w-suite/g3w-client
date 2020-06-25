const {assert, expect} = require('chai');
const SearchService = require('gui/search/vue/panel/searchservice');
export default function TestSearches({projectId, searches=[], config={}}={}) {
  describe(`#ProjectId[${projectId}]: test searches `, async function() {
    it(`count searches`, function() {
      const count = config.count;
      expect(searches).to.be.length(count)
    })
    for (const searchTest of config.searches) {
      const {id, count, attributes} = searchTest;
      const search = searches.find(search => search.id === searchTest.id);
      const service = new SearchService(search);
      Object.entries(attributes).forEach(([attribute, value]) => {
        service.changeInput({
          attribute,
          value
        })
      })
      const results = await service.doSearch();
      it(`#search id[${id}] count [${count}]`, function (){
        expect(results.data[0].features).to.be.length(count)
      })
    }
  })
}
