import ApplicationService                    from 'services/application';
import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';

const Service                               = require('gui/inputs/service');

module.exports = class DateTimePickerService extends Service {
  constructor(opts = {}) {
    super(opts);

    this.validatorOptions = {};
  }

  getLocale() {
    return window.initConfig.user.i18n ? window.initConfig.user.i18n : 'en';
  };

  convertQGISDateTimeFormatToMoment(datetimeformat) {
    return convertQGISDateTimeFormatToMoment(datetimeformat);
  };

  setValidatorOptions(opts = {}) {
    this.validatorOptions = opts;
  };
};