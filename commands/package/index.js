/**
 * Android packaging
 */
var fs = require('fs'),
	wrench = require('wrench'),
	exec = require('child_process').exec,
	path = require('path'),
	ejs = require('ejs'),
	async = require('async'),
	hyperloop = require('../../lib/dev').require('hyperloop-common'),
	Command = hyperloop.Command,
	log = hyperloop.log,
	util = hyperloop.util,
	appc = require('node-appc'),
	androidlib = require('../../lib/android');

function createAndroidProjectTemplate(options, dest, done) {
	appc.android.detect(function(results){
		var targets = Object.keys(results.targets),
			found;
		for (var c=0;c<targets.length;c++) {
			var target = targets[c],
				entry = results.targets[target];
			if (entry['api-level']===options.sdk) {
				found = target;
				break;
			}
		}
		if (!found) {
			log.fatal("Couldn't find suitable target with api-level "+options.sdk);
		}
		//FIXME - build path to android binary
		var command = 'android create project --target ' + found
		            + ' --name ' + options.name + ' --path ' + dest
		            + ' --activity ' + options.name + 'Activity'
		            + ' --package ' + options.appid;
		log.debug('Executing command ' + command);
		exec(command, done);
	});
}

// function validate(state,done) {
// 	log.info('Validating...');

// 	var options = state.options;

// 	required(options,'name','specify the module name');
// 	required(options,'appid','specify the application identifier (such as com.app.id) for the app');

// 	if (!options.target) {
// 		options.target = 'release';
// 	}

// 	return done(null, true);
// }

module.exports = new Command(
	'package',
	'Package the application for Android',
	[
	],
	function(state,done) {
		log.info('Packaging...');

		var options = state.options,
			homeDir = util.writableHomeDirectory(),
			appDest = path.join(options.dest, options.name),
			appfile = options.name+'Activity.java',
			jscDir = path.join(homeDir, 'JavaScriptCore'),
			jscDownloadDir = 'JavaScriptCore-Android-' + (options.target||'release'),
			jscDownloadDirFull = path.join(jscDir, jscDownloadDir, 'JavaScriptCore', 'lib'),
			android = androidlib.findAndroidPath(options,true),
			templateDir = path.join(__dirname,'..','..','templates');


		createAndroidProjectTemplate(options, appDest, function(err) {
			if (err) done(err);
			var from = path.join(templateDir, 'java', 'AppActivity.java');
			var to = path.join(appDest, 'src', options.appid.replace(/\./g, path.sep), appfile);
			log.debug('Copying Android activity file to ' + to);
			var template = ejs.render(fs.readFileSync(from, 'utf8'), 
				{
					AppActivityName:options.name+'Activity',
					AppName: options.name,
					AppPackage: options.appid
				});

			util.writeIfDifferent(to, template);

			var custom_classes_file = path.join(options.dest, 'custom_classes.json');
			if (fs.existsSync(custom_classes_file)) {
				var custom_classes = JSON.parse(fs.readFileSync(custom_classes_file),'utf8');
				custom_classes.forEach(function(c) {
					var filedir  = c.substr(0, c.lastIndexOf('.')).replace(/\./g, path.sep);
					var filename = path.join(filedir, c.substr(c.lastIndexOf('.')+1)+'.java');
					from = path.join(options.srcdir, 'java', filename);
					to = path.join(appDest, 'src', filename);
					log.debug('Copying custom class file to ' + to);
					wrench.mkdirSyncRecursive(path.join(appDest, 'src', filedir));
					fs.writeFileSync(to, fs.readFileSync(from), 'utf8');
				});
			}

			copyModulesIntoDestination();
		});

		function copyModulesIntoDestination() {
			// Copy JavaScriptCore module files into Android libs
			if (!fs.existsSync(jscDownloadDirFull)) {
				throw new Error("missing directory: "+jscDownloadDirFull);
			}
			if (util.isDirectory(jscDownloadDirFull)) {
				// Copy JavaScriptCore for Java
				log.debug('Copying JavaScriptCore modules to ' + appDest);
				var files = wrench.readdirSyncRecursive(jscDownloadDirFull);
				files.forEach(function(f) {
					var jscCopyTo = path.join(appDest, 'libs', f);
					var jscCopyFrom = path.join(jscDownloadDirFull, f);
					if (util.isDirectory(jscCopyFrom)) {
						wrench.mkdirSyncRecursive(jscCopyTo);
					} else {
						fs.writeFileSync(jscCopyTo, fs.readFileSync(jscCopyFrom));
					}
				});
				log.debug('Copying',options.name,'libraries...');
				var appLibs = path.join(appDest, 'libs', options.arch);
				var appLibname = 'lib' + options.name + '.so';

				//FIXME: use util.copyFileSync
				fs.writeFileSync(path.join(appLibs, appLibname), fs.readFileSync(path.join(options.dest, appLibname)));
				fs.writeFileSync(path.join(appLibs, 'libgnustl_shared.so'), fs.readFileSync(android.ndkPath+'/sources/cxx-stl/gnu-libstdc++/4.8/libs/armeabi-v7a/libgnustl_shared.so'));

				var hyperloopLib = path.join('org', 'appcelerator', 'hyperloop');
				wrench.mkdirSyncRecursive(path.join(appDest, 'src', hyperloopLib));
				fs.writeFileSync(path.join(appDest, 'src', hyperloopLib, 'Hyperloop.java'),
					fs.readFileSync(path.join(templateDir, 'java', hyperloopLib, 'Hyperloop.java'),'utf8'), 'utf8');
			}
			done();
		}
	}	
);

// /*
//  * Check to make sure that the `name` key is present in `options` and if not
//  * exit with the error message `help`
//  * TODO Move to common
//  */
// function required(options, name, help) {
// 	if (!options[name]) {
// 	   log.fatal('Missing required options ' + ('--' + name).magenta.bold + ' which should ' + help);
// 	}
// }