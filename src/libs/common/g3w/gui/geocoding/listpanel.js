var GUI = require('g3w/gui/gui');
var MapService = require('g3w/core/mapservice');

var GeocodingListPanelComponent = Vue.extend({
  template: require('./listpanel.html'),
  methods: {
    goto: function(item){
      var x = parseFloat(item.lon);
      var y = parseFloat(item.lat);
      MapService.goToWGS84([x,y]);
      var geojson = item.geojson;
      MapService.highlightGeometry(geojson,4000,true);
      GUI.closeListing();
    }
  }
});

module.exports = GeocodingListPanelComponent;
