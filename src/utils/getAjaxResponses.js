import { $promisify, promisify } from 'utils/promisify';

export function getAjaxResponses(requests = []) {
  const done    = [];
  const fail = [];
  let i = requests.length;

  return $promisify(async () => {
    for (const r of requests) {
      try {
        done.push(await promisify(r))
      } catch (e) {
        fail.push(e);
      } finally {
        i--;
        if (i <= 0) {
          return { done, fail };
        }
      }
    }
  })
}