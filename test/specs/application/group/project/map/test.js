import MapControlsTest from './controls/test'
const Service = require('./service');
const GUI = require('gui/gui');
const {assert, expect} = require('chai');

export default function MapTest ({mapcontrols=[], testConfig={}}={}) {
  describe('#Map', function() {
    this.timeout(0);
    const mapService = GUI.getComponent('map').getService();
    before(async ()=>{
    })
    MapControlsTest({
      mapcontrols,
      mapService,
      testConfig: testConfig.mapcontrols
    })
  })
}