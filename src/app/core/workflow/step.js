import G3WObject         from 'core/g3wobject';
import { base, inherit } from 'utils';

/**
 * @param options.input
 * @param options.context
 * @param options.task
 * @param options.outputs
 * @param options.escKeyPressEventHandler
 * @param options.id
 * @param options.name
 * @param options.help
 * @param options.message
 */
function Step(options = {}) {
  base(this);

  const {
    inputs  = null,
    context = null,
    task    = null,
    outputs = null,
    escKeyPressEventHandler,
  } = options;

  /**
   * @FIXME add description
   */
  this._inputs = inputs;

  /**
   * @FIXME add description
   */
  this._context = context;

  /**
   * @FIXME add description
   */
  this._task = task;

  /**
   * @FIXME add description
   */
  this._outputs = outputs;

  /**
   * Dynamic state of step
   */
  this.state = {
    id:      options.id || null,
    name:    options.name || null,
    help:    options.help || null,   // help to show what the user has to do
    running: false,                  // running
    error:   null,                   // error
    message: options.message || null // message
  };

  if (escKeyPressEventHandler) {
    this.registerEscKeyEvent(escKeyPressEventHandler)
  }

}

inherit(Step, G3WObject);

const proto = Step.prototype;

/**
 * Bind interrupt event on keys escape pressed
 * 
 * @param evt.key
 * @param evt.data.callback
 * @param evt.data.task
 */
proto.escKeyUpHandler = function(evt) {
  if ('Escape' === evt.key) {
    evt.data.callback({ task: evt.data.task });
  }
};

/**
 * @FIXME add description
 */
proto.unbindEscKeyUp = function() {
  $(document).unbind('keyup', this.escKeyUpHandler);
};

/**
 * @FIXME add description
 */
proto.bindEscKeyUp = function(callback = () => {}) {
  $(document).on('keyup', { callback, task: this.getTask()}, this.escKeyUpHandler);
};

/**
 * @listens run
 * @listens stop
 */
proto.registerEscKeyEvent = function(callback) {
  this.on('run', ()  => this.bindEscKeyUp(callback));
  this.on('stop', () => this.unbindEscKeyUp());
};

/**
 * Start task
 * 
 * @param inputs 
 * @param context 
 * @param queques 
 * 
 * @returns jQuery promise
 * 
 * @fires run
 */ 
proto.run = function(inputs, context, queques) {
  const d = $.Deferred();

  this.emit('run', { inputs, context });

  if (this._task) {
    try {
      this.state.running = true;                // change state to running
      this._task.setInputs(inputs);
      this._task.setContext(context);
      this._task
        .run(inputs, context, queques)
        .then(outputs => { this.stop(); d.resolve(outputs); })
        .fail(err     => { this.stop(); d.reject(err); });
    } catch(err) {
      console.warn(err)
      this.state.error = err;
      this.state.error = 'Problem ..';
      this.stop();
      d.reject(err);
    }
  }

  return d.promise();
};

/**
 * Stop step
 * 
 * @fires stop
 */
proto.stop = function() {
  this._task.stop(this._inputs, this._context);   // stop task
  this.state.running = false;                     // remove running state 
  this.emit('stop');
  this._task.setInputs(null);
  this._task.setContext(null);
};

/**
 * Revert task
 */
proto.revert = function() {
  if (this._task && this._task.revert) {
    this._task.revert();
  }
};

/**
 * @FIXME add description
 */
proto.panic = function() {
  if (this._task && this._task.panic) {
    this._task.panic();
  }
};

/**
 * @FIXME add description
 */
proto.getId = function() {
  return this.state.id;
};

/**
 * @FIXME add description
 */
proto.getName = function() {
  return this.state.name;
};

/**
 * @FIXME add description
 */
proto.getHelp = function() {
  return this.state.help;
};

/**
 * @FIXME add description
 */
proto.getError = function() {
  return this.state.error;
};

/**
 * @FIXME add description
 */
proto.getMessage = function() {
  return this.state.message;
};

/**
 * @FIXME add description
 */
proto.isRunning = function() {
  return this.state.running;
};

/**
 * @FIXME add description
 */
proto.setInputs = function(inputs) {
  this._inputs = inputs;
};

/**
 * @FIXME add description
 */
proto.getInputs = function() {
  return this._inputs;
};

/**
 * @FIXME add description
 */
proto.setTask = function(task) {
  this._task = task;
};

/**
 * @FIXME add description
 */
proto.getTask = function() {
  return this._task;
};

/**
 * @FIXME add description
 */
proto.setOutputs = function(outputs) {
  this._outputs = outputs;
};

/**
 * @FIXME add description
 */
proto.getOutputs = function() {
  return this._outputs;
};

/**
 * @FIXME add description
 */
Step.MESSAGES = {
  help: null,
};

module.exports = Step;