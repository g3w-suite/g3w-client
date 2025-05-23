/**
 * @file
 * @since v3.6
 */
import { APP_VERSION }            from 'g3w-constants';
import G3WObject                  from 'g3w-object';
import GUI                        from 'services/gui';
import ApplicationState	          from 'store/application';
import { XHR } from 'utils/XHR';


const ApplicationService   = new G3WObject({ 
  setters: { 
		online()          {},
		offline()         {},
		/**
		 * @since 4.0.0 Create permalink url 
		 * @param {Object} data 
		 */
		async createPermalink(params = {}) { 
    	const layerstrees = ApplicationState.project.getLayersStore().getDiffLayersTree();
			try {
				const { result, data } = await XHR.post({
						url:          '/api/pl/',
							data:         JSON.stringify({
								            	permalink_data: {
																...params,
																layerstrees:     layerstrees.length > 0 ? layerstrees: undefined, //exclude no
																initextent:      GUI.getService('map').getMapExtent(), //map_extent
																lng:             ApplicationState.language, //language
																initbaselayer:   ApplicationState.baseLayerId || undefined, //current base layer
																toc_tab_default: GUI.getComponent('catalog').getInternalComponent().activeTab, // take in account change tab
															}
							}),
							contentType: 'application/json'
						})
				if (result) {
					return data.permalink_code;
				}		
			} catch(e) {
				console.warn(e);
				throw new Error(e);
			}
		}
	}
});


ApplicationService.version = APP_VERSION;

export default ApplicationService;