var PluginsService = require('g3w/core/pluginsservice');
var PluginsRegistry = require('g3w/core/pluginsregistry');
var PanelComponent = require('g3w/gui/plugins/panelmixin');

var toolPanel = PanelComponent.extend({
    template : require('./panel.html')
})

module.exports = toolPanel;
