var gulp = require('gulp');
var uglify = require('gulp-uglifyjs');
var jshint = require('gulp-jshint');
var browserSync = require('browser-sync');

gulp.task('uglify', function() {
    return gulp.src('dist/autosuggest.js')
        .pipe(uglify('autosuggest.min.js', {
            output: {
                comments: /@license/
            }
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('lint', function() {
    return gulp.src('dist/autosuggest.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('browser-sync', function() {
    browserSync({
        port: 1234,
        server: {
            baseDir: "./",
            index: "example/index.html"
        }
    });
});

gulp.task('default', ['uglify', 'lint']);

gulp.task('debug', ['browser-sync'], function () {
    gulp.watch(["dist/autosuggest.js"], ['uglify', 'lint']);
    gulp.watch(["dist/**", "example/**"], browserSync.reload);
});