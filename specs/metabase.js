/**
 * metabase test case for Android
 */
var should = require('should'),
    path = require('path'),
    fs = require('fs'),
    appc = require('node-appc'),
    metabase = require('../lib/metabase'),
    wrench = require('wrench'),
    TMP = path.join('.', '_tmp');

describe("Android metabase", function() {

	before(function(done){
		this.timeout(10000);

		wrench.mkdirSyncRecursive(TMP, 0755);

		var p = process.env.PATH.split(path.delimiter),
			android_sdk = process.env.ANDROID_SDK_ROOT,
			versions = [ '19', '18', '17', '16', '15', '14' ];

		appc.android.detect(function(results){
			android_sdk = results.sdkPath || android_sdk;
			if (!android_sdk) {
				throw new Error("Can't find ANDROID SDK");
			}

			// try and find android
			for (var c = 0; c < p.length; c++) {
				var f = p[c];
				for (var d = 0, dL = versions.length; d < dL; d++) {
				var ad = path.join(android_sdk,'platforms','android-' + versions[d],'android.jar');
					if (fs.existsSync(ad)) {
						console.log('Using Android SDK at ' + ad);
						should.exist(androidPath = ad);
						return done();
					}
				}
			}
			throw new Error('Android SDK with version ' + (versions.join(' or ')) + ' not found under $ANDROID_SDK_ROOT.');
		});
	});

	after(function(){
		wrench.rmdirSyncRecursive(TMP);
	});

	it("should load",function(done) {
		should.exist(metabase);
		done();
	});

	it("should parse Android SDK libraries",function(done) {
		this.timeout(10000);

		should.exist(androidPath);

		metabase.loadMetabase(androidPath, {force:true, platform:'android', cacheDir:TMP}, function(err,json){
			should.not.exist(err);
			should.exist(json);
			json.should.be.an.Object;
			json.classes.should.be.an.Object;
			should.exist(json.classes['android.app.Activity']);
			json.classes['android.app.Activity'].properties.should.be.an.Object;
			json.classes['android.app.Activity'].methods.should.be.an.Object;
			json.classes['android.app.Activity'].superClass.should.eql('android.view.ContextThemeWrapper');
			json.classes['android.app.Activity'].metatype.should.eql('class');
			json.classes['android.app.Activity'].package.should.eql('android.app');

			(json.classes['android.app.Activity'].methods['onResume'] instanceof Array).should.be.true;
			should.exist(json.classes['android.app.Activity'].methods['onResume'][0]);
			should.exist(json.classes['android.app.Activity'].methods['onResume'][0].attributes);
			should.exist(json.classes['android.app.Activity'].methods['onResume'][0].signature);
			(json.classes['android.app.Activity'].methods['onResume'][0].attributes.indexOf('protected') >= 0).should.be.true;
			json.classes['android.app.Activity'].methods['onResume'][0].signature.should.be.eql('()V');
			done();
		});
	});
});