const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Panel = require('gui/panel');
const QueryBuilder = require('gui/querybuilder/vue/querybuilder');

function QueryBuilderPanel(options={}) {
  options.title = 'Query Builder';
  base(this, options);
  const internalPanel = new QueryBuilder(options);
  this.setInternalPanel(internalPanel);
}

inherit(QueryBuilderPanel, Panel);

module.exports = QueryBuilderPanel;
