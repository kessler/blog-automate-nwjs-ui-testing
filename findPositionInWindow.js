/*
 *	This function is evaluated in the browser, we are going to toString() it and send it to the browser
 */
module.exports = function findPositionInWindow(obj) {
	
	if (typeof obj === 'string') {
		var expression = obj
		obj = document.querySelector(expression)

		if (!obj) {
			throw new Error('cannot find an object using expression ' + expression)
		}
	}

	var curleft = 0
	var curtop = 0

	if (obj.offsetParent) {

		do {
			curleft += obj.offsetLeft
			curtop += obj.offsetTop

		} while (obj = obj.offsetParent)
	}

	return {
		left: curleft,
		top: curtop
	}
}
