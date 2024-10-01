/**
 * Function to wait for predicates.
 * 
 * @param { () => Boolean } predicate - A function that returns a bool
 * @param { number }        [timeout] - Optional maximum waiting time in ms after rejected
 * 
 * @see https://gist.github.com/chrisjhoughton/7890239?permalink_comment_id=4411125#gistcomment-4411125
 */
export function waitFor(predicate, timeout) {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (!predicate()) {
        return;
      }
      clearInterval(interval);
      resolve();
    };
    const interval = setInterval(check, 100);
    check();
    if (timeout) {
      setTimeout(() => { clearInterval(interval); reject(); }, timeout);
    }
  });
}