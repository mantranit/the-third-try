'use strict';

var ua = navigator.userAgent.toLowerCase();
var is_vod_ios_app = ua.indexOf('vodapp-i') > -1;
var is_vod_android_app = ua.indexOf('vodapp-a') > -1;
var is_vod_app = (is_vod_ios_app || is_vod_android_app);
var is_ANDROID = (ua.indexOf('android') > -1 || is_vod_android_app);
var is_IOS = ((/ipad|iphone|ipod/.test(ua) && !window.MSStream) || is_vod_ios_app);

var is_dash_supported = (window.dashjs &&
		typeof (window.MediaSource || window.WebKitMediaSource) === 'function' &&
		!is_IOS) ||
	is_vod_android_app; // android app supports dash natively

$(function()
{
	$('html').addClass(
		typeof swfobject !== 'undefined' &&
		window.swfobject.getFlashPlayerVersion().major !== 0 ?
		'has-flash' :
		'no-flash'
	);

	var is_HLS = document.createElement('video').canPlayType('application/vnd.apple.mpegURL').toLowerCase();
	$('html').addClass(/yes|maybe/.test(is_HLS) ? 'has-hls' : 'no-hls');

	$.each(flowplayer.support, function(k, v) {
		cl('player.js: fp.sup['+k+']:', v);
	});

	cl('player.js: DASH library loaded and supported:', is_dash_supported);

	flowplayer.conf = {
		native_fullscreen: true, // can be overridden dep. on flowplayer.support.fullscreen bool..
		embed: false,
		//splash: false,
		swf: '/common/js/flowplayer/flowplayer.swf',
		swfHls: '/common/js/flowplayer/flowplayerhls.swf',
		key: '$857493115967721, $778161614490457', // vod.net.au, cinema.gg (HTML5 FP6.x)
		dash: {
			debug: false
		}
	};
});

function PlayerObj ()
{
	this.html5Events = [
		'loadstart', 'progress', 'canplay',
		'playing', 'play', 'pause', 'seeking',
		'waiting', 'ratechange', 'ended',
		'abort', 'error', 'webkitfullscreenchange',
		'mozfullscreenchange', 'fullscreenchange',
		'msfullscreenchange'
	];

	this.vod_asset_id = null;
	this.vod_file_type = null; // movie/trailer
	this.vod_session_uuid = null;
	this.vod_url_options = null;
	this.vod_token = null;
	this.vod_bill_event_id = null;
	this.vod_streamer_index = 0;

	this.stream_type = null;
	this.video = null;
	this.fpapi = null;
	this.playerId = 0;
	this.flowplayer_error_condition = null;

	config.freestyle_movie_api_source =
		config.freestyle_movie_api_source || 'vod';

	config.mobile_live_server_type =
		config.mobile_live_server_type ||
		'dveo_v1';

	// dveo_v1, dveo_v2, ffmpeg_v1, vlc_v1
	this.live_server_type = config.mobile_live_server_type;

	config.prefix_live_server_type_to_url =
		config.prefix_live_server_type_to_url == 1 ||
		false;

	this.wowza_vod_app_name =
		config.wowza_vod_app_name ?
		config.wowza_vod_app_name :
		'vod';

	// 'vod' in this context is the tech not the company
	// 'vod_server_type' = 'vod video server type', e.g. 'wowza', 'od', 'local_file', 'vod'
	this.vod_server_type =
		config.mobile_vod_server_type ?
		config.mobile_vod_server_type :
		'vod';

	var vod_streamer =
		config.mobile_vod_server_ip ?
		config.mobile_vod_server_ip :
		location.host;

	this.vod_streamers = [{
		// match 'host-or-ip(:port)'
		'host': vod_streamer.match(/([^:]+)(?::(\d+))?/)[1],
		'port': vod_streamer.match(/([^:]+)(?::(\d+))?/)[2] || 80,
		'protocol': location.protocol // match current schema (http/https)
	}];

	if (window.od_config && window.od_config.streamer)
	{
		this.vod_streamers = $.merge(window.od_config.streamer, this.vod_streamers);
	}

	this.lastUrl = null; // for error debug

	this.defaultHtml5Method = 'flowplayer'; // native (browser builtin support), flowplayer

	// This switch section is only used for live streams, not VOD..
	switch (this.live_server_type)
	{
		case 'dveo_v2': // DVEO v2 (HLS/DASH/etc "DVEO media server")
			this.live_protocol_support = {
				dash: 'application/dash+xml',
				hls1: 'application/x-mpegurl',
				hls2: 'application/vnd.apple.mpegURL'
			};

			this.live_ip_format = 'dashes';

			// For now, this requires '/dveo_v2' to be setup in Apache config as a proxy
			// to the DVEO server (/dveo_v2 -> http://dveo.vod:8888) in order to support HTTPS
			// as the DVEO built-in media server on port 8888 does not support SSL yet..
			this.live_url_format = {
				dash: '/dveo_v2/dash/live+{{ip}}/index.mpd',
				hls1: '/dveo_v2/hls/live+{{ip}}/index.m3u8',
				hls2: '/dveo_v2/hls/live+{{ip}}/index.m3u8'
			};
			break;

		default: // DVEO v1 (As of 2017, supports DASH and HLS)
		case 'dveo_v1':
			this.live_protocol_support = {};
			var dveo_supports_dash = config.dveo_supports_dash === '1';

			if (is_dash_supported && dveo_supports_dash)
			{
				this.live_protocol_support.dash = 'application/dash+xml'; // requires dash.js 1.5.1 or higher (part of 'flowplayer.dashjs.min.js')
			}

			// this.live_protocol_support.hls0 = null; // auto-detect (use server content-type header response)
			this.live_protocol_support.hls1 = 'application/x-mpegurl';
			this.live_protocol_support.hls2 = 'application/vnd.apple.mpegURL';
			this.live_protocol_support.hls3 = 'video/mp4'; // req. for some android!!

			this.live_ip_format = 'dots';

			this.live_url_format = {};

			if (is_dash_supported && dveo_supports_dash)
			{
				this.live_url_format.dash = '{{server}}/dash/master-{{ip}}/live.mpd';
			}

			// this.live_url_format.hls0 = '{{server}}/hls/master-{{ip}}.m3u8';
			this.live_url_format.hls1 = '{{server}}/hls/master-{{ip}}.m3u8';
			this.live_url_format.hls2 = '{{server}}/hls/master-{{ip}}.m3u8';
			this.live_url_format.hls3 = '{{server}}/hls/master-{{ip}}.m3u8';
			break;
	}

	// This switch section is only used for VOD streams, not live..
	var wowza_uri_prefix = null;

	switch (this.vod_server_type)
	{
		case 'wowza':
			this.vod_protocol_support = {};
			if (is_dash_supported)
			{
				this.vod_protocol_support.dash = 'application/dash+xml'; // requires recent 'flowplayer.dashjs.min.js'
			}
			this.vod_protocol_support.hls1 = 'application/x-mpegurl'; // requires flash on windows/linux PC
			this.vod_protocol_support.hls2 = 'application/vnd.apple.mpegURL';

			wowza_uri_prefix =
				location.protocol +
				'//' + this.vod_streamers[0].host +
				'/' + this.wowza_vod_app_name;

			this.vod_url_format = {};
			if (is_dash_supported)
			{
				this.vod_url_format.dash = wowza_uri_prefix + '/{{filename}}/manifest.mpd{{wowzaqueryuri}}';
			}
			this.vod_url_format.hls1 = wowza_uri_prefix + '/{{filename}}/playlist.m3u8{{wowzaqueryuri}}';
			this.vod_url_format.hls2 = wowza_uri_prefix + '/{{filename}}/playlist.m3u8{{wowzaqueryuri}}';
			break;

		case 'od': // Swift OD system
			if (!window.od_config || !window.od_config.streamer[0]) {
				cl('player.js: WARN: missing od_config for OD vod server type');
			} else {
				this.od_api_url_prefix = 'http://' + window.od_config.streamer[0].host;
			}

			// currently the android app does not play the m3u8 properly
			// cannot test iOS app until testflight app restored..
			// todo: FIX THIS!!
			// is_vod_app = false;

			this.vod_protocol_support = {};
			if (is_dash_supported)
			{
				this.vod_protocol_support.dash = 'application/dash+xml'; // requires recent 'flowplayer.dashjs.min.js'
			}
			this.vod_protocol_support.hls1 = 'application/x-mpegurl';
			this.vod_protocol_support.hls2 = 'application/vnd.apple.mpegURL';

			this.vod_url_format = {};
			if (is_dash_supported)
			{
				this.vod_url_format.dash = '{{streamer}}{{filename}}/manifest.mpd';
			}
			this.vod_url_format.hls1 = '{{streamer}}{{filename}}/playlist.m3u8';
			this.vod_url_format.hls2 = '{{streamer}}{{filename}}/playlist.m3u8';
			break;

		default:
		case 'vod':
		case 'local_file':
			this.vod_protocol_support = {
				mp4 : 'video/mp4'
			};

			this.vod_url_format = {
				mp4 : location.protocol + '//' + this.vod_streamers[0].host + '/api/play/{{videotoken}}/http'
			};
			break;
	}

	/*
	 * [ VOD playback Flow ]
	 *
	 * playVideo() ->
	 *   vodStreamAllocate() + vodBill() || odGetAssetFilename() + odPostViewing() ->
	 *     buildVodUrlAndPlay() ->
	 *       videoPlayCore() ->
	 *         flowplayerPlay() || html5Play() ->
	 *           event handlers ->
	 *             user stop or event (end of stream) stop
	 *
	 * [ Linear playback Flow ]
	 *
	 * playTV() ->
	 *   videoPlayCore() ->
	 *     flowplayerPlay() || html5Play() ->
	 *       event handlers ->
	 *         user stop or event (end of stream) stop
	 */

	this.buildVodUrlAndPlay = function(opts)
	{
		opts = opts || {
			filename: null,
			token: null,
			wowza_query_uri: null,
			poster: null
		};

		var that = this;

		// we save this for later so that
		// the error handler can reuse them if
		// we have multiple streamers
		that.vod_url_options = opts;

		// some Wowza servers presume the format (e.g. Swift OD assumes HLS)
		if (opts.filename && opts.filename.match(/\/playlist\.m3u8$/))
		{
			opts.filename = opts.filename.replace(/\/playlist\.m3u8$/, '');
		}

		var streamer = that.vod_streamers[that.vod_streamer_index];

		if (streamer.protocol.indexOf(':') === -1) // no match
		{
			// location.protocol has the colon but some configs do not
			streamer.protocol += ':';
		}

		var streamer_url = streamer.protocol + '//' + streamer.host + ':' + streamer.port;

		cl('player.js: buildVodUrlAndPlay: streamer_url[' + streamer_url + '] idx[' + that.vod_streamer_index + ']');

		var use_app_player = false;
		var app_play_url = 'vodplayer://play?source=';

		if (is_vod_app) // works for both iOS and Android..
		{
			switch (that.vod_server_type)
			{
				case 'wowza':
				case 'od':
					if (is_vod_ios_app) {

						/* HLS for iOS app
						 * NOTE: Currently says 'live stream' due to
						 * playlist.m3u8, hence we disable the native player for now
						 * TODO: REMOVE THIS WHEN NATIVE APP SUPPORT WORKS PROPERLY
						 */
						use_app_player = false;

						app_play_url += that.vod_url_format.hls1;
					} else {
						// DASH for android app / other app
						app_play_url += that.vod_url_format.dash;
						use_app_player = config.freestyle_native_video_player == 1;
					}
					break;

				default:
				case 'vod':
				case 'local_file':
					app_play_url += that.vod_url_format.mp4;
					use_app_player = config.freestyle_native_video_player == 1;
					break;
			}
		}

		if (use_app_player)
		{
			// escape the wowza_query_uri because we already have a query string ('?source=')
			// and so we need to escape our own '?' and '&' chars in the URI..
			app_play_url = app_play_url
				.replace(/{{streamer}}/, streamer_url)
				.replace(/{{filename}}/, opts.filename)
				.replace(/{{videotoken}}/, opts.token)
				.replace(/{{wowzaqueryuri}}/, encodeURIComponent(opts.wowza_query_uri));

			cl('player.js: buildVodUrlAndPlay: is_vod_app[true] app_play_url[' + app_play_url + ']');
			window.location.href = app_play_url;
			$(document.body).trigger('videoLoaded');
		}
		else // web app or non-VOD app..
		{
			var srclist = [];

			$.each(that.vod_protocol_support, function(prot, ctype)
			{
				var s = {
					'src': that.vod_url_format[prot]
						.replace(/{{streamer}}/, streamer_url)
						.replace(/{{filename}}/, opts.filename)
						.replace(/{{videotoken}}/, opts.token)
						.replace(/{{wowzaqueryuri}}/, opts.wowza_query_uri)
				};

				if (ctype)
				{
					s.type = ctype;
				}

				cl('player.js: buildVodUrlAndPlay: is_vod_app[false] add src[' + s.src + '] type[' + s.type + ']');
				srclist.push(s);
			});

			that.videoPlayCore(srclist, opts.poster);
		}
	};

	this.playVideo = function (asset_id, file_type, poster, deal_id)
	{
		this.vod_asset_id = asset_id;
		this.vod_file_type = file_type;
		this.vod_deal_id = deal_id || 0;

		this.vod_session_uuid = sharedModules.uiHelpers.uuidv4();
		this.stream_type = 'vod';

		var that = this;

		cl('player.js: playVideo(' +
			'asset_id=' + that.vod_asset_id + ',' +
			' file_type=' + that.vod_file_type + ',' +
			' poster=' + poster + ',' +
			' deal_id=' + that.vod_deal_id +
			')');

		if (config.freestyle_movie_api_source === 'vod')
		{
			var vodStreamAllocate = function(opts)
			{
				opts = opts || {
					complete: function(){}
				};

				var streamurl =
					'/api/stream_allocation/allocate' +
					'/' + (window.hw_id ? window.hw_id : 'null') +
					'/' + that.vod_file_type +
					'/' + that.vod_asset_id +
					'/' + that.vod_streamers[that.vod_streamer_index].host;

				var stream_id = 0;

				$.ajax({
					type: 'PUT',
					dataType: 'json',
					url: streamurl,
					success: function(res) {
						stream_id = res.data.stream_id;
					}
				})
				.always(function()
				{
					opts.complete(stream_id);
				});
			};

			var vodBill = function(opts)
			{
				opts = opts || {
					complete: function(){},
					stream_id: 0
				};

				var postvars = {
					// globals passed in (see top of file)
					'asset_id'           : that.vod_asset_id,
					'type'               : that.vod_file_type, // movie, trailer etc..
					'elapsed_movie_time' : 0, // just for bill_event insert
					'deal_id'            : that.vod_deal_id,

					// passed in / calculated here..
					'video_format'       : config.mobile_video_format,
					'stream_id'          : opts.stream_id,  // from stream_allocation call, just for bill_event insert..
					'token_type'         : that.vod_server_type
				};

				if (window.hw_id)
				{
					postvars.hw_id = window.hw_id;
				}

				$.post('/api/play/billing', postvars, function (res)
				{
					if (res.result !== 'success')
					{
						window.freestyle_play_error(res.data.error_code);
						return;
					}

					// set here and used on stop to update the bill_event_id in the DB
					that.vod_bill_event_id = parseInt(res.data.bill_event_insert_id, 10);

					opts.complete({
						filename: res.data.token,
						token: res.data.token,

						// 'wowza_query_uri' will be set when that.vod_server_type is wowza
						// includes start/end/token needed for wowza SecureToken v2 to work
						wowza_query_uri:
							res.data.wowza_query_uri ?
							res.data.wowza_query_uri : ''
					});
				}, 'json')
				.fail(function()
				{
					cl('player.js: vod_bill playVideo('+
						'asset_id=' + that.vod_asset_id + ','+
						' file_type=' + that.vod_file_type + ','+
						' deal_id=' + that.vod_deal_id +
						'): post bill error (pre-play), code[10020]');

					$.post('/api/log/mobile_menu/ERROR', {
						'code': 10020,
						'msg': 'pre_play_error_post_bill_fail'
					});

					window.freestyle_play_error('vod_pre_play_error_post_bill_fail');
				});
			};

			vodStreamAllocate({
				complete: function(stream_id){
					vodBill({
						stream_id: stream_id,
						complete: function(opts){
							opts.poster = poster;
							that.buildVodUrlAndPlay(opts);
						}
					});
				}
			});
		}
		else if (config.freestyle_movie_api_source === 'od')
		{
			// 'od_get_asset_filename' uses that.vod_asset_id and
			// that.vod_file_type [movie|trailer]
			sharedModules.uiHelpers.odGetAssetData({
	            asset_id: that.vod_asset_id,
	            file_type: that.vod_file_type,
	            include_url_prefix: false, // just provide suffix, we add the prefix
				complete: function(assetRes)
				{
					sharedModules.uiHelpers.odPostViewing({
						state: 'playing', // 'playing' or 'stopped'
						asset_id: parseInt(that.vod_asset_id, 10),
						file_type: that.vod_file_type,
						deviceId: window.hw_id,
						session_uuid: that.vod_session_uuid,
						complete: function()
						{
							that.buildVodUrlAndPlay({
								filename: assetRes.url,
								poster: poster
							});
						}
					});
				}
			});
		}
		else
		{
			throw 'player.js: playVideo: unknown freestyle_movie_api_source [' + config.freestyle_movie_api_source + ']';
		}
	};

	this.playTV = function (channel_id, image, ip, http_server)
	{
		this.stream_type = 'live';

		http_server = http_server || null;
		if (http_server === 'null')
		{
			http_server = null;
		}

		var that = this;

		if ($('div#popup').is(':visible'))
		{
			$('div#popup').fadeOut('fast');
		}

		var thisBg = window.menuUrlPrefix + '/common/images/iptv/' + image;

		cl(
			'playTV(' + channel_id + ', \'' + image + '\', \'' + ip + '\', \'' + http_server + '\'): ' +
			'get /api/tv/epg/channel=' + channel_id + ', ' +
			'config.mobile_iptv_server_ip[' + config.mobile_iptv_server_ip + ']'
		);

		var srclist = [];
		var app_url = null;

		if (config.mobile_iptv_simulate == 1)
		{
			srclist = [{
				src: '/content/tv/' + ip + '.mp4',
				type: 'video/mp4',
				is_live: false
			}];

			app_url = 'vodplayer://play?source=' +
				location.protocol + '//' +
				location.host +
				'/content/tv/' + ip + '.mp4';
		}
		else
		{
			if ($('html').hasClass('no-hls') &&
				$('html').hasClass('no-flash') &&
				!is_IOS &&
				!is_ANDROID &&
				!is_vod_app)
			{
				var err_detail =
					'No native HLS support and Flash not detected.<br><br>' +
					'Please <a style="color:#111" href="https://get.adobe.com/flashplayer/" target="_blank">download</a> or enable Adobe Flash for your browser.<br><br>' +
					'We are working on removing this requirement.';

				window.popup('Sorry, an error occured.', err_detail, '#700');
				return;
			}

			var live_host = http_server || config.mobile_iptv_server_ip;
			var pref = '//' + live_host; // add prefix in case URL is an IP or hostname (not full url)

			if (live_host.indexOf('http') === 0 || live_host.indexOf('//') === 0)
			{
				pref = live_host; // if it looks like a URL assume the prefix already exists..
			}

			/*
			 if testing over port fwd, go through the proxy
			 this will only affect dveo_v1 since v2 doesn't
			 have {{server}} in the url format..
			*/
			if (location.hostname === 'lo.vod.net.au')
			{
				pref = '/' + this.live_server_type;
			}

			/*
			 Override config.mobile_iptv_server_ip
			 and use '/dveo_v1' relative to current URL..
			 the only current use case is IGLUMS where the
			 Ruckus WIFI L2 client isolation prevents accessing
			 the HLS server on the same segment.  This also requires
			 "ProxyPass /dveo_v1 http://hls.server.ip" to be configured
			 in Apache/nginx..
			*/
			if (config.prefix_live_server_type_to_url)
			{
				pref = '/' + this.live_server_type;
			}

			if (this.live_ip_format === 'dashes')
			{
				ip = ip.replace(/\./g, '-');
			}

			$.each(this.live_protocol_support, function(prot, ctype)
			{
				var s = {
					src: that.live_url_format[prot]
						.replace(/{{ip}}/, ip)
						.replace(/{{server}}/, pref),
					is_live: true
				};

				if (ctype)
				{
					s.type = ctype;
				}

				srclist.push(s);
			});

			app_url =
				'vodplayer://play?source=' +
				location.protocol + '//' +
				live_host + '/hls/master-' + ip + '.m3u8';
		}

		if (is_vod_app)
		{
			window.location.href = app_url;
			$(document.body).trigger('videoLoaded');
		}
		else
		{
			that.videoPlayCore(srclist, thisBg);
		}
	};

	this.videoPlayCore = function (srclist, poster)
	{
		var that = this;

		cl('player.js: videoPlayCore(srclist=', srclist, ', poster=', poster, ')');

		if (!$('#vodplayer_container').length)
		{
			$('body').prepend(
				'<div id="vodplayer_container">' +

					'<div style="padding:5px 0px 10px 30px; font-size:10pt">' +
						'Please allow up to 30 seconds buffering after clicking play' +
					'</div>' +

					'<div class="movie_play_heading" id="movie_play_heading"></div>' +

					'<div id="vodplayer_close">' +
						'<div class="button" style="width:30%; margin-left:35%"></div>' +
					'</div>' +

				'</div>'
			);
			$(document.body).trigger('videoLoaded');
		}

		$('#vodplayer_container').show();

		$('#vodplayer_close').click(function(){
			that.onFinish('user_stop');
		});

		var vm_select = $('input[name=vm_select]:checked', '#videomode').val();

		this.html5Method = this.defaultHtml5Method;

		// if fullscreen support is true, disable native_fullscreen (built-in FS)
		flowplayer.conf.native_fullscreen = !flowplayer.support.fullscreen;

		// override if user set (from cookie)
		if (vm_select == 'fp-nativefs')
		{
			flowplayer.conf.native_fullscreen = true;
		}
		else if (vm_select == 'fp-fpfs')
		{
			flowplayer.conf.native_fullscreen = false;
		}
		else if (vm_select == 'html5')
		{
			this.html5Method = 'native';
		}

		if (this.html5Method == 'flowplayer')
		{
			this.flowplayerPlay(srclist, poster);
		}
		else
		{
			this.html5Play(srclist, poster);
		}
	};

	this.flowplayerPlay = function (srclist, poster)
	{
		cl('player.js: flowplayerPlay: srclist[', srclist, '], poster[', poster, ']');

		var that = this;

		if (this.fpapi === null)
		{
			//this.playerId++;
			var is_live = srclist[0].is_live;
			var data_live = is_live ? 'true' : 'false';
			var data_native_fullscreen = flowplayer.conf.native_fullscreen ? 'true' : 'false';

			this.lastUrl = srclist[0].src;

			cl('player.js: flowplayerPlay: data_live[' + data_live + '], data_native_fullscreen[' + data_native_fullscreen + ']');

			/*
			if (is_ANDROID)
			{
				srclist[0].type = 'video/mp4'; // workaround to let FP work on some android devices..
				cl('player.js: flowplayerPlay: is_ANDROID:true['+ua+'], type['+srclist[0].type+']');
			}
			else
				cl('player.js: flowplayerPlay: is_ANDROID:false['+ua+'], type['+srclist[0].type+']');
			*/

			$('#vodplayer_container').append(
				'<div' +
				' id="vodplayer-' + this.playerId + '"' +
				' class="vodplayer"' +
				' style="width:60%"' +
				' data-embed="false"' +
				' data-live="' + data_live + '"' +
				' data-native_fullscreen="' + data_native_fullscreen + '"' +
				'></div>'
			);

			var fpapi_options = {
				autoplay: true,
				clip: {
					sources: srclist
				},
				ratio: 9/16,
				live: is_live
			};

			/* Loading splash prevents autoplay from working and
			 * changes event behaviour - unload will no longer fire
			 * on shutdown.
			 * Note 2: for some reason, FP inside iOS native app needs
			 * the poster set. But safari works ok, go figure..
			 */
			if (is_vod_ios_app) {
				fpapi_options.splash = poster;
			}

			this.fpapi = flowplayer('#vodplayer-' + this.playerId, fpapi_options);

			var fpShutdownUnload = function()
			{
				$('#vodplayer_container').remove();
				// delete that.fpapi;
				that.fpapi = null;

				if (that.vod_streamer_index + 1 < that.vod_streamers.length &&
					that.vod_url_options !== null &&
					that.flowplayer_error_condition === true)
				{
					that.vod_streamer_index++;

					cl('player.js: flowplayerEvent: trying next streamer' +
						'[' + that.vod_streamer_index + '/' + (that.vod_streamers.length - 1) + ']' +
						'[' + that.vod_streamers[that.vod_streamer_index].host + ':' +
						that.vod_streamers[that.vod_streamer_index].port +
						']');

					that.buildVodUrlAndPlay(that.vod_url_options);
				}
			};

			this.fpapi.on('load', function (e, fpapi, video)
			{
				cl('player.js: flowplayerEvent: load: src[' + video.src + ']');
			})
			.on('ready', function (e, fpapi, video)
			{
				cl('player.js: flowplayerEvent: ready: src[' + video.src + '] duration[' + video.duration + ']');
				that.flowplayer_error_condition = false;
			})
			.on('stop', function()
			{
				cl('player.js: flowplayerEvent: stop: remove [#vodplayer_container, #vodplayer-' + that.playerId + '] after 100ms');
				// copied the follopwing from the unload action
				setTimeout(function()
				{
					$('#vodplayer_container').remove();
					// delete that.fpapi;
					that.fpapi = null;
				}, 100);
			})
			.on('unload', function() // triggers on shutdown() /if/ poster is loaded!
			{
				cl('player.js: flowplayerEvent: unload: remove [#vodplayer_container, #vodplayer-' + that.playerId + '] after 100ms');

				if (that.fpShutdownUnloadTimer)
				{
					clearTimeout(that.fpShutdownUnloadTimer);
				}

				that.fpShutdownUnloadTimer = setTimeout(function()
				{
					fpShutdownUnload();
				}, 100);
			})
			.on('fullscreen', function()
			{
				cl('player.js: flowplayerEvent: fullscreen');
			})
			.on('fullscreen-exit', function()
			{
				cl('player.js: flowplayerEvent: fullscreen-exit');
			})
			.on('finish', function()
			{
				cl('player.js: flowplayerEvent: finish: call onFinish(end_of_stream)');
				that.onFinish('end_of_stream');
			})
			.on('error', function(e, fpapi, err)
			{
				cl('player.js: flowplayerEvent: error:' +
					' code[' + err.code + '],' +
					' msg[' + err.message + '],' +
					' streamer[' + that.vod_streamer_index + '/' + (that.vod_streamers.length - 1) + ']' +
					'[' + that.vod_streamers[that.vod_streamer_index].host + ':' +
					that.vod_streamers[that.vod_streamer_index].port +
					']');

				// fpapi.error = fpapi.loading = false;
				that.flowplayer_error_condition = true;

				if (that.vod_streamer_index + 1 < that.vod_streamers.length &&
					that.vod_url_options !== null)
				{
					that.fpapi.shutdown(); // triggers unload /if/ poster is loaded
				}
				else
				{
					that.onFinish('error', err); // complete shutdown and show error to user if any..
				}
			})
			.on('shutdown', function()
			{
				cl('player.js: flowplayerEvent: shutdown');

				if (that.fpShutdownUnloadTimer)
				{
					clearTimeout(that.fpShutdownUnloadTimer);
				}

				that.fpShutdownUnloadTimer = setTimeout(function()
				{
					fpShutdownUnload();
				}, 200);
			});
		}
		else
		{
			// tried to play a different stream while another
			// fp instance was active (most likely a stream already active)
			// either shutdown or ignore..
			cl('player.js: flowplayerPlay: error: already playing !!');

			/*this.fpapi.load({
				sources: [{
					type: type,
					src: url
				}]
			});*/
		}
	};

	this.html5Play = function (srclist, poster)
	{
		cl('player.js: html5Play: srclist[', srclist, '], poster[', poster, ']');

		if (this.video === null)
		{
			var video_html =
				'<video' +
				' id="video"' +
				' poster="' + poster + '" height="300px"' +
				' style="width:60%; z-index:1001; background:#000"' +
				' controls autoplay>';

			for (i = 0; i < srclist.length; i++)
			{
				video_html +=
					'<source src="' + srclist[i].src + '" type="' + srclist[i].type + '">';
			}

			video_html += '</video>';

			$('#vodplayer_container')
			.append(
				'<div id="vodplayer-' + this.playerId + '" class="vodplayer">' +
					video_html +
				'</div>'
			);

			$('#vodplayer_container')
			.prepend(
				'<div class="movie_play_heading" id="movie_play_heading"></div>'
			);
			$(document.body).trigger('videoLoaded');

			this.video = $('#video').get(0);

			for (var i = 0; i < this.html5Events.length; i++)
			{
				this.video.addEventListener(this.html5Events[i], this.html5EventHandler, false);
			}
		}
		else
		{
			cl('player.js: html5Play: error: already playing!!');
		}
	};

	this.onFinish = function (type, e)
	{
		type = type || 'user_stop';
		e = e || { 'code': 298, 'message': 'user_stop' };

		// if it is set, it will be RO so cannot do 'e.message = e.message || null'
		if (!e.message)
		{
			e.message = null;
		}

		var that = this;

		if (!e.message && e.code)
		{
			switch (e.code)
			{
				case 1: e.message = 'Aborted'; break;
				case 2: e.message = 'Network error'; break;
				case 3: e.message = 'Decode error'; break;
				case 4: e.message = 'Unknown video format'; break;
			}
		}

		var emt = 0;

		cl('player.js: onFinish(type='+type+', e=',e,'): emt[' + emt + '], html5Method[' + this.html5Method + ']');

		var videoStopCore = function()
		{
			if (that.html5Method === 'flowplayer')
			{
				if (that.fpapi)
				{
					emt = that.fpapi.ready ? Math.round(that.fpapi.video.time) : 0;

					// note: issues with event handlers being removed on shutdown in <= 6.0.4 fixed in 6.0.5
					that.fpapi.shutdown(); // triggers unload /if/ poster is loaded
				}
			}
			else // native
			{
				var v = $('#video').get(0);
				if (v)
				{
					emt = Math.round(v.currentTime);
				}
				else
				{
					emt = 0;
				}

				for (var i = 0; i < that.html5Events.length; i++)
				{
					that.video.removeEventListener(that.html5Events[i], that.html5EventHandler, false);
				}

				$('#video').attr('src', '');
				$('#vodplayer-' + that.playerId).remove();
				$('#vodplayer_container').remove();
				$('#movie_play_heading').hide();
				delete that.video;
				that.video = null;
			}
		};

		if (this.stream_type === 'vod')
		{
			if (config.freestyle_movie_api_source === 'vod')
			{
				$.ajax({
					type: 'PUT',
					dataType: 'json',
					url: '/api/play/token/clear/' + this.vod_token
				})
				.always(function()
				{
					// stop and sets 'emt' (elapsed movie time aka end time)
					videoStopCore();

					$.ajax({
						type: 'PUT',
						dataType: 'json',
						url: '/api/stream_allocation/clear/' + (window.hw_id ? window.hw_id : 'null')
					});

					// update the bill event with stop position (emt) and user_stop status code of 298..
					$.ajax({
						url: '/api/bill_event/' + that.vod_bill_event_id + '/' + emt + '/' + e.code,
						type: 'PUT',
						success: function() {
							that.vod_bill_event_id = 0;
						},
						dataType: 'json'
					})
					.fail(function(jqXHR, textStatus){
						window.myError('Connection Error', textStatus);
					});
				});
			}
			else if (config.freestyle_movie_api_source === 'od')
			{
				sharedModules.uiHelpers.odPostViewing({
					state: 'stopped',
					asset_id: parseInt(that.vod_asset_id, 10),
					file_type: that.vod_file_type,
					deviceId: window.hw_id,
					session_uuid: that.vod_session_uuid,
					complete: function()
					{
						videoStopCore();
					}
				});
			}
			else
			{
				throw 'player.js: onFinish: unknown freestyle_movie_api_source [' + config.freestyle_movie_api_source + ']';
			}

			this.vod_token = null;
		}
		else // live stream (non VOD)
		{
			videoStopCore();
		}

		this.stream_type = null;
		this.vod_session_uuid = null;
		this.vod_url_options = null;
		this.vod_asset_id = null;
		this.vod_file_type = null;
		this.vod_bill_event_id = null;
		this.vod_streamer_index = 0;

		if (type === 'error')
		{
			var err_detail =
				'Code [' + e.code + '], Message [' + e.message + ']<br>';

			if (that.lastUrl)
			{
				err_detail += 'URL [' + that.lastUrl + ']<br>';
			}

			err_detail +=
				'<br>Please try Chrome or Firefox if you have errors with other web browsers.';

			window.popup('Sorry, an error occured.', err_detail, '#700');
			//alert('code['+e.code+']\nmsg['+e.message+']');
		}
	};

	this.html5EventHandler = function (e)
	{
		switch (e.type)
		{
			case 'playing':
			case 'play':
				cl('player.js: HTML5 Event: Media Playing [' + e.type + ']');
				break;

			case 'progress':
				//cl('player.js: HTML5 Event: Progress [' + e.type + ']');
				break;

			case 'canplay':
				cl('player.js: HTML5 Event: Can Play');
				// player.video.play(); // autoplay..
				break;

			case 'ratechange':
				cl('player.js: HTML5 Event: Rate Change');
				break;

			case 'pause':
				cl('player.js: HTML5 Event: Media Paused');
				break;

			case 'loadstart':
				cl('player.js: HTML5 Event: Media Connecting [' + e.type + ']');
				break;

			case 'stalled':
			case 'waiting': // buffering
				cl('player.js: HTML5 Event: Media Buffering [' + e.type + ']');
				break;

			case 'ended':
			case 'end':
				cl('player.js: HTML5 Event: Media Finished [' + e.type + ']');
				player.onFinish('end_of_stream');
				break;

			case 'error':
			case 'abort':
				if (!player.video.error)
				{
					player.video.error = { 'code': 5, 'message': 'unknown error' };
				}

				cl('player.js: HTML5 Event: Media Error [' + e.type + '] code[' + player.video.error.code + ']');
				player.onFinish('error', player.video.error);
				break;

			case 'webkitfullscreenchange':
			case 'mozfullscreenchange':
			case 'fullscreenchange':
			case 'msfullscreenchange':
				cl('player.js: HTML5 Event: FullScreen change [' + e.type + ']');
				break;
		}
	};
}

if (typeof window.popup !== 'function')
{
	window.popup = function(header, content)
	{
		$('.modal-title').html(header);
		$('.modal-body').html(content);
		$('#myModal').modal('show');
	};
}

if (typeof window.myError !== 'function')
{
	window.myError = function(error, textStatus)
	{
		window.popup(
			'Sorry, an error occured',
			error + '<br><br>[' + textStatus + ']<br><br>The page will reload when you click on this message<br>'
		);

		return 0;
	};
}

if (typeof window.errorCheck !== 'function')
{
	window.errorCheck = function(data)
	{
		if (data && data.result)
		{
			if (data.result === 'success')
			{
				return false;
			}

			window.myError('Server Error', data.description);
			return true;
		}

		window.myError('Server Error', 'No data / result from API call');
		return true;
	};
}

if (typeof window.freestyle_play_error !== 'function')
{
	window.freestyle_play_error = function(code)
	{
		window.popup(
			'Session Error.  Code [' + code + ']<br>' +
			'Confirm you\'re logged in and try again.', ''
		);
	};
}
