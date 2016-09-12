function ClipboardService() {
  this._data = {};
  this.set = function(formId, data) {
    // clipBoardId : id del form, data sono fileds e relations passate al form
    // il clipBoardForm mi serve per capire se attivare o meno la clipboard
    // se e solo se si riferisce allo stesso id
    this._data[formId] = data;
  };

  this.get = function(formId) {
    return this._data[formId] || {};
  }
}
module.exports = new ClipboardService;
