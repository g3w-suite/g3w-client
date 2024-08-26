import { $promisify } from 'utils/promisify';

export function getAjaxResponses(listRequests = []) {
  return $promisify(new Promise((resolve) => {
    const DoneRespones    = [];
    const FailedResponses = [];
    let requestsLenght    = listRequests.length;

    listRequests
      .forEach((request) => {
        request
          .then((response) => {
            DoneRespones.push(response)
          })
          .fail(e => {
            console.warn(e);
            FailedResponses.push(e);
          })
          .always(() => {
            requestsLenght = requestsLenght > 0 ? requestsLenght - 1: requestsLenght;
            if (0 === requestsLenght) {
              resolve({
                done: DoneRespones,
                fail: FailedResponses
              })
            }

          })
      });
  }))
}