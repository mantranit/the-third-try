// 'use strict';
/* jshint -W117 */

// NOTE: 'use strict' must be commented out for
// production as it will break some TVs!!

// super old legacy sh*t to be relocated/refactored..
var TV_TYPE = {
	TVITYPE_PHILIPS : 0,
	TVITYPE_ZENITH : 1,
	TVITYPE_LG : 2,
	TVITYPE_MATE : 3,
	TVITYPE_TVLINK : 4,
	TVITYPE_GENERIC : 5,
	TVITYPE_SAMSUNG : 6
};

var BrowserObj = function (mac, devinfo)
{
	if (!window.vodMenuApp) {
		window.vodMenuApp = {
			menuType: 'vod',
			bgMediaStatus: 'playaudio',
			flags: {
				ignoreKeyUntil: false,
				ignoreStopIptv: false
			},
			screensaver: {
				isScreenSaverOn: function(){
					return true;
				}
			},
			stores: {
				getInitQueryString: function() {
					return qstr();
				},
				getIsBootToIptv: function () {
					return false;
				}
			}
		};
	}

	var iptvTemplates = vodMenuApp.iptv_templates;
	if (!iptvTemplates) {
		iptvTemplates = {
			getPlayerHtml: function() {
				return '';
			}
		};
	}

	var stores = window.vodMenuApp.stores;

	var geturl = '';
	var posturl = '';

	if (!window.ssGlobalTodo) {
		window.ssGlobalTodo = { 'playing': false };
	}

	if (!window.config) {
		window.config = {};
	}

	if (!window.iptv) {
		window.iptv = {
			playing: false
		};
	}

	if (!window.player) {
		window.player = {
			playing: false,
			playEventHandler: null
		};
	}

	if (!window.video) {
		window.video = null;
	}

	if (!window.sinfoTodoThis) {
		window.sinfoTodoThis = null;
	}

	if (!window.tvprevTodoThis) {
		window.tvprevTodoThis = null;
	}

	if (!window.menuPageController) {
		window.menuPageController = {
			'reset': function(){
				window.location.reload(true);
			},
			'restoreKeyHandlers': function(){},
			'switchIptv': function(){
				window.location.reload(true);
			}
		};
	}

	// begin!
	this.mac = mac;

	this.deviceVendor = devinfo.deviceVendor;
	this.deviceModel = devinfo.deviceModel;
	this.deviceVideoProtocols = devinfo.protocol_support; // array e.g. ['rtsp:', 'http:']
	this.deviceSerialNumber = null;

	cl('b.js: browser init, deviceVendor[' + this.deviceVendor + '] deviceModel[' + this.deviceModel + ']');

	// To check if initTv has been run
	this.tvInitialised = false;

	// Actual tv power status
	this.tvPowerOn = false;

	// Currently a power status is available, please grab me
	this.sxpGotPowerStatus = false;

	// Is there a current request for power status
	this.sxpPowerRequest = false;

	// currently just philips 2k14/17 but should be reusable for all..
	this.volume = null;
	this.mute = null;
	this.power = null;

	this.timers = {
		'stopIptv'      : undefined, //timeoutId
		'onWindowFocus' : undefined, //timeoutId
		'aminoSxp'      : undefined, //timeoutId
		'volumeControl' : undefined //timeoutId
	};

	this.tvType = null;

	this.curVideoUrl = null;
	this.curIptvUrl = null;

	this.multicast_ip = config.multiserver_ip;
	this.multicast_port = parseInt(config.mc_udp_port, 10);
	this.iptv_protocol = null; // if not set, config.iptv_protocol will be used
	this.drm_initialised = false;
	this.samsungSEFIsOpen = false;
	this.samsungIsMuted = false;
	this.iptv_plugin_type = null;
	this.softApEnabled = null;

	// defaults unless overriden in the switch (this.deviceVendor) section below..
	this.AmiSxpPwrStatus   = function() {};
	this.Continue          = function() {};
	this.ExitToTV          = function() {};
	this.GetMacAddress     = function() { return this.mac; };
	this.GetPos            = function() {};
	this.GetDuration       = function() {};
	this.GetPowerState     = function() {};
	this.KillAudio         = function() {};
	this.MuteToggle        = function() {};
	this.Pause             = function() {};
	this.Play              = function() {};
	this.PlayEventLoop     = function() {};
	this.PlayIPTVEvent     = function() {};
	this.SetPos            = function() {};
	this.SetSpeed          = function() {};
	this.Stop              = function() {};
	this.TVOn              = function() {};
	this.TVOff             = function() {};
	this.PowerToggle       = function() { cl('b.js: PowerToggle: default no-op'); };
	this.SetVolume         = function() {};
	this.GetVolume         = function() {};
	this.VolumeUp          = function() {};
	this.VolumeDown        = function() {};
	this.InitDRM           = function() {};
	this.onWindowFocus     = function() {};
	this.onWindowBlur      = function() {};
	this.SoftAPControl     = function() {};
	this.RegisterKeys      = function() {};
	this.Reboot            = function() { cl('b.js: Reboot: default no-op'); };
	this.ConvertDimensions = function() {};

	this.GetSource = function()
	{
		this.TunedSource = 0;
		cl('b.js: HTML5: GetSource: TunedSource[' + this.TunedSource + ']');
	};

	this.SetSource = function(input)
	{
		cl('b.js: HTML5: SetSource to input[' + input + '] NO-OP..');
	};

	this.DashInit = function(url, autoPlay)
	{
		// NOTE: dashjs is always loaded in InitTV for HTML5/chrome
		if (!window.dashjs) {
			cl('b.js: HTML5: DashInit: no dashjs support loaded, cannot play..');
			return;
		}

		if (window.video && video.src) {
			video.pause();
			delete video.src;
		}

		if (window.dashplayer) {
			window.dashplayer.reset();
			window.dashplayer = null;
			delete window.dashplayer;
		}

		window.dashplayer = dashjs.MediaPlayer().create();
		window.dashplayer.initialize(video, url, autoPlay);
		// turn off super-verbose debug
		window.dashplayer.getDebug().setLogToBrowserConsole(false);
		cl('b.js: HTML5: DashInit: url[' + url + '] autoPlay[' + autoPlay + ']');
	};

	this.DashPlay = function(url)
	{
		if (!window.dashjs) {
			cl('b.js: HTML5: DashPlay: no dashjs support loaded, return');
			return;
		}

		if (url && !window.dashplayer) {
			cl('b.js: HTML5: DashPlay: no dashplayer and url set, doing DashInit with autoplay');
			this.DashInit(url, true);
			return;
		}

		window.dashplayer.play();
		cl('b.js: HTML5: DashPlay: done');
	};

	this.DashStop = function()
	{
		if (!window.dashjs) {
			cl('b.js: HTML5: DashStop: no dashjs support loaded, return');
			return;
		}

		if (!window.dashplayer) {
			cl('b.js: HTML5: DashStop: no dashplayer loaded, return');
			return;
		}

		window.dashplayer.reset();

		if (window.video && video.src) {
			video.pause();
			delete video.src;
		}

		window.dashplayer = null;
		delete window.dashplayer;
		cl('b.js: HTML5: DashStop: dash reset complete');
	};

	this.DashPause = function()
	{
		if (!window.dashjs) {
			cl('b.js: HTML5: DashPause: no dashjs support loaded, return');
			return;
		}

		if (!window.dashplayer) {
			cl('b.js: HTML5: DashPause: no dashplayer loaded, return');
			return;
		}

		window.dashplayer.pause();
		cl('b.js: HTML5: DashPause: done');
	};

	this.DashSetPos = function(posSec)
	{
		if (!window.dashjs) {
			cl('b.js: HTML5: DashSetPos: no dashjs support loaded, return');
			return;
		}

		if (!window.dashplayer) {
			cl('b.js: HTML5: DashSetPos: no dashplayer loaded, return');
			return;
		}

		// this is an absolute position in the stream
		// despite what the dash docs say..
		window.dashplayer.seek(posSec);
		cl('b.js: HTML5: DashSetPos: seeked to posSec[' + posSec + ']');
	};

	// HTML5
	this.PlayIPTV = function(opts)
	{
		var settings = $.extend({
			'ip': browser.multicast_ip,
			'port': browser.multicast_port ? browser.multicast_port : config.mc_udp_port,
			'number': null, // RF ch #
			'protocol': browser.iptv_protocol ? browser.iptv_protocol : config.iptv_protocol
		}, opts);

		// same as iptv.js (was config.web_ip which does not/did not ever exist..)
		var web_ip =
			config.mobile_iptv_server_ip ?
			config.mobile_iptv_server_ip :
			location.host; // can use host instead of hostname, no special port logic used here

		// pre-recorded ('canned') .mp4 content
		if (config.mobile_iptv_simulate == 1)
		{
			browser.curIptvUrl = location.protocol + '//' + web_ip + '/content/tv/' + settings.ip + '.mp4';

			cl('b.js: HTML5: PlayIPTV MP4 simulate [' + browser.curIptvUrl + ']');

			if (video) {
				try {
					video.src = browser.curIptvUrl;
					video.load();
					video.play();
				} catch(e) {
					cl('b.js: HTML5: PlayIPTV: ERR[' + e.message + '] e[', e, ']');
				}
			} else {
				cl('b.js: HTML5: PlayIPTV: ERR[no video DOM object]');
			}

			return;
		}

		browser.curIptvUrl = location.protocol + '//' + web_ip + '/dash/master-' + settings.ip + '/live.mpd';

		if (settings.protocol && settings.protocol.match(/(rtp|udp)/)) {
			cl('b.js: HTML5: PlayIPTV [' + settings.protocol + '://' + settings.ip + ':' + settings.port + ']' +
				' NOT SUPPORTED, default to [' + browser.curIptvUrl + ']');
		} else if (settings.protocol && settings.protocol === 'rf') {
			cl('b.js: HTML5: PlayIPTV [rf://' + settings.number + '] NOT SUPPORTED,' +
				' default to [' + browser.curIptvUrl + ']');
		} else {
			cl('b.js: HTML5: PlayIPTV [' + browser.curIptvUrl + ']');
		}

		browser.DashInit(browser.curIptvUrl, true); // true=autoplay
	};

	// HTML5
	this.StopIPTV = function(opts, caller)
	{
		caller = caller || 'not set';

		var settings = $.extend({
			'complete': function(){}
		}, opts);

		cl('b.js: HTML5: StopIPTV: curIptvUrl[' + browser.curIptvUrl + '], caller[' + caller + ']');

		if (browser.curIptvUrl === null) // no iptv to stop!
		{
			settings.complete();
			return;
		}

		if (window.dashplayer)
		{
			browser.DashStop();
		}
		else if (window.video)
		{
			try {
				video.pause();
				// video.src = ''; // can interfere with player.js eventhandler
				delete video.src;
			} catch(e) {
				cl('b.js: HTML5: StopIPTV: ERR[' + e.message + '] e[', e, ']');
			}
		}
		else
		{
			cl('b.js: HTML5: StopIPTV: ERR[no video DOM object or dash object]');
		}

		browser.curIptvUrl = null;

		settings.complete();
	};

	this.PlayBGMedia = function(caller)
	{
		// the config is really a uri
		if (!config.background_media_url || config.background_media_url == 'none')
		{
			cl('b.js: PlayBGMedia [' + caller + ']: configs disabled url[' + config.background_media_url + '], return false..');
			return false;
		}

		if (stores.getIsBootToIptv() || iptv.playing || vodMenuApp.menuType !== 'vod')
		{
			cl('b.js: PlayBGMedia [' + caller + ']: booting to IPTV playing ' + iptv.playing +
				' or wrong menuType [' + vodMenuApp.menuType + '], return false..');

			return false;
		}

		var t = config.background_media_url.indexOf('://');
		var proto = config.background_media_url.substr(0, t);
		var that = this;

		// multicast defaults for audio (hidden)
		var params = {
			'protocol': 'udp', // for samsung
			'visibility': 'hidden',
			'width': 0,
			'height': 0
		};

		// if it's just an IP or udp/igmp (most common)
		if (t == -1 || proto == 'udp' || proto == 'igmp' || proto == 'rtp')
		{
			if (that.curIptvUrl !== null)
			{
				cl('b.js: PlayBGMedia [' + caller + ']: something already playing [' + that.curIptvUrl + '], ignored..');
				return true;
			}

			var host = config.background_media_url;
			if (t > -1) // strip off udp:// or igmp://
			{
				host = config.background_media_url.substr(t + 3, config.background_media_url.length);
			}

			var port = null;
			var host_port_match = host.match(/(\S+):(\d+)/);
			if (host_port_match)
			{
				host = host_port_match[1];
				port = host_port_match[2];
			}

			var playIptvData = {
				ip: host,
				protocol: 'udp' // req. if global protocol is rf..
			};

			if (port !== null)
			{
				playIptvData.port = port;
			}

			cl('b.js: PlayBGMedia [' + caller + ']: multicast host[' + host + '] port[' + port + ']');

			params.complete = function(){
				that.PlayIPTV(playIptvData);
			};
		}
		else // unicast/rtsp/http/vod..
		{
			// 130h doesn't work and LGE needs more work (callbacks etc)
			if (browser.deviceModel === 'a130h' || browser.deviceVendor === 'lge') {
				return false;
			}

			cl('b.js: PlayBGMedia [' + caller + ']: unicast url[' + config.background_media_url + ']');

			// unicast defaults for audio (hidden)
			params = {
				'protocol': 'http', // for samsung
				'visibility': 'hidden',
				'width': 0,
				'height': 0,
				'complete': function(){
					that.Play(config.background_media_url, 0, {'loop': true});
				}
			};
		}

		if (config.background_media_type === 'video')
		{
			// override defaults for video
			vodMenuApp.bgMediaStatus = 'playvideo';
			params.visibility = 'visible';
			params.width = $(window).width(); // cant be 100% as AMI/LGE needs a number
			params.height = $(window).height(); // cant be 100% as AMI/LGE needs a number

			// trialling this for html5/philips..
			$('body').css('background-color', 'transparent');
		}
		else
		{
			vodMenuApp.bgMediaStatus = 'playaudio';
		}

		this.SetVideoWindow(params);
		return true;
	};

	this.PlayWelcomeVideo = function()
	{
		if (!config.welcome_video_url || config.welcome_video_url == 'none')
		{
			cl('b.js: PlayWelcomeVideo: config disabled [' + config.welcome_video_url + ']');
			return false;
		}

		cl('b.js: PlayWelcomeVideo: configs enabled [' + config.welcome_video_url + ']');

		/*
		https://gist.github.com/jlong/2428561

		var p = document.createElement('a');
		p.href = "http://example.com:3000/pathname/file.php?search=foo#hash";

		p.protocol; // => "http:"
		p.hostname; // => "example.com"
		p.port;     // => "3000"
		p.pathname; // => "/pathname/file.php"
		p.search;   // => "?search=foo"
		p.hash;     // => "#hash"
		p.host;     // => "example.com:3000"

		This little trick works great for web protocols (http/https/ftp etc)
		but not so great for non-web ones (igmp/udp/rtp/mp3/etc)

		The .protocol property is OK (if specified) BUT will default to
		http or https if no protocol is specified.

		For non-web protocols, the pathname property contains the remaining
		URI components and others (host/search/hostname/port) will be blank.

		In other words, great for web, fairly useless otherwise
		*/

		var t = config.welcome_video_url.indexOf('://');
		var proto = config.welcome_video_url.substr(0, t);
		var is_ipv4 = config.welcome_video_url.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/);
		var that = this;

		// if it's just an IP or udp/igmp (most common)
		if (is_ipv4 || proto == 'udp' || proto == 'igmp' || proto == 'rtp')
		{
			var host = config.welcome_video_url;

			if (proto == 'udp' || proto == 'igmp' || proto == 'rtp') // extract the IP after '???://'
			{
				host = config.welcome_video_url.substr(
					t + 3, config.welcome_video_url.length
				);
			}

			this.multicast_ip = host;
			this.SetVideoWindow({
				'protocol': 'udp', // for samsung...
				'top': 110,
				'left': 280,
				'width': 720,
				'height': 404,
				'box-shadow': '0 0 10px 2px #111',
				'z-index': 970,
				'complete': function(){
					that.PlayIPTV();
				}
			});
		}
		else // filename.mp[4g]/unicast/rtsp/http/vod..
		{
			// we can't have rtsp:// or http[s]:// as it's too device specific..
			// so strip it off to get the filename..
			if (config.welcome_video_url.match(/^https*:|^rtsp:/))
			{
				// Grab the filename, add the .mpg extension if RTSP..
				if (config.welcome_video_url.indexOf('rtsp:') > -1)
				{
					config.welcome_video_url =
						basename(config.welcome_video_url) + '.mpg';
				}
				else // http or https
				{
					var p = document.createElement('a');
					p.href = config.welcome_video_url;
					config.welcome_video_url = p.pathname;
				}
			}

			var server_ip =
				config.use_server_addr_ip == 1 ?
				location.hostname :
				config.video_server_ip;

			// if it doesn't start with a path, we assume it's a filename
			// for http only devices (all but moto/ami)
			// but we need to make an assumption about the http path name
			var default_path = '/content/other/';
			if (config.welcome_video_url.indexOf('/') === 0)
			{
				default_path = ''; // we've already got a path..
			}

			if ($.inArray('http:', browser.deviceVideoProtocols) > -1)
			{
				config.welcome_video_url =
					location.protocol + '//' + server_ip +
					default_path +
					config.welcome_video_url;
			}
			else
			{
				// if it doesn't support http it must be rtsp only device..
				// we assume wherever the file is located will be accessible to
				// vidserver (e.g. /content/other, /content1/hotel_videos, etc)
				if (config.welcome_video_url.indexOf('/') === 0)
				{
					config.welcome_video_url = basename(config.welcome_video_url);
				}

				config.welcome_video_url =
					config.welcome_video_url.replace(/\.mp[g4]/, ''); // remove ext for rtsp

				config.welcome_video_url =
					'rtsp://' +
					server_ip + ':' +
					config.video_server_port + '/' +
					config.welcome_video_url;
			}

			this.SetVideoWindow({
				'top': 110,
				'left': 280,
				'width': 720,
				'height': 404,
				'box-shadow': '0 0 10px 2px #111',
				'z-index': 970,
				'complete': function(){
					that.Play(config.welcome_video_url, 0, {'loop': true});
				}
			});
		}
		return true;
	};

	// for now, this is core video ops ONLY
	// mostly for input select / other cases where
	// we want the 'core' video window to be full screen
	this.ResizeVideoWindow = function(x, y, w, h, complete) // left,top,width,height
	{
		x = x || 0;
		y = y || 0;
		w = w || $(window).width();
		h = h || $(window).height();
		complete = complete || function(){};

		$('#broadcast').css({
			'left'   : x + 'px',
			'top'    : y + 'px',
			'width'  : w + 'px',
			'height' : h + 'px'
		});

		complete();
	};

	// HTML5 / PHI2K14 / MOTOROLA only
	this.SetVideoWindow = function(opts)
	{
		// cl('b.js: HTML5 / PHI2K14 / MOTOROLA only set video window');
		// Note: context buttons have zindex of 950
		// The 'videoid' gives the illusion more than one video window can
		// be setup but we are a long way from this capability..
		var settings = $.extend({
			'videoid'          : 'video',
			'container'        : 'body', // where to put the wrapper (not the video object), e.g. body, dbcontent, etc
			'protocol'         : 'http',
			'position'         : 'fixed',
			'visibility'       : 'visible',
			'display'          : 'block',
			'z-index'          : -1, // good default for iptv/ss modes, play/info require >= 500
			'left'             : 0,
			'top'              : 0,
			'width'            : '100%',
			'height'           : '100%',
			'box-shadow'       : 'none',
			'border'           : 'none',
			'border-radius'    : 0,
			'background-color' : '#000',
			'show_hide'        : null,
			'remove'           : false,
			'delay'            : 0,
			'video_mimeType'   : 'video/mp4',
			'complete'         : function(){}
		}, opts);

		var that = this;
		var v_el = '#' + settings.videoid + ', #broadcast';
		var mode = 'unicast';
		var video_wrap = '#player_wrap';

		if ($.inArray(settings.protocol, ['udp', 'rtp', 'rf']) > -1) {
			mode = 'multicast';
			video_wrap = '#multicast_wrap'; // no default OSD
		}

		if (settings.remove) {
			cl('b.js: DEFAULT: SVW: remove!');
			$(v_el).remove();
			$('#player_wrap, #multicast_wrap').remove();
			video = null;
			broadcast = null;
			return;
		}

		cl('b.js: DEFAULT: SVW: ' +
			'mode[' + mode + '] ' +
			'p[' + settings.protocol + '] ' +
			'el[' + v_el + '] ' +
			'wrap[' + video_wrap + '] ' +
			'sh[' + settings.show_hide + ']');

		var fn = function()
		{
			// show/hide toggle with no other ops (to replace old VideoShow/VideoHide)
			// NOTE: this only makes sense if the element already exists and has been
			// setup with the initial desired parameters.

			if (settings.show_hide)
			{
				$(v_el).css({
					'visibility': settings.show_hide === 'show' ? 'visible' : 'hidden'
				});

				return;
			}

			var setstyles = function()
			{
				cl('b.js: DEFAULT: SVW: addClass, setstyles for vendor [' + browser.deviceVendor + ']');

				$(video_wrap).addClass(browser.deviceVendor).css({
					'position'         : settings.position,
					'visibility'       : settings.visibility,
					'display'          : settings.display,
					'left'             : settings.left,
					'top'              : settings.top,
					'width'            : settings.width,
					'height'           : settings.height,
					'border'           : settings.border,
					'z-index'          : settings['z-index'],
					'box-shadow'       : settings['box-shadow'],
					'border-radius'    : settings['border-radius'],
					'background-color' : settings['background-color']
				});

				if (browser.deviceVendor === 'philips_2k14' && $('#broadcast').length) {
					// we do this for cases where the video is already playing on the same channel
					// and all we want to do is resize the window.. normally #broadcast was 100% w/h
					// and resided inside the wrapper and we just set the wrapper w/h.. but for some
					// reason this doesn't always work properly so we need to size both the wrapper and
					// #broadcast objects..  When you change channels this happens in PlayIPTV
					// but when you just want to resize without changing channels
					// (e.g. info.js windowed<->fullscreen toggle) we need to do this..

					cl('b.js: DEFAULT: SVW: set_broadcast css for PHI2K14 #broadcast');

					$('#broadcast').css({
						'position'   : settings.position,
						'visibility' : settings.visibility,
						'display'    : settings.display,
						'left'       : settings.left,
						'top'        : settings.top,
						'width'      : settings.width,
						'height'     : settings.height
					});
				} else if (browser.deviceVendor === 'sstizen') {
					// we do this for cases where the video is already playing on the same channel
					// and all we want to do is resize the window (i.e. info.js)
					var dm = that.ConvertDimensions(
						'http',
						settings.left,
						settings.top,
						settings.width,
						settings.height
					);

					cl('b.js: DEFAULT: SVW: sstizen call setDisplayRect('+dm.x+', '+dm.y+', '+dm.w+', '+dm.h+')');

					// Tizen <= 2.3 does not like this for init case..
					try {
						if (webapis.avplay.getState() === 'PLAYING') {
							webapis.avplay.setDisplayRect(dm.x, dm.y, dm.w, dm.h);
						}
					} catch (e) {
						cl('b.js: DEFAULT: SVW: setDisplayRect JS exception [' + e.name + ':' + e.message + ']');
					}
				}
			};

			if (settings.delay) {
				setTimeout(function()
				{
					setstyles();
					settings.complete();
				}, settings.delay);
			} else {
				setstyles();
				settings.complete();
			}
		};

		if (!$(video_wrap).length) {
			var video_html = '';

			switch (browser.deviceVendor) {
				case 'sstizen':
					video_html = '<object id="' + settings.videoid + '" type="application/avplayer"></object>';
					break;

				case 'philips_2k14':
					video_html = '<object id="' + settings.videoid + '" type="' + settings.video_mimeType + '"></object>';
					break;

				case 'exterity':
					video_html = '<img id="' + settings.videoid + '" src="tv:" />';
					break;

				case 'motorola':
					// videoplane tag is for ver <= 4.6
					// video_html = '<videoplane id="videoplane"><video id="' + settings.videoid + '" src="toi://"></video></videoplane>';
					video_html = '<video id="' + settings.videoid + '" src="toi://"></video>';
					break;

				default:
					video_html = '<video id="' + settings.videoid + '" type="' + settings.video_mimeType + '">No HTML5 video</video>';
					break;
			}

			if (mode === 'multicast') {
				$('#player_wrap').remove(); // remove unicast wrap if any

				// linear philips..
				if (browser.deviceVendor === 'philips_2k14') {
					$(settings.container).append(
						'<div id="multicast_wrap">' +
						'<object id="broadcast" type="video/broadcast"></object>' +
						'</div>'
					);

					cl('b.js: SVW: PHI2K14: setup broadcast object for multicast mode');
					broadcast = document.getElementById('broadcast');
				} else {
					// linear non-philips devices (moto/html5)
					$(settings.container).append(
						'<div id="multicast_wrap">' + video_html + '</div>'
					);

					video = document.getElementById(settings.videoid);
				}

				fn();
			} else { // non-multicast
				// prefix not required
				$('#multicast_wrap').remove(); // remove multicast wrap if any
				$(settings.container).append(iptvTemplates.getPlayerHtml());
				// #player_wrap div is built in getPlayerHtml()
				$('#player_wrap').append(video_html);
				video = document.getElementById(settings.videoid);

				fn();
			}
		}
		else // video_wrap already found, just set the style..
		{
			fn();
		}
	};

	// defaults for emulating in chrome
	// overriden by devices (and/or DB)
	this.inputArray = [
		'MENU',
		'TV'
	];

	this.inputArrayLabels = [
		'MENU',
		'TV'
	];

	this.deviceSources = {
		MENU    : 1,
		TV      : 2
	};

	// Common for all devices..
	this.InputSelect = function ()
	{
		var that = this;
		cl('b.js: InputSelect: init');

		var InputReset = function ()
		{
			// we do resetToStart() instead of reset() in case 'IPTV only' mode is set
			menuPageController.resetToStart();
		};

		if (that.deviceVendor === 'samsung') {
			InputReset = function ()
			{
				if (that.TunedSource != that.deviceSources.HTV) {
					that.SetSource(that.deviceSources.HTV);
				}

				// we do resetToStart() instead of reset() in case 'IPTV only' mode is set
				menuPageController.resetToStart();
			};
		}

		var $inputSelect = $('#inputselect');

		if ($inputSelect.is(':hidden')) {
			cl('b.js: InputSelect: is hidden, call GetSource then build and show #inputselect');

			that.GetSource(); // sets that.TunedSource
			that.curInputFound = false;

			$inputSelect.empty();

			$.each(that.inputArray, function(idx)
			{
				$('#inputselect').append(
					'<div id="input_' + idx + '">' +
						that.inputArrayLabels[idx] +
					'</div>'
				);
			});

			$inputSelect.show(0);

			setTimeout(function()
			{
				for (var x = 0; x < that.inputArray.length; x++) {
					if (that.deviceSources[that.inputArray[x]] == that.TunedSource) {
						that.curInputSel = x;
						that.curInputFound = true;
					}
				}

				if (!that.curInputFound) {
					cl('b.js: InputSelect: curInputFound[1] FALSE, setting defaults..');
					that.curInputSel = 0;
					that.curInputFound = true;
				}

				$inputSelect.find('#input_' + that.curInputSel).addClass('highlight');
			}, 500);

			var promptProcessKeys = function promptProcessKeys()
			{
				base_Keys.call(this);
			};

			promptProcessKeys.prototype = Object.create(base_Keys.prototype);
			promptProcessKeys.prototype.constructor = promptProcessKeys;

			var promptKeyAction = new promptProcessKeys();

			promptProcessKeys.prototype.keyChannelUp = function(){};
			promptProcessKeys.prototype.keyChannelDown = function(){};
			promptProcessKeys.prototype.keyTv = function(){};

			promptProcessKeys.prototype.keyBlue = function()
			{
				InputReset();
			};

			promptProcessKeys.prototype.keyInput = function()
			{
				var $inputselect = $('#inputselect');
				// This key will take over until reset (Menu input select or menu/blue key)
				if ($inputselect.is(':visible')) {
					$inputselect.hide();
					menuPageController.restoreKeyHandlers('pre_keyinput');
				} else {
					that.GetSource(); // sets that.TunedSource
					that.curInputFound = false;

					$inputselect.show();
					$inputselect.find('div').show().removeClass('highlight');

					setTimeout(function()
					{
						for (var x = 0; x < that.inputArray.length; x++) {
							if (that.deviceSources[that.inputArray[x]] == that.TunedSource) {
								that.curInputSel = x;
								that.curInputFound = true;
							}
						}

						if (!that.curInputFound) {
							cl('b.js: curInputFound[2] FALSE, setting defaults..');
							that.curInputSel = 0;
							that.curInputFound = true;
						}

						$inputselect.find('#input_' + that.curInputSel).addClass('highlight');
					}, 500);
				}
			};

			promptProcessKeys.prototype.keyDown = function()
			{
				if (!that.curInputFound) {
					return;
				}

				if ($('#inputselect').is(':hidden')) {
					return;
				}

				$('#inputselect div#input_' + that.curInputSel)
					.removeClass('highlight');

				that.curInputSel =
					(that.curInputSel < that.inputArray.length - 1) ?
					that.curInputSel + 1 :
					0;

				$('#inputselect div#input_' + that.curInputSel)
					.addClass('highlight');
			};

			promptProcessKeys.prototype.keyUp = function()
			{
				if (!that.curInputFound) {
					return;
				}

				if ($('#inputselect').is(':hidden')) {
					return;
				}

				$('#inputselect div#input_' + that.curInputSel)
					.removeClass('highlight');

				that.curInputSel =
					(that.curInputSel === 0) ?
					that.curInputSel = that.inputArray.length - 1 :
					that.curInputSel - 1;

				$('#inputselect div#input_' + that.curInputSel)
					.addClass('highlight');
			};

			promptProcessKeys.prototype.keyEnter = function()
			{
				if (!that.curInputFound) {
					return;
				}

				if ($('#inputselect').is(':hidden')) {
					return;
				}

				// can't have the SS start while on an input..
				// this will be reset by going home, or input->tv or input->menu
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				cl('b.js: InputSelect: keyEnter: input[' + that.inputArray[that.curInputSel] + '] idx[' + that.curInputSel + ']');

				var showSelectedInputBox = function()
				{
					if ($('#inputselect_current').length) {
						clearTimeout(that.inputSelTimer);
						$('#inputselect_current').html(that.inputArray[that.curInputSel]);
					} else {
						$('body').append(
							'<div style="display:none" id="inputselect_current">' +
								that.inputArray[that.curInputSel] +
							'</div>'
						);
					}

					$('#inputselect_current').show(1000);

					that.inputSelTimer = setTimeout(function()
					{
						$('#inputselect_current').fadeOut(function()
						{
							$(this).remove();
						});
					}, 6000);
				};

				if (that.inputArray[that.curInputSel] === 'TV') { // IPTV override
					$('#inputselect').hide(0);

					if (that.deviceVendor === 'samsung' && that.TunedSource != that.deviceSources.HTV) {
						that.SetSource(that.deviceSources.HTV);
					}

					if (that.deviceVendor === 'sstizen' && that.TunedSource != that.deviceSources.TV1) {
						that.SetSource(that.deviceSources.TV1, 'NO_WINDOW_SHOW');
					}

					// do this regardless if already in IPTV mode or not
					// this avoids us having to re-show all the divs we hid..
					var params = '';

					if (iptv.playing && iptv.settings.blockmenu) {
						params += '&blockmenu=1';
					}

					menuPageController.switchIptv(params);
					showSelectedInputBox();

					return;
				}

				if (that.inputArray[that.curInputSel] === 'MENU') {
					if (iptv.playing) {
						if (iptv.settings.blockmenu) {
							$('#tvConnectingMsg')
								.html('<span class="translate-me">Menu is currently blocked</span>')
								.vodtranslate()
								.show();

							setTimeout(function()
							{
								$('#tvConnectingMsg')
									.hide()
									.html('<span class="translate-me">Connecting to channel</span>')
									.vodtranslate();
							}, 4000);
						} else { // not blocked..
							iptv.stop({
								'complete': function()
								{
									iptv.cleanup();
									// #VOD-387# - conditionally page reload or launch main menu
									$('#inputselect').hide();
									setTimeout(iptv.launchMenu, 1);
									showSelectedInputBox();
								}
							});
						}
					} else { // iptv not playing
						InputReset();
					}
					return;
				}

				var stop_iptv_input = function(callback)
				{
					if (typeof callback !== 'function') {
						callback = function(){};
					}

					if (iptv.playing) {
						iptv.stop({
							'complete': function()
							{
								iptv.cleanup();

								if (that.deviceVendor === 'samsung' && that.TunedSource != that.deviceSources.HTV) {
									that.SetSource(that.deviceSources.HTV);
								}

								if (that.deviceVendor === 'sstizen' && that.TunedSource != that.deviceSources.TV1) {
									that.SetSource(that.deviceSources.TV1, 'NO_WINDOW_SHOW');
								}

								callback();
							}
						});
					} else {
						callback();
					}

					showSelectedInputBox();
				};

				// handle special cases where we don't want to do 'SetSource(id)'
				switch (that.inputArray[that.curInputSel]) {
					case 'MIRACAST':
						stop_iptv_input(function(){
							browser.InitDeviceMedia();
						});
						return;

					case 'MEDIA': // USB
						stop_iptv_input(function(){
							browser.InitDeviceUsb();
						});
						return;

					case 'HDMI': // HDMI
						stop_iptv_input(function(){
							browser.InitDeviceHDMI();
						});
						return;

					case 'APP': // default app for device (e.g. BT music or Youtube)
						stop_iptv_input(function(){
							browser.InitDeviceApp();
						});
						return;
				}

				that.SetupDomForInputSelect();

				try {
					// set video to full screen..
					if (browser.deviceVendor !== 'sstizen') {
						// Tizen does it's TV window differently..
						that.ResizeVideoWindow(); // defaults: full-screen
					}

					if (iptv.playing) {
						cl('b.js: InputSelect: iptv is playing, stop..');
						iptv.stop({
							'complete': function()
							{
								cl('b.js: InputSelect: cleaned and SetSource('+that.deviceSources[that.inputArray[that.curInputSel]]+')');
								iptv.cleanup();
								that.SetSource(that.deviceSources[that.inputArray[that.curInputSel]]);
							}
						});
					} else {
						cl('b.js: InputSelect: iptv not playing, SetSource('+that.deviceSources[that.inputArray[that.curInputSel]]+')');
						that.SetSource(that.deviceSources[that.inputArray[that.curInputSel]]);
					}
				} catch(e) {
					cl('b.js: InputSelect: JS exception [' + e.name + ':' + e.message + ']');
					// we do resetToStart() instead of reset() in case 'IPTV only' mode is set
					menuPageController.resetToStart(); // better than full lockup!
				}

				showSelectedInputBox();
			}; // end of 'keyEnter' fn

			currentKeyAction = promptKeyAction;
		} else {
			cl('b.js: InputSelect: on screen, no-op..');
		}
	};

	this.SetupDomForInputSelect = function()
	{
		$('body, #pageload').css({
			'background-color': 'transparent',
			'background-image': 'none'
		});

		if (this.deviceVendor === 'lge') {
			$('body, #pageload').css('background-image', 'url(tv:)');
		}

		if (config.scrolling_background == 1) {
			$.vegas('stop');
		}

		$('.vegas-background').hide(0);

		//$('#pluginSEF').appendTo('body');

		$('#pluginSEF, #pluginWindow')
			.appendTo('body')
			.css({
				'position': 'absolute',
				'top': 0,
				'left': 0,
				'width': '100%',
				'height': '100%',
				'visibility': 'visible',
				'z-index': '-1'
			});

		// The hide below can have perilous impact on certain plugins within div containers, hence the
		// move (appendTo) above.  It might be best to move this below SetSource or think of an alt sol.
		$('div').not('#inputselect_current, #debug, #multicast_wrap, #pluginSEF, #pluginWindow').hide(0);
	};

	//
	// end input select defaults
	//

	// DEFAULT

	this.InitDeviceHDMI = function()
	{
		var dev =
			this.deviceVendor == this.deviceModel ?
				this.deviceVendor :
				this.deviceVendor + ': ' + this.deviceModel;

		prompt('<span class="translate-me">Not supported on this device</span> [' + dev + ']');
	};

	this.InitDeviceMedia = function()
	{
		var dev =
			this.deviceVendor == this.deviceModel ?
			this.deviceVendor :
			this.deviceVendor + ': ' + this.deviceModel;

		prompt('<span class="translate-me">Not supported on this device</span> [' + dev + ']');
	};

	this.InitDeviceUsb = function()
	{
		var dev =
			this.deviceVendor == this.deviceModel ?
			this.deviceVendor :
			this.deviceVendor + ': ' + this.deviceModel;

		prompt('<span class="translate-me">Not supported on this device</span> [' + dev + ']');
	};

	this.InitDeviceApp = function()
	{
		var dev =
			this.deviceVendor == this.deviceModel ?
			this.deviceVendor :
			this.deviceVendor + ': ' + this.deviceModel;

		prompt('<span class="translate-me">Not supported on this device</span> [' + dev + ']');
	};

	this.GetLocation = function(callback)
	{
		callback = callback || function(){};

		var geturl = window.menuUrlPrefix +
			'/api/location/no_visit/hw_id=' + this.GetMacAddress();

		// prefix done
		$.get(geturl, function(res)
		{
			if (res.result !== 'success')
			{
				cl('b.js: GetLocation: /api/location/no_visit: failed [' + res.description + ']');
				callback();
				return;
			}

			if (!res.data.length)
			{
				cl('b.js: GetLocation: /api/location/no_visit: no location for this mac');
				callback();
				return;
			}

			cl('b.js: GetLocation OK: [' + res.data[0].location + ']');
			callback(res.data[0].location);
		}, 'json')
		.fail(function()
		{
			cl('b.js: GetLocation: /api/location/no_visit: call failed..');
			callback();
		});
	};

	this.ShowSoftAPWidget = function(wifi)
	{
		wifi = wifi || {};

		cl('b.js: ShowSoftAPWidget: wifi:' +
			' enabled[' + wifi.enabled + ']' +
			' ssid[' + wifi.ssid + ']' +
			' key[' + wifi.key + ']');

		var $widgetwrap = $('#widgetwrap');

		if ($widgetwrap.length) {
			if ($widgetwrap.is(':hidden')) {
				$widgetwrap.show();
			}

			var $wifiinfo = $widgetwrap.find('#wifiinfo');
			$wifiinfo.html(
				'<table>' +
					'<tr>' +
						'<td>WiFi Enabled &nbsp;</td>' +
						'<td>' + (wifi.ssid == '1' ? 'Error' : wifi.enabled) + '</td>' +
					'</tr>' +
					'<tr>' +
						'<td>WiFi Name &nbsp;</td>' +
						'<td>' + (wifi.ssid == '1' ? 'Error' : wifi.ssid) + '</td>' +
					'</tr>' +
					'<tr>' +
						'<td>WiFi Key &nbsp;</td>' +
						'<td>' + (wifi.key == '1' ? 'Error' : wifi.key) + '</td>' +
					'</tr>' +
				'</table>'
			).show(1000);

			// remove on error..
			if ($wifiinfo.html().toLowerCase().indexOf('error') > -1) {
				cl('b.js: ShowSoftAPWidget: WARN: error string in html, empty and hide');
				$wifiinfo.empty().hide();
			}
		} else {
			cl('b.js: ShowSoftAPWidget: WARN: #widgetwrap element not found, not showing anything..');
		}
	};

	// SSTIZEN / SAMSUNG Shared
	this.onWindowFocusSamsung = function()
	{
		cl('b.js: onWindowFocusSamsung init');

		var that = this;

		// the timeouts prevent quick double/triple calls..
		if (this.timers.onWindowFocus) {
			clearTimeout(this.timers.onWindowFocus);
		}

		this.timers.onWindowFocus = setTimeout(function()
		{
			if (iptv.playing)
			{
				// this is one option (reconnect IPTV)
				/*
				iptv.hash = '';  // this will force a channel plan update
				iptv.initchannels(null);
				*/

				// otherwise, just load the menu

				setTimeout(function() {
					// we do resetToStart() instead of reset() in case 'IPTV only' mode is set
					menuPageController.resetToStart();
				}, 200);

				// just in case it doesn't load the first time..
				setTimeout(function() {
					// we do resetToStart() instead of reset() in case 'IPTV only' mode is set
					menuPageController.resetToStart();
				}, 5000);

				cl('b.js: onWindowFocusSamsung: iptv.playing true, resetToStart..');
				return;
			}

			if (vodMenuApp.screensaver.isScreenSaverOn())
			{
				setTimeout(function() {
					menuPageController.reset('from=ss_virtual_standby1');
				}, 200);

				setTimeout(function() {
					menuPageController.reset('from=ss_virtual_standby2');
				}, 5000);

				cl('b.js: onWindowFocusSamsung: screensaver playing, reset..');
				return;
			}

			if (player.playing)
			{
				setTimeout(function() {
					menuPageController.reset('from=player_virtual_standby1');
				}, 200);

				setTimeout(function() {
					menuPageController.reset('from=player_virtual_standby2');
				}, 5000);

				cl('b.js: onWindowFocusSamsung: playing playing, reset..');
				return;
			}

			// only reregister keys if not redirecting, otherwise this happens on full page refresh/UI init..
			cl('b.js: onWindowFocusSamsung: nothing active, do registerkeys and re-enable softap if required');
			that.RegisterKeys();

			// if returning from screen mirror..
			if (config.device_softap == 1)
			{
				that.SoftAPControl({
					action: 'enable',
					show_widget: false,
					caller: 'onWindowFocusSamsung'
				});
			}
		}, 1500);
	};

	this.philips_tempAvSource = null;

	switch (this.deviceVendor)
	{
		/*****************************************************************
		* Amino
		*****************************************************************/
		case 'amino':
		{
			this.InitTV = function(_opts)
			{
				var opts = $.extend({
					complete: function(){},
					mode: 'menu' // other is 'signage'
				}, _opts);

				if (this.tvInitialised) {
					cl('b.js: AMI: InitTV: already initialised, return..');
					return;
				}

				try { Browser.SetToolbarState(0);      } catch(e) {}
				try { ASTB.SetMouseState(0);           } catch(e) {}
				try { VideoDisplay.SetAlphaLevel(100); } catch(e) {}
				try { ASTB.DefaultKeys(0);             } catch(e) {}
				try { ASTB.WithChannels(0);            } catch(e) {}
				try { ASTB.SetLEDState('LEFT', 0);     } catch(e) {}
				try { Browser.SpatialNavigation(0);    } catch(e) {}

				// We clear the history to avoid the browser back issue with TPS RF remote 'INFO' key..
				try { ASTB.DeleteAllHistory(); } catch(e) {}

				// Required for BG media (cross page transitions don't stop media)
				try { VideoDisplay.DefaultUnloadVideo(0); } catch(e) {}
				try { VideoDisplay.UnloadVideo(0); } catch(e) {}

				config.stb_volume_level = config.stb_volume_level || 100;

				try { AudioControl.SetMaxVolume(config.stb_volume_level); } catch(e) {}
				try { AudioControl.SetMinVolume(config.stb_volume_level); } catch(e) {}

				// for some unknown reason, it only worked properly when doing it twice..
				try { AudioControl.SetMaxVolume(config.stb_volume_level); } catch(e) {}
				try { AudioControl.SetMinVolume(config.stb_volume_level); } catch(e) {}

				try { AudioControl.SetDefaultVolume(config.stb_volume_level); } catch(e) {}

				// if coming from other pages where it may be set internally..
				AVMedia.onEvent = null;

				// Amino event handler
				if (this.deviceModel == 'a130h') // note: 140 uses websockets
				{
					cl('b.js: AMI: 130H Setup AminoGeneric.onEvent2');
					try {
						AminoGeneric.onEvent2 = 'vodAminoEvent';
					} catch(e) {
						cl('b.js: AMI: 130H Error with AminoGeneric.onEvent2 err[' + e.message + ']');
					}
				}

				if (this.deviceModel == 'a140h' || this.deviceModel == 'a150h')
				{
					var NetManDevList = NetMan.deviceList.split(',');

					for (var i = 0; i < NetManDevList.length; i++)
					{
						if (NetManDevList[i] == 'ce00')
						{
							NetMan.selectedDevice = 'ce00';
						}
					}

					if (NetMan.selectedDevice == 'ce00')
					{
						cl('b.js: InitTV: AMI 140: WiFi adapter detected, monitoring network events, ' +
							'nmdevlist[' + NetMan.deviceList + ']' +
							'nmdevstat[' + NetMan.deviceStatus + ']' +
							'nmdevip[' + NetMan.deviceIP + ']');

						NetMan.onEvent = 'amino_processNetManEvent()'; // in device/amino.js (just prints..)

						setInterval(function()
						{
							//cl('b.js: nmdevstat[' + NetMan.deviceStatus + '], nmdevip[' + NetMan.deviceIP + ']');
							if (NetMan.deviceStatus != 'Ready' && NetMan.deviceStatus != 'LinkUp')
							{
								cl('b.js: AMI 140: device status is bad, performing wapConnect!');
								NetMan.wapConnect();
							}
						}, 65000);
					}
					else
					{
						cl('b.js: AMI Hx4x/Hx5x: No WiFi adapter detected, not monitoring network events');
					}
				}

				this.tvInitialised = true;

				cl('b.js: AMI: InitTV complete, pre-TVI');

				// skip TVI commands if not enabled
				// Also, 150 doesn't seem to include TVI commands but this may just be
				// a firmware build specific issue..
				if (config.amino_tvi_enabled != 1 || this.deviceModel == 'a150h')
				{
					opts.complete();
					return;
				}

				switch (this.tvType)
				{
					case 'hdmi_cec':
					{
						// nothing needed during init for HDMI-CEC
					} break;

					case 'smartport':
					{
						try {
							TVI.SetTvType(TV_TYPE.TVITYPE_PHILIPS);
							cl('b.js: AMI: TVI.SetTvType(TV_TYPE.TVITYPE_PHILIPS) done');
						} catch (e) {
							cl('b.js: AMI: TVI.SetTvType(TV_TYPE.TVITYPE_PHILIPS) ERR[' + e.message + ']');
						}
					} break;

					case 'serialexpress':
					{
						try {
							TVI.onEvent = 'aminoSxpTVIEvent();'; // in '/common/js/vod/functions.js'
							TVI.SetTvType(TV_TYPE.TVITYPE_GENERIC);
							// 38400 8n1, 50ms, binary mode...
							TVI.Setup(5, 1, 0, 0, 5, 1);
						} catch (e) {}
						cl('b.js: AMI: TVI.SetTvType(TV_TYPE.TVITYPE_GENERIC) done');
					} break;

					default:
					{
						try {
							TVI.SetTvType(TV_TYPE.TVITYPE_LG);
						} catch (e) {}
						cl('b.js: AMI: TVI.SetTvType(TV_TYPE.TVITYPE_LG) -default- done');
					} break;
				}

				opts.complete();
				cl('b.js: AMI: InitTV complete, TVI enabled..');
			};

			// AMINO
			this.BroadcastStop = function(opts)
			{
				cl('b.js: AMI: BroadcastStop');
				opts.complete = opts.complete || function(){};
				opts.complete();
			};

			// AMINO
			this.GetMacAddress = function()
			{
				return ASTB.GetMacAddress();
			};

			// AMINO
			this.Pause = function()
			{
				AVMedia.SetSpeed(0);
			};

			// AMINO
			this.Continue = function()
			{
				AVMedia.SetSpeed(1);
			};

			// AMINO
			this.GetDuration = function()
			{
				return AVMedia.GetDuration();
			};

			// AMINO
			this.PlayEventLoop = function ()
			{
				var videoStatus = AVMedia.Event;
				var optsString = ';offset=0;avsyncwait=no;type=VOD;servertype=ncube';

				switch (videoStatus)
				{
					case 6: // playing..
					{
						// user should not be able to navigate until the video starts
						//cl('b.js: ami play event[' + videoStatus + '] playing.. clear ignoreKeyUntil in 500ms..');
						setTimeout(function() {
							vodMenuApp.menuHelpers.enableKeyControl();
						}, 500);
					} break;

					case 8: case 90: // EOS
					{
						AVMedia.Kill();
						AVMedia.Play('src=' + browser.curVideoUrl + optsString);
					} break;

					case 10: // timeout
					case 16: // udp timeout
					case 93: case 94: // fail, died
					{
						cl('b.js: ami play event[' + videoStatus + '] fail/died, restart..');
						AVMedia.Kill();
						AVMedia.Play('src=' + browser.curVideoUrl + optsString);
					} break;
				}
			};

			// AMINO
			this.Play = function(url, offset, opts)
			{
				var settings = $.extend({
					'loop': false,
					'avsyncwait': 'no',
					'type': 'VOD',
					'servertype': 'ncube'
				}, opts);

				if (url.indexOf('rtsp:') === 0) { // starts with rtsp:
					if (!url.match(/^rtsp:\/\/.*?\/\/.*/)) {
						// doesn't match amino's wacky format, make it so..
						var result = /^rtsp:\/\/(.*?)\/(.*)$/.exec(url);
						var host_port = result[1];
						var path = result[2];
						cl('b.js: AMI: PLAY: converted raw url[' + url + '] to ami format');
						url = 'rtsp://' + host_port + '//' + host_port + '/' + path;
					}
				}

				if (url.match(/\.m3u8$/)) {
					settings.servertype = 'hls';
				} else if (url.match(/\.mpd$/)) {
					settings.servertype = 'dash';
				} else if (url.match(/\.mp4$/)) {
					// not relevant when playing http/mp4
					delete settings.servertype;
					delete settings.type;
				}

				var optsString = '';
				for (var option in settings) {
					// non-amino options, don't pass them to the API
					if (option === 'loop') {
						continue;
					}
					if (option === 'left' || option === 'top') {
						continue;
					}
					if (option === 'width' || option === 'height') {
						continue;
					}
					optsString += ';' + option + '=' + settings[option];
				}

				browser.curVideoUrl = url;

				if (settings.loop) {
					AVMedia.onEvent = 'browser.PlayEventLoop();';
				}

				cl('b.js: AMI: PLAY: url[' + url + ';offset=' + offset + optsString + '], loop[' + settings.loop + ']');
				AVMedia.Play('src=' + url + ';offset=' + offset + optsString);
			};

			// AMINO
			this.GetPos = function(complete)
			{
				complete = complete || function(){};
				var pos = parseInt(AVMedia.GetPos(), 10);
				cl('b.js: AMI: GetPos: pos[' + pos + ']');
				complete(pos);
			};

			// AMINO
			this.SetPos = function(seconds)
			{
				cl('b.js: AMI: SetPos: seconds[' + seconds + ']');
				AVMedia.SetPos(seconds);
			};

			// AMINO
			this.Stop = function(opts)
			{
				// dont use this or that here
				cl('b.js: AMI: Stop: curVideoUrl[' + browser.curVideoUrl + ']');

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				if (browser.curVideoUrl === null) // nothing to stop!
				{
					settings.complete();
					return;
				}

				browser.curVideoUrl = null;

				AVMedia.Kill();
				AVMedia.onEvent = null;
				settings.complete();
			};

			// AMINO
			// 'core' videowindow only..
			this.ResizeVideoWindow = function(x, y, w, h, complete) // left,top,width,height
			{
				x = x || 0;
				y = y || 0;
				w = w || $(window).width();
				h = h || $(window).height();
				complete = complete || function(){};

				x = parseInt(x.toString().replace('px', ''), 10);
				y = parseInt(y.toString().replace('px', ''), 10);
				w = parseInt(w.toString().replace('px', ''), 10);
				h = parseInt(h.toString().replace('px', ''), 10);

				try {
					SetPIG2(y, x, w, h);
				} catch(e) {
					cl('b.js: AMI: ERROR: SetPIG2():' + e.message);
				}

				complete();
			};

			// AMINO
			this.SetVideoWindow = function(opts)
			{
				cl('b.js: amino set video window');
				var that = this;
				var settings = $.extend({
					'container'        : 'body', // where to put the wrapper (not the video object), e.g. body, dbcontent, etc
					'protocol'         : 'http',
					'position'         : 'fixed', // use 'static' if relative to the container
					'visibility'       : 'visible',
					'display'          : 'block',
					'z-index'          : -1, // good default for iptv/ss modes, play/info require >= 500
					'left'             : 0,
					'top'              : 0,
					'width'            : $(window).width(),
					'height'           : $(window).height(),
					'box-shadow'       : 'none',
					'border'           : 'none',
					'border-radius'    : 0,
					'background-color' : '#111111',
					'show_hide'        : null, // show hide is really just a 'go black screen / return from black screen'
					'remove'           : false,
					'complete'         : function(){}
				}, opts);

				// IMPORTANT: no videoid.  this is because 'videoid' is really just the wrapper to put
				// alpha blended video on top of, instead of using a '<video>' DOM object/element.

				var mode = 'unicast';
				var video_wrap = '#player_wrap';

				if ($.inArray(settings.protocol, ['udp', 'rtp', 'rf']) > -1)
				{
					mode = 'multicast';
					video_wrap = '#multicast_wrap'; // no default OSD
				}

				if (settings.remove)
				{
					cl('b.js: AMI: SVW: remove!');
					$('#player_wrap, #multicast_wrap').remove();
					video = null;
					return;
				}

				cl('b.js: AMI: SVW:' +
					' mode[' + mode + ']' +
					' p[' + settings.protocol + ']' +
					' wrap[' + video_wrap + ']' +
					' sh[' + settings.show_hide + ']');

				var fn = function()
				{
					// show/hide toggle with no other ops (to replace old VideoShow/VideoHide)
					// with devices that use alpha channel (ami/lge), 'visibility' is interpreted
					// as visible=video, hidden=black and NOT the DOM element visibility
					// if we used DOM element, then visible=hidden will remove the element and the video
					// may still be showing in some alpha channels in the UI..

					if (settings.show_hide)
					{
						// AMINO uses video_wrap (not v_el, which doesn't exist in alpha blend cases)
						$(video_wrap).css({
							'background-color': settings.show_hide === 'show' ? '#111111' : '#000000'
						});
						return;
					}

					$(video_wrap).css({
						'position'         : settings.position,
						'visibility'       : settings.visibility,
						'display'          : settings.display,
						'left'             : settings.left,
						'top'              : settings.top,
						'width'            : settings.width,
						'height'           : settings.height,
						'border'           : settings.border,

						'border-radius'    : settings['border-radius'],
						'box-shadow'       : settings['box-shadow'],
						'z-index'          : settings['z-index'],
						'background-color' : settings['background-color']
					});

					// NOTE: A150 doesn't like chroma key of 0x123456 !
					try {
						VideoDisplay.SetChromaKey(0x111111);
					} catch(e) {
						cl('b.js: AMI: ERROR: VideoDisplay.SetChromaKey(0x111111):' + e.message);
					}

					that.ResizeVideoWindow(
						settings.left,
						settings.top,
						settings.width,
						settings.height
					);

					settings.complete();
				};

				if (!$(video_wrap).length)
				{
					if (mode === 'multicast')
					{
						$('#player_wrap').remove();
						$(settings.container).append('<div id="multicast_wrap"></div>');
						fn();
					}
					else
					{
						$('#multicast_wrap').remove();
						$(settings.container).append(iptvTemplates.getPlayerHtml());
						fn();
					}
				}
				else
				{
					fn();
				}
			};

			// AMINO
			this.GetPowerState = function()
			{
				switch (this.tvType)
				{
					case 'hdmi_cec':
					{
						// CEC.SendCommand(''); // TODO: get power status
						return true;
					} break;

					case 'smartport':
					{
						return TVI.GetIsTvOn();
					} break;

					case 'serialexpress':
					{
						if (this.sxpGotPowerStatus)
						{
							this.timers.aminoSxp = null;
							return this.tvPowerOn;
						}

						this.AmiSxpPwrStatus(this.GetPowerState);
					} break;
				}
			};

			// AMINO
			this.PowerToggle = function()
			{
				cl('b.js: AMI: TVI Power Toggle(), tvType:'+this.tvType);

				if (this.tvType == 'serialexpress')
				{
					this.sxpPowerRequest = true;
					// serial express get power request command
					TVI.Send('0E0D00000504000C211435A5A5');
				}

				this.tvPowerOn = this.GetPowerState();

				if (this.tvPowerOn)
				{
					this.TVOff();
				}
				else
				{
					this.TVOn(true);
				}
			};

			this.AmiSxpPwrStatus = function(callback)
			{
				if (!this.sxpGotPowerStatus)
				{
					// Request is still active, keep checking request value until set by power event
					this.timers.aminoSxp = setTimeout(function(){
						callback();
					}, 100);
				}
			};

			// AMINO
			this.TVOn = function(switch_to_iptv)
			{
				cl('b.js: AMI: TVI TVOn(), tvType [' + this.tvType + ']');
				switch (this.tvType)
				{
					case 'hdmi_cec':
					{
						// CEC.SendCommand(''); // TODO: power on code
					} break;

					case 'smartport':
					{
						TVI.TVOn();
					} break;

					case 'serialexpress':
					{
						TVI.Send('0E0E00000505000C20180139A5A5');
					} break;
				}

				if (config.amino_tvi_on_to_iptv == 1 && switch_to_iptv)
				{
					cl('b.js: AMI: TVI TVOn() switch to IPTV!');
					if (window.menuPageController)
					{
						menuPageController.switchIptv();
					}
				}
			};

			// AMINO
			this.TVOff = function()
			{
				cl('b.js: AMI: TVI TVOff(), tvType:'+this.tvType);
				switch (this.tvType)
				{
					case 'hdmi_cec':
					{
						// CEC.SendCommand(''); // TODO: power off code
					} break;

					case 'smartport':
					{
						TVI.TVOff();
					} break;

					case 'serialexpress':
					{
						TVI.Send('0E0E00000505000C20180038A5A5');
					} break;
				}
			};

			// AMINO
			this.VolumeUp = function()
			{
				//cl('b.js: AMI: TVI VolumeUp(), tvType:'+this.tvType);
				switch (this.tvType)
				{
					case 'hdmi_cec':
					{
						CEC.SendCommand('41'); // volup
					} break;

					case 'smartport':
					{
						//TVI.VolumeUp(); //broken
						TVI.CustomCommand('0x8f,0x00,0x10');
					} break;

					case 'serialexpress':
					{
						TVI.Send('0E0E00000505000C20450164A5A5');
					} break;
				}
			};

			// AMINO
			this.VolumeDown = function()
			{
				switch (this.tvType)
				{
					case 'hdmi_cec':
					{
						CEC.SendCommand('42'); // voldown
					} break;

					case 'smartport':
					{
						//TVI.VolumeDown(); //broken
						TVI.CustomCommand('0x8f,0x00,0x11');
					} break;

					case 'serialexpress':
					{
						TVI.Send('0E0E00000505000C20450065A5A5');
					} break;
				}
			};

			// AMINO
			this.MuteToggle = function()
			{
				switch (this.tvType)
				{
					case 'hdmi_cec':
					{
						CEC.SendCommand('43'); // mute toggle
					} break;

					case 'smartport':
					{
						TVI.CustomCommand('0x8f,0x00,0x0d');
					} break;

					case 'serialexpress':
					{
						TVI.Send('0E1200000509000C201B000DFFFF0036A5A5');
					} break;
				}
			};

			// AMINO
			this.PlayIPTV = function(opts)
			{
				var settings = $.extend({
					'ip': browser.multicast_ip,
					'port': browser.multicast_port ? browser.multicast_port : config.mc_udp_port,
					'number': null, // RF ch #
					'protocol': browser.iptv_protocol ? browser.iptv_protocol : config.iptv_protocol
				}, opts);

				//cl('b.js: settings ip: ' + settings.ip)
				//cl('b.js: settings port: ' + settings.port)
				//cl('b.js: settings number: ' + settings.number)
				//cl('b.js: settings protocol: ' + settings.protocol)
				//cl('b.js: settings b protocol: ' + browser.iptv_protocol)
				//cl('b.js: settings c protocol: ' + config.iptv_protocol + ': ' + config.amino_tvi_on_to_iptv)
				//cl('b.js: settings encrypted: ' + settings.encrypted)

				AVMedia.onEvent = 'browser.PlayIPTVEvent();';

				if (settings.protocol === 'rtp')
				{
					browser.curIptvUrl = 'rtp://' + settings.ip + ':' + settings.port;
					cl('b.js: AMI: PlayIPTV [rtp://' + settings.ip + ':' + settings.port + ']');
					AVMedia.Play('avsyncwait=no;rtpskip=yes;src=igmp://' + settings.ip + ':' + settings.port);
				}
				else if (settings.protocol === 'udp')
				{
					browser.curIptvUrl = 'udp://' + settings.ip + ':' + settings.port;
					cl('b.js: AMI: PlayIPTV [udp://' + settings.ip + ':' + settings.port + ']');
					AVMedia.Play('avsyncwait=no;src=igmp://' + settings.ip + ':' + settings.port);
				}
				else if (settings.protocol === 'rf')
				{
					browser.curIptvUrl = 'udp://' + settings.ip + ':' + settings.port;
					cl('b.js: AMI: PlayIPTV [rf://' + settings.number + '] NOT SUPPORTED, default to [' + browser.curIptvUrl + ']');
					AVMedia.Play('avsyncwait=no;src=igmp://' + settings.ip + ':' + settings.port);
				}
				else
				{
					var web_ip =
						config.mobile_iptv_server_ip ?
						config.mobile_iptv_server_ip :
						location.host; // can use host instead of hostname, no special port logic used here

					var p_url = 'http://' + web_ip + '/content/tv/' + settings.ip + '.mp4';

					if (settings.protocol === 'hls')
					{
						p_url = 'http://' + web_ip + '/hls/master-' + settings.ip + '.m3u8;servertype=hls';
					}

					browser.curIptvUrl = p_url;
					cl('b.js: AMI: PlayIPTV default [' + p_url + ']');
					AVMedia.Play('avsyncwait=no;src=' + p_url);
				}
			};

			// AMINO
			this.StopIPTV = function(opts, caller)
			{
				caller = caller || 'not set';

				var settings = $.extend({
					'complete': function(){},
					'force': false
				}, opts);

				cl('b.js: AMI: StopIPTV: curIptvUrl[' + browser.curIptvUrl + '], caller[' + caller + ']');

				if (browser.curIptvUrl === null && !settings.force) // no iptv to stop!
				{
					settings.complete();
					return;
				}

				browser.curIptvUrl = null;

				AVMedia.Kill();
				AVMedia.onEvent = null;

				settings.complete();
			};

			// This is only used for screensaver at this point
			// but can be reused for any IPTV feed that needs retry
			// AMINO
			this.PlayIPTVEvent = function()
			{
				var videoStatus = AVMedia.Event;

				switch (videoStatus)
				{
					case 10:
					{
						if (browser.multicast_ip && browser.multicast_port) {
							cl('b.js: AMI: PlayIPTVEvent: STATUS NO VIDEO, CODE [10], RETRY[' + browser.multicast_ip + ':' + browser.multicast_port + ']');
							//AVMedia.Kill(); // On 140 this seems to trigger a '95' event (stopped by user)..

							if (browser.iptv_protocol == 'rtp') {
								AVMedia.Play('avsyncwait=no;rtpskip=yes;src=igmp://' + browser.multicast_ip + ':' + browser.multicast_port);
							} else {
								AVMedia.Play('avsyncwait=no;src=igmp://' + browser.multicast_ip + ':' + browser.multicast_port);
							}
						} else {
							// this happens every second, too verbose..
							// cl('b.js: STATUS NO VIDEO, CODE [10], no URL, skip retry');
						}
					} break;

					case 11: // multicast video timeout, reconnect
					{
						cl('b.js: AMI: PlayIPTVEvent: IGMP STATUS END OF STREAM CODE [11], RETRY[' + browser.multicast_ip + ':' + browser.multicast_port + ']');

						if (browser.iptv_protocol == 'rtp') {
							AVMedia.Play('avsyncwait=no;rtpskip=yes;src=igmp://' + browser.multicast_ip + ':' + browser.multicast_port);
						} else {
							AVMedia.Play('avsyncwait=no;src=igmp://' + browser.multicast_ip + ':' + browser.multicast_port);
						}
					} break;

					case 15:
					{
						cl('b.js: AMI: PlayIPTVEvent: IGMP STATUS PLAYING, CODE [15]');
					} break;

					case 23:
					{
						cl('b.js: AMI: PlayIPTVEvent: STATUS PMT CHANGED, CODE [23]');
					} break;

					case 83: case 84: case 85:
					{
						cl('b.js: AMI: PlayIPTVEvent: DATA/VIDEO/AUDIO STARTED CODE [' + videoStatus + ']');
					} break;

					case 86:
					{
						cl('b.js: AMI: PlayIPTVEvent: VIDEO RES CHANGED [86]');
					} break;

					case 93: case 94: // fail, died
					{
						cl('b.js: AMI: PlayIPTVEvent: PLAYBACK FAILED/DIED, CODE [' + videoStatus + '], RETRY[' + browser.multicast_ip + ':' + browser.multicast_port + ']');

						if (browser.iptv_protocol == 'rtp')
						{
							AVMedia.Play('avsyncwait=no;rtpskip=yes;src=igmp://' + browser.multicast_ip + ':' + browser.multicast_port);
						}
						else
						{
							AVMedia.Play('avsyncwait=no;src=igmp://' + browser.multicast_ip + ':' + browser.multicast_port);
						}
					} break;

					case 95:
					{
						cl('b.js: AMI: PlayIPTVEvent: PLAYBACK STOPPED BY USER, CODE [95]');
					} break;

					case 99:
					{
						cl('b.js: AMI: PlayIPTVEvent: BUFFERING [99]');
					} break;

					default:
					{
						cl('b.js: AMI: PlayIPTVEvent: DEFAULT CODE [' + videoStatus + ']');
					} break;
				}
			};
		} break;


		/*****************************************************************
		* LGE
		*****************************************************************/
		case 'lge':
		{
			this.InitTV = function(_opts)
			{
				var opts = $.extend({
					complete: function(){},
					mode: 'menu' // other is 'signage'
				}, _opts);

				if (this.tvInitialised) {
					cl('b.js: LGE: InitTV: already initialised, return..');
					return;
				}

				var that = this;

				hcap.property.getProperty({
					'key': 'serial_number',
					'onSuccess': function(s)
					{
						cl('b.js: LGE: hcap getProperty serial_number success [' + s.value + ']');
						that.deviceSerialNumber = s.value;
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: hcap getProperty serial_number fail [' + e.errorMessage + ']');
					}
				});

				hcap.mode.setHcapMode({
					'mode'      : hcap.mode.HCAP_MODE_1,
					'onSuccess': function()
					{
						cl('b.js: LGE: hcap set mode=HCAP_MODE_1 onSuccess');
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: hcap set mode=HCAP_MODE_1 fail:' + e.errorMessage);
					}
				});

				hcap.property.setProperty({
					'key'       : 'tv_channel_attribute_floating_ui',
					'value'     : '0', // 1=inbuilt floating OSD will appear in some cases (no signal/encrypted etc) 0=hide it
					'onSuccess': function()
					{
						cl('b.js: LGE: hcap set tv_channel_attribute_floating_ui=0 onSuccess');
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: hcap set tv_channel_attribute_floating_ui=0 fail:' + e.errorMessage);
					}
				});

				hcap.property.setProperty({
					'key'       : 'tv_volume_ui',
					'value'     : '1', // 1=enabled volume osd, 0=disable vol osd (use to default to 1, LV model defaults to 0)
					'onSuccess': function()
					{
						cl('b.js: LGE: hcap set tv_volume_ui=1 onSuccess');
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: hcap set tv_volume_ui=1 fail:' + e.errorMessage);
					}
				});

				hcap.property.setProperty({
					'key'       : 'browser_network_error_handling',
					'value'     : '0',
					'onSuccess': function()
					{
						cl('b.js: LGE: hcap set browser_network_error_handling=0 onSuccess');
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: hcap set browser_network_error_handling=0 fail:' + e.errorMessage);
					}
				});

				/*
				hcap.property.setProperty({
					'key'       : 'boot_sequence_option',
					'value'     : '1',
					'onSuccess': function()
					{
						cl('b.js: LGE: hcap set boot_sequence_option=1 onSuccess');
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: hcap set boot_sequence_option=1 fail:' + e.errorMessage);
					}
				});
				*/

				var lge_post_set_input = function()
				{
					// LGE
					that.drm_retry_counter = 0;

					that.InitDRM(function()
					{
						opts.complete();
					});

					that.preLoadedApps = [];

					that.GetInstalledApps({
						complete: function(apps)
						{
							that.preLoadedApps = apps;
						}
					});

					// note: this fires on video play etc, not just source input (hdmi etc) as expected..
					$(document).on('external_input_changed', lge_input_event);

					$(document).on('power_mode_changed', function()
					{
						hcap.power.getPowerMode({
							'onSuccess': function(e)
							{
								if (e.mode === hcap.power.PowerMode.NORMAL)
								{
									// Occurs when transiting from WARM->NORMAL (Standby to on)
									cl('b.js: LGE: power_mode_changed->getPowerMode ok, mode [NORMAL/ON], resetToStart!');
									menuPageController.resetToStart();
								}
								else
								{
									if(e.mode === hcap.power.PowerMode.WARM){
										cl('b.js: LGE: power_mode_changed->getPowerMode ok, mode [WARM])');
									} else {
										cl('b.js: LGE: power_mode_changed->getPowerMode ok, mode [' + e.mode + '] [OTHER/STANDBY])');
									}

									browser.StopIPTV({
										'force': true,
										'complete': function(){
											browser.Stop({'complete': function(){
												cl('bc.js->stopIPTV complete');
											}});
										}
									}, 'b.js->power changed to warm/other');
								}
							},
							'onFailure': function(e)
							{
								cl('b.js: LGE: power_mode_changed->getPowerMode fail [' + e.errorMessage + ']');
							}
						});
					});

					that.tvInitialised = true;

					cl('b.js: LGE: InitTV: finished');
				};

				hcap.externalinput.setCurrentExternalInput({
					'type' : hcap.externalinput.ExternalInputType.TV,
					'index' : 0,
					'onSuccess' : function(){
						cl('b.js: LGE: hcap setCurrentExternalInput TV success');
						lge_post_set_input();
					},
					'onFailure' : function(e){
						cl('b.js: LGE: hcap setCurrentExternalInput TV fail [' + e.errorMessage + ']');
						lge_post_set_input();
					}
				});
			};

			// LGE
			this.GetInstalledApps = function(opts)
			{
				var settings = $.extend({
					complete: function(){}
				}, opts);

				hcap.preloadedApplication.getPreloadedApplicationList({
					'onSuccess': function(s)
					{
						cl('b.js: LGE: GetInstalledApps: success, app count [' + s.list.length + ']');
						settings.complete(s.list); // array of objects {id:'someid',title:'sometitle'}
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: GetInstalledApps: fail [' + e.errorMessage + ']');
						settings.complete();
					}
				});
			};

			// LGE
			this.BroadcastStop = function(opts)
			{
				cl('b.js: LGE: BroadcastStop');
				opts.complete = opts.complete || function(){};
				opts.complete();
			};

			// LGE
			this.InitDRM = function(callback)
			{
				if (typeof callback !== 'function')
				{
					callback = function(){};
				}

				if (!config.drm_server || config.drm_server == 'none')
				{
					callback();
					return true;
				}

				if (!config.drm_vendor || config.drm_vendor == 'none')
				{
					callback();
					return true;
				}

				if (this.drm_initialised)
				{
					cl('b.js: LGE: InitDRM: already initialised, return');
					callback();
					return true;
				}

				var that = this;

				var lge_drm_init = function()
				{
					var lt = new Date();
					cl('b.js: LGE: InitDRM: vendor[' + config.drm_vendor + '] server[' + config.drm_server + '] JS time[' + lt + ']');

					if (config.drm_vendor === 'verimatrix')
					{
						// VL note 28/5/15 - TV is rebooting when setting this and it doesn't actually communicate with the VMX server
						// Fixed 25/8/15 - Issue due to demo F/W (9.14) works on 2.01.91/3.11+
						//callback();
						//return;

						//****************************
						// IMPORTANT TO REMEMBER
						// The TV needs access to 2 things:
						//
						// 1. the config.drm_server host
						// 2. the host configured in '/opt/vcas/iptv/etc/VCI/client.ini' on the VMX server
						//
						// It is easy to forget about the client.ini setting, things will "half-work" if the TV can
						// access config.drm_server [192.168.1.30], e.g 10.10.5.52 -> 192.168.1.30
						// BUT NOT client.ini address [10.0.0.6], e.g. 10.10.5.52 -> 10.0.0.6
						//
						//******************************

						/*
						hcap.property.setProperty({
							'key'       : 'drm_control',
							'value'     : '2|0|' + config.drm_server + '|12686',
							'onSuccess': function()  {
								cl('b.js: LGE: hcap drm_control [2|0|' + config.drm_server + '|12686] success');
								callback();
							},
							'onFailure': function(e) {
								cl('b.js: LGE: hcap drm_control [2|0|' + config.drm_server + '|12686] fail:' + e.errorMessage);
								callback();
							}
						});
						*/

						// only need to de-init if the TV registered with another VCAS server before..
						hcap.property.setProperty({
							'key'       : 'drm_control',
							'value'     : '2|1', // VMX|De-init (delete key first)
							'onSuccess': function()
							{
								cl('b.js: LGE: hcap drm_control [2|1] de-init success, now doing init [2|0|' + config.drm_server + '|12686] ..');
								//return;

								// 'value' note:'2=VERIMATRIX|0=INIT|IP|PORT'
								// Port 12686: VCI BOOT PORT (receive client.ini and cert from VCAS)
								hcap.property.setProperty({
									'key'       : 'drm_control',
									'value'     : '2|0|' + config.drm_server + '|12686',
									'onSuccess': function()  {
										cl('b.js: LGE: hcap drm_control [2|0|' + config.drm_server + '|12686] init success');
										that.drm_initialised = true;
										callback();
									},
									'onFailure': function(e) {
										cl('b.js: LGE: hcap drm_control [2|0|' + config.drm_server + '|12686] init fail:' + e.errorMessage);
										callback();
									}
								});
							},
							'onFailure': function(e)
							{
								cl('b.js: LGE: hcap drm_control 2|1 [de-init] fail:' + e.errorMessage);
								callback();
							}
						});
					}
					else
					{
						cl('b.js: LGE: InitDRM: unknown vendor [' + config.drm_vendor + ']');
						callback();
					}
				};

				var geturl = window.menuUrlPrefix +
					'/api/config/server_time/array';

				// prefix done
				$.get(geturl, function(res)
				{
					// TV doesn't work with offset > 600..
					var gmtOffsetInMinute = parseInt(res.data.gmtoffset / 60, 10);
					if (gmtOffsetInMinute > 600)
					{
						gmtOffsetInMinute = 600;
					}

					cl('b.js: LGE: InitDRM: call hcap setLocalTime [' +
						parseInt(res.data.year, 10) + '/' +
						parseInt(res.data.month, 10) + '/' +
						parseInt(res.data.day, 10) + ' ' +
						parseInt(res.data.hour, 10) + ':' +
						parseInt(res.data.minute, 10) + ':' +
						parseInt(res.data.second, 10) + ', ' +
						'gmtoffset:' + gmtOffsetInMinute + ']');

					hcap.time.setLocalTime({
						'year'              : parseInt(res.data.year, 10),
						'month'             : parseInt(res.data.month, 10),
						'day'               : parseInt(res.data.day, 10),
						'hour'              : parseInt(res.data.hour, 10),
						'minute'            : parseInt(res.data.minute, 10),
						'second'            : parseInt(res.data.second, 10),
						'gmtOffsetInMinute' : gmtOffsetInMinute,
						'isDaylightSaving'  : false,

						'onSuccess': function()
						{
							cl('b.js: LGE: hcap setLocalTime success');
							lge_drm_init();
							// callback() refs are inside the lge_drm_init() function
						},
						'onFailure': function(e)
						{
							// we are doing this because LGE setLocalTime() can fail for reasons unknown
							// the failures only seem to occur one time after initial power up/on..
							if (that.drm_retry_counter < 10)
							{
								that.drm_retry_counter++;
								cl('b.js: LGE: hcap setLocalTime fail [' + e.errorMessage + '] RETRY[' + that.drm_retry_counter + '] in 1s');
								setTimeout(function(){
									that.InitDRM(callback);
								}, 1000);
							}
							else
							{
								cl('b.js: LGE: hcap setLocalTime fail [' + e.errorMessage + '] GIVING UP!');
								callback();
							}
						}
					});
				}, 'json')
				.fail(function()
				{
					cl('b.js: LGE: call /api/config/server_time/array failed');
					callback();
				});
			};

			// LGE
			this.InitDeviceHDMI = function()
			{
				cl('b.js: LGE: InitDeviceHDMI');

				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				hcap.externalinput.setCurrentExternalInput({
					'type': hcap.externalinput.ExternalInputType.HDMI,
					'index': 0,
					'onSuccess': function() {
						cl('b.js: LGE: InitDeviceHDMI: success');
					},
					'onFailure': function(f) {
						cl('b.js: LGE: InitDeviceHDMI: fail [' + f.errorMessage + ']');
					}
				});

				this.SetupDomForInputSelect();
			};

			// LGE
			this.InitDeviceMedia = function()
			{
				cl('b.js: LGE: WiDi / Miracast init');

				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				hcap.property.setProperty({
					'key': 'wifi_screen_share',
					'value': '1',
					'onSuccess': function()
					{
						cl('b.js: LGE: WiDi / Miracast init: setProperty success');
						hcap.preloadedApplication.launchPreloadedApplication({
							'id': '144115188075855880', // Screen Share
							'onSuccess': function(){
								cl('b.js: LGE: WiDi / Miracast launchPreloadedApplication: success');
							},
							'onFailure': function(f){
								cl('b.js: LGE: WiDi / Miracast launchPreloadedApplication: fail: ' + f.errorMessage);
							}
						});
					},
					'onFailure': function(f) {
						cl('b.js: LGE: WiDi / Miracast init: setProperty fail: ' + f.errorMessage);
					}
				});
			};

			// LGE
			this.InitDeviceApp = function(appCode) //, app_parameter)
			{
				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				var pt =
					'Ready to load App.<br/><br/>' +
					'Press HOME or POWER when finished.<br/><br/>' +
					'Press Enter/OK to begin.';

				prompt(pt, {
					'complete': function()
					{
						// Launch App.
						// Sample app codes below:
						// app_parameter is not known..
						/*
						Skype	144115188075855878
						SmartShare	144115188075855882
						Tanks	144115188075859005
						The Associated Press	144115188075859011
						TV Hockey	244115188075859004
						Twitter	144115188075855873
						Ustream	144115188075859012
						vTuner	144115188075859000
						*/

						hcap.preloadedApplication.launchPreloadedApplication({
							'id' : appCode, // must be string
							// parameters are optional and not used for most apps
							// 'parameters' : {
							// 	'url': app_parameter // e.g. www.lge.com (from HCAP example)
							// },
							'onSuccess': function()
							{
								cl('b.js: LGE: InitDeviceApp launchPreloadedApplication [' + appCode + ']: success');
							},
							'onFailure': function(e)
							{
								cl('b.js: LGE: InitDeviceApp launchPreloadedApplication [' + appCode + ']: fail [' + e.errorMessage + ']');
							}
						});
					}
				});
			};

			// LGE
			this.StopIPTV = function(opts, caller)
			{
				caller = caller || 'not set';

				if (vodMenuApp.flags.ignoreStopIptv === true)
				{
					cl('b.js: LGE: StopIPTV: ignoreStopIptv set (likely an external event override) !');
					return;
				}

				var settings = $.extend({
					'complete': function(){},
					'force': false
				}, opts);

				cl('b.js: LGE: StopIPTV: curIptvUrl[' + browser.curIptvUrl + '], force[' +
					settings.force + '], caller[' + caller + ']');

				if (browser.curIptvUrl === null && !settings.force && !opts.force) // nothing to stop and not forcing stop..
				{
					cl('b.js browser.curIptvUrl === null && !settings.force', browser.curIptvUrl, !settings.force);
					settings.complete();
					return;
				}

				// Note: not checking protocol of curIptvUrl because
				// the command below covers both IP/RF cases..
				hcap.channel.requestChangeCurrentChannel({
					'channelType'     : hcap.channel.ChannelType.IP,
					'ip'              : '239.254.254.254',
					'port'            : 1,
					'ipBroadcastType' : hcap.channel.IpBroadcastType.UDP,

					'onSuccess': function()
					{
						cl('b.js: LGE: StopIPTV: change chan ok');
						hcap.channel.stopCurrentChannel({
							'onSuccess': function() {
								cl('b.js: LGE: StopIPTV: stop ok');
								settings.complete();
							},
							'onFailure': function(e) {
								cl('b.js: LGE: StopIPTV: stop fail: [' + e.errorMessage + ']');
								settings.complete();
							}
						});
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: StopIPTV: change chan fail: [' + e.errorMessage + ']');
						settings.complete();
					}
				});

				browser.curIptvUrl = null;
			};

			// LGE
			this.Play = function(url, offset, opts, callback1, callback2, callback3)
			{
				browser.curVideoUrl = url;
				var settings = $.extend({
					'loop'   : false,
					'left'   : null,
					'top'    : null,
					'width'  : null,
					'height' : null
				}, opts);

				var mimeType = 'video/mpeg';
				if (url.match(/\.m3u8$/)) {
					mimeType = 'application/x-mpegurl';
				}

				cl('b.js: LGE: PLAY: url[' + url + '] mimeType[' + mimeType + '], offset[' + offset + '], loop[' + settings.loop + ']');

				var that = this;

				if (typeof callback1 !== 'function') {
					callback1 = function(){
						cl('b.js: LGE: PLAY: video.play success');
					};
				}

				if (typeof callback2 !== 'function') {
					callback2 = function(e){
						cl('b.js: LGE: PLAY: createMedia fail[' + e.errorMessage + ']');
					};
				}

				if (typeof callback3 !== 'function') {
					callback3 = function(e){
						cl('b.js: LGE: PLAY: startUp fail[' + e.errorMessage + ']');
					};
				}

				// LGE
				browser.lgePlayEventHandler = function (p)
				{
					cl('b.js: LGE: PLAY: EVENT[' + p.eventType + ']');
					switch (p.eventType) {
						case 'play_end': {
							if (settings.loop) {
								cl('b.js: LGE: PLAY: Loop set, stop and play again..');
								browser.Stop({
									'getstate': false,
									'complete': function(){
										browser.Play(url, offset, opts, callback1, callback2, callback3);
									}
								});
							}
						} break;

						case 'play_start': {
							if (settings.left !== null) {
								cl('b.js: LGE: PLAY: left param set, resize window..');
								that.ResizeVideoWindow(
									settings.left,
									settings.top,
									settings.width,
									settings.height
								);
							}
						} break;
					}
				};

				document.removeEventListener('media_event_received', browser.lgePlayEventHandler);
				document.addEventListener('media_event_received', browser.lgePlayEventHandler);

				hcap.Media.startUp({
					'onSuccess': function()
					{
						cl('b.js: LGE: PLAY: startUp OK, now createMedia with url[' + url + '] mimeType[' + mimeType + ']');
						video = hcap.Media.createMedia({
							'url': url,
							'mimeType': mimeType,
							'drmType': 'NONE',
							'onSuccess': function()
							{
								cl('b.js: LGE: PLAY: createMedia OK');

								posturl = window.menuUrlPrefix +
									'/api/log/browser_interface/INFO';

								// prefix done
								$.post(posturl, {
									'code': 0,
									'msg': 'lge_play, url[' + url + ']'
								});

								video.play({
									'onSuccess': function()
									{
										callback1();
									},
									'onFailure': function(e)
									{
										cl('b.js: LGE video.play onFailure [' + e.errorMessage + ']');
										callback1(e);
									}
								});
							},
							'onFailure': function()
							{
								callback2();
								hcap.Media.shutDown({'onSuccess': null, 'onFailure': null});
							}
						});
					},
					'onFailure': function()
					{
						callback3();
						hcap.Media.shutDown({'onSuccess': null, 'onFailure': null});
					}
				});
			};

			// LGE
			this.Stop = function(opts)
			{
				// don't use 'this' or 'that' here
				// browser.Stop is called direct sometimes (player.js)

				cl('b.js: LGE: Stop: curVideoUrl[' + browser.curVideoUrl + ']');

				var settings = $.extend({
					'complete': function(){},
					'getstate': false
				}, opts);

				if (browser.curVideoUrl === null) // nothing to stop!
				{
					settings.complete();
					return;
				}

				browser.curVideoUrl = null;

				document.removeEventListener('media_event_received', browser.lgePlayEventHandler);

				if (typeof window.video.destroy !== 'function') {
					cl('b.js: LGE: Stop: no valid video object, run callback and return');
					settings.complete();
					return;
				}

				// july 2015: trial without ever getting state (override), see if it helps
				// oct 2015: seems better..
				// oct 2017: trial without stop, just destroy->shutdown
				// oct 2017: update 1: destroy->stop works if video played ok but fails if it did not

				video.stop({
					'onSuccess': function()
					{
						cl('b.js: LGE: stop ok');
						video.destroy({
							'onSuccess': function()
							{
								cl('b.js: LGE: stop->destroy ok');
								hcap.Media.shutDown({
									'onSuccess': function() {
										cl('b.js: LGE: stop_ok->destroy_ok->shutDown ok');
										settings.complete();
									},
									'onFailure': function(e) {
										cl('b.js: LGE: stop_ok->destroy_ok->shutDown fail [' + e.errorMessage + ']');
										settings.complete();
									}
								});
							},
							'onFailure': function(e)
							{
								cl('b.js: LGE: stop_ok->destroy fail [' + e.errorMessage + ']');

								posturl = window.menuUrlPrefix +
									'/api/log/browser_interface/ERROR';

								// prefix done
								$.post(posturl, {
									'code': 913,
									'msg': 'LGE: stop_ok->destroy fail [' + e.errorMessage + ']'
								});

								hcap.Media.shutDown({
									'onSuccess': function() {
										cl('b.js: LGE: stop_ok->destroy_fail->shutDown ok');
										settings.complete();
									},
									'onFailure': function(e) {
										cl('b.js: LGE: stop_ok->destroy_fail->shutDown fail [' + e.errorMessage + ']');
										settings.complete();
									}
								});
							}
						});
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: stop fail [' + e.errorMessage + ']');

						hcap.Media.shutDown({
							'onSuccess': function()
							{
								cl('b.js: LGE: stop_fail->shutDown ok');
								settings.complete();
							},
							'onFailure': function(e)
							{
								cl('b.js: LGE: stop_fail->shutDown fail [' + e.errorMessage + ']');
								settings.complete();
							}
						});
					}
				});
			};

			// LGE
			this.SetPos = function(seconds)
			{
				cl('b.js: LGE: setpos [' + seconds + 's]');
				video.setPlayPosition({
					'positionInMs': seconds * 1000,
					'onSuccess': function()
					{
						cl('b.js: LGE: set position ok');
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: set position fail: [' + e.errorMessage + ']');
					}
				});
			};

			// LGE
			this.GetPos = function(complete)
			{
				complete = complete || function(){};
				if (!window.video) {
					complete(0);
				}

				video.getPlayPosition({
					'onSuccess': function(msg)
					{
						complete(parseInt(msg.positionInMs / 1000, 10));
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: GetPos: ERROR[' + e.errorMessage + ']');
						complete(0);
					}
				});
			};

			// LGE
			this.GetDuration = function(complete)
			{
				complete = complete || function(){};
				if (!window.video) {
					complete(0);
				}

				video.getInformation({
					'onSuccess': function(msg)
					{
						complete(parseInt(msg.contentLengthInMs / 1000, 10));
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: GetDuration: ERROR[' + e.errorMessage + ']');
						complete(0);
					}
				});
			};

			// LGE
			this.Pause = function()
			{
				video.pause({
					'onSuccess': function(){
						cl('b.js: LGE: pause event OK');
					},
					'onFailure': function(e){
						cl('b.js: LGE: pause event fail [' + e.errorMessage + ']');
					}
				});
			};

			// LGE
			this.Continue = function()
			{
				if (typeof player.playEventHandler !== 'function') {
					player.playEventHandler = function(e)
					{
						if (e.errorMessage) {
							cl('b.js: LGE: playEventHandler default err [' + e.errorMessage + ']');
						} else {
							cl('b.js: LGE: playEventHandler default ok');
						}
					};
				}

				video.resume({
					'onSuccess' : player.playEventHandler,
					'onFailure' : player.playEventHandler
				});
			};

			// LGE
			this.SetSpeed = function(speed)
			{
				video.setPlaySpeed({
					'speed'     : speed,
					'onSuccess': function(e){
						cl('b.js: LGE: setspeed event ok, cmd [' + e.command + ']');
					},
					'onFailure': function(e){
						cl('b.js: LGE: setspeed event fail [' + e.errorMessage + ']');
					}
				});
			};

			// LGE
			// 'core' videowindow only..
			this.ResizeVideoWindow = function(x, y, w, h, complete) // left,top,width,height
			{
				x = x || 0;
				y = y || 0;
				w = w || $(window).width();
				h = h || $(window).height();
				complete = complete || function(){};

				x = parseInt(x.toString().replace('px', ''), 10);
				y = parseInt(y.toString().replace('px', ''), 10);
				w = parseInt(w.toString().replace('px', ''), 10);
				h = parseInt(h.toString().replace('px', ''), 10);

				w = sharedModules.uiHelpers.roundn(w, 8);
				h = sharedModules.uiHelpers.roundn(h, 8);

				cl('b.js: LGE: ResizeVideoWindow x['+x+'] y['+y+'] w['+w+'] h['+h+']: before hcap.video.setVideoSize');

				// This can fail under some cases and try/catch does not help
				// so do NOT rely on the complete() working!
				hcap.video.setVideoSize({
					'x'     : x,
					'y'     : y,
					'width' : w <= 0 ? 32 : w,
					'height': h <= 0 ? 32 : h,
					'onSuccess': function()
					{
						cl('b.js: LGE: ResizeVideoWindow x['+x+'] y['+y+'] w['+w+'] h['+h+'] setVideoSize: ok');
						complete();
					},
					'onFailure': function(e)
					{
						cl('b.js: LGE: ResizeVideoWindow x['+x+'] y['+y+'] w['+w+'] h['+h+'] setVideoSize: fail [' + e.errorMessage + ']');
						complete();
					}
				});
			};

			// LGE
			this.SetVideoWindow = function(opts)
			{
				var that = this;

				var settings = $.extend({
					'container'        : 'body', // where to put the wrapper (not the video object), e.g. body, dbcontent, etc
					'protocol'         : 'http',
					'position'         : 'fixed',
					'visibility'       : 'visible',
					'display'          : 'block',
					'z-index'          : -1, // good default for iptv/ss modes, play/info require >= 500
					'top'              : 0,
					'left'             : 0,
					'width'            : $(window).width(),
					'height'           : $(window).height(),
					'box-shadow'       : 'none',
					'border'           : 'none',
					'border-radius'    : 0,
					'background-image' : 'url(tv:)',
					'background-color' : 'transparent',
					'show_hide'        : null,
					'remove'           : false,
					'complete'         : function(){}
				}, opts);

				// IMPORTANT: no videoid.  this is because 'videoid' is really just the wrapper to put
				// alpha blended video on top of, instead of using a '<video>' DOM object/element.

				var mode = 'unicast';
				var video_wrap = '#player_wrap';

				if ($.inArray(settings.protocol, ['udp', 'rtp', 'rf']) > -1)
				{
					mode = 'multicast';
					video_wrap = '#multicast_wrap'; // no default OSD
				}

				if (settings.remove)
				{
					cl('b.js: LGE: SVW: remove and exit');
					$('#player_wrap, #multicast_wrap').remove();
					video = null;
					settings.complete();
					return;
				}

				cl('b.js: LGE: SVW:' +
					' mode[' + mode + ']' +
					' p[' + settings.protocol + ']' +
					' wrap[' + video_wrap + ']' +
					' sh[' + settings.show_hide + ']' +
					' w[' + settings.width + ']' +
					' h[' + settings.height + ']' +
					' t[' + settings.top + ']' +
					' l[' + settings.left + ']');

				var fn = function()
				{
					// show/hide toggle with no other ops (to replace old VideoShow/VideoHide)
					// with devices that use alpha channel (ami/lge), 'visibility' is interpreted
					// as visible=video, hidden=black and NOT the DOM element visibility
					// if we used DOM element, then visible=hidden will remove the element and the video
					// may still be showing in some alpha channels in the UI..

					if (settings.show_hide)
					{
						// LGE uses video_wrap (not v_el, which doesn't exist in alpha blend cases)
						$(video_wrap).css({
							'background-image': settings.show_hide === 'show' ? 'url(tv:)' : 'none'
						});

						settings.complete();
						return;
					}

					// this is still needed for the case where the video is already playing
					// e.g. info page fullscreen -> windowed transition on ok button..
					that.ResizeVideoWindow(
						settings.left,
						settings.top,
						settings.width,
						settings.height
					);

					// VL note: border: '1px solid #222' breaks LX765 3.92.xx (video will not show!)
					// ..but a 2px border is OK, smh, fml :-/
					// so convert any border: 1px... into border: 2px..
					settings.border = settings.border.replace(/^1px(.*)/, '2px' + '$1');

					$(video_wrap).css({
						'position'         : settings.position,
						'visibility'       : settings.visibility,
						'display'          : settings.display,
						'left'             : settings.left,
						'top'              : settings.top,
						'width'            : settings.width,
						'height'           : settings.height,
						'border'           : settings.border,
						'box-shadow'       : settings['box-shadow'],
						'border-radius'    : settings['border-radius'],
						'z-index'          : settings['z-index'],
						'background-color' : settings['background-color'],
						'background-image' : settings['background-image']
					});

					settings.complete();
				};

				if (!$(video_wrap).length)
				{
					cl('b.js: LGE: SVW: wrap[' + video_wrap + '] not found, add then resize');

					if (mode === 'multicast')
					{
						$('#player_wrap').remove();
						$(settings.container).append('<div id="multicast_wrap"></div>');
						fn();
					}
					else
					{
						$('#multicast_wrap').remove();
						$(settings.container).append(iptvTemplates.getPlayerHtml());
						fn();
					}
				}
				else
				{
					cl('b.js: LGE: SVW: wrap[' + video_wrap + '] exists just resize');
					fn();
				}
			};

			// LGE
			this.GetPowerState = function(callback)
			{
				callback = callback || function(){};

				hcap.power.getPowerMode({
					'onSuccess': function(s){
						cl('b.js: LGE: getPowerMode ok state[' + s.mode + ']');
						callback(s.mode);
					},
					'onFailure': function(e){
						cl('b.js: LGE: getPowerMode fail: [' + e.errorMessage + ']');
						callback(null);
					}
				});
			};

			// LGE
			this.TVOn = function()
			{
				hcap.power.setPowerMode({
					'mode'      : hcap.power.PowerMode.NORMAL,
					'onSuccess': function(){
						cl('b.js: LGE: TVOn [setPowerMode] ok');
					},
					'onFailure': function(e){
						cl('b.js: LGE: TVOn [setPowerMode] fail: [' + e.errorMessage + ']');
					}
				});
			};

			// LGE
			this.TVOff = function()
			{
				cl('b.js TV off');
				hcap.power.powerOff({
					'onSuccess': function(){
						cl('b.js: LGE: TVOff [powerOff] ok');
					},
					'onFailure': function(e){
						cl('b.js: LGE: TVOff [powerOff] fail: [' + e.errorMessage + ']');
					}
				});
			};

			// LGE
			this.GetVolume = function(callback)
			{
				callback = callback || function(){};

				hcap.volume.getVolumeLevel({
					'onSuccess': function(s){
						cl('b.js: LGE: GetVolume [getVolumeLevel] ok level[' + s.level + ']');
						callback(s.level);
					},
					'onFailure': function(e){
						cl('b.js: LGE: GetVolume [getVolumeLevel] fail: [' + e.errorMessage + ']');
						callback(0);
					}
				});
			};

			// LGE
			this.SetVolume = function(level)
			{
				level = parseInt(level, 10);

				hcap.volume.setVolumeLevel({
					'level' : level,
					'onSuccess': function(){
						cl('b.js: LGE: Set Volume [set VolumeLevel ' + level + ']  ok');
					},
					'onFailure': function(e){
						cl('b.js: LGE: Set Volume [set VolumeLevel ' + level + '] fail: [' + e.errorMessage + ']');
					}
				});
			};

			// LGE
			this.VolumeUp = function ()
			{
				var that = this;
				if (that.volume === null)
				{
					that.GetVolume(function(s)
					{
						that.volume = s > 100 ? 100 : s + 1;
						that.SetVolume(that.volume);
					});
				}
				else
				{
					that.volume = that.volume > 100 ? 100 : that.volume + 1;
					that.SetVolume(that.volume);
				}
			};

			// LGE
			this.VolumeDown = function ()
			{
				var that = this;
				if (that.volume === null)
				{
					that.GetVolume(function(s)
					{
						that.volume = s < 1 ? 0 : s - 1;
						that.SetVolume(that.volume);
					});
				}
				else
				{
					that.volume = that.volume < 1 ? 0 : that.volume - 1;
					that.SetVolume(that.volume);
				}
			};

			// LGE
			this.MuteToggle = function()
			{
				this.SetVolume(-1);
			};

			// LGE
			this.PlayIPTV = function(opts) // should be called 'playLinear()'
			{
				var settings = $.extend({
					ip: browser.multicast_ip,
					port: browser.multicast_port ? browser.multicast_port : config.mc_udp_port,
					number: null, // RF ch #,
					protocol: browser.iptv_protocol ? browser.iptv_protocol : config.iptv_protocol,
					rf_frequency_khz: null, // RF
					program_id: null, // RF
					width: null,
					height: null,
					top: null,
					left: null
				}, opts);

				var that = this;
				if (settings.protocol.match(/(rtp|udp)/))
				{
					browser.curIptvUrl = settings.protocol + '://' + settings.ip + ':' + settings.port;

					var ipBroadcastType =
						settings.protocol === 'udp' ?
						hcap.channel.IpBroadcastType.UDP :
						hcap.channel.IpBroadcastType.RTP;

					hcap.channel.requestChangeCurrentChannel({
						'channelType'     : hcap.channel.ChannelType.IP,
						'ip'              : settings.ip,
						'port'            : parseInt(settings.port, 10),
						'ipBroadcastType' : ipBroadcastType,

						'onSuccess': function() {
							cl('b.js: LGE: PlayIPTV [' + browser.curIptvUrl + '] ok');
							if (settings.width) {
								that.ResizeVideoWindow(
									settings.left,
									settings.top,
									settings.width,
									settings.height
								);
							}
						},
						'onFailure': function(e) {
							cl('b.js: LGE: PlayIPTV [' + browser.curIptvUrl + '] fail: [' + e.errorMessage + ']');
						}
					});
				}
				else if (settings.protocol === 'rf')
				{
					browser.curIptvUrl =
						'rf://' +
						'chan=' + settings.number +
						';freq=' + settings.rf_frequency_khz +
						';progid=' + settings.program_id;

					hcap.channel.requestChangeCurrentChannel({
						'channelType': hcap.channel.ChannelType.RF,
						'rfBroadcastType': hcap.channel.RfBroadcastType.TERRESTRIAL,
						// 'logicalNumber': parseInt(settings.number), // doesn't work by itself
						'frequency' : settings.rf_frequency_khz * 1000,
						'programNumber' : settings.program_id,
						'onSuccess': function() {
							cl('b.js: LGE: PlayIPTV [' + browser.curIptvUrl + '] ok');
						},
						'onFailure': function(e) {
							cl('b.js: LGE: PlayIPTV [' + browser.curIptvUrl + '] fail: [' + e.errorMessage + ']');
						}
					});
				}
				//else // todo: hls/http linear

				hcap.video.setVideoMute({'videoMute': false, 'onSuccess': null, 'onFailure': null});
			};

			// LGE
			this.Reboot = function()
			{
				cl('b.js: LGE: Reboot!');

				hcap.power.reboot({
					'onSuccess': function(){
						cl('b.js: LGE: reboot ok');
					},
					'onFailure': function(e){
						cl('b.js: LGE: reboot fail: [' + e.errorMessage + ']');
					}
				});
			};
		} break;

		/*****************************************************************
		* Philips 2K14
		*****************************************************************/
		case 'philips_2k14':
		{
			// PHILIPS 2K14
			this.InitTV = function(_opts)
			{
				var opts = $.extend({
					complete: function(){},
					mode: 'menu' // other is 'signage'
				}, _opts);

				if (this.tvInitialised) {
					cl('b.js: PHI2K14: InitTV: already initialised, return..');
					return;
				}

				$('body').append(
					'<object id="webixpObject" type="application/jswebixp"></object>' +
					'<div id="volumecontrol" style="display:none"></div>'
				);

				// webixpObject is defined globally in common/js/vod/device/utils/philips_2k14.js
				webixpObject = document.getElementById('webixpObject');

				webixpObject.WebIXPOnReceive = philips_WiXPEvent;
				philips_WiXPKeyForward('all', 'InitTV');

				document.addEventListener('OnKeyReceived', philips_KeyHandleProxy, false);

				if (this.deviceModel === '2k17') // x011
				{
					document.addEventListener('keydown', philips_KeyHandleProxy_down, true);
				}
				else // these only seem to work on 2k14 (x009/x010)
				{
					// Don't want these active (NOTE: SmartTV is NOT us, we are SystemUI or CustomDashboard)
					philips_WiXPSetApplication('SmartTV', 'Deactivate');
					philips_WiXPSetApplication('Media', 'Deactivate');
					philips_WiXPSetApplication('DirectShare', 'Deactivate');
				}

				// The delays really do help even if they seem illogical or unnecessary
				// classic philips nonsense..
				setTimeout(function()
				{
					philips_WiXPSetApplication(philips_dashboard_appname, 'Activate');
					setTimeout(function(){
						opts.complete();
					}, 50);
				}, 30);

				// we set this because user-selected inputs remain across all reboots
				// and if the input is HDMI1 and we try to switch to HDMI1 it doesn't work
				// but it does work if the input is MainTuner and then we switch to HDMI1..
				philips_WiXPSetInput('MainTuner');

				setTimeout(function(){
					philips_WiXPGetInput();
				}, 5000);

				var geturl = window.menuUrlPrefix +
					'/api/device_input/type=philips_2k14';

				// prefix done
				$.get(geturl, function(res)
				{
					if (!res || !res.data || !res.data.length)
					{
						cl('b.js: PHI2K14: InitTV: /api/device_input: no device_inputs from DB, use defaults');
						return;
					}

					cl('b.js: PHI2K14: InitTV: /api/device_input: found [' + res.data.length + '] input(s) in DB..');

					// reset arrays since we got some data..
					// globally defined in utils/philips_2k14.js
					philips_inputArray = [];
					philips_inputArrayLabels = [];

					$.each(res.data, function(idx, obj)
					{
						philips_inputArray.push(obj.device_input_sys_name);
						philips_inputArrayLabels.push(obj.device_input_label);
					});
				}, 'json');

				this.InitDRM();

				// setTimeout(function(){
				// 	philips_RequestContentSecurityControl();
				// }, 10000);

				this.tvInitialised = true;
				cl('b.js: PHI2K14: InitTV complete model[' + this.deviceModel + '] svc_ver[' + philips_svc_version + ']');
			};

			// PHILIPS 2K14
			this.InitDRM = function()
			{
				if (!config.drm_vendor || config.drm_vendor === 'none')
				{
					return true;
				}

				// sample from Pieter @ TPV
				// this should normally be commented out!
				// config.drm_aux_key1 = 'bcd45d673d15444751580c5b0f5255e5'; // evenkey
				// config.drm_aux_key2 = '1d4a2da288a1686e7ab3ab81de12cb14'; // oddkey
				// config.drm_aux_key3 = '4a52e7bf45e23d994057c07c1bb7d124905c870ec76924c75810c0fed6414947578496358f91843fe2567a87c23d7266f7fac5a40a2e79baf09d7b26aa764f9012d54ebc023462963cd5e21cd823237db1d2f92f1bda317695e50979724f0f6a6a53d5447a7130f829e44a9214198dd11d3f6fa6e5fb07d49eeb99a6cf29f144'; // sharedkey1
				// config.drm_aux_key4 = '5d48daec5b278d4306ca1d20ffd589090619cc1da47e1a8fa2cdf5b0f094f4967f38484d9b16b0c772104c7d41ba0233bc2874f2bb5ef60c44ce6db4c27fb0b5f21927dc31932ff83b422c303fe03c5c1e4eaab07d7a6572d55c65cf40500d8dad9379e3f5e80742e1ceca5d51143e390bcd58a9e4b3b6ea9892d2170875179d'; // sharedkey2

				if (!config.drm_aux_key1 ||
					!config.drm_aux_key2 ||
					!config.drm_aux_key3 ||
					!config.drm_aux_key4)
				{
					cl('b.js: PHI2K14: InitDRM: missing one or more of the drm_aux_keys configs, return');
					return true;
				}

				if (this.drm_initialised)
				{
					cl('b.js: PHI2K14: InitDRM: already initialised, return');
					return true;
				}

				philips_SetContentSecurityControl({
					'EvenKey': config.drm_aux_key1,
					'OddKey': config.drm_aux_key2,
					'SharedKey': config.drm_aux_key3 + config.drm_aux_key4
				});

				this.drm_initialised = true;
			};

			// PHILIPS 2K14
			this.BroadcastStop = function(opts)
			{
				cl('b.js: PHI2K14: BroadcastStop');

				var settings = $.extend({
					'complete': function(){},
					'rfonly': false,
					'delay': 600
				}, opts);

				if (settings.rfonly && config.iptv_protocol !== 'rf')
				{
					settings.complete();
					return;
				}

				if (!$('#broadcast').length)
				{
					$('body').append('<object id="broadcast" type="video/broadcast"></object>');
				}

				if (!window.broadcast)
				{
					broadcast = document.getElementById('broadcast');
				}

				broadcast.bindToCurrentChannel();

				// does NOT like it when you immediately stop() after bind()..
				// in fact, it can lock up the TV for 10+ seconds so we add a small delay after the bind..
				setTimeout(function(){
					broadcast.stop();
				}, 100);

				// philips does NOT always obey the first stop
				// so we add a 2nd one for those 1 in 10 cases..
				setTimeout(function(){
					broadcast.stop();
					$('object[id=broadcast]').remove();
					broadcast = null;
					settings.complete();
				}, settings.delay);
			};

			// PHILIPS 2K14
			this.onWindowFocus = function()
			{
				// the timeouts prevent quick double/triple calls..
				clearTimeout(this.timers.onWindowFocus);
				this.timers.onWindowFocus = setTimeout(function()
				{
					if (vodMenuApp.bgMediaStatus !== 'none') // there's supposed to media playing
					{
						return;
					}

					// iptv or tv preview..
					if (sinfoTodoThis !== null || tvprevTodoThis !== null || player.playing || iptv.playing)
					{
						return true;
					}

					cl('b.js: PHI2K14: onWindowFocus: GetStatus and StopIPTV');
					philips_WiXPGetTVStatus();
					browser.StopIPTV({
						'force': true
					}, 'b.js->onWindowFocus[philips_2k14]');
				}, 3000);
			};

			// PHILIPS 2K14
			this.InitDeviceMedia = function()
			{
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				philips_WiXPKeyForward('media', 'InitDeviceMedia');

				if (this.deviceModel === '2k14')
				{
					philips_WiXPSetApplication(philips_dashboard_appname, 'Deactivate');
				}

				var that = this;
				setTimeout(function()
				{
					cl('b.js: PHI2K14 Switch to DirectShare/Miracast media mode');

					if (that.deviceModel === '2k17')
					{
						philips_WiXPSetApplication('Miracast', 'Activate');
					}
					else
					{
						philips_WiXPSetApplication('DirectShare', 'Activate');
					}
				}, 1100);
			};

			// PHI2K14
			this.InitDeviceUsb = function()
			{
				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				philips_WiXPKeyForward('media', 'InitDeviceUsb');

				if (this.deviceModel === '2k14')
				{
					philips_WiXPSetApplication(philips_dashboard_appname, 'Deactivate');
				}

				setTimeout(function()
				{
					cl('b.js: PHI2K14 Switch to USB media mode');
					philips_WiXPSetApplication('Media', 'Activate');
				}, 1100);
			};

			// PHILIPS 2K14
			this.PlayEventLoop = function()
			{
				if (video.playState == 5) // finished
				{
					var tmpUrl = browser.curVideoUrl;
					browser.Stop({
						'complete': function() {
							browser.Play(tmpUrl, 0, { 'loop': true });
						}
					});
				}
			};

			// PHILIPS 2K14
			this.Play = function(url, offset, opts)
			{
				browser.curVideoUrl = url;
				var settings = $.extend({
					'loop': false
				}, opts);

				if (video) {
					cl('b.js: PHI2K14: PLAY: url[' + url + '], offset[' + offset + '], loop[' + settings.loop + ']');
					video.data = url;
					video.play(1);

					if (settings.loop) {
						video.onPlayStateChange = this.PlayEventLoop;
					}
				} else {
					cl('b.js: PHI2K14: PLAY ERR[NO VIDEO OBJ]');
				}
			};

			// PHILIPS 2K14
			this.Pause = function()
			{
				cl('b.js: PHI2K14: Pause');

				try {
					video.play(0);
				} catch(e) {
					cl('b.js: PHI2K14: video.play(0) ERR[' + e.message + ']');
				}
			};

			this.Continue = function()
			{
				cl('b.js: PHI2K14: Continue');

				try {
					video.play(1);
				} catch(e) {
					cl('b.js: PHI2K14: video.play(1) ERR[' + e.message + ']');
				}
			};

			// PHILIPS 2K14
			this.Stop = function(opts)
			{
				// don't use 'this' or 'that' here
				cl('b.js: PHI2K14: Stop: curVideoUrl[' + browser.curVideoUrl + ']');

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				if (browser.curVideoUrl === null) // nothing to stop!
				{
					settings.complete();
					return;
				}

				if (video)
				{
					browser.curVideoUrl = null;
					video.onPlayStateChange = null;
					video.stop();
				}
				else
				{
					cl('b.js: PHI2K14: STOP ERR[NO VIDEO OBJ]');
				}

				settings.complete();
			};

			// PHILIPS 2K14
			this.GetPos = function(complete)
			{
				complete = complete || function(){};
				var pos = 0;
				if (window.video) {
					pos = parseInt(video.playPosition / 1000, 10);
				}
				cl('b.js: PHI2K14: GetPos: pos[' + pos + ']');
				complete(pos);
			};

			// PHILIPS 2K14
			this.SetPos = function(sec)
			{
				cl('b.js: PHI2K14: SetPos: sec[' + sec + ']');
				if (window.video && typeof video.seek === 'function') {
					video.seek(sec * 1000);
				}
			};

			// PHILIPS 2K14
			this.GetDuration = function()
			{
				var dur = -1;
				if (window.video) {
					dur = parseInt(video.playTime / 1000, 10);
				}

				cl('b.js: PHI2K14: GetDuration: dur[' + dur + ']');
				return dur;
			};

			// PHILIPS 2K14
			this.TVOn = function()
			{
				philips_WiXPSetPower('On');
				this.power = 'On';
				if (iptv.playing || player.playing)
				{
					// we do resetToStart() instead of reset() in case 'IPTV only' mode is set
					menuPageController.resetToStart();
				}
			};

			// PHILIPS 2K14
			this.TVOff = function()
			{
				philips_WiXPSetPower('Standby');
				this.power = 'Standby';
			};

			// PHILIPS 2K14
			this.PowerToggle = function ()
			{
				var that = this;
				this.togglingPower = function()
				{
					if (that.power === 'On')
					{
						cl('b.js: PH2K14: togglingPower: current state is [' + that.power + '], turn off tv!');
						that.TVOff();
					}
					else
					{
						cl('b.js: PH2K14: togglingPower: current state is [' + that.power + '], transition to on and reload UI in 5sec!');
						that.TVOn();
						setTimeout(function(){
							// we do resetToStart() instead of reset() in case 'IPTV only' mode is set
							menuPageController.resetToStart();
						}, 5000);
					}
				};

				philips_WiXPGetPower();
			};

			// PHILIPS 2K14
			this.MuteToggle = function ()
			{
				var that = this;
				this.togglingMute = function()
				{
					clearTimeout(that.timers.volumeControl);
					var new_mute_state = that.mute === 'On' ? 'Off' : 'On';
					philips_WiXPAudioMute(new_mute_state);
					$('#volumecontrol').html('Mute [' + new_mute_state + ']').show();
					that.timers.volumeControl = setTimeout(function(){
						$('#volumecontrol').hide();
					}, 2000);
				};

				cl('b.js: PHI2K14: MuteToggle');
				philips_WiXPGetAudioState();
			};

			// PHILIPS 2K14
			this.SetVolume = function(level)
			{
				level = parseInt(level, 10);
				clearTimeout(this.timers.volumeControl);

				philips_WiXPAudioVolume(level);
				$('#volumecontrol').html('Vol [' + level + ']').show(0);
				this.timers.volumeControl = setTimeout(function(){
					$('#volumecontrol').hide(0);
				}, 1500);
			};

			// PHILIPS 2K14
			this.VolumeUp = function ()
			{
				clearTimeout(this.timers.volumeControl);
				if (this.volume === null)
				{
					this.volume = 15;
				}

				this.volume = this.volume > 100 ? 100 : this.volume + 1;
				philips_WiXPAudioVolume(this.volume);
				$('#volumecontrol').html('Vol [' + this.volume + ']').show(0);
				this.timers.volumeControl = setTimeout(function(){
					$('#volumecontrol').hide(0);
				}, 1500);
			};

			// PHILIPS 2K14
			this.VolumeDown = function ()
			{
				clearTimeout(this.timers.volumeControl);
				if (this.volume === null)
				{
					this.volume = 15;
				}

				this.volume = this.volume < 1 ? 0 : this.volume - 1;
				philips_WiXPAudioVolume(this.volume);
				$('#volumecontrol').html('Vol [' + this.volume + ']').show();
				this.timers.volumeControl = setTimeout(function() {
					$('#volumecontrol').hide();
				}, 1500);
			};

			// PHILIPS 2K14
			this.PlayIPTV = function(opts)
			{
				var that = this;

				var settings = $.extend({
					'ip': browser.multicast_ip,
					'port': browser.multicast_port ? browser.multicast_port : config.mc_udp_port,
					'number': null, // RF ch #
					'protocol' : browser.iptv_protocol ? browser.iptv_protocol : config.iptv_protocol,
					'left': null,
					'top': null,
					'width': null,
					'height': null
				}, opts);

				// was needed to help 2k17 at some point but works better without it now
				// philips_WiXPSetInput('MainTuner');

				if (settings.protocol.match(/(rtp|udp)/))
				{
					browser.curIptvUrl = settings.protocol + '://' + settings.ip + ':' + settings.port;
					cl('b.js: PHI2K14: PlayIPTV [' + settings.protocol + '://' + settings.ip + ':' + settings.port + ']');
					philips_WiXPSetChannelIP(settings.ip, settings.port);
				}
				else if (settings.protocol === 'rf')
				{
					browser.curIptvUrl = 'rf://' + settings.number;
					cl('b.js: PHI2K14: PlayIPTV [rf://' + settings.number + ']');
					philips_WiXPSetChannel(settings.number);
				}

				this.PhilipsPipResize = function(caller)
				{
					cl('b.js: PHI2K14: '+caller+': settings.left['+settings.left+'], top['+settings.top+'], w['+settings.width+'], h['+settings.height+']');
					// cl('b.js: PHI2K14: PhilipsPipResize #broadcast.length[' + $('object[id=broadcast]').length + ']');
					// cl('b.js: PHI2K14: PhilipsPipResize css BEFORE left['+$('#broadcast').css('left')+'], top['+$('#broadcast').css('top')+'], w['+$('#broadcast').css('width')+'], h['+$('#broadcast').css('height')+']');

					if (window.broadcast && typeof broadcast.bindToCurrentChannel === 'function')
					{
						cl('b.js: PHI2K14: '+caller+': broadcast.bind..');
						broadcast.bindToCurrentChannel();
					}

					// adjust px up one from original for wacky philips tv
					// which seems to ignore the css position if it thinks
					// it hasn't changed, even though it has..
					var top_px = settings.top.match(/(\d+)px/);
					if (top_px)
					{
						settings.top = (parseInt(top_px[1]) + 1) + 'px';
					}

					$('#broadcast').css({
						'position' : 'fixed',
						'left'     : settings.left,
						'top'      : settings.top,
						'width'    : settings.width,
						'height'   : settings.height
					});

					// cl('b.js: PHI2K14: PhilipsPipResize css AFTER left['+$('#broadcast').css('left')+'], top['+$('#broadcast').css('top')+'], w['+$('#broadcast').css('width')+'], h['+$('#broadcast').css('height')+']');
				};

				if (settings.left !== null)
				{
					// this was to get the first channel resize to work (2k14)
					this.PlayIPTVOnSuccess = this.PhilipsPipResize;

					// this seems to work fine for subsequent PIP resizes (2k14)
					setTimeout(function(){
						that.PhilipsPipResize('PhilipsPipResize[PlayIPTV_500ms]');
					}, 500);
				}
			};

			// PHILIPS 2K14
			this.StopIPTV = function(opts, caller)
			{
				caller = caller || 'not set';

				var settings = $.extend({
					'complete': function(){},
					'force': false
				}, opts);

				cl('b.js: PHI2K14: StopIPTV: curIptvUrl[' + browser.curIptvUrl + '], force[' + settings.force + '], caller[' + caller + ']');

				if (browser.curIptvUrl === null && !settings.force)
				{
					settings.complete();
					return;
				}

				var curIptvIp = null;
				var curIptvPort = null;

				if (browser.curIptvUrl)
				{
					var curIptvUrl_match = browser.curIptvUrl.match(/(?:udp|rtp|multicast):\/\/(\d+\.\d+\.\d+\.\d+)(?::(\d+))?/);
					if (curIptvUrl_match)
					{
						curIptvIp   = curIptvUrl_match[1];
						curIptvPort = curIptvUrl_match[2] || '1234';
					}
				}

				if (curIptvIp && this.deviceModel === '2k17') // x011
				{
					philips_WiXPStopChannel('real_stop', curIptvIp, curIptvPort);
				}
				else
				{
					philips_WiXPStopChannel('psuedo_channel');
				}

				browser.curIptvUrl = null;
				settings.complete();

				// browser.BroadcastStop({
				// 	'complete': settings.complete
				// });
			};
		} break;


		/*****************************************************************
		* Samsung
		*****************************************************************/
		case 'samsung':
		{
			// SAMSUNG
			this.InitTV = function(_opts)
			{
				var opts = $.extend({
					complete: function(){},
					mode: 'menu' // other is 'signage'
				}, _opts);

				if (this.tvInitialised) {
					cl('b.js: SAMSUNG: InitTV: already initialised, return..');
					return;
				}

				$('body').append(
					'<script type="text/javascript" language="javascript" src="$MANAGER_WIDGET/Common/API/Widget.js"></script>' +
					'<script type="text/javascript" language="javascript" src="$MANAGER_WIDGET/Common/API/TVKeyValue.js"></script>' +
					'<script type="text/javascript" language="javascript" src="$MANAGER_WIDGET/Common/API/Plugin.js"></script>' +

					'<object id="pluginWindow" classid="clsid:SAMSUNG-INFOLINK-WINDOW"></object>' +
					'<object id="pluginAppCommon" classid="clsid:SAMSUNG-INFOLINK-APPCOMMON"></object>' +
					'<object id="pluginSEFNAVI" classid="clsid:SAMSUNG-INFOLINK-SEF"></object>' +
					'<object id="pluginSEFDRM" classid="clsid:SAMSUNG-INFOLINK-SEF"></object>' +
					'<object id="pluginSEFTask" classid="clsid:SAMSUNG-INFOLINK-SEF"></object>' +
					'<object id="pluginSEFTV" classid="clsid:SAMSUNG-INFOLINK-SEF"></object>' +
					'<object id="pluginTime" classid="clsid:SAMSUNG-INFOLINK-TIME"></object>' +
					'<object id="pluginTV" classid="clsid:SAMSUNG-INFOLINK-TV"></object>' +
					'<object id="pluginSEFVOL" classid="clsid:SAMSUNG-INFOLINK-SEF"></object>' +
					'<object id="pluginSEFHOTEL" classid="clsid:SAMSUNG-INFOLINK-SEF"></object>' +
					'<object id="pluginSEFWindow" classid="clsid:SAMSUNG-INFOLINK-SEF"></object>' +
					'<div id="volumecontrol" style="display:none"></div>'

					//'<object id="pluginNetwork" classid="clsid:SAMSUNG-INFOLINK-NETWORK"></object>' // injected earlier to get MAC..
				);

				// these are globally defined in common/js/vod/device/utils/samsung.js
				samsungCommon    = $('#pluginAppCommon').get(0); // Key management ops
				samsungSEFNAVI   = $('#pluginSEFNAVI').get(0); // Network event ops and SoftAP ops
				samsungTime      = $('#pluginTime').get(0); // EPG ops
				samsungTV        = $('#pluginTV').get(0); // EPG and TV misc (e.g. get product ID) ops
				samsungSEFTV     = $('#pluginSEFTV').get(0); // Subtitles / Window and source events
				samsungWindow    = $('#pluginWindow').get(0); // RF/Tuner/window size/Input select ops (can often be used in place of TVMW)
				samsungSEFDRM    = $('#pluginSEFDRM').get(0); // 2012 DRM ops / HLS DRM ops
				samsungSEFVOL    = $('#pluginSEFVOL').get(0); // All audio (volume) ops
				samsungSEFHOTEL  = $('#pluginSEFHOTEL').get(0); // Power/reboot ops
				samsungSEFWindow = $('#pluginSEFWindow').get(0); // Subtitles in iptv.js

				samsungSEFTV.Open('TV', '1.000', 'TV');
				samsungSEFTV.Execute('SetEvent', PL_SOURCE_CHANGE_TRIGGER); // needed for source change event to trigger
				samsungSEFTV.Execute('SetEvent', PL_TV_EVENT_CHANGE_POWER_STATE); // needed for power change event to trigger

				samsungSEFVOL.Open('Audio', '1.000', 'Audio');
				samsungSEFHOTEL.Open('HOTEL', '1.000', 'HOTEL');

				var initialSource = samsungWindow.GetSource();

				samsungSEFTV.OnEvent = function (id, p1, p2)
				{
					var a = null;
					var s = null;

					if (p1 == PL_SOURCE_CHANGE_TRIGGER)
					{
						// 'p2' is JSON having three keys: 'parm1', 'parm2' and 'parm3' with 'parm3' having the source changed value (e.g. 45)
						a = eval('(' + p2 + ')');
						s = parseInt(a.parm3);

						switch (s)
						{
							case PL_IPTV_SOURCE:
							case PL_ISP_SOURCE:
							case PL_MEDIA_SOURCE:
								// modify this function just before doing source change
								// This is really only used for the AAx90 model which needed
								// different logic for DRM / Media playing..
								browser.samsungSourceChanged();
								break;
						}
					}
					else if (p1 == PL_TV_EVENT_CHANGE_POWER_STATE)
					{
						// We monitor the power state for the 'Virtual Standby = ON' case
						// where we don't want the user to turn off -> on into blank IPTV channel,
						// rather we want tv on to the main menu (or iptv in iptv only mode).

						// 'p2' is JSON having two keys: 'param1' and 'parm2'.  param1 will be 6 or 7 for OFF or ON
						a = eval('(' + p2 + ')');
						s = parseInt(a.param1);
						switch (s)
						{
							case PL_POWER_ON_EVENT:
								cl('b.js: SAMSUNG: TV OnEvent PL_POWER_ON_EVENT, reset menu');
								// we do resetToStart() instead of reset() in case 'IPTV only' mode is set
								menuPageController.resetToStart();
								break;

							case PL_POWER_OFF_EVENT:
								// This is done to avoid problems where VirtualStandby is ON
								// and the screensaver kicks in when in standby..
								cl('b.js: SAMSUNG: TV OnEvent PL_POWER_OFF_EVENT, disable screensaver');
								ssGlobalTodo.clearSetTimeout();
								ssGlobalTodo.enabled = false;
								break;
						}
					}
					else
					{
						cl('b.js: SAMSUNG: TV OnEvent default id[' + id + '] p1[' + p1 + '] p2[' + p2 + ']');
					}
				};

				this.deviceModel = samsungTV.GetProductCode(1);
				var m = this.deviceModel.match(/^HG\d+(\w+\d+)/);
				if (m)
				{
					this.deviceModel = m[1].toLowerCase(); // e.g. HG32AD690->ad690, HG40AA690_ASIA_DTV -> aa690
				}

				this.iptv_plugin_type = 'IPTV';

				if (this.deviceModel.indexOf('aa') === 0) // AA690 (2012)
				{
					this.iptv_plugin_type = 'Player';

					// still need this once on page load to cover the case
					// where the source is already correct but the stupid TV still
					// needs this to occur (also 43/HTTP is the default and IPTV is far more common)
					samsungWindow.SetSource(PL_IPTV_SOURCE);
				}

				this.samsungEpochTime = samsungTime.ConvertEpochToLocalTime(
					samsungTime.GetEpochTime()
				);

				samsungSEFNAVI.Open('Network', '1.000', 'Network');
				samsungSEFNAVI.OnEvent = samsungNetEvent;

				if (opts.mode === 'signage') {
					this.RegisterKeysSignage();
				} else {
					this.RegisterKeys();
				}

				samsungWidgetAPI = new Common.API.Widget();
				samsungWidgetAPI.sendReadyEvent();
				// put the following in a key handler to block the native event
				// i.e. to prevent the 'RETURN' key from launching the samsung apps app.
				//samsungWidgetAPI.blockNavigation(event);

				if (!stores.getIsBootToIptv() && !iptv.playing &&
					vodMenuApp.menuType === 'vod' && config.device_softap == 1) {
					that.SoftAPControl({
						action: 'enable',
						show_widget: true,
						caller: 'SAMSUNG-InitTV'
					});
				} else if (config.device_softap != 1) {
					that.SoftAPControl({
						action: 'disable',
						show_widget: false,
						caller: 'SAMSUNG-InitTV'
					});
				}

				var lt = new Date();

				this.tvInitialised = true;

				opts.complete();

				cl('b.js: SAMSUNG: InitTV finished, model[' + this.deviceModel + '] time[' + lt + '] etime[' + this.samsungEpochTime + '] s[' + initialSource + ']');
			};

			this.samsungSourceChanged = function()
			{
				cl('b.js: SAMSUNG: Source Changed Event default fn');
			};

			// SAMSUNG
			this.MuteToggle = function ()
			{
				cl('b.js: SAMSUNG: MuteToggle');

				clearTimeout(this.timers.volumeControl);
				if (!this.samsungIsMuted)
				{
					cl('b_i.js toggle mute on');
					//samsungSEFVOL.Execute('SetMute', 0); // 0=MUTE ON
					// Mute seems to crash DM model tizens, so using volume set instead
					samsungSEFVOL.Execute('SetVolume', parseInt(0,10));
					this.samsungIsMuted = true;
				}
				else
				{
					cl('b_i.js toggle mute off');
					//samsungSEFVOL.Execute('SetMute', 1); // 1=MUTE OFF
					// Mute seems to crash DM model tizens, so using volume set instead
					samsungSEFVOL.Execute('SetVolume', parseInt(this.volume,10));
					this.samsungIsMuted = false;
				}

				$('#volumecontrol')
					.html('Mute [' + (this.samsungIsMuted ? 'On' : 'Off') + ']')
					.show();

				this.timers.volumeControl = setTimeout(function(){
					$('#volumecontrol').hide(200);
				}, 2000);
			};


			// SAMSUNG
			this.GetVolume = function()
			{
				return samsungSEFVOL.Execute('GetVolume');
			};

			// SAMSUNG
			this.SetVolume = function(level)
			{
				level = parseInt(level, 10);
				cl('b.js: SAMSUNG: SetVolume[' + level + ']');
				samsungSEFVOL.Execute('SetVolume', level);
			};

			// SAMSUNG
			this.VolumeUp = function ()
			{
				clearTimeout(this.timers.volumeControl);

				var that = this;
				if (that.volume === null)
				{
					var s = that.GetVolume();
					that.volume = s > 100 ? 100 : s + 1;
					that.SetVolume(that.volume);
				}
				else
				{
					that.volume = that.volume > 100 ? 100 : that.volume + 1;
					that.SetVolume(that.volume);
				}

				// NOTE: The OSD is only needed when controlling the volume
				// externally as the native OSD will not show (unlike LG where it does..)
				$('#volumecontrol').html('Vol [' + this.volume + ']').show(0);
				this.timers.volumeControl = setTimeout(function(){
					$('#volumecontrol').hide(0);
				}, 1500);
			};

			// SAMSUNG
			this.VolumeDown = function ()
			{
				clearTimeout(this.timers.volumeControl);

				var that = this;
				if (that.volume === null)
				{
					var s = that.GetVolume();
					that.volume = s < 1 ? 0 : s - 1;
					that.SetVolume(that.volume);
				}
				else
				{
					that.volume = that.volume < 1 ? 0 : that.volume - 1;
					that.SetVolume(that.volume);
				}

				// NOTE: The OSD is only needed when controlling the volume
				// externally as the native OSD will not show (unlike LG where it does..)
				$('#volumecontrol').html('Vol [' + this.volume + ']').show(0);
				this.timers.volumeControl = setTimeout(function(){
					$('#volumecontrol').hide(0);
				}, 1500);
			};

			// SAMSUNG
			this.BroadcastStop = function(opts)
			{
				cl('b.js: SAMSUNG: BroadcastStop');
				opts.complete = opts.complete || function(){};
				opts.complete();
			};

			// SAMSUNG
			this.SoftAPControl = function(opts)
			{
				var settings = $.extend({
					action: 'enable',
					show_widget: true,
					caller: null
				}, opts);

				cl('b.js: SAMSUNG: SoftAPControl: init,' +
					' action[' + settings.action + ']' +
					' show_widget[' + settings.show_widget + ']' +
					' caller[' + settings.caller + ']');

				var ret = null;
				var that = this;

				if (settings.action === 'disable') {
					ret = samsungSEFNAVI.Execute('DisableSoftAP');
					cl('b.js: SAMSUNG: SoftAPControl: Disable [code=' + ret + ']');
					that.softApEnabled = false;
					return;
				}

				if (iptv.playing || vodMenuApp.screensaver.isScreenSaverOn()) {
					cl('b.js: SAMSUNG: SoftAPControl: iptv is playing or screensaver is playing');
					return;
				}

				that.GetLocation(function(room)
				{
					ret = samsungSEFNAVI.Execute('EnableSoftAP');
					cl('b.js: SAMSUNG: SoftAPControl: Enable [code=' + ret + ']');

					var ssid = config.vod_word_for_location + ' ' + room;
					ret = samsungSEFNAVI.Execute('SetTVName', config.vod_word_for_location + ' ' + room); // Set SSID
					cl('b.js: SAMSUNG: SoftAPControl: set TV Name (and SSID) to [' + ssid + '] [code=' + ret + ']');

					ret = samsungSEFNAVI.Execute('SetSoftAPSecurityKeyAutoGeneration', '1');
					cl('b.js: SAMSUNG: SoftAPControl: set WiFi key to auto-regen on reboot [code=' + ret + ']');

					that.softApEnabled = true;

					if (settings.show_widget) {
						that.ShowSoftAPWidget({
							enabled : samsungSEFNAVI.Execute('IsSoftAPEnabled') == '1' ? 'Yes' : 'No',
							ssid    : samsungSEFNAVI.Execute('GetSoftAPSSID'),
							key     : samsungSEFNAVI.Execute('GetSoftAPSecurityKey')
						});
					}
					// was closing samsungSEFNAVI here but we're now using the net events, so leaving it open..
				});
			};

			// SAMSUNG
			this.TVOn = function()
			{
				// VL found this in example code aug 2016, only works when
				// 'virtual standby' feature is enabled..
				samsungSEFHOTEL.Execute('SetPowerOn');
			};

			// SAMSUNG
			this.TVOff = function()
			{
				// The 2014 (AC) models can also be turned off externally with the SDAP protocol.
				samsungSEFHOTEL.Execute('SetPowerOff');
			};

			// SAMSUNG
			this.Reboot = function()
			{
				samsungSEFHOTEL.Execute('SetPowerReboot');
			};

			// SAMSUNG Miracast
			this.InitDeviceMedia = function()
			{
				cl('b.js: SAMSUNG: InitDeviceMedia init');

				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				// Note 1: SoftAP must be disabled for WiFi direct functions to work..
				// Note 2: Network SEF is already open for network event monitoring and
				//         should not be opened or closed here..

				this.SoftAPControl({
					action: 'disable',
					caller: 'SAMSUNG-InitDeviceMedia'
				});

				setTimeout(function()
				{
					// NOTE: This only seems to work if the TV's SoftAP is OFF..
					samsungSEFTask = $('#pluginSEFTask').get(0);
					samsungSEFTask.Open('TaskManager', '1.000', 'TaskManager');
					samsungSEFTask.Execute('RunWIFIDisplay');
					samsungSEFTask.Close();

					cl('b.js: SAMSUNG: InitDeviceMedia done');
				}, 1100);
			};

			// SAMSUNG
			this.InitDeviceUsb = function()
			{
				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				var pt =
						'Ready to load the TV USB media browser.<br/><br/>' +
						'Press HOME or POWER when finished.<br/><br/>' +
						'Press Enter/OK to begin.';

				prompt(pt, {
					'complete': function()
					{
						// if there are problems here, create a new clsid for this..
						samsungSEFTask = $('#pluginSEFTask').get(0);
						samsungSEFTask.Open('NNavi', '1.000', 'NNavi');
						samsungSEFTask.Execute('SendEventToDevice', 41, 0); // 41 = SMART_APP_ALLSHARE_PANEL, 0 = magic number from example..
						samsungSEFTask.Close();
					}
				});
			};

			// SAMSUNG
			this.InitDeviceHDMI = function(input)
			{
				input = input || this.deviceSources.HDMI1;
				cl('b.js: SAMSUNG: InitDeviceHDMI input[' + input + ']');

				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				this.SetupDomForInputSelect();
				this.SetSource(input);
			};

			// SAMSUNG
			this.InitDeviceApp = function(appCode)
			{
				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				appCode = appCode ||
					config.samsung_default_app_code ||
					'121299000101'; // TuneIn Radio last resort default

				/* list of known app codes (15/2/17)
				Facebook - 11091000000
				Twitter - 11091000001
				YouTube - 111299001912
				Accuweather - 11101000001
				MyMusicCloud - 111299001029
				TuneIn Radio - 121299000101
				EuroNews - 111199000420
				Bollywood - 111199000583
				BlackJack Party - 111299002398
				Samsung Apps – 10120000099
				*/

				var pt =
					'Ready to load App.<br/><br/>' +
					'Press Enter/OK to begin. <br/><br/>' +
					'Press EXIT or HOME to exit.<br/><br/>';

				prompt(pt, {
					'complete': function()
					{
						// Launch App.
						// The app must be installed and SmartHub must be enabled and configured
						samsungWidgetAPI.runSearchWidget(appCode, '');
					}
				});
			};

			// SAMSUNG
			this.RegisterKeys = function()
			{
				cl('b.js: SAMSUNG: RegisterKeys init');
				samsungCommon.RegisterAllKey();
				var that = this;

				//samsungCommon.UnregisterAllKey();
				// UnregisterKey(code) are the keys we want the TV to handle (not JS)

				var doRegisterKeys = function()
				{
					if (that.deviceModel.indexOf('DM') >= 0)
					{
						samsungCommon.UnregisterKey(76);
					}
					if (that.deviceModel.indexOf('aa') < 0 &&
						that.deviceModel.indexOf('DM') < 0 &&
						that.deviceModel.indexOf('DB') < 0) {
						// not AA690 (2012 model) or DB32E (SSSP3 signage model)
						// so we only want the native keys for AB-AE models
						cl('b.js: SAMSUNG: RegisterKeys model [' + that.deviceModel + '], use native mute/vol/power');
						samsungCommon.UnregisterKey(7); // vol up
						samsungCommon.UnregisterKey(11); // vol down
						samsungCommon.UnregisterKey(76); // power key
						samsungCommon.UnregisterKey(27); // mute
					} else {
						cl('b.js: SAMSUNG: RegisterKeys model [' + that.deviceModel + '], use JS for mute/vol/power');
					}

					if (config.device_internal_source_enabled == 1) {
						samsungCommon.UnregisterKey(222); // source key
					}

					if (config.device_internal_menu_enabled == 1) {
						samsungCommon.UnregisterKey(262); // menu
					}
				};

				doRegisterKeys();

				// it doesn't always work (grrr..), so kick it again after 5s..
				setTimeout(doRegisterKeys, 5000);
			};

			// SAMSUNG
			// This is here for some models power off key to work
			// because we cannot "unregister" the discrete power off key
			this.RegisterKeysSignage = function()
			{
				cl('b.js: SAMSUNG: RegisterKeysSignage init');
				var that = this;

				// don't do UnregisterAllKey as it will also unregister the number/nav/ok
				// keys which are registered by default (we need them for maintenance mode)
				// samsungCommon.UnregisterAllKey();

				var doRegisterKeys = function()
				{
					if (that.deviceModel.indexOf('aa') === 0 ||
						that.deviceModel.indexOf('DM') === 0 ||
						that.deviceModel.indexOf('DB') === 0) {
						// AA or DBE model, register volume/power/mute
						cl('b.js: SAMSUNG: RegisterKeysSignage model [' + that.deviceModel + '], use JS for mute/vol/power');
						samsungCommon.RegisterKey(7); // vol up
						samsungCommon.RegisterKey(11); // vol down
						if (that.deviceModel.indexOf('DM') !== 0)
						{
							samsungCommon.RegisterKey(76); // power key
						}
						samsungCommon.RegisterKey(27); // mute
					} else {
						cl('b.js: SAMSUNG: RegisterKeysSignage model [' + that.deviceModel + '], use native mute/vol/power');
					}

					// these are the only these keys for signage
					samsungCommon.RegisterKey(108); // RMT_RED - go to maintenance
					samsungCommon.RegisterKey(22); // RMT_BLUE - reload page
					samsungCommon.RegisterKey(21); // RMT_YELLOW - exit from maintenance
				};

				doRegisterKeys();

				// it doesn't always work (grrr..), so kick it again after 5s..
				setTimeout(doRegisterKeys, 5000);
			};

			// SAMUNG
			this.onWindowFocus = function()
			{
				this.onWindowFocusSamsung();
			};

			// SAMSUNG
			this.InitDRM = function(opts)
			{
				if (config.iptv_enabled !== '1')
				{
					return true;
				}

				if (!config.drm_server)
				{
					return true;
				}

				if (!config.drm_vendor || config.drm_vendor === 'none')
				{
					return true;
				}

				if (this.drm_initialised)
				{
					cl('b.js: SAMSUNG: InitDRM: already initialised, return');
					return true;
				}

				var settings = $.extend({
					'opensef': true,
					'closesef': true
				}, opts);

				var lt = new Date();
				cl('b.js: SAMSUNG: InitDRM: vendor[' + config.drm_vendor + '] server[' + config.drm_server + '], etime[' + this.samsungEpochTime + '] lt[' + lt + ']');

				switch (config.drm_vendor)
				{
					case 'verimatrix':
					{
						if (this.deviceModel.indexOf('aa') === 0) // AA690 (2012)
						{
							cl('b.js: SAMSUNG: InitDRM: 2012 [' + this.deviceModel + ']');
							try {
								samsungSEFDRM.Open('DRM', '1.000', 'DRM');
								samsungSEFDRM.OnEvent = function(id, p1, p2)
								{
									cl('b.js: *** Samsung 2012 (AA) model SEFDRM EVENT!! id['+id+'] p1['+p1+'] p2['+p2+'] ***');
								};
								// CAS Initialize, 3=VERIMATRIX, 4=LYNK

								// works but this does not match the API spec/docs
								samsungSEFDRM.Execute('Initialize', '3', config.drm_company_name, config.drm_server + '|w=');
								//samsungSEFDRM.Execute('Initialize', '3', 'VodPtv', 'verimatrix.vod.net.au|w=');

								// the following is per the documentation but the TV tries to look up
								// 'i=1.2.3.4' instead of just connecting to '1.2.3.4' ..
								// samsungSEFDRM.Execute('Initialize', '3', config.drm_company_name, 'i=' + config.drm_server + '|w=');

								// cannot close because it is used for each channel change!
								//samsungSEFDRM.Close('DRM', '1.000', 'DRM');
							} catch(e) {
								cl('b.js: SAMSUNG: InitDRM: 2012 [' + this.deviceModel + '] ERR[' + e.message + ']');
							}

							this.drm_initialised = true;
						}
						else
						{
							cl('b.js: SAMSUNG: InitDRM: 2013+ [' + this.deviceModel + ']');

							var drmData = {
								'useLastChannelView': 'n',
								'drmCompany': 'VERIMATRIX', // must be uppercase..
								'drmServer': config.drm_company_name + '|i=' + config.drm_server + '|w='
							};

							if (settings.opensef)
							{
								cl('b.js: SAMSUNG: InitDRM SEF OPEN [VMX DRM]');
								samsungSEFDRM.Open('IPTV', '1.000', 'IPTV');
							}

							try {
								samsungSEFDRM.Execute('SetIPTVConfig', config.drm_company_name, JSON.stringify(drmData));
							} catch(e) {
								cl('b.js: SAMSUNG: InitDRM: VMX ERR[' + e.message + ']');
							}

							// Needed for ABx90, works on ACx90/ADx90 also
							try {
								samsungSEFDRM.Execute('SetDRMInfo', 'VERIMATRIX', config.drm_company_name + '|i=' + config.drm_server + '|w=');
							} catch(e) {
								cl('b.js: SAMSUNG: InitDRM: SetDRMInfo VMX ERR[' + e.message + ']');
							}

							if (settings.closesef)
							{
								cl('b.js: SAMSUNG: InitDRM SEF CLOSE [VMX DRM]');
								samsungSEFDRM.Close();
							}

							this.drm_initialised = true;
						}
					} break;

					case 'lynk':
					{
						if (this.deviceModel.indexOf('aa') === 0) // AA690 (2012)
						{
							cl('b.js: SAMSUNG: InitDRM: 2012 [' + this.deviceModel + ']');
							try {
								samsungSEFDRM.Open('DRM', '1.000', 'DRM');
								// CAS Initialize, 3=VERIMATRIX (4=LYNK)
								samsungSEFDRM.Execute('Initialize', '4', 'LYNK', 'i=|w=');
							} catch(e) {
								cl('b.js: SAMSUNG: InitDRM: 2012 [' + this.deviceModel + '] ERR[' + e.message + ']');
							}
							//samsungSEFDRM.Close('DRM', '1.000', 'DRM');

							this.drm_initialised = true;
						}
						else
						{
							if (settings.opensef)
							{
								cl('b.js: SAMSUNG: InitDRM SEF OPEN [LYNK DRM]');
								samsungSEFDRM.Open('IPTV', '1.000', 'IPTV');
							}

							try {
								samsungSEFDRM.Execute('SetDRMInfo', 'LYNK', config.drm_server); // note: set drm_server to 'NONE' for IKUSI
							} catch(e) {
								cl('b.js: SAMSUNG: InitDRM: SetDRMInfo LYNK ERR[' + e.message + ']');
							}

							if (settings.closesef)
							{
								cl('b.js: SAMSUNG: InitDRM SEF CLOSE [LYNK DRM]');
								samsungSEFDRM.Close();
							}

							this.drm_initialised = true;
						}
					} break;
				}
			};

			// SAMSUNG
			this.GetPos = function(complete)
			{
				complete = complete || function(){};
				// This is set by 'OnCurrentPlayTime' event
				// this only works when player.* is active
				// and is only here for compatibility reasons
				complete(player.currentPosSec);
			};

			// There is no native samsung 'Set Position' function. Some notes:
			// - use 'video.ResumePlay(url, offset)' instead..
			// - skip forward/back with video.JumpForward()/JumpBackward()
			// SAMSUNG
			this.SetPos = function(seconds)
			{
				if (browser.curVideoUrl && video)
				{
					video.ResumePlay(browser.curVideoUrl, seconds);
				}
			};

			// SAMSUNG
			this.GetDuration = function()
			{
				return parseInt(video.GetDuration() / 1000, 10);
			};

			// SAMSUNG
			this.Play = function(url, offset, opts)
			{
				var that = this;

				browser.curVideoUrl = url;
				var settings = $.extend({
					'loop'     : false,
					'complete': function(){},
					'left'     : null,
					'top'      : null,
					'width'    : null,
					'height'   : null
				}, opts);

				var playInit = function()
				{
					if (url.match(/\.m3u8$/)) {
						url += '|COMPONENT=HLS';
					} else if (url.match(/\.mpd$/)) {
						url += '|COMPONENT=HAS';
					}

					cl('b.js: SAMSUNG: PLAY: url[' + url + '], offset[' + offset + '], loop[' + settings.loop + ']');

					if (offset && offset > 0) {
						video.ResumePlay(url, offset);
						video.StartPlayback();
					} else {
						video.InitPlayer(url);
						video.StartPlayback();
					}

					var dm = null;
					if (settings.left !== null)
					{
						dm = that.ConvertDimensions(
							'http', // dimensions will change dep on prot (rtp/udp=1920x1080, http/rf=960x540)
							settings.left,
							settings.top,
							settings.width,
							settings.height
						);

						try {
							samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h);
							video.SetDisplayArea(dm.x, dm.y, dm.w, dm.h);
						} catch(e) {
							cl('b.js: SAMSUNG: PLAY: SetDisplay/Screen ERR[' + e.message + ']');
						}
					}

					if (settings.loop)
					{
						video.OnRenderingComplete = function()
						{
							browser.Play(browser.curVideoUrl, 0, {loop:true});
						};
					}

					settings.complete();
				};

				if (this.deviceModel.indexOf('aa') === 0) // AA690 (2012)
				{
					browser.samsungSourceChanged = playInit;
					// triggers samsungTV event that calls above fn..
					var currentSource = parseInt(samsungWindow.GetSource(), 10);
					if (currentSource != PL_MEDIA_SOURCE)
					{
						//cl('b.js: SAMSUNG: PLAY: current source['+currentSource+'] not PL_MEDIA_SOURCE['+PL_MEDIA_SOURCE+'], SET');
						samsungWindow.SetSource(PL_MEDIA_SOURCE);
					}
					else
					{
						//cl('b.js: SAMSUNG: PLAY: current source['+currentSource+'] is PL_MEDIA_SOURCE['+PL_MEDIA_SOURCE+'], PLAY');
						playInit();
					}
				}
				else // 2013+
				{
					cl('b.js: SAMSUNG: PLAY: AB+ model, PLAY');
					playInit();
				}
			};

			// SAMSUNG
			this.Stop = function(opts)
			{
				// don't use 'this' or 'that' here
				cl('b.js: SAMSUNG: Stop: curVideoUrl[' + browser.curVideoUrl + ']');

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				if (browser.curVideoUrl === null) // nothing to stop!
				{
					settings.complete();
					return;
				}

				browser.curVideoUrl = null;

				try {
					video.Stop();
					video.OnRenderingComplete   = function(){};
					video.OnConnectionFailed    = function(){};
					video.OnNetworkDisconnected = function(){};
					video.OnRenderError         = function(){};
				} catch(e) {
					cl('b.js: SAMSUNG: Stop err[' + e.message + ']');
				}

				settings.complete();
			};

			// SAMSUNG
			this.ConvertDimensions = function(protocol, x, y, w, h)
			{
				// dimensions of Samsung TV window in HTTP and RF modes
				var def_w = 960;
				var def_h = 540;

				// rtp/udp and NOT AAx90 [2012] model range
				if (protocol.match(/(rtp|udp)/) && this.deviceModel.indexOf('aa') < 0)
				{
					// dimensions of Samsung TV window in IPTV (RTP/UDP) mode
					def_w = 1920;
					def_h = 1080;
				}

				//cl('b.js: SAMSUNG: ConvertDimensions 1 x['+x+'] y['+y+'] w['+w+'] h['+h+']');

				x = (def_w / $(window).width())  * x.toString().replace('px', ''); // left
				y = (def_h / $(window).height()) * y.toString().replace('px', ''); // top
				w = (def_w / $(window).width())  * w.toString().replace('px', ''); // width
				h = (def_h / $(window).height()) * h.toString().replace('px', ''); // height

				//cl('b.js: SAMSUNG: ConvertDimensions 2 x['+x+'] y['+y+'] w['+w+'] h['+h+']');

				return {'x': x, 'y': y, 'w': w, 'h': h};
			};

			// SAMSUNG
			// 'core' videowindow only..
			this.ResizeVideoWindow = function(x, y, w, h, complete) // left,top,width,height
			{
				x = x || 0;
				y = y || 0;
				w = w || $(window).width();
				h = h || $(window).height();
				complete = complete || function(){};

				// this is only called once in InputSelect
				// which uses the 960x540 video plane.
				// we pass 'rf' to ensure that mode is used..

				//cl('b.js: SAMSUNG: ResizeVideoWindow 1 x['+x+'] y['+y+'] w['+w+'] h['+h+']');

				var dm = this.ConvertDimensions('rf', x, y, w, h);
				samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h);

				complete();
			};

			// SAMSUNG
			this.SetVideoWindow = function(opts)
			{
				var that = this;
				// note: context buttons have zindex of 950
				var settings = $.extend({
					'container'        : 'body', // where to put the wrapper (not the video object), e.g. body, dbcontent, etc
					'opensef'          : true,
					'closesef'         : this.deviceModel.indexOf('aa') === 0 ? false : true, // don't close by default for AAx90 [2012] models
					'protocol'         : 'http',
					'position'         : 'fixed',
					'visibility'       : 'visible',
					'z-index'          : -1, // good default for iptv/ss modes, play/info require >= 500
					'left'             : 0,
					'top'              : 0,
					'width'            : $(window).width(),
					'height'           : $(window).height(),
					'box-shadow'       : 'none',
					'border'           : 'none',
					'border-radius'    : 0,
					'background-color' : '#000',
					'show_hide'        : null, // really, this is 'go to black screen'
					'remove'           : false,
					'complete'         : function(){}
				}, opts);

				if (!this.iptv_plugin_type)
				{
					cl('b.js: SAMSUNG: SVW: ERROR: TV not initialised, ignoring this call.');
					return;
				}

				var mode = 'unicast';
				var video_wrap = '#player_wrap';

				if ($.inArray(settings.protocol, ['udp', 'rtp', 'rf']) > -1)
				{
					mode = 'multicast'; // technically linear because we support rf/hls in this 'mode'
					video_wrap = '#multicast_wrap'; // no default OSD
				}

				if (settings.remove)
				{
					cl('b.js: SAMSUNG: SVW: remove!');

					// if it was inside a container, move it back to body
					// for other non-play specific ops (e.g. input select)
					$('#pluginWindow').appendTo('body').css({
						'visibility': 'hidden'
					});

					$('#pluginSEF, #pluginPlayer').remove();
					$('#player_wrap, #multicast_wrap').remove();

					video = null;
					samsungSEF = null;
					return;
				}

				cl('b.js: SAMSUNG: SVW: m['+mode+'] p['+settings.protocol+'] w['+video_wrap+'] sh['+settings.show_hide+']');

				// runs last..
				var fn = function()
				{
					// show/hide toggle with no other ops (to replace old VideoShow/VideoHide)
					if (settings.show_hide)
					{
						$('#pluginSEF, #pluginPlayer').css({
							'visibility': settings.show_hide === 'show' ? 'visible' : 'hidden'
						});

						return;
					}

					$(video_wrap).css({
						'position'         : settings.position,
						'visibility'       : settings.visibility,
						'display'          : settings.display,
						'left'             : settings.left,
						'top'              : settings.top,
						'width'            : settings.width,
						'height'           : settings.height,
						'border'           : settings.border,

						'z-index'          : settings['z-index'],
						'box-shadow'       : settings['box-shadow'],
						'border-radius'    : settings['border-radius'],
						'background-color' : settings['background-color']
					});

					// cl('b.js: SAMSUNG: SVW: pre x['+settings.left+'] y['+settings.top+'] w['+settings.width+'] h['+settings.height+']');

					// skip AAx90 model here because of issues with playback
					// and because we do window size on each play call
					// _EXCEPT FOR_ info window resize needs this doofus..
					// if (that.deviceModel.indexOf('aa') === 0) // AA690 (2012)
					// {
					// 	settings.complete();
					// 	return;
					// }

					var dm = that.ConvertDimensions(
						settings.protocol,
						settings.left,
						settings.top,
						settings.width,
						settings.height
					);

					cl('b.js: SAMSUNG: SVW: p['+settings.protocol+'] x['+dm.x+'] y['+dm.y+'] w['+dm.w+'] h['+dm.h+']');

					if (settings.protocol.match(/(rtp|udp)/))
					{
						try {
							if (settings.opensef && !that.samsungSEFIsOpen)
							{
								cl('b.js: SAMSUNG: SVW: SEF OPEN [' + that.iptv_plugin_type + '][SetDisplayArea]');
								samsungSEF.Open(that.iptv_plugin_type, '1.000', that.iptv_plugin_type);
								that.samsungSEFIsOpen = true;
							}

							if (that.deviceModel.indexOf('aa') === 0)
							{
								samsungSEF.Execute('SetDisplayArea', dm.x, dm.y, dm.w, dm.h);
								samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h);
							}
							else
							{
								samsungSEF.Execute('SetPlayerWindow', 0, dm.x, dm.y, dm.w, dm.h);
							}

							if (settings.closesef && that.samsungSEFIsOpen)
							{
								cl('b.js: SAMSUNG: SVW: SEF CLOSE [' + that.iptv_plugin_type + '][SetDisplayArea]');
								samsungSEF.Close();
								that.samsungSEFIsOpen = false;
							}
						} catch(e) {
							cl('b.js: SAMSUNG: SVW: RTP/UDP [SetPlayerWindow] ERR[' + e.message + '] t[' + typeof samsungSEF + ']');
						}
					}
					else if (settings.protocol === 'rf') // RF "iptv" mode, the dimensions will be calculated differently (960x540 vs 1920x1080)
					{
						try {
							browser.samsungSourceChanged = function(){};
							samsungWindow.SetSource(PL_TV_SOURCE);
							samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h); // reset native TV window back to full screen
						} catch(e) {
							cl('b.js: SAMSUNG: SVW: RF ERR[' + e.message + '] t[' + typeof samsungWindow + ']');
						}
					}
					else // HTTP / VOD / Unicast mode..
					{
						try {
							samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h);
							video.SetDisplayArea(dm.x, dm.y, dm.w, dm.h);
						} catch(e) {
							cl('b.js: SAMSUNG: SVW: UNICAST ERR[' + e.message + '] t1[' + typeof samsungWindow + '] t2[' + typeof video + ']');
						}
					}

					settings.complete();
				};

				if (!$(video_wrap).length)
				{
					// cl('b.js: SAMSUNG: SVW: mode['+mode+'], wrap['+video_wrap+'] does not exist, add and do fn()');
					if (mode === 'multicast') // linear, covers rtp/udp/hls/rf..
					{
						$('#player_wrap').remove();

						$(settings.container).append(
							'<div id="multicast_wrap">' +
								'<object id="pluginSEF" classid="clsid:SAMSUNG-INFOLINK-SEF"></object>' +
							'</div>'
						);

						if (settings.protocol === 'rf')
						{
							$('#pluginWindow').css({
								'top': 0,
								'left': 0,
								'position': 'absolute',
								'visibility': 'visible'
							}).appendTo('#multicast_wrap');
						}

						// used for both IPTV (2013+) and Player (2012)
						samsungSEF = document.getElementById('pluginSEF');
						fn();
					}
					else // interactive, covers rtsp/http
					{
						// prefix not required
						$('#multicast_wrap').remove();
						$(settings.container).append(iptvTemplates.getPlayerHtml());
						// #player_wrap div is built in getPlayerHtml()
						$('#player_wrap').append(
							'<object id="pluginPlayer" classid="clsid:SAMSUNG-INFOLINK-PLAYER"></object>'
						);
						video = document.getElementById('pluginPlayer');
						fn();
					}
				}
				else
				{
					// cl('b.js: SAMSUNG: SVW: mode['+mode+'], wrap['+video_wrap+'] found, do fn()');
					fn();
				}
			};

			// SAMSUNG
			this.Pause = function()
			{
				video.Pause();
			};

			// SAMSUNG
			this.Continue = function()
			{
				video.SetPlaybackSpeed(1);
				video.Resume();
			};

			// SAMSUNG
			this.StopIPTV = function(opts, caller)
			{
				caller = caller || 'not set';

				var settings = $.extend({
					'opensef': true,
					'closesef': true,
					'complete': function(){},
					'force': false
				}, opts);

				if (!this.iptv_plugin_type)
				{
					cl('b.js: SAMSUNG: StopIPTV: ERROR: TV not initialised, ignoring this call.');
					return;
				}

				cl('b.js: SAMSUNG: StopIPTV: [' + this.iptv_plugin_type + '] curIptvUrl[' + browser.curIptvUrl + '], force[' + settings.force + '], caller[' + caller + ']');

				if (browser.curIptvUrl === null && !settings.force)
				{
					settings.complete();
					return;
				}

				if (browser.curIptvUrl === null)
				{
					// can get here if 'force': true
					browser.curIptvUrl = config.iptv_protocol + '://force';
				}

				if (browser.curIptvUrl.match(/^(rtp|udp):/))
				{
					try {
						if (settings.opensef && !this.samsungSEFIsOpen)
						{
							cl('b.js: SAMSUNG: StopIPTV SEF OPEN');
							samsungSEF.Open(this.iptv_plugin_type, '1.000', this.iptv_plugin_type);
							this.samsungSEFIsOpen = true;
						}

						if (browser.deviceModel.indexOf('aa') === 0) // AA690 (2012)
						{
							if (config.drm_vendor !== 'none' && config.drm_server)
							{
								samsungSEFDRM.Execute('Stop');
							}
							samsungSEF.Execute('Stop'); // works fine in IPTV mode..
						}
						else
						{
							samsungSEF.Execute('StopCurrentChannel', 0);
							samsungSEF.Execute('FreeNowPlayingInfo', 0);
						}

						if (settings.closesef && this.samsungSEFIsOpen)
						{
							cl('b.js: SAMSUNG: StopIPTV SEF CLOSE');
							samsungSEF.Close();
							this.samsungSEFIsOpen = false;
						}
					} catch(e) {
						cl('b.js: SAMSUNG: StopIPTV: ERROR [' + e.message + ']');
					}
				}
				else // if we we're in RF mode, just set source BACK to HTV mode which stops the RF tuner..
				{
					browser.samsungSourceChanged = function(){};
					if (this.deviceModel.indexOf('aa') === 0)
					{
						samsungWindow.SetSource(PL_IPTV_SOURCE); // 45 = IPTV (AA only)
					}
					else
					{
						samsungWindow.SetSource(PL_ISP_SOURCE); // 48 = H.Browser (I think)..
					}
				}

				browser.curIptvUrl = null;
				settings.complete();
			};

			// SAMSUNG
			this.PlayIPTV = function(opts) // technically, this should be 'playLinear()'
			{
				var settings = $.extend({
					'opensef' : true,
					// don't close by default for AAx90 [2012] models
					'closesef' : this.deviceModel.indexOf('aa') === 0 ? false : true,
					'ip'       : this.multicast_ip,
					'port'     : this.multicast_port ? this.multicast_port : config.mc_udp_port,
					'protocol' : this.iptv_protocol ? this.iptv_protocol : config.iptv_protocol,
					'number'   : null, // RF ch #
					'left'     : null,
					'top'      : null,
					'width'    : null,
					'height'   : null,
					'encrypted': false
				}, opts);

				if (!this.iptv_plugin_type)
				{
					cl('b.js: SAMSUNG: PlayIPTV: ERROR: TV not initialised [rtp://' + settings.ip + ':' + settings.port + '], ignoring this call.');
					return;
				}

				// this is to ensure we do the init drm before any channels are played
				// otherwise lynk doesn't work..
				if (config.drm_vendor === 'lynk')
				{
					this.InitDRM();
				}

				var dm = null;
				if (settings.left !== null)
				{
					dm = this.ConvertDimensions(
						settings.protocol, // dimensions will change dep on mode (rtp/udp=1920x1080, http/rf=960x540)
						settings.left,
						settings.top,
						settings.width,
						settings.height
					);
				}

				if (settings.protocol.match(/(rtp|udp)/))
				{
					var url_suffix = '|HW|NO_RTCP';

					if (config.drm_vendor === 'lynk')
					{
						url_suffix += '|LYNK|TYPE=1';
					}

					var url = 'rtp://' + settings.ip + ':' + settings.port + url_suffix;

					try {
						if (settings.opensef && !this.samsungSEFIsOpen)
						{
							cl('b.js: SAMSUNG: PlayIPTV SEF OPEN [' + this.iptv_plugin_type + '][Play]');
							samsungSEF.Open(this.iptv_plugin_type, '1.000', this.iptv_plugin_type);
							this.samsungSEFIsOpen = true;
						}

						if (this.deviceModel.indexOf('aa') === 0) // AA690 (2012)
						{
							if (!browser.curIptvUrl)
							{
								browser.samsungSourceChanged = function()
								{
									if (config.drm_vendor !== 'none' && config.drm_server && settings.encrypted)
									{
										cl('b.js: SAMSUNG: PlayIPTV [InitPlayer][' + url + '] with encryption');
										samsungSEFDRM.Execute('Start', url);
									}
									else
									{
										cl('b.js: SAMSUNG: PlayIPTV [InitPlayer][' + url + '] NO encryption');
									}

									samsungSEF.Execute('InitPlayer', url);
									samsungSEF.Execute('StartPlayback');
									browser.curIptvUrl = url;

									if (dm)
									{
										samsungSEF.Execute('SetDisplayArea', dm.x, dm.y, dm.w, dm.h);
										samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h);
										cl('b.js: SAMSUNG: PlayIPTV [SetDisplayArea] x['+dm.x+'] y['+dm.y+'] w['+dm.w+'] h['+dm.h+']');
									}
								};

								// triggers samsungTV event that calls 'samsungSourceChanged()' above
								samsungWindow.SetSource(PL_IPTV_SOURCE);
							}
							else // existing/playing URL
							{
								if (config.drm_vendor !== 'none' && config.drm_server)
								{
									cl('b.js: SAMSUNG: 2012 PlayIPTV DRM ChangePlayingURL [' + url + '] enc[' + settings.encrypted + ']');
									samsungSEFDRM.Execute('Stop');
									samsungSEF.Execute('ChangePlayingURL', url, '19', '28', '-1', '-1', '-1');
									if (settings.encrypted)
									{
										// this must be AFTER ChangePlayingURL as per Samsung support May 2016
										samsungSEFDRM.Execute('Start', url);
									}
								}
								else  // existing/playing URL and no DRM enabled
								{
									samsungSEF.Execute('ChangePlayingURL', url, '19', '28', '-1', '-1', '-1');
									browser.curIptvUrl = url;
									cl('b.js: SAMSUNG: PlayIPTV [ChangePlayingURL][' + url + ']');
								}

								if (dm)
								{
									samsungSEF.Execute('SetDisplayArea', dm.x, dm.y, dm.w, dm.h);
									samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h);
									cl('b.js: SAMSUNG: PlayIPTV [SetDisplayArea] x['+dm.x+'] y['+dm.y+'] w['+dm.w+'] h['+dm.h+']');
								}
							}
						}
						else // 2013+
						{
							cl('b.js: SAMSUNG: PlayIPTV [SetTuneURL][' + url + ']');

							samsungSEF.Execute('SetTuneURL', url, 0);
							browser.curIptvUrl = url;

							if (dm)
							{
								samsungSEF.Execute('SetPlayerWindow', 0, dm.x, dm.y, dm.w, dm.h);
							}
						}

						if (settings.closesef && this.samsungSEFIsOpen)
						{
							cl('b.js: SAMSUNG: PlayIPTV SEF CLOSE [' + this.iptv_plugin_type + '][Play]');
							samsungSEF.Close();
							this.samsungSEFIsOpen = false;
						}
					} catch(e) {
						cl('b.js: SAMSUNG: PlayIPTV [' + this.iptv_plugin_type + '][Play] ERR[' + e.message + ']');
					}
				}
				else if (settings.protocol === 'rf')
				{
					browser.curIptvUrl = 'rf://' + settings.number;
					cl('b.js: SAMSUNG: PlayIPTV [rf://' + settings.number + ']');

					if (dm)
					{
						//cl('b.js: SAMSUNG: PlayIPTV: RF dim x['+dm.x+'] y['+dm.y+'] w['+dm.w+'] h['+dm.h+']');
						samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h);
					}

					samsungWindow.SetChannel(parseInt(settings.number), -2); // -2 is an unknown, hard-coded constant (magic number) that works
				}
				else // assume http/hls
				{
					try {
						video.Stop();
					} catch(e) {}

					var web_ip =
						config.mobile_iptv_server_ip ?
						config.mobile_iptv_server_ip :
						location.host; // can use host instead of hostname, no special port logic used here

					var p_url = 'http://' + web_ip + '/content/tv/' + settings.ip + '.mp4';

					if (settings.protocol === 'hls')
					{
						p_url = 'http://' + web_ip + '/hls/master-' + settings.ip + '.m3u8|COMPONENT=HLS';
					}

					cl('b.js: SAMSUNG: PlayIPTV [' + p_url + ']');

					try {
						video.InitPlayer(p_url);
						video.StartPlayback();
					} catch(e) {
						cl('b.js: SAMSUNG: PlayIPTV HTTP err [' + e.message + ']');
					}

					if (dm)
					{
						try {
							samsungWindow.SetScreenRect(dm.x, dm.y, dm.w, dm.h);
							video.SetDisplayArea(dm.x, dm.y, dm.w, dm.h);
						} catch(e) {
							cl('b.js: SAMSUNG: PlayIPTV Set dimensions err [' + e.message + ']');
						}
					}
				}
			};

			//
			// Input select start for SAMSUNG
			//

			this.deviceSources = {
				TV      : 0,
				ATV     : 1,
				DTV     : 2,
				CATV    : 3,
				CDTV    : 4,
				PATV    : 5,
				PDTV    : 6,
				SDTV    : 7,
				BSDTV   : 8,
				CS1DTV  : 9,
				CS2DTV  : 10,
				ATV1    : 11,
				ATV2    : 12,
				DTV1    : 13,
				DTV2    : 14,
				AV1     : 15,
				AV2     : 16,
				AV3     : 17,
				AV4     : 18,
				SVIDEO1 : 19,
				SVIDEO2 : 20,
				SVIDEO3 : 21,
				SVIDEO4 : 22,
				COMP1   : 23,
				COMP2   : 24,
				COMP3   : 25,
				COMP4   : 26,
				PC1     : 27,
				PC2     : 28,
				PC3     : 29,
				PC4     : 30,
				HDMI1   : 31,
				HDMI2   : 32,
				HDMI3   : 33,
				HDMI4   : 34,
				SCART1  : 35,
				SCART2  : 36,
				SCART3  : 37,
				SCART4  : 38,
				DVI1    : 39,
				DVI2    : 40,
				DVI3    : 41,
				DVI4    : 42,
				MEDIA   : 43,
				HOMING  : 44,
				NONE    : 47,
				HTV     : 48, // from samsung source code
				MENU    : 48,
				MIRACAST: 99 // a psuedo ID
			};

			if (this.deviceModel.indexOf('aa') === 0)
			{
				this.deviceSources.HTV = 45;
			}

			this.curInputFound = false;
			this.curInputSel = 0; // IDX of the array below
			this.inputSelTimer = setTimeout(function(){});
			this.TunedSource = '';

			// SAMSUNG
			this.GetSource = function()
			{
				this.TunedSource = samsungWindow.GetSource();
				cl('b.js: SAMSUNG: GetSource: TunedSource[' + this.TunedSource + ']');
				//this.TunedSource = 48;
			};

			// SAMSUNG
			this.SetSource = function(input)
			{
				cl('b.js: SAMSUNG: SetSource to input[' + input + ']');
				browser.samsungSourceChanged = function(){};
				return samsungWindow.SetSource(input);
			};

			// defaults that can be overridden by the DB values
			// SAMSUNG
			this.inputArray = [
				'MENU',
				'TV',
				'HDMI1',
				'HDMI2',
				'HDMI3',
				'AV1',
				'PC1',
				'MEDIA', // USB
				'MIRACAST'
			];

			// defaults that can be overridden by the DB values
			// SAMSUNG
			this.inputArrayLabels = [
				'MENU',
				'TV',
				'HDMI1',
				'HDMI2',
				'HDMI3',
				'AV1',
				'PC1',
				'USB MEDIA',
				'MIRACAST'
			];

			var that = this;

			geturl = window.menuUrlPrefix +
				'/api/device_input/type=samsung';

			// prefix done
			$.get(geturl, function(res)
			{
				if (!res || !res.data || !res.data.length)
				{
					cl('b.js: SAMSUNG: no device_inputs from DB, use defaults');
					return;
				}

				cl('b.js: SAMSUNG: /api/device_input: found [' + res.data.length + '] input(s) in DB..');

				// reset arrays since we got some data..
				that.inputArray = [];
				that.inputArrayLabels = [];

				$.each(res.data, function(idx, obj)
				{
					that.inputArray.push(obj.device_input_sys_name);
					that.inputArrayLabels.push(obj.device_input_label);
				});
			}, 'json');

			//
			// Input select end for SAMSUNG
			//
		} break;


		/*****************************************************************
		* Samsung Tizen
		*****************************************************************/
		case 'sstizen':
		{
			// SSTIZEN
			this.InitTV = function(_opts)
			{
				var opts = $.extend({
					complete: function(){},
					mode: 'menu' // other is 'signage'
				}, _opts);

				if (this.tvInitialised) {
					cl('b.js: SSTIZEN: InitTV: already initialised, return..');
					return;
				}

				var that = this;

				that.mac = that.GetMacAddress();
				that.deviceVersion = null;
				that.swiftAppVersion = null;
				that.tvInternalTime = null;
				that.deviceSerialNumber = null;
				that.preLoadedApps = [];

				that.rfChannelList = {
					chanArray: [],
					lcnMap: {}
				};

				// getCurrentTime can fail if no internet access or work otherwise..
				try {
					that.tvInternalTime = b2bapis.b2bcontrol.getCurrentTime();
				} catch(e) {
					cl('b.js: SSTIZEN: InitTV: getCurrentTime JS exception [' + e.name + ':' + e.message + ']');
				}

				// fallback to tizen.time
				if (!that.tvInternalTime) {
					try {
						that.tvInternalTime = tizen.time.getCurrentDateTime();
					} catch(e) {
						cl('b.js: SSTIZEN: InitTV: getCurrentDateTime JS exception [' + e.name + ':' + e.message + ']');
					}
				}

				try {
					that.deviceSerialNumber = b2bapis.b2bcontrol.getSerialNumber();
				} catch(e) {
					cl('b.js: SSTIZEN: InitTV: getSerialNumber JS exception [' + e.name + ':' + e.message + ']');
				}

				try {
					that.swiftAppVersion = tizen.application.getAppInfo().version;
					that.deviceVersion = b2bapis.b2bcontrol.getFirmwareVersion();
					that.deviceModel = webapis.productinfo.getModel();
				} catch (e) {
					cl('b.js: SSTIZEN: InitTV: getAppInfo/Firmware/Model JS exception [' + e.name + ':' + e.message + ']');
				}

				try {
					b2bapis.b2bcontrol.setForwardMessageListener(function(res)
					{
						// Info only
						cl('b.js: SSTIZEN: InitTV: SDAP event, res[' + JSON.stringify(res) + ']');
					});
				} catch (e) {
					cl('b.js: SSTIZEN: InitTV: setForwardMessageListener JS exception [' + e.name + ':' + e.message + ']');
				}

				// Note: This will only register ONCE. If you do location.replace/reload/href/assign
				// then this will stop working (at least in fw 0916.10)..
				try {
					b2bapis.b2bpower.setPowerStateChangeListener(function(res)
					{
						cl('b.js: SSTIZEN: InitTV: power event, res[' + JSON.stringify(res) + ']');
						// power on: {"code":0,"data":"Normal", "errorMessage":"success","errorName":"success","event":"POWER_STATUS_CHANGE"}
						// standby:  {"code":0,"data":"Standby","errorMessage":"success","errorName":"success","event":"POWER_STATUS_CHANGE"}

						// We (typically) monitor the power state for the 'Virtual Standby = ON' case
						// where we don't want the user to turn off -> on into blank IPTV channel,
						// rather we want tv on to the main menu (or iptv in iptv only mode).

						// NOTE: Tizen will always refresh the UI after warm power off
						// AND Tizen correctly plays IPTV channels after warm standby -> on
						// So the code below is not required.

						// UPDATE 1: It seems the always reload behaviour was only evident in FW 0825.10
						// and removed in 0916.10 so the code below is required for optimal behaviour.
						// Tizen will still keep playing IPTV channel so you never end with a black screen
						// but it is still better to do a GUI reload.

						if (res.event === 'POWER_STATUS_CHANGE' && res.data === 'Normal') {
							if (window.iptv && iptv.playing) {
								cl('b.js: SSTIZEN: InitTV: power on event in IPTV mode, load main menu');
								iptv.stop({
									'complete': function()
									{
										iptv.cleanup();
										setTimeout(iptv.launchMenu, 1);
									}
								});
							} else {
								cl('b.js: SSTIZEN: InitTV: power on event and NOT in IPTV mode, do not load main menu');
							}

							if (window.ScreenSaver && typeof ScreenSaver === 'function') {
								cl('b.js: SSTIZEN: InitTV: power on event, re-enable screensaver if configured');
								window.ssGlobalTodo = new ScreenSaver();
							}
						} else {
							// This is done to avoid problems where VirtualStandby is ON
							// and the screensaver kicks in when in standby..
							cl('b.js: SSTIZEN: InitTV: power off event, disable screensaver');
							if (window.ssGlobalTodo) {
								ssGlobalTodo.clearSetTimeout();
								ssGlobalTodo.enabled = false;
							}
						}
					});
				} catch (e) {
					cl('b.js: SSTIZEN: InitTV: setPowerStateChangeListener JS exception [' + e.name + ':' + e.message + ']');
				}

				that.RegisterKeys();

				// We hide the window in case we're coming from external AV input
				tizen.tvwindow.hide(
					function() // success
					{
						cl('b.js: SSTIZEN: InitTV: tvwindow.hide success');
					},
					function() // error
					{
						cl('b.js: SSTIZEN: InitTV: tvwindow.hide fail');
					},
					'MAIN' // Window
				);

				that.GetInstalledApps({
					complete: function(apps)
					{
						that.preLoadedApps = apps;
					}
				});

				try {
					if (stores && stores.getIsBootToIptv && vodMenuApp && vodMenuApp.menuType) {
						if (!stores.getIsBootToIptv() && !iptv.playing &&
							vodMenuApp.menuType === 'vod' && config.device_softap == 1) {
							that.SoftAPControl({
								action: 'enable',
								show_widget: true,
								caller: 'SSTIZEN-InitTV'
							});
						} else if (config.device_softap != 1) {
							that.SoftAPControl({
								action: 'disable',
								show_widget: false,
								caller: 'SSTIZEN-InitTV'
							});
						}
					}
				} catch (e) {
					cl('b.js: SSTIZEN: InitTV: SoftAP JS exception [' + e.name + ':' + e.message + ']');
				}

				// Hide an app:
				// tizen.application.getCurrentApplication().hide();
				// that.GetVideoWindows();
				// that.GetVideoSources();

				cl('b.js: SSTIZEN: InitTV finished:' +
					' model[' + that.deviceModel + ']' +
					// ' jstime[' + Date().toString() + ']' +
					' tvtime[' + that.tvInternalTime + ']' +
					' mac[' + that.mac + ']' +
					' sn[' + that.deviceSerialNumber + ']' +
					' tvver[' + that.deviceVersion + ']' +
					' appver[' + that.swiftAppVersion + ']');

				that.tvInitialised = true;
				opts.complete();
			};

			// SSTIZEN
			this.GetMacAddress = function()
			{
				return window.b2bapis && b2bapis.b2bcontrol.getMACAddress();
			};

			// SSTIZEN
			this.RegisterKeys = function()
			{
				if (!window.tizen) {
					cl('b.js: SSTIZEN: RegisterKeys: invalid tizen object, return');
					return;
				}

				cl('b.js: SSTIZEN: RegisterKeys init');

				// Register all except the ones we want to stay as
				// native (internal TV OSD) functions
				$.each(tizen.tvinputdevice.getSupportedKeys(), function(i, o)
				{
					if ($.inArray(o.name, ['VolumeUp', 'VolumeDown', 'VolumeMute', 'Exit']) === -1) {
						tizen.tvinputdevice.registerKey(o.name);
					}
				});

				if (config.device_internal_source_enabled == 1) {
					tizen.tvinputdevice.unregisterKey('Source'); // input/source key
				}

				if (config.device_internal_menu_enabled == 1) {
					tizen.tvinputdevice.unregisterKey('Menu');
				}
			};

			// SSTIZEN
			this.GetInstalledApps = function(opts)
			{
				var settings = $.extend({
					complete: function(){}
				}, opts);

				try {
					tizen.application.getAppsInfo(
						function(apps)
						{
							// apps is an array of objects.  The object has these properties:
							//   id, name, packageId, version, installDate, show, iconPath, size
							// the id (or maybe packageId) is used to launch the app, the name is descriptive for the user
							cl('b.js: SSTIZEN: GetInstalledApps: app count [' + apps.length + ']');

							// DEBUG only
							// $.each(apps, function(i, obj)
							// {
							// 	cl('-- [' + i + '] id[' + obj.id + '][' + obj.name + ']');
							// });

							settings.complete(apps);
						},
						function()
						{
							cl('b.js: SSTIZEN: GetInstalledApps: failed');
						}
					);
				} catch(e) {
					cl('b.js: SSTIZEN: GetInstalledApps: getAppsInfo exception [' + e.name + ':' + e.message + ']');
				}
			};

			// SSTIZEN
			this.Subtitles = function(opts)
			{
				var settings = $.extend({
					state: true,
					protocol: null
				}, opts);

				var state = settings.state;
				var protocol = settings.protocol;

				cl('b.js: SSTIZEN: Subtitles: init, state[' + state + '] protocol[' + protocol + ']');

				// NOTE: RF and IP share enable/disable methods but use different index get/set methods

				try {
					// streamInfo = JSON.stringify(webapis.avplay.getCurrentStreamInfo()); // to get the Current stream subtitle and language information.
					// cl('b.js: SSTIZEN: subs streamInfo[' + streamInfo + ']');

					// this is optional if you want to set non-default subtitle track (e.g. non-english)
					if (state) {
						var textIndex = this.GetStreamTrackIndex({
							trackType: 'TEXT',
							lang: 'eng',
							protocol: protocol
						});

						if (textIndex !== null) {
							if (protocol === 'rf') {
								b2bapis.b2bbroadcast.setCurrentSubtitleIndex(
									textIndex,
									function() // success
									{
										cl('b.js: SSTIZEN: Subtitles: [RF] setCurrentSubtitleIndex [' + textIndex + '] success');
									},
									function(e) // error
									{
										cl('b.js: SSTIZEN: Subtitles: [RF] setCurrentSubtitleIndex [' + textIndex + '] fail [' + e.name + ':' + e.message + ']');
									}
								);
							} else {
								webapis.avplay.setSelectTrack('TEXT', textIndex);
							}
						} else {
							cl('b.js: SSTIZEN: Subtitles: state[' + state + '] [' + protocol + '] no textIndex, not setting track');
						}

						// to set the language, first parameter is language and second paramtere is index value
						// webapis.avplay.setSelectTrack('AUDIO', 2);
					}

					// webapis.tvinfo requires '$WEBAPIS/webapis/webapis.js'
					var subtitleKey = webapis.tvinfo.TvInfoMenuKey.SUBTITLE_ONOFF_KEY; // constant for setting the status on or off
					var subtitleState = state ?
						webapis.tvinfo.TvInfoMenuValue.ON :
						webapis.tvinfo.TvInfoMenuValue.OFF;

					cl('b.js: SSTIZEN: Subtitles: calling setMenuValue,' +
						' state[' + state + '] subtitleKey[' + subtitleKey + ']' +
						' subtitleState[' + subtitleState + ']');

					webapis.tvinfo.setMenuValue(
						subtitleKey, // on/off key
						subtitleState,
						function() // success
						{
							cl('b.js: SSTIZEN: Subtitles: setMenuValue subs state[' + state + '] success');
						},
						function(e) // error
						{
							cl('b.js: SSTIZEN: Subtitles: setMenuValue subs state[' + state + '] fail [' + JSON.stringify(e) + ']');
						}
					);
				} catch(e) {
					cl('b.js: SSTIZEN: Subtitles: state[' + state + '] [IP] exception [' + e.name + ':' + e.message + ']');
				}
			};

			// SSTIZEN
			this.GetStreamTrackIndex = function(opts)
			{
				var settings = $.extend({
					trackType: 'TEXT', // TEXT/AUDIO
					lang: 'eng', // NOTE: TEXT uses 3 char code and AUDIO uses 2 char code
					protocol: null
				}, opts);

				var lang, trackType, index, i;

				if (settings.protocol === 'rf') {
					var totalSub = null;

					try {
						totalSub = b2bapis.b2bbroadcast.getTotalSubtitleInfo();
						// cl('b.js: SSTIZEN: GetStreamTrackIndex: [RF] getTotalSubtitleInfo ok [' + JSON.stringify(totalSub) + ']');
					} catch(e) {
						cl('b.js: SSTIZEN: GetStreamTrackIndex: [RF] getTotalSubtitleInfo JS exception [' + e.name + ':' + e.message + ']');
					}

					if (typeof totalSub === 'object') {
						// array of objects with index and language (3 char code) keys
						for (i = 0; i < totalSub.length; i++) {
							if (totalSub[i].language === settings.lang) {
								cl('b.js: SSTIZEN: GetStreamTrackIndex: [RF] match on' +
									' lang[' + totalSub[i].language + '],' +
									' return index[' + totalSub[i].index + ']');

								return totalSub[i].index;
							}
						}
					}

					// info only
					// var audioInfo = b2bapis.b2bbroadcast.getTotalAudioInfo();
					// try {
					// 	var currentSub = b2bapis.b2bbroadcast.getCurrentSubtitle();
					// 	cl('b.js: SSTIZEN: Subtitles: [RF] getCurrentSubtitle ok [' + JSON.stringify(currentSub) + ']');
					// } catch(e) {
					// 	cl('b.js: SSTIZEN: Subtitles: [RF] getCurrentSubtitle JS exception [' + e.name + ':' + e.message + ']');
					// }

					cl('b.js: SSTIZEN: GetStreamTrackIndex: [RF] no match on lang[' + settings.lang + '], return null');
					return null;
				} else { // IP
					try {
						var trackInfo = webapis.avplay.getTotalTrackInfo(); // To get the subtitle and language information

						for (i = 0; i < trackInfo.length; i++) {
							trackType = trackInfo[i].type;

							if (trackType === 'AUDIO') {
								lang = JSON.parse(trackInfo[i].extra_info).language; // 2 char code
								index = trackInfo[i].index;

								if (settings.trackType === trackType && settings.lang === lang) {
									cl('b.js: SSTIZEN: GetStreamTrackIndex: [IP] match on' +
										' trackType[' + trackType + '] lang[' + lang + '] index[' + index + ']');

									return index;
								}
							} else if (trackType === 'TEXT') {
								lang = JSON.parse(trackInfo[i].extra_info).track_lang; // 3 char code
								index = trackInfo[i].index;

								if (settings.trackType === trackType && settings.lang === lang) {
									cl('b.js: SSTIZEN: GetStreamTrackIndex: [IP] match on' +
										' trackType[' + trackType + '] lang[' + lang + '] index[' + index + ']');

									return index;
								}
							}
						}
					} catch(e) {
						cl('b.js: SSTIZEN: GetStreamTrackIndex: [IP] exception [' + e.name + ':' + e.message + ']');
						return null;
					}

					cl('b.js: SSTIZEN: GetStreamTrackIndex: [IP] no match searching for' +
						' trackType[' + settings.trackType + '] lang[' + settings.lang + ']');

					return null;
				}
			};

			// SSTIZEN
			this.GetVideoSources = function(opts)
			{
				var settings = $.extend({
					complete: function(){}
				}, opts);

				var systemInfoSuccess = function (videoSource)
				{
					cl('b.js: SSTIZEN: GetVideoSources: [' + JSON.stringify(videoSource) + ']');
					// var connectedVideoSources = videoSource.connected;
					// for (var i = 0; i < connectedVideoSources.length; i++) {
					// 	cl('b.js: SSTIZEN: GetVideoSources [' + i + '] type [' + connectedVideoSources[i].type + ']');
					// 	cl('b.js: SSTIZEN: GetVideoSources [' + i + '] number [' + connectedVideoSources[i].number + ']');
					// }

					settings.complete(videoSource.connected);
				};

				var systemInfoError = function (error)
				{
					cl('b.js: SSTIZEN: GetVideoSources: getPropertyValue(VIDEOSOURCE) fail [' + error.name + ':' + error.message + ']');
					settings.complete();
				};

				try {
					tizen.systeminfo.getPropertyValue('VIDEOSOURCE', systemInfoSuccess, systemInfoError);
				} catch (error) {
					cl('b.js: SSTIZEN: GetVideoSources: getPropertyValue err [' + error.name + ':' + error.message + ']');
				}
			};

			// SSTIZEN
			this.GetVideoWindows = function()
			{
				var successCB = function (availableWindows)
				{
					for (var i = 0; i < availableWindows.length; i++) {
						cl('b.js: SSTIZEN: GetVideoWindows [' + i + '] = [' + availableWindows[i] + ']');
					}
				};

				try {
					tizen.tvwindow.getAvailableWindows(successCB);
				} catch (error) {
					cl('b.js: SSTIZEN: GetVideoWindows: getAvailableWindows: error [' + error.name + ':' + error.message + ']');
				}
			};

			// SSTIZEN
			this.BroadcastStop = function(opts)
			{
				cl('b.js: SSTIZEN: BroadcastStop (no-op)');
				opts.complete = opts.complete || function(){};
				opts.complete();
			};

			// SSTIZEN
			this.SoftAPControl = function(opts)
			{
				var settings = $.extend({
					action: 'enable',
					show_widget: true,
					caller: null
				}, opts);

				cl('b.js: SSTIZEN: SoftAPControl: init,' +
					' action[' + settings.action + ']' +
					' show_widget[' + settings.show_widget + ']' +
					' caller[' + settings.caller + ']');

				var that = this;

				if (settings.action === 'disable') {
					cl('b.js: SSTIZEN: SoftAPControl: Disable and return');
					try {
						webapis.network.disableSoftAP();
					} catch (e) {
						cl('b.js: SSTIZEN: SoftAPControl: disableSoftAP exception [' + e.name + ':' + e.message + ']');
					}
					that.softApEnabled = false;
					return;
				}

				if ((window.iptv && iptv.playing) || (window.vodMenuApp && vodMenuApp.screensaver &&
					vodMenuApp.screensaver.isScreenSaverOn())) {
					cl('b.js: SSTIZEN: SoftAPControl: iptv is playing or screensaver is playing, do not enable AP');
					return;
				}

				that.GetLocation(function(room)
				{
					//webapis.network.setSoftAPChannel(6);
					//webapis.network.setSoftAPSignalStrength(100);

					// As of 4/11/17 (FW 0825.10) none of the webapis.network.* calls work
					// they throw JS exception 'Call supported on Wired connection only'
					try {
						cl('b.js: SSTIZEN: SoftAPControl: enable for room[' + room + ']');
						webapis.network.enableSoftAP();

						// var ssid = config.vod_word_for_location + ' ' + room;
						// cl('b.js: SSTIZEN: SoftAPControl: set TV Name (SSID) to [' + ssid + ']');
						// webapis.network.setTVName(ssid); not a function

						cl('b.js: SSTIZEN: SoftAPControl: set WiFi key to auto-regen on reboot');
						webapis.network.setSoftAPSecurityKeyAutoGeneration(true);
						that.softApEnabled = true;
					} catch (e) {
						cl('b.js: SSTIZEN: SoftAPControl: enable and set exception [' + e.name + ':' + e.message + ']');
					}

					if (settings.show_widget && that.softApEnabled) {
						cl('b.js: SSTIZEN: SoftAPControl: show widget enabled, call ShowSoftAPWidget..');

						try {
							that.ShowSoftAPWidget({
								enabled : webapis.network.isSoftAPEnabled() == '1' ? 'Yes' : 'No',
								ssid    : webapis.network.getSoftAPSSID(),
								key     : webapis.network.getSoftAPSecurityKey()
							});
						} catch (e) {
							cl('b.js: SSTIZEN: SoftAPControl: ShowSoftAPWidget exception [' + e.name + ':' + e.message + ']');
						}
					} else {
						cl('b.js: SSTIZEN: SoftAPControl: show widget disabled or issue with enable, return..');
					}
				});
			};

			// SSTIZEN
			this.TVOn = function()
			{
				var curPowerState = null;
				try {
					curPowerState = b2bapis.b2bpower.getPowerState();
				} catch(e) {
					cl('b.js: SSTIZEN: TVOn: b2bpower.getPowerState JS exception [' + e.name + ':' + e.message + ']');
				}

				cl('b.js: SSTIZEN: TVOn: init curPowerState[' + curPowerState + ']');

				// NOTE: Yes, setPowerOn() is b2bpower and setPowerOff() is b2bcontrol !!
				try {
					b2bapis.b2bpower.setPowerOn(
						function() // success
						{
							cl('b.js: SSTIZEN: TVOn: b2bpower.setPowerOn: success');
						},
						function() // error
						{
							cl('b.js: SSTIZEN: TVOn: b2bpower.setPowerOn: fail');
						}
					);
				} catch(e) {
					cl('b.js: SSTIZEN: TVOn: b2bpower.setPowerOn JS exception [' + e.name + ':' + e.message + ']');
				}
			};

			// SSTIZEN
			this.TVOff = function()
			{
				cl('b.js: SSTIZEN: TVOff: init');

				// NOTE: Yes, setPowerOn() is b2bpower and setPowerOff() is b2bcontrol !!
				try {
					b2bapis.b2bcontrol.setPowerOff(
						function() // success
						{
							cl('b.js: SSTIZEN: TVOff: success');
						},
						function() // error
						{
							cl('b.js: SSTIZEN: TVOff: fail');
						}
					);
				} catch(e) {
					cl('b.js: SSTIZEN: TVOff: b2bcontrol.setPowerOff JS exception [' + e.name + ':' + e.message + ']');
				}
			};

			// SSTIZEN
			this.VolumeUp = function()
			{
				clearTimeout(this.timers.volumeControl);
				tizen.tvaudiocontrol.setVolumeUp();

				var curVol = tizen.tvaudiocontrol.getVolume();
				cl('b.js: SSTIZEN: VolumeUp (curVol=' + curVol + ')');

				// NOTE: The OSD is only needed when controlling the volume
				// externally as the native OSD will not show (unlike LG where it does..)
				$('#volumecontrol').html('Vol [' + curVol + ']').show(0);
				this.timers.volumeControl = setTimeout(function(){
					$('#volumecontrol').hide(0);
				}, 1500);
			};

			// SSTIZEN
			this.VolumeDown = function()
			{
				clearTimeout(this.timers.volumeControl);
				tizen.tvaudiocontrol.setVolumeDown();

				var curVol = tizen.tvaudiocontrol.getVolume();
				cl('b.js: SSTIZEN: VolumeDown (curVol=' + curVol + ')');

				// NOTE: The OSD is only needed when controlling the volume
				// externally as the native OSD will not show (unlike LG where it does..)
				$('#volumecontrol').html('Vol [' + curVol + ']').show(0);
				this.timers.volumeControl = setTimeout(function(){
					$('#volumecontrol').hide(0);
				}, 1500);
			};

			// SSTIZEN
			this.MuteToggle = function()
			{
				var mute = tizen.tvaudiocontrol.isMute();
				cl('b.js: SSTIZEN: MuteToggle (current mute=' + mute + ')');
				// Turn off the silent mode
				tizen.tvaudiocontrol.setMute(!mute);
			};

			// SSTIZEN
			this.Reboot = function()
			{
				cl('b.js: SSTIZEN: Reboot: init');

				try {
					b2bapis.b2bcontrol.rebootDevice(
						function() // sucess
						{
							cl('b.js: SSTIZEN: Reboot: success');
						},
						function() // sucess
						{
							cl('b.js: SSTIZEN: Reboot: fail');
						}
					);
				} catch(e) {
					cl('b.js: SSTIZEN: Reboot: rebootDevice JS exception [' + e.name + ':' + e.message + ']');
				}
			};

			// SSTIZEN Miracast
			this.InitDeviceMedia = function()
			{
				cl('b.js: SSTIZEN: InitDeviceMedia (Miracast)');

				this.SoftAPControl({
					action: 'disable',
					caller: 'SSTIZEN-InitDeviceMedia'
				});

				this.InitDeviceApp('org.tizen.ScreenMirroringLFD-app-tv');
			};

			// SSTIZEN
			this.InitDeviceUsb = function()
			{
				cl('b.js: SSTIZEN: InitDeviceUsb');
				// this.InitDeviceApp('org.tizen.usb-launcher-tv');

				var app = tizen.application.getCurrentApplication();
				cl('b.js: SSTIZEN: InitDeviceUsb: Current app id [' + app.appInfo.id + ']');

				tizen.filesystem.listStorages(function(storages)
				{
					cl('b.js: SSTIZEN: InitDeviceUsb:' +
						' storages [' + JSON.stringify(storages) + ']' +
						' storage size [' + storages.length + ']');
				});

				var appControl = new tizen.ApplicationControl(
					'http://tizen.org/appcontrol/operation/pick',
					null,
					null,
					null,
					[
						new tizen.ApplicationControlData('launch_type', ['mycontents']),
						new tizen.ApplicationControlData('device_path', ['/opt/media/USBDriveA1']),
						new tizen.ApplicationControlData('device_name', ['removable_sda1']),
						new tizen.ApplicationControlData('device_type', ['USB']),
						new tizen.ApplicationControlData('called_app', [app.appInfo.id])
					]
				);

				// ApplicationControlDataArrayReplyCallback instance
				var appControlReplyCallback = {
					onsuccess: function()
					{
						cl('b.js: SSTIZEN: InitDeviceUsb: appControlReplyCallback success');
					},
					onfailure: function()
					{
						cl('b.js: SSTIZEN: InitDeviceUsb: appControlReplyCallback fail');
					}
				};

				tizen.application.launchAppControl(
					appControl,
					'org.volt.mycontents',
					function()
					{
						cl('b.js: SSTIZEN: InitDeviceUsb: org.volt.mycontents success');
					},
					function(e)
					{
						cl('b.js: SSTIZEN: InitDeviceUsb: org.volt.mycontents fail [' + e.message + ']');
					},
					appControlReplyCallback
				);
			};

			// SSTIZEN
			this.InitDeviceHDMI = function(input)
			{
				input = input || 'HDMI1';
				cl('b.js: SSTIZEN: InitDeviceHDMI input[' + input + ']');

				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				this.SetupDomForInputSelect();
				this.SetSource(input);
			};

			// SSTIZEN
			this.InitDeviceApp = function(appCode, showPrompt)
			{
				showPrompt = showPrompt || 'NO_PROMPT';

				// Stop screen saver when playing..
				ssGlobalTodo.clearSetTimeout();
				ssGlobalTodo.enabled = false;

				var popularAppList = [{
					id: 'org.tizen.ep-hotel-btplayer',
					name: 'Bluetooth player'
				}, {
					id: 'org.tizen.ScreenMirroringLFD-app-tv',
					name: 'Screen Mirror'
				}, {
					id: 'org.tizen.usb-launcher-tv',
					name: 'USB Browser'
				}, {
					id: 'org.tizen.netflix-app',
					name: 'Netflix'
				}, {
					id: 'org.tizen.browser',
					name: 'Web Browser'
				}, {
					id: 'org.volt.apps',
					name: 'Volt'
				}, {
					id: '9Ur5IzDKqV.TizenYouTube',
					name: 'Youtube'
				}];

				var defaultAppCode = popularAppList[0].id; // default to internal Bluetooth music player

				appCode = appCode || defaultAppCode;

				cl('b.js: SSTIZEN: InitDeviceApp [' + appCode + ']: init');

				var launchTizenApp = function()
				{
					try {
						var appControl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view');

						// ApplicationControlDataArrayReplyCallback instance
						var appControlReplyCallback = {
							onsuccess: function(data)
							{
								cl('b.js: SSTIZEN: InitDeviceApp [' + appCode + ']: success, part 2, data[' + data + ']');
							},
							onfailure: function()
							{
								cl('b.js: SSTIZEN: InitDeviceApp [' + appCode + ']: error, part 2');
							}
						};

						tizen.application.launchAppControl(
							appControl,
							appCode,
							function()
							{
								cl('b.js: SSTIZEN: InitDeviceApp [' + appCode + ']: success, part 1');
							},
							function(e)
							{
								cl('b.js: SSTIZEN: InitDeviceApp [' + appCode + ']: error part 1 [' + e.message + ']');
							},
							appControlReplyCallback
						);
					} catch(e) {
						cl('b.js: SSTIZEN: InitDeviceApp [' + appCode + ']: exception [' + e.name + ':' + e.message + ']');
					}
				};

				if (showPrompt === 'SHOW_PROMPT') {
					prompt(
						'Ready to load App.<br/><br/>' +
							'Press Enter/OK to begin. <br/><br/>' +
							'Press EXIT or HOME to exit.<br/><br/>',
						{
							'complete': launchTizenApp
						}
					);
				} else {
					launchTizenApp();
				}
			};

			// SSTIZEN
			this.onWindowFocus = function()
			{
				// TODO: test
				this.onWindowFocusSamsung();
			};

			// SSTIZEN
			this.InitDRM = function(opts)
			{
				if (config.iptv_enabled !== '1') {
					return true;
				}

				if (!config.drm_server || config.drm_server === 'none') {
					return true;
				}

				if (!config.drm_vendor || config.drm_vendor === 'none') {
					return true;
				}

				var settings = $.extend({
					'force': false
				}, opts);

				if (this.drm_initialised && !settings.force) {
					cl('b.js: SSTIZEN: InitDRM: already initialised and force=false, return');
					return true;
				}

				cl('b.js: SSTIZEN: InitDRM: vendor[' + config.drm_vendor + '] server[' + config.drm_server + '] date[' + Date().toString() + ']');

				var drmParam;
				// var drmParam2;

				switch (config.drm_vendor) {
					case 'verimatrix':

						// This is from the original samsung .wgt examples (IPTVVerimatrix.wgt)
						// and Verimatrix support example (AVPlayDRM.wgt)
						// this.drm_uid = null;
						// try {
						// 	drmParam2 = {
						// 		ClientType: 'IPTV' // IPTV or WEB
						// 	};
						// 	cl('b.js: SSTIZEN: InitDRM: Verimatrix GetUID param [' + JSON.stringify(drmParam2) + ']');
						// 	this.drm_uid = webapis.avplay.setDrm('VERIMATRIX', 'GetUID', JSON.stringify(drmParam2));
						// } catch(e) {
						// 	cl('b.js: SSTIZEN: InitDRM: Verimatrix getDuid exception [' + e.name + ':' + e.message + ']');
						// }

						// This code is from B2B support (https://www.samsungdforum.com/B2B/Qna/QnaList)
						// As of 4/11/17 (FW 0825.10) it does not work (exception 'Fail to get DUID')

						if (!this.drm_uid) {
							try {
								this.drm_uid = webapis.productinfo.getDuid();
								cl('b.js: SSTIZEN: InitDRM: getDuid: [' + this.drm_uid + ']');
							} catch(e) {
								cl('b.js: SSTIZEN: InitDRM: getDuid exception [' + e.name + ':' + e.message + ']');
							}
						}

						drmParam = {
							Web: '', // public-ott-nodrm.verimatrix.com:80
							IPTV: config.drm_server,
							CompanyName: config.drm_company_name
						};

						try {
							webapis.avplay.setDrm('VERIMATRIX', 'Initialize', JSON.stringify(drmParam));
							cl('b.js: SSTIZEN: InitDRM: Verimatrix init ok [' + JSON.stringify(drmParam) + '], this.drm_uid[' + this.drm_uid + ']');
						} catch(e) {
							cl('b.js: SSTIZEN: InitDRM: Verimatrix init fail [' + e.name + ':' + e.message + ']');
						}

						this.drm_initialised = true;
						break;

					case 'lynk':
						var lynkType = '1'; // hard-coded magic number from example code..

						drmParam = {
							LYNKServer: config.drm_server, // Use 'NONE' for IKUSI FLOW, other example: '107.109.204.194:8080',
							type: lynkType
						};

						try {
							webapis.avplay.setDrm('LYNK', 'Initialize', JSON.stringify(drmParam));
							cl('b.js: SSTIZEN: InitDRM: LYNK init ok [' + JSON.stringify(drmParam) + ']');
						} catch(e) {
							cl('b.js: SSTIZEN: InitDRM: LYNK init fail [' + e.name + ':' + e.message + ']');
						}
						break;
				}
			};

			// SSTIZEN
			this.GetPos = function(complete)
			{
				complete = complete || function(){};

				if (!window.webapis) {
					cl('b.js: SSTIZEN: GetPos: invalid webapis, complete(0) and return');
					complete(0);
					return;
				}

				// On the emulater, this returns a valid in seconds which is different to the docs..
				// But... the actual TV uses milliseconds, sigh..
				var curPos = webapis.avplay.getCurrentTime();
				var curPosSec = parseInt(curPos / 1000, 10);
				// var curPosSec = parseInt(curPos, 10);
				cl('b.js: SSTIZEN: GetPos: curPosSec[' + curPosSec + '] raw[' + curPos +']');
				complete(curPosSec);
			};

			// SSTIZEN
			this.SetPos = function(posSec)
			{
				if (!window.webapis) {
					cl('b.js: SSTIZEN: SetPos: invalid webapis, return');
					return;
				}

				cl('b.js: SSTIZEN: SetPos: posSec[' + posSec + ']');

				webapis.avplay.seekTo(
					posSec * 1000,
					function ()
					{
						cl('b.js: SSTIZEN: SetPos: seekTo [' + posSec + '] ok');
					},
					function (e)
					{
						cl('b.js: SSTIZEN: SetPos: seekTo [' + posSec + '] fail [' + e + ']');
					}
				);
			};

			// SSTIZEN
			this.GetDuration = function()
			{
				var durSec = -1;

				if (!window.webapis) {
					cl('b.js: SSTIZEN: GetDuration: invalid webapis, return -1');
					return durSec;
				}

				durSec = parseInt(webapis.avplay.getDuration() / 1000, 10);

				cl('b.js: SSTIZEN: GetDuration: durSec [' + durSec + ']');
				return durSec;
			};

			// SSTIZEN
			this.Play = function(url, offset, opts)
			{
				browser.curVideoUrl = url;
				var settings = $.extend({
					'loop'     : false,
					'complete': function(){},
					'left'     : 0, // NOTE: Tizen requires setDisplayRect() to be called by default..
					'top'      : 0,
					'width'    : $(window).width(),
					'height'   : $(window).height()
				}, opts);

				var that = this;

				if (!window.webapis) {
					cl('b.js: SSTIZEN: Play: invalid webapis, complete and return..');
					settings.complete();
					return;
				}

				var curState = webapis.avplay.getState();

				cl('b.js: SSTIZEN: Play: url[' + url + '] offset[' + offset + '] curState[' + curState + ']');

				// if playing and you want to change URL, you need to close()
				// otherwise prepareAsync will break everything..
				if (curState === 'PLAYING') {
					webapis.avplay.close();
				}

				if (window.player && typeof player.tizenListener === 'object') {
					cl('b.js: SSTIZEN: Play: player.tizenListener is object, do setListener..');
					webapis.avplay.setListener(player.tizenListener);
				} else {
					cl('b.js: SSTIZEN: Play: player.tizenListener not an object, skip setListener..');
				}

				webapis.avplay.open(url);

				webapis.avplay.prepareAsync(
					function() // success
					{
						cl('b.js: SSTIZEN: Play: prepareAsync success, now play..');

						webapis.avplay.play();

						// this doesn't work, use event instead..
						// if (offset > 0) {
						// 	cl('b.js: SSTIZEN: Play: offset set [' + offset + '], seekTo [' + (offset * 1000) + ']');
						// 	webapis.avplay.seekTo(offset * 1000);
						// }

						var dm = null;
						if (settings.left !== null) {
							dm = that.ConvertDimensions(
								'http',
								settings.left,
								settings.top,
								settings.width,
								settings.height
							);
						}

						if (dm) {
							cl('b.js: SSTIZEN: Play: dm SET call setDisplayRect('+dm.x+', '+dm.y+', '+dm.w+', '+dm.h+')');
							webapis.avplay.setDisplayRect(dm.x, dm.y, dm.w, dm.h);
						}

						cl('b.js: SSTIZEN: Play: prepareAsync success, end, do complete..');
						settings.complete();
					},

					function(e) // error
					{
						cl('b.js: SSTIZEN: Play: prepareAsync: ERROR[' + e + ']');
						settings.complete();
					}
				);
			};

			// SSTIZEN
			this.Stop = function(opts)
			{
				cl('b.js: SSTIZEN: Stop: curVideoUrl[' + browser.curVideoUrl + ']');

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				if (browser.curVideoUrl === null) { // nothing to stop!
					settings.complete();
					return;
				}

				browser.curVideoUrl = null;

				if (!window.webapis) {
					cl('b.js: SSTIZEN: Stop: invalid webapis, complete and return..');
					settings.complete();
					return;
				}

				var curState = webapis.avplay.getState();
				cl('b.js: SSTIZEN: Stop: curState [' + curState + ']');

				try {
					webapis.avplay.stop();
					webapis.avplay.close();
				} catch (e) {
					cl('b.js: SSTIZEN: Stop: err [' + e.message + ']');
				}

				settings.complete();
			};

			// SSTIZEN
			this.ConvertDimensions = function(protocol, x, y, w, h)
			{
				/*
				// dimensions of Samsung TV window in HTTP and RF modes
				var def_w = 960;
				var def_h = 540;
				x = (def_w / $(window).width())  * x.toString().replace('px', ''); // left
				y = (def_h / $(window).height()) * y.toString().replace('px', ''); // top
				w = (def_w / $(window).width())  * w.toString().replace('px', ''); // width
				h = (def_h / $(window).height()) * h.toString().replace('px', ''); // height
				*/

				if (w === '100%') {
					w = $(window).width();
				}

				if (h === '100%') {
					h = $(window).height();
				}

				x = parseInt(x.toString().replace('px', ''), 10); // left
				y = parseInt(y.toString().replace('px', ''), 10); // top
				w = parseInt(w.toString().replace('px', ''), 10); // width
				h = parseInt(h.toString().replace('px', ''), 10); // height

				if (w === 0) {
					w = $(window).width();
				}

				if (h === 0) {
					h = $(window).height();
				}

				cl('b.js: SSTIZEN: ConvertDimensions: return x[' + x + '] y[' + y + '] w[' + w + '] h[' + h + ']');
				return {'x': x, 'y': y, 'w': w, 'h': h};
			};

			// SSTIZEN
			// 'core' videowindow only..
			this.ResizeVideoWindow = function(x, y, w, h, complete) // left,top,width,height
			{
				x = x || 0;
				y = y || 0;
				w = w || $(window).width();
				h = h || $(window).height();
				complete = complete || function(){};

				if (!window.webapis) {
					cl('b.js: SSTIZEN: ResizeVideoWindow: invalid webapis, complete and return..');
					complete();
					return;
				}

				cl('b.js: SSTIZEN: ResizeVideoWindow: setDisplayRect('+x+', '+y+', '+w+', '+h+')');
				webapis.avplay.setDisplayRect(x, y, w, h);
				complete();
			};

			// SSTIZEN
			this.Pause = function()
			{
				if (!window.webapis) {
					cl('b.js: SSTIZEN: Pause: invalid webapis, return');
					return;
				}

				webapis.avplay.pause();
			};

			// SSTIZEN
			this.Continue = function()
			{
				if (!window.webapis) {
					cl('b.js: SSTIZEN: Continue: invalid webapis, return');
					return;
				}

				webapis.avplay.play();
			};

			// SSTIZEN
			this.StopIPTV = function(opts, caller)
			{
				caller = caller || 'not set';

				var settings = $.extend({
					'complete': function(){},
					'force': false
				}, opts);

				cl('b.js: SSTIZEN: StopIPTV:' +
					' curIptvUrl[' + browser.curIptvUrl + '] force[' + settings.force + ']' +
					' model[' + browser.deviceModel + '] caller[' + caller + ']');

				if (browser.curIptvUrl === null && !settings.force) {
					settings.complete();
					return;
				}

				if (browser.curIptvUrl === null) {
					// Can get here if settings.force === true
					// We need to stop something but we don't know what was playing
					// so we just use the global protocol config..
					browser.curIptvUrl = config.iptv_protocol + '://force';
				}

				var curState = webapis.avplay.getState();

				if (curState === 'PLAYING') {
					cl('b.js: SSTIZEN: StopIPTV: curState[' + curState + '] do stop->close');
					webapis.avplay.stop();
					webapis.avplay.close();
				} else if (curState !== 'NONE') {
					cl('b.js: SSTIZEN: StopIPTV: curState[' + curState + '] do close only');
					try {
						webapis.avplay.close();
					} catch (e) {
						cl('b.js: SSTIZEN: StopIPTV: webapis.avplay.close JS exception [' + e.name + ':' + e.message + ']');
					}
				}

				if (browser.curIptvUrl.match(/^(rtp|udp|hls|dash|http):/)) {
					if (browser.curIptvUrl.match(/^(rtp|udp):/) && browser.deviceModel === 'PMFN') {
						if (!window.b2brtpplay) {
							window.b2brtpplay = window.b2bapis.b2brtpplay;
						}

						b2brtpplay.stopChannel(
							function()
							{
								cl('b.js: SSTIZEN: StopIPTV: PMFN stopChannel success');
								settings.complete();
							},
							function(e)
							{
								cl('b.js: SSTIZEN: StopIPTV: PMFN stopChannel fail' +
									' [' + e.name + ':' + e.message + ']');
								settings.complete();
							}
						);
					} else {
						settings.complete();
					}
				} else { // RF
					// This stops the video/audio if RF channel is playing..
					tizen.tvwindow.hide(
						function()
						{
							cl('b.js: SSTIZEN: StopIPTV: RF window hide success');
							settings.complete();
						},
						function(e)
						{
							cl('b.js: SSTIZEN: StopIPTV: RF window hide fail [' + JSON.stringify(e) + ']');
							settings.complete();
						},
						'MAIN'
					);
				}

				browser.curIptvUrl = null;
			};

			// SSTIZEN
			this.PlayIPTV = function(opts) // technically, this should be 'playLinear()'
			{
				var settings = $.extend({
					'ip'       : this.multicast_ip,
					'port'     : this.multicast_port ? this.multicast_port : config.mc_udp_port,
					'protocol' : this.iptv_protocol ? this.iptv_protocol : config.iptv_protocol,
					'number'   : null, // RF ch #
					'left'     : 0,
					'top'      : 0,
					'width'    : $(window).width(),
					'height'   : $(window).height(),
					'encrypted': false,
					'rf_frequency_khz': null, // RF
					'program_id': null, // RF
					'subtitleState': null
				}, opts);

				var that = this;

				var curState = webapis.avplay.getState();

				var dm = null;
				if (settings.left !== null) {
					dm = that.ConvertDimensions(
						settings.protocol,
						settings.left,
						settings.top,
						settings.width,
						settings.height
					);
				}

				if (settings.protocol.match(/(rtp|udp|hls|dash|http)/)) {
					var web_ip =
						config.mobile_iptv_server_ip ?
						config.mobile_iptv_server_ip :
						location.host; // can use host instead of hostname, no special port logic used here

					var url = settings.protocol + '://' + settings.ip + ':' + settings.port;

					if (settings.protocol === 'hls') {
						url = 'http://' + web_ip + '/hls/master-' + settings.ip + '.m3u8';
					} else if (settings.protocol === 'dash') {
						url = 'http://' + web_ip + '/dash/master-' + settings.ip + '/live.mpd';
					} else if (settings.protocol === 'http') {
						url = 'http://' + web_ip + '/content/tv/' + settings.ip + '.mp4';
					}

					cl('b.js: SSTIZEN: PlayIPTV: [' + url + '] curState[' + curState + ']' +
						' dm is[' + (dm && 'set' || 'not set') + '] model[' + browser.deviceModel + ']');

					// if playing and you want to change URL, you need to close()
					// otherwise prepareAsync will break everything..
					if (curState === 'PLAYING') {
						// webapis.avplay.changeURL(url, 0); // '.changeURL' is not a function, despite sample code referencing it :-/
						webapis.avplay.close();
					}

					/* NOTE: Sample code does:
					(1) open
					(2) setDisplayRect
					(3) setListener
					(4) setDrm
					(5) prepareAsync

					webapis.avplay.setBufferingParam('PLAYER_BUFFER_FOR_PLAY', 'PLAYER_BUFFER_SIZE_IN_SECOND', 10);
					webapis.avplay.setBufferingParam('PLAYER_BUFFER_FOR_RESUME', 'PLAYER_BUFFER_SIZE_IN_SECOND', 10);
					webapis.avplay.setTimeoutForBuffering(10000);

					VERIMATRIX: {
						name: 'Verimatrix',
						url: 'https://s3.amazonaws.com/ott-content/vod/elemental/cars/cars_600-nodrm.m3u8',
						companyName: 'Verimatrix',
						iptv: 'public2.verimatrix.com',
						web: 'public-ott-nodrm.verimatrix.com:80'
					}
					*/

					if (settings.protocol.match(/(rtp|udp)/) && browser.deviceModel === 'PMFN') {
						if (!window.b2brtpplay) {
							window.b2brtpplay = window.b2bapis.b2brtpplay;
						}

						// TODO: not required but if you want it move to init..
						// b2brtpplay.setEventListener(function(eventName, param)
						// {
						// 	cl('b.js: b2brtpplay event: name[' + eventName + '] param=' + param);
						// });

						var b2brtpUrl = 'rtp://' + settings.ip + ':' + settings.port;

						cl('b.js: SSTIZEN: PlayIPTV: PMFN model playChannel [' + b2brtpUrl + ']');

						var b2bRtpPlaySuccess = function()
						{
							cl('b.js: SSTIZEN: PlayIPTV: PMFN model: play [' + b2brtpUrl + '] SUCCESS');

							if (dm) {
								var b2bRtpSizeSuccess = function()
								{
									cl('b.js: SSTIZEN: PlayIPTV: PMFN dm SET call OK ' +
										' setDisplayRect('+dm.x+', '+dm.y+', '+dm.w+', '+dm.h+') ok');
								};

								var b2bRtpSizeError = function(e2)
								{
									cl('b.js: SSTIZEN: PlayIPTV: PMFN dm SET call ERROR ' +
										' setDisplayRect('+dm.x+', '+dm.y+', '+dm.w+', '+dm.h+')' +
										' [' + e2.code + ':' + e2.name + ':' + e2.message + ']');
								};

								try {
									b2brtpplay.setDisplayRect(dm.x, dm.y, dm.w, dm.h, b2bRtpSizeSuccess, b2bRtpSizeError);
								} catch(e) {
									cl('b.js: SSTIZEN: PlayIPTV: b2brtpplay.setDisplayRect JS exception [' + e.name + ':' + e.message + ']');
								}
							}
						};

						var b2bRtpPlayError = function(e)
						{
							cl('b.js: SSTIZEN: PlayIPTV: PMFN model: play [' + b2brtpUrl + ']' +
								' ERROR [' + e.code + ':' + e.name + ':' + e.message + ']');
						};

						try {
							b2brtpplay.playChannel(b2brtpUrl, b2bRtpPlaySuccess, b2bRtpPlayError);
							cl('b.js: SSTIZEN: PlayIPTV: b2brtpplay.playChannel JS OK');
						} catch(e) {
							cl('b.js: SSTIZEN: PlayIPTV: b2brtpplay.playChannel JS exception [' + e.name + ':' + e.message + ']');
						}

						browser.curIptvUrl = url;
					} else {
						webapis.avplay.setListener(browser.MediaEventListener);
						webapis.avplay.open(url);
						// future: if stream is 4K:
						// if (settings.streamIs4k && webapis.productinfo.isUdPanelSupported()) {
						// 	webapis.avplay.setStreamingProperty('SET_MODE_4K', 'TRUE');
						// }
						that.InitDRM({force: true});
						// that.InitDRM();

						webapis.avplay.prepareAsync(
							function() // success
							{
								cl('b.js: SSTIZEN: PlayIPTV: prepareAsync success, now play');

								webapis.avplay.play();
								browser.curIptvUrl = url;

								if (dm) {
									cl('b.js: SSTIZEN: PlayIPTV: dm SET call setDisplayRect('+dm.x+', '+dm.y+', '+dm.w+', '+dm.h+')');
									webapis.avplay.setDisplayRect(dm.x, dm.y, dm.w, dm.h);
								}

								if (settings.subtitleState !== null) {
									if (that.timers.subtitle) {
										clearTimeout(that.timers.subtitle);
									}

									// Give the stream time to start before doing subs
									// NOTE: we don't seem to get 'playing/ready' event for
									// IP multicast streams..
									that.timers.subtitle = setTimeout(function()
									{
										that.Subtitles({
											state: settings.subtitleState,
											protocol: settings.protocol
										});
									}, 3000);
								}
							},
							function(e) // error
							{
								cl('b.js: SSTIZEN: PlayIPTV: prepareAsync: ERROR[' + e + ']');
							}
						);
					}
				} else { // RF
					settings.dm = dm;
					that.RfTune(settings);
				}
			};

			// SSTIZEN
			this.RfTune = function(opts)
			{
				var settings = $.extend({
					'complete' : function(){},
					'number'   : null, // RF ch #
					'left'     : 0,
					'top'      : 0,
					'width'    : $(window).width(),
					'height'   : $(window).height(),
					'encrypted': false,
					'rf_frequency_khz': null, // RF
					'program_id': null,
					'dm': null // converted window dimensions
				}, opts);

				var dm = settings.dm || {};

				var that = this;

				var tuneComplete = {
					onsuccess: function ()
					{
						cl('b.js: SSTIZEN: RfTune: tuneComplete:onsuccess channel [' + settings.number + ']');
					},
					onnosignal: function ()
					{
						cl('b.js: SSTIZEN: RfTune: tuneComplete:onnosignal channel [' + settings.number + ']');
					},
					onprograminforeceived: function (program, type)
					{
						cl('b.js: SSTIZEN: RfTune: tuneComplete:onprograminforeceived' +
							' channel [' + settings.number + ']' +
							' program [' + JSON.stringify(program) + ']' +
							' type [' + JSON.stringify(type) + ']');
					}
				};

				var doTune = function (number)
				{
					var rfObj = that.rfChannelList.lcnMap[number];
					var major = 0;
					var minor = 0;

					if (rfObj) {
						major = that.rfChannelList.lcnMap[number].major || 0;
						minor = that.rfChannelList.lcnMap[number].minor || 0;
					}

					cl('b.js: SSTIZEN: RfTune: doTune: about to call tizen.tvchannel.tune' +
						' on lcn number [' + number + '] major [' + major + '] minor [' + minor + ']');

					try {
						tizen.tvchannel.tune({
							major: major,
							minor: minor
						}, tuneComplete);
					} catch(e) {
						cl('b.js: SSTIZEN: RfTune: doTune: channel [' + number + '] error [' + e.name + ':' + e.message + ']');
					}

					cl('b.js: SSTIZEN: RfTune: doTune: tune() done for channel [' + number + ']');

					settings.complete();
				};

				var getChannelListSuccess = function (channels)
				{
					cl('b.js: SSTIZEN: RfTune: getChannelListSuccess, ' + channels.length + ' channel(s) are retreived.');

					if (channels.length === 0) {
						settings.complete();
						return;
					}

					var i = 0;
					that.rfChannelList.chanArray = channels;
					for (; i < that.rfChannelList.chanArray.length; i++) {
						var lcn = that.rfChannelList.chanArray[i].lcn;
						that.rfChannelList.lcnMap[lcn] = that.rfChannelList.chanArray[i];
					}

					// cl('b.js: SSTIZEN: PlayIPTV: RF: DEBUG found channels [' + JSON.stringify(channels) + ']');
					doTune(settings.number);
				};

				var getChannelListError = function (e)
				{
					cl('b.js: SSTIZEN: RfTune: getChannelListError [' + e.name + ':' + e.message + ']');
					settings.complete();
				};

				var tvwindowSuccess = function ()
				{
					if (that.rfChannelList.chanArray.length === 0) {
						cl('b.js: SSTIZEN: RfTune: tvwindowSuccess, empty array, do getChannelList..');

						try {
							tizen.tvchannel.getChannelList(getChannelListSuccess, getChannelListError, 'ALL');
						} catch (e) {
							cl('b.js: SSTIZEN: RfTune: tvwindowSuccess -> getChannelList error [' + e.name + ':' + e.message + ']');
							settings.complete();
						}
					} else { // already got the list just change..
						cl('b.js: SSTIZEN: RfTune: tvwindowSuccess, non-empty array, do doTune..');
						doTune(settings.number);
					}
				};

				var tvwindowError = function (e)
				{
					cl('b.js: SSTIZEN: RfTune: tvwindowError [' + JSON.stringify(e) + ']');
					settings.complete();
				};

				if (webapis.avplay.getState() === 'PLAYING') {
					webapis.avplay.close();
				}

				// that.SetSource({
				// 	type: 'TV',
				// 	number: 1
				// });

				var tvWindowDimensionArray = [
					'0px',
					'0px',
					'1920px',
					'1080px'
				];

				// dm is passed through from PlayIPTV into settings.dm
				if (dm.x !== undefined) {
					tvWindowDimensionArray = [
						dm.x + 'px',
						dm.y + 'px',
						dm.w + 'px',
						dm.h + 'px'
					];
				}

				cl('b.js: SSTIZEN: RfTune: calling tvwindow.show tvWindowDimensionArray[' + JSON.stringify(tvWindowDimensionArray) + ']');

				tizen.tvwindow.show(
					tvwindowSuccess,
					tvwindowError,
					tvWindowDimensionArray,
					'MAIN', // Window
					'BEHIND' // zPosition FRONT/BEHIND
				);
			};

			// SSTIZEN
			this.RfDirectTune = function(opts)
			{
				var settings = $.extend({
					'complete' : function(){},
					'number'   : null, // RF ch #
					'left'     : 0,
					'top'      : 0,
					'width'    : $(window).width(),
					'height'   : $(window).height(),
					'encrypted': false,
					'rf_frequency_khz': null, // RF
					'program_id': null // RF
				}, opts);

				var that = this;

				var tvwindowSuccess = function (windowRect)
				{
					// You will get exactly what you put as rectangle argument of show() through windowRect.
					// expected result : ["0", "0px", "50%", "540px"]
					cl('b.js: SSTIZEN: RfDirectTune: tvwindowSuccess: Rectangle : [' + windowRect[0] + ', ' + windowRect[1] + ', ' + windowRect[2] + ', ' + windowRect[3] + ']');

					var tuneOpt = {};
					// tuneOpt.broadcastStandard = 'DVB';
					// tuneOpt.channelType = 'DTV';
					// tuneOpt.frequency = settings.rf_frequency_khz;
					// tuneOpt.modulationType = '8PSK';
					// tuneOpt.bandwidth = '7Mhz';
					// tuneOpt.programNumber = settings.program_id; //service ID

					tuneOpt.major = settings.number; // channel no for DVB

					cl('b.js: SSTIZEN: RfDirectTune: tvwindowSuccess: call b2bbroadcast.tuneDirect with tuneOpt [' + JSON.stringify(tuneOpt) + ']');

					b2bapis.b2bbroadcast.tuneDirect(tuneOpt,
						function()
						{
							cl('b.js: SSTIZEN: RfDirectTune: tvwindowSuccess -> tuneDirect success');
							settings.complete();
						},
						function(e)
						{
							cl('b.js: SSTIZEN: RfDirectTune: tvwindowSuccess -> tuneDirect error [' + JSON.stringify(e) + ']');
							settings.complete();
						}
					);
				};

				var tvwindowError = function (e)
				{
					cl('b.js: SSTIZEN: RfDirectTune: tvwindowError [' + JSON.stringify(e) + ']');
					settings.complete();
				};

				if (webapis.avplay.getState() === 'PLAYING') {
					webapis.avplay.close();
				}

				// that.SetSource({
				// 	type: 'TV',
				// 	number: 1
				// });

				var tvWindowDimensionArray = [
					'0px',
					'0px',
					'1920px',
					'1080px'
				];

				var dm = null;
				if (settings.left !== null) {
					dm = that.ConvertDimensions(
						settings.protocol,
						settings.left,
						settings.top,
						settings.width,
						settings.height
					);

					tvWindowDimensionArray = [
						dm.x + 'px',
						dm.y + 'px',
						dm.w + 'px',
						dm.h + 'px'
					];
				}

				cl('b.js: SSTIZEN: RfDirectTune: calling tvwindow.show tvWindowDimensionArray[' + JSON.stringify(tvWindowDimensionArray) + ']');

				tizen.tvwindow.show(
					tvwindowSuccess,
					tvwindowError,
					tvWindowDimensionArray,
					'MAIN', // Window
					'BEHIND' // zPosition FRONT/BEHIND
				);
			};

			// SSTIZEN
			this.SetSource = function(videoSource, windowShow)
			{
				windowShow = windowShow || 'SHOW_WINDOW';

				// This is to maintain back-compatibility with the
				// existing GetSource/SetSource methods..

				// First, if it is a number, find the corresponding deviceSources key.
				// The resulting string will then be used to convert to a
				// native tizen video source object..
				if (/^\d+$/.test(videoSource) === true) {
					videoSource = parseInt(videoSource);

					$.each(this.deviceSources, function(key, val) {
						if (val === videoSource) {
							videoSource = key; // will become string here..
							return false;
						}
					});

					if (typeof videoSource === 'number') {
						cl('b.js: SetSource: ERROR: videoSource number[' + videoSource + ']' +
							' not found in deviceSources, defaults will be used');

						videoSource = null;
					}
				}

				// If videoSource is a string (passed or converted above),
				// then convert to native tizen video source object..
				if (typeof videoSource === 'string') {
					// match 'HDMI', 'HDMI1', 'HDMI 1', 'AV', 'AV 2' etc.
					// and convert to the required object..
					var m = videoSource.match(/([^\d]+)\s*(\d+)?/);

					if (m) {
						videoSource = {
							type: m[1].toUpperCase().trim(),
							number: 1
						};

						if (m[2]) {
							videoSource.number = parseInt(m[2], 10);
						}
					} else {
						cl('b.js: SetSource: ERROR: videoSource string[' + videoSource + ']' +
							' not valid, defaults will be used');

						videoSource = null;
					}
				}

				// if not valid, use default HDMI1
				videoSource = videoSource || {
					type: 'HDMI', // TV / AV / COMP / HDMI
					number: 1
				};

				var videoSourceStr = JSON.stringify(videoSource);

				cl('b.js: SSTIZEN: SetSource [' + videoSourceStr + '] init..');

				var setSourceSuccess = function(source)
				{
					cl('b.js: SSTIZEN: SetSource [' + videoSourceStr + '] success,' +
						' source type [' + source.type + ']' +
						' source number [' + source.number + '], now show tv window..');

					// NOTE: Certain CEC devices (e.g. A150H) can trigger a situation where the Web app is closed
					// and the TV goes back into native operation..

					if (windowShow === 'SHOW_WINDOW') {
						tizen.tvwindow.show(
							function() // success
							{
								cl('b.js: SSTIZEN: SetSource success -> tvwindow.show success');
							},
							function() // error
							{
								cl('b.js: SSTIZEN: SetSource success -> tvwindow.show fail');
							},
							['0px', '0px', '1920px', '1080px'],
							'MAIN', // Window
							'BEHIND' // zPosition FRONT/BEHIND
						);
					}
				};

				var setSourceError = function (e)
				{
					cl('b.js: SSTIZEN: SetSource [' + videoSourceStr + '] fail [' + e.name + ':' + e.message + ']');
				};

				var getPropertyValueSuccess = function(sources) // success
				{
					var connectedSources = sources.connected;

					cl('b.js: SSTIZEN: SetSource: getPropertyValue(VIDEOSOURCE) success,' +
						' connected[' + JSON.stringify(connectedSources) + ']');

					for (var i = 0; i < connectedSources.length; i++) {
						if (connectedSources[i].type === videoSource.type &&
							connectedSources[i].number === videoSource.number) {

							cl('b.js: SSTIZEN: SetSource: match on requested source' +
								' type[' + videoSource.type + ']' +
								' number[' + videoSource.number + '], call tvwindow.setSource');

							tizen.tvwindow.setSource(
								connectedSources[i],
								setSourceSuccess,
								setSourceError
							);

							return;
						}
					}

					cl('b.js: SSTIZEN: SetSource: WARN: no matching connected sources for requested source' +
						' type[' + videoSource.type + ']' +
						' number[' + videoSource.number + '], no-op!');
				};

				tizen.systeminfo.getPropertyValue(
					'VIDEOSOURCE',
					getPropertyValueSuccess,
					function() // error
					{
						cl('b.js: SSTIZEN: SetSource: getPropertyValue(VIDEOSOURCE) error');
					}
				);
			};

			// SSTIZEN
			this.GetSource = function()
			{
				cl('b.js: SSTIZEN: GetSource: init');

				var tizenSource;
				var sourceString;

				try {
					tizenSource = tizen.tvwindow.getSource();
					sourceString = tizenSource.type + '' + tizenSource.number;
					this.TunedSource = this.deviceSources[sourceString];

					cl('b.js: SSTIZEN: GetSource:' +
						' tizenSource[' + tizenSource + ']' +
						' sourceString[' + sourceString + ']' +
						' TunedSource[' + this.TunedSource + ']');
				} catch(e) {
					cl('b.js: SSTIZEN: GetSource: error [' + e.name + ':' + e.message + ']');
				}
			};

			// SSTIZEN
			this.MediaEventListener = {
				onbufferingstart: function ()
				{
					cl('b.js: SSTIZEN: MediaEvent: buffering start');
					if (typeof browser.onstart === 'function') {
						browser.onstart();
					}
				},

				onbufferingprogress: function (percent)
				{
					// Debug only..
					// cl('b.js: SSTIZEN: MediaEvent: DEBUG: buffering progress[' + percent + ']');
					if (typeof browser.onprogress === 'function') {
						browser.onprogress(percent);
					}
				},

				onbufferingcomplete: function ()
				{
					cl('b.js: SSTIZEN: MediaEvent: buffering complete');
					if (typeof browser.onplay === 'function') {
						browser.onplay();
					}
				},

				oncurrentplaytime: function (currentTime)
				{
					// debug only..
					// cl('b.js: SSTIZEN: MediaEvent: DEBUG: current playtime[' + currentTime + ']');
					if (typeof browser.oncurrentpos === 'function') {
						browser.oncurrentpos(currentTime);
					}
				},

				onevent: function (eventType, eventData)
				{
					cl('b.js: SSTIZEN: MediaEvent: onevent type[' + eventType + '] data[' + eventData + ']');
				},

				onstreamcompleted: function ()
				{
					cl('b.js: SSTIZEN: MediaEvent: stream completed');

					if (typeof browser.oncomplete === 'function') {
						browser.oncomplete();
					}
				},

				onerror: function (err)
				{
					cl('b.js: SSTIZEN: MediaEvent: error[' + JSON.stringify(err) + ']');
					if (typeof browser.onerror === 'function') {
						browser.onerror(err);
					}
				},

				onsubtitlechange: function (duration, text, data3, data4)
				{
					cl('b.js: SSTIZEN: MediaEvent: subtitle changed,' +
						' duration[' + duration + '] text[' + text + ']' +
						' data3[' + data3 + '] data4[' + data4 + ']');
				},

				ondrmevent: function (drmEvent, drmData)
				{
					cl('b.js: SSTIZEN: MediaEvent: DRM event[' + drmEvent + ']');

					if (typeof drmData === 'object') {
						cl('b.js: SSTIZEN: MediaEvent: drmData [' + JSON.stringify(drmData) + ']');
					}
				}
			};

			// SSTIZEN
			this.deviceSources = {
				TV      : 0,
				TV1     : 1,
				TV2     : 2,
				TV3     : 3,
				AV1     : 15,
				AV2     : 16,
				AV3     : 17,
				AV4     : 18,
				COMP1   : 23,
				COMP2   : 24,
				COMP3   : 25,
				COMP4   : 26,
				PC1     : 27,
				PC2     : 28,
				PC3     : 29,
				PC4     : 30,
				HDMI1   : 31,
				HDMI2   : 32,
				HDMI3   : 33,
				HDMI4   : 34,
				SCART1  : 35,
				SCART2  : 36,
				SCART3  : 37,
				SCART4  : 38,
				DVI1    : 39,
				DVI2    : 40,
				DVI3    : 41,
				DVI4    : 42,

				// these are special pseudo inputs
				MEDIA   : 90,
				NONE    : 91,
				MENU    : 92,
				MIRACAST: 93,
				APP     : 94
			};

			this.curInputFound = false;
			this.curInputSel = 0; // IDX of the array below
			this.inputSelTimer = setTimeout(function(){});
			this.TunedSource = {};

			// defaults that can be overridden by the DB values
			// SSTIZEN
			this.inputArray = [
				'MENU',
				'TV',
				'HDMI1',
				'HDMI2',
				'HDMI3',
				'AV1',
				'PC1',
				'MEDIA', // USB
				'MIRACAST',
				'APP'
			];

			// defaults that can be overridden by the DB values
			// SSTIZEN
			this.inputArrayLabels = [
				'MENU',
				'TV',
				'HDMI1',
				'HDMI2',
				'HDMI3',
				'AV1',
				'PC1',
				'USB MEDIA',
				'SCREEN MIRROR',
				'BLUETOOTH'
			];

			geturl = window.menuUrlPrefix +
				'/api/device_input/type=sstizen';

			// prefix done
			$.get(geturl, function(res)
			{
				if (!res || !res.data || !res.data.length) {
					cl('b.js: SSTIZEN: no device_inputs from DB, use defaults');
					return;
				}

				cl('b.js: SSTIZEN: /api/device_input: found [' + res.data.length + '] input(s) in DB..');

				// reset arrays since we got some data..
				that.inputArray = [];
				that.inputArrayLabels = [];

				$.each(res.data, function(idx, obj)
				{
					that.inputArray.push(obj.device_input_sys_name);
					that.inputArrayLabels.push(obj.device_input_label);
				});
			}, 'json');
		} break;


		/*****************************************************************
		* Exterity
		*****************************************************************/
		case 'exterity':
		{
			this.InitTV = function(_opts)
			{
				var opts = $.extend({
					complete: function(){},
					mode: 'menu' // other is 'signage'
				}, _opts);

				if (this.tvInitialised) {
					cl('b.js: EXTERITY: InitTV: already initialised, return..');
					return;
				}

				// done in device/utils/exterity.js
				// exterityPlay = document.createExterityPlayer();
				// exterityCfg = document.createExterityLocalConfig();

				this.tvInitialised = true;

				opts.complete();

				cl('b.js: EXTERITY: init complete');
			};

			// EXTERITY
			this.GetMacAddress = function() {
				return exterityCfg.mac;
			};

			// EXTERITY
			this.BroadcastStop = function(opts)
			{
				cl('b.js: EXTERITY: BroadcastStop');
				opts.complete = opts.complete || function(){};
				opts.complete();
			};

			// EXTERITY
			this.SetPos = function(seconds)
			{
				cl('b.js: EXTERITY: SetPos to [' + seconds + '] secs');
				exterityPlay.play(seconds);
			};

			// EXTERITY
			this.GetPos = function(complete)
			{
				complete = complete || function(){};
				complete(exterityPlay.position);
			};

			// EXTERITY
			this.Pause = function()
			{
				exterityPlay.pause();
			};

			// EXTERITY
			this.Continue = function()
			{
				exterityPlay.play();
			};

			// EXTERITY
			this.GetDuration = function()
			{
				return exterityPlay.duration;
			};

			// EXTERITY
			this.Play = function(url, offset, opts)
			{
				browser.curVideoUrl = url;
				var settings = $.extend({
					'loop': false
				}, opts);

				cl('b.js: EXTERITY: PLAY: url[' + url + '], offset[' + offset + '], loop[' + settings.loop + ']');

				if (offset > 0)
				{
					exterityPlay.play(url, offset);
				}
				else
				{
					exterityPlay.play(url);
				}
			};

			// EXTERITY
			this.Stop = function(opts)
			{
				// don't use 'this' or 'that' here
				cl('b.js: EXTERITY: Stop: curVideoUrl[' + browser.curVideoUrl + ']');

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				if (browser.curVideoUrl === null) // nothing to stop!
				{
					settings.complete();
					return;
				}

				browser.curVideoUrl = null;
				exterityPlay.stop();
				settings.complete();
			};

			// EXTERITY
			this.StopIPTV = function(opts, caller)
			{
				caller = caller || 'not set';

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				cl('b.js: EXTERITY: StopIPTV: curIptvUrl[' + browser.curIptvUrl + '], caller[' + caller + ']');

				if (browser.curIptvUrl === null) // no iptv to stop!
				{
					settings.complete();
					return;
				}

				browser.curIptvUrl = null;
				exterityPlay.stop();
				settings.complete();
			};

			// EXTERITY
			this.PlayIPTV = function(opts)
			{
				var settings = $.extend({
					'ip': browser.multicast_ip,
					'port': browser.multicast_port ? browser.multicast_port : config.mc_udp_port,
					'number': null, // RF ch #
					'protocol': browser.iptv_protocol ? browser.iptv_protocol : config.iptv_protocol
				}, opts);

				if (settings.protocol.match(/(rtp|udp)/))
				{
					browser.curIptvUrl = settings.protocol + '://' + settings.ip + ':' + settings.port;
					cl('b.js: EXTERITY: PlayIPTV [' + settings.protocol + '://' + settings.ip + ':' + settings.port + ']');
					exterityPlay.play(browser.curIptvUrl);
				}
				else if (settings.protocol === 'rf')
				{
					browser.curIptvUrl = 'rf://' + settings.number;
					cl('b.js: EXTERITY: PlayIPTV [rf://' + settings.number + '] NOT SUPPORTED');
				}
			};

			// EXTERITY
			this.PowerToggle = function()
			{
				sendserial('tv_power_toggle');
			};

			// EXTERITY
			this.TVOn = function()
			{
				sendserial('tv_on');
			};

			// EXTERITY
			this.TVOff = function()
			{
				sendserial('tv_off');
			};

			// EXTERITY
			this.VolumeUp = function()
			{
				sendserial('tv_volume_up');
			};

			// EXTERITY
			this.VolumeDown = function()
			{
				sendserial('tv_volume_down');
			};

			// EXTERITY
			this.MuteToggle = function()
			{
				sendserial('tv_mute_toggle');
			};

			// EXTERITY
			this.Reboot = function()
			{
				configwrite('reboot', 'yes');
			};
		} break;

		/*****************************************************************
		* Motorola
		*****************************************************************/
		case 'motorola':
		{
			// MOTOROLA
			this.InitTV = function(_opts)
			{
				var opts = $.extend({
					complete: function(){},
					mode: 'menu' // other is 'signage'
				}, _opts);

				if (this.tvInitialised) {
					cl('b.js: MOTO: InitTV: already initialised, return..');
					return;
				}

				$('body')
					.prepend('<a class="anchor" href="#"></a>')
					.append('<embed id="toi" type="application/x-motorola-toi" style="visibility:hidden"></embed>');

				toi = document.getElementById('toi'); // yep

				var motoVideoConfig;
				var VideoOutputId = 0; // 0 is normally HDMI..
				try {
					motoVideoConfig = toi.videoOutputService.getVideoConfiguration();
				} catch (e) {
					cl('b.js: MOTO: VC ERR[' + e.message + ']');
				}

				var session;
				try {
					session = toi.videoOutputService.createVideoConfigurationSession();
					session.setDisplayInfo(
						VideoOutputId,
						[
							motoVideoConfig.VIDEO_MODE_720P50
						],
						motoVideoConfig.ASPECT_RATIO_16_9
					);

					session.setDefaultVideoMode(VideoOutputId, motoVideoConfig.VIDEO_MODE_720P50);
					session.apply();

					session.releaseInstance();
				} catch (e) {
					cl('b.js: MOTO: Set VC ERR[' + e.message + ']');
				}

				try {
					var is = toi.informationService;
					//var obj_name = toi.consts.ToiInformationService;
					// is.setObject('my.standby', 'normal', is.STORAGE_PERMANENT); // not documented..
					is.setObject('cfg.standby.bootpolicy', 'forced_on', is.STORAGE_PERMANENT);
					this.firmwareVersion = is.getObject('const._fw.version');
					this.softwareVersion = is.getObject('const.sw.version');
				} catch (e) {
					cl('b.js: MOTO: Set CFG ERR[' + e.message + ']');
				}

				// if the STB does go into standby, make sure we start from main menu (not blank IPTV channel)
				toi.platformService.rebootAtNextStandby();

				this.tvInitialised = true;
				this.controlType = window.visit && window.visit.control_type;
				opts.complete();

				cl('b.js: MOTO: init, toi:' +
					' version[' + $('#toi').get(0).version + ']' +
					' fw[' + this.firmwareVersion + ']' +
					' sw[' + this.softwareVersion + ']' +
					' controlType[' + this.controlType + ']');
			};

			// MOTOROLA
			this.BroadcastStop = function(opts)
			{
				cl('b.js: MOTO: BroadcastStop');
				opts.complete = opts.complete || function(){};
				opts.complete();
			};

			// MOTOROLA
			this.SetPos = function(seconds)
			{
				cl('b.js: MOTO: SetPos to [' + (seconds * 1000) + 'ms]');
				try {
					motoPlayer.playFromPosition((seconds * 1000), 1000);
				} catch(e) {
					cl('b.js: MOTO: SetPos [' + (seconds * 1000) + 'ms] ERR[' + e.message + ']');
				}
			};

			// MOTOROLA
			this.GetPos = function(complete)
			{
				complete = complete || function(){};
				complete(parseInt(motoPlayer.getPosition() / 1000, 10));
			};

			// MOTOROLA
			this.Pause = function()
			{
				motoPlayer.play(0);
			};

			// MOTOROLA
			this.Continue = function()
			{
				motoPlayer.play(1000);
			};

			// MOTOROLA
			this.GetDuration = function()
			{
				var streamObj = motoPlayer.getStreamInfo();
				return parseInt(streamObj.playTime, 10); // docs say seconds..
			};

			// MOTOROLA
			this.Play = function(url, offset, opts)
			{
				browser.curVideoUrl = url;
				var settings = $.extend({
					'loop': false
				}, opts);

				cl('b.js: MOTO: PLAY: url[' + url + '], offset[' + offset + '], loop[' + settings.loop + ']');

				if (!motoPlayer)
				{
					try {
						motoPlayer = toi.mediaService.createPlayerInstance();
					} catch(e) {
						cl('b.js: MOTO: PLAY: init ERR[' + e.message + ']');
					}
				}
				else
				{
					try {
						motoPlayer.close();
					} catch(e){}
				}

				motoPlayer.open(url);

				if (offset > 0)
				{
					motoPlayer.playFromPosition((offset * 1000), 1000);
				}
				else
				{
					motoPlayer.play(1000);
				}
			};

			// MOTOROLA
			this.Stop = function(opts)
			{
				// don't use 'this' or 'that' here
				cl('b.js: MOTO: Stop: curVideoUrl[' + browser.curVideoUrl + ']');

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				if (browser.curVideoUrl === null) // nothing to stop!
				{
					settings.complete();
					return;
				}

				browser.curVideoUrl = null;

				if (!motoPlayer)
				{
					try {
						motoPlayer = toi.mediaService.createPlayerInstance();
					} catch(e) {
						cl('b.js: MOTO: Stop: toi.createPlayerInstance ERR[' + e.message + ']');
					}
				}

				try {
					motoPlayer.close();
					//motoPlayer = null; // don't do this here because we still may have to use motoPlayer to remove event listeners (destroy/clean ops)
				} catch(e) {
					cl('b.js: MOTO: Stop: close: ERR[' + e.message + ']');
				}

				settings.complete();
			};

			// MOTOROLA
			this.StopIPTV = function(opts, caller)
			{
				caller = caller || 'not set';

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				cl('b.js: MOTO: StopIPTV: curIptvUrl[' + browser.curIptvUrl + '], caller[' + caller + ']');

				if (browser.curIptvUrl === null) // no iptv to stop!
				{
					settings.complete();
					return;
				}

				browser.curIptvUrl = null;

				if (!motoPlayer)
				{
					try {
						motoPlayer = toi.mediaService.createPlayerInstance();
					} catch(e) {
						cl('b.js: MOTO: StopIPTV: toi.createPlayerInstance ERR[' + e.message + ']');
					}
				}

				try {
					motoPlayer.close();
					//motoPlayer = null; // don't do this here because we still may have to use motoPlayer to remove event listeners (destroy/clean ops)
				} catch(e) {
					cl('b.js: MOTO: StopIPTV close ERR[' + e.message + ']');
				}

				settings.complete();
			};

			// MOTOROLA
			this.PlayIPTV = function(opts)
			{
				var settings = $.extend({
					'ip': browser.multicast_ip,
					'port': browser.multicast_port ? browser.multicast_port : config.mc_udp_port,
					'number': null, // RF ch #
					'protocol': browser.iptv_protocol ? browser.iptv_protocol : config.iptv_protocol
				}, opts);

				if (settings.protocol.match(/(rtp|udp)/))
				{
					browser.curIptvUrl = settings.protocol + '://' + settings.ip + ':' + settings.port;
					cl('b.js: MOTO: PlayIPTV [' + settings.protocol + '://' + settings.ip + ':' + settings.port + ']');

					if (!motoPlayer)
					{
						try {
							motoPlayer = toi.mediaService.createPlayerInstance();
						} catch(e) {
							cl('b.js: MOTO: PlayIPTV init ERR[' + e.message + ']');
						}
					}
					else
					{
						try {
							motoPlayer.close();
						} catch(e) {
							cl('b.js: MOTO: PlayIPTV close ERR[' + e.message + ']');
						}
					}

					motoPlayer.open('igmp://' + settings.ip + ':' + settings.port);
					motoPlayer.play(1000);
				}
				else if (settings.protocol === 'rf')
				{
					browser.curIptvUrl = 'rf://' + settings.number;
					cl('b.js: MOTO: PlayIPTV [rf://' + settings.number + '] NOT SUPPORTED');
				}
				// else // todo hls/http linear
			};

			// MOTOROLA
			this.Reboot = function()
			{
				toi.platformService.rebootNow();
			};
		} break;


		/*****************************************************************
		* HTML5 / FF/Chrome
		*****************************************************************/
		default:
		{
			this.InitTV = function(_opts)
			{
				var opts = $.extend({
					complete: function(){},
					mode: 'menu' // other is 'signage'
				}, _opts);

				if (this.tvInitialised) {
					cl('b.js: DEFAULT: InitTV: already initialised, return..');
					return;
				}

				cl('b.js: HTML5: InitTV: default loaded');

				var geturl = window.menuUrlPrefix +
					'/common/js/dash.2.6.2.all.min.js';
					// '/common/js/bitmovin/bitmovinplayer.js';

				if (stores && stores.getInitQueryString) {
					var initQs = stores.getInitQueryString();

					// add '?nodash' for really slow sites when emulating
					// as it is >500KB..
					if (initQs.nodash === undefined) {
						$.ajax({
							url: geturl,
							dataType: 'script',
							cache: true,
							timeout: 600000
						}).done(function() {
							cl('b.js: DEFAULT: InitTV: ['+geturl+'] loaded..');
							opts.complete();
						})
						.fail(function() {
							cl('b.js: DEFAULT: InitTV: ['+geturl+'] failed to load..');
							opts.complete();
						});
					} else {
						cl('b.js: DEFAULT: InitTV: nodash url param set, not loading ['+geturl+']');
						opts.complete();
					}
				} else {
					opts.complete();
				}

				this.tvInitialised = true;
			};

			// HTML5
			this.BroadcastStop = function(opts)
			{
				cl('b.js: HTML5: BroadcastStop (no-op)');
				opts.complete = opts.complete || function(){};
				opts.complete();
			};

			// HTML5
			this.GetDuration = function()
			{
				return parseInt(video.duration, 10);
			};

			// HTML5
			this.MuteToggle = function()
			{
				if (video) {
					video.muted = !video.muted;
				}
			};

			// HTML5
			this.GetPos = function(complete)
			{
				if (video) {
					complete = complete || function(){};
					complete(parseInt(video.currentTime, 10));
				}
			};

			// HTML5
			this.SetPos = function(seconds)
			{
				if (browser.curVideoUrl.match(/\.mpd$/)) {
					browser.DashSetPos(seconds);
				} else {
					if (window.video) {
						video.currentTime = seconds;
					}
				}

				if (player.playing) {
					player.currentPosSec = seconds;
				}
			};

			// HTML5
			this.Play = function(url, offset, opts)
			{
				browser.curVideoUrl = url;
				var settings = $.extend({
					'loop': false
				}, opts);

				cl('b.js: HTML5: PLAY: url[' + url + '], offset[' + offset + '], loop[' + settings.loop + ']');

				if (url.match(/\.mpd$/)) {
					browser.DashInit(url, true); // true=autoplay
					return;
				}

				if (!window.video) {
					window.video = null;
				}

				try {
					video.src = url;
					video.load();
					video.play();
				} catch(e) {
					cl('b.js: HTML5: PLAY: error [' + e.message + ']');
				}

				if (video !== null) {
					if (offset && offset > 0) {
						video.currentTime = offset;
					}

					if (settings.loop) {
						video.addEventListener('ended', function()
						{
							video.currentTime = 0;
							video.play();
						}, false);
					}
				}
			};

			// HTML5
			this.Stop = function(opts)
			{
				// don't use 'this' or 'that' here
				cl('b.js: HTML5: Stop: curVideoUrl[' + browser.curVideoUrl + ']');

				var settings = $.extend({
					'complete': function(){}
				}, opts);

				if (browser.curVideoUrl === null) { // nothing to stop!
					settings.complete();
					return;
				}

				if (browser.curVideoUrl.match(/\.mpd$/)) {
					browser.DashStop();
				} else if (window.video) {
					try {
						// general sentiment on the internet is that
						// this is the best way to clear a html5 video object
						// for future re-use..
						video.pause();
						video.src = '';
					} catch(e) {
						cl('b.js: HTML5: Stop: ERR[' + e.message + '] e[', e, ']');
					}
				} else {
					cl('b.js: HTML5: Stop: ERR[no video DOM object]');
				}

				browser.curVideoUrl = null;
				settings.complete();
			};

			this.Pause = function()
			{
				cl('b.js: HTML5: Pause');

				if (browser.curVideoUrl.match(/\.mpd$/)) {
					browser.DashPause();
				} else {
					try {
						video.pause();
					} catch(e) {
						cl('b.js: HTML5: video.pause() ERR[' + e.message + ']');
					}
				}
			};

			this.Continue = function()
			{
				cl('b.js: HTML5: Continue');

				if (browser.curVideoUrl.match(/\.mpd$/)) {
					browser.DashPlay();
				} else {
					try {
						video.play();
					} catch(e) {
						cl('b.js: HTML5: Continue: video.play() ERR[' + e.message + ']');
					}
				}
			};
		} break;
	}

	// /**
	//  * hang maximum maxHangMSec
	//  *
	//  * @param startTime int | start time in millisecond
	//  * @param valueToCheck
	//  * @param maxHangMSec | max hang millisecond
	//  * @returns {*}
	//  */

	// function checkReturnValue (startTime, valueToCheck, maxHangMSec)
	// {
	// 	if (valueToCheck === null)
	// 	{
	// 		if((Date.now() - startTime) > maxHangMSec)
	// 		{
	// 			valueToCheck = 'Off'; // default value if timer expires
	// 		}
	// 	}
	// 	return valueToCheck;
	// }


};
