var PluginsService = require('g3w/core/pluginsservice');
var PluginsRegistry = require('g3w/core/pluginsregistry');
var PanelMixin = require('g3w/core/panelmixin');

var toolPanel = Vue.component('panel',{
    template : require('./panel.html'),
    mixins: [PanelMixin]
})

module.exports = toolPanel;