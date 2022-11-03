import WorkflowsStack from 'services/workflows';
import GUI from 'services/gui';

const { base, inherit, resolve } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const Flow = require('core/workflow/flow');
const { MESSAGES } = require('core/workflow/step');
const createUserMessageStepsFactory = require('gui/workflow/createUserMessageStepsFactory');

//Class to manage flow of steps
function Workflow(options={}) {
  const {inputs=null, context=null, flow=new Flow(), steps=[], runOnce=false} = options;
  base(this);
  this._promise = null;
  // inputs mandatory to work with editing
  this._inputs = inputs;
  this._context = context;
  // flow object to control the flow
  this._flow = flow;
  // all steps of flow
  this._steps = steps;
  // if is child of another workflow
  this._child = null;
  // stack workflowindex
  this._stackIndex = null;
  // stop when flow stop
  this.runOnce = runOnce;
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

proto.setInput = function({key, value}) {
  this._inputs[key] = value;
};

/**
 * maybe unused method. Remove
 * @param inputs
 * @private
 */
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
  return length ? this._steps[length] : null;
};

proto.getRunningStep = function() {
  return this._steps.find(step => step.isRunning());
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
  const isChild = this._context.isChild || false;
  //check if are workflow running and if need to stop child
  if (WorkflowsStack.getLength() && WorkflowsStack.getCurrent() !== this) {
    !isChild && WorkflowsStack.getCurrent().addChild(this)
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
      closable: false,
      hooks: {
        body: stepsComponent
      }
    });
  }

  this._flow.start(this)
    .then(outputs => {
      showUserMessage && setTimeout(()=>{
        this.clearUserMessagesSteps();
        d.resolve(outputs)
      }, 500) || d.resolve(outputs);
    })
    .fail(error => {
      showUserMessage && this.clearUserMessagesSteps();
      d.reject(error);
    })
    .always(()=>{
      this.runOnce && this.stop();
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
      this._flow.stop()
        .then(() => d.resolve())
        .fail(err => d.reject(err))
        .always(() => this.clearMessages())
  });
  this.emit('stop');
  return d.promise();
};

proto.clearUserMessagesSteps = function(){
  this._resetUserMessaggeStepsDone();
  GUI.closeUserMessage();
};

proto._resetUserMessaggeStepsDone = function() {
  Object.keys(this._userMessageSteps).forEach(type => {
    const userMessageSteps = this._userMessageSteps[type];
    userMessageSteps.done = false;
    if (userMessageSteps.buttonnext) userMessageSteps.buttonnext.disabled = true;
  })
};

module.exports = Workflow;
