const SUPPORTED_FORMAT = ['zip', 'geojson', 'kml', 'json', 'gml'];

const EPSG = [
  "EPSG:3003",
  "EPSG:3004",
  "EPSG:3045",
  "EPSG:3857",
  "EPSG:4326",
  "EPSG:6708",
  "EPSG:23032",
  "EPSG:23033",
  "EPSG:25833",
  "EPSG:32632",
  "EPSG:32633",
];

//Vue color componet
const ChromeComponent = VueColor.Chrome;
ChromeComponent.mounted = async function() {
  await this.$nextTick();    // remove all the tihing that aren't useful
  $('.vue-color__chrome__toggle-btn').remove();
  $('.vue-color__editable-input__label').remove();
  $('.vue-color__chrome__saturation-wrap').css('padding-bottom','100px');
  $('.vue-color__chrome').css({
    'box-shadow': '0 0 0 0',
    'border': '1px solid #97A1A8'
  });
};

const AddLayerComponent = {
  template: require('./addlayer.html'),
  props: ['service'],
  data() {
    return {
      options: EPSG,
      error: false,
      error_message: null,
      loading: false,
      layer: {
        name: null,
        type: null,
        crs: null,
        color: {
          hex: '#194d33',
          rgba: {
            r: 25,
            g: 77,
            b: 51,
            a: 1
          },
          a: 1
        },
        data: null,
        visible: true,
        title: null,
        id: null,
        external: true
      }
    }
  },
  components: {
    'chrome-picker': ChromeComponent
  },
  methods: {
    setError(type){
      this.error_message = `sdk.errors.${type}`;
      this.error = true;
    },
    clearError(){
      this.error = false;
      this.error_message = null;
    },
    onChangeColor(val) {
      this.layer.color = val;
    },
    onAddLayer(evt) {
      const reader = new FileReader();
      const name = evt.target.files[0].name;
      let type = evt.target.files[0].name.split('.');
      type = type[type.length-1].toLowerCase();
      const input_file = $(this.$refs.input_file);
      if (SUPPORTED_FORMAT.indexOf(type) !== -1) {
        this.clearError();
        this.layer.name = name;
        this.layer.title = name;
        this.layer.id = name;
        this.layer.type = type;
        if (this.layer.type === 'zip') {
          this.layer.data = evt.target.files[0];
          input_file.val(null);
        } else {
          reader.onload = (evt) => {
            this.layer.data = evt.target.result;
            input_file.val(null);
          };
          reader.readAsText(evt.target.files[0]);
        }
      } else this.setError('unsupported_format');
    },
    addLayer() {
      if (this.layer.name) {
        this.loading = true;
        const layer = _.cloneDeep(this.layer);
        this.service.addExternalLayer(layer)
          .then(() =>{
            $(this.$refs.modal_addlayer).modal('hide');
            this.clearLayer();
          })
          .catch(()=>{
            this.setError('add_external_layer');
          })
          .finally(()=>{
            this.loading = false;
          })
      }
    },
    clearLayer() {
      this.clearError();
      this.loading = false;
      this.layer.name = null;
      this.layer.title = null;
      this.layer.id = null;
      this.layer.type = null;
      this.layer.crs = this.service.getCrs();
      this.layer.color = {
        hex: '#194d33',
        rgba: {
          r: 25,
          g: 77,
          b: 51,
          a: 1
        },
        a: 1
      };
      this.layer.data = null;
    }
  },
  created() {
    this.layer.crs = this.service.getCrs();
    this.service.on('addexternallayer', () => {
      this.modal.modal('show');
    });
  },
  async mounted(){
    await this.$nextTick();
    this.modal =  $('#modal-addlayer').modal('hide');
    this.modal.on('hidden.bs.modal',  () => {
      this.clearLayer();
    });
  },
  beforeDestroy() {
    this.clearLayer();
    this.modal.modal('hide');
    this.modal.remove();
  }
};

module.exports = AddLayerComponent;
