var t = require('i18n.service');
var GUI = require('g3w/gui/gui');
var GeocodingService = require('g3w/core/geocodingservice');

Vue.component("geocoder",{
  template: require("./geocoding.html"),
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
