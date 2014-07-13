/**
 * Android application launching
 */
var spawn = require('child_process').spawn,
	path = require('path'),
	hyperloop = require('../../lib/dev').require('hyperloop-common'),
	log = hyperloop.log,
	Command = hyperloop.Command,
	androidlib = require('../../lib/dev').require('androidlib');

function antDebugInstall(options, project_dir, done) {
	var cwd = process.cwd();
	process.chdir(project_dir);
	try {
		var child = spawn('ant',['debug']);
		child.on('error',done);
		child.stdout.on('data',function(buf){
			process.env.TRAVIS && console.log(String(buf).trim());
		});
		child.stderr.on('data',function(buf){
			console.error(String(buf).trim());
		});
		child.on('close',function(exitCode){
			if (exitCode!==0) {
				return done("exited with exitCode "+exitCode);
			}

			var apk = path.join(project_dir,'bin',options.name+'-debug.apk');

			function callback (err){ 
				done(err);
			}

			function logger(label,message) {
				console.log(label,' ',message);
			}

			//now launch
			var config = {
				callback: callback,
				logger: logger,
				apk: apk,
				appid: options.appid,
				name: options.name,
				sdk: options.sdk,
				target: options.target ? options.target : 'device',
				auto_exit: true
			};

			androidlib.adb.launch(config);
		});
	}
	finally {
		process.chdir(cwd);
	}	
}


module.exports = new Command(
	'launch',
	'Launch the application in the Android simulator or device',
	[
	],
	function(state,done) {
		try {
			var options = state.options;
			var appDest = path.join(options.dest, options.name);
			antDebugInstall(options, appDest, done);
		} catch (E) {
			done(E);
		}
	}
);

