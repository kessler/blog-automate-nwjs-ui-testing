var run = require('./task/run.js')
var chromeRemoteInterface = require('chrome-remote-interface')
var path = require('path')
var async = require('async')
var findPositionInWindow = require('./findPositionInWindow.js')
var _ = require('lodash')
var should = require('should')
var argv = require('minimist')(process.argv.slice(2))

if (!argv['remote-debugging-port']) {
	throw new Error('missing remote-debugging-port, try mocha test.js --remote-debugging-port=xxx')
}

describe('my app', function() {
	this.timeout(20000)

	var nw, cri

	it('sends a message to the server', function(done) {
		var requests = []

		// enable network in cri
		cri.Network.enable()

		// listen to outgoing requests
		cri.Network.requestWillBeSent(function(params) {
			requests.push(params)
		})

		// get the send button's position
		getElementPosition(cri, 'a#send', function(err, pos) {
			if (err) return done(err)

			// simulate the click
			click(cri, pos.x + 1, pos.y + 1, function(err, result) {
				if (err) return done(err)
		
				// verify that the right request was sent from the right source
				setTimeout(function () {
					requests.should.have.length(1)
					
					var requestParams = requests[0]

					requestParams.request.url.should.eql('http://localhost/api')
					requestParams.initiator.type.should.eql('script')

					var indexJs = 'file://' + path.join(__dirname, 'nwapp', 'index.js') 
					var clickHandler = _.find(requestParams.initiator.stackTrace, { url: indexJs })
					
					should(clickHandler).be.defined
					clickHandler.lineNumber.should.eql(24)
					
					done()
				}, 1000)
			})
		})
	})

	// run nw.js and connect the remote interface before every test case
	beforeEach(function(done) {
		nw = run()

		setTimeout(function() {
			chromeRemoteInterface(function(c) {
				cri = c
				done()
			}).once('error', function() {
				done(new Error('Cannot connect to Chrome'))
			})
		}, 1000)
	})

	// shut down the connection and close nw.js after each test case
	afterEach(function(done) {
		if (cri) {
			cri.close()
		}

		if (nw.isAppRunning()) {
			nw.getAppProcess().on('close', done).kill()
		} else {
			setTimeout(done, 1000)
		}
	})
})

// get the position of an element inside the window of nw.js
function getElementPosition(cri, selector, callback) {
	async.waterfall([
		function evalFindPos (cb) {
			// evaluate a javascript function that will detect the top and left coordinates of the element relative to the window's origin point
			// and then call that function with a selector that targets the send button
			cri.Runtime.evaluate({
				expression: findPositionInWindow.toString() + '\nfindPositionInWindow(\'a#send\')'
			}, cb)
		},
		function getFindPosResults (remoteEval, cb) {
			// get the results of the previous invocation
			cri.Runtime.getProperties({
				objectId: remoteEval.result.objectId
			}, cb)
		}
	], function(err, findPosResults) {
		if (err) return callback(err)

		var left = _.find(findPosResults.result, {
			name: 'left'
		})

		var top = _.find(findPosResults.result, {
			name: 'top'
		})

		callback(null, {
			x: left.value.value,
			y: top.value.value
		})
	})
}

// simulate a click in the client
function click(cri, x, y, callback) {
	var baseEventInfo = { x: x, y: y, button: 'left', clickCount: 1}

	var mousePressed = _.clone(baseEventInfo)
	mousePressed.type = 'mousePressed'

	var mouseReleased = _.clone(baseEventInfo)
	mouseReleased.type = 'mouseReleased'

	async.series([
		_.bind(cri.Input.dispatchMouseEvent, cri.Input, mousePressed),
		_.bind(cri.Input.dispatchMouseEvent, cri.Input, mouseReleased)
	], callback)	
}

// c.Page.loadEventFired(close)

// c.Network.enable()

// c.Page.enable()

// c.once('ready', function() {
// c.Page.navigate({
// 	'url': 'https://github.com'
// })
// })

// })
