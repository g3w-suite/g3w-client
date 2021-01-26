const GUI = require('gui/gui');
const printService = require('gui/print/printservice');
const XHR = require('core/utils/utils').XHR;
let service;

const init = function() {
  service = GUI.getComponent('print').getService();
  service._mapService = GUI.getComponent('map').getService();
  service._map = service._mapService.getMap();
  service._setPrintArea();
  service.state.scala = service.state.scale[0].value;
  return service;
}

const doPrint = async function(){
  return service.print()
}

export default {
  doPrint,
  init
}