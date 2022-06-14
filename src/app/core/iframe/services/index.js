import appService  from './app/service';
//return an object contains key plugin name  and related service
import pluginsServices  from './plugins';

export default   {
  app: appService,
  ...pluginsServices
};