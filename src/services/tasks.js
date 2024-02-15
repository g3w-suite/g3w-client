/**
 * @file
 * @since v3.6
 */

const { XHR } = require('utils');

/**
 * Singletone service to run async task
 */
class TaskService {

  constructor() {
    /**
     * Array or objects contain all task id that are running:
     * {
     *   taskId: //taskId,
     *   intervalId: interval to clear clearInterval()
     * }
     **/
    this._tasks = [];

    this.runTask = this.runTask.bind(this);
  }

  /**
   *
   * @param options.method   http method to run task GET/POST
   * @param options.url      api request url (that server start in background task)
   * @param options.taskUrl  url to ask the status og task
   * @param options.params   Object contain param to http/https request
   * @param options.interval interval in milliseconds to do a request for ask status of task (default 10000 - 1 second)
   * @param options.listener ()=>{} method to call
   * 
   * @returns a Promise that returns a task id
   */
  async runTask(options = {}) {
    let {
      url,
      taskUrl,
      method   = 'GET',
      params   = {},
      interval = 1000,
      timeout  = Infinity,
      listener = () => {}
    } = options;

    try {
      const response = (
        'GET' === method
        ? await XHR.get({ url, params })
        : await XHR.post({ url, data: params.data || {}, contentType: params.contentType || 'application/json' })
      );
      const {
        result,
        task_id
      } = response;

      if (!result) {
        return Promise.reject(response);
      }

      // add current task to list of task
      this.tasks.push({
        task_id,
        intervalId: setInterval(async () => {
          // check if timeout is defined
          timeout = timeout - interval;
          if (timeout > 0) {
            let response;
            try {
              response = await XHR.get({ url: `${taskUrl}${task_id}` });
            } catch(error) {
              response = error;
            } finally {
              listener({ task_id, timeout: false, response });
            }
          } else {
            listener({ timeout: true });
            this.stopTask({ task_id });
          }
        }, interval),
      });
      // run first time listener function
      listener({ task_id, response });
    } catch(err) {
      return Promise.reject(err);
    }
  }

  /**
   * @param opts.taskId id of task that is running
   */
  stopTask(opts = {}) {
    const task = tasks.find(task => task.task_id === opts.task_id);
    if (task) {
      clearInterval(task.intervalId);
    }
  }

  /**
   * clear all tasks
   */
  clear() {
    tasks.forEach(({ taskId }) => { this.stopTask({ taskId }) });
    tasks.splice(0); // reset to empty tasks
  }
}


/**
 * SERVER
 * """Returns the (possibly) new layer ID where the isochrone
 data has been added. If the task has not yet completed a status message is returned

 Note: `project_id` is only used for permissions checking!

 Returns 500 in case of exceptions
 Returns 404 in case of task not found
 Returns 200 ok for all other cases

 Response body:

 {
            "status": "complete",  // or "pending" or "error", full list at
                                   // https://huey.readthedocs.io/en/latest/signals.html#signals
            "exception": "Normally empty, error message in case of errors",
            "progress": [
                100,  // Progress %
            ],
            "task_result": {
                "qgis_ayer_id": "4f2a88a1-ca93-4859-9de3-75d9728cde0e"
            }
        }

 **/

export default new TaskService();