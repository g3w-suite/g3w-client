import TestEditing from './editing/test';
import TestQPlotly from './qplotly/test';
import TestCDU from './cdu/test';
import TestCadastre from './cadastre/test';
import TestLaw from './law/test';

const Test = {
  editing: TestEditing,
  qplotly: TestQPlotly,
  cdu: TestCDU,
  cadastre: TestCadastre,
  law: TestLaw
}

export default function({plugins={}, testConfig={}}={}){
  describe("Test Plugins", ()=>{
    Object.keys(plugins).forEach(pluginName =>{
      const config = plugins[pluginName];
      Test[pluginName] && Test[pluginName]({
        config,
        testConfig: testConfig[pluginName]
      })
    })
  })

}