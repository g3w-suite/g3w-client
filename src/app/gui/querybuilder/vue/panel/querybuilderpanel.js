const { inherit, base } = require('utils');
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
