var rc = require('rc')
var packageJson = require('../package.json')
var minimist = require('minimist')
var argv = require('./argv.js')

var defaults = {		
	debug: false,
	appName: packageJson.name,
	logLevel: 'info',
	height: packageJson.window.min_height,
	width: packageJson.window.min_width
}

module.exports = rc(packageJson.name, defaults, minimist(argv.get()))