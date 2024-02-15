import G3WObject         from 'core/g3wobject';
import { base, inherit } from 'utils';

function Task(options={}) {
  base(this, options);
  this.state = {
    usermessagesteps: {}
  };
}

inherit(Task, G3WObject);

const proto = Task.prototype;

/**
 * Set and get task usefult properties used to run
 */

proto.setInputs = function(inputs){
  this.inputs = inputs;
};

proto.getInputs = function(){
  return this.inputs;
};

proto.setContext = function(context){
  return this.context = context;
};

proto.getContext = function(){
  return this.context;
};

proto.revert = function() {
  console.log('Revert to implemente ');
};

proto.panic = function() {
  console.log('Panic to implement ..');
};

proto.stop = function() {
  console.log('Task Stop to implement ..');
};

proto.run = function() {
  console.log('Wrong. This method has to be overwrite from task');
};

proto.setRoot = function(task) {
  this.state.root = task;
};

proto.getUserMessageSteps = function() {
  return this.state.usermessagesteps;
};

proto.setUserMessageSteps = function(steps={}) {
  this.state.usermessagesteps = steps;
};

proto.setUserMessageStepDone = function(type) {
  if (type) this.state.usermessagesteps[type].done = true;
};

module.exports = Task;
