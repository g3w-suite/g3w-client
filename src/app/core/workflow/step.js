import G3WObject from 'core/g3wobject';

class Step extends G3WObject{
  constructor(options={}) {
    super();
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
  };


//bind interrupt event on keys escape pressed

  escKeyUpHandler(evt) {
    const {task, callback} = evt.data;
    if (evt.key === 'Escape') callback({
      task
    });
  };

  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  };

  bindEscKeyUp(callback=()=>{}) {
    $(document).on('keyup', {
      callback,
      task: this.getTask()
    }, this.escKeyUpHandler);
  };

  registerEscKeyEvent(callback){
    this.on('run', ()=> this.bindEscKeyUp(callback));
    this.on('stop', ()=> this.unbindEscKeyUp());
  };

// End of handle key esc pressed

// method to start task
  run(inputs, context, queques) {
    //emit run
    this.emit('run', {
      inputs,
      context
    });
    const d = $.Deferred();
    if (this._task) {
      try {
        // change state to running
        this.state.running = true;
        this._task.setInputs(inputs);
        this._task.setContext(context);
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
        console.log(err)
        this.state.error = err;
        this.state.error = 'Problem ..';
        this.stop();
        d.reject(err);
      }
    }
    return d.promise();
  };

// stop step
  stop() {
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
  revert() {
    if (this._task && this._task.revert) this._task.revert();
  };

//panic
  panic() {
    if (this._task && this._task.panic) this._task.panic();
  };

  getId() {
    return this.state.id;
  };

  getName() {
    return this.state.name;
  };

  getHelp() {
    return this.state.help;
  };

  getError() {
    return this.state.error;
  };

  getMessage() {
    return this.state.message;
  };

  isRunning() {
    return this.state.running;
  };

  setInputs(inputs) {
    this._inputs = inputs;
  };

  getInputs() {
    return this._inputs;
  };

  setTask(task) {
    this._task = task;
  };

  getTask() {
    return this._task;
  };

  setOutputs(outputs) {
    this._outputs = outputs;
  };

  getOutputs() {
    return this._outputs;
  };

  static MESSAGES = {
    help: null
  };
};



export default  Step;
