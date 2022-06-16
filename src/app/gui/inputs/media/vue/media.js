import InputMixins from 'gui/inputs/input';
import utils from 'core/utils/utils';
import { t } from 'core/i18n/i18n.service';
import Fields from 'gui/fields/fields';
import GUI from 'gui/gui';
import template from './media.html';

const MediaInput = Vue.extend({
  mixins: [InputMixins],
  components: {
    'g3w-media': Fields.media_field,
  },
  data() {
    return {
      data: {
        value: null,
        mime_type: null,
      },
      mediaid: `media_${utils.getUniqueDomId()}`,
      loading: false,
    };
  },
  template,
  methods: {
    onClick(e) {
      document.getElementById(this.mediaid).click();
    },
    createImage(file, field) {
      const reader = new FileReader();
      reader.onload = function (e) {
        field.value = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    checkFileSrc(value) {
      if (_.isNil(value)) {
        value = '';
      }
      return value;
    },
    clearMedia() {
      this.data.value = this.data.mime_type = this.state.value = null;
    },
  },
  created() {
    if (this.state.value) {
      this.data.value = this.state.value.value;
      this.data.mime_type = this.state.value.mime_type;
    }
  },
  mounted() {
    const fieldName = this.state.name;
    const formData = {
      name: fieldName,
      csrfmiddlewaretoken: this.$cookie.get('csrftoken'),
    };
    this.$nextTick(() => {
      $(`#${this.mediaid}`).fileupload({
        dataType: 'json',
        formData,
        start: () => {
          this.loading = true;
        },
        done: (e, data) => {
          const response = data.result[fieldName];
          if (response) {
            this.data.value = response.value;
            this.data.mime_type = response.mime_type;
            this.state.value = this.data;
            this.change();
          }
        },
        fail: () => {
          GUI.notify.error(t('info.server_error'));
        },
        always: () => {
          this.loading = false;
        },
      });
    });
  },
  beforeDestroy() {
    $(`#${this.mediaid}`).fileupload('destroy');
  },
});

export default MediaInput;
