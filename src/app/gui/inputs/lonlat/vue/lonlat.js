const { getUniqueDomId } = require('core/utils/utils');
const Input = require('gui/inputs/input');

const LatLontInput = Vue.extend({
  mixins: [Input],
  template: require('./lonlat.html'),
  data() {
    return {
      lonId: getUniqueDomId(),
      latId: getUniqueDomId(),
      coordinatebutton: {
        active: false,
      },
    };
  },
  computed: {
    getCoordinateActive() {
      return this.service.state.getCoordinateActive;
    },
  },
  methods: {
    toggleGetCoordinate() {
      this.service.toggleGetCoordinate();
    },
    changeLonLat() {
      this.change();
      this.setValue();
    },
    setValue() {
      this.state.value = [[1 * this.state.values.lon, 1 * this.state.values.lat]];
    },
  },
  created() {
    this.state.values = this.state.values || { lon: 0, lat: 0 };
    this.setValue();
    this.service.setCoordinateButtonReactiveObject(this.coordinatebutton);
  },
  async mounted() {
    await this.$nextTick();
    this.$nextTick(() => {
      $(this.$refs['g3w-input-lat-lon']).tooltip({
        trigger: 'hover',
      });
    });
  },
  destroyed() {
    this.service.clear();
  },
});

module.exports = LatLontInput;
