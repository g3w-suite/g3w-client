
/* MAP FUNCTIONS */

_gis3wlib._map.prototype.setMap = function(mapOpts){

   var controls = ol.control.defaults({
                                    attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
                                      collapsible: false
                                    })
   }).extend([new ol.control.Zoom()]);
   var map  = new ol.Map({

                            controls: controls,
                            interactions: ol.interaction.defaults().extend([
                                         new ol.interaction.DragRotate()

                            ]),
                            ol3Logo: false,
                            target: mapOpts.id || 'map',
                            view: new ol.View(mapOpts.view)
              })



    this.map = map;



};


_gis3wlib._map.prototype.updateMap = function(mapObject){



};


_gis3wlib._map.prototype.updateView = function(){



}


_gis3wlib._map.prototype.getMap = function(){

    return this.map;

};

_gis3wlib._map.prototype.setCenter = function(coordinates, zoom){


    var view = this.map.getView();
    view.setCenter(coordinates);
    view.setZoom(zoom);



};

_gis3wlib._map.prototype.getZoom = function(){


    var view = this.map.getView();
    return view.getZoom();



};


