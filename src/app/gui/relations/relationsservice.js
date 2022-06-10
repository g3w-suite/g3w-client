import {G3W_FID} from 'constant';
import G3WObject from 'core/g3wobject';
import GUI  from 'gui/gui';
import ApplicationService  from 'core/applicationservice';
import RelationsService  from 'core/relations/relationsservice';

class RelationsComponentService extends G3WObject {
  constructor(options={}) {
    super();
    this.state = {};
    this._options = {};
  }

  getRelations(options={}) {
    this._options = options;
    return RelationsService.getRelations(options);
  };

  async getRelationsNM({nmRelation, features}){
    return await RelationsService.getRelationsNM({
      nmRelation,
      features
    })
  };

  async saveRelations(type){
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
  };

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
  };


}




export default  RelationsComponentService;
