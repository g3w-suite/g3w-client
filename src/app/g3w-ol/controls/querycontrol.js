import GUI from 'services/gui';
import ProjectsRegistry from 'store/projects';
import DataRouterService from 'services/data';

const {throttle} = require('core/utils/utils');
const utils = require('core/utils/ol');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

const QueryControl = function(options={}){
  const _options = {
    offline: false,
    name: "querylayer",
    tipLabel: "sdk.mapcontrols.query.tooltip",
    label: options.label || "\uea0f",
    clickmap: true, // set ClickMap
    interactionClass: PickCoordinatesInteraction,
  };
  options = utils.merge(options, _options);
  InteractionControl.call(this, options);
};

ol.inherits(QueryControl, InteractionControl);

const proto = QueryControl.prototype;

proto.setMap = function(map) {
  let eventKey = null;
  if (map) {
    this.on('toggled', ({toggled}) => {

      if (true === toggled) {
        if (null === eventKey) {

          eventKey = map.on('singleclick', throttle(async event => {
            const coordinates = event.coordinate;
            GUI.closeOpenSideBarComponent();
            try {
              const {data=[]} = await DataRouterService.getData('query:coordinates', {
                inputs: {
                  coordinates,
                  feature_count: ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
                  query_point_tolerance: ProjectsRegistry.getCurrentProject().getQueryPointTolerance,
                  multilayers: ProjectsRegistry.getCurrentProject().isQueryMultiLayers(this.name),
                }
              });
              data.length && GUI.getService('map').showMarker(coordinates);
            } catch(error) {}

            this.dispatchEvent({
              type: 'picked',
              coordinates
            });

          }));

          this.setEventKey({
            eventType: 'picked',
            eventKey
          });
        }
      } else {
        ol.Observable.unByKey(eventKey);
        eventKey = null;
      }
    });

  }

  InteractionControl.prototype.setMap.call(this, map);
};


module.exports = QueryControl;
