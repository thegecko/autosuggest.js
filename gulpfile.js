var gulp = require('gulp');
var uglify = require('gulp-uglifyjs');
var jshint = require('gulp-jshint');

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

gulp.task('default', ['uglify', 'lint']);
