(function() {
	var script = document.createElement('script');
	script.onload = function() {
		var stats = new Stats();
		stats.domElement.style.position = 'fixed';
		stats.domElement.style.left = '0px';
		stats.domElement.style.top = '0px';
		stats.domElement.style.zIndex = '10000';
		document.body.appendChild(stats.domElement);
		requestAnimationFrame(function update() {
			stats.update();
			requestAnimationFrame(update);
		});
	}
	script.src = 'http://github.com/mrdoob/stats.js/raw/master/build/stats.min.js';
	document.body.appendChild(script);
})();