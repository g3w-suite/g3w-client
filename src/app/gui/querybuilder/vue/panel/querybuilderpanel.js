import Panel  from 'gui/panel';
import QueryBuilder  from 'gui/querybuilder/vue/querybuilder';

class QueryBuilderPanel extends Panel {
  constructor(options={}) {
    options.title = 'Query Builder';
    super(props);
    const internalPanel = new QueryBuilder(options);
    this.setInternalPanel(internalPanel);
  }
}

export default  QueryBuilderPanel;
