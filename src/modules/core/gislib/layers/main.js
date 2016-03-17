/* GET LAYER BY NAME */



_gis3wlib._layer.prototype.addLayer = function(type,layerObj){

    var layer = this.buildLayer(type,layerObj);
    this.map.addLayer(layer);


};

_gis3wlib._layer.prototype.buildLayer = function(type,layerObj){

    var layer;
    /* type:

            'base' : baseMap Layer;
            'vector': Vector Layer;
            'raster': raster Layer;

    */


    layer = this['build'+type+'Layer'](layerObj);


    return layer;


};

_gis3wlib._layer.prototype.getLayerByName = function(layer_name) {

                var layers = this.map.getLayers();
                var length = layers.getLength();
                for (var i = 0; i < length; i++) {
                    if (layer_name === layers.item(i).get('name')) {
                        return layers.item(i);
                    }
                }
                return null;
};

/* REMOVE NAME BY NAME */

_gis3wlib._layer.prototype.removeLayerByName = function(layer_name){

        var layer = this.getLayerByName(layer_name);
        if (layer){

           this.map.removeLayer(layer);

    }


};

_gis3wlib._layer.prototype.getActiveLayers = function(){

                      var activelayers = [];
                      this.map.getLayers().forEach(function(layer) {
                             var props = layer.getProperties();
                             if (props.basemap != true && props.visible){

                                 activelayers.push(layer);

                             }

                      });
                      return activelayers;

}
_gis3wlib._layer.prototype.getLayersNoBase = function(){

                      var layers = [];
                      this.map.getLayers().forEach(function(layer) {
                             var props = layer.getProperties();
                             if (props.basemap != true){

                                 layers.push(layer);

                             }

                      });
                      return layers;

}