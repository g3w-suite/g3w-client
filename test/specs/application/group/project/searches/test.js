import SearchService from 'services/data-search';
const {assert, expect} = require('chai');
export default function TestSearches({searches=[], testConfig={}}={}) {
  describe('#Test searches', function() {
    const count = testConfig.count;
    it(`count searches`, function() {
      expect(searches).to.be.length(count)
    });
    count > 0 && testConfig.searches.forEach(searchTest => {
      const {id, count, forminput} = searchTest;
      const search = searches.find(search => search.id === searchTest.id);
      const service = new SearchService(search);
      service.changeInput({
        id:forminput.id,
        attribute:forminput.attribute,
        value: forminput.value
      })
      // it(`#search id[${id}] count [${count}]`, async function(){
      //   const results = await service.doSearch();
      //   expect(results.data[0].features).to.be.length(count)
      // })
    })
  })
}
