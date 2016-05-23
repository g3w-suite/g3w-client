function Field(options){
  var options = options || {};
  this.type = options.type || null;
  this.name = options.name || null;
  this.input = options.input || null;
}
var proto = Field.prototype;

proto.setName = function(name){
  this.name = name;
};

proto.setType = function(type){
  this.type = type;
};

proto.setInput = function(config){
  this.input = input;
};

proto.setInputFromConfig = function(config){
  this.input = new Input(config);
};

function Input(config){
  var config = config || {};
  this.label = config.label || null;
  this.type = config.type || null;
  this.options = config.options || null
}

proto.setLabel = function(label){
  this.label = label;
};

proto.setType = function(type){
  this.type = type;
};

proto.setOptions = function(options){
  this.options = options;
};

module.exports = {
  Field: Field,
  Input: Input
};


