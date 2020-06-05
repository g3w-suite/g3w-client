const resolve = require('core/utils/utils').resolve;
const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
const t = require('core/i18n/i18n.service').t;
const G3WObject = require('core/g3wobject');
const Flow = require('./flow');
const WorkflowsStack = require('./workflowsstack');
const MESSAGES = require('./step').MESSAGES;
const createUserMessageStepsFactory = require('gui/workflow/createUserMessageStepsFactory');
const GUI = require('gui/gui');
//Class to manage flow of steps
function Workflow(options={}) {
  base(this);
  this._promise = null;
  // inputs mandatory to work with editing
  this._inputs = options.inputs || null;
  this._context = options.context || null;
  // flow object to control the flow
  this._flow = options.flow || new Flow();
  // all steps of flow
  this._steps = options.steps || [];
  // if is child of another workflow
  this._child = null;
  // stack workflowindex
  this._stackIndex = null;
  this._messages = MESSAGES;
  this._userMessageSteps = this._steps.reduce((messagesSteps, step) => {
    const usermessagesteps = step.getTask().getUserMessageSteps();
    return usermessagesteps && {
      ...messagesSteps,
      ...usermessagesteps,
    } || messagesSteps
  },  {});
}

inherit(Workflow, G3WObject);

const proto = Workflow.prototype;

proto.getContextService = function() {
  const context = this.getContext();
  return context.service;
};

proto.setContextService = function(service) {
  const context = this.getContext();
  context.service = service;
};

proto.getStackIndex = function() {
  return this._stackIndex;
};

proto.addChild = function(workflow) {
  if (this._child) this._child.addChild(workflow);
  else this._child = workflow;
};

proto.removeChild = function() {
  if (this._child) {
    const index = this._child.getStackIndex();
    WorkflowsStack.removeAt(index);
  }
  this._child = null;
};

proto._setInputs = function(inputs) {
 this._inputs = inputs;
};

proto.getInputs = function() {
  return this._inputs;
};

proto.setContext = function(context) {
 this._context = context;
};

proto.getContext = function() {
  return this._context;
};

proto.getFlow = function() {
  return this._flow;
};

proto.setFlow = function(flow) {
  this._flow = flow;
};

proto.addStep = function(step) {
  this._steps.push(step);
};

proto.setSteps = function(steps) {
  this._steps = steps;
};

proto.getSteps = function() {
  return this._steps;
};

proto.getStep = function(index) {
  return this._steps[index];
};

proto.setMessages = function(messages) {
  Object.assign(this._messages, messages);
};

proto.getMessages = function() {
  return this._messages;
};

proto.clearMessages = function() {
  this._messages.help = null;
  this._isThereUserMessaggeSteps() && this.clearUserMessagesSteps();
};

proto.getLastStep = function() {
  const length = this._steps.length;
  if (length) {
    return this._steps[length]
  }
  return null;
};

proto.getRunningStep = function() {
  return this._steps.find((step) => {
    return step.isRunning()
  });
};

//stop all workflow children
proto._stopChild = function() {
  return this._child ? this._child.stop(): resolve();
};

proto._isThereUserMessaggeSteps = function() {
  return Object.keys(this._userMessageSteps).length;
};

proto.reject  = function(){
  this._promise && this._promise.reject();
};

proto.resolve = function(){
  this._promise && this._promise.resolve();
};

// start workflow
proto.start = function(options={}) {
  const d = $.Deferred();
  this._promise = d;
  this._inputs = options.inputs;
  this._context = options.context || {};
  //check if are workflow running
  if (WorkflowsStack.getLength() && WorkflowsStack.getCurrent() !== this) {
    WorkflowsStack.getCurrent().addChild(this);
  }
  this._stackIndex = WorkflowsStack.push(this);
  this._flow = options.flow || this._flow;
  this._steps = options.steps || this._steps;
  const showUserMessage = this._isThereUserMessaggeSteps();
  if (showUserMessage) {
    const stepsComponent = createUserMessageStepsFactory({
      steps: this._userMessageSteps
    });
    GUI.showUserMessage({
      title: 'sdk.workflow.steps.title',
      type: 'tool',
      position: 'left',
      size: 'small',
      hooks: {
        body: stepsComponent
      }
    });
  }

  this._flow.start(this)
    .then((outputs) => {
      showUserMessage && setTimeout(()=>{
        this.clearUserMessagesSteps();
        d.resolve(outputs)
      }, 500) || d.resolve(outputs);
    })
    .fail((error) => {
      if (showUserMessage){
       this.clearUserMessagesSteps();
      }
      d.reject(error);
    });
  this.emit('start');
  return d.promise();
};

// stop workflow during flow
proto.stop = function() {
  this._promise = null;
  ////console.log('Workflow stopping .... ');
  const d = $.Deferred();
  // stop child workflow indpendent from father workflow
  this._stopChild()
    // in every case remove child
    .always(() => {
      this.removeChild();
      WorkflowsStack.removeAt(this.getStackIndex());
      // call stop flow
      this._flow.stop() // ritorna una promessa
        .then(() => {
          d.resolve()
        })
        .fail((err) => {
          // mi serve per capire cosa fare
          d.reject(err)
        })
        .always(() => {
          this.clearMessages();
        })
  });
  this.emit('stop');
  return d.promise();
};

proto.clearUserMessagesSteps = function(){
  this._resetUserMessaggeStepsDone();
  GUI.closeUserMessage();
};

proto._resetUserMessaggeStepsDone = function() {
  Object.keys(this._userMessageSteps).forEach((type) => {
    this._userMessageSteps[type].done = false;
  })
};

module.exports = Workflow;
