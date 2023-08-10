/**
 * @file
 * @since v3.6
 */

class ClipboardService {

  constructor() {
    this._data = {};
  }

  set(formId, data) {
    this._data[formId.split('form')[0]] = data;
  }
  
  get(formLayer) {
    const data = this._data[formLayer] || {};
    this._data[formLayer] = {};
    return data;
  }

}

export default new ClipboardService();
