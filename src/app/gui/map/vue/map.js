import { createCompiledTemplate } from 'gui/vue/utils';
const {base, merge, inherit} = require('core/utils/utils');
const Component = require('gui/vue/component');
const AddLayerComponent = require('./addlayer');
const MapService = require('../mapservice');
const templateCompiled = createCompiledTemplate(require('./map.html'));

// map vue component
const vueComponentOptions = {
  ...templateCompiled,
  data: function() {
    const {service, target} = this.$options;
    return {
      ready: false,
      target,
      maps_container: this.$options.maps_container,
      service,
      hidemaps: service.state.hidemaps
    }
  },
  components: {
    'addlayer': AddLayerComponent
  },
  computed: {
    mapcontrolsalignement: function() {
      return this.service.state.mapcontrolsalignement;
    }
  },
  methods: {
    showHideControls: function () {
      const mapControls = this.$options.service.getMapControls();
      mapControls.forEach((control) => {
        if (control.type !== "scaleline")
          control.control.showHide();
      })
    },
    getPermalinkUrl() {
      return this.ready ? this.$options.service.getMapExtentUrl(): null;
    },
    createCopyMapExtentUrl(){
      const mapService = this.$options.service.createCopyMapExtentUrl();
    }
  },
  async mounted() {
    const mapService = this.$options.service;
    mapService.once('ready', ()=>{
      this.ready = true;
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

function MapComponent(options = {}) {
  base(this, options);
  this.id = "map-component";
  this.title = "Map Component";
  const target = options.target || "map";
  const maps_container = options.maps_container || "g3w-maps";
  options.target = target;
  options.maps_container = maps_container;
  this.setService(new MapService(options));
  merge(this, options);
  this.internalComponent = new InternalComponent({
    service: this._service,
    target,
    maps_container
  });
}

inherit(MapComponent, Component);

const proto = MapComponent.prototype;

proto.layout = function(width, height) {
  $(`#${this.target}`).height(height);
  $(`#${this.target}`).width(width);
  this._service.layout({width, height});
};

module.exports =  MapComponent;

