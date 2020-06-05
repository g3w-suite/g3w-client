function Queque() {
  this.tasks = [];
}

const proto = Queque.prototype;

proto.addTask = function(task){
  this.tasks.push(task);
};

proto.run = function(reverse=false){
  while (this.tasks.length) {
    const task  = reverse ? this.tasks.pop() : this.tasks.shift();
    task();
  }
};

proto.flush = function(){
  return this.tasks.splice(0);
}

proto.getLength = function(){
  return this.tasks.length;
}

proto.clear = function(){
  this.run();
  this.tasks = [];
}

module.exports = Queque;

