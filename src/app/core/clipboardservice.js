class ClipboardService {
  constructor() {
    this._data = {};
  }

  set(formId, data) {
    const formLayer = formId.split('form')[0];
    this._data[formLayer] = data;
  };

  get(formLayer) {
    const data = this._data[formLayer] || {};
    this._data[formLayer] = {};
    return data;
  };

}
export default new ClipboardService();
