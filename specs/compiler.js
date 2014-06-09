/**
 * compiler test case for Java
 */
var should = require('should'),
    path = require('path'),
    fs = require('fs'),
    wrench = require('wrench'),
    compiler = require('../lib/compiler'),
    metabase = require('../lib/metabase'),
    TMP = path.join('.', '_tmp'),
    javaMetabase;

describe("Android compiler", function() {

	before(function(done){
		this.timeout(30000);
		wrench.mkdirSyncRecursive(TMP, 0755);
		metabase.loadMetabase(null, {force:true, platform:'android', cacheDir:TMP}, function(err,json){
			should.not.exist(err);
			should.exist(json);
			javaMetabase = json;
			done();
		});
	});

	after(function(){
		wrench.rmdirSyncRecursive(TMP);
	});

	it("should load",function(done) {
		should.exist(compiler);
		done();
	});

	it("should look up method",function(done) {
		should.exist(javaMetabase);
		javaMetabase.should.be.an.Object;
		javaMetabase.classes.should.be.an.Object;
		should.exist(javaMetabase.classes['java.lang.Object']);
		state = { metabase: javaMetabase };
		node = { args: [], start: 1 };

		getClass = compiler.getInstanceMethodSymbol(state, 'java.lang.Object', 'getClass', 'varname', 'symbolname', node, function(node,msg){
			throw new Error(msg);
		});
		should.exist(getClass);
		getClass.should.be.an.Object;
		getClass.type.should.be.eql('method');

		getClass.returnType.should.be.eql('java.lang.Class');

		should.exist(getClass.method);
		getClass.method.should.be.an.Object;
		should.exist(getClass.method.attributes);
		(getClass.method.attributes.indexOf('public') >= 0).should.be.true;
		(getClass.method.attributes.indexOf('final') >= 0).should.be.true;
		getClass.method.instance.should.be.true;
		should.exist(getClass.method.signature);
		getClass.method.signature.should.be.eql('()Ljava/lang/Class;');
		done();
	});

	it("should look up property getter",function(done) {
		should.exist(javaMetabase);
		javaMetabase.should.be.an.Object;
		javaMetabase.classes.should.be.an.Object;
		should.exist(javaMetabase.classes['java.lang.String']);
		state = { metabase: javaMetabase };
		node = { args: [], start: 1 };

		getter = compiler.getGetterSymbol(state, 'java.lang.String', 'CASE_INSENSITIVE_ORDER', 'varname', 'symbolname', node, function(node,msg){
			throw new Error(msg);
		});
		should.exist(getter);
		getter.should.be.an.Object;
		getter.metatype.should.be.eql('getter');
		getter.class.should.be.eql('java.lang.String');
		getter.returnType.should.be.eql('java.util.Comparator');

		should.exist(getter.property);
		getter.property.should.be.an.Object;
		should.exist(getter.property.attributes);
		(getter.property.attributes.indexOf('public') >= 0).should.be.true;
		(getter.property.attributes.indexOf('final') >= 0).should.be.true;

		done();
	});

	it("should look up property setter",function(done) {
		should.exist(javaMetabase);
		javaMetabase.should.be.an.Object;
		javaMetabase.classes.should.be.an.Object;
		should.exist(javaMetabase.classes['java.lang.String']);
		state = { metabase: javaMetabase };
		node = { args: [], start: 1 };

		getter = compiler.getSetterSymbol(state, 'java.lang.String', 'CASE_INSENSITIVE_ORDER', 'varname', 'symbolname', node, function(node,msg){
			throw new Error(msg);
		});
		should.exist(getter);
		getter.should.be.an.Object;
		getter.metatype.should.be.eql('setter');
		getter.class.should.be.eql('java.lang.String');

		should.exist(getter.property);
		getter.property.should.be.an.Object;
		should.exist(getter.property.attributes);
		(getter.property.attributes.indexOf('public') >= 0).should.be.true;
		(getter.property.attributes.indexOf('final') >= 0).should.be.true;
		done();
	});

	it("should look up type hierarchy for methods",function(done) {
		should.exist(javaMetabase);
		javaMetabase.should.be.an.Object;
		javaMetabase.classes.should.be.an.Object;
		should.exist(javaMetabase.classes['java.lang.String']);
		should.exist(javaMetabase.classes['java.lang.Object']);
		state = { metabase: javaMetabase };
		node = { args: [], start: 1 };

		getClass = compiler.getInstanceMethodSymbol(state, 'java.lang.String', 'getClass', 'varname', 'symbolname', node, function(node,msg){
			throw new Error(msg);
		});
		should.exist(getClass);
		getClass.should.be.an.Object;
		getClass.type.should.be.eql('method');

		getClass.returnType.should.be.eql('java.lang.Class');

		should.exist(getClass.method);
		getClass.method.should.be.an.Object;
		should.exist(getClass.method.attributes);
		(getClass.method.attributes.indexOf('public') >= 0).should.be.true;
		(getClass.method.attributes.indexOf('final') >= 0).should.be.true;
		should.exist(getClass.method.signature);
		getClass.method.signature.should.be.eql('()Ljava/lang/Class;');
		done();
	});
});