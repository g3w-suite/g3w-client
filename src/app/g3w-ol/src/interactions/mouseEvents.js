// gis3wlib._interaction.prototype.addIdentify = function(callback) {
//        this.identifyCtx.callback = callback;
//        var self = this;
//        this.map.on('singleclick',function(evt) {
//            if (self.identifyCtx.layers.length > 0) {
//                self.identify(evt);
//            }
//        })
// };
//
// gis3wlib._interaction.prototype.setIdentifyLayers = function(layers) {
//        this.identifyCtx.layers = layers;
// };
//
// gis3wlib._interaction.prototype.identify = function(evt) {
//        var self = this;
//        this.closePopup();
//        var layer = this.identifyCtx.layers[0];
//        var source = layer.getSource();
//        if (source.getGetFeatureInfoUrl) {
//            var url = source.getGetFeatureInfoUrl(evt.coordinate, evt.map.getView().getResolution(), 'EPSG:3857',{
//                    'INFO_FORMAT' : "application/vnd.ogc.gml",
//                    'LAYERS' : layer.get('name'),
//                    'QUERY_LAYERS' : layer.get('name'),
//                    'FEATURE_COUNT' : 1,
//                    'FI_POINT_TOLERANCE':10
//                }
//            );
//            var urlParams = url.substring(url.indexOf('?'),url.length);
//
//            $.get("/cgi-bin/qgis_mapserv.fcgi"+urlParams).done(function(data) {
//                var gmlf = new ol.format.GML2();
//                var feats = gmlf.readFeatures(data);
//                if(feats.length>0) {
//                    var feat = feats[0];
//                    var resultContent = feat.getProperties();
//                    var geometry_ = feat.getGeometry();
//                    var geometry;
//                    if(geometry_ instanceof ol.geom.Point) {
//                        geometry = geometry_;
//                    }
//                    else{
//                        geometry = geometry_.getPoint(0);
//                    }
//                    angular.extend(resultContent,{
//                        evtCoordinate: evt.coordinate,
//                        geometry: geometry
//                    });
//                    self.identifyCtx.callback(resultContent);
//                }
//            })
//        }
// }
//
//
//
