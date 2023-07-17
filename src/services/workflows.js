/**
 * @file
 * @since v3.6
 */

// Store all workflow activated
class WorkFlowsStack {

  constructor() {
    this._workflows = [];
  }
  
  push(workflow) {
    return -1 === this._workflows.indexOf(workflow)
      ? this._workflows.push(workflow) - 1
      : this._workflows.indexOf(workflow);
  }

  /**
   * Get parent
   * 
   * @returns { boolean | * }
   */
  getParent() {
    const i = this._getCurrentIndex();
    return i > 0 && this._workflows[i -1];
  }

  /**
   * Get all list of parents
   * 
   * @returns {boolean|T[]}
   */
  getParents() {
    const i = this._getCurrentIndex();
    return i > 0 && this._workflows.slice(0, i);
  }

  pop() {
    return this._workflows.pop()
  }

  getLength() {
    return this._workflows.length;
  }

  _getCurrentIndex() {
    const curr = this.getCurrent();
    return this._workflows.findIndex(item => item === curr)
  }

  getCurrent() {
    return this.getLast();
  }

  getLast() {
    const len = this._workflows.length;
    return len ? this._workflows[len -1] : null;
  };

  getFirst() {
    return this._workflows[0];
  };

  removeAt(idx) {
    this._workflows.splice(idx, 1);
  };

  getAt(idx) {
    return this._workflows[idx];
  };

  insertAt(idx, workflow) {
    this._workflows[idx] = workflow;
  };

  clear() {
    while (this._workflows.length) {
      this.pop().stop();
    }
  }

}

export default new WorkFlowsStack();