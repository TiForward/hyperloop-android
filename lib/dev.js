exports.require = require_dev;

/*
 * special require to allow dev easier
 */
function require_dev(name) {
	var local_hl = require('path').join(__dirname,'..','..',name);
	return require('fs').existsSync(local_hl) ? require(local_hl) : require(name);
}

