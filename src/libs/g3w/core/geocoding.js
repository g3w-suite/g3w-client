function Nominatim(){
  var self = this;
  this.url = "http://nominatim.openstreetmap.org";
  
  this.search = function(query){
    var deferred = $.Deferred();
    var searchUrl = this.url+"/search?format=json&polygon_geojson=1&q="+query;
    $.get(searchUrl,function(result){
      console.log(result);
    });
  };
  
  
}

module.exports = {
  Nominatim: new Nominatim
};
