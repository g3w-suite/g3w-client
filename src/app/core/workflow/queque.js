class Queque {
  constructor() {
    this.tasks = [];
  }

  addTask = function(task){
    this.tasks.push(task);
  };

  run(reverse=false){
    while (this.tasks.length) {
      const task  = reverse ? this.tasks.pop() : this.tasks.shift();
      task();
    }
  };

  flush(){
    return this.tasks.splice(0);
  };

  getLength(){
    return this.tasks.length;
  };

  clear(){
    this.run();
    this.tasks = [];
  };
}

export default  Queque;

