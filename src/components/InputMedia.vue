<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state = "state">
    <div slot = "body" v-disabled = "!editable">
      <div
        class  = "g3w_input_button skin-border-color"
        @click = "onClick"
        style  = "border-style: solid; border-width: 2px; width:100%; cursor: pointer; text-align: center;"
      >
        <i :class = "g3wtemplate.getFontClass('file-upload')" class = "fa-2x skin-color" style = "padding: 5px;">
          <input
            :id       = "mediaid"
            style     = "display:none"
            :name     = "state.name"
            :tabIndex = "tabIndex"
            :data-url = "state.input.options.uploadurl"
            :class    = "{'input-error-validation' : notvalid}"
            type      = "file"
            @change   = "onChangeFile"
          >
        </i>
      </div>
        <bar-loader :loading = "loading"/>
        <g3w-media :state = "data">
          <div class = "clearmedia" @click.stop = "clearMedia">
            <i :class = "g3wtemplate.font['trash-o']" class = "g3w-icon"></i>
          </div>
        </g3w-media>
    </div>
  </baseinput>
</template>

<script>
import GUI                from 'g3w-app';
import { getUniqueDomId } from 'utils/getUniqueDomId';

const InputMixins                 = require('gui/inputs/input');
const { media_field: MediaField } = require('gui/fields/fields');

export default {

  /** @since 3.8.6 */
  name: 'input-media',

  mixins: [InputMixins],
  components: {
      'g3w-media': MediaField
  },
  data() {
    return {
      data: {
        value:     null,
        mime_type: null
      },
      mediaid: `media_${getUniqueDomId()}`,
      loading: false
    }
  },
  methods: {
    onClick() {
      document.getElementById(this.mediaid).click();
    },
    clearMedia() {
      this.data.value = this.data.mime_type = this.state.value = null;
      this.change();
    },
    setMedia() {
      if (this.state.value) {
        this.data.value     = this.state.value.value;
        this.data.mime_type = this.state.value.mime_type;
      }
    },
    async onChangeFile(event) {
      const body = new FormData();
      body.append('csrfmiddlewaretoken', this.$cookie.get('csrftoken'));
      body.append(this.state.name, event.target.files[0]);

      this.loading = true;

      try {
        const response = (await (await fetch(this.state.input.options.uploadurl, {
          method:  'POST',
          headers: { Accept: 'application/json' },
          body
        })).json())[this.state.name];
        console.log(response)
        if (response) {
          this.state.value = response;
        }
      } catch(e) {
        console.warn(e);
        GUI.notify.error(this.$t("info.server_error"));
      }

      this.loading = false;
    },
  },
  watch: {
    /**
     * @since 3.11.0
     */
    'state.value'() {
      this.setMedia();
      this.change();
    }
  },
  created() {
    this.setMedia();
  },
};
</script>