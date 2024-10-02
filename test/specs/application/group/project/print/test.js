import printService from './service';
const {assert, expect} = require('chai');
export default function TestSearches({print=[]}={}) {
  describe('#Test prints', function() {
    before(()=>{
      print.length && printService.init();
    })
    print.forEach(config => {
      it(`Print template ${config.name}`, async() => {
        try {
          const response = await printService.doPrint();
          assert.isOk(true);
        } catch (e) {
          assert.fail();
        }
      })
    })
  })
}
