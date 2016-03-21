var t = require('i18n.service');
var projectsregistry = require('g3w/core/projectsregistry');

Vue.component('g3w-catalog',{
    template: require('./catalog.html'),
    data: function() {
      return {
        layerstree: projectsregistry.getCurrentProject().getLayersTree()
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
    layerstree: [],
    //eredito il numero di childs dal parent
    n_parentChilds : 0
  },
  data: function () {
    return {
      expanded: this.layerstree.expanded,
      checked: false,
      //proprieta che server per fare confronto per il tristate
      n_childs: this.layerstree.nodes ? this.layerstree.nodes.length : 0
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
      var isFolder = this.layerstree.nodes &&  this.layerstree.nodes.length;
      if (isFolder) {
        this.n_parentChilds = this.layerstree.nodes.length;
      }
      return isFolder
    }
  },
  methods: {
    toggle: function () {
      if (this.isFolder) {
        this.layerstree.expanded = !this.layerstree.expanded;
      }
      else {
        this.checked = !this.checked;
        if (this.checked) {
          this.n_parentChilds-=1;
        } else {
          this.n_parentChilds+=1;
        }
      }
    },
    triClass: function () {
      if (!this.n_parentChilds) {
        return 'fa-check-square-o';
      } else if ((this.n_parentChilds > 0) && (this.n_parentChilds < this.n_childs)) {
        return 'fa-square';
      } else {
        return 'fa-square-o';
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
