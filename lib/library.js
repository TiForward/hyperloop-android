/**
 * android specific java generation
 */
var _parent = require('./dev').require('hyperloop-java').library,
	buildlib = require('./buildlib'),
	metabase = require('./metabase'),
	wrench = require('wrench'),
	fs = require('fs'),
	_ = require('underscore'),
	hyperloop = require('./dev').require('hyperloop-common'),
	log = hyperloop.log,
	androidlib = require('./android'),
	path = require('path');

exports.loadMetabase = loadMetabase;
exports.getArchitectures = getArchitectures;
exports.compileLibrary = _parent.compileLibrary;
exports.prepareLibrary = prepareLibrary;
exports.generateMain = _parent.generateMain;
exports.generateLibrary = generateLibrary;
exports.generateApp = generateApp;
exports.prepareArchitecture = prepareArchitecture;
exports.prepareClass = _parent.prepareClass;
exports.prepareFunction = _parent.prepareFunction;
exports.prepareMethod = _parent.prepareMethod;
exports.prepareProperty = _parent.prepareProperty;
exports.prepareType = _parent.prepareType;
exports.generateMethod = _parent.generateMethod;
exports.generateFunction = _parent.generateFunction;
exports.generateGetterProperty = _parent.generateGetterProperty;
exports.generateSetterProperty = _parent.generateSetterProperty;
exports.generateNewInstance = _parent.generateNewInstance;
exports.isMethodInstance = _parent.isMethodInstance;
exports.getClassFilename = _parent.getClassFilename;
exports.getFunctionsFilename = _parent.getFunctionsFilename;
exports.getTypesFilename = _parent.getTypesFilename;
exports.getFileExtension = _parent.getFileExtension;
exports.getObjectFileExtension = _parent.getObjectFileExtension;
exports.getLibraryFileName = _parent.getLibraryFileName;
exports.getDefaultLibraryName = _parent.getDefaultLibraryName;
exports.prepareHeader = _parent.prepareHeader;
exports.prepareFooter = _parent.prepareFooter;
exports.shouldCompileTypes = _parent.shouldCompileTypes;
exports.prepareClasses = prepareClasses;
exports.getMethodSignature = _parent.getMethodSignature;
exports.generateCustomJavaClass = _parent.generateCustomJavaClass;

/**
 * called to load the metabase (and generate if needed)
 */
function loadMetabase(options, arch, sdks, settings, callback, generate) {
	var opts = _.clone(options);

	opts.cacheDir = opts.dest;

	var android_jar = androidlib.findAndroidPath(options,true).jar;

	if (!fs.existsSync(android_jar)) throw new Error('Not found ' + android_jar);

	metabase.loadMetabase(android_jar, opts, function(err, ast, astFile){
		if (err) log.fatal(err);
		callback(null, ast, astFile);
	});
}

/**
 * return suitable architectures for compiling
 */
function getArchitectures (options, callback) {
	return callback(null, [options.arch]);
}

function prepareArchitecture(options, arch, sdks, settings, callback) {
	loadMetabase(options, arch, sdks, settings, callback, true);
}

/** 
 * called once before doing any generation to allow the platform
 * adapter to do any setup before getting started
 */
function prepareLibrary(options, callback) {
	getArchitectures(options, function(err,architectures) {
		if (err) callback(err);
		log.debug('Copying JavaScriptCore header files to ' + options.dest.cyan);
		var headerFrom = path.join(__dirname, '..', 'templates', 'JavaScriptCore');
		var headerTo   = path.join(options.dest, 'JavaScriptCore');
		wrench.copyDirSyncRecursive(headerFrom, headerTo, {forceDelete: true});
		callback(err, architectures);
	});
}


function generateLibrary (options, arch_results, settings, callback) {
	var builddir = options.outdir,
		libfile = path.join(options.dest, options.libname || getDefaultLibraryName());
	buildlib.library(options, true, options.debug, options.jobs, arch_results[options.arch], options.cflags, options.linkflags, options.dest, builddir, libfile, callback);
}

function generateApp (options, arch_results, settings, callback) {
	var builddir = options.outdir,
		libfile = path.join(options.dest, options.libname || getDefaultAppName());
	buildlib.library(options, false, options.debug, options.jobs, arch_results[options.arch], options.cflags, options.linkflags, options.dest, builddir, libfile, callback);
}

function prepareClasses(options, state, metabase, library, symboltable) {
	// these classes are minimally required for all Android projects
	var required = ['android.app.Activity','android.util.Log'];
	required.forEach(function(cls){
		if (!symboltable.classmap) {
			symboltable.classmap = {};
		}
		if (!(cls in symboltable.classmap)) {
			symboltable.classmap[cls] = {
				static_methods: {},
				instance_methods: {},
				getters:{},
				setters:{},
				constructors:{}
			};
		}
	});

	return _parent.prepareClasses(options, state, metabase, library, symboltable);
}