import MapControlsTest from './controls/test';
import GUI from 'services/gui';

export default function MapTest ({mapcontrols=[], testConfig={}}={}) {
  describe('#Map', function() {
    this.timeout(0);
    const mapService = GUI.getComponent('map').getService();
    before(async ()=>{});
    MapControlsTest({
      mapcontrols,
      mapService,
      testConfig: testConfig.mapcontrols
    })
  })
}