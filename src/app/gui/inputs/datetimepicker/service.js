const {inherit, base, convertQGISDateTimeFormatToMoment} = require('core/utils/utils');
const ApplicationService = require('core/applicationservice');
const Service = require('gui/inputs/service');

function DateTimePickerService(options={}) {
  this.validatorOptions = {};
  base(this, options);
}

inherit(DateTimePickerService, Service);

const proto = DateTimePickerService.prototype;

proto.getLocale = function() {
  const applicationConfig = ApplicationService.getConfig();
  return applicationConfig.user.i18n ? applicationConfig.user.i18n : 'en';
};

proto.convertQGISDateTimeFormatToMoment = function(datetimeformat) {
  return convertQGISDateTimeFormatToMoment(datetimeformat);
};

proto.setValidatorOptions = function(options) {
  this.validatorOptions = options;
};

module.exports = DateTimePickerService;
