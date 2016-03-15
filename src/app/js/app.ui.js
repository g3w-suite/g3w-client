var t = require('i18n.service');
var layout = require('layout/layout');

var app = new Vue({
	el: 'body',
	data: {
	},
	methods: {
		
	},
	ready: function(){
		layout.setup();
	}
});

module.exports = app;
