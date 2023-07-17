/**
 * @file Store user session (login / logout)
 * @since v3.6
 */

class SessionsRegistry {

  constructor() {
    this._sessions = {};
  }

  register(session) {
    this._sessions[session.getId()] = session;
  }

  unregister(id) {
    delete this._sessions[id];
  }

  getSession(id) {
    return this._sessions[id];
  }

  setSession(id, session) {
    this._sessions[id] = session;
  };

  getSessions() {
    return this._sessions;
  }

  clear() {
    this._sessions = {};
  }

}

export default new SessionsRegistry();