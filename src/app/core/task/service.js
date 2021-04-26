const { XHR } = require('core/utils/utils');

/**
 * Singletone service to run async task
 * @constructor
 */
function TaskService(){
  /**
   * Array contain all task id that are running. Each item is an object contain:
   * {
   *   taskId: //taskId,
   *   intervalId: interval to clear clearInterval()
   * }
   **/
  const tasks = [];
  /**
   *
   * @param options: {
   *   method: http method to run task GET/POST
   *   url: api request url (that server start in background task)
   *   taskUrl = url to ask the status og task
   *   params: Object contain param to http/https request
   *   interval: interval in milliseconds to do a request for ask status of task (default 10000 - 1 second)
   *   listener: ()=>{} method to call
   *
   * }
   *
   * return a Promise that return a task id
   */
  this.runTask = async function(options={}){
    const {method='GET', params={}, url, taskUrl, interval=1000, listener=()=>{}} = options;
    try {
      const response =  method === 'GET' ? await XHR.get({
        url,
        params
      }): await XHR.post({
        url,
        data: params.data || {},
        contentType: params.contentType || "application/json"
      });
      const {result, task_id} = response;
      if (result){
        const intervalId = setInterval(async ()=>{
          const response = await XHR.get({
            url: `${taskUrl}${task_id}`
          });
          listener({
            task_id,
            response
          });
        }, interval);

        tasks.push({
          task_id,
          intervalId,
        });

        listener({
          task_id,
          response
        });
      } else return Promise.reject(response);

    } catch(err){
      return Promise.reject(err);
    }
  };

  /**
   *
   * @param options: {
   *   taskId: taskId that is running
   * }
   */
  this.stopTask = function(options={}){
    const { task_id } = options;
    const task = tasks.find(task => task.task_id === task_id);
    if (task)clearInterval(task.intervalId);
  };

  /**
   * clare all task
   */
  this.clear = function(){
    tasks.forEach(({ taskId }) =>{
      this.stopTask({
        taskId
      })
    });
    //reset to empty tasks
    tasks.splice(0);
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

module.exports = new TaskService;