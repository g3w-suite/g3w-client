import G3WObject from 'core/g3wobject';

class Task extends G3WObject {
  constructor(options={}) {
    super(options);
    this.state = {
      usermessagesteps: {}
    };
  }
  /**
   * Set and get task usefult properties used to run
   */

  setInputs(inputs) {
    this.inputs = inputs;
  };

  getInputs() {
    return this.inputs;
  };

  setContext(context) {
    return this.context = context;
  };

  getContext() {
    return this.context;
  };

  revert() {
    console.log('Revert to implemente ');
  };

  panic() {
    console.log('Panic to implement ..');
  };

  stop() {
    console.log('Task Stop to implement ..');
  };

  run() {
    console.log('Wrong. This method has to be overwrite from task');
  };

  setRoot(task) {
    this.state.root = task;
  };

  getUserMessageSteps() {
    return this.state.usermessagesteps;
  };

  setUserMessageSteps(steps={}) {
    this.state.usermessagesteps = steps;
  };

  setUserMessageStepDone(type) {
    if (type) this.state.usermessagesteps[type].done = true;
  };
}

export default  Task;
