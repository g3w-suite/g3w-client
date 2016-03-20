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
      //codice qui
    },
    ready: function() {
      //
    }
});
// tree component
Vue.component('tree', {
  template: require('./tree.html'),
  props: {
    layerstree: Object
  },
  data: function () {
    return {
      expanded: this.layerstree.expanded
    }
  },
  watch: {
      'layerstree': {
        handler: function(val, old){
          //codice qui
        },
        deep: true
      }
  },
  computed: {
    isFolder: function () {
      return this.layerstree.nodes &&
        this.layerstree.nodes.length
    }
  },
  methods: {
    toggle: function () {
      if (this.isFolder) {
        this.layerstree.expanded = !this.layerstree.expanded
      }
    }
  }
})

Vue.component('legend',{
    template: require('./legend.html'),
    props: ['layerstree'],
    data: function() {
      return {
        //data qui
      }
    },
    methods: {
        //codice qui
    },
    watch: {
      'layerstree': {
        handler: function(val, old){
          //codice qui
        },
        deep: true
      }
    },
    ready: function() {
      //codice qui
    }
});
