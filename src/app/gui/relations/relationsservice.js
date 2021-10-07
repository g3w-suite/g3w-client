const { inherit, base, downloadCSV} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');
const ApplicationService = require('core/applicationservice');
const RelationsService = require('core/relations/relationsservice');

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
  let fields;
  if (relations.length) {
    const properties = Object.keys(relations[0].properties);
    columns = headers.filter(header => properties.indexOf(header.name) !==-1);
    rows = relations.map(relation => {
      return columns.map(column => {
        return relation.properties[column.name]
      })
    });
    fields = columns;
    columns = columns.map(column => column.label);
  }
  return {
    columns,
    rows,
    fields,
    formStructure : layer.getEditorFormStructure(),
    rowFormStructure: null,
    layerId: layer.getId()
  }
};

module.exports = RelationsComponentService;
