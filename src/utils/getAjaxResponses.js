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
        .fail((err) => {
          FailedResponses.push(err)
        })
        .always(() => {
          requestsLenght = requestsLenght > 0 ? requestsLenght - 1: requestsLenght;
          if (requestsLenght === 0) {
            d.resolve({
              done: DoneRespones,
              fail: FailedResponses
            })
          }

    })
  });

  return d.promise();
};