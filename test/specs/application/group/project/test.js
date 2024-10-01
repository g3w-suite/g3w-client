import Service from '../../service';
import TestRelations from './relations/test';
import TestLayers from './layers/test';
import TestQuery from './queries/querytest';
import TestSearches from './searches/test';
import TestCatalog from './catalog/test'
import TestPrint from './print/test'
import MapTest from './map/test';
import TestPlugins from './plugins'
const Project = require('g3w-project');

export default function TestProject({plugins={}, testConfig={}, mapcontrols=[]}={}){
  const {gid} = testConfig;
  describe('#Test Project', function() {
    this.timeout(0);
    let project;
    before(async ()=> {
      project = await Service.getProject(gid);
    })
    it(`Project[${gid}]: is instance of Project`, function() {
      assert.instanceOf(project, Project);
    });
    it('hook for sub projects test to wait before async ', function() {
      if (testConfig.layers && Object.keys(testConfig.layers).length)
        TestLayers({
          layers: project.getLayers(),
          testConfig: testConfig.layers
        });
      if (testConfig.relations && Object.keys(testConfig.relations).length)
        TestRelations({
          relations: project.getRelations(),
          testConfig: testConfig.relations
        });
      if (testConfig.queries && Object.keys(testConfig.queries).length)
        TestQuery({
          testConfig: testConfig.queries,
          mapcontrols
        });
      if (testConfig.searches && Object.keys(testConfig.searches).length)
        TestSearches({
          searches: project.getSearches(),
          testConfig: testConfig.searches,
        });
      if (testConfig.catalog && Object.keys(testConfig.catalog).length)
        TestCatalog({
          gid,
          testConfig: testConfig.catalog,
        });
      if (testConfig.map)
        MapTest({
          mapcontrols,
          testConfig: testConfig.map
        })
      TestPrint({
        print: project.getPrint(),
      });
      TestPlugins({
        plugins: plugins,
        projectGid: gid,
        testConfig: testConfig.plugins
      })
    })
  })
}