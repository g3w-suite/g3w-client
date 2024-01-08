import ApiService from './api';
import ApplicationService from './application';
import ClipboardService from './clipboard';
import ExpressionService from './data-expression';
import OWSService from './data-ows';
import ProxyService from './data-proxy';
import QueryService from './data-query';
import SearchService from './data-search';
import DataService from './data';
import ChangesManager from './editing';
import GUI from './gui';
import HistoryService from './history';
import AppService from './iframe-app';
import EditingService from './iframe-editing';
import IframeService from './iframe';
import QueryBuilderService from './querybuilder';
import RelationsService from './relations';
import RouterService from './router';
import TaskService from './tasks';
import WorkFlowsStack from './workflows';

/**
 * @FIXME importing directly from this file breaks application
 * (maybe related to: https://github.com/Raruto/g3w-client/commit/c83d99934d00ea5c6047c215c6eba54fd2d5aefa)
 */
export {
  ApiService,
  ApplicationService,
  ClipboardService,
  ExpressionService,
  OWSService,
  ProxyService,
  QueryService,
  SearchService,
  DataService,
  ChangesManager,
  GUI,
  HistoryService,
  AppService,
  EditingService,
  IframeService,
  QueryBuilderService,
  RelationsService,
  RouterService,
  TaskService,
  WorkFlowsStack,
};