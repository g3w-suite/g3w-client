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



/*
gislib = (function() { 'use strict';
    var Viewer = function(){
        this.map = null;
        this.popup = null;
        this.identifyCtx = {
            callback: function(){},
            layers: []
        };
    };

    Viewer.prototype.addPopup = function(){
        this.popup = new ol.Overlay({
          element: $('<div id="popup" class="ol-popup"><a href="#" id="popup-closer" onclick="return false" class="ol-popup-closer"></a><div id="popup-content"><div class="row gioconda-identify-content-wrapper"></div></div></div>')[0],
          autoPan: true,
          autoPanAnimation: {
            duration: 250
          }
        });
        this.map.addOverlay(this.popup);
    };

    Viewer.prototype.addIdentify = function(callback){
        this.identifyCtx.callback = callback;
        var self = this;
        this.map.on('singleclick',function(evt){
            if (self.identifyCtx.layers.length > 0){
                self.identify(evt);
            }
        })
    };

    Viewer.prototype.setIdentifyLayers = function(layers){
        this.identifyCtx.layers = layers;
    };

    Viewer.prototype.identify = function(evt){
        var self = this;
        this.closePopup();
        var layer = this.identifyCtx.layers[0];
        var source = layer.getSource();
        if (source.getGetFeatureInfoUrl) {
            var url = source.getGetFeatureInfoUrl(evt.coordinate, evt.map.getView().getResolution(), 'EPSG:3857',{
                    'INFO_FORMAT' : "application/vnd.ogc.gml",
                    'LAYERS' : layer.get('name'),
                    'QUERY_LAYERS' : layer.get('name'),
                    'FEATURE_COUNT' : 1,
                    'FI_POINT_TOLERANCE':10
                }
            );
            var urlParams = url.substring(url.indexOf('?'),url.length);

            $.get("/cgi-bin/qgis_mapserv.fcgi"+urlParams).done(function(data){
                var gmlf = new ol.format.GML2();
                var feats = gmlf.readFeatures(data);
                if(feats.length>0){
                    var feat = feats[0];
                    var resultContent = feat.getProperties();
                    var geometry_ = feat.getGeometry();
                    var geometry;
                    if(geometry_ instanceof ol.geom.Point){
                        geometry = geometry_;
                    }
                    else{
                        geometry = geometry_.getPoint(0);
                    }
                    angular.extend(resultContent,{
                        evtCoordinate: evt.coordinate,
                        geometry: geometry
                    });
                    self.identifyCtx.callback(resultContent);
                }
            })
        }
    }

    Viewer.prototype.addBaseLayer = function(){
        var layer = new ol.layer.Tile({
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
        })
        this.map.addLayer(layer);
    };

    Viewer.prototype.addWMSLayer = function(layerObj){
        var layer = new ol.layer.Image({
            name: layerObj.name,
            opacity: 1.0,
            source: new ol.source.ImageWMS({
                url: layerObj.url,
                params: {
                    LAYERS: layerObj.name,
                    VERSION: '1.1.1',
                    TRANSPARENT: true,
                }
            }),
            visible:layerObj.visible,
        });
        this.map.addLayer(layer);
        return layer;
    };

    Viewer.prototype.closePopup = function(){
        this.popup.setPosition(undefined);
        this.popup.getElement().blur();
    };

    return {
        createViewer: function(id,viewoptions) {
            var map = new ol.Map({
                controls: [
                    new ol.control.Zoom(),
                    //new this.centerControl(),
                    //new this.selectControl()
                ],
                interactions: ol.interaction.defaults().extend([
                  new ol.interaction.DragRotate(),
                  //this.selectInteraction
                ]),
                ol3Logo: false,
                target: id,
                //overlays: [this.popup],
                view: new ol.View(viewoptions)
              });

            //var offset = $(map.getViewport()).offset();
            //$("#legend").offset({ top: offset.top+10, left: offset.left+10 });
            var viewer = new Viewer();
            viewer.map = map;
            return viewer;
        }
    }
})();

if (typeof define === 'function' && define.amd) define(function() { return gislib; });
else if (typeof module !== 'undefined') module.exports = gislib;
else if (typeof self !== 'undefined') self.gislib = gislib;
else window.gislib = gislib;
*/