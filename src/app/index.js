i18next
    .use(i18nextXHRBackend)
    .init({ 
        lng: 'it',
        ns: 'app',
        fallbackLng: 'it',
        resources: require('./locales/it/app.json')
    });

$('.content-wrapper').html(i18next.t('text1'));

var appUi = require('./js/app.ui.js');
var appService = require('./js/app.gui.js');
