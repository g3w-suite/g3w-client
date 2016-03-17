/*BASE LAYERS */

_gis3wlib._layer.prototype.baseLayer = {};

_gis3wlib._layer.prototype.getBaseLayer = function(type){


        return this.baseLayer[type]

}

_gis3wlib._layer.prototype.buildbaseLayer = function(baseOpts){


    return baseLayer;


}

_gis3wlib._layer.prototype.baseLayer.OSM = new ol.layer.Tile({
          source: new ol.source.OSM({
            attributions: [
              new ol.Attribution({
                html: 'All maps &copy; ' +
                    '<a href="http://www.openstreetmap.org/">OpenStreetMap</a>'
              }),
              ol.source.OSM.ATTRIBUTION
            ],
            url: 'http://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            crossOrigin: null
          }),
          id: 'osm',
          title: 'OSM',
          basemap: true
});

_gis3wlib._layer.prototype.getActiveBaseLayer = function(){



};


_gis3wlib._layer.prototype.baseLayer.BING = {};

_gis3wlib._layer.prototype.baseLayer.BING.Road = new ol.layer.Tile({
              name:'Road',
              visible: false,
              preload: Infinity,
              source: new ol.source.BingMaps({
                  key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
                  imagerySet: 'Road'
                    // use maxZoom 19 to see stretched tiles instead of the BingMaps
                    // "no photos at this zoom level" tiles
                    // maxZoom: 19
              }),
              basemap: true
});

_gis3wlib._layer.prototype.baseLayer.BING.AerialWithLabels = new ol.layer.Tile({
              name: 'AerialWithLabels',
              visible: true,
              preload: Infinity,
              source: new ol.source.BingMaps({
                  key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
                  imagerySet: 'AerialWithLabels'
                    // use maxZoom 19 to see stretched tiles instead of the BingMaps
                    // "no photos at this zoom level" tiles
                    // maxZoom: 19
              }),
              basemap: true
});

_gis3wlib._layer.prototype.baseLayer.BING.Aerial = new ol.layer.Tile({
              name: 'Aerial',
              visible: false,
              preload: Infinity,
              source: new ol.source.BingMaps({
                  key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
                  imagerySet: 'Aerial'
                    // use maxZoom 19 to see stretched tiles instead of the BingMaps
                    // "no photos at this zoom level" tiles
                    // maxZoom: 19
              }),
              basemap: true
});





_gis3wlib._layer.prototype.addBaseLayer = function(options){
        var layer;
        var options = options || {};
        (options.type) ?  layer = this.baseLayer[type]:  layer = this.baseLayer.BING.Aerial;

        this.map.addLayer(layer);

};


_gis3wlib._layer.prototype.changeBaseLayer = function(layer_name){

    var base_layer = this.getLayerByName(layername);
    var layers = this.map.getLayers();
    layers.insertAt(0, base_layer);

}