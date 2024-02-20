/**
 * @file
 * @since 3.10.0
 */

import Panel        from 'core/g3w-panel';

import * as vueComp from 'components/QueryBuilder.vue';

const QueryBuilder = Vue.extend(vueComp);

/**
 * ORIGINAL SOURCE: src/app/gui/querybuilder/querybuilderuifactory.js@v3.9.3
 */
export default {
  type: null,
  show({ type='sidebar', options = {} } = {}) {
    let QB; 
    this.type = this.type === null ? type : this.type;
    if ('modal' === this.type) {
      QB = new QueryBuilder({ options });
      GUI.showModalDialog({ title: 'Query Builder', message: QB.$mount().$el, className: "modal-background-dark " });
    } else {
      options.title = 'Query Builder';
      options.internalPanel = new QueryBuilder(options); 
      options.show = true;
      QB = (new Panel(options)).getInternalPanel();
    }
    return QB;
  }
};