import G3WObject from 'core/g3wobject';
import Queque from './queque';

// Class Flow of workflow step by step
class Flow extends G3WObject {
  constructor() {
    super();
    this.steps = [];
    this.inputs;
    this.counter = 0;
    this.context = null;
    this._workflow;
    this.queques = {
      end: new Queque(),
      micro: new Queque(),
    };
    this.d = $.Deferred();
  }

  // start workflow
  start(workflow) {
    if (counter > 0) {
      console.log('reset workflow before restarting');
    }
    this._workflow = workflow;
    this.inputs = workflow.getInputs();
    this.context = workflow.getContext();
    this.steps = workflow.getSteps();
    // check if there are steps
    if (this.steps && this.steps.length) {
      // run step (first)
      this.runStep(this.steps[0], this.inputs, this.context);
    }
    // return a promise that will be reolved if all step go right
    return this.d.promise();
  }

  // run step
  runStep(step, inputs) {
    // run step that run task
    this._workflow.setMessages({
      help: step.state.help,
    });
    const runMicroTasks = this.queques.micro.getLength();
    step.run(inputs, context, this.queques)
      .then((outputs) => {
        runMicroTasks && this.queques.micro.run();
        this.onDone(outputs);
      })
      .fail((error) => this.onError(error));
  }

  // check if all step are resolved
  onDone(outputs) {
    this.counter++;
    if (this.counter === this.steps.length) {
      this.counter = 0;
      this.d.resolve(outputs);
      return;
    }
    this.runStep(steps[counter], outputs);
  }

  // in case of error
  onError(err) {
    this.counter = 0;
    this.clearQueques();
    this.d.reject(err);
  }

  // stop flow
  stop() {
    const d = $.Deferred();
    this.steps[counter].isRunning() ? this.steps[counter].stop() : null;
    this.clearQueques();
    if (this.counter > 0) {
      // set counter to 0
      this.counter = 0;
      // reject flow
      d.reject();
    } else {
      // reject to force rollback session
      d.resolve();
    }
    return d.promise();
  }

  clearQueques() {
    this.queques.micro.clear();
    this.queques.end.clear();
  }
}

export default Flow;
