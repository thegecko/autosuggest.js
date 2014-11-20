var gulp = require('gulp');
var browserSync = require('browser-sync');

gulp.task('browser-sync', function() {
    browserSync({
        port: 1234,
        server: {
            baseDir: "./",
            index: "example/index.html"
        }
    });
});

gulp.task('default', ['browser-sync'], function () {
    gulp.watch(["dist/**", "example/**"], browserSync.reload);
});