/**
 * @file
 * @since v3.6
 */
import { APP_VERSION }    from 'app/constant';
import G3WObject          from 'core/g3w-object';

const ApplicationService   = new G3WObject({ setters: { online(){}, offline(){} }});
ApplicationService.version = APP_VERSION;

export default ApplicationService;