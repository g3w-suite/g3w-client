var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectService = require('core/project/projectservice').ProjectService;
var MapService = require('core/map/mapservice');

function Nominatim(){
  var self = this;
  this.url = "http://nominatim.openstreetmap.org";
  
  this.search = function(query){
    var deferred = $.Deferred();
    var extent = MapService.extentToWGS84(ProjectService.state.project.extent);
    bboxstring = _.join(extent,',');
    var searchUrl = this.url+"/search?viewboxlbrt="+bboxstring+"&bounded=1&format=json&polygon_geojson=1&q="+query;
    $.get(searchUrl,function(result){
      self.emit("results",result,query);
    });
  };
  
  base(this);
}
inherit(Nominatim,G3WObject);

module.exports = {
  Nominatim: new Nominatim
};
