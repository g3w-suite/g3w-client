i18next
    .use(i18nextXHRBackend)
    .init({ 
        lng: 'it',
        ns: 'app',
        fallbackLng: 'it',
        resources: require('../locales/it/app.json')
    });
    
var t = function(text){
    var trad = i18next.t(text);
    return trad;
};

jqueryI18next.init(i18next, $, {
  tName: 't', // --> appends $.t = i18next.t
  i18nName: 'i18n', // --> appends $.i18n = i18next
  handleName: 'localize', // --> appends $(selector).localize(opts);
  selectorAttr: 'data-i18n', // selector for translating elements
  targetAttr: 'data-i18n-target', // element attribute to grab target element to translate (if diffrent then itself)
  optionsAttr: 'data-i18n-options', // element attribute that contains options, will load/set if useOptionsAttr = true
  useOptionsAttr: false, // see optionsAttr
  parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
});
    
module.exports = t;
