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
//configuration file webpack
var webpackConfiguration = require(configuration_path + '/webpack.config.js');
//Karma
var Server = require('karma').Server;

// note that we're grabbing the stream function
var wiredep = require('wiredep').stream;

//esempio wiredep

gulp.task('wiredep', function () {
  gulp.src('./src/index.html')
    .pipe(wiredep({
      directory: './libs/',
      bowerJson: require('./bower.json'),
      exclude:['./libs/gislib']
    }))
    .pipe(gulp.dest('./dist'));
});

//esempio minify bower libs e librerie generiche JS

gulp.task('minify_libs_js', function () {
  gulp.src(lib.ext('js').files)
    .pipe(concat('libs.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist/js'));
});
//esempio minify bower libs e librerie generiche CSS

gulp.task('minify_libs_css', function () {
  gulp.src(lib.ext('css').files)
    .pipe(concat('libs.min.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest('dist/css'));
});


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


gulp.task('default',['minify_libs_js', 'minify_libs_css', 'webpack']) // development