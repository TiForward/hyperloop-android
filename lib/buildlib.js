/**
 * build library utility for Android
 */
var exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	_ = require('underscore'),
	wrench = require('wrench'),
	hyperloop = require('./dev').require('hyperloop-common'),
	log = hyperloop.log,
	util = hyperloop.util,
	lib = require('./library'),
	os = require('os'),
	clang = hyperloop.compiler.clang,
	androidlib = require('./dev').require('androidlib'),
	jscoreConfigs = {
		'release': {
			version: 'd9475d4ee3feeea6ff543bddc0109f41aa9b0d8e',
			checksum: '03384ee122758c10e9b95776981d71282d69169e'
		}
	},
	urlFormat = 'http://timobile.appcelerator.com.s3.amazonaws.com/jscore/JavaScriptCore-Android-%s-%s.zip';

exports.library = library;

function getJNIIncludePaths (options) {
	var android_ndk = androidlib.env.find(options,true).ndkPath;
	return [path.join(android_ndk,'platforms','android-'+options.sdk,'arch-arm','usr','include')];
}

/**
 * create a shared library
 */
function library(options, staticlib, debug, jobs, sources, cflags, linkflags, libdir, outdir, name, callback) {

	var android_ndk = androidlib.env.find(options,true).ndkPath,
		cflags = (cflags||[]).concat(['-I"'+libdir+'"']),
		linkflags = linkflags||[],
		linker = staticlib ? android_ndk+'/toolchains/arm-linux-androideabi-4.8/prebuilt/darwin-x86_64/bin/arm-linux-androideabi-ar' : android_ndk+'/toolchains/llvm-3.3/prebuilt/darwin-x86_64/bin/clang++';

	downloadJavaScriptCore(options,function(err){
		if (err) { return callback(err); }

		if (!staticlib) {
			name = name.replace(/\.a$/,'.so');
		}

		if (options.debug) {
			cflags.push('-DHL_DEBUG');
		}

		getJNIIncludePaths(options).forEach(function(inc){
			cflags.push('-I'+inc);
		});

		cflags.push('-I'+options.dest);

		if (!staticlib) {
			// TODO should be organized using array
			var linkflags_str = '-Wl,-soname,lib'+options.name+'.so -shared --sysroot='+android_ndk+'/platforms/android-'+options.sdk+'/arch-arm build/build/'+options.arch+'/libJavaScriptCore.so '+android_ndk+'/sources/cxx-stl/gnu-libstdc++/4.8/libs/armeabi-v7a/libgnustl_shared.so -gcc-toolchain '+android_ndk+'/toolchains/arm-linux-androideabi-4.8/prebuilt/darwin-x86_64 -no-canonical-prefixes -target armv7-none-linux-androideabi -Wl,--fix-cortex-a8 -Wl,--no-undefined -Wl,-z,noexecstack -Wl,-z,relro -Wl,-z,now  -L'+android_ndk+'/platforms/android-'+options.sdk+'/arch-arm/usr/lib -llog -L'+options.dest+' '+android_ndk+'/sources/cxx-stl/gnu-libstdc++/4.8/libs/armeabi-v7a/libsupc++.a -lc -lm';

			linkflags = linkflags.concat(linkflags_str.split(' '));
		}

		// TODO should be organized using array
		var cflags_str = '-ffunction-sections -funwind-tables -fstack-protector -no-canonical-prefixes -target armv7-none-linux-androideabi -march=armv7-a -mfloat-abi=softfp -mfpu=vfpv3-d16 -fno-exceptions -fno-rtti -mthumb -Os -g -DNDEBUG -fomit-frame-pointer -fno-strict-aliasing -I'+android_ndk+'/sources/cxx-stl/gnu-libstdc++/4.8/include -I'+android_ndk+'/sources/cxx-stl/gnu-libstdc++/4.8/libs/armeabi-v7a/include -I'+android_ndk+'/sources/cxx-stl/gnu-libstdc++/4.8/include/backward -Ijni -DANDROID -std=c++11 -I'+options.dest+' -Wa,--noexecstack -Wformat -Werror=format-security -gcc-toolchain '+android_ndk+'/toolchains/arm-linux-androideabi-4.8//prebuilt/darwin-x86_64';

		cflags = cflags.concat(cflags_str.split(' '));

		if (debug) {
			cflags.push('-DHL_DEBUG');
		}

		var config = {
			outdir: outdir,
			srcfiles: sources,
			cflags: cflags,
			clang: path.join(android_ndk,'toolchains','llvm-3.3','prebuilt','darwin-x86_64','bin','clang++'),
			linker: linker,
			linkflags: linkflags,
			libname: name,
			debug: debug,
			jobs: jobs,
			sdk: options.sdk,
			arch: options.arch
		};
		
		var force = !fs.existsSync(name);

		// compile and then link a library
		clang.compile(config, function(err, objfiles) {
			if (err) return callback(err);
			if (objfiles.length || force) {
				config.objfiles = objfiles;
				if (staticlib) {
					static_library(config, callback);
				} else {
					config.linkflags = linkflags.concat(objfiles).concat(['-lhyperloop']);
					shared_library(config, callback);
				}
			}
			else {
				callback(new Error("no object files"));
			}
		});

	});	

}

/**
 * compile a shared library
 */
function shared_library(config, callback) {

	var args = (config.linkflags||[]).concat(['-o',config.libname]),
		linker = config.linker; 

	if (!fs.existsSync(config.outdir)) {
		wrench.mkdirSyncRecursive(config.outdir);
	}

	log.debug(linker,args.join(' '));

	var child = spawn(linker,args);
	child.stdout.on('data',function(buf) {
		log.debug(buf.toString());
	});
	child.stderr.on('data',function(buf) {
		log.error(buf.toString());
	});
	child.on('close',function() {
		callback(null, config.libname);
	});
}

/**
 * compile a static library
 */
function static_library(config, callback) {

	var linklist = path.join(config.outdir,'objects.list'),
		args = (config.linkflags||[]).concat(['crs', config.libname,'@'+linklist]),
		linker = config.linker; 

	if (!fs.existsSync(config.outdir)) {
		wrench.mkdirSyncRecursive(config.outdir);
	}

	fs.writeFileSync(linklist,config.objfiles.join('\n'),'utf8');

	log.debug(linker,args.join(' '));

	var child = spawn(linker,args);
	child.stdout.on('data',function(buf) {
		log.debug(buf.toString());
	});
	child.stderr.on('data',function(buf) {
		log.error(buf.toString());
	});
	child.on('close',function() {
		callback(null, config.libname);
	});
}

/**
 * downloads JavaScriptCore if necessary
 */
function downloadJavaScriptCore (options, done) {

	options.target = options.target || 'release';

	var homeDir = util.writableHomeDirectory(),
		jscDir = path.join(homeDir, 'JavaScriptCore'),
		jscDownloadDir = 'JavaScriptCore-Android-' + options.target,
		jscDownloadDirFull = path.join(jscDir, jscDownloadDir),
		jscoreConfig = jscoreConfigs[options.target],
		version = jscoreConfig.version,
		checksum = jscoreConfig.checksum,
		url = require('util').format(urlFormat, options.target, version);

	util.downloadResourceIfNecessary(jscDownloadDir, version, url, checksum, jscDir, copyModulesForBuild);

	function copyModulesForBuild(err) {
		if (err) {
			log.error('Downloading and extracting JavaScriptCore for sdk' + options.sdk + ' failed.');
			return done(err);
		}

		if (util.isDirectory(jscDownloadDirFull)) {
			var files = wrench.readdirSyncRecursive(jscDownloadDirFull);
			files.forEach(function(f) {
				if (f == path.join('JavaScriptCore', 'lib', options.arch, 'libJavaScriptCore.so')) {
					var jscCopyTo = path.join(options.dest,'build',options.arch, path.basename(f));
					var jscCopyFrom = path.join(jscDownloadDirFull, f);
					log.debug('Copying libJavaScriptCore.so into ' + jscCopyTo);
					wrench.mkdirSyncRecursive(path.dirname(jscCopyTo));
					fs.writeFileSync(jscCopyTo, fs.readFileSync(jscCopyFrom));
				}
			});
		}
		done();
	}
}