import Text     from 'components/FieldText.vue';
import Link     from 'components/FieldLink.vue';
import Image    from 'components/FieldImage.vue'
import Geo      from 'components/FieldGeo.vue';
import Media    from 'components/FieldMedia.vue';
import VueField from 'components/FieldVue.vue';

const Fields = {
  simple_field: Text,
  text_field: Text,
  link_field: Link,
  image_field: Image,
  geo_field: Geo,
  photo_field: Image,
  media_field: Media,
  vue_field: VueField
};

module.exports = Fields;
