var t = require('core/i18n/i18n.service').t;
var GUI = require('gui/gui');
var GeocodingService = require('gui/components/geocoding/geocodingservice');

Vue.component("geocoder",{
  template: require("gui/components/geocoding/geocoding.html"),
  props: ['type'],
  data: function(){
    return {
      query: "",
      placeholder: t("street_search")
    }
  },
  methods: {
    search: function(e){
      e.preventDefault();
      var query = this.query;
      this.service.search(query);
    }
  },
  ready: function(){
    var self = this;
    this.service = GeocodingService[this.type];
    this.service.on("results",function(){
      self.query = "";
    })
  }
});
