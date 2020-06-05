const t = require('sdk/core/i18n/i18n.service').t;
const inherit = require('sdk/core/utils/utils').inherit;
const G3WObject = require('sdk/core/g3wobject');
const base = require('sdk/core/utils/utils').base;

// service sidebar
function navbaritemsService() {
  this.state = {
    items: {
      left:[],
      right:[]
    }

  };
  this.addItem = function(item, position) {
    position = position || 'right';
    this.state.items[position].push(item);
  };

  base(this)
}

inherit(navbaritemsService, G3WObject);

const navbaritemsservice = new navbaritemsService();
const compiledTemplate = Vue.compile(require('../html/navbarleftitems.html'));

const NavbarLeftItemsComponent = Vue.extend({
  ...compiledTemplate,
  data: function() {
    return {
      items: navbaritemsservice.state.items.left
    }
  },
  computed: {},
  methods: {}
});

const NavbarRightItemsComponent = Vue.extend({
  template: require('../html/navbarrightitems.html'),
  data: function() {
    return {
      items: navbaritemsservice.state.items.right
    }
  },
  computed: {},
  methods: {}
});


module.exports = {
  NavbarItemsService: navbaritemsservice,
  components: {
    left: NavbarLeftItemsComponent,
    right: NavbarRightItemsComponent
  }
};
