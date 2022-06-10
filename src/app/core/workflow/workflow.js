import utils from 'core/utils/utils';
import G3WObject from 'core/g3wobject';
import Flow  from './flow';
import WorkflowsStack  from './workflowsstack';
import {MESSAGES}  from './step';
import createUserMessageStepsFactory  from 'gui/workflow/createUserMessageStepsFactory';
import GUI  from 'gui/gui';
//Class to manage flow of steps
class Workflow extends G3WObject{

  constructor(options={}) {
    super();
    const {inputs=null, context=null, flow=new Flow(), steps=[], runOnce=false} = options;
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
  };

  getContextService() {
    const context = this.getContext();
    return context.service;
  };

  setContextService(service) {
    const context = this.getContext();
    context.service = service;
  };

  getStackIndex() {
    return this._stackIndex;
  };

  addChild(workflow) {
    if (this._child) this._child.addChild(workflow);
    else this._child = workflow;
  };

  removeChild() {
    if (this._child) {
      const index = this._child.getStackIndex();
      WorkflowsStack.removeAt(index);
    }
    this._child = null;
  };

  _setInputs(inputs) {
    this._inputs = inputs;
  };

  getInputs() {
    return this._inputs;
  };

  setContext(context) {
    this._context = context;
  };

  getContext() {
    return this._context;
  };

  getFlow() {
    return this._flow;
  };

  setFlow(flow) {
    this._flow = flow;
  };

  addStep(step) {
    this._steps.push(step);
  };

  setSteps(steps) {
    this._steps = steps;
  };

  getSteps() {
    return this._steps;
  };

  getStep(index) {
    return this._steps[index];
  };

  setMessages(messages) {
    Object.assign(this._messages, messages);
  };

  getMessages() {
    return this._messages;
  };

  clearMessages() {
    this._messages.help = null;
    this._isThereUserMessaggeSteps() && this.clearUserMessagesSteps();
  };

  getLastStep() {
    const length = this._steps.length;
    return length ? this._steps[length] : null;
  };

  getRunningStep() {
    return this._steps.find(step => step.isRunning());
  };

//stop all workflow children
  _stopChild() {
    return this._child ? this._child.stop(): utils.resolve();
  };

  _isThereUserMessaggeSteps() {
    return Object.keys(this._userMessageSteps).length;
  };

  reject () {
    this._promise && this._promise.reject();
  };

  resolve() {
    this._promise && this._promise.resolve();
  };

// start workflow
  start(options={}) {
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
  stop() {
    this._promise = null;
    ////console.log('Workflow stopping .... ';
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

  clearUserMessagesSteps() {
    this._resetUserMessaggeStepsDone();
    GUI.closeUserMessage();
  };

  _resetUserMessaggeStepsDone() {
    Object.keys(this._userMessageSteps).forEach(type => {
      const userMessageSteps = this._userMessageSteps[type];
      userMessageSteps.done = false;
      if (userMessageSteps.buttonnext) userMessageSteps.buttonnext.disabled = true;
    })
  };

}

export default  Workflow;
