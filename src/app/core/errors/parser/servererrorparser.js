import { t } from 'core/i18n/i18n.service';

class serverErrorParser {
  constructor(options = {}) {
    this._error = options.error;
  }

  parse({ type = 'responseJSON' } = {}) {
    let error_message = 'server_saver_error';
    function traverseErrorMessage(errorObject) {
      const entries = Object.entries(errorObject);
      const entry = entries.find(([key, value]) => key === 'fields');
      if (entry) {
        const [, value] = entry;
        try {
          if (typeof value === 'string') {
            const [field] = entries.find(([key, value]) => key !== 'fields');
            error_message = `[${field}] ${value}`;
          } else {
            error_message = '';
            Object.entries(value).forEach(([field, error]) => {
              error_message = `${error_message}${field} ${Array.isArray(error) ? error[0] : error} `;
            });
          }
        } catch (err) {}
        return error_message.replace(/\:|\./g, '');
      }
      const [, value] = entries[0];
      if (!Array.isArray(value) && typeof value === 'object') return traverseErrorMessage(value);
    }
    if (type === 'responseJSON') return (this._error && this._error.responseJSON && this._error.responseJSON.error.message) ? this._error.responseJSON.error.message : t('server_saver_error');
    if (type === 'String') {
      if (typeof this._error === 'string') return this._error;
      return traverseErrorMessage(this._error);
    } return t('server_saver_error');
  }
}

export default serverErrorParser;
