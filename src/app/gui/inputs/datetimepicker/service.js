import ApplicationService                    from 'services/application';
import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';

const Service                               = require('gui/inputs/service');

module.exports = class DateTimePickerService extends Service {
  constructor(opts = {}) {
    super(opts);

    this.validatorOptions = {};
  }

  getLocale() {
    const config = ApplicationService.getConfig();
    return config.user.i18n ? config.user.i18n : 'en';
  };

  convertQGISDateTimeFormatToMoment(datetimeformat) {
    return convertQGISDateTimeFormatToMoment(datetimeformat);
  };

  setValidatorOptions(opts = {}) {
    this.validatorOptions = opts;
  };
};