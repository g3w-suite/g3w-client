const {base, inherit}= require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function Step(options={}) {
  base(this);
  this._inputs = options.inputs || null;
  this._task = options.task || null;
  this._outputs = options.outputs || null;
  //dynamic state of step
  this.state = {
    id: options.id || null,
    name: options.name || null,
    help: options.help || null, // help to show wat the user has to do
    running: false, // running
    error: null, // error
    message: options.message || null // message
  };
}

inherit(Step, G3WObject);

const proto = Step.prototype;

// method to start task
proto.run = function(inputs, context, queques) {
  //emit run
  this.emit('run', {inputs, context});
  const d = $.Deferred();
  if (this._task) {
    try {
      // change state to running
      this.state.running = true;
      this._task.run(inputs, context, queques)
        .then(outputs => {
          this.stop();
          d.resolve(outputs);
        })
        .fail(err => {
          this.stop();
          d.reject(err);
        })
    }
    catch(err) {
      this.state.error = err;
      this.state.error = 'Problem ..';
      this.stop();
      d.reject(err);
    }
  }
  return d.promise();
};

// stop step
proto.stop = function() {
  // stop task
  this._task.stop();
  // running to false
  this.state.running = false;
  //emit run
  this.emit('stop');
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
