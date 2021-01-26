import TestEditing from './editing/test';
import TestQPlotly from './qplotly/test';

const Test = {
  editing: TestEditing,
  qplotly: TestQPlotly,
}

export default function({plugins={}, projectGid, testConfig={}}={}){
  describe("Test Plugins", ()=>{
    Object.keys(plugins).forEach(pluginName =>{
      const config = plugins[pluginName];
      (config.gid === projectGid) && Test[pluginName] && Test[pluginName]({
        config,
        testConfig: testConfig[pluginName]
      })
    })
  })

}