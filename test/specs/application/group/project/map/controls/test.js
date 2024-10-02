const {assert, expect} = require('chai');

export default function MapControls ({mapcontrols, mapService, testConfig}={}) {
  describe('#Map', function() {
    this.timeout(0);
    const nominatim = mapcontrols.find(mapcontrol => mapcontrol === 'nominatim');
    if (nominatim && testConfig.nominatim) {
      describe('test nominatim', function () {
        const {control} = mapService.getMapControls().find(mapcontrol => mapcontrol.id === 'nominatim');
        const searches = testConfig.nominatim.searches || [];
        searches.forEach(search => {
          it(`Search ${search.query}`, async () => {
            try {
              const results = await control.nominatim.query(search.query);
              expect(results).to.be.length(search.count);
            } catch (error) {
              assert.isOk(false);
            }
          })
        })
      })
    }
  })
}