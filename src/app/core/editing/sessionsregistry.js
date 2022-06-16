class SessionsRegistry {
  constructor() {
    this._sessions = {};
  }

  register(session) {
    const id = session.getId();
    this._sessions[id] = session;
  }

  unregister(id) {
    delete this._sessions[id];
  }

  getSession(id) {
    return this._sessions[id];
  }

  setSession(id, session) {
    this._sessions[id] = session;
  }

  getSessions() {
    return this._sessions;
  }

  clear() {
    this._sessions = {};
  }
}

export default new SessionsRegistry();
