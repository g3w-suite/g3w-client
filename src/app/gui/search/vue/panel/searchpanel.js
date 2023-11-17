import * as vueComponentOptions from 'components/SearchPanel.vue';

const { base, inherit, uniqueId } = require('utils');
const Panel = require('gui/panel');
const Service = require('gui/search/vue/panel/searchservice');

const SearchPanelComponent = Vue.extend(vueComponentOptions);

function SearchPanel(options = {}) {
  const service = options.service || new Service(options);
  this.setService(service);
  this.id = uniqueId();
  this.title = 'search';
  const SearchPanel = options.component || SearchPanelComponent;
  const internalPanel = new SearchPanel({
    service
  });
  this.setInternalPanel(internalPanel);
  this.unmount = function() {
    return base(this, 'unmount').then(() => {
      service.clear()
    })
  }
}

inherit(SearchPanel, Panel);

module.exports = SearchPanel;
