/**
 * @file
 * @since 3.10.0
 */

import { G3W_FID }        from 'app/constant';
import G3WObject          from 'core/g3w-object';
import Component          from 'core/g3w-component';
import RelationsService   from 'services/relations';
import ApplicationService from 'services/application';
import GUI                from 'services/gui';

import * as vueComp       from 'components/RelationsPage.vue';

const çç = (a, b) => undefined !== a ? a : b; // like a ?? (coalesce operator)

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/relations/vue/relationspage.js@v3.9.3
 * - src/app/gui/relations/relationsservice.js@v3.9.3
 */
export default function(opts = {}) {

  const state = {};

  const service = opts.service || new G3WObject();

  service.state          = state;
  service._options       = {};
  service.getRelations   = o => { service._options = o; return RelationsService.getRelations(o); };
  service.getRelationsNM = r => RelationsService.getRelationsNM(r);
   service.saveRelations  = async type => {
    service._options.type = type;
    const id = ApplicationService.setDownload(true);
    try      { await RelationsService.save(service._options) }
    catch(e) { GUI.showUserMessage({ type: 'alert', message: e || 'info.server_error', closable: true }); }
    ApplicationService.setDownload(false, id);
  };

  service.buildRelationTable = (relations = [], id) => {
    relations = relations || [];
    const layer = ApplicationService.getCurrentProject().getLayerById(id);
    const attrs = Object.keys(relations[0] ? relations[0].attributes : {});
    const cols  = layer.getTableHeaders().filter(h => -1 !== attrs.indexOf(h.name));
    return {
      columns:          cols.map(c => c.label),
      rows:             relations.map(r => cols.map(c => r.attributes[c.name])),
      rows_fid:         relations.map(r => r.attributes[G3W_FID]),
      features:         relations,
      fields:           cols.length ? cols : null,
      formStructure:    layer.getLayerEditingFormStructure(),
      rowFormStructure: null,
      layerId:          layer.getId()
    }
  };

  const comp = new Component({
    ...opts,
    service,
    internalComponent: new (Vue.extend(vueComp))({
      service,
      previousview:     çç(opts.currentview, 'relations'),
      relations:        çç(opts.relations, []),
      relation:         çç(opts.relation, null),
      nmRelation:       opts.nmRelation,
      chartRelationIds: çç(opts.chartRelationIds, []),
      feature:          çç(opts.feature, null),
      currentview:      çç(opts.currentview, 'relations'),
      layer:            opts.layer,
      table:            çç(opts.table, null),
    }),
  });

  comp._service.layout = () => { comp.internalComponent.reloadLayout(); };

  return comp;
};