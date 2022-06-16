import G3WObject from 'core/g3wobject';
import templateLeft from './navbarleftitems.html';
import templateRight from './navbarrightitems.html';

// service sidebar
class navbaritemsService extends G3WObject {
  constructor() {
    super();
    this.state = {
      items: {
        left: [],
        right: [],
      },
    };
  }

  addItem(item, position = 'right') {
    this.state.items[position].push(item);
  }
}

const navbaritemsservice = new navbaritemsService();

const NavbarLeftItemsComponent = Vue.extend({
  templateLeft,
  data() {
    return {
      items: navbaritemsservice.state.items.left,
    };
  },
});

const NavbarRightItemsComponent = Vue.extend({
  templateRight,
  data() {
    return {
      items: navbaritemsservice.state.items.right,
    };
  },
});

export default {
  NavbarItemsService: navbaritemsservice,
  components: {
    left: NavbarLeftItemsComponent,
    right: NavbarRightItemsComponent,
  },
};
