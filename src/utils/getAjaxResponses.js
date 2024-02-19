export function getAjaxResponses(listRequests = []) {
  return new Promise((resolve, reject) => {
    const DoneRespones    = [];
    const FailedResponses = [];
    let reqs              = listRequests.length;
  
    listRequests.forEach((request) => {
      request
        .then(d => DoneRespones.push(d))
        .catch(e => FailedResponses.push(e))
        .finally(() => {
          reqs = reqs > 0 ? reqs - 1 : reqs;
          if (0 === reqs) {
            resolve({ done: DoneRespones, fail: FailedResponses });
          }
        });
    });
  });
};