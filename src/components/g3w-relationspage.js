/**
 * @file
 * @since 3.10.0
 */

import * as vueComp       from 'components/RelationsPage.vue';
import Component          from 'core/g3w-component';
import { G3W_FID }        from 'app/constant';
import RelationsService   from 'services/relations';
import ApplicationService from 'services/application';
import GUI                from 'services/gui';

const G3WObject         = require('core/g3wobject');

const çç = (a, b) => undefined !== a ? a : b; // like a ?? (coalesce operator)

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/relations/vue/relationspage.js@v3.9.3
 * - src/app/gui/relations/relationsservice.js@v3.9.3
 */
export default function(opts = {}) {

  const service = opts.service || new (class extends G3WObject {

    constructor () {
      super();
      this.state = {};
      this._options = {};
    }
  
    getRelations(opts={}) {
      this._options = opts;
      return RelationsService.getRelations(opts);
    }
  
    async getRelationsNM({ nmRelation, features }) {
      return await RelationsService.getRelationsNM({ nmRelation, features });
    }
  
    async saveRelations(type) {
      this._options.type = type;
      const caller_download_id = ApplicationService.setDownload(true);
      try {
        await RelationsService.save(this._options)
      } catch(err){
        GUI.showUserMessage({
          type: 'alert',
          message: err || "info.server_error",
          closable: true
        })
      }
      ApplicationService.setDownload(false, caller_download_id);
    }
  
    buildRelationTable(relations=[], id) {
      const layer = ApplicationService.getCurrentProject().getLayerById(id);
      const headers = layer.getTableHeaders();
      let columns = null;
      let rows = [];
      let rows_fid = [];
      let fields;
      if (relations.length) {
        const attributes = Object.keys(relations[0].attributes);
        columns = headers.filter(header => attributes.indexOf(header.name) !==-1);
        rows = relations.map(relation => {
          rows_fid.push(relation.attributes[G3W_FID]);
          return columns.map(column => {
            return relation.attributes[column.name]
          })
        });
        fields = columns;
        columns = columns.map(column => column.label);
      }
      return {
        columns,
        rows,
        rows_fid,
        features: relations,
        fields,
        formStructure : layer.getLayerEditingFormStructure(),
        rowFormStructure: null,
        layerId: layer.getId()
      }
    }
  });

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