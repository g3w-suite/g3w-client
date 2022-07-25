const {base, inherit} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

// service sidebar
function navbaritemsService() {
  this.state = {
    items: {
      left:[],
      right:[]
    }
  };
  this.addItem = function(item, position='right') {
    this.state.items[position].push(item);
  };

  base(this)
}

inherit(navbaritemsService, G3WObject);

const navbaritemsservice = new navbaritemsService();

/**
 * TODO: split and refactor into a dedicated file (eg. components/NavbarLeftItems.vue)
 */
const compiledTemplateLeft = Vue.compile(require('./navbarleftitems.html'));

const NavbarLeftItemsComponent = Vue.extend({
  ...compiledTemplateLeft,
  data() {
    return {
      items: navbaritemsservice.state.items.left
    }
  }
});

/**
 * TODO: split and refactor into a dedicated file (eg. components/NavbarRightItems.vue)
 */
const compiledTemplateRight = Vue.compile(require('./navbarrightitems.html'));

const NavbarRightItemsComponent = Vue.extend({
  ...compiledTemplateRight,
  data() {
    return {
      items: navbaritemsservice.state.items.right
    }
  }
});


module.exports = {
  NavbarItemsService: navbaritemsservice,
  components: {
    left: NavbarLeftItemsComponent,
    right: NavbarRightItemsComponent
  }
};
