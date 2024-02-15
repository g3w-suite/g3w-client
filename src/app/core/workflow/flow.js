import G3WObject         from 'core/g3wobject';
import { base, inherit } from 'utils';

const Queque             = require('core/workflow/queque');

//Class Flow of workflow step by step
function Flow() {
  let steps = [];
  let inputs;
  let counter = 0;
  let context = null;
  let d;
  let _workflow;
  this.queques = {
    end: new Queque(),
    micro: new Queque()
  };
  //start workflow
  this.start = function(workflow) {
    d = $.Deferred();
    if (counter > 0) {
      console.log("reset workflow before restarting");
    }
    _workflow = workflow;
    inputs = workflow.getInputs();
    context = workflow.getContext();
    steps = workflow.getSteps();
    // check if there are steps
    if (steps && steps.length) {
      //run step (first)
      this.runStep(steps[0], inputs, context);
    }
    // return a promise that will be reolved if all step go right
    return d.promise();
  };

  //run step
  this.runStep = function(step, inputs) {
    //run step that run task
    _workflow.setMessages({
      help: step.state.help
    });
    const runMicroTasks = this.queques.micro.getLength();
    step.run(inputs, context, this.queques)
      .then(outputs => {
        runMicroTasks && this.queques.micro.run();
        this.onDone(outputs);
      })
      .fail(error => this.onError(error));
  };

  //check if all step are resolved
  this.onDone = function(outputs) {
    counter++;
    if (counter === steps.length) {
      counter = 0;
      d.resolve(outputs);
      return;
    }
    this.runStep(steps[counter], outputs);
  };

  // in case of error
  this.onError = function(err) {
    counter = 0;
    this.clearQueques();
    d.reject(err);
  };

  // stop flow
  this.stop = function() {
    const d = $.Deferred();
    steps[counter].isRunning() ? steps[counter].stop() : null;
    this.clearQueques();
    if (counter > 0) {
      // set counter to 0
      counter = 0;
      // reject flow
      d.reject();
    } else {
      //reject to force rollback session
      d.resolve();
    }
    return d.promise();
  };
  base(this)
}

inherit(Flow, G3WObject);

const proto = Flow.prototype;

proto.clearQueques = function(){
  this.queques.micro.clear();
  this.queques.end.clear();
};

module.exports = Flow;

