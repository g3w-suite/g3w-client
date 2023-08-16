import ApplicationState from 'store/application-state';
import ScriptsRegister from 'store/scripts';
import GUI from 'services/gui';

const MapRouteComponent = require('gui/maproute/vue/maproute');
const utils = require('core/utils/ol');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');

const GoogleStreetViewApiUrl = `https://maps.googleapis.com/maps/api/`;

const TRAVELMODES = [
  {
    value: 'DRIVING',
    iconClass: 'car'
  },
  {
    value: 'WALKING',
    iconClass: 'walking'
  },
  {
    value: 'BICYCLING',
    iconClass: 'bicycle'
  },
  {
    value: 'TRANSIT',
    iconClass: 'bus'
  }
]


const RouteControl = function(options={}) {

  /**
   * Route layer (Linestring) returned by google api
   */
  this.routeLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style(){
      return [new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#03a9f4',
          width: 5
        })
      })]
    }
  });

  this.travelMode = TRAVELMODES[0].value;

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
                width: 4
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
                width: 4
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
                color: this.travelMode === 'TRANSIT' ? 'transparent' : 'black',
                width: 4
              })
            })
          })]
      }
    }
  })

  // projection of the map
  this.projection = options.projection;

  const _options = {
    offline: false,
    name: "route",
    clickmap: true, // set ClickMap,
    visible: false, // set false at beginning
    customClass: GUI.getFontClass('route'),
    interactionClass: ol.interaction.Draw,
    interactionClassOptions: {
      source,
      type: 'Point',
      condition(event){
        //draw point only if click (left mouse)
        return event.pointerEvent.buttons === 1;
      }
    },
    /**
     * @since 3.9.0
     */
    controlItems: {
      component: {
          data() {
            return {
              travelMode: TRAVELMODES[0].value,
              travelModes: TRAVELMODES
            }
          },
          template: `
          <div style="background: #FFFFFF; border-radius: 3px;">
            <section style="display: flex; border-radius: 3px; border: 1px solid #eeeeee">
              <span v-for="mode in travelModes" :key="mode.value" 
                @click.stop="setTravelMode(mode.value)"    
                :style="{backgroundColor: mode.value === travelMode ? '#cccccc' : 'transparent'}"    
                :class="{'skin-color': mode.value === travelMode}"    
                style="padding: 10px; margin: 5px; border-radius: 3px">
                  <i
                    style="font-size: 1.3em; width: 20px; text-align: center; cursor: pointer" 
                    :class="g3wtemplate.getFontClass(mode.iconClass)">
                  </i>
              </span>
            </section>
          </div>`,
          methods: {
            setTravelMode(travelMode){
              this.travelMode = travelMode;
            }
          },
          watch: {
            'travelMode': travelMode => this.setTravelMode(travelMode)
          },
          created() {
            GUI.setCloseUserMessageBeforeSetContent(false);
          },
          beforeDestroy() {
            GUI.setCloseUserMessageBeforeSetContent(true);
          }
        }
    }
  };

  this.modifyInteraction = new ol.interaction.Modify({
    source,
  })

  this.snapInteraction = new ol.interaction.Snap({
    source: this.routeLayer.getSource()
  })


  //store map
  this._map = null;

  options = utils.merge(options,_options);

  InteractionControl.call(this, options);

  //get script and set visibility
  if (ApplicationState.keys.vendorkeys.google) {
    this.setVisible(true);
    /*
    * @TODO Need to check if route is enabled with key
    * */
    /**
     * load script google maps api
     */
    ScriptsRegister.load({
      url: `${GoogleStreetViewApiUrl}js?key=${ApplicationState.keys.vendorkeys.google}`
    });

    this.closeContentHandlerListener = this.clear.bind(this);
  }
  /***/
};

ol.inherits(RouteControl, InteractionControl);

const proto = RouteControl.prototype;

/**
 * @TODO
 * @param map
 */
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

/**
 * @TODO
 * @param mode
 */
proto.setTravelMode = function(mode){
  this.travelMode = mode;
  this.pointsLayer.getSource().dispatchEvent('change');
  this.showRoute();
};

/**
 * @TODO
 */
