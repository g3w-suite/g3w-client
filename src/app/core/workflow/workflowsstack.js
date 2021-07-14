// Store all workflow activated
const WorkFlowsStack = function() {
  this._workflows = [];
  this.push = function(workflow) {
    if (this._workflows.indexOf(workflow) === -1) return this._workflows.push(workflow) - 1;
    return this._workflows.indexOf(workflow);
  };

  this.getParent = function() {
    const index = this._getCurrentIndex();
    return index > 0 &&  this._workflows[index -1];
  };

  this.pop = function() {
   return this._workflows.pop()
  };

  this.getLength = function() {
    return this._workflows.length;
  };

  this._getCurrentIndex = function() {
    const currentWorkflow = this.getCurrent();
    return this._workflows.findIndex(workfow => workfow === currentWorkflow)
  };

  this.getCurrent = function() {
    return this.getLast();
  };

  this.getLast = function() {
    const length = this._workflows.length;
    return length ? this._workflows[length -1] : null;
  };

  this.getFirst = function() {
    return this._workflows[0];
  };

  this.removeAt = function(index) {
    this._workflows.splice(index, 1);
  };

  this.getAt = function(index) {
    return this._workflows[index];
  };

  this.insertAt = function(index, workflow) {
    this._workflows[index] = workflow;
  }

};

module.exports = new WorkFlowsStack;
