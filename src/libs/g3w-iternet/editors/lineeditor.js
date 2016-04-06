function LineEditor(config){
  this._vector = null;
  
  this.setVector = function(vector){
    this.vector = vector;
  }
}

module.exports = LineEditor;
