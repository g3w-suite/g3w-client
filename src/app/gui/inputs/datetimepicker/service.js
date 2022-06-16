import ApplicationService from 'core/applicationservice';
import Service from 'gui/inputs/service';

class DateTimePickerService extends Service {
  constructor(options = {}) {
    super(options);
    this.validatorOptions = {};
  }

  getLocale() {
    const applicationConfig = ApplicationService.getConfig();
    return applicationConfig.user.i18n ? applicationConfig.user.i18n : 'en';
  }

  convertQGISDateTimeFormatToMoment(datetimeformat) {
    datetimeformat = datetimeformat.replace('yyyy', 'YYYY');
    const matchDayInDate = datetimeformat.match(/d/g);
    if (matchDayInDate && matchDayInDate.length < 3) {
      datetimeformat = datetimeformat.replace('d'.repeat(matchDayInDate.length), 'D'.repeat(matchDayInDate.length));
    }
    return datetimeformat;
  }

  setValidatorOptions(options) {
    this.validatorOptions = options;
  }
}

export default DateTimePickerService;
