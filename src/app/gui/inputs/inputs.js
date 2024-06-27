const InputsComponents = {
  'text_input':                require('./text/vue/text'),
  'texthtml_input':            require('./texthtml/vue/texthtml'),
  'textarea_input':            require('./textarea/vue/textarea'),
  'integer_input':             require('./integer/vue/integer'),
  'string_input':              require('./text/vue/text'), //temporary
  'float_input':               require('./float/vue/float'),
  'radio_input':               require('./radio/vue/radio'),
  'check_input':               require('./checkbox/vue/checkbox'),
  'range_input':               require('./range/vue/range'),
  'datetimepicker_input':      require('./datetimepicker/vue/datetimepicker'),
  'unique_input':              require('./unique/vue/unique'),
  'select_input':              require('./select/vue/select'),
  'media_input':               require('./media/vue/media'),
  'select_autocomplete_input': require('./select/vue/select'),
  'picklayer_input':           require('./picklayer/vue/picklayer'),
  'color_input':               require('./color/vue/color'),
  'slider_input':              require('./sliderrange/vue/sliderrange'),
  'lonlat_input':              require('./lonlat/vue/lonlat'),
};

module.exports = InputsComponents;
