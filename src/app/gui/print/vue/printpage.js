import {TIMEOUT} from "../../../constant";
import { createCompiledTemplate } from 'gui/vue/utils'
const {inherit, base, imageToDataURL} = require('core/utils/utils');
const GUI = require('gui/gui');
const Component = require('gui/component/component');
const compiledTemplate = createCompiledTemplate(require('./printpage.html'));

const InternalComponent = Vue.extend({
  ...compiledTemplate,
  data() {
    return {
      state: null,
      disableddownloadbutton: true,
      downloadImageName: '',
      format: null
    }
  },
  computed: {
    loading() {
      return this.state.loading && this.state.layers;
    }
  },
  methods: {
    setLoading(bool=false){
      GUI.disableSideBar(bool);
      this.state.loading = bool;
      this.disableddownloadbutton = bool;
    },
    downloadImage(){
      this.setLoading(true);
      if (this.format === 'jpg' || this.format === 'png' ) {
        this.downloadImageName = `download.${this.state.format}`;
        imageToDataURL({
          src: this.state.url,
          type: `image/${this.state.format}`,
          callback: url => setTimeout(() => this.setLoading(false))
        })
      }
    }
  },
  watch: {
    'state.url': async function(url) {
      if (url) {
        this.format = this.state.format;
        await this.$nextTick();
        // add timeout
        const timeOut = setTimeout(()=>{
          this.setLoading(false);
          GUI.showUserMessage({
            type: 'alert',
            message: 'timeout'
          })
        }, TIMEOUT);

        $(this.$refs.printoutput).load(url, (response, status) => {
          this.$options.service.stopLoading();
          status === 'error' && this.$options.service.showError();
          clearTimeout(timeOut);
          this.setLoading(false);
        });
      }
    }
  },
  async mounted() {
    await this.$nextTick();
    this.state.layers && this.$options.service.startLoading();
  },
  beforeDestroy() {
    (this.state.url && this.state.method === 'POST') && window.URL.revokeObjectURL(this.state.url);
  }
});

const PrintPage = function(options={}) {
  base(this);
  const service = options.service;
  this.setService(service);
  const internalComponent = new InternalComponent({
    service
  });
  this.setInternalComponent(internalComponent);
  this.internalComponent.state = service.state.output;
  this.unmount = function() {
    this.getService().setPrintAreaAfterCloseContent();
    return base(this, 'unmount')
  }
};

inherit(PrintPage, Component);


module.exports = PrintPage;


