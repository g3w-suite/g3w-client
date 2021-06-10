const {createVectorLayerFromFile, createStyleFunctionToVectorLayer} = require('core/utils/geo');
const SUPPORTED_FORMAT = ['zip', 'geojson', 'GEOJSON',  'kml', 'KML', 'json', 'gpx', 'gml', 'csv'];
const CSV_SEPARATORS = [',', ';'];

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
      vectorLayer: null,
      options: EPSG,
      error: false,
      error_message: null,
      loading: false,
      fields:[],
      field: null,
      accepted_extension: SUPPORTED_FORMAT.map(format => `.${format}`).join(','),
      csv: {
        valid: false,
        loading:false,
        headers: [],
        x: null,
        y: null,
        separators : CSV_SEPARATORS,
        separator: CSV_SEPARATORS[0],
      },
      layer: {
        name: null,
        type: null,
        crs: null,
        mapCrs: null,
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
        external: true,
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
    async onAddLayer(evt) {
      this.csv.valid = true;
      const reader = new FileReader();
      const name = evt.target.files[0].name;
      let type = evt.target.files[0].name.split('.');
      type = type[type.length-1].toLowerCase();
      const input_file = $(this.$refs.input_file);
      if (SUPPORTED_FORMAT.indexOf(type) !== -1) {
        this.clearError();
        this.layer.mapCrs = this.service.getEpsg();
        this.layer.name = name;
        this.layer.title = name;
        this.layer.id = name;
        this.layer.type = type;
        if (this.layer.type === 'csv') { // in case of csv
          reader.onload = evt => {
            input_file.val(null);
            const csv_data = evt.target.result.split(/\r\n|\n/).filter(row => row);
            const [headers, ...values] = csv_data;
            const handle_csv_headers = separator => {
              let data;
              this.csv.loading = true;
              const csv_headers = headers.split(separator);
              const headers_length = csv_headers.length;
              if (headers_length > 1) {
                this.csv.headers = csv_headers;
                this.fields = csv_headers;
                this.csv.x = csv_headers[0];
                this.csv.y = csv_headers[1];
                data = {
                  headers: csv_headers,
                  separator,
                  x: this.csv.x,
                  y: this.csv.y,
                  values
                };
                this.csv.valid = true;
              } else {
                this.csv.headers = this.fields = [];
                this.vectorLayer = null;
                this.csv.valid = false;
                this.fields.splice(0);
              }
              this.csv.loading = false;
              return data;
            };
            this.layer.data = handle_csv_headers(this.csv.separator);
            this.$watch('csv.separator', separator => this.layer.data = handle_csv_headers(separator))
          };
          reader.readAsText(evt.target.files[0]);
        } else {
          const promiseData = new Promise((resolve, reject) =>{
            if (this.layer.type === 'zip') { // in case of shapefile (zip file)
              const data = evt.target.files[0];
              input_file.val(null);
              resolve(data);
            } else {
              reader.onload = evt => {
                const data = evt.target.result;
                input_file.val(null);
                resolve(data);
              };
              reader.readAsText(evt.target.files[0]);
            }
          });
          this.layer.data = await promiseData;
          try {
            this.fields.splice(0); //reset eventually the fields
            await this.createVectorLayer();
            this.fields = this.vectorLayer.get('_fields');
          } catch(err){}
        }
      } else this.setError('unsupported_format');
    },
    async createVectorLayer(){
      try {
        this.vectorLayer = await createVectorLayerFromFile(this.layer);
        await this.$nextTick();
      } catch(err){this.setError('add_external_layer');}
    },
    async addLayer() {
      if (this.vectorLayer || this.csv.valid){
        this.loading = true;
        //Recreate always the vector layer because we can set the right epsg after first load the file
        // if we change the epsg of the layer after loaded
        try {
          this.vectorLayer = await createVectorLayerFromFile(this.layer);
          this.vectorLayer.setStyle(createStyleFunctionToVectorLayer({
            color:this.layer.color,
            field:this.field
          }));
          await this.service.addExternalLayer(this.vectorLayer);
          $(this.$refs.modal_addlayer).modal('hide');
          this.clearLayer();
        } catch(err){
          this.setError('add_external_layer');
        }
        this.loading = false
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
      this.vectorLayer = null;
      this.fields = [];
      this.field = null;
    }
  },
  computed:{
    csv_extension(){
      return this.layer.type === 'csv';
    },
    add(){
      return this.vectorLayer || this.csv.valid;
    }
  },
  watch:{
    'csv.x'(value){
      if (value) this.layer.data.x = value
    },
    'csv.y'(value){
      if (value) this.layer.data.y = value
    }
  },
  created() {
    this.layer.crs = this.service.getCrs();
    this.service.on('addexternallayer', () => this.modal.modal('show'));
  },
  async mounted(){
    await this.$nextTick();
    this.modal =  $('#modal-addlayer').modal('hide');
    this.modal.on('hidden.bs.modal',  () => this.clearLayer());
  },
  beforeDestroy() {
    this.clearLayer();
    this.modal.modal('hide');
    this.modal.remove();
  }
};

module.exports = AddLayerComponent;
