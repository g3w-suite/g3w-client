/**
 * @file ORIGINAL SOURCE: src/map/controls/query.js@v4.0.0
 * @since 4.1.0
 */

import ApplicationState           from 'g3w-state';
import GUI                        from 'g3w-app';
import PickCoordinatesInteraction from 'interactions/pick-coordinates';
import { throttle }               from 'utils/throttle';

// wait for map ready
GUI.setupControl.query = function() {
  GUI.createMapControl({
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
            await GUI.getData('query:coordinates', {
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