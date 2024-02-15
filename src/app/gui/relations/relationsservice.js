import { G3W_FID }        from 'app/constant';
import RelationsService   from 'services/relations';
import ApplicationService from 'services/application';
import GUI                from 'services/gui';
import G3WObject          from 'core/g3wobject';

const { inherit, base } = require('utils');

function RelationsComponentService(options={}) {
  this.state = {};
  this._options = {};
  base(this);
}

inherit(RelationsComponentService, G3WObject);

const proto = RelationsComponentService.prototype;

proto.getRelations = function(options={}) {
  this._options = options;
  return RelationsService.getRelations(options);
};

proto.getRelationsNM = async function({nmRelation, features}){
  return await RelationsService.getRelationsNM({
    nmRelation,
    features
  })
};

proto.saveRelations = async function(type){
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

proto.buildRelationTable = function(relations=[], id) {
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

module.exports = RelationsComponentService;
