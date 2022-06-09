import ApplicationState from '../../..core/applicationstate';
import Component  from 'gui/vue/component';
import AddLayerComponent  from './components/addlayer';
import MapService  from '../mapservice';
import template from './map.html';

// map vue component
const vueComponentOptions = {
  template,
  data() {
    const {service, target} = this.$options;
    return {
      ready: false,
      target,
      mouse: {
        switch_icon: false,
        epsg_4326: false,
        tooltip: null
      },
      maps_container: this.$options.maps_container,
      service,
      mapunit: ApplicationState.map.unit,
      hidemaps: service.state.hidemaps,
      map_info: service.state.map_info,
    }
  },
  components: {
    'addlayer': AddLayerComponent
  },
  computed: {
    showmapunits(){
      return this.service.state.mapunits.length > 1;
    },
    mapcontrolsalignement() {
      return this.service.state.mapcontrolsalignement;
    },
    disableMapControls(){
      return this.service.state.mapControl.disabled;
    }
  },
  methods: {
    showHideControls () {
      const mapControls = this.$options.service.getMapControls();
      mapControls.forEach(control => control.type !== "scaleline" && control.control.showHide());
    },
    getPermalinkUrl() {
      return this.ready ? this.$options.service.getMapExtentUrl(): null;
    },
    createCopyMapExtentUrl(){
      const mapService = this.$options.service.createCopyMapExtentUrl();
    },
    switchMapsCoordinateTo4326(){
      this.mouse.epsg_4326 = !this.mouse.epsg_4326;
    }
  },
  watch: {
    'mapunit'(unit){
      ApplicationState.map.unit = unit;
      this.$options.service.changeScaleLineUnit(unit);
    }
  },
  async mounted() {
    const mapService = this.$options.service;
    mapService.once('ready', ()=> {
      this.ready = true;
      this.mouse.switch_icon = this.$options.service.getEpsg() !== 'EPSG:4326';
      this.mouse.tooltip = `ESPG ${this.$options.service.getCrs().split(':')[1]} <--> WGS84`;
    });
    this.crs = mapService.getCrs();
    await this.$nextTick();
    mapService.setMapControlsContainer($(this.$refs['g3w-map-controls']));
    $('#permalink').tooltip();
    // listen of after addHideMap
    mapService.onafter('addHideMap', async ({ratio, layers=[], mainview=false, switchable=false} = {}) => {
      await this.$nextTick();
      mapService._addHideMap({ratio, layers, mainview, switchable});
    });
  },
  destroyed() {
    this.service.clear();
  }
};
// interanl registration
const InternalComponent = Vue.extend(vueComponentOptions);

Vue.component('g3w-map', vueComponentOptions);

class MapComponent extends Component {
  constructor(options={}) {
    super(options);
    this.id = "map-component";
    this.title = "Map Component";
    const target = options.target || "map";
    const maps_container = options.maps_container || "g3w-maps";
    options.target = target;
    options.maps_container = maps_container;
    const service = new MapService(options);
    this.setService(service);
    this.internalComponent = new InternalComponent({
      service,
      target,
      maps_container
    });
    /**
     * add Vue get cookie method
     *
     */
    service.getCookie = this.internalComponent.$cookie.get;
  }

  layout(width, height) {
    $(`#${this.target}`).height(height);
    $(`#${this.target}`).width(width);
    this._service.layout({width, height});
  };

}


export default   MapComponent;

