import ApiService          from './api';
import ApplicationService  from './application';
import ClipboardService    from './clipboard';
import DataService         from './data';
import GUI                 from './gui';
import HistoryService      from './history';
import IframeService       from './iframe';
import NavbaritemsService  from './navbaritems';
import RelationsService    from './relations';
import RouterService       from './router';
import SidebarService      from './sidebar';
import TaskService         from './tasks';
import ViewportService     from './viewport';

/**
 * @FIXME importing directly from this file breaks application
 * (maybe related to: https://github.com/Raruto/g3w-client/commit/c83d99934d00ea5c6047c215c6eba54fd2d5aefa)
 */
export {
  ApiService,
  ApplicationService,
  ClipboardService,
  DataService,
  GUI,
  HistoryService,
  IframeService,
  NavbaritemsService,
  RelationsService,
  RouterService,
  SidebarService,
  TaskService,
  ViewportService
};