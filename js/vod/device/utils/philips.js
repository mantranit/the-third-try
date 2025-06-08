var webixpObject;

var philips_CurrentTxtStatus = 'Off';
var philips_CurrentMuteStatus = 'Off';
var philips_CurrentPowerStatus = 'Off';
var philips_TunedSource = '';
var philips_CurrentApplication = '';
var philips_UseNativeKeys = false;
var philips_rcForwardState = false;
var philips_inputCheck; // setinterval timer
var philips_inputSelTimer;
var philips_PowerOnTimer = setTimeout(function(){});

var philips_curInputSel = 0;
var philips_curInputFound = false;

var philips_inputArray = [
	'',           // 0:reserved
	'TV',         // 1:main tuner
	'',           // 2:second tuner
	'',           // 3:AV1
	'',           // 4:AV2
	'Component1', // 5
	'',           // 6:Component2
	'VGA',        // 7
	'HDMI1',      // 8
	'HDMI2',      // 9
	'',           // 10:HDMI3
	'USB',        // 11
	'Side HDMI',  // 12
	'Side AV',    // 13
	'Menu'        // 14
];


var philips_svc_version = '0.1';

var philips_input = {
	RESERVED       : 0,
	MAINTUNER      : 1,
	MAIN           : 1,
	SECONDARYTUNER : 2,
	SECONDARY      : 2,
	AV1            : 3,
	AV2            : 4,
	YPBPR1         : 5,
	COMPONENT1     : 5,
	YPBPR2         : 6,
	COMPONENT2     : 6,
	SVIDEO         : 6,
	VGA            : 7,
	HDMI1          : 8,
	HDMI2          : 9,
	HDMI3          : 10,
	USB            : 11,
	SIDEHDMI       : 12,
	HDMISIDE       : 12,
	SIDEAV         : 13,
	AVSIDE         : 13
};


var philips_osd = {
	RESERVED     : 0,
	EPG          : 1,
	TELETEXT     : 2,
	DUALWINDOW   : 3,
	USBMEDIA     : 4,
	USB          : 4,
	AUDIOLIST    : 5,
	SUBTITLELIST : 6,
	CHANNELGRID  : 7,
	MHEG         : 8,
	SI           : 9,
	SIPORTAL     : 9,
	HOMEINFO     : 10,
	SLEEPTIMER   : 11,
	NETTV        : 12,
	ALL          : 0xFF
};


function philips_rcMapping (code)
{
	switch (code)
	{
		// red button
		case 0x6D:
			cl('philips red button');
			keyhandle({ 'keyCode': RMT_RED });
			break;

		// green button
		case 0x6E:
			cl('philips green button');
			keyhandle({ 'keyCode': RMT_GREEN });
			break;

		// yellow button
		case 0x6F:
			cl('philips yellow button');
			keyhandle({ 'keyCode': RMT_YELLOW });
			break;

		// blue button
		case 0x70:
			cl('philips blue button');
			keyhandle({ 'keyCode': RMT_BLUE });
			break;

		// vol+ button
		case 0x10:
			cl('philips vol+ button');
			philips_IncreaseVolume();
			break;

		// vol- button
		case 0x11:
			cl('philips vol- button');
			philips_DecreaseVolume();
			break;

		// power button
		case 0x0C:
			cl('philips power button');
			if (philips_CurrentPowerStatus == 'On')
			{
				philips_CurrentPowerStatus = 'Off';
				philips_setPower(0);
			}
			else
			{
				philips_CurrentPowerStatus = 'On';
				philips_setPower(1);

				/*
				//this works around Smart UI not being set as a switch on feature..
				setTimeout(function() {
					cl('philips_setOsdDisplayStatus: switch to SI portal after power on');
					philips_setOsdDisplayStatus(9, 1);
				}, 6000); // give TV time to turn on..
				*/
			}
			break;

		// mute button
		case 0x0D:
			cl('philips mute button');
			if (philips_CurrentMuteStatus == 'On')
			{
				philips_setMute(0);
				philips_CurrentMuteStatus = 'Off';
			}
			else
			{
				philips_setMute(1);
				philips_CurrentMuteStatus = 'On';
			}
			break;

		// text button
		case 0x3C:
			cl('philips text button');
			keyhandle({ 'keyCode': RMT_GREEN });
			break;

		// my choice button
		case 0x84:
			cl('philips my choice button');
			break;

		// theme tv button
		case 0xC2:
			cl('philips theme tv button');
			break;

		// home button
		case 0x54:
			cl('home button');

			$('*').hide();
			cl('PHI2K12: key=native_home');

			philips_setOsdDisplayStatus(philips_osd.ALL, 0);
			philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);
			setTimeout(function() {
				philips_setLocalOsdSuppress(0);
				philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);
			}, 500);

			if ($('#onpage_iptv').length)
			{
				// iptv.js holds this state var..
				if (iptv.flags.closedcaptions)
					iptv.subtitlesctrl(false);

				setTimeout(function() {
					pc.reset('from=iptv&key=philips_home&channel=' + iptv.channel[iptv.idx].number);
				}, 600);

				return true;
			}

			// cant use pc.reset because this section can be run from outside the main menu
			// where 'pc.' won't be defined
			setTimeout(function() {
				pc.reset();
			}, 600);

			break;

		// arrow up
		case 0x58:
			cl('philips up button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0x07, 0x1C);
				break;
			}
			break;

		// arrow down
		case 0x59:
			cl('philips down button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0x07, 0x1D);
				break;
			}
			break;

		// arrow left
		case 0x5A:
			cl('philips left button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0x07, 0x2C);
				break;
			}
			break;

		// arrow right
		case 0x5B:
			cl('philips right button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0x07, 0x2B);
				break;
			}
			break;

		// OK button
		case 0x5C:
			cl('philips ok button, app['+philips_CurrentApplication+']');
			if (philips_CurrentApplication && philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, code);
				break;
			}
			keyhandle({ 'keyCode': RMT_OK });
			break;

		// stop button
		case 0x31:
			cl('philips stop button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, code);
				break;
			}
			keyhandle({ 'keyCode': RMT_STOP });
			break;

		// pause button
		case 0x30:
			cl('philips pause button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, code);
				break;
			}
			keyhandle({ 'keyCode': RMT_PAUSE });
			break;

		// play button
		case 0x2C:
			cl('philips play button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, code);
				break;
			}
			keyhandle({ 'keyCode': RMT_PLAY });
			break;

		// play/pause key
		case 0x85:
			cl('philips play/pause button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, 0x2C);
				//philips_setUserInputData(0xFF, code);
				break;
			}
			keyhandle({ 'keyCode': RMT_PLAY });
			break;

		// play/pause and channel grid button
		case 0x8E:
			cl('philips play/pause/ch-grid button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, 0x2C);
				//philips_setUserInputData(0xFF, code);
				break;
			}
			keyhandle({ 'keyCode': RMT_PLAY });
			//philips_setOsdDisplayStatus(7, 1); // Show channel grid
			break;

		// ff button
		case 0x28:
			cl('ff button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, code);
				break;
			}
			keyhandle({ 'keyCode': RMT_FF });
			break;

		// rw button
		case 0x2B:
			cl('philips rw button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, code);
				break;
			}
			keyhandle({ 'keyCode': RMT_RW });
			break;

		// find / list button
		case 0xCC:
			cl('philips find/list/guide button');
			keyhandle({ 'keyCode': RMT_TITLES });
			break;

		// adjust button
		case 0x90:
			cl('philips adjust button');
			break;

		// clock button
		case 0x76:
			cl('philips clock button');
			break;

		// ch- button
		case 0x4D:
			cl('philips ch- button');
			// not used, we have direct control when RC forwarding is on, see RMT_CHUP/DN instead..
			break;

		// ch+ button
		case 0x4C:
			cl('philips ch+ button');
			// not used, we have direct control when RC forwarding is on, see RMT_CHUP/DN instead..
			break;

		// back button
		case 0x0A:
			cl('philips back button');
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0xFF, code);
				break;
			}

			keyhandle({ 'keyCode': RMT_BACK });
			break;

		// source button
		case 0x38:
			cl('source button');
			keyhandle({ 'keyCode': RMT_INPUT });
			break;

		// options button
		case 0x40:
			cl('philips options button');
			keyhandle({ 'keyCode': RMT_HELP });
			break;

		// subtitle button
		case 0x4B:
			cl('philips subtitle button');
			keyhandle({ 'keyCode': RMT_GREEN });
			break;

		// digit 0 button
		case 0x00:
			cl('philips 0 button');
			keyhandle({ 'keyCode': RMT_0 });
			break;

		// digit 1 button
		case 0x01:
			cl('philips 1 button');
			keyhandle({ 'keyCode': RMT_1 });
			//philips_getCurrentTime();
			break;

		// digit 2 button
		case 0x02:
			cl('philips 2 button');
			keyhandle({ 'keyCode': RMT_2 });
			break;

		// digit 3 button
		case 0x03:
			cl('philips 3 button');
			keyhandle({ 'keyCode': RMT_3 });
			break;

		// digit 4 button
		case 0x04:
			cl('philips 4 button');
			keyhandle({ 'keyCode': RMT_4 });
			break;

		// digit 5 button
		case 0x05:
			cl('philips 5 button');
			keyhandle({ 'keyCode': RMT_5 });
			break;

		// digit 6 button
		case 0x06:
			cl('philips 6 button');
			keyhandle({ 'keyCode': RMT_6 });
			break;

		// digit 7 button
		case 0x07:
			cl('philips 7 button');
			keyhandle({ 'keyCode': RMT_7 });
			break;

		// digit 8 button
		case 0x08:
			cl('philips 8 button');
			keyhandle({ 'keyCode': RMT_8 });
			break;

		// digit 9 button
		case 0x09:
			cl('philips 9 button');
			keyhandle({ 'keyCode': RMT_9 });
			break;

		// Smart TV key
		case 0xBE:
			cl('philips smart tv button');
			break;

		// TV key
		case 0x9F:
			cl('philips tv button');

			// if NOT on IPTV page then switch to it..
			if (!$('#onpage_iptv').length)
				pc.switchIptv();
			break;

		// Info key
		case 0x0F:
			cl('philips info button');
			keyhandle({ 'keyCode': RMT_INFO });
			break;

		// format key
		case 0xF5:
			cl('philips format button');
			break;

		// alarm key
		case 0x77:
			cl('philips alarm button');
			break;

		// adjust key
		case 0xBF:
			cl('philips adjust button');
			break;

		default:
			cl('philips rc fwd default key, code: ' + code);
			break;
	}
}

/////////////////////

// triggered autonomously and after doing 'philips_WiXPGetTVStatus()'
function philips_WiXPEvent (frm)
{
	try
	{
		var j = $.parseJSON(frm);

		if (j.Fun == 'TvStatus')
		{
			philips_CurrentPowerStatus = j.ResponseDetails.PowerStatus;
			philips_TunedSource        = j.ResponseDetails.CurrentSource;
			var applist = j.ResponseDetails.ApplicationStatus;

			if (philips_TunedSource == 'Main Tuner')
				philips_TunedSource = 'TV';

			philips_UseNativeKeys = false;
			if (applist.length > 0)
			{
				// this only picks the first/primary app, more than one can be active (i.e. SIPortal and homescreen)
				philips_CurrentApplication = applist[0];

				$.each(applist, function(i, z)
				{
					cl('PHI2K12: WiXPEvent, i='+i+', app='+z);

					// these 2 are worst case scenario fallbacks..
					if (z == '_WIXP_APPLICATION_HomeScreen')
						philips_UseNativeKeys = true;

					if (z == '_WIXP_APPLICATION_SourceList')
						philips_UseNativeKeys = true;

					// override so that if USB is there AT ALL, it becomes primary app..
					if (z == '_WIXP_APPLICATION_USBcontentbrowser')
						philips_CurrentApplication = z;
				});
			}
			else // shouldn't happen..
				philips_CurrentApplication = '_WIXP_APPLICATION_WatchTV_noapplist'

			cl('PHI2K12: WiXPEvent: POWER[' + philips_CurrentPowerStatus + '] SRC[' + philips_TunedSource + ']');
			
			if (philips_CurrentPowerStatus == 'StandbyToOn')
			{
				clearTimeout(philips_PowerOnTimer);
				philips_PowerOnTimer = setTimeout(function()
				{
					if (config.iptv_enabled != 1) // RF only..
					{
						cl('PHI2K12: StandbyToOn Stop..');
						browser.StopIPTV();
					}
				}, 5000);
			}

			// set rc fwd off if on native app, otherwise enable regardless of 'current' app
			if (philips_UseNativeKeys)
				philips_setRcControl(1); // disable RC fwd if enabled
			else
				philips_setRcControl(2); // enable RC fwd if disabled

			// philips_CurrentApplication = primary one (there may be other secondary apps)..
			if (philips_CurrentApplication == '_WIXP_APPLICATION_SIPortal')
				philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);
		}

		if (j.Fun == 'ProfessionalSettings')
		{
			var modelNr    = j.ResponseDetails._WIXP_PROFESSIONAL_PARAMETER_ModelNumber;
			var serialNr   = j.ResponseDetails._WIXP_PROFESSIONAL_PARAMETER_SerialNumber;
			var roomNr     = j.ResponseDetails._WIXP_PROFESSIONAL_PARAMETER_RoomID;
			var pMac       = j.ResponseDetails._WIXP_PROFESSIONAL_PARAMETER_TVNetworkStatus['Ethernet MAC Address'];
			var ipAddress  = j.ResponseDetails._WIXP_PROFESSIONAL_PARAMETER_TVNetworkStatus['IP Address'];
			cl('PHI2K12: WiXPEvent: Proset model:' + modelNr + ', sn:' + serialNr + ', room:' + roomNr + ', mac:' + pMac + ', ip:' + ipAddress);
		}
		return 1;
	}
	catch(e)
	{
		cl('PHI2K12: WiXPEvent: JSON response error[' + e.message + '] JSON[' + frm + ']');
		return e;
	}
}

function philips_WiXPGetTVStatus ()
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'CmdType'        : 'Request',
		'Fun'            : 'TvStatus',
		'RequestDetails' : {
			//'ApplicationStatus' : [],
			//'PowerStatus'       : [],
			//'CurrentSource'     : []
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}


