var hyperloop_java = require('./dev').require('hyperloop-java'),
	_parent = hyperloop_java.compiler,
	path = require('path'),
	fs = require('fs'),
	hyperloop = require('./dev').require('hyperloop-common'),
	log = hyperloop.log,
	library = require('./library');

exports.initialize = initialize;
exports.finish = finish;
exports.beforeCompile = _parent.beforeCompile;
exports.afterCompile = _parent.afterCompile;
exports.isValidSymbol = _parent.isValidSymbol;
exports.validateSymbols = _parent.validateSymbols;
exports.getFileExtension = library.getFileExtension;
exports.getFunctionSymbol = _parent.getFunctionSymbol;
exports.getInstanceMethodSymbol = _parent.getInstanceMethodSymbol;
exports.getConstructorSymbol = _parent.getConstructorSymbol;
exports.getStaticMethodSymbol = _parent.getStaticMethodSymbol;
exports.getSetterSymbol = _parent.getSetterSymbol;
exports.getGetterSymbol = _parent.getGetterSymbol;
exports.defineClass = _parent.defineClass;
exports.findProperty = _parent.findProperty;
exports.defineMethod = _parent.defineMethod;

function initialize(options, build_options, arch, sdks, settings, callback) {
	library.loadMetabase(options, arch, sdks, settings, function(err, ast, libfile, astFile){
		return callback(err, {metabase:ast, libfile:libfile});
	});
}

function finish(options, build_opts, arch, state, uncompiledFiles, compiledFiles, callback) {
	if (state.custom_classes) {
		var outfile = path.join(options.dest, 'custom_classes.json');
		fs.writeFile(outfile, JSON.stringify(Object.keys(state.custom_classes)), 'utf8', callback);
	}
	else {
		callback();
	}
}