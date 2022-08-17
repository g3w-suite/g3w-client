/**
 * ORIGINAL SOURCE: src/app/core/editing/sessionsregistry.js@v3.4
 */

const SessionsRegistry = function() {
  this._sessions = {};

  this.register = function(session) {
    const id = session.getId();
    this._sessions[id] = session;
  };

  this.unregister = function(id) {
    delete this._sessions[id];
  };

  this.getSession = function(id) {
    return this._sessions[id];
  };

  this.setSession = function(id, session) {
    this._sessions[id] = session;
  };

  this.getSessions = function() {
    return this._sessions;
  };

  this.clear = function(){
    this._sessions = {};
  }
};

export default new SessionsRegistry();