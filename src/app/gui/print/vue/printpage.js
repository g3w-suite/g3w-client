import { TIMEOUT } from 'app/constant';
import utils from 'core/utils/utils';
import GUI from 'gui/gui';
import Component from 'gui/component/component';
import template from './printpage.html';

const InternalComponent = Vue.extend({
  template,
  data() {
    return {
      state: null,
      disableddownloadbutton: true,
      downloadImageName: '',
      format: null,
    };
  },
  computed: {
    loading() {
      return this.state.loading && this.state.layers;
    },
  },
  methods: {
    setLoading(bool = false) {
      GUI.disableSideBar(bool);
      this.state.loading = bool;
      this.disableddownloadbutton = bool;
    },
    downloadImage() {
      this.setLoading(true);
      if (this.format === 'jpg' || this.format === 'png') {
        this.downloadImageName = `download.${this.state.format}`;
        utils.imageToDataURL({
          src: this.state.url,
          type: `image/${this.state.format}`,
          callback: (url) => setTimeout(() => this.setLoading(false)),
        });
      }
    },
  },
  watch: {
    'state.url': async function (url) {
      if (url) {
        this.format = this.state.format;
        await this.$nextTick();
        // add timeout
        const timeOut = setTimeout(() => {
          this.setLoading(false);
          GUI.showUserMessage({
            type: 'alert',
            message: 'timeout',
          });
        }, TIMEOUT);

        $(this.$refs.printoutput).load(url, (response, status) => {
          this.$options.service.stopLoading();
          status === 'error' && this.$options.service.showError();
          clearTimeout(timeOut);
          this.setLoading(false);
        });
      }
    },
  },
  async mounted() {
    await this.$nextTick();
    this.state.layers && this.$options.service.startLoading();
  },
  beforeDestroy() {
    (this.state.url && this.state.method === 'POST') && window.URL.revokeObjectURL(this.state.url);
  },
});

class PrintPage extends Component {
  constructor(options = {}) {
    super(options);
    const { service } = options;
    this.setService(service);
    const internalComponent = new InternalComponent({
      service,
    });
    this.setInternalComponent(internalComponent);
    this.internalComponent.state = service.state.output;
  }

  unmount() {
    this.getService().setPrintAreaAfterCloseContent();
    return super.unmount();
  }
}

export default PrintPage;
