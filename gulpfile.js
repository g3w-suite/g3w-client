var path = require('path')
var configuration_path = path.join(__dirname,'config')
//array ordine js
var ordine_js = require('./config/app_config').ordine_js;
//array ordine css
var ordine_css = require('./config/app_config').ordine_css;
//Gulp
var gulp   = require('gulp');
//conatena
var concat = require('gulp-concat');
//uglify
var uglify = require('gulp-uglify');
//cleanCSS
var cleanCSS = require('gulp-clean-css');
//bower files
var lib    = require('bower-files')();
//gulp util
var gutil = require("gulp-util");
//webpack
var webpack = require('webpack');
//gulp less
var less = require('gulp-less');

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

gulp.task('less', function () {
  return gulp.src('./src/app/**/*.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('./dist'));
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

gulp.task('dev',['watchless','webpack'])
gulp.task('default',['webpack']) // development