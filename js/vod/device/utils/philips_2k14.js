// 'use strict'; // only comment in for checking, it will break the TV!!

var philips_svc_version = '1.0';
var philips_dashboard_appname = 'SystemUI';

if (navigator.userAgent.indexOf('NETTV/6.') > -1)
{
	philips_dashboard_appname = 'CustomDashboard';
	philips_svc_version = '3.0';
}

var webixpObject;
var philips_TunedSource = '';

// note: power, volune, mute are in browser.*
var philips_CurrentApplication = '';
var philips_powerTransition = 'No';
var philips_curInputSel = 0;
var philips_curInputFound = false;
var philips_inputSelTimer;
var philips_globalCallback = function(){};
var philips_PipResizeTimer = null;

var philips_inputArray = [
	'TV',
	'Scart1',
	'VGA',
	'HDMI1',
	'SideHDMI',
	'SideAV',
	'USB',
	'Menu'
];

var philips_inputArrayLabels = [
	'TV',
	'Scart1',
	'VGA',
	'HDMI1',
	'SideHDMI',
	'SideAV',
	'USB',
	'Menu'
];

function philips_sendWIxPCommand (command)
{

	//cl('PHI2K14: WebIxpSend called [' + JSON.stringify(command) + ']');
	try {
		webixpObject.WebIxpSend(JSON.stringify(command));
	} catch(e) {
		cl('PHI2K14: WebIxpSend err[' + e.message + ']');
	}
}

// seemed to only be used by earlier firmware versions of the 2k17 (x011) models..
function philips_KeyHandleProxy_down (e)
{
	cl('PHI2K14: philips_KeyHandleProxy_down DBG1 e.keyCode[' + e.keyCode + ']');
	var key = e.keyCode;
	keyhandleTodo({'keyCode': key});
}

function philips_KeyHandleProxy (e)
{
	var e_val = e.detail.split(',');
	var keyStatus = parseInt(e_val[1], 10);

	if (keyStatus !== 0)
	{
		return;
	}

	var key = parseInt(e_val[0], 10);

	cl('PHI2K14: philips_KeyHandleProxy key[' + key + ']');
	keyhandleTodo({'keyCode': key});
}

// @ state: On|Standby
function philips_WiXPSetPower (state)
{
	state = state || 'On';

	if (state === 'Off')
	{
		state = 'Standby';
	}

	if (browser.power === 'On' && state === 'On')
	{
		cl('PHI2K14: philips_WiXPSetPower: current[' + browser.power + '], new[' + state + '], ignore');
		return;
	}

	cl('PHI2K14: philips_WiXPSetPower: current[' + browser.power + '], new[' + state + '], process');

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 10,
		'CmdType'        : 'Change',
		'Fun'            : 'PowerState',
		'CommandDetails' : {
			'ToPowerState' : state
		}
	};

	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPGetPower ()
{
	cl('PHI2K14: philips_WiXPGetPower');

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 20,
		'CmdType'        : 'Request',
		'Fun'            : 'PowerState'
	};
	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPGetChannelStatus ()
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 30,
		'CmdType'        : 'Request',
		'Fun'            : 'ChannelSelection'
	};
	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPSetChannel (chan)
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 40,
		'CmdType'        : 'Change',
		'Fun'            : 'ChannelSelection',
		'CommandDetails' : {
			'ChannelTuningDetails' : {
				'ChannelNumber' : parseInt(chan, 10)
				/* not working just yet, docs not finalised..
				'ChannelNumberDetails' : {
					'ChannelNumber' : parseInt(chan, 10)
				}
				*/
			}
		}
	};

	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPSetChannelIP (ip, port, bitratemode, trickmode)
{
	trickmode = trickmode || null; // null, 'Play' or 'Stop' (only works on 2k17+)
	bitratemode = bitratemode || ''; // valid modes are CBR and VBR
	if (bitratemode)
	{
		bitratemode = '/' + bitratemode;
	}

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 50,
		'CmdType'        : 'Change',
		'Fun'            : 'ChannelSelection',
		'CommandDetails' : {
			'ChannelTuningDetails' : {
				'URL' : 'multicast://' + ip + ':' + port + '/0/0/0' + bitratemode
			}
		}
	};

	if (trickmode !== null)
	{
		wixpcmd.CommandDetails.TrickMode = trickmode;
	}

	cl('PHI2K14: philips_WiXPSetChannelIP [' + JSON.stringify(wixpcmd) + ']');

	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPStopChannel (mode, ip, port)
{
	mode = mode || 'psuedo_channel';

	if (mode === 'psuedo_channel')
	{
		cl('PHI2K14: philips_WiXPStopChannel: psuedo_channel');
		philips_WiXPSetChannelIP('239.254.254.254', 1234); // black video, silent audio..
		// philips_WiXPSetChannelIP('239.2.254.254', 1234); // non-existent stream test
		// philips_WiXPSetChannelIP('235.1.0.2', 1234); // real stream test
		// philips_WiXPSetChannelIP('239.254.254.254', 1, '', 'Stop'); // does not work
	}
	else if (ip && port)
	{
		cl('PHI2K14: philips_WiXPStopChannel: real_stop, ip[' + ip + '], port[' + port + ']');
		philips_WiXPSetChannelIP(ip, port, '', 'Stop');
	}
	else
	{
		cl('philips_WiXPStopChannel: ERROR: invalid mode['+mode+'], ip['+ip+'], port[' + port + '] combination');
	}
}

function philips_WiXPSubtitles (state)
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 70,
		'CmdType'        : 'Change',
		'Fun'            : 'Subtitles',
		'CommandDetails' :
		{
			'SubtitleState' : state,
			'SubtitleLanguageIndex' : 0
		}
	};

	//cl('PHI2K14: philips_WiXPSubtitles [' + JSON.stringify(wixpcmd) + ']');
	philips_sendWIxPCommand(wixpcmd);
}

// state = Off or On
function philips_WiXPVideoMute (state)
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 80,
		'CmdType'        : 'Change',
		'Fun'            : 'PictureControl',
		'CommandDetails' : {
			'VideoMute' : state
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

// state = Off or On
function philips_WiXPAudioMute (state)
{
	cl('PHI2K14: philips_WiXPAudioMute: set state[' + state +']');

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 90,
		'CmdType'        : 'Change',
		'Fun'            : 'AudioControl',
		'CommandDetails' : {
			'AudioMute' : state
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPAudioVolume (level)
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 100,
		'CmdType'        : 'Change',
		'Fun'            : 'AudioControl',
		'CommandDetails' : {
			'Volume' : level
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPGetAudioState ()
{
	// cl('PHI2K14: philips_WiXPGetAudioState');

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 110,
		'CmdType'        : 'Request',
		'Fun'            : 'AudioControl',
		'CommandDetails' : {
			'AudioControlParameters' : ['Volume', 'AudioMute']
		}
	};

	cl('PHI2K14: philips_WiXPGetAudioState [' + JSON.stringify(wixpcmd) + ']');

	philips_sendWIxPCommand(wixpcmd);
}


// app = Media|CustomDashboard
// NOTE: 'CustomDashboard' is 'SystemUI' for x009/x010
// state = Activate/Deactivate (defaults to Activate if not provided)
function philips_WiXPSetApplication (app, state)
{
	state = state || 'Activate';
	if (state === 'On' || state === 'ON')
	{
		state = 'Activate';
	}

	if (state === 'Off' || state === 'OFF')
	{
		state = 'Deactivate';
	}

	cl('PHI2K14: philips_WiXPSetApplication app[' + app + '] state[' + state +']');

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 120,
		'CmdType'        : 'Change',
		'Fun'            : 'ApplicationControl',
		'CommandDetails' : {
			'ApplicationDetails' : {
				'ApplicationName' : app
			},
			'ApplicationState' : state
		}
	};

	cl('PHI2K14: philips_WiXPSetApplication [' + JSON.stringify(wixpcmd) + ']');
	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPGetApplication ()
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 130,
		'CmdType'        : 'Request',
		'Fun'            : 'ApplicationControl'
	};

	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPGetEPG (type)
{
	type = type || 'PresentAndFollowing';

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 140,
		'CmdType'        : 'Request',
		'Fun'            : 'EPG',
		'CommandDetails' : {
			'EPGInfoType' : type
		}
	};

	philips_sendWIxPCommand(wixpcmd);
}


/*
WiXP source select

'input' can be:
MainTuner : Whenever RF/IP channel audio/video rendered, then this is called as MainTuner
Scart1    : 1st Physical Scart Connection
Scart2    : 2nd Physical Scart Connection
YpbPr1    : 1st Physical YPbPr Connection
YpbPr2    : 2nd Physical YPbPr Connection
VGA       : Physical VGA Connection
HDMI1     : 1st Physical HDMI Connection
HDMI2     : 2nd Physical HDMI Connection
HDMI3     : 3rd Physical HDMI Connection
SideHDMI  : Physical Side HDMI Connection
SideAV    : Physical Side AV Connection
None      : TV is on Media or (SmartTV /Dashboard - Custom) and VideoObject is instantiated and playing a Video from Internet/Server
*/
function philips_WiXPSetInput (input)
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 150,
		'CmdType'        : 'Change',
		'Fun'            : 'Source',
		'CommandDetails' : {
			'TuneToSource' : input
		}
	};

	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPGetInput ()
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 160,
		'CmdType'        : 'Request',
		'Fun'            : 'Source'
	};

	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPKeyForward (mode, caller)
{
	mode = mode || 'all';
	caller = caller || '';

	//mode = mode || 'allbutpowerandvolume';
	var wixpcmd = {};

	cl('PHI2K14: philips_WiXPKeyForward mode[' + mode + '], caller[' + caller + ']');

	switch (mode)
	{
		default:
		case 'all':
		{
			wixpcmd = {
				'Svc'     : 'WIXP',
				'SvcVer'  : philips_svc_version,
				'Cookie'  : 170,
				'CmdType' : 'Change',
				'Fun'     : 'UserInputControl',
				'CommandDetails' : {
					'VirtualKeyForwardMode' : 'AllVirtualKeyForward'
				}
			};
		} break;

		case 'media':
		{
			wixpcmd = {
				'Svc'     : 'WIXP',
				'SvcVer'  : philips_svc_version,
				'Cookie'  : 180,
				'CmdType' : 'Change',
				'Fun'     : 'UserInputControl',
				'CommandDetails' : {
					'VirtualKeyForwardMode' : 'ForwardAllExceptVirtualKeysRequiredForMedia'
				}
			};
		} break;

		case 'none':
		case 'disable':
		{
			wixpcmd = {
				'Svc'     : 'WIXP',
				'SvcVer'  : philips_svc_version,
				'Cookie'  : 190,
				'CmdType' : 'Change',
				'Fun'     : 'UserInputControl',
				'CommandDetails' : {
					'VirtualKeyForwardMode' : 'DontForwardAnyVirtualKey'
				}
			};
		} break;

		case 'allbutpowerandvolume':
		{
			wixpcmd = {
				'Svc'     : 'WIXP',
				'SvcVer'  : philips_svc_version,
				'Cookie'  : 200,
				'CmdType' : 'Change',
				'Fun'     : 'UserInputControl',
				'CommandDetails' : {
					// All but power, volume and mute..
					'VirtualKeyForwardMode' : 'SelectiveVirtualKeyForward',
					'VirtualKeyToBeForwarded' : [
						{ 'Vkkey' : 'HBBTV_VK_MYCHOICE'       },
						{ 'Vkkey' : 'HBBTV_VK_CLOCK'          },
						{ 'Vkkey' : 'HBBTV_VK_SMARTTV'        },
						{ 'Vkkey' : 'HBBTV_VK_CHANNELGRID'    },
						{ 'Vkkey' : 'HBBTV_VK_ALARM'          },
						{ 'Vkkey' : 'HBBTV_VK_SMARTINFO'      },
						{ 'Vkkey' : 'HBBTV_VK_SOURCE'         },
						{ 'Vkkey' : 'HBBTV_VK_TV'             },
						{ 'Vkkey' : 'HBBTV_VK_FORMAT'         },
						{ 'Vkkey' : 'HBBTV_VK_MENU'           },
						{ 'Vkkey' : 'HBBTV_VK_OSRC'           },
						{ 'Vkkey' : 'HBBTV_VK_GUIDE'          },
						{ 'Vkkey' : 'HBBTV_VK_INFO'           },
						{ 'Vkkey' : 'HBBTV_VK_UP'             },
						{ 'Vkkey' : 'HBBTV_VK_LEFT'           },
						{ 'Vkkey' : 'HBBTV_VK_RIGHT'          },
						{ 'Vkkey' : 'HBBTV_VK_DOWN'           },
						{ 'Vkkey' : 'HBBTV_VK_ACCEPT'         },
						{ 'Vkkey' : 'HBBTV_VK_ADJUST'         },
						{ 'Vkkey' : 'HBBTV_VK_OPTIONS'        },
						{ 'Vkkey' : 'HBBTV_VK_BACK'           },
						{ 'Vkkey' : 'HBBTV_VK_CHANNEL_UP'     },
						{ 'Vkkey' : 'HBBTV_VK_CHANNEL_DOWN'   },
						{ 'Vkkey' : 'HBBTV_VK_RED'            },
						{ 'Vkkey' : 'HBBTV_VK_GREEN'          },
						{ 'Vkkey' : 'HBBTV_VK_BLUE'           },
						{ 'Vkkey' : 'HBBTV_VK_YELLOW'         },
						{ 'Vkkey' : 'HBBTV_VK_SUBTITLE'       },
						{ 'Vkkey' : 'HBBTV_VK_TELETEXT'       },
						{ 'Vkkey' : 'HBBTV_VK_1'              },
						{ 'Vkkey' : 'HBBTV_VK_2'              },
						{ 'Vkkey' : 'HBBTV_VK_3'              },
						{ 'Vkkey' : 'HBBTV_VK_4'              },
						{ 'Vkkey' : 'HBBTV_VK_5'              },
						{ 'Vkkey' : 'HBBTV_VK_6'              },
						{ 'Vkkey' : 'HBBTV_VK_7'              },
						{ 'Vkkey' : 'HBBTV_VK_8'              },
						{ 'Vkkey' : 'HBBTV_VK_9'              },
						{ 'Vkkey' : 'HBBTV_VK_0'              },
						{ 'Vkkey' : 'HBBTV_VK_EXTERNAL_1'     },
						{ 'Vkkey' : 'HBBTV_VK_EXTERNAL_2'     },
						{ 'Vkkey' : 'HBBTV_VK_EXTERNAL_3'     },
						{ 'Vkkey' : 'HBBTV_VK_EXTERNAL_4'     },
						{ 'Vkkey' : 'HBBTV_VK_EXTERNAL_5'     },
						{ 'Vkkey' : 'HBBTV_VK_EXTERNAL_6'     },
						{ 'Vkkey' : 'HBBTV_VK_EXTERNAL_YPBPR' }
					]
				}
			};
		} break;
	}

	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXP_PlayNG (host_port, protocol, bitratemode)
{
	protocol = protocol || 'multicast'; // unicast or multicast
	bitratemode = bitratemode || '';  // '', CBR and VBR are options
	if (bitratemode)
	{
		bitratemode = '/' + bitratemode;
	}

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 210,
		'CmdType'        : 'Change',
		'Fun'            : 'ChannelSelection',
		'CommandDetails' : {
			'ChannelTuningDetails' : {
				'URL' : protocol + '://' + host_port + '/0/0/0' + bitratemode
			}
		}
	};

	cl('PHI2K14: PlayNG: url[' + protocol + '://' + host_port + '/0/0/0' + bitratemode + ']');

	philips_sendWIxPCommand(wixpcmd);
}

function philips_SetContentSecurityControl (keysObject)
{
	keysObject = keysObject || {};

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 211,
		'CmdType'        : 'Change',
		'Fun'            : 'ContentSecurityControl',
		'CommandDetails' : {
			'VSecureKeyChangeDetails': {
				'VSecureKeys': keysObject
			}
		}
	};

	cl('PHI2K14: SetContentSecurityControl: [' + JSON.stringify(wixpcmd) + ']');
	philips_sendWIxPCommand(wixpcmd);
}

function philips_ClearContentSecurityControl (clearKeysArray)
{
	// array options are: All, EvenKey, OddKey, SharedKey
	clearKeysArray = clearKeysArray || ['All'];

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 212,
		'CmdType'        : 'Change',
		'Fun'            : 'ContentSecurityControl',
		'CommandDetails' : {
			'VSecureKeyChangeDetails': {
				'ClearKeys': clearKeysArray
			}
		}
	};

	cl('PHI2K14: ClearContentSecurityControl: keys to clear [' + clearKeysArray.toString() + ']');

	philips_sendWIxPCommand(wixpcmd);
}

function philips_RequestContentSecurityControl (vSecureStatusArray)
{
	vSecureStatusArray = vSecureStatusArray || ['VSecureKeyStatus', 'VSecureTVData'];

	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 212,
		'CmdType'        : 'Request',
		'Fun'            : 'ContentSecurityControl',
		'CommandDetails' : {
			'VSecureStatus': vSecureStatusArray
		}
	};

	cl('PHI2K14: philips_RequestContentSecurityControl: [' + JSON.stringify(wixpcmd) + ']');
	philips_sendWIxPCommand(wixpcmd);
}


// Works for both IPTV and main menu
function philips_InputSelector_Menu ()
{
	if ($('#inputselect').is(':hidden'))
	{
		philips_WiXPGetInput();
		philips_curInputFound = false;

		$('#inputselect').empty();

		$.each(philips_inputArrayLabels, function(idx, val){
			$('#inputselect').append('<div id="input_' + idx + '">' + val + '</div>');
		});

		$('#inputselect').show();

		setTimeout(function()
		{
			for (var x = 0; x < philips_inputArray.length - 1; x++)
			{
				if (philips_inputArray[x] == philips_TunedSource)
				{
					$('#inputselect div#input_' + x).addClass('highlight');
					philips_curInputSel = x;
					philips_curInputFound = true;
				}
			}

			if (!philips_curInputFound)
			{
				$('#inputselect div#input_0').addClass('highlight');
				philips_curInputSel = 0;
				philips_curInputFound = true;
			}
		}, 500);

		var promptProcessKeys = function promptProcessKeys(){
			base_Keys.call(this);
		};

		promptProcessKeys.prototype = Object.create(base_Keys.prototype);
		promptProcessKeys.prototype.constructor = promptProcessKeys;

		//default_promptProcessKeys();
		var promptKeyAction = new promptProcessKeys();

		promptProcessKeys.prototype.keyBlue = function(){
			menuPageController.resetToStart();
		};

		promptProcessKeys.prototype.keyInput = function()
		{
			// This key will take over until reset (Menu input select or menu/blue key)
			if ($('#inputselect').is(':visible'))
			{
				$('#inputselect').hide();
				menuPageController.restoreKeyHandlers('pre_keyinput');
			}
			else
			{
				philips_WiXPGetInput();
				philips_curInputFound = false;

				$('#inputselect, #inputselect div').show();
				$('#inputselect div').removeClass('highlight');

				setTimeout(function()
				{
					for (var x = 0; x < philips_inputArray.length - 1; x++)
					{
						if (philips_inputArray[x] == philips_TunedSource)
						{
							$('#inputselect div#input_' + x).addClass('highlight');
							philips_curInputSel = x;
							philips_curInputFound = true;
						}
					}

					if (!philips_curInputFound)
					{
						$('#inputselect div#input_0').addClass('highlight');
						philips_curInputSel = 0;
						philips_curInputFound = true;
					}
				}, 500);
			}
		};

		promptProcessKeys.prototype.keyDown = function()
		{
			if (!philips_curInputFound)
			{
				return;
			}

			if ($('#inputselect').is(':hidden'))
			{
				return;
			}

			$('#inputselect div#input_' + philips_curInputSel).removeClass('highlight');

			philips_curInputSel =
				(philips_curInputSel < philips_inputArray.length - 1) ?
				philips_curInputSel + 1 :
				0;

			$('#inputselect div#input_' + philips_curInputSel)
				.addClass('highlight');
		};

		promptProcessKeys.prototype.keyUp = function()
		{
			if (!philips_curInputFound)
			{
				return;
			}

			if ($('#inputselect').is(':hidden'))
			{
				return;
			}

			$('#inputselect div#input_' + philips_curInputSel).removeClass('highlight');

			philips_curInputSel =
				(philips_curInputSel === 0) ?
				philips_curInputSel = philips_inputArray.length - 1 :
				philips_curInputSel - 1;

			$('#inputselect div#input_' + philips_curInputSel)
				.addClass('highlight');
		};

		promptProcessKeys.prototype.keyEnter = function()
		{
			if (!philips_curInputFound)
			{
				return;
			}

			if ($('#inputselect').is(':hidden'))
			{
				return;
			}

			// can't have the SS kick in while on an input..
			// this will be reset by going home, or input->tv or input->menu
			ssGlobalTodo.clearSetTimeout();
			ssGlobalTodo.enabled = false;

			//philips_WiXPVideoMute('Off');

			cl('PHI2K14 input[' + philips_inputArray[philips_curInputSel] + '] idx[' + philips_curInputSel + ']');

			if ($('#inputselect_current').length)
			{
				clearTimeout(philips_inputSelTimer);
				$('#inputselect_current').html(philips_inputArrayLabels[philips_curInputSel]);
			}
			else
			{
				$('body').append(
					'<div style="display:none" id="inputselect_current">' +
						philips_inputArrayLabels[philips_curInputSel] +
					'</div>'
				);
			}

			$('#inputselect_current').show(1000);

			philips_inputSelTimer = setTimeout(function()
			{
				$('#inputselect_current').fadeOut(function(){
					$(this).remove();
				});
			}, 6000);

			if (philips_inputArray[philips_curInputSel] === 'TV') // IPTV override
			{
				$('#inputselect').hide();

				// do this regardless if already in IPTV mode or not
				// this avoids us having to re-show all the divs we hid..
				menuPageController.switchIptv();

				return;
			}

			if (philips_inputArray[philips_curInputSel] === 'Menu')
			{
				menuPageController.resetToStart();
				return;
			}

			var stop_iptv_input = function(callback)
			{
				if (typeof callback !== 'function')
				{
					callback = function(){};
				}

				if (iptv.playing)
				{
					iptv.stop({
						'complete': function()
						{
							iptv.cleanup();
							callback();
						}
					});
				}
				else
				{
					callback();
				}
			};

			if (philips_inputArray[philips_curInputSel] === 'USB')
			{
				stop_iptv_input(function(){
					browser.InitDeviceUsb();
				});
				return;
			}

			if (philips_inputArray[philips_curInputSel] === 'Miracast') // 'Directshare' on 2k14
			{
				stop_iptv_input(function(){
					browser.InitDeviceMedia();
				});
				return;
			}

			$('body, #pageload').css({
				'background-color': 'transparent',
				'background-image': 'none'
			});

			if (config.scrolling_background == 1)
			{
				$.vegas('stop');
			}

			$('.vegas-background').hide();
			$('div').not('#volumecontrol, #inputselect_current, #debug').hide();

			if (window.browser && typeof browser.SetVideoWindow === 'function')
			{
				browser.SetVideoWindow({
					'protocol': 'udp',
					'complete': function(){
						philips_WiXPSetInput(philips_inputArray[philips_curInputSel]);
					}
				});
			}
			else
			{
				philips_WiXPSetInput(philips_inputArray[philips_curInputSel]);
			}
		};

		currentKeyAction = promptKeyAction;
	}
}

// Event handlers
// This event is used in browser_interface.js
function philips_WiXPEvent (data)
{
	// cl('*** EVENT JSON [' + data + ']');
	var a = $.parseJSON(data);
	var i;

	switch (a.Fun)
	{
		case 'AudioControl':
		{
			if (a.CmdType === 'Response')
			{
				cl('PHI2K14: AudioControl Response mute['+a.CommandDetails.AudioMute+'] volume['+a.CommandDetails.Volume+']');
				browser.mute = a.CommandDetails.AudioMute || 'Off';
				browser.volume = a.CommandDetails.Volume || 0;

				// if this is a function it means we are toggling mute state..
				if (typeof browser.togglingMute === 'function')
				{
					cl('PHI2K14: AudioControl: toggling mute!');
					browser.togglingMute(); // reads browser.mute
					browser.togglingMute = null;
				}
			}
		} break;

		case 'PowerState':
		{
			if (a.CmdType === 'Response')
			{
				browser.power = a.CommandDetails.CurrentPowerState || 'undef';
				philips_powerTransition = a.CommandDetails.Transition || 'undef';
				cl('PHI2K14: PowerState response state[' + browser.power + '] trans[' + philips_powerTransition + ']');

				// if this is a function it means we are toggling power state with RCU power key
				if (typeof browser.togglingPower === 'function')
				{
					cl('PHI2K14: PowerState: RCU toggling power!');
					browser.togglingPower(); // reads browser.power
					browser.togglingPower = null;
				}

				/*
				Idea is to refresh menu at power on
				we never request the power status, so this should only trigger autonomously at power on

				UPDATE 1: Philips 2k14 has disabled the OSD so we're now controlling everything (power/vol/mute)
				However, we still don't get the power state ourselves, so this should still work..

				UPDATE 2: We need to get power state now because setting power on (via what method??) also directs the TV to the home
				page even if the TV is already on..  so we need to know the current state to avoid this problem
				if the TV is already on.. In doing this, we cannot use browser.power == 'On' check as a safe way
				to determine that the TV is transiting from standby to on BECAUSE the 'transition' doesn't seem to
				work reliably (often 'No' even when we are transitioning)..
				So, we now do pc.reset in browser.PowerToggle(), which is only called on power key press..

				UPDATE 3: Not 100% sure what UPDATE 2 means in some places (grrr.. take better notes!!!). We are only
				asking for the power state in 'browser.PowerToggle()' which only gets called on RCU power keypress,
				otherwise the power response event should only ever occur when the TV is turned off or on.

				UPDATE 4: There is a use case where power is controlled via RS232.  This means we cannot use the power key press
				method to reload the UI!  The only way is to rely on the power reponse events. (sigh..)
				I have wrapped this in a config setting 'philips_use_rs232_power' so it does not happen all of the time.
				*/

				if (window.config &&
					config.philips_use_rs232_power == 1 &&
					browser.power == 'On' &&
					window.menuPageController &&
					typeof menuPageController.resetToStart === 'function')
				{
					cl('PHI2K14: RS232 mode: recv unsolicited power event resp. of [On]. Assuming TV power on event and reloading UI in 5sec');
					setTimeout(function(){
						menuPageController.resetToStart();
					}, 5000);
				}
			}
		} break;

		case 'ChannelSelection':
		{
			if (a.CmdType === 'Response')
			{
				// obj_dump_recursive(a.CommandDetails);
				// break;

				var URL                         = a.CommandDetails.ChannelTuningDetails.URL           || '';
				var SelectionStatus             = a.CommandDetails.ChannelSelectionStatus             || null;
				var SelectionStatusErrorDetails = a.CommandDetails.ChannelSelectionStatusErrorDetails || null;
				var PlayingStatus               = a.CommandDetails.ChannelPlayingStatus               || null;
				var PlayingStatusErrorDetails   = a.CommandDetails.ChannelPlayingStatusErrorDetails   || null;

				cl(
					'PHI2K14: ChannelSelection response ' +
					'URL[' + URL + '] ' +
					'SelStat[' + SelectionStatus + '] ' +
					'SelStatErr[' + SelectionStatusErrorDetails + '] ' +
					'PlayStat[' + PlayingStatus + '] ' +
					'PlayStatErr[' + PlayingStatusErrorDetails + '] ' +
					'PlayIPTVOnSuccess[' + typeof browser.PlayIPTVOnSuccess + ']'
				);

				// do not want to do resize or play event handler if in IPTV mode..
				if (window.iptv && iptv.playing === true)
				{
					break;
				}

				// this is here (originally) for PIP resize to work (adjust CSS again and bind to broadcast)
				if (SelectionStatus === 'Successful' && typeof browser.PlayIPTVOnSuccess === 'function')
				{
					philips_PipResizeTimer = setTimeout(function()
					{
						browser.PlayIPTVOnSuccess('PlayIPTVOnSuccess[ChannelSelection_Response]');
						browser.PlayIPTVOnSuccess = null;
					}, 2000); // this delay was important on 2k14 (did not work without it)
					break;
				}

				if (player.playing && URL.indexOf('unicast') === 0)
				{
					if (SelectionStatus === 'Successful' && PlayingStatus === 'Playing')
					{
						player.playEventHandler(1, PlayingStatus, PlayingStatusErrorDetails); // playing
					}

					// player.playEventHandler(0, PlayingStatus, PlayingStatusErrorDetails); // stopped
					// player.playEventHandler(7, PlayingStatus, PlayingStatusErrorDetails); // err/unknown
				}
			}
		} break;

		case 'Source':
		{
			if (a.CmdType === 'Response')
			{
				philips_TunedSource = a.CommandDetails.TunedSource || 'TV';

				cl('PHI2K14: Source response [' + philips_TunedSource + ']');

				// we translate it for consistency with other devices/TVs
				if (philips_TunedSource === 'MainTuner')
				{
					philips_TunedSource = 'TV';
				}
			}
		} break;

		case 'ApplicationControl':
		{
			if (a.CmdType === 'Response')
			{
				cl('PHI2K14: ApplicationControl response');
				if (a.CommandDetails.ActiveApplications.length)
				{
					// grab the first non-blank one..
					philips_CurrentApplication = '';
					for (i = 0; i < a.CommandDetails.ActiveApplications.length; i++)
					{
						philips_CurrentApplication = a.CommandDetails.ActiveApplications[i].ApplicationName;
						if (philips_CurrentApplication)
						{
							cl('PHI2K14: ActiveApp[' + philips_CurrentApplication + '] i[' + i + ']');
							break;
						}
					}

					if (!philips_CurrentApplication)
					{
						philips_CurrentApplication = 'BlanketyBlank';
					}

					cl('PHI2K14: ActiveApp[' + philips_CurrentApplication + ']');

					switch (philips_CurrentApplication)
					{
						case 'SmartTV':
						{
							//philips_WiXPSetApplication('SmartTV', 'Deactivate');
						} break;

						case 'Media':
						case 'Directshare':
						case 'Miracast':
						{
							//philips_WiXPSetApplication(philips_dashboard_appname, 'Deactivate');
							philips_WiXPKeyForward('media', 'Event:' + philips_CurrentApplication);
						} break;

						default:
						case 'SystemUI':
						case 'CustomDashboard':
						{
							philips_WiXPKeyForward('all', 'Event:' + philips_CurrentApplication);
						} break;
					}
				}
			}
		} break;

		case 'Subtitles':
		{
			if (a.CmdType === 'Response')
			{
				try {
					// Note: doc says 'CurrentPlayingSubtitleLanguageIndex' but it's currently 'CurrentRenderingSubtitleLanguageIndex'
					cl('PHI2K14: Subtitles response ' +
						'state[' + a.CommandDetails.SubtitleState + '] ' +
						'idx[' + a.CommandDetails.CurrentRenderingSubtitleLanguageIndex + '] ' +
						'listsize[' + a.CommandDetails.SubtitleLanguageList.length + ']');

					if (a.CommandDetails.SubtitleLanguageList.length > 0)
					{
						for (i = 0; i < a.CommandDetails.SubtitleLanguageList.length; i++)
						{
							cl('PHI2K14: Subtitles['+i+'] ' +
								'idx[' + a.CommandDetails.SubtitleLanguageList[i].SubtitleLanguageIndex + '] ' +
								'lang[' + a.CommandDetails.SubtitleLanguageList[i].Language + '] ' +
								'type[' + a.CommandDetails.SubtitleLanguageList[i].Type + '] ' +
								'pid[' + a.CommandDetails.SubtitleLanguageList[i].Pid + ']');
						}
					}
				} catch(e) {
					cl('PHI2K14: Subtitles response ERR[' + e.message + ']');
				}
			}
		} break;

		case 'EPG':
		{
			if (a.CmdType === 'Response')
			{
				cl('PHI2K14: EPG response');
				var presDate      = '';
				var presStartTime = '';
				var presEndTime   = '';
				var presTitle     = '';
				var presDesc      = '';

				var folDate      = '';
				var folStartTime = '';
				var folEndTime   = '';
				var folTitle     = '';
				var folDesc      = '';

				var folStartDateTime = '';
				var folEndDateTime   = '';
				var presStartDateTime = '';
				var presEndDateTime   = '';

				if (a.CommandDetails.EPGPresentEventInfo !== undefined)
				{
					presDate      = a.CommandDetails.EPGPresentEventInfo.Date.trim();        // e.g. "20/11/2013"
					presStartTime = a.CommandDetails.EPGPresentEventInfo.StartTime.trim();   // e.g. "12:00:00"
					presEndTime   = a.CommandDetails.EPGPresentEventInfo.EndTime.trim();     // e.g. "12:30:00"
					presTitle     = a.CommandDetails.EPGPresentEventInfo.EventName.trim();   // e.g. "Jack and Jill"
					presDesc      = a.CommandDetails.EPGPresentEventInfo.Description.trim(); // e.g. "Jack and Jill went up the hill"

					cl('PHI2K14: EPG PresEvent date['+presDate+'] st['+presStartTime+'] et['+presEndTime+'] title['+presTitle+']');
				}

				if (a.CommandDetails.EPGFollowingEventInfo !== undefined)
				{
					folDate      = a.CommandDetails.EPGFollowingEventInfo.Date.trim();        // e.g. "20/11/2013"
					folStartTime = a.CommandDetails.EPGFollowingEventInfo.StartTime.trim();   // e.g. "12:30:00"
					folEndTime   = a.CommandDetails.EPGFollowingEventInfo.EndTime.trim();     // e.g. "13:00:00"
					folTitle     = a.CommandDetails.EPGFollowingEventInfo.EventName.trim();   // e.g. "Tom and Jerry"
					folDesc      = a.CommandDetails.EPGFollowingEventInfo.Description.trim(); // e.g. "Tom and Jerry story - 1"

					cl('PHI2K14: EPG FollowEvent date['+folDate+'] st['+folStartTime+'] et['+folEndTime+'] title['+folTitle+']');
				}

				// convert dates to mysql compatible ones for db update post..
				// NOTE: dates are already padded with leading zeros for hour/min/sec/month/day.
				var t;
				if (folDate)
				{
					t = folDate.split('/');
					// 'year-mo-da ho:mi:se'
					folStartDateTime = t[2] + '-' + t[1] + '-' + t[0] + ' ' + folStartTime;
					folEndDateTime   = t[2] + '-' + t[1] + '-' + t[0] + ' ' + folEndTime;
				}

				if (presDate)
				{
					t = presDate.split('/');
					presStartDateTime = t[2] + '-' + t[1] + '-' + t[0] + ' ' + presStartTime;
					presEndDateTime   = t[2] + '-' + t[1] + '-' + t[0] + ' ' + presEndTime;
				}

				var philips_current_channel = 0;

				if ($('#onpage_tvpreview').length) // only true on tv preview page
				{
					philips_current_channel = parseInt(tvprevTodoThis.current_channel, 10);
				}
				else if ($('#onpage_iptv').length) // only true on iptv page..
				{
					philips_current_channel = parseInt(iptv.channel[iptv.idx].number, 10);
				}

				cl('PHI2K14: EPG philips_current_channel[' + philips_current_channel + ']');

				if (philips_current_channel && (folDate || presDate))
				{
					var param = {
						'channel'      : philips_current_channel,
						'title_now'    : presTitle,
						'title_next'   : folTitle,
						'start_now'    : presStartDateTime, // 'year-mo-da ho:mi:se'
						'start_next'   : folStartDateTime,  // 'year-mo-da ho:mi:se'
						'end_now'      : presEndDateTime,   // 'year-mo-da ho:mi:se'
						'end_next'     : folEndDateTime,    // 'year-mo-da ho:mi:se'
						'desc_now'     : presDesc,
						'desc_next'    : folDesc,
						'device_vendor': 'philips_2k14',
						'utc'          : true // all times are UTC/GMT (not localtime)..
					};

					//cl(param);
					// have to use absolute path as this event could be triggered from files in different folders
					// prefix not required
					$.post('/api/tv/epg', param, function (res)
					{
						if (res.result == 'success')
						{
							if ($('#onpage_tvpreview').length) // only true on tv preview page
							{
								tvprevTodoThis.show_channel(philips_current_channel, false);
								cl('PHI2K14: EPG post complete on tvpreview page');
							}
							else if ($('#onpage_iptv').length) // only true on iptv page..
							{
								iptv.getchannels(philips_globalCallback);
								cl('PHI2K14: EPG post with data complete on IPTV page');
							}
							else
							{
								cl('PHI2K14: EPG post complete not on IPTV or tvpreview page.. uhhh');
							}
						}
						else
						{
							cl('PHI2K14: EPG post err[' + res.description + ']');
						}
					}, 'json');
				}
				else
				{
					cl('PHI2K14: EPG update: will not update, current channel is not known: ['+philips_current_channel+'], or no EPG data found: pres['+presDate+'] fol['+folDate+']');

					// Still need to do this if on IPTV page even if no EPG data from TV..

					if ($('#onpage_iptv').length)
					{
						iptv.getchannels(philips_globalCallback);
						cl('PHI2K14: EPG post without data complete on IPTV page');
					}
				}
			}
		} break;

		case 'ContentSecurityControl':
		{
			if (a.CmdType === 'Response')
			{
				cl('PHI2K14: ContentSecurityControl response: [' + data + ']');
			}
		} break;

		case 'UserInputControl':
		{
			if (a.CmdType === 'Response')
			{
				cl('PHI2K14: UserInputControl response: VirtualKeyForwardMode[' + a.CommandDetails.VirtualKeyForwardMode + ']');
			}
		} break;

		case 'AudioLanguage':
		{
			if (a.CmdType === 'Response')
			{
				if (a.CommandDetails.AudioLanguageList.length > 0)
				{
					for (i = 0; i < a.CommandDetails.AudioLanguageList.length; i++)
					{
						cl('PHI2K14: AudioLanguage['+i+'] ' +
							'idx[' + a.CommandDetails.AudioLanguageList[i].AudioLanguageIndex + '] ' +
							'lang[' + a.CommandDetails.AudioLanguageList[i].Language + '] ' +
							'type[' + a.CommandDetails.AudioLanguageList[i].Type + '] ' +
							'pid[' + a.CommandDetails.AudioLanguageList[i].Pid + ']');
					}
				}
				// obj_dump_recursive(a.CommandDetails);
			}
		} break;

		case 'Error':
		{
			if (a.CmdType === 'Response')
			{
				cl('PHI2K14: ERROR event WiXP response: Cookie[' + a.Cookie + '] SvcVer[' + a.SvcVer + '] JSON[' + data + ']');
			}
		} break;

		default:
		{
			cl('PHI2K14: philips_WiXPEvent -- WARN: DEFAULT: Fun[' + a.Fun + '] CmdType[' + a.CmdType + ']');
			// obj_dump_recursive(a);
		} break;
	} // end switch
} // end philips_WiXPEvent
