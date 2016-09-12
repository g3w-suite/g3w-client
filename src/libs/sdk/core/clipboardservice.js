function ClipboardService(){
  var _data = {};
  this.set = function(clipBoardId, data) {
    // id della feature copiata, data sono fileds e relations passate al form
    _data[clipBoardId] = data;
  };

  this.get = function(clipBoardId) {
    if (_data) {
      var data = _data[clipBoardId];
      // poi vado a cancellare i dati
      delete _data[clipBoardId];
      // retituisce i dati che sono stati salvati
      return data;
    } else {
      return _data
    }
  }
}
module.exports = new ClipboardService;
