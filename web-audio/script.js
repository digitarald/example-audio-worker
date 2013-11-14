(function() {
	'use strict';

	/**
	 * Test data and loading state. In real life this should be class properties; just layed out for demo purposes here.
	 */
	var song = {
		title: 'The Piano',
		artist: 'Michael Nyman',
		pattern: './../playlist/piano-2-%d.ogg',
		parts: 15,
		single: './../playlist/piano-1-%s.ogg',
		sources: {},
		time: 0,
		times: [],
		buffer: new ArrayBuffer(),
		source: null
	};

	/**
	 * Queue each new source as node, aligned with the previous one
	 */
	function waterfallNext(index) {
		index = index || 0;
		var url = song.pattern.replace('%d', index);

		loadArrayBuffer(url, function(data) {
			context.decodeAudioData(data, function(audioBuffer) {
				if (!index) {
					startTime = context.currentTime;
					song.time = startTime;
				}
				var result = queueArrayBuffer(audioBuffer, song.time);
				song.time = result.time;
				song.times.push(song.time);
				song.sources[index] = result.source;
				setTimeout(function() {
					if (index + 1 < song.parts) {
						waterfallNext(index + 1);
					}
				}, (index) ? 250 : 0);
			});
		});
	}

	/**
	 * Append new buffers to a new source and stop previous source
	 */
	function appendNext(index) {
		index = index || 0;
		var url = song.pattern.replace('%d', index);
		loadArrayBuffer(url, function(data) {
			if (!index) {
				startTime = context.currentTime;
			}
			song.buffer = concatBuffers(song.buffer, data);

			context.decodeAudioData(song.buffer, function(audioBuffer) {
				var result = queueArrayBuffer(audioBuffer, startTime);
				song.time = result.time;
				if (song.source) {
					song.source.stop();
				}
				song.source = result.source;
				setTimeout(function() {
					if (index + 1 < song.parts) {
						appendNext(index + 1);
					}
				}, (index) ? 500 : 0);
			});
		});
	}

	var context = new (webkitAudioContext || AudioContext)();
	/**
	 * Analyzer for effects
	 */
	var analyser = context.createAnalyser();
	analyser.smoothingTimeConstant = 0.5;
	analyser.connect(context.destination);

	var startTime = 0;

	function init() {
		if (startTime) {
			location.href = location.href;
			return;
		}
		$play.textContent = 'Stop';
		requestAnimationFrame(tick);
		switch (document.getElementById('split').value) {
			case 'waterfall':
				waterfallNext();
				break;
			case 'append':
				appendNext();
				break;
		}
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

	function queueArrayBuffer(audioBuffer, time, next) {
		var duration = audioBuffer.duration;
		if (!duration) {
			throw new Error('No duration!');
		}
		var currentTime = context.currentTime;
		time = time || currentTime;
		var originalTime = time;
		var offset = 0;
		if (time < currentTime) {
			offset = currentTime - time;
			time = currentTime;
		}
		console.log('Loaded buffer %d / %d s', duration, time);

		var audioSource = context.createBufferSource();
		audioSource.connect(analyser);

		audioSource.buffer = audioBuffer;
		audioSource.start(time, offset);
		audioSource.playbackRate.value = 1;
		return {
			time: originalTime + duration,
			source: audioSource
		};
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
		var time = song.time;
		var current = context.currentTime;

		$timeCurrent.value = Math.round(current);
		$time.value = Math.round(time);
		$scrubber.min = Math.round(startTime);
		$scrubber.max = Math.round(time);
		$scrubber.value = current;

		var close = false;
		var markers = song.times.forEach(function(value) {
			if (Math.abs(value - current) < 0.2) {
				close = true;
			}
			// var percentage = value / time * 100;
			// return markStyle + ' ' + percentage + '% 0px';
		});
		// $scrubber.style.background = markers.join(', ');

		$scrubber.classList[(close) ? 'add' : 'remove']('marker');
	}

	function tick() {
		drawSpectrum();
		drawMarkers();

		requestAnimationFrame(tick);
	}

	// The unavoidable utils section

	// A quick and easy way to append buffers
	function concatBuffers(a, b) {
		var result = new Uint8Array(a.byteLength + b.byteLength);
		result.set(new Uint8Array(a), 0);
		result.set(new Uint8Array(b), a.byteLength);
		return result.buffer;
	}

})();