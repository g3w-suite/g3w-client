const InputsServices = {
  'text':                require('./service'),
  'textarea':            require('./service'),
  'texthtml':            require('./service'),
  'integer':             require('./integer/service'),
  'string':              require('./service'),
  'float':               require('./float/service'),
  'radio':               require('./radio/service'),
  'check':               require('./checkbox/service'),
  'range':               require('./range/service'),
  'datetimepicker':      require('./datetimepicker/service'),
  'unique':              require('./unique/service'),
  'select':              require('./select/service'),
  'media':               require('./media/service'),
  'select_autocomplete': require('./select/service'),
  'picklayer':           require('./service'),
  'color':               require('./service'),
  'slider':              require('./sliderrange/service'),
  'lonlat':              require('./lonlat/service'),
};

module.exports = InputsServices;
