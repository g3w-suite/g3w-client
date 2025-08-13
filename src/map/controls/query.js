/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import ApplicationState           from 'g3w-state';
import GUI                        from 'services/gui';
import DataRouterService          from 'services/data';
import PickCoordinatesInteraction from 'map/interactions/pickcoordinatesinteraction';
import { throttle }               from 'utils/throttle';

// wait for map ready
const map = GUI;
map.setupControl.query = function() {
  map.createMapControl({
    id: 'query',
    options: {
      toggled:          true,
      offline:          false,
      tipLabel:         'Query layer',
      clickmap:         true,
      interactionClass: PickCoordinatesInteraction,
      cursorClass:      'ol-help',
      onSetMap({ map, setter }) {
        this.runQuery = this.runQuery || (async ({ coordinates }) => {
          GUI.closeSideBar();
          try {
            const project = ApplicationState.project;
            await DataRouterService.getData('query:coordinates', {
              inputs: {
                coordinates,
                feature_count:         project.state.feature_count || 5,
                query_point_tolerance: project.getQueryPointTolerance(),
                multilayers:           [].concat(project.state.querymultilayers).includes(this.name),
              }
            });
          } catch(e) {
            console.warn('Error running spatial query: ', e)
          }
        });
        this.setEventKey({ eventType: 'picked', eventKey: this.on('picked', this.runQuery) });
        if ('after' === setter) {
          this.getInteraction().on('picked', throttle(async evt => {
            this.dispatchEvent({ type: 'picked', coordinates: evt.coordinate });
          }));
        }
      }
    }
  });
};