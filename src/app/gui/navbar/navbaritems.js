const t = require('core/i18n/i18n.service').t;
const inherit = require('core/utils/utils').inherit;
const G3WObject = require('core/g3wobject');
const base = require('core/utils/utils').base;

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
const compiledTemplate = Vue.compile(require('./navbarleftitems.html'));

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
  template: require('./navbarrightitems.html'),
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
