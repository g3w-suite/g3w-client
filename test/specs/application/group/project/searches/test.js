const {assert, expect} = require('chai');
const SearchService = require('gui/search/vue/panel/searchservice');
export default function TestSearches({searches=[], testConfig={}}={}) {
  describe('#Test searches', function() {
    it(`count searches`, function() {
      const count = testConfig.count;
      expect(searches).to.be.length(count)
    })
    testConfig.searches.forEach(searchTest => {
      const {id, count, attributes} = searchTest;
      const search = searches.find(search => search.id === searchTest.id);
      const service = new SearchService(search);
      Object.entries(attributes).forEach(([attribute, value]) => {
        service.changeInput({
          attribute,
          value
        })
      })
      it(`#search id[${id}] count [${count}]`, async function(){
        const results = await service.doSearch();
        expect(results.data[0].features).to.be.length(count)
      })
    })
  })
}
