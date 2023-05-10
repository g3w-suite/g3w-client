import ApplicationState from 'store/application-state';
import ScriptsRegister from 'store/scripts';
import GUI from 'services/gui';
const utils = require('core/utils/ol');
const {areCoordinatesEqual} = require('core/utils/geo');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');

const GoogleStreetViewApiUrl = `https://maps.googleapis.com/maps/api/`;

const RouteControl = function(options={}) {

  /**
   * Route layer (Linestring) returned by google api
   */
  this.routeLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style(){
      return [new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'blue',
          width: 3,
          lineDash: [10, 10]
        })
      }),
        //Implement style for LineString vertices
        new ol.style.Style({
          image: new ol.style.Circle({
            radius: 3,
            fill: new ol.style.Fill({
              color: 'orange',
            })
          }),
          geometry: (feature) => {
            const coordinates = feature.getGeometry().getCoordinates();
            return new ol.geom.MultiPoint(coordinates);
          }
        })]
    }
  });

  const source = new ol.source.Vector();

  //Point layer use to add start, end pont and possible new  place
  this.pointsLayer = new ol.layer.Vector({
    source,
    style: (feature) => {
      const position = feature.get('position');
      switch (position) {
        case 0:
          return [new ol.style.Style({
            image: new ol.style.Circle({
              radius: 8,
              stroke: new ol.style.Stroke({
                color: 'white',
                width: 2
              }),
              fill: new ol.style.Fill({
                color: 'green'
              })
            })
          })]
        case (this.pointsLayer.getSource().getFeatures().length - 1):
          return [new ol.style.Style({
            image: new ol.style.Circle({
              radius: 8,
              stroke: new ol.style.Stroke({
                color: 'white',
                width: 2
              }),
              fill: new ol.style.Fill({
                color: 'red'
              })
            })
          })]
        default:
          return [new ol.style.Style({
            image: new ol.style.Circle({
              radius: 6,
              stroke: new ol.style.Stroke({
                color: 'grey',
                width: 4
              })
            })
          })]
      }
    }
  })

  this.projection = options.projection;

  const _options = {
    offline: false,
    visible: true, // always visible. Only change behavior if exist or not
    name: "route",
    clickmap: true, // set ClickMap
    customClass: GUI.getFontClass('route'),
    interactionClass: ol.interaction.Draw,
    interactionClassOptions: {
      source,
      type: 'Point'
    }
  };

  this.modifyInteraction = new ol.interaction.Modify({
    source,
    deleteCondition: (event) => {
      if (ol.events.condition.doubleClick(event)) {
        const features = this._map.getFeaturesAtPixel(event.pixel, {
          layerFilter: (layer) =>{
            return layer === this.pointsLayer;
          }
        })
        if (features){
          features.forEach(feature => {
            this.pointsLayer.getSource().removeFeature(feature)
          })

          this.updateRoute();
        }
        return true;
      }
      return false;
    }
  })

  this.snapInteraction = new ol.interaction.Snap({
    source: this.routeLayer.getSource()
  })

  //get script script
  if (ApplicationState.keys.vendorkeys.google) {
    /**
     * load script google maps api
     */
    ScriptsRegister.load({
      url: `${GoogleStreetViewApiUrl}js?key=${ApplicationState.keys.vendorkeys.google}`
    })

  }

  /***/

  //store map
  this._map = null;

  options = utils.merge(options,_options);

  InteractionControl.call(this,options);
};

ol.inherits(RouteControl, InteractionControl);

const proto = RouteControl.prototype;

proto.setMap = function(map) {
  this._map = map;
  InteractionControl.prototype.setMap.call(this, map);

  //this.setProjection(this._map.getView().getProjection());
  this._map.addLayer(this.routeLayer);
  this._map.addLayer(this.pointsLayer);

  this._map.addInteraction(this.modifyInteraction);
  this._map.addInteraction(this.snapInteraction);


  this.modifyInteraction.on('modifyend', async (evt) => {
    try {
      await this.showRoute();
    } catch(err){}

  })

  this._interaction.on('drawend', ({feature}) => {
    this.updateRoute();
  });
};

proto.updateRoute = function(){
  setTimeout(() => {
    this.pointsLayer.getSource().getFeatures().forEach((feature, index) => {
      feature.set('position', index);
    })
    this.showRoute();
  })
}

/**
 * Method to show StreetView depending of key and keyError
 * @param coordinate
 */
proto.showRoute = function(){
  return new Promise((resolve, reject) => {
    this.routeLayer.getSource().clear();
    const pointsLength = this.pointsLayer.getSource().getFeatures().length;
    if (pointsLength > 1) {
      const points = this.pointsLayer.getSource().getFeatures()
        .sort((featureA, featureB) => (featureA.get('position') - featureB.get('position')) )
        .map(feature => ol.proj.transform(feature.getGeometry().getCoordinates(), this.projection, 'EPSG:4326'))
      const directionsService = new window.google.maps.DirectionsService();
      const origin = new window.google.maps.LatLng(points[0][1],points[0][0]);
      const waypoints = pointsLength > 2 ? points.slice(1, pointsLength - 1).map(([lng, lat]) => {
        return {
          location: new window.google.maps.LatLng(lat, lng)
        };
      }) : [];
      const destination = new window.google.maps.LatLng(points[pointsLength-1][1],points[pointsLength-1][0]);
      const request = {
        origin,
        destination,
        waypoints,
        travelMode: 'DRIVING'
      };
      directionsService.route(request,  (response, status) => {
        if (status === 'OK') {
          this.routeLayer
            .getSource()
            .addFeature(new ol.Feature({
              geometry: new ol.geom.LineString(response.routes[0].overview_path.map(({lat, lng}) =>{
                return ol.proj.transform([lng(), lat()], 'EPSG:4326', this.projection)
              }))
            }))

          resolve();
        } else {
          reject();
        }
      });
    }
  })
};

/**
 * Clear function
 */
proto.clear = function() {
  this.routeLayer.getSource().clear();
  this.pointsLayer.getSource().clear();
  this._map.removeInteraction(this.modifyInteraction);
};

proto.toggle = function(toggle) {
  InteractionControl.prototype.toggle.call(this, toggle);
  if (!this.isToggled()) this.clear();
  else {
    this._map.addInteraction(this.modifyInteraction);
    this._map.addInteraction(this.snapInteraction);
  }
};

module.exports = RouteControl;