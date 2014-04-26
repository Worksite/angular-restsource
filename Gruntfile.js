'use strict';
var mountFolder = function (connect, dir) {
    return connect.static(require('path').resolve(dir));
};

module.exports = function (grunt) {

    // configurable paths
    var yeomanConfig = {
        app: 'app',
        src: 'src',
        dist: 'dist',
        tmp: '.tmp'
    };

    grunt.initConfig({
        yeoman: yeomanConfig,
        pkg: grunt.file.readJSON('bower.json'),
        lifecycle: {
            validate: [
                'jshint'
            ],
            compile: [],
            test: [
                'connect:test',
                'karma:unit'
            ],
            package: [
                'concat:scripts',
                'uglify'
            ],
            'integration-test': [
                'express:dev',
                'karma:e2e'
            ],
            verify: [],
            install: [],
            deploy: []
        },
        watch: {
            options: {
                livereload: 35732
            },
            assets: {
                files: [
                    '{<%= yeoman.src %>,<%= yeoman.app %>}/templates/{,*/}*.html',
                    '{<%= yeoman.src %>,<%= yeoman.app %>}/styles/{,*/}*.{scss,sass}',
                    '{<%= yeoman.src %>,<%= yeoman.app %>}/scripts/{,*/}*.js'
                ],
                tasks: ['phase-compile', 'phase-package']
            }
        },
        connect: {
            options: {
                hostname: 'localhost',
                middleware: function (connect) {
                    return [
                        mountFolder(connect, yeomanConfig.dist),
                        mountFolder(connect, yeomanConfig.app),
                        mountFolder(connect, yeomanConfig.tmp),
                        mountFolder(connect, yeomanConfig.src),
                        mountFolder(connect, 'test')
                    ];
                }
            },
            livereload: {
                options: {
                    port: 9000
                }
            },
            test: {
                options: {
                    port: 9090
                }
            }
        },
        express: {
            options: {
                port: 9999,
                background: true,
                output: '.+'
            },
            dev: {
                options: {
                    script: 'server.js'
                }
            }
        },
        open: {
            server: {
                url: 'http://localhost:<%= connect.options.port %>'
            }
        },
        clean: {
            server: '<%= yeoman.tmp %>'
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            src: [
                'Gruntfile.js',
                '<%= yeoman.src %>/scripts/{,*/}*.js',
                '<%= yeoman.app %>/scripts/{,*/}*.js'
            ]
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js',
                singleRun: true
            },
            'unit-debug': {
                configFile: 'karma.conf.js',
                browsers: ['Chrome']
            },
            e2e: {
                configFile: 'karma-e2e.conf.js',
                singleRun: true
            },
            'e2e-debug': {
                configFile: 'karma-e2e.conf.js',
                browsers: ['Chrome'],
                runnerPort: 9100
            }
        },
        concat: {
            options: {
                banner: ['/**! ',
                    ' * <%= pkg.name %> v<%= pkg.version %>',
                    ' * Copyright (c) 2013 <%= pkg.author %>',
                    ' */\n'].join('\n')
            },
            scripts: {
                src: [
                    '<%= yeoman.src %>/scripts/**/*.js'
                ],
                dest: '<%= yeoman.dist %>/scripts/<%= pkg.name %>.js'
            },
            styles: {
                src: [
                    '<%= yeoman.tmp %>/styles/**/*.css'
                ],
                dest: '<%= yeoman.dist %>/styles/<%= pkg.name %>.css'
            }
        },
        uglify: {
            options: {
                banner: ['/**! ',
                    ' * <%= pkg.name %> v<%= pkg.version %>',
                    ' * Copyright (c) 2013 <%= pkg.author %>',
                    ' */\n'].join('\n')
            },
            dist: {
                files: {
                    '<%= yeoman.dist %>/scripts/<%= pkg.name %>.min.js': ['<%= concat.scripts.dest %>']
                }
            }
        },
        compass: {
            options: {
                sassDir: '<%= yeoman.app %>/styles',
                cssDir: '.tmp/styles',
                imagesDir: '<%= yeoman.app %>/images',
                javascriptsDir: '<%= yeoman.app %>/scripts',
                fontsDir: '<%= yeoman.app %>/styles/fonts',
                importPath: [
                    '<%= yeoman.app %>/components',
                    'src/styles'
                ],
                relativeAssets: true
            },
            dist: {
                options: {
                    debugInfo: false
                }
            },
            server: {
                options: {
                    debugInfo: true
                }
            }
        },
        bumpup: ['bower.json', 'package.json']
    });

    // load all grunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.registerTask('bump', function (type) {
        type = type ? type : 'patch';
        grunt.task.run('bumpup:' + type);
    });

    /**
     * Test debugging tasks
     */

    grunt.registerTask('test-start', ['karma:unit-debug:start']);
    grunt.registerTask('test-run', ['karma:unit-debug:run']);
    grunt.registerTask('e2e-start', ['connect:test', 'karma:e2e-debug:start']);
    grunt.registerTask('e2e-run', ['karma:e2e-debug:run']);

    /**
     * Standard Yeoman tasks
     */

    grunt.registerTask('build', [
        'clean',
        'install'
    ]);

    grunt.registerTask('server', [
        'clean',
        'phase-compile',
        'phase-package',
        'connect:livereload',
        'express:dev',
        'open',
        'watch'
    ]);

    // alias for server
    grunt.registerTask('run', ['server']);

    grunt.registerTask('default', ['build']);
};
