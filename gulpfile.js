var path = require('path')
var configuration_path = path.join(__dirname,'configuration')
//Gulp
var gulp = require('gulp');
var gutil = require("gulp-util");
//webpack
var webpack = require('webpack');
//configuration file webpack
var webpackConfiguration = require(configuration_path + '/webpack.config.js');
//Karma
var Server = require('karma').Server;

/* configuration files directory dove ci sono
 * i file di configurazione dei vari moduli usati da gulp
*/

//webpack
gulp.task("webpack", function() {
    var webdavConfig = Object.create(webpackConfiguration);
    webpack(webdavConfig, function(err, stats) {

        if(err) throw new gutil.PluginError("webpack", err);
        gutil.log("[webpack]", stats.toString({
            // output options
        }));

    })

});

//Karma
/**
 * Run test once and exit
 */
gulp.task('karma_test', function (done) {
  new Server({
    configFile: configuration_path + '/karma.conf.js',
    singleRun: true
  }, done).start();
});

/**
 * Watch for file changes and re-run tests on each change
 */
gulp.task('karma_tdd', function (done) {
  new Server({
    configFile: configuration_path + '/karma.conf.js'
  }, done).start();
});
