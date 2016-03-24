var pluginMixin = require('g3w/gui/plugins/pluginmixin');

var Plugin = Vue.component('g3w-tools',{
    template: require('./plugin.html'),
    mixins: [pluginMixin]
});

module.exports = new Plugin()