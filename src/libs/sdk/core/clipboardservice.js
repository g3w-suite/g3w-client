function ClipboardService(){
  var _data = {};

  this.set = function(clipBoardId,data) {
    _data[clipBoardId] = data;
  };

  this.get = function(clipBoardId) {
    return _data[clipBoardId];
    delete  _data[clipBoardId];
  }
}
module.exports = new ClipboardService;
