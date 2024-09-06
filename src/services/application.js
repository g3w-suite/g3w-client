/**
 * @file
 * @since v3.6
 */
import { APP_VERSION }    from 'app/constant';
import G3WObject          from 'core/g3w-object';
import ApplicationState   from 'store/application-state';

/**
 * ApplicationService
 */
export default Object.assign(new G3WObject({ setters: {
  online()  { ApplicationState.online = true; },
  offline() { ApplicationState.online = false; },
}}), {
  version: APP_VERSION,
});