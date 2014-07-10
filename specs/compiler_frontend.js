/**
 * compiler front-end test case
 */
var should = require('should'),
	path = require('path'),
	fs = require('fs'),
    wrench = require('wrench'),
	appc = require('node-appc'),
	_ = require('underscore'),
	hyperloop = require('../lib/dev').require('hyperloop-common'),
	compiler = hyperloop.compiler.ast,
	typelib = hyperloop.compiler.type,
	java_compiler = require('../lib/compiler'),
	metabase = require('../lib/metabase'),
    TMP = path.join('.', '_tmp'),
	javaMetabase = null;

describe("Android Compiler front-end", function() {

	before(function(done) {
		this.timeout(30000);
		wrench.mkdirSyncRecursive(TMP, 0755);

		metabase.loadMetabase(null, {force : true, platform : 'java', cacheDir:TMP}, function(err, json) {
			javaMetabase = json;
			// Add custom class to test against property chain
			javaMetabase.classes['com.test.app.MyClass1'] = { 
				'methods': {
			        "<init>": [
			          {
			            "exceptions": [],
			            "args": [],
			            "name": "<init>",
			            "attributes": [],
			            "instance": true,
			            "returnType": "void",
			            "signature": "()V"
			          }
			        ]
				},
				'properties': {
					'self': {
						'name': 'self',
						'attributes': ['public'],
						'type': 'com.test.app.MyClass1',
						'metatype': 'field'
					},
					'next': {
						'name': 'next',
						'attributes': ['public'],
						'type': 'com.test.app.MyClass2',
						'metatype': 'field'
					}
				}
			};
			javaMetabase.classes['com.test.app.MyClass2'] = { 
				'methods': {
			        "<init>": [
			          {
			            "exceptions": [],
			            "args": [],
			            "name": "<init>",
			            "attributes": [],
			            "instance": true,
			            "returnType": "void",
			            "signature": "()V"
			          }
			        ]
				},
				'properties': {
					'self': {
						'name': 'self',
						'attributes': ['public'],
						'type': 'com.test.app.MyClass2',
						'metatype': 'field'
					},
					'next': {
						'name': 'next',
						'attributes': ['public'],
						'type': 'com.test.app.MyClass1',
						'metatype': 'field'
					}
				}
			};
			typelib.metabase = javaMetabase;
			typelib.platform = require('../').dirname;
			done();
		});
	});

	afterEach(function(){
		typelib.reset();
	});

	after(function(){
		wrench.rmdirSyncRecursive(TMP);
	});

	it("should load", function(done) {
		should.exist(compiler);
		done();
	});

	it("should create builtin object", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = new Date();';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		done();
	});

	it("should use type of variable within context", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = new java.lang.String(\'hello\');\nvar str = s.toString();';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		constructor = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(constructor);
		constructor.type.should.be.eql('constructor');
		constructor.symbolname.should.be.eql('java_lang_String_constructor_Ljava_lang_String__V');
		constructor.class.should.be.eql('java.lang.String');

		method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(method);
		method.type.should.be.eql('method');
		method.metatype.should.be.eql('instance');
		method.symbolname.should.be.eql('java_lang_String_toString');
		method.class.should.be.eql('java.lang.String');
		method.name.should.be.eql('toString');
		method.instance.should.be.eql('s');
		done();
	});

	it("should allow redefinition of variable name", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = new java.lang.String(\'hello\');\nvar str = s.toString();\nvar s = new java.lang.Short(1);';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		constructor = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(constructor);
		constructor.type.should.be.eql('constructor');
		constructor.symbolname.should.be.eql('java_lang_String_constructor_Ljava_lang_String__V');
		constructor.class.should.be.eql('java.lang.String');

		method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(method);
		method.type.should.be.eql('method');
		method.metatype.should.be.eql('instance');
		method.symbolname.should.be.eql('java_lang_String_toString');
		method.class.should.be.eql('java.lang.String');
		method.name.should.be.eql('toString');
		method.instance.should.be.eql('s');
		
		short_constructor = _.find(state.symbols, function(value, key) {
			return value.location.line == 4;
		});
		should.exist(short_constructor);
		short_constructor.type.should.be.eql('constructor');
		short_constructor.symbolname.should.be.eql('java_lang_Short_constructor_S_V');
		short_constructor.class.should.be.eql('java.lang.Short');
		done();
	});

	it("should allow redefinition of variable name multiple times", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = new java.lang.String(\'hello\');\nvar str = s.toString();\nvar s = new java.lang.Short(1);\nvar str = s.toString();\nvar s = new java.lang.Long(1234);\nvar str = s.toString();';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;

		constructor = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(constructor);
		constructor.type.should.be.eql('constructor');
		constructor.symbolname.should.be.eql('java_lang_String_constructor_Ljava_lang_String__V');
		constructor.class.should.be.eql('java.lang.String');

		method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(method);
		method.type.should.be.eql('method');
		method.metatype.should.be.eql('instance');
		method.symbolname.should.be.eql('java_lang_String_toString');
		method.class.should.be.eql('java.lang.String');
		method.name.should.be.eql('toString');
		method.instance.should.be.eql('s');

		short_constructor = _.find(state.symbols, function(value, key) {
			return value.location.line == 4;
		});
		should.exist(short_constructor);
		short_constructor.type.should.be.eql('constructor');
		short_constructor.symbolname.should.be.eql('java_lang_Short_constructor_S_V');
		short_constructor.class.should.be.eql('java.lang.Short');

		short_method = _.find(state.symbols, function(value, key) {
			return value.location.line == 5;
		});
		should.exist(short_method);
		short_method.type.should.be.eql('method');
		short_method.metatype.should.be.eql('instance');
		short_method.symbolname.should.be.eql('java_lang_Short_toString');
		short_method.class.should.be.eql('java.lang.Short');
		short_method.name.should.be.eql('toString');
		short_method.instance.should.be.eql('s');

		long_constructor = _.find(state.symbols, function(value, key) {
			return value.location.line == 6;
		});
		should.exist(long_constructor);
		long_constructor.type.should.be.eql('constructor');
		long_constructor.symbolname.should.be.eql('java_lang_Long_constructor_J_V');
		long_constructor.class.should.be.eql('java.lang.Long');

		long_method = _.find(state.symbols, function(value, key) {
			return value.location.line == 7;
		});
		should.exist(long_method);
		long_method.type.should.be.eql('method');
		long_method.metatype.should.be.eql('instance');
		long_method.symbolname.should.be.eql('java_lang_Long_toString');
		long_method.class.should.be.eql('java.lang.Long');
		long_method.name.should.be.eql('toString');
		long_method.instance.should.be.eql('s');

		done();
	});

	it("should record type of static property", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = java.lang.System.out;\nHyperloop.method(s, \'println(java.lang.String)\').call("hello!");';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		getter = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(getter);
		getter.type.should.be.eql('statement');
		getter.metatype.should.be.eql('getter');
		getter.name.should.be.eql('out');
		getter.class.should.be.eql('java.lang.System');

		method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(method);
		method.type.should.be.eql('method');
		method.metatype.should.be.eql('instance');
		method.symbolname.should.be.eql('java_io_PrintStream_println_Ljava_lang_String__V');
		method.class.should.be.eql('java.io.PrintStream');
		method.name.should.be.eql('println_Ljava_lang_String__V');
		method.instance.should.be.eql('s');
		done();
	});

	it("should transform class methods correctly", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar d = java.lang.Double.parseDouble("123.4");';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;

		parseDouble = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(parseDouble);
		parseDouble.type.should.be.eql('method');
		parseDouble.metatype.should.be.eql('static');
		parseDouble.symbolname.should.be.eql('java_lang_Double_parseDouble');
		parseDouble.class.should.be.eql('java.lang.Double');
		parseDouble.name.should.be.eql('parseDouble');

		done();
	});

	it("should transform class property correctly", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar d = java.lang.String.CASE_INSENSITIVE_ORDER;';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;

		CASE_INSENSITIVE_ORDER = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(CASE_INSENSITIVE_ORDER);
		CASE_INSENSITIVE_ORDER.type.should.be.eql('statement');
		CASE_INSENSITIVE_ORDER.metatype.should.be.eql('getter');
		CASE_INSENSITIVE_ORDER.symbolname.should.be.eql('java_lang_String_Get_CASE_INSENSITIVE_ORDER');
		CASE_INSENSITIVE_ORDER.class.should.be.eql('java.lang.String');
		CASE_INSENSITIVE_ORDER.name.should.be.eql('CASE_INSENSITIVE_ORDER');

		done();
	});

	it("should transform instance property correctly (simple statement)", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar e = new java.io.InvalidClassException(\'String\');\ne.classname;';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;

		classname = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(classname);
		classname.type.should.be.eql('statement');
		classname.metatype.should.be.eql('getter');
		classname.symbolname.should.be.eql('java_io_InvalidClassException_Get_classname');
		classname.class.should.be.eql('java.io.InvalidClassException');
		classname.name.should.be.eql('classname');

		done();
	});

	it("should transform instance property correctly (assign with var)", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar e = new java.io.InvalidClassException(\'String\');\nvar c = e.classname;';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;

		classname = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(classname);
		classname.type.should.be.eql('statement');
		classname.metatype.should.be.eql('getter');
		classname.symbolname.should.be.eql('java_io_InvalidClassException_Get_classname');
		classname.class.should.be.eql('java.io.InvalidClassException');
		classname.name.should.be.eql('classname');

		done();
	});

	it("should transform instance property correctly (chain method after getter)", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar e = new java.io.InvalidClassException(\'String\');\nvar c = e.classname.toCharArray();';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;

		classname = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(classname);
		classname.type.should.be.eql('statement');
		classname.metatype.should.be.eql('getter');
		classname.symbolname.should.be.eql('java_io_InvalidClassException_Get_classname');
		classname.class.should.be.eql('java.io.InvalidClassException');
		classname.name.should.be.eql('classname');

		done();
	});

	it("should transform instance property getter correctly (re-assign)", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar e = new java.io.InvalidClassException(\'String\');\ne = e.classname;';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;

		classname = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(classname);
		classname.type.should.be.eql('statement');
		classname.metatype.should.be.eql('getter');
		classname.symbolname.should.be.eql('java_io_InvalidClassException_Get_classname');
		classname.class.should.be.eql('java.io.InvalidClassException');
		classname.name.should.be.eql('classname');

		done();
	});

	it("should transform instance property chain", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar c = new com.test.app.MyClass1();\nc = c.self.next;';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;

		classname = _.find(state.symbols, function(value, key) {
			return value.name == 'next';
		});
		should.exist(classname);
		classname.type.should.be.eql('statement');
		classname.metatype.should.be.eql('getter');
		classname.symbolname.should.be.eql('com_test_app_MyClass1_Get_next');
		classname.class.should.be.eql('com.test.app.MyClass1');
		classname.name.should.be.eql('next');
		classname.property.name.should.be.eql('next');
		classname.property.type.should.be.eql('com.test.app.MyClass2');

		done();
	});

	it("should transform custom class", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nHyperloop.defineClass(MyT).package(\'com.test.app\').method({name:\'doit\',returns:\'void\',arguments:[], action:function(){}}).build();\nvar c = new com.test.app.MyT();c.doit();';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch,dest:TMP,srcdir:TMP}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		should.exist(state.symbols.com_test_app_MyT_constructor_V);

		should.exist(state.metabase.classes['com.test.app.MyT']);
		should.exist(state.metabase.classes['com.test.app.MyT'].methods);
		should.exist(state.metabase.classes['com.test.app.MyT'].methods.doit);
		state.metabase.classes['com.test.app.MyT'].metatype.should.be.eql('class');
		state.metabase.classes['com.test.app.MyT'].package.should.be.eql('com.test.app');
		state.metabase.classes['com.test.app.MyT'].superClass.should.be.eql('java.lang.Object');
		state.metabase.classes['com.test.app.MyT'].methods.doit[0].returnType.should.be.eql('void');

		should.exist(state.symbols.com_test_app_MyT_doit);
		state.symbols.com_test_app_MyT_doit.name.should.be.eql('doit');
		state.symbols.com_test_app_MyT_doit.type.should.be.eql('method');
		state.symbols.com_test_app_MyT_doit.metatype.should.be.eql('instance');
		state.symbols.com_test_app_MyT_doit.instance.should.be.eql('c');
		state.symbols.com_test_app_MyT_doit.argcount.should.be.eql(0);
		state.symbols.com_test_app_MyT_doit.returnType.should.be.eql('void');

		done();
	});

	it("should transform custom class with method overloading", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nHyperloop.defineClass(MyT2).package(\'com.test.app\').method({name:\'doit\',returns:\'void\',arguments:[{type:\'int\'}], action:function(){}},{name:\'doit\',returns:\'void\',arguments:[{type:\'java.lang.String\'}], action:function(){}}).build();\nvar c = new com.test.app.MyT2();Hyperloop.method(c, \'doit(int)\').call(0);';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch,dest:TMP,srcdir:TMP}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		should.exist(state.symbols.com_test_app_MyT2_constructor_V);

		should.exist(state.metabase.classes['com.test.app.MyT2']);
		should.exist(state.metabase.classes['com.test.app.MyT2'].methods);
		should.exist(state.metabase.classes['com.test.app.MyT2'].methods.doit);
		state.metabase.classes['com.test.app.MyT2'].metatype.should.be.eql('class');
		state.metabase.classes['com.test.app.MyT2'].package.should.be.eql('com.test.app');
		state.metabase.classes['com.test.app.MyT2'].superClass.should.be.eql('java.lang.Object');
		state.metabase.classes['com.test.app.MyT2'].methods.doit[0].returnType.should.be.eql('void');

		should.exist(state.symbols.com_test_app_MyT2_doit_I_V);
		state.symbols.com_test_app_MyT2_doit_I_V.name.should.be.eql('doit_I_V');
		state.symbols.com_test_app_MyT2_doit_I_V.type.should.be.eql('method');
		state.symbols.com_test_app_MyT2_doit_I_V.metatype.should.be.eql('instance');
		state.symbols.com_test_app_MyT2_doit_I_V.instance.should.be.eql('c');
		state.symbols.com_test_app_MyT2_doit_I_V.argcount.should.be.eql(1);
		state.symbols.com_test_app_MyT2_doit_I_V.method.args[0].type.should.be.eql('int');
		state.symbols.com_test_app_MyT2_doit_I_V.returnType.should.be.eql('void');

		done();
	});


	it("should transform method overload command", function(done) {
		var arch = 'android',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = new java.lang.String(\'hello\');\nvar i = Hyperloop.method(s, \'indexOf(int)\').call(0);\nvar i2 = Hyperloop.method(s, \'indexOf(java.lang.String)\').call(\'e\');';

		should.exist(javaMetabase);

		state.metabase = javaMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:arch}, state, java_compiler, arch, source, 'filename', 'filename.js', build_opts);

		state.symbols.should.be.an.Object;

		var symbol = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(symbol);
		symbol.type.should.be.eql('method');
		symbol.metatype.should.be.eql('instance');
		symbol.symbolname.should.be.eql('java_lang_String_indexOf_I_I');
		symbol.class.should.be.eql('java.lang.String');
		symbol.name.should.be.eql('indexOf_I_I');
		symbol.method.name.should.be.eql('indexOf');
		symbol.method.args[0].type.should.be.eql('int');
		symbol.method.returnType.should.be.eql('int');

		symbol = _.find(state.symbols, function(value, key) {
			return value.location.line == 4;
		});
		should.exist(symbol);
		symbol.type.should.be.eql('method');
		symbol.metatype.should.be.eql('instance');
		symbol.symbolname.should.be.eql('java_lang_String_indexOf_Ljava_lang_String__I');
		symbol.class.should.be.eql('java.lang.String');
		symbol.name.should.be.eql('indexOf_Ljava_lang_String__I');
		symbol.method.name.should.be.eql('indexOf');
		symbol.method.args[0].type.should.be.eql('java.lang.String');
		symbol.method.returnType.should.be.eql('int');

		done();
	});
}); 
