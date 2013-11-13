(function() {
	'use strict';

	// var song = {
	// 	title: 'Lepidoptera',
	// 	artist: 'Epoq',
	// 	pattern: './../playlist/song-%d.ogg',
	// 	parts: 21
	// };
	var song = {
		title: 'The Piano',
		artist: 'Michael Nyman',
		pattern: './../playlist/piano-2-%d.ogg',
		parts: 15
	};
	song.sources = {};
	song.nextPart = 0;
	song.nextTime = 0;
	song.partTimes = [];

	function loadNext() {
		var part = song.nextPart;
		if (part == song.parts) {
			return;
		}
		song.nextPart++;

		console.log('Loading %d', part);
		var url = song.pattern.replace('%d', part);

		loadArrayBuffer(url, function(data) {
			console.log('Decode %d', part);
			if (!part) {
				startTime = context.currentTime;
				song.nextTime = startTime;
			}
			queueArrayBuffer(data, song.nextTime, function(audioSource, time) {
				song.nextTime = time;
				song.partTimes.push(time);
				song.sources[part] = audioSource;
				loadNext();
			});
		});
	}

	var context = new AudioContext();
	var analyser = context.createAnalyser();
	analyser.smoothingTimeConstant = 0.5;
	analyser.connect(context.destination);

	var startTime = 0;

	function init() {
		if (startTime) {
			return;
		}
		$play.disabled = true;
		requestAnimationFrame(tick);
		loadNext();
	}

	var muted = false;

	function mute() {
		if (muted) {
			analyser.connect(context.destination);
		} else {
			analyser.disconnect();
		}
		muted = !muted;
	}

	function loadArrayBuffer(url, next) {
		console.log('Request %s', url);
		var request = new XMLHttpRequest();
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';
		request.onload = function() {
			next(request.response);
			request = null;
		}
		request.send();
	}

	function queueArrayBuffer(data, time, next) {
		context.decodeAudioData(data, function(audioBuffer) {
			var duration = audioBuffer.duration;
			if (!duration) {
				throw new Error('No duration!');
			}
			console.log('Loaded buffer %d / %d s', duration, time);

			var audioSource = context.createBufferSource();
			audioSource.connect(analyser);

			audioSource.buffer = audioBuffer;
			audioSource.start(time);
			audioSource.playbackRate.value = 1;
			next(audioSource, time + duration);
		});
	}

	var $play = document.getElementById('play');
	$play.onclick = init;
	$play.disabled = false;
	var $mute = document.getElementById('mute');
	$mute.onclick = mute;

	var $time = document.getElementById('time');
	var $timeCurrent = document.getElementById('timeCurrent');
	var $scrubber = document.getElementById('scrubber');

	/**
	 * Spectrum analyser
	 */
	var $canvas = document.querySelector('canvas');
	var ctx = $canvas.getContext('2d');
	var width = $canvas.width;
	var height = $canvas.height;
	var bar_width = 10;

	function drawSpectrum() {
		ctx.clearRect(0, 0, width, height);
		var freqByteData = new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(freqByteData);

		ctx.fillStyle = '#bbb';
		var barCount = Math.round(width / bar_width);
		for (var i = 0; i < barCount; i++) {
			var magnitude = freqByteData[i];
			// some values need adjusting to fit on the canvas
			ctx.fillRect(bar_width * i, height, bar_width - 2, -magnitude + 20);
		}
	}

	/**
	 * Scrubber marker
	 */
	var markStyle = 'no-repeat url("arrow.png")';
	function drawMarkers() {
		var time = song.nextTime;
		var current = context.currentTime - startTime;

		$timeCurrent.value = Math.round(context.currentTime);
		$time.value = Math.round(time);
		$scrubber.max = time;
		$scrubber.value = current;

		var close = false;
		var markers = song.partTimes.map(function(value) {
			if (Math.abs(value - current) < 0.5) {
				close = true;
			}
			var percentage = value / time * 100;
			return markStyle + ' ' + percentage + '% 0px';
		});
		$scrubber.style.background = markers.join(', ');

		$timeCurrent.style.color = (close) ? 'red' : 'green';
	}

	function tick() {
		drawSpectrum();
		drawMarkers();

		requestAnimationFrame(tick);
	};

})();