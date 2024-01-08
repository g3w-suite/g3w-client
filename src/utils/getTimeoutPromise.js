import { TIMEOUT } from 'app/constant';

/**
 * Method to set timeout
 * @param timeout
 * @param resolve
 * @param data
 * @returns {number}
 */
export function getTimeoutPromise({
  timeout = TIMEOUT,
  resolve,
  data,
}) {
 return setTimeout(() => { resolve(data) }, timeout);
};