var pluginMixin = require('g3w/gui/plugins/pluginmixin');

// define a component that uses this mixin
var Plugin = Vue.component('plugin',{
    template: require('./plugin.html'),
    data: {
        name:'info'
    },
    mixins: [pluginMixin]
});

module.exports = Plugin