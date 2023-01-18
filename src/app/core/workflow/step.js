const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function Step(options={}) {
  base(this);
  const {inputs=null, context=null, task= null, outputs=null, escKeyPressEventHandler} = options;
  this._inputs = inputs;
  this._context = context;
  this._task = task;
  this._outputs = outputs;
  //dynamic state of step
  this.state = {
    id: options.id || null,
    name: options.name || null,
    help: options.help || null, // help to show wat the user has to do
    running: false, // running
    error: null, // error
    message: options.message || null // message
  };
  escKeyPressEventHandler && this.registerEscKeyEvent(escKeyPressEventHandler)
}

inherit(Step, G3WObject);

const proto = Step.prototype;

//bind interrupt event on keys escape pressed

proto.escKeyUpHandler = function(evt) {
   const {task, callback} = evt.data;
  if (evt.key === 'Escape') callback({
    task
  });
};

proto.unbindEscKeyUp = function() {
  $(document).unbind('keyup', this.escKeyUpHandler);
};

proto.bindEscKeyUp = function(callback=()=>{}) {
  $(document).on('keyup', {
    callback,
    task: this.getTask()
  }, this.escKeyUpHandler);
};

proto.registerEscKeyEvent = function(callback){
  this.on('run', ()=> this.bindEscKeyUp(callback));
  this.on('stop', ()=> this.unbindEscKeyUp());
};

// End of handle key esc pressed

// method to start task
proto.run = function(inputs, context, queques) {
  //emit run
  this.emit('run', {
    inputs,
    context
  });
  return new Promise((resolve, reject) => {
    if (this._task) {
      try {
        // change state to running
        this.state.running = true;
        this._task.setInputs(inputs);
        this._task.setContext(context);
        this._task.run(inputs, context, queques)
          .then(outputs => {
            this.stop();
            resolve(outputs);
          })
          .catch(err => {
            this.stop();
            reject(err);
          })
      }
      catch(err) {
        this.state.error = err;
        this.state.error = 'Problem ..';
        this.stop();
        reject(err);
      }
    }
  })
};

// stop step
proto.stop = function() {
  // stop task
  this._task.stop(this._inputs, this._context);
  //emit run
  // running to false
  this.state.running = false;
  this.emit('stop');
  this._task.setInputs(null);
  this._task.setContext(null);
};

// revert task
proto.revert = function() {
  if (this._task && this._task.revert) this._task.revert();
};

//panic
proto.panic = function() {
  if (this._task && this._task.panic) this._task.panic();
};

proto.getId = function() {
  return this.state.id;
};

proto.getName = function() {
  return this.state.name;
};

proto.getHelp = function() {
  return this.state.help;
};

proto.getError = function() {
  return this.state.error;
};

proto.getMessage = function() {
  return this.state.message;
};

proto.isRunning = function() {
  return this.state.running;
};

proto.setInputs = function(inputs) {
  this._inputs = inputs;
};

proto.getInputs = function() {
  return this._inputs;
};

proto.setTask = function(task) {
  this._task = task;
};

proto.getTask = function() {
  return this._task;
};

proto.setOutputs = function(outputs) {
  this._outputs = outputs;
};

proto.getOutputs = function() {
  return this._outputs;
};

Step.MESSAGES = {
  help: null
};


module.exports = Step;
