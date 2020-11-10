import printService from './service';
const {assert, expect} = require('chai');
export default function TestSearches({print=[], testConfig={}}={}) {
  const count = testConfig.count || 0;
  const templates = Array.isArray(testConfig.templates) ? testConfig.templates : [];
  describe('#Test prints', function() {
    before(()=>{
      count && printService.init();
    })
    it(`Count`, function() {
      expect(print).to.be.length(count)
    })
    templates.forEach((template => {
      it(`Print template ${template.name}`, async() => {
        try {
          const response = await printService.doPrint(template)
          assert.isOk(true);
        } catch (e) {
          assert.fail();
        }
      })
    }))
  })
}
