function ClipboardService() {
  this._data = {};
  this.set = function(formId, data) {
    // clipBoardId : id del form, data sono fileds e relations passate al form
    // il clipBoardForm mi serve per capire se attivare o meno la clipboard
    // se e solo se si riferisce allo stesso id
    var formLayer = formId.split('form')[0];
    this._data[formLayer] = data;
  };

  this.get = function(formLayer) {
    var data = this._data[formLayer] || {}
    this._data[formLayer] = {};
    return data;
  }
}
module.exports = new ClipboardService;