proto.updateRoute = function(){
  setTimeout(() => {
    this.pointsLayer.getSource().getFeatures().forEach((feature, index) => {
      feature.set('position', index);
    })
    this.showRoute();
  })
}

/**
 * @TODO
 * @param index
 */
proto.zoomToPoint = function(index){
  GUI.getService('map').zoomToFeatures([this.pointsLayer.getSource().getFeatures()[index]])
};

/**
 * @TODO
 * @param index
 */
proto.deletePoint = function(index){
  this.pointsLayer.getSource().removeFeature(this.pointsLayer.getSource().getFeatures()[index]);
  setTimeout(()=>{
    this.updateRoute();
  })
};


/**
 * Method to show StreetView depending of key and keyError
 * @param coordinate
 */
proto.showRoute = function(){
  return new Promise((resolve, reject) => {
    this.routeLayer.getSource().clear();
    const pointsLength = this.pointsLayer.getSource().getFeatures().length;
    if (pointsLength > 1) {
      GUI.disableApplication(true);
      const directionsService = new window.google.maps.DirectionsService();
      const points = this.pointsLayer.getSource().getFeatures()
          .sort((featureA, featureB) => (featureA.get('position') - featureB.get('position')) )
          .map(feature => ol.proj.transform(feature.getGeometry().getCoordinates(), this.projection, 'EPSG:4326'))
      //@TODO
      const request = {
        origin: new window.google.maps.LatLng(points[0][1],points[0][0]),
        destination: new window.google.maps.LatLng(points[pointsLength-1][1],points[pointsLength-1][0]),
        waypoints: this.travelMode === 'TRANSIT' ? [] :
            pointsLength > 2 ?
                points.slice(1, pointsLength - 1).map(([lng, lat]) => ({location: new window.google.maps.LatLng(lat, lng)})) :
                [] ,
        travelMode: this.travelMode,
        language: ApplicationState.language,
      }

      try {
        directionsService.route(request,  (response, status) => {
          if (status === 'OK') {
            this.routeLayer
              .getSource()
              .addFeature(new ol.Feature({
                geometry: new ol.geom.LineString(response.routes[0].overview_path.map(({lat, lng}) =>{
                  return ol.proj.transform([lng(), lat()], 'EPSG:4326', this.projection)
                }))
              }))
            // get response route bounds
            const routeBounds = ol.proj.transformExtent([
              response.routes[0].bounds.Ga.lo,
              response.routes[0].bounds.Ua.lo,
              response.routes[0].bounds.Ga.hi,
              response.routes[0].bounds.Ua.hi
            ], 'EPSG:4326', this.projection);


            /**
             * Register vue component events
             */
            const content = new MapRouteComponent({
              legs: response.routes[0].legs,
              showLine: this.showLine.bind(this)
            });
            content.internalComponent.$on('zoom-to-point', (index) => this.zoomToPoint(index));
            content.internalComponent.$on('delete-point', (index) => this.deletePoint(index));
            content.internalComponent.$on('zoom-to-route', () => {
              GUI.getService('map').zoomToExtent(routeBounds);
            });
            /**
             * end
             */
            GUI.setContent({
              content,
              closable: true,
              title: 'Map Route'
            });
            GUI.on('closecontent', this.closeContentHandlerListener);
            resolve();
          } else {
            reject();
          }
        });
      } catch(err){}
      finally {
        GUI.disableApplication(false);
      }
    } else {
      GUI.closeContent();
    }
  })
};

/**
 * @TODO
 * @param polyline
 */
proto.showLine = function({polyline}){
  const vertex = google.maps.geometry.encoding.decodePath(polyline.points);
  console.log(vertex)
  GUI.getService('map')
    .highlightGeometry(new ol.geom.LineString(vertex.map(({lat, lng}) => ol.proj.transform([lng(), lat()], 'EPSG:4326', this.projection))), {zoom: false})
};

/**
 * Clear function
 */
proto.clear = function() {
  this.routeLayer.getSource().clear();
  this.pointsLayer.getSource().clear();
  this._map.removeInteraction(this.modifyInteraction);
  //remove event listener
  GUI.off('closecontent', this.closeContentHandlerListener);
  GUI.closeContent();
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