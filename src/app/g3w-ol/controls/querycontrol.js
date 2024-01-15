import GUI               from 'services/gui';
import ProjectsRegistry  from 'store/projects';
import DataRouterService from 'services/data';
import { mergeOptions }  from 'utils/mergeOptions';

const { throttle }               = require('utils');
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

  options = mergeOptions(options, _options);

  InteractionControl.call(this, options);
};

ol.inherits(QueryControl, InteractionControl);

const proto = QueryControl.prototype;

/**
 * @param {ol.Map} map
 * 
 * @fires   picked                     fired after map `singleclick` ?
 * @listens InteractionControl~toggled
 */
proto.setMap = function(map) {
 let key = null;

  this.on('toggled', ({ toggled }) => {
    if (true !== toggled) {
      ol.Observable.unByKey(key);
      key = null;
    } else if (null === key && map) {
      key = this.getInteraction().on('picked', throttle(evt => this.runQuery({coordinates: evt.coordinate })));
    }
  });

  this.setEventKey({
    eventType: 'picked',
    eventKey: this.on('picked', this.runQuery)
  });

  InteractionControl.prototype.setMap.call(this, map);
};

/**
 * @since 3.8.0
 * 
 * @param event
 */
proto.runQuery = async function({coordinates}) {
  GUI.closeOpenSideBarComponent();
  try {
    const project = ProjectsRegistry.getCurrentProject();
    await DataRouterService.getData('query:coordinates', {
      inputs: {
        coordinates,
        feature_count: project.getQueryFeatureCount(),
        query_point_tolerance: project.getQueryPointTolerance(),
        multilayers: project.isQueryMultiLayers(this.name),
      }
    });
  } catch(err) {
    console.warn('Error running spatial query: ', err)
  }
};

module.exports = QueryControl;
