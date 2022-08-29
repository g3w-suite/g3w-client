import NavbarItemsService from 'services/navbaritems';
import NavbaritemsLeftComponent from 'components/NavbaritemsLeft.vue';
import NavbaritemsRightComponent from 'components/NavbaritemsRight.vue';

module.exports = {
  NavbarItemsService,
  components: {
    left: NavbaritemsLeftComponent,
    right: NavbaritemsRightComponent
  }
};
