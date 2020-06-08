const t = require('core/i18n/i18n.service').t;

const serverErrorParser = function(options={}) {
  this._error = options.error;
};

const proto = serverErrorParser.prototype;

proto.parse = function({type='responseJSON'}={}) {
  let error_message = '';
  function traverseErrorMessage(errorObject) {
    let errormessage = "server_saver_error";
    Object.entries(errorObject).find(([key, value]) => {
      if (key === 'fields') {
        try {
          if (typeof value === 'string') error_message = value;
          else
            Object.entries(value).forEach(([field, error]) => {
              error_message = `${error_message}${field} ${error[0]} `;
            })
        } catch(err){}
        return true;
      } else if (!Array.isArray(value) && typeof value === 'object' ) {
        traverseErrorMessage(value);
      }
    });
    return error_message;
  }
  if (type === 'responseJSON')
    return  (this._error && this._error.responseJSON && this._error.responseJSON.error.message) ? this._error.responseJSON.error.message : t("server_saver_error");
  else if (type=== 'String') {
    if (typeof this._error === 'string') {
      return this._error
    } else {
      return traverseErrorMessage(this._error)
    }
  }
  else return t("server_saver_error");
};

module.exports = serverErrorParser;

