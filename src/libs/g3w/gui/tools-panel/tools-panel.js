var t = require('i18n.service');
var PluginsService = require('g3w/core/pluginsservice');

Vue.component('g3w-tools-panel',{
    template: require('./tools-panel.html'),
    data: function() {
    	return {
          state: PluginsService.state
        };
    },
    methods: {
    	showSidebar: function() {
    	  PluginsService.setActivePlugin('');
    	  var activePanel = PluginsService.getActivePanel();
    	  activePanel.$remove();
    	  PluginsService.setActivePanel({});
    	}
	}
});


var toolPanels = {

  info: Vue.component('info-panel',{
    template: require('./info-panel.html'),
    data: function() {
      return {
        state: PluginsService.state
      }
    },
    computed: {
      //
    },
    methods: {
      //codice qui
    },
    ready: function() {
      //
    }
  }),

  editor: Vue.component('editor-panel',{
    template: require('./editor-panel.html'),
    data: function() {
      return {
        state: PluginsService.state
      }
    },
    computed: {
      //
    },
    methods: {
      //codice qui
    }
  })
}

module.exports = toolPanels;