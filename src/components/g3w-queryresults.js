/**
 * @file
 * @since 3.10.0
 */

import Component    from 'core/g3w-component';
import { noop }     from 'utils/noop';

import * as vueComp from 'components/QueryResults.vue';

const QueryResultsService = require('gui/queryresults/queryresultsservice');

/**
 * ORIGINAL SOURCE: src/app/gui/queryresults/vue/queryresults.js@v3.9.3
 */
export default function(opts = {}) {
  const comp = new Component({
    ...opts,
    id: 'queryresults',
    title: 'Query Results',
    service: new QueryResultsService(),
    vueComponentObject: vueComp,
  });

  comp.getElement = () => comp.internalComponent ? comp.internalComponent.$el : undefined;
  comp.unmount    = () => { comp._service.closeComponent(); return Component.prototype.unmount.call(comp) };
  comp.layout     = noop;

  comp._service.onafter('setLayersData', async () => {
    if (!comp.internalComponent) {
      comp.setInternalComponent();
    }
    await comp.internalComponent.$nextTick();
  });

  return comp;
}