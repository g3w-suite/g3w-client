export function getAjaxResponses(listRequests = []) {
  const d = $.Deferred();
  const DoneRespones = [];
  const FailedResponses = [];
  let requestsLenght = listRequests.length;

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
            d.resolve({
              done: DoneRespones,
              fail: FailedResponses
            })
          }

    })
  });

  return d.promise();
}