/**
 * ORIGINAL SOURCE: src/app/core/workflow/workflowsstack.js@v3.4
 */

// Store all workflow activated
const WorkFlowsStack = function() {
    this._workflows = [];
    this.push = function(workflow) {
      if (this._workflows.indexOf(workflow) === -1) return this._workflows.push(workflow) - 1;
      return this._workflows.indexOf(workflow);
    };

    /**
    * Get parent
    * @returns {boolean|*}
    */
    this.getParent = function() {
      const index = this._getCurrentIndex();
      return index > 0 &&  this._workflows[index -1];
    };

    /**
    * Get all list of parents
    * @returns {boolean|T[]}
    */
    this.getParents = function(){
      const index = this._getCurrentIndex();
      return index > 0 && this._workflows.slice(0, index);
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
    };
  
    this.clear = function(){
      while (this._workflows.length) {
        const workflow = this.pop();
        workflow.stop();
      }
    }

};

export default new WorkFlowsStack();