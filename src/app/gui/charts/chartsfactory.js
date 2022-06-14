import C3XYLine from './vue/c3/line/lineXY';

const Chartsfactory = {
  CHARTS: {
    c3:{
      lineXY: C3XYLine
    }
  },
  /*
  * type: <library(es:c3)>:<chartType:(es.lineXY)>
  * */
  build({type, hooks={}} = {}) {
    const [library='c3', chartType='lineXY'] = type.split(':');
    const chartVue = this.CHARTS[library][chartType];
    return Object.assign(hooks, chartVue);
  }
};


export default  Chartsfactory;
