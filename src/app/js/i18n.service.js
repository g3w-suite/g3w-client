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
    
module.exports = t;
