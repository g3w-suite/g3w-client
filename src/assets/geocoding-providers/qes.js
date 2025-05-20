/**
 * @file
 * @since 4.0.0
 */

(function() {

  // const geocoding = window.initConfig.mapcontrols.geocoding || {};
  // const provider  = document.currentScript.src.split('/').reverse()[0].replace('.js', '') || 'qes';

  // skip when disabled
  // if (!provider in geocoding.providers) {
  //   return;
  // }

  Object.assign(window.initConfig.mapcontrols.geocoding.providers['qes'], {
    label: `Project (${window.location.host})`,
    fetch: async (opts) => ({
      provider: 'qes',
      icon:     'layer-group',
      results:
      (
        await g3wsdk.core.utils.XHR.get({ url: `${initConfig.baseurl}qes/api/search/${g3wsdk.core.ApplicationState.project.getId()}/?q=${opts.query}` })
      ).results.map(result => ({
        layer_id:  result.layer_id, //layer
        name:      result.attributes.name || result.feature_id,
        type:      result.layer_name,
        qes:       result,
      })),
    }),
    fetch_geom: async item => (await g3wsdk.core.utils.XHR.get({ url: `${initConfig.baseurl}vector/api/editing/qdjango/${g3wsdk.core.ApplicationState.project.getId()}/${item.qes_layer_id}/?fids=${item.qes_feature_id}` })).vector.data.features[0].geometry,
  });

})();