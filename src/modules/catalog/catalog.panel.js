var t = require('i18n.service');
var service = require('./catalog.service');

Vue.component('catalog',{
    template: require('./catalog.html'),
    data: function() {
    	return {
        layerstree: service.getLayersTree()
      };
    },
    methods: {
    	
    }
});
