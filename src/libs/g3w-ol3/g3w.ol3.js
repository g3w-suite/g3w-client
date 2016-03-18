//* GIS3Wlib OBJECT *//
var _gis3wlib = {


        _map : function(mapOpts){

               this.setMap(mapOpts);

        },

       /* Parametri:

            dep : oggetto contenete dipende dell'oggetto;
            layerOpts : oggetto configurazione oggetto layers;

       */
       _layer : function(dep,layersOpts){

                this.map = dep.map || {};


        },

        _control : function(dep,controlsOpts){

            this.map = dep.map || {};

        },

        _style : function(dep,styleOpts){

            this.map = dep.map || {};

        },

        _interaction : function(dep){

            this.map = dep.map || {};

        }


};


var gis3wlib = gis3wlib || {

            createViewer : function(mapOpts,layersOpts,controlsOpts,styleOpts) {

                    var map = new _gis3wlib._map(mapOpts);
                    mappa = map;

                    return  {

                        map : map,
                        layer : new _gis3wlib._layer({map:map.map},layersOpts),
                        control : new _gis3wlib._control({map:map.map},controlsOpts),
                        style : new _gis3wlib._style({map:map.map},styleOpts),
                        interaction : new _gis3wlib._interaction({map:map.map})

                    }
            }

}
