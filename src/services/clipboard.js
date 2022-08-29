/**
 * ORIGINAL SOURCE: src/app/core/clipboardservice.js@v3.4
 */

function ClipboardService() {
    this._data = {};
    this.set = function(formId, data) {
      const formLayer = formId.split('form')[0];
      this._data[formLayer] = data;
    };
  
    this.get = function(formLayer) {
      const data = this._data[formLayer] || {};
      this._data[formLayer] = {};
      return data;
    };
}

export default new ClipboardService();
