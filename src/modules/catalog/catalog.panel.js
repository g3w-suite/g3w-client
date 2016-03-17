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
        createlayerstree : function() {
            var tree = $('#tree');
            tree.treeview({data: this.layerstree, showIcon: false});
            tree.treeview('collapseAll', { silent: true });
        }
    },
    computed : {
        catalog_tree : function() {
             this.createlayerstree();
             return this.layerstree;
        }

    },
    ready: function() {
        this.createlayerstree();
    }
});
