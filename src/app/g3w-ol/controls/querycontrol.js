import GUI from 'services/gui';
import ProjectsRegistry from 'store/projects';
import DataRouterService from 'services/data';

const { throttle }               = require('core/utils/utils');
const utils                      = require('core/utils/ol');
const InteractionControl         = require('g3w-ol/controls/interactioncontrol');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

const QueryControl = function(options = {}){
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

/**
 * @param {ol.Map} map
 * 
 * @listens InteractionControl~toggled
 */
proto.setMap = function(map) {
 let eventSingleClickKey = null;

  this.on('toggled', ({toggled}) => {

    if (true !== toggled) {
      ol.Observable.unByKey(eventSingleClickKey);
      eventSingleClickKey = null;
    } else if (null === eventSingleClickKey && map) {
      // register click on map event. It use to dispatch picked event by control
      eventSingleClickKey = map
        .on('singleclick', throttle(evt => this.dispatchEvent({ type: 'picked', coordinates:evt.coordinate })));
    }
  });

  const eventPickedKey = this.on('picked', this.runQuery);

  this.setEventKey({
    eventType: 'picked',
    eventKey: eventPickedKey
  });

  InteractionControl.prototype.setMap.call(this, map);
};

/**
 * @since 3.8.0
 * @param event
 */
proto.runQuery = async function({coordinates}) {

  GUI.closeOpenSideBarComponent();
  try {
    const project = ProjectsRegistry.getCurrentProject();
    const { data = [] } = await DataRouterService.getData('query:coordinates', {
      inputs: {
        coordinates,
        feature_count: project.getQueryFeatureCount(),
        query_point_tolerance: project.getQueryPointTolerance(),
        multilayers: project.isQueryMultiLayers(this.name),
      }
    });
    if (data.length) {
      GUI.getService('map').showMarker(coordinates);
    }
  } catch(err) {
    console.warn('Error running spatial query: ', err)
  }

};


module.exports = QueryControl;
