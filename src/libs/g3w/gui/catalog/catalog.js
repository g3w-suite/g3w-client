var t = require('i18n.service');
var layersRegistry = require('g3w/core/layers/layersregistry');

Vue.component('g3w-catalog',{
    template: require('./catalog.html'),
    props: ['layersservice'],
    data: function() {
      return {
        layerstree: layersRegistry.getLayersTree()
      }
    },
    methods: {
        createlayerstree : function() {
            var tree = $('#tree');
            tree.treeview({data: this.layerstree, showIcon: false});
            tree.treeview('collapseAll', { silent: true });
        }
    },
    watch: {
      'layerstree': {
        handler: function(val, old){
          this.createlayerstree();
        },
        deep: true
      }
    },
    ready: function() {
        this.createlayerstree();
    }
});
