var t = require('i18n.service');
require('g3w/gui/catalog/catalog');
require('g3w/gui/search/search');
require('g3w/gui/tools/tools');

Vue.component('sidebar',{
    template: require('./sidebar.html'),
    data: function() {
    	return {
        bOpen: true,
    		bPageMode: false,
    		header: t('main navigation'),
        };
    }
});

Vue.component('sidebar-item',{
	props: ['data-icon','data-label','data-type'],
    template: require('./sidebar-item.html'),
    data: function() {
    	return {
        	main: true
        };
    },
    methods: {
    	
	}
});