function philips_WiXPSetChannelIP (channel_ip, channel_port, bitratemode)
{
	bitratemode = bitratemode || 'VBR';  // CBR and VBR are options

	var wixpcmd = {
		'Svc'           : 'WIXP',
		'SvcVer'        : philips_svc_version,
		'Cookie'        : 1234,
		'CmdType'       : 'Change',
		'Fun'           : 'ChannelSelection',
		'ChangeDetails' : {
			'SelectChannelBy' : 'ChannelTuningDetails',
			'ChannelTuningDetails' : {
				'URL' : 'multicast://' + channel_ip + ':' + channel_port + '/0/0/0/' + bitratemode
			}
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

// This just plays a false channel, as there is no native 'stop'..
function philips_WiXPStopChannel()
{
	var wixpcmd = {
		'Svc'           : 'WIXP',
		'SvcVer'        : philips_svc_version,
		'Cookie'        : 1234,
		'CmdType'       : 'Change',
		'Fun'           : 'ChannelSelection',
		'ChangeDetails' : {
			'SelectChannelBy' : 'ChannelTuningDetails',
			'ChannelTuningDetails' : {
				'URL' : 'multicast://239.254.254.254:1/0/0/0'
			} //,'TrickMode' : 'Stop' // doesn't work..
		}
	};

	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPSwitchOnChannelIP (channel_ip, channel_port, bitratemode)
{
	bitratemode = bitratemode || 'VBR';  // CBR and VBR are options

	var wixpcmd = {
		'Svc'           : 'WIXP',
		'SvcVer'        : philips_svc_version,
		'Cookie'        : 1234,
		'CmdType'       : 'Change',
		'Fun'           : 'ProfessionalSettings',
		'ChangeDetails' : {
			'_WIXP_PROFESSIONAL_PARAMETER_SwitchOnChannel':
			{
				'SelectChannelBy'      : 'ChannelTuningDetails',
				'ChannelTuningDetails' : {
					'URL' : 'multicast://' + channel_ip + ':' + channel_port + '/0/0/0/' + bitratemode
				}
			}
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

function philips_WiXPStatus ()
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'CmdType'        : 'Request',
		'Fun'            : 'ProfessionalSettings',
		'RequestDetails' : {
			'ProfessionalParameters' : [
				'_WIXP_PROFESSIONAL_PARAMETER_SwitchOnChannel',
				'_WIXP_PROFESSIONAL_PARAMETER_ModelNumber',
				'_WIXP_PROFESSIONAL_PARAMETER_SerialNumber',
				'_WIXP_PROFESSIONAL_PARAMETER_VSecuresTVID',
				'_WIXP_PROFESSIONAL_PARAMETER_RoomID',
				'_WIXP_PROFESSIONAL_PARAMETER_RawWIXP',
				'_WIXP_PROFESSIONAL_PARAMETER_SimplySharePin',
				'_WIXP_PROFESSIONAL_PARAMETER_TVNetworkDetails',
				'_WIXP_PROFESSIONAL_PARAMETER_TVNetworkStatus'
			]
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

// status = ON or OFF
function philips_WiXPSubtitles (status)
{
	var wixpcmd = {
		'Svc'           : 'WIXP',
		'SvcVer'        : philips_svc_version,
		'CmdType'       : 'Change',
		'Fun'           : 'Subtitles',
		'ChangeDetails' : {
			'SubtitleState' : status
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

// status = ON or OFF
function philips_WiXPTeletext (status)
{
	var wixpcmd = {
		'Svc'           : 'WIXP',
		'SvcVer'        : philips_svc_version,
		'CmdType'       : 'Change',
		'Fun'           : 'Teletext',
		'ChangeDetails' : {
			'TeletxtState' : status
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

// cloneType is 'All' or 'Settings' (use All if in doubt)..
function philips_WiXPIPCloneToTV (cloneType)
{
	var wixpcmd = {
		'Svc'           : 'WIXP',
		'SvcVer'        : '1.23',
		'CmdType'       : 'Change',
		'Fun'           : 'Clone',
		'Cookie'        : '1234',
		'ChangeDetails' : {
			'Medium'    : 'IP',
			'Direction' : 'ToTV',
			'Item'      : cloneType
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}

function philips_sendIxPCommand(command)
{
	//cl('PHI2K12: IXP-TX[' + command + ']');
	try {
		ixpObject.sendJSIXPMessage(command, (command.length/2));
	} catch(e) {
		cl('sendJSIXPMessage err [' + e.message + '] command[' + command + ']');
	}
}

function philips_sendWIxPCommand(command)
{
	try {
		webixpObject.WebIxpSend(JSON.stringify(command));
	} catch(e) {
		cl('WebIxpSend err:' + e.message);
	}
}

function philips_buildSxpCommand(payload)
{
	// payload = [0xXX, 0xXX...]
	var command = '';
	command = command.concat('0E');
	command = command.concat(num2hexstr(payload.length + 10 + 1));
	command = command.concat('00');
	command = command.concat('00');
	command = command.concat('05');
	command = command.concat(num2hexstr(payload.length + 1 + 1));
	command = command.concat('00');
	command = command.concat('0C');
	for (var j=0; j < payload.length; j++)
	{
		command = command.concat(num2hexstr(payload[j]).toUpperCase());
	}
	command = command.concat(num2hexstr(calcChecksum(payload)))
	command = command.concat('A5');
	command = command.concat('A5');
	return command.toUpperCase();
}

function philips_setRcControl (status, force)
{
	force = force || false;
	// status = 0 : rc fwd enabled, status = 1 : rc fwd disabled, status = 2 : rc fwd enabled except volume

	if (status == 0 || status == 2) // enabled
	{
		if (philips_rcForwardState && !force) // already enabled, ignore..
			return;
		else
			philips_rcForwardState = true;
	}
	else // disable
	{
		if (!philips_rcForwardState && !force) // already disabled, ignore
			return;
		else
			philips_rcForwardState = false;
	}

	var payload = [0x20, 0xA3, 0x01, status];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	cl('PHI2K12: setRcControl, status='+status+', force='+force+', command='+command);
	return command;
}


function philips_setSubtitles (command)
{
	var payload = [0x20, 0x69, command]; // command 0 = off, 1 = on
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

function philips_getExtendedStatus ()
{
	var payload = [0x21, 0x14];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

function philips_setUserInputData (rcstd, rc)
{
	var payload = [0x20, 0x1B, rcstd, rc, 0x00, 0xFF, 0xFF];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

/*
type:
0 = Reserved
1 = EPG
2 = Teletext
3 = Dual window (text and video, multi-view)
4 = USB content browser
5 = Audio language list
6 = Subtitle language list
7 = Channel grid
8 = MHEG
9 = SI Portal
10 = Home information (derive from Scenea)
11 = Sleep timer bar
12 = NetTV
255 = dont care (all related OSD) ??

status:
Display status of OSD type in Param1
0 = OSD display is off
1 = OSD display is on
*/

function philips_setOsdDisplayStatus (type, status)
{
	var payload = [0x20, 0x59, type, status];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	cl('PHI2K12: setOsdDisplayStatus='+command);
	return command;
}

function philips_getOsdDisplayStatus ()
{
	// doesn't seem to work (no reply)
	// also docs contradict whether a get command (0x21) is possible
	// 0x59 section says no, big summary table says yes..
	var payload = [0x21, 0x59];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	cl('PHI2K12: getOsdDisplayStatus='+command);
	return command;
}

function philips_setLocalOsdSuppress (status)
{
	// status = 0 : osd not suppressed, status = 1 : osd suppressed
	var payload = [0x20, 0x1F, status];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	cl('PHI2K12: philips_setLocalOsdSuppress='+status);
	return command;
}

function philips_setPower (status)
{
	// status = 0 : standby status = 1 : power on
	var payload = [0x20, 0x18, status];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	cl('PHI2K12: philips_setPower='+status);
	return command;
}

function philips_IncreaseVolume ()
{
	var payload = [0x20, 0x45, 0x01];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

function philips_DecreaseVolume ()
{
	var payload = [0x20, 0x45, 0x00];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

function philips_setMute (status)
{
	var payload = [0x20, 0x46, status];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

/* source list from SxP 3.4 spec
0 = Reserved
1 = Main Tuner
2 = Secondary Tuner
3 = AV1 or Scart1
4 = AV2 or Scart2 or S-Video
5 = YPbPr1
6 = YPbPr2 or S-Video
7 = VGA
8 = HDMI1
9 = HDMI2
10 = HDMI3
11 = USB
12 = Side HDMI
13 = Side AV
*/

function philips_setSource (source)
{
	cl('PHI2K12: setSource['+source+']');
	var payload = [0x20, 0xAC, source];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

function philips_setChannel (channel)
{
	cl('PHI2K12: setChannel['+channel+']');
	var dig12 = 0;
	var dig34 = 0;
	var dig56 = parseInt(channel);
	var payload = [0x20, 0xAB, 0xFF, dig12, dig34, dig56, 0xFF, 0xFF, 0xFF];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

function philips_setDate (dd, mt, yy)
{
	var yy_h = Math.floor(yy / 256);
	var yy_l = yy - yy_h * 256;
	var payload = [0x20, 0xD1, dd, mt, yy_h, yy_l];
	var command = philips_buildSxpCommand(payload);
	philips_sendIxPCommand(command);
	return command;
}

function philips_SxpTVIEvent (ixpresponse, len)
{
	//cl('PHI2K12: IXP-RX['+ixpresponse+']');
	var ixpmsg = philips_parseIxPresponse(ixpresponse);

	//if (ixpresponse.substr(0, 4) != '0E14' && ixpresponse.substr(0, 4) != '0E0D' && ixpresponse.substr(0, 4) != '0E12')

	if (ixpmsg['type'] == '16') // ACK
		return 1;

	switch (ixpmsg['value'])
	{
		case '1B': // user input
			if (ixpmsg['params'][2] == '00') // key released
				philips_rcMapping(ixpmsg['params'][1]); // IR command code

			//cl('PHI2K12: ixpextstatus, value='+ixpmsg['value']+', p0=' + ixpmsg['params'][0] + ', p1=' + ixpmsg['params'][1] + ', p2=' + ixpmsg['params'][2]);
			break;

		case '14': // extended status response..
			var sxpPowerStatus = ixpmsg['params'][1] & 0xC0; // get top 2 bits (7/8) of param2
			if (sxpPowerStatus == 0 || sxpPowerStatus == 192) // standby or transiting to standby
				philips_CurrentPowerStatus = 'Off';
			else
				philips_CurrentPowerStatus = 'On';

			//cl('PHI2K12: ixpextstatus, value='+ixpmsg['value']+', p0=' + ixpmsg['params'][0] + ', p1=' + ixpmsg['params'][1] + ', p2=' + ixpmsg['params'][2]);
			break;

		default:
			//cl('PHI2K12: ixpextstatus, value='+ixpmsg['value']+', p0=' + ixpmsg['params'][0] + ', p1=' + ixpmsg['params'][1] + ', p2=' + ixpmsg['params'][2]);
			break;
	}

	return 1;
}

function philips_parseIxPresponse (ixpresponse)
{
	var cmdtype   = ixpresponse.substring(16, 18);
	var cmdval    = ixpresponse.substring(18, 20);
	var cmdparams = [];

	if (cmdtype == '16')
	{
		cmdparams[0] = ixpresponse.substring(18, 20);

		if (cmdparams[0] == '00')
			ackflag = 'ACK';
		else if (cmdparams[0] == '01')
			ackflag = 'NACK';
		else
			ackflag = 'NAV';
	}
	else
	{
		switch (cmdval)
		{
			case '1B':
				var sys    = parseInt(ixpresponse.substring(20, 22), 16);
				var rccode = parseInt(ixpresponse.substring(22, 24), 16);
				var rctype = parseInt(ixpresponse.substring(24, 26), 16);
				cmdparams[0] = sys;
				cmdparams[1] = rccode;
				cmdparams[2] = rctype;
				break;

			case 'D2':
				var hour   = parseInt(ixpresponse.substring(20, 22), 16);
				var minute = parseInt(ixpresponse.substring(22, 24), 16);
				var second = parseInt(ixpresponse.substring(24, 26), 16);
				serverDate['hour']   = hour;
				serverDate['minute'] = minute;
				serverDate['second'] = second;
				break;

			case 'D1':
				var day   = parseInt(ixpresponse.substring(20, 22), 16);
				var month = parseInt(ixpresponse.substring(22, 24), 16);
				var year  = parseInt(ixpresponse.substring(24, 26), 16) * 256 + parseInt(ixpresponse.substring(26, 28), 16);
				serverDate['day']    = day;
				serverDate['month']  = month;
				serverDate['year']   = year;
				break;

			default:
				cmdparams[0] = parseInt(ixpresponse.substring(20, 22), 16);
				cmdparams[1] = parseInt(ixpresponse.substring(22, 24), 16);
				cmdparams[2] = parseInt(ixpresponse.substring(24, 26), 16);
				break;
		}
	}

	var ixpmsg = {'type' : cmdtype, 'value' : cmdval, 'params' : cmdparams};
	return ixpmsg;
}

function philips_broadcastEvent ()
{
	switch (broadcast.playState)
	{
		case 0:
			cl('broadcastEvent(): unrealized');
			break;

		case 1:
			cl('broadcastEvent(): connecting');
			break;

		case 2:
			cl('broadcastEvent(): presenting');
			break;

		case 3:
			cl('broadcastEvent(): stopped');
			break;

		default:
			cl('broadcastEvent(): unknown state: ' + broadcast.playState);
			break;
	}
}

// convert number into an hex string
function num2hexstr (num)
{
	var hexstr = '';
	if (num < 16){
		hexstr = hexstr.concat('0');
		hexstr = hexstr.concat(num.toString(16));
	}
	else {
		hexstr = hexstr.concat(num.toString(16));
	}
	return hexstr.toUpperCase();
}

// calculate payload checksum
function calcChecksum (payload)
{
	var checksum = 0;
	for (var j = 0; j < payload.length; j++){
		checksum ^= payload[j];
	}
	return checksum;
}

// nop function for 2k14 compatibility purposes.
function philips_WiXPKeyForward () {}

function philips_WiXPSetInput(input)
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 299,
		'CmdType'        : 'Change',
		'Fun'            : 'Source',
		'CommandDetails' : {
			'TuneToSource' : input
		}
	};
	philips_sendWIxPCommand(wixpcmd);
}


// This is designed for use within the main menu
// IPTV uses a different version..
function philips_InputSelector_Menu ()
{
	if ($('#inputselect').is(':hidden'))
	{
		//processKeys = function() {};

		philips_WiXPGetTVStatus();
		philips_curInputFound = false;

		$('#inputselect').empty();

		$.each(philips_inputArray, function(idx, val) {
			if (val) // not blank..
				$('#inputselect').append('<div id="input_' + idx + '">' + val + '</div>');
		});

		$('#inputselect').show();

		setTimeout(function() {
			for (x = 0; x < philips_inputArray.length-1; x++)
			{
				if (philips_inputArray[x] == philips_TunedSource)
				{
					$('#inputselect div#input_' + x).addClass('highlight');
					philips_curInputSel = x;
					philips_curInputFound = true;
					cl('1: philips_curInputFound true, set philips_curInputSel='+x+', philips_curInputFound=true SRC['+philips_TunedSource+']');
				}
			}

			if (!philips_curInputFound)
			{
				philips_curInputSel = 14; // MENU
				philips_curInputFound = true;
				cl('1: philips_curInputFound false, set philips_curInputSel=14[menu], philips_curInputFound=true SRC['+philips_TunedSource+']');
			}
		}, 500);

		default_promptProcessKeys();
		promptKeyAction = new promptProcessKeys();

		promptProcessKeys.prototype.keyBlue = function() {
			pc.reset();
		}

		// input handler after the first time..
		promptProcessKeys.prototype.keyInput = function()
		{
			// This key will take over until reset (Menu input select or menu/blue key)
			if ($('#inputselect').is(':visible'))
			{
				$('#inputselect').hide();

				// only reset the keyhandler when menu is still visible (i.e.
				// user has not selected an input but only shown and hidden the
				// input select div)

				if (iptv.playing || ss.playing) // these don't use activezone, they are special..
				{
					pc.enablePageKeyHandler();
					return;
				}

				switch ($('.activezone').attr('id'))
				{
					case 'submenu':
						pc.enableSubMenuKeyHandler();
						break;
					case 'pageload':
						pc.enablePageKeyHandler();
						break;
					case 'mainmenu': default:
						pc.enableMainMenuKeyHandler();
						break;
				}
			}
			else
			{
				philips_WiXPGetTVStatus(); // trigger a status response which gives us the current source/input
				philips_curInputFound = false;

				$('#inputselect, #inputselect div').show();
				$('#inputselect div').removeClass('highlight');

				setTimeout(function() {
					for (x = 0; x < philips_inputArray.length-1; x++)
					{
						if (philips_inputArray[x] == philips_TunedSource)
						{
							$('#inputselect div#input_' + x).addClass('highlight');
							philips_curInputSel = x;
							philips_curInputFound = true;
							cl('2: philips_curInputFound true, set philips_curInputSel='+x+', philips_curInputFound=true SRC['+philips_TunedSource+']');
						}
					}

					if (!philips_curInputFound)
					{
						philips_curInputSel = 0;
						philips_curInputFound = true;
						cl('2: philips_curInputFound false, set philips_curInputSel=0, philips_curInputFound=true SRC['+philips_TunedSource+']');
					}
				}, 500);
			}
		}

		promptProcessKeys.prototype.keyDown = function()
		{
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0x07, 0x1D); // down
				return;
			}

			if (!philips_curInputFound)
				return;

			if ($('#inputselect').is(':hidden'))
				return;

			$('#inputselect div#input_' + philips_curInputSel).removeClass('highlight');
			philips_curInputSel = (philips_curInputSel < philips_inputArray.length - 1) ? philips_curInputSel + 1 : 0;

			while (!philips_inputArray[philips_curInputSel])
				philips_curInputSel = (philips_curInputSel < philips_inputArray.length - 1) ? philips_curInputSel + 1 : 0;

			$('#inputselect div#input_' + philips_curInputSel).addClass('highlight');
		}

		promptProcessKeys.prototype.keyUp = function()
		{
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
			{
				philips_setUserInputData(0x07, 0x1C); // up
				return;
			}

			if (!philips_curInputFound)
				return;

			if ($('#inputselect').is(':hidden'))
				return;

			$('#inputselect div#input_' + philips_curInputSel).removeClass('highlight');
			philips_curInputSel = (philips_curInputSel == 0) ? philips_curInputSel = philips_inputArray.length - 1 : philips_curInputSel - 1;

			while (!philips_inputArray[philips_curInputSel])
				philips_curInputSel = (philips_curInputSel == 0) ? philips_curInputSel = philips_inputArray.length - 1 : philips_curInputSel - 1;

			$('#inputselect div#input_' + philips_curInputSel).addClass('highlight');
		}

		promptProcessKeys.prototype.keyLeft = function()
		{
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
				philips_setUserInputData(0x07, 0x2C);
		}

		promptProcessKeys.prototype.keyRight = function()
		{
			if (philips_CurrentApplication != '_WIXP_APPLICATION_SIPortal')
				philips_setUserInputData(0x07, 0x2B);
		}

		promptProcessKeys.prototype.keyEnter = function()
		{
			if (!philips_curInputFound)
				return;

			if ($('#inputselect').is(':hidden'))
				return;

			cl('input[' + philips_inputArray[philips_curInputSel] + '] idx[' + philips_curInputSel + ']');

			//$('#inputselect').hide();
			//return;

			// can't have the SS kick in while on an input..
			// this will be reset by going home, or input->tv or input->menu
			ss.clearSetTimeout();
			ss.enabled = false;

			if (philips_inputArray[philips_curInputSel] == 'TV') // IPTV override
			{
				$('#inputselect').hide();

				if (iptv.playing) // already on iptv page
				{
					iptv.initkeymap();
				}
				else
				{
					setTimeout(function() {
						pc.switchIptv();
					}, 500);
				}
				return;
			}

			if (philips_inputArray[philips_curInputSel] == 'Menu')
			{
				philips_setOsdDisplayStatus(philips_osd.ALL, 0);
				philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);
				setTimeout(function() {
					philips_setLocalOsdSuppress(0);
					philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);
				}, 500);

				setTimeout(function() {
					pc.reset();
				}, 700);
				return;
			}

			if (philips_inputArray[philips_curInputSel] == 'USB')
			{
				philips_setOsdDisplayStatus(4, 1); // USB viewer 'app'
				setTimeout('philips_setSource(11)', 1100); // 11 = USB input, this seems to be the important one.. it works 9/10 times..
				cl('PHI2K12: Switch to USB');
				return;
			}

			$('body, #pageload').css({
				'background-color': 'transparent',
				'background-image': 'none'
			});

			if (config.scrolling_background == 1)
				$.vegas('stop');

			$('.vegas-background').hide();
			$('div').not('#inputselect_current, #debug').hide();

			// for this to work, philips_curInputSel must match the correct ID
			// i.e. 'HDMI1' array index must be '8'

			// The logic here:
			// 1. Suppress OSD
			// 2. Hide the portal
			// 4. Set the source
			// 5. Wait until the source is changed (loop)
			// 6. Show the portal again

			cl('PHI2K12: setLocalOsdSuppress=1');
			philips_setLocalOsdSuppress(1);

			philips_TunedSource = '';

			setTimeout(function() {
				cl('PHI2K12: setOsdDisplayStatus=9,0');
				philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 0); // hide the portal.
			}, 500);

			var tuneCheckCounter = 0;

			setTimeout(function() {
				cl('philips_setSource('+philips_curInputSel+')');
				philips_setSource(philips_curInputSel);

				philips_inputCheck = setInterval(function() {
					philips_WiXPGetTVStatus(); // trigger a status response which gives us the current source/input

					tuneCheckCounter++;
					if (tuneCheckCounter > 10)
					{
						tuneCheckCounter = 0;
						cl('PHI2K12: CANT-TUNE-NO-SIGNAL');

						clearInterval(philips_inputCheck);

						if ($('#inputselect_current').length)
						{
							clearTimeout(philips_inputSelTimer);
							$('#inputselect_current').html('NO SIGNAL');
						}
						else
							$('body').append('<div id="inputselect_current">NO SIGNAL</div>');

						philips_inputSelTimer = setTimeout(function() {
							$('#inputselect_current').fadeOut(function(){
								$(this).remove();
							});
						}, 7000);

						setTimeout(function() {
							cl('PHI2K12: setLocalOsdSuppress=0');
							philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);

							cl('PHI2K12: setOsdDisplayStatus=9,1');
							setTimeout(function() {
								philips_setLocalOsdSuppress(0);
								philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);
							}, 500);
						}, 600);
					}

					if (philips_inputArray[philips_curInputSel] == philips_TunedSource)
					{
						cl('PHI2K12: TUNED='+philips_TunedSource);
						clearInterval(philips_inputCheck);

						if ($('#inputselect_current').length)
						{
							clearTimeout(philips_inputSelTimer);
							$('#inputselect_current').html(philips_inputArray[philips_curInputSel]);
						}
						else
						{
							$('body').append(
								'<div id="inputselect_current">' + philips_inputArray[philips_curInputSel] + '</div>'
							);
						}

						philips_inputSelTimer = setTimeout(function() {
							$('#inputselect_current').fadeOut(function(){
								$(this).remove();
							});
						}, 7000);

						setTimeout(function() {
							cl('PHI2K12: setOsdDisplayStatus=9,1');
							philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);

							setTimeout(function() {
								cl('PHI2K12: setLocalOsdSuppress=0');
								philips_setLocalOsdSuppress(0);
								philips_setOsdDisplayStatus(philips_osd.SIPORTAL, 1);
							}, 500);
						}, 600);
					}
					else
						cl('PHI2K12: NOT-TUNED-YET=' + tuneCheckCounter);

				}, 500);

			}, 1000);
		}

		pc.enablePromptKeyHandler();
	}
}


function philips_WiXPGetInput()
{
	var wixpcmd = {
		'Svc'            : 'WIXP',
		'SvcVer'         : philips_svc_version,
		'Cookie'         : 101,
		'CmdType'        : 'Request',
		'Fun'            : 'Source'
	};
	philips_sendWIxPCommand(wixpcmd);
}
