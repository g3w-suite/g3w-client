/**
 * @file
 * @since 3.10.0
 */

import * as vueComp from 'components/QueryResults.vue';
import Component    from 'core/g3w-component';

const { noop }            = require('utils');
const QueryResultsService = require('gui/queryresults/queryresultsservice');

/**
 * ORIGINAL SOURCE: src/app/gui/queryresults/vue/queryresults.js@v3.9.3
 */
export default function(opts={}) {
  const service = new QueryResultsService();

  const comp = new Component({
    ...opts,
    id: 'queryresults',
    title: 'Query Results',
    service,
    internalComponent: new (Vue.extend(vueComp))({ queryResultsService: service }),
  });
  comp.internalComponent.querytitle = comp._service.state.querytitle;
  comp.getElement                   = () => comp.internalComponent ? comp.internalComponent.$el : undefined;
  comp.unmount                      = () => { comp._service.closeComponent(); return Component.prototype.unmount.call(comp) };
  comp.layout                       = noop;

  comp._service.onafter('setLayersData', async () => {
    if (!comp.internalComponent) {
      comp.setInternalComponent();
    }
    await comp.internalComponent.$nextTick();
  });

  return comp;
}