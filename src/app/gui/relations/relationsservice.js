import { G3W_FID } from 'constant';

const { inherit, base } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');
const ApplicationService = require('core/applicationservice');
const RelationsService = require('core/relations/relationsservice');

function RelationsComponentService(options = {}) {
  this.state = {};
  this._options = {};
  base(this);
}

inherit(RelationsComponentService, G3WObject);

const proto = RelationsComponentService.prototype;

proto.getRelations = function (options = {}) {
  this._options = options;
  return RelationsService.getRelations(options);
};

proto.getRelationsNM = async function ({ nmRelation, features }) {
  return await RelationsService.getRelationsNM({
    nmRelation,
    features,
  });
};

proto.saveRelations = async function (type) {
  this._options.type = type;
  const caller_download_id = ApplicationService.setDownload(true);
  try {
    await RelationsService.save(this._options);
  } catch (err) {
    GUI.showUserMessage({
      type: 'alert',
      message: err || 'info.server_error',
      closable: true,
    });
  }
  ApplicationService.setDownload(false, caller_download_id);
};

proto.buildRelationTable = function (relations = [], id) {
  const layer = ApplicationService.getCurrentProject().getLayerById(id);
  const headers = layer.getTableHeaders();
  let columns = null;
  let rows = [];
  const rows_fid = [];
  let fields;
  if (relations.length) {
    const attributes = Object.keys(relations[0].attributes);
    columns = headers.filter((header) => attributes.indexOf(header.name) !== -1);
    rows = relations.map((relation) => {
      rows_fid.push(relation.attributes[G3W_FID]);
      return columns.map((column) => relation.attributes[column.name]);
    });
    fields = columns;
    columns = columns.map((column) => column.label);
  }
  return {
    columns,
    rows,
    rows_fid,
    features: relations,
    fields,
    formStructure: layer.getLayerEditingFormStructure(),
    rowFormStructure: null,
    layerId: layer.getId(),
  };
};

module.exports = RelationsComponentService;
