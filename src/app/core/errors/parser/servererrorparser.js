const { t } = require('core/i18n/i18n.service');

module.exports = class serverErrorParser {
  constructor(opts = {}) {
    this._error = opts.error;
  }
  parse({ type = 'responseJSON' } = {}) {
    let error_message = "server_saver_error";
    function traverse(errorObject) {
      const entries = Object.entries(errorObject);
      const entry = entries.find(([key, _]) => 'fields' === key);
      if (entry) {
        const [, value] = entry;
        try {
          if (typeof value === 'string') {
            const [field] = entries.find(([key, _]) => 'fields' !== key);
            error_message = `[${field}] ${value}`;
          } else {
            error_message = '';
            Object
              .entries(value)
              .forEach(([field, error]) => error_message = `${error_message}${field} ${Array.isArray(error)? error[0] : error} \n`);
          }
        } catch(e) {
          console.warn(e);
        }
        return error_message.replace(/\:|\./g, '');
      } else {
        const [, value] = entries[0];
        if (!Array.isArray(value) && typeof value === 'object' ) {
          return traverse(value)
        }
      }
    }
    if ('responseJSON' === type) {
      if (this._error && this._error.responseJSON && this._error.responseJSON.error.message) {
        return this._error.responseJSON.error.message
      }
      else if (this._error && this._error.errors) {
        return traverse(this._error.errors);
      }
    } else if ('String' === type) {
      if (typeof this._error === 'string') {
        return this._error
      } else {
        return traverse(this._error)
      }
    }
    return t("server_saver_error");
  };
};

