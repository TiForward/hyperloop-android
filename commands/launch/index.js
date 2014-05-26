/**
 * Android application launching
 */
var spawn = require('child_process').spawn,
	path = require('path'),
	log = require('hyperloop-common').log,
	Command = require('hyperloop-common').Command,
	androidlib = require('../../lib/android');

function tailLog(options,callback) {
	var android = androidlib.findAndroidPath(options,true),
		adb = path.join(android.sdkPath,'platform-tools','adb'),
		child = spawn(adb,['logcat']),
		// look for the start activity initial logging (we do in AppActivity) to get the PID for the app process.
		searchRegex = new RegExp('^D\\/AppActivity\\((\\d+)\\): Starting '+options.appid.replace(/\./g,'\\.')+'\.'+options.name+'Activity'),
		pid,
		moveAhead;
	child.stdout.on('data',function(buf){
		buf = String(buf);
		buf.split('\n').forEach(function(line){
			if (!pid) {
				var m = searchRegex.exec(line);
				if (m) {
					pid = m[1];
					moveAhead = pid.length + 3;
				}
				return;
			}
			var idx = line.indexOf(pid+'): ');
			if (idx<0) return;
			var submsg = line.substring(idx+moveAhead).trim(),
				msg = ('[ADB] '.blue)+ submsg,
				label = line.substring(0,2);
			switch (label) {
				case 'I/':
					log.info(msg);
					break;
				case 'D/':
					// filter out some android low-level stuff
					if (/^(pt_debug|ion)\s*\:/.test(submsg) || /^, tls=0x/.test(submsg)) {
						log.trace(msg);
					}
					else {
						log.debug(msg);
					}
					break;
				case 'W/':
					log.warn(msg);
					break;
				case 'E/':
				case 'F/':
					log.error(msg);
					break;
			}
		});
	});
	child.on('exit',callback);
}

function startApp(options, callback) {
	var android = androidlib.findAndroidPath(options,true),
		adb = path.join(android.sdkPath,'platform-tools','adb'),
		args = ['shell','am','start','-n',options.appid+'/'+options.appid+'.'+options.name+'Activity'],
		child = spawn(adb,args);
	log.debug('running adb',args.join(' ').cyan);
	child.stdout.on('data',function(buf){
		log.debug(String(buf));
	});
	child.stderr.on('data',function(buf){
		log.error(String(buf));
	});
	child.on('exit',function(exitCode){
		if (exitCode!=0) {
			return callback("Couldn't start app");
		}
		tailLog(options,callback);
	});
}

function antDebugInstall(options, cwd, callback) {
	var command = 'ant debug install';
	log.debug('Executing command',command.cyan,'at',cwd.cyan);
	var child = spawn('ant',['debug','install'], {cwd:cwd});
	var _finished = false;
	function finished(err) {
		if (!_finished) {
			_finished = true;
			// let the spawn finish
			setTimeout(function(){
				callback(err);
			},10); 
		}
	}
	child.stderr.on('data',function(buf){
		log.error(String(buf));
	});
	child.stdout.on('data',function(buf){
		buf = String(buf);
		if (buf.indexOf('error: device not found')>-1) {
			return finished(buf);
		}
		log.trace(buf);
	});
	child.on('error', function(err){
		if (err.code === 'EACCES') {
			return finished("Couldn't find ant. Please install ant on your PATH before continuing");
		}
		finished(err);
	});
	child.on('exit',function(exitCode){
		if (exitCode!=0) {
			return finished('App install failed');
		}
		startApp(options,finished);
	});
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

