<!--
  @file
  @since v3.7
-->

<template>
  <component
    :is      = "type"
    :feature = "feature"
    :state   = "state">
  </component>
</template>

<script>
import Text     from 'components/FieldText.vue';
import Link     from 'components/FieldLink.vue';
import Image    from 'components/FieldImage.vue';
import Geo      from 'components/FieldGeo.vue';
import Media    from 'components/FieldMedia.vue';
import VueField from 'components/FieldVue.vue';
import { toRawType } from 'utils/toRawType';

export default {
  name: "g3w-field",
  props: {
    state: {
      required: true
    },
    feature: {
      type: Object
    }
  },
  components: {
    simple_field: Text,
    text_field:   Text,
    link_field:   Link,
    image_field:  Image,
    geo_field:    Geo,
    photo_field:  Image,
    media_field:  Media,
    vue_field:    VueField
  },
  created() {
    let type = this.state.type;
    if ('vue' !== type) {
      const fieldValue = this.state.value;
      const value = fieldValue && 'Object' === toRawType(fieldValue) && !fieldValue.coordinates && !fieldValue.vue ? fieldValue.value : fieldValue;
      if (!value) {
        type = 'simple';
      } else if (value && 'object' === typeof value) {
        if (value.coordinates) {
          type = 'geo';
        } else if (value.vue) {
          type = 'vue';
        }
      } else if (value && Array.isArray(value)) {
        if (value.length && value[0].photo) {
          type = 'photo';
        } else {
          type = 'simple'
        }
      } else if (value.toString().toLowerCase().match(/^(https?:\/\/[^\s]+)\.(png|jpg|jpeg|gif)$/g)) {
        type = 'photo';
      } else if (value.toString().match(/^(https?:\/\/[^\s]+)/g)) {
        type = 'link';
      } else {
        type = 'simple';
      }
    }
    this.type = `${type}_field`;
  }
};
</script>