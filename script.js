
(function() {
	'use strict';

	// Simple playback using HTML5 Audio tags
	var $audio = [
		new Audio(),
		new Audio()
	], url;

	// Simple playlist management
	var playlist = [
			'mountains.ogg',
			'castle.ogg',
			'01_Just_Imagine_vbr.mp3',
			'02_Pulse_of_the_Earth_vbr.mp3'
		],
		position = 0,
		audioIndex = -1,
		file = '';


	function playNext() {
		// Get next song from playlist
		file = playlist[position++];
		if (position >= playlist.length) position = 0;

		var url = './playlist/' + file + '.gz';

		// Load song via XHR2 as arraybuffer
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url);
		xhr.responseType = 'arraybuffer';

		xhr.onload = function() {
			$load.nextSibling.value = 'Processing ' + file;

			// Send song to Worker for "decoding"
			var input = xhr.response;
			decoderWorker.postMessage({
				input: input,
				id: file
			}, [input]);
		};

		$load.nextSibling.value = 'Loading ' + file;
		xhr.send(null);
	}

	// DOM listeners
	var $load = document.getElementById('load');
	$load.onclick = playNext;


	var decoderWorker = new Worker('worker.js');

	// Input is decoded and returned from worker
	decoderWorker.onmessage = function(msg) {
		$load.nextSibling.value = 'Playing ' + file;

		// Prepare fading previous song
		var previousAudio = null;
		if (audioIndex != -1) {
			previousAudio = $audio[audioIndex];

			fadeVolume(previousAudio, {
					direction: -1
				}, function() {
					previousAudio.pause();
					previousAudio.src = null;
				}
			);
		} else {
			audioIndex = 0;
		}

		// Select next audio element for cross-fading
		audioIndex = (audioIndex) ? 0 : 1
		var nextAudio = $audio[audioIndex];

		// Simple mime check to work with both
		var mime = /\.ogg$/.test(msg.data.id) ? 'audio/ogg' : 'audio/mpeg';

		var data = msg.data.output;
		// console.log(data instanceof ArrayBuffer);
		var blob = new Blob([new Uint8Array(data)], {type: mime});
		// console.log(blob.size, blob.type);
		url = URL.createObjectURL(blob);

		// Clean up
		// blob = msg = null;

		var started = false;

		nextAudio.volume = 0;
		nextAudio.src = url;

		// Play and fade in! Could be controlled more fine-grained, synced with
		// ending of current song
		nextAudio.play();
		fadeVolume(nextAudio);
	};


	// Revoke URLs when audio is loaded
	function revokeUrl() {
		if (url) {
			URL.revokeObjectURL(url);
			url = null;
		}
	}
	$audio[0].addEventListener('canplaythrough', revokeUrl);
	$audio[1].addEventListener('canplaythrough', revokeUrl);


	// Helper

	// Cross-fading audio volume
	function fadeVolume($el, options, onend) {
		options = options || {};
		var direction = options.direction || 1;
		var speed = options.speed || 0.07;
		var current = $el.volume;
		var stepper = function() {
			current += direction * speed;
			current = (direction > 0) ? Math.min(current, 1) : Math.max(current, 0);
			$el.volume = current;
			if ((direction > 0 && current == 1) || (direction < 0 && current == 0)) {
				clearInterval(timer);
				if (onend) {
					onend();
				}
			}
		}
		var timer = window.setInterval(stepper, 100);
	};

})();