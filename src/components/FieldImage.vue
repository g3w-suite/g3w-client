<!--
  @file
  @since v3.7
-->

<template>
  <field :state = "state">
    <div slot = "field" style = "text-align: left; display: inline-block;">
      <img
        v-for       = "(img, i) in images"
        class       = "img-responsive"
        style       = "max-height: 50px; cursor: pointer;"
        @click.stop = "showGallery(images, i)"
        :src        = "img.src"
        loading     = "lazy"
      />
    </div>
  </field>
</template>

<script>
import Field from 'components/Field.vue';
import GUI   from 'g3w-app';

export default {

  /** @since 3.8.6 */
  name: "field-image",

  props: {
    state: { 
      required: true, 
      type:     Object 
    }
  },

  components: {
    Field,
  },

  computed: {
    images() {
      return []
        .concat(undefined !== this.state.value.mime_type ? this.state.value.value : this.state.value)
        .map(img => {
          let url = (img || {}).photo || img;
          url = `${!url.startsWith('/') && !url.startsWith('http') ? window.initConfig.mediaurl : ''}${url}`;
          return ({ src: url })
        });
    },
  },

  methods: {
    async showGallery(images, index) {
      GUI.showGallery(images, index);
    },
  }
};
</script>