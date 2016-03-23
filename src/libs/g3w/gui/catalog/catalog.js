var t = require('i18n.service');
var ProjectService = require('g3w/core/projectservice');

Vue.component('g3w-catalog',{
    template: require('./catalog.html'),
    data: function() {
      return {
        project: ProjectService.store
      }
    },
    computed: {
      layerstree: function(){
        console.log("watcher");
        return this.project.layersTree;
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
    n_parentChilds : 0,
    checked: false
  },
  data: function () {
    return {
      expanded: this.layerstree.expanded,
      parentChecked: false,
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
      },
      'checked': function (val){
        if (val) {
          this.n_parentChilds-=1;
        } else {
          this.n_parentChilds+=1;
        }
      },
  },
  computed: {
    isFolder: function () {
      var isFolder = this.n_childs ? true : false;
      if (isFolder) {
        this.n_parentChilds = this.n_childs;
      }
      return isFolder
    }
  },
  methods: {
    toggle: function (checkAllLayers) {
      var checkAll = checkAllLayers == 'true' ? true : false;
      if (this.isFolder && !checkAll) {
        this.layerstree.expanded = !this.layerstree.expanded;
      }
      else if (checkAll){
        if (this.parentChecked && !this.n_parentChilds){
          this.parentChecked = false;
        } else if (this.parentChecked && this.n_parentChilds) {
          this.parentChecked = false;
          this.parentChecked = true;
        }
        else {
          this.parentChecked = !this.parentChecked;
        }
      }
      else {
        this.checked = !this.checked;
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
