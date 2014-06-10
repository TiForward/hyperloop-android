var should = require('should'),
	path = require('path'),
	typelib = require('../lib/dev').require('hyperloop-common').compiler.type,
	library = require('../lib/dev').require('hyperloop-common').compiler.library;

describe('Java types', function(){

	before(function(){
		typelib.reset();
		typelib.metabase = null;
		typelib.platform = null;
	});

	afterEach(function(){
		typelib.reset();
		typelib.metabase = null;
		typelib.platform = null;
	});

	beforeEach(function(){
		typelib.platform = path.join(__dirname,'..');
	});

	it('java.lang.Object',function() {
		typelib.metabase = {
			classes: {
				"java.lang.Object": {}
			}			
		};
		var type = typelib.resolveType('java.lang.Object');
		type.isJSObject().should.be.true;
		type.isNativeObject().should.be.true;
	});

	it('boolean',function() {
		typelib.metabase = {
			classes: {}
		};
		var type = typelib.resolveType('boolean');
		type.isJSObject().should.be.false;
		type.isNativeObject().should.be.false;
		type.isJSBoolean().should.be.true;
		type.isNativeBoolean().should.be.true;
	});

	it('char[]',function() {
		typelib.metabase = {
			classes: {}
		};
		var type = typelib.resolveType('char[]');
		type.isJSObject().should.be.true;
		type.isNativeArray().should.be.true;
	});

	it('java.lang.String[]',function() {
		typelib.metabase = {
			classes: {
				"java.lang.String": {}
			}			
		};
		var type = typelib.resolveType('java.lang.String[]');
		type.isJSObject().should.be.true;
		type.isNativeArray().should.be.true;
	});

	it('toValueAtFail',function() {
		typelib.metabase = {
			classes: {
				"java.lang.String": {}
			}			
		};
		var type = typelib.resolveType('java.lang.String');
		type.toValueAtFail().should.be.equal('nullptr');
		type = typelib.resolveType('java.lang.String[]');
		type.toValueAtFail().should.be.equal('nullptr');
		type = typelib.resolveType('boolean');
		type.toValueAtFail().should.be.equal('false');
	});

	['byte', 'short', 'int', 'float', 'double', 'long'].forEach(function(name){
		it('toValueAtFail '+name,function() {
			typelib.metabase = {
				classes: {}
			};
			var type = typelib.resolveType(name);
			type.toValueAtFail().should.be.equal('0');
		});
		it('primitive '+name,function() {
			typelib.metabase = {
				classes: {}
			};
			var type = typelib.resolveType(name);
			type.isJSObject().should.be.false;
			type.isNativeObject().should.be.false;
			type.isJSNumber().should.be.true;
			type.isNativePrimitive().should.be.true;
		});
		it('toNativeName '+name,function() {
			typelib.metabase = {
				classes: {}
			};
			var type = typelib.resolveType(name);
			type.toNativeName().should.be.equal('JSValueTo_JavaObject');
		});
	});

	it('toNativeName',function() {
		typelib.metabase = {
			classes: {
				"java.lang.String": {}
			}			
		};
		var type = typelib.resolveType('java.lang.String');
		type.toNativeName().should.be.equal('JSValueTo_JavaObject');
		type = typelib.resolveType('boolean');
		type.toNativeName().should.be.equal('JSValueTo_JavaObject');
	});

	it('getAssignmentCast',function() {
		typelib.metabase = {
			classes: {
				"java.lang.String": {}
			}			
		};
		var type = typelib.resolveType('java.lang.String');
		type.getAssignmentCast('test').should.be.equal('test');
		type = typelib.resolveType('boolean');
		type.getAssignmentCast('test').should.be.equal('(bool)(test==JNI_TRUE ? true : false)');
		type = typelib.resolveType('byte');
		type.getAssignmentCast('test').should.be.equal('(unsigned char)test');
		type = typelib.resolveType('short');
		type.getAssignmentCast('test').should.be.equal('(short)test');
		type = typelib.resolveType('int');
		type.getAssignmentCast('test').should.be.equal('(int)test');
		type = typelib.resolveType('double');
		type.getAssignmentCast('test').should.be.equal('(double)test');
		type = typelib.resolveType('long');
		type.getAssignmentCast('test').should.be.equal('(long)test');
		type = typelib.resolveType('float');
		type.getAssignmentCast('test').should.be.equal('(float)test');
	});

	it('toCast',function() {
		typelib.metabase = {
			classes: {
				"java.lang.String": {}
			}			
		};
		var type = typelib.resolveType('java.lang.String');
		type.toCast().should.be.equal('jobject');
		type = typelib.resolveType('java.lang.String[]');
		type.toCast().should.be.equal('jobjectArray');
		type = typelib.resolveType('boolean');
		type.toCast().should.be.equal('jboolean');
		type = typelib.resolveType('boolean[]');
		type.toCast().should.be.equal('jbooleanArray');
	});

});

