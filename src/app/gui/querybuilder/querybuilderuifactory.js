import QueryBuilder from './vue/querybuilder';
import QueryBuilderPanel from './vue/panel/querybuilderpanel';

const QuerybuilderUIfactory = {
  type: null,
  show({ type = 'sidebar', options } = {}) {
    let QueryBuilderInstance;
    this.type = this.type === null ? type : this.type;
    if (this.type === 'modal') {
      QueryBuilderInstance = new QueryBuilder({
        options,
      });
      const queryBuilderDom = QueryBuilderInstance.$mount().$el;
      GUI.showModalDialog({
        title: 'Query Builder',
        message: queryBuilderDom,
        className: 'modal-background-dark ',
      });
    } else {
      const panel = new QueryBuilderPanel({
        options,
      });
      QueryBuilderInstance = panel.getInternalPanel();
      panel.show();
    }
    return QueryBuilderInstance;
  },
};

export default QuerybuilderUIfactory;
