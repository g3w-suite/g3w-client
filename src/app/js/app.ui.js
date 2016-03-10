var t = require('i18n.service.js');
var layout = require('layout/layout.js');

var app = new Vue({
	el: 'body',
	data: {
		sidebar: {
			header: t('main navigation'),
			activeModuleIndex: undefined,
			hiddenModule: undefined,
			modules: [{
				icon: 'fa fa-search',
				label: t('search'),
				inlinePanel: require('searchform.html')
			},
			{
				icon: 'fa fa-database',
				label: t('data'),
				tree: [{
					icon: 'fa fa-info-circle',
					label: t('info'),
				},
				{
					icon: 'fa fa-map',
					label: t('map'),
				},
				{
					icon: 'fa fa-map-marker',
					label: t('marker'),
				}]
			},
			{
				icon: 'fa fa-gear',
				label: t('tools'),
				exclusivePanel: '<p>Sono un exclusive Panel</p>'
			}],
		},
		floatbar: {
			
		}
	},
	methods: {
		switchSidebar: function(panel) {
			var $el = $(this.$el);
			
			if ($el.find('.sidebar-menu').length)
			{
				this.hiddenModule = $el.find('.sidebar-menu').fadeOut({
					complete: function() {
						$el.find('aside').append(panel);
					}
				});
			}
			else
			{
				$el.find('.sidebar:').children('not(.sidebar-menu)').remove();
				this.hiddenModule = undefined;
			}			
		},
		activeModule: function(index) {
			if (index === this.sidebar.activeModuleIndex) {
				this.sidebar.activeModuleIndex = undefined;
				return false;
			}
			else {
				this.sidebar.activeModuleIndex = index;
			}
			if (this.sidebar.modules[index].exclusivePanel)
			{
				this.switchSidebar(this.sidebar.modules[index].exclusivePanel);
			}
		}
	},
	ready: function(){
		layout.setup();
	}
});

module.exports = app;
