/**
 * @file list of fields that can be used by `src/components/G3WField.vue`
 * 
 * @since 3.9.0
 */

import * as checkbox         from 'fields/checkbox.vue';
import * as color            from 'fields/color.vue';
import * as date_time_picker from 'fields/date_time_picker.vue';
import * as date_time        from 'fields/date_time.vue';
import * as float            from 'fields/float.vue';
import * as integer          from 'fields/integer.vue';
import * as layer_positions  from 'fields/layer_positions.vue';
import * as lon_lat          from 'fields/lon_lat.vue';
import * as media            from 'fields/media.vue';
import * as layer            from 'fields/layer.vue';
import * as radio            from 'fields/radio.vue';
import * as range            from 'fields/range.vue';
import * as select           from 'fields/select.vue';
import * as table            from 'fields/table.vue';
import * as text             from 'fields/text.vue';
import * as text_area        from 'fields/text_area.vue';
import * as text_html        from 'fields/text_html.vue';
import * as unique           from 'fields/unique.vue';
import * as legacy           from 'fields/legacy.vue';

function _alias(vm, props) {
  return {
    functional: true,
    // props: vm.props,
    render(h, ctx) {
      const d = h( vm, { ...ctx.data, props: { ...ctx.data.props, ...props } }, ctx.children)
      // const d = h( vm, { ...ctx, props: { ...ctx.props, ...props } }, ctx.children)
      return d;
    },
  };
}

const components = {

  /**
   * ORIGINAL SOURCE: src/gui/inputs/text/vue/text.js@3.8
   * 
   * @since 3.9.0
   */
  'text_input': text,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/texthtml/vue/texthtml.js@3.8
   * 
   * @since 3.9.0
   */
  'texthtml_input': text_html,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/textarea/vue/textarea.js@3.8
   * 
   * @since 3.9.0
   */
  'textarea_input': text_area,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/integer/vue/integer.js@3.8
   * 
   * @since 3.9.0
   */
  'integer_input': integer,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/float/vue/float.js@3.8
   * 
   * @since 3.9.0
   */
  'float_input': float,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/radio/vue/radio.js@3.8
   * 
   * @since 3.9.0
   */
  'radio_input': radio,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/checkbox/vue/checkbox.js@3.8
   * 
   * @since 3.9.0
   */
  'check_input': checkbox,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/range/vue/range.js@3.8
   * 
   * @since 3.9.0
   */
  'range_input': range,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/datetimepicker/vue/datetimepicker.js@3.8
   * 
   * @since 3.9.0
   */
  'datetimepicker_input': date_time_picker,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/unique/vue/unique.js@3.8
   * 
   * @since 3.9.0
   */
  'unique_input': unique,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/select/vue/select.js@3.8
   * 
   * @since 3.9.0
   */
  'select_input': select,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/media/vue/media.js@3.8
   * 
   * @since 3.9.0
   */
  'media_input': media,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/picklayer/vue/picklayer.js@3.8
   * 
   * @since 3.9.0
   */
  'picklayer_input': layer,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/color/vue/color.js@3.8
   * 
   * @since 3.9.0
   */
  'color_input': color,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/lonlat/vue/lonlat.js@3.8
   * 
   * @since 3.9.0
   */
  'lonlat_input': lon_lat,

  /**
   * ORIGINAL SOURCE: src/gui/inputs/table/vue/table.js@3.8
   * 
   * @since 3.9.0
   */
  'table_input': table,

  /**
   * @since 3.9.0
   */
  'datetime_input': date_time,

  /**
   * @since 3.9.0
   */
  'layer_positions_input': layer_positions,

};

/*******************************************************
 * BACKCOMP (v3.x)
 *******************************************************/

components['link_field']                = _alias(components['media_input'],     { _mediaType: "link",    mode: "read" });
components['media_field']               = _alias(components['media_input'],     { _mediaType: "media",   mode: "read" });
components['image_field']               = _alias(components['media_input'],     { _mediaType: "image",   mode: "read" });
components['gallery_field']             = _alias(components['media_input'],     { _mediaType: "gallery", mode: "read" });
components['geo_input']                 = _alias(components['picklayer_input'], { _mediaType: "geo",     mode: "read" });
components['geo_field']                 = _alias(components['picklayer_input'], { _mediaType: "geo",     mode: "read" });

components['photo_field']               = components['image_field'];
components['g3w_link']                  = components['link_field']; // see: components/QueryResultsTableAttributeFieldValue.vue@3.8
components['select_autocomplete_input'] = components['select_input'];
components['string_input']              = components['text_input'];
components['text_field']                = components['text_input'];
components['simple_field']              = components['text_input'];
components['slider_input']              = components['range_input'];
components['range_slider_input']        = components['range_input'];

components['legacy']                    = _alias(legacy, { mode: "input" });
components['vue_field']                 = _alias(legacy, { mode: "read", _legacyType: "vue" });
components['g3w_vue']                   = components['vue_field'];  // see: components/QueryResultsTableAttributeFieldValue.vue@3.8


export default components;