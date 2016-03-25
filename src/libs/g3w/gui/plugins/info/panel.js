var PluginsService = require('g3w/core/pluginsservice');
var PluginsRegistry = require('g3w/core/pluginsregistry');
var PanelMixinComponent = require('g3w/gui/plugins/panelmixin');

var toolPanel = PanelMixinComponent.extend({
    template : require('./panel.html')
})

module.exports = toolPanel;