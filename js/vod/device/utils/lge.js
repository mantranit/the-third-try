// 'use strict';

/*!
 * ============================================================================
 *   Creative Innovation Center, LG ELECTRONICS INC., SEOUL, KOREA
 *   Copyright(c) 2015 by LG Electronics Inc.
 *
 *   Release Version : 1.19.0.4457
 * ============================================================================
 */
var extHcapSecure;var extRegisterHcapCloseHandler;var extDisableHcapConsoleLog;var hcap;if(hcap===undefined){(function(){hcap={API_VERSION:"1.19.0.4457"};var g=[],e=0,i=[],k=null,o=false,d=false,n=false,c=null,f=null,l=null,b=false,m=null,a=null;function j(r){if(extDisableHcapConsoleLog!==true){console.log(r)}}if(extDisableHcapConsoleLog===true){console.log("hcap console log is disabled")}else{console.log("hcap console log is enabled")}j("check external value : extDisableHcapConsoleLog = "+extDisableHcapConsoleLog+", extHcapSecure = "+extHcapSecure+", extRegisterHcapCloseHandler = "+extRegisterHcapCloseHandler);function p(){var r=navigator.userAgent,t=r.match(/Windows/),s=r.match(/Macintosh/),u=r.match(/Mac OS X/);j("UA = '"+r+"'");if(t||s||u){j("HCAP websocket off");return true}return false}b=p();function h(r,x,s,y){var v="",t="",u="";u=x[r];try{v=s[u];t=typeof v}catch(w){v="<unknown value>";t="unknown"}if(t==="function"){v="{/*function*/}"}else{if(t==="object"){v=m("",v)}else{if(t==="string"){v='"'+v+'"'}}}y+='"'+u+'" : '+v;if(r<x.length-1){y+=", "}return y}m=function(u,s){var t=0,r="",v=[],w="";for(r in s){if(s.hasOwnProperty(r)){v.push(r)}}v.sort();for(t=0;t<v.length;t+=1){w=h(t,v,s,w)}return u+"{"+w+"}"};function q(v,u){var t="",s=v,r=document.createEvent("HTMLEvents");j(m("event received, ",u));r.initEvent(s,true,false);for(t in u){if(u.hasOwnProperty(t)){r[t]=u[t]}}document.dispatchEvent(r)}c=function(){if(d){j("websocket : connection is in progress");return}d=true;if(extHcapSecure!==true){j("default hcap connection");k=new WebSocket("ws://127.0.0.1:8053/hcap_command")}else{j("secure hcap connection");k=new WebSocket("wss://localhost:8054/hcap_command")}k.onopen=function(){j("websocket : onopen");d=false;o=true;setTimeout(f(),5)};k.onmessage=function(r){var v=JSON.parse(r.data),s=v.command_id,u=v.command,t=v.result;if(s==="event"){if(u==="debug_event_received"){if(v.enable_log){console.log("hcap console log is enabled")}else{console.log("hcap console log is disabled")}extDisableHcapConsoleLog=!v.enable_log}else{q(u,v)}}else{if(i.length>0&&i[0].command_id===s){j(m("command_id = "+s+" received, ",v));if(t){if(i[0].onSuccess){i[0].onSuccess(v)}}else{if(i[0].onFailure){i[0].onFailure(v)}}i.splice(0,1);n=false;f()}else{j(m("invalid response from server ",v));n=false;f()}}};k.onclose=function(){j("websocket : onclose");d=false;o=false;setTimeout(f(),500)};if(extRegisterHcapCloseHandler==="onbeforeunload"){window.onbeforeunload=function(){j("close hcap websocket in onbeforeunload handler");k.onclose=function(){return undefined};k.close()}}else{if(extRegisterHcapCloseHandler==="onunload"){window.onunload=function(){j("close hcap websocket in onunload handler");k.onclose=function(){return undefined};k.close()}}}};f=function(){if(n){return}n=true;if(o){if(i.length>0){j(m("command_id = "+i[0].command_id+" sent, ",JSON.parse(i[0].param_text)));k.send(i[0].param_text);return}}else{setTimeout(c(),500)}n=false};l=function(u,t){if(u===null||u===""||t===null){return}if(b){if(t.onFailure){t.onFailure({errorMessage:"HCAP WebSocket is not available in this browser"})}return}if(e>1024){e=0}else{e+=1}var r=e.toString(),s="";t.command_id=r;t.command=u;s=JSON.stringify(t,null);i[i.length]={command_id:r,param_text:s,onSuccess:t.onSuccess,onFailure:t.onFailure};j(m("command_id = "+r+" added, ",i[i.length-1]));f()};if(!b){setTimeout(f(),200)}hcap.preloadedApplication={};hcap.preloadedApplication.getPreloadedApplicationList=function(r){l("get_preloaded_application_list",r)};hcap.preloadedApplication.launchPreloadedApplication=function(r){l("launch_preloaded_application",r)};hcap.preloadedApplication.destroyPreloadedApplication=function(r){l("destroy_preloaded_application",r)};hcap.video={};hcap.video.getVideoSize=function(r){l("get_video_size",r)};hcap.video.setVideoSize=function(r){l("set_video_size",r)};hcap.video.getOsdTransparencyLevel=function(r){l("get_osd_transparency_level",r)};hcap.video.setOsdTransparencyLevel=function(r){l("set_osd_transparency_level",r)};hcap.video.isVideoMute=function(r){l("get_video_mute",r)};hcap.video.setVideoMute=function(r){l("set_video_mute",r)};hcap.volume={};hcap.volume.getVolumeLevel=function(r){l("get_volume_level",r)};hcap.volume.setVolumeLevel=function(r){l("set_volume_level",r)};hcap.channel={};hcap.channel.NO_STREAM_PID=8191;hcap.channel.ChannelType={UNKNOWN:0,RF:1,IP:2,RF_DATA:3,IP_DATA:4};hcap.channel.Polarization={UNKNOWN:0,VERTICAL:1,HORIZONTAL:2,LEFT_HAND_CIRCULAR:3,RIGHT_HAND_CIRCULAR:4};hcap.channel.RfBroadcastType={UNKNOWN:0,TERRESTRIAL:16,TERRESTRIAL_2:17,SATELLITE:32,SATELLITE_2:33,CABLE:48,CABLE_STD:49,CABLE_HRC:50,CABLE_IRC:51,ANALOG_PAL_BG:64,ANALOG_PAL_DK:65,ANALOG_PAL_I:66,ANALOG_PAL_M:67,ANALOG_PAL_N:68,ANALOG_SECAM_BG:69,ANALOG_SECAM_DK:70,ANALOG_SECAM_L:71,ANALOG_NTSC:72};hcap.channel.IpBroadcastType={UNKNOWN:0,UDP:16,RTP:32};hcap.channel.VideoStreamType={MPEG1:1,MPEG2:2,MPEG4_VISUAL:16,MPEG4_AVC_H264:27,HEVC:36,AVS:66};hcap.channel.AudioStreamType={MPEG1:3,MPEG2:4,MPEG2_AAC:15,MPEG4_HEAAC:17,AC3:129,EAC3:130,ANALOG_BG:256,ANALOG_I:257,ANALOG_DK:258,ANALOG_L:259,ANALOG_MN:260,ANALOG_LP:261,ANALOG_END:262};hcap.channel.InbandDataServiceType={UNKNOWN:0,MHP:1,MHEG:2,HBBTV:3,NONE:4};hcap.channel.ChannelStatus={UNKNOWN:0,AUDIO_VIDEO_NOT_BLOCKED:16,AV_DISPLAYED:16,AUDIO_VIDEO_BLOCKED:33,NO_SIGNAL:33,AUDIO_ONLY_BLOCKED:34,VIDEO_ONLY_BLOCKED:35};hcap.channel.requestChangeCurrentChannel=function(r){l("request_channel_change",r)};hcap.channel.getCurrentChannel=function(r){l("get_current_channel",r)};hcap.channel.replayCurrentChannel=function(r){l("replay_current_channel",r)};hcap.channel.stopCurrentChannel=function(r){l("stop_current_channel",r)};hcap.channel.requestChannelUp=function(r){l("request_channel_up",r)};hcap.channel.requestChannelDown=function(r){l("request_channel_down",r)};hcap.channel.getDataChannel=function(r){l("get_data_channel",r)};hcap.channel.getStartChannel=function(r){l("get_start_channel",r)};hcap.channel.setStartChannel=function(r){l("set_start_channel",r)};hcap.channel.getCurrentChannelAudioLanguageList=function(r){l("get_current_channel_audio_language_list",r)};hcap.channel.getCurrentChannelAudioLanguageIndex=function(r){l("get_current_channel_audio_language_index",r)};hcap.channel.setCurrentChannelAudioLanguageIndex=function(r){l("set_current_channel_audio_language_index",r)};hcap.channel.getCurrentChannelSubtitleList=function(r){l("get_current_channel_subtitle_language_list",r)};hcap.channel.getCurrentChannelSubtitleIndex=function(r){l("get_current_channel_subtitle_language_index",r)};hcap.channel.setCurrentChannelSubtitleIndex=function(r){l("set_current_channel_subtitle_language_index",r)};hcap.channel.getProgramInfo=function(r){l("get_program_info",r)};hcap.channel.launchInbandDataService=function(r){l("launch_inband_data_service",r)};hcap.channel.getReadyInbandDataService=function(r){l("get_ready_inband_data_service",r)};hcap.channel.requestChannelMapItem=function(r){l("request_channel_map_item",r)};hcap.channel.addChannelMapItem=function(r){l("add_channel_map_item",r)};hcap.channel.removeChannelMapItem=function(r){l("remove_channel_map_item",r)};hcap.channel.getChannelMapItemCount=function(r){l("get_channel_map_item_count",r)};hcap.channel.getChannelMapItemByIndex=function(r){l("get_channel_map_item_by_index",r)};hcap.channel.getChannelMapItemByChannelId=function(r){l("get_channel_map_item_by_channel_id",r)};hcap.channel.clearChannelMap=function(r){l("clear_channel_map",r)};hcap.externalinput={};hcap.externalinput.ExternalInputType={TV:1,COMPOSITE:2,SVIDEO:3,COMPONENT:4,RGB:5,HDMI:6,SCART:7,USB:8,OTHERS:9};hcap.externalinput.getCurrentExternalInput=function(r){l("get_external_input",r)};hcap.externalinput.setCurrentExternalInput=function(r){l("set_external_input",r)};hcap.externalinput.isExternalInputConnected=function(r){l("check_external_input_connected",r)};hcap.carousel={};hcap.carousel.requestCacheCarouselData=function(r){l("request_content",r)};hcap.carousel.isCarouselDataCached=function(r){l("is_content_loaded",r)};hcap.carousel.clearCarouselDataCache=function(r){l("clear_content_cache",r)};hcap.mpi={};hcap.mpi.sendAndReceiveMpiData=function(r){l("send_and_receive_mpi_data",r)};hcap.mpi.sendMpiData=function(r){l("send_mpi_data",r)};hcap.power={};hcap.power.PowerMode={WARM:2,NORMAL:1};hcap.power.getPowerMode=function(r){l("get_power_mode",r)};hcap.power.setPowerMode=function(r){l("set_power_mode",r)};hcap.power.isWarmUpdate=function(r){l("is_power_warm_update",r)};hcap.power.powerOff=function(r){l("power_off",r)};hcap.power.reboot=function(r){l("reboot",r)};hcap.time={};hcap.time.setLocalTime=function(r){l("set_tv_localtime",r)};hcap.time.getLocalTime=function(r){l("get_tv_localtime",r)};hcap.time.getPowerOffTimer=function(r){l("get_power_off_timer_in_min",r)};hcap.time.setPowerOffTimer=function(r){l("set_power_off_timer_in_min",r)};hcap.time.getPowerOnTime=function(r){l("get_power_on_time",r)};hcap.time.setPowerOnTime=function(r){l("set_power_on_time",r)};hcap.time.getAlarmInformation=function(r){l("get_alarm_information",r)};hcap.time.setAlarmInformation=function(r){l("set_alarm_information",r)};hcap.network={};hcap.network.getNumberOfNetworkDevices=function(r){l("get_number_of_network_devices",r)};hcap.network.getNetworkDevice=function(r){l("get_network_device",r)};hcap.network.setNetworkDevice=function(r){l("set_network_device",r)};hcap.network.ping=function(r){l("ping",r)};hcap.network.NetworkEventType={UNKNOWN:0,ETHERNET_PLUGGED:1,ETHERNET_UNPLUGGED:2,WIFI_DONGLE_PLUGGED:3,WIFI_DONGLE_UNPLUGGED:4,IP_CONFLICT:5,IP_NOT_CONFLICT:6,DHCP_SUCCESS:7,DHCP_FAIL:8,UNABLE_REACH_GATEWAY:9,ABLE_REACH_GATEWAY:10,UNABLE_REACH_DNS:11,ABLE_REACH_DNS:12,UNABLE_REACH_INTERNET:13,ABLE_REACH_INTERNET:14,WIFI_AP_SEARCH_COMPLETE:15,WIFI_CONNECTED:16,WIFI_CONNECT_FAIL:17,WIFI_LINK_DROPPED:18};hcap.network.NetworkMode={UNKNOWN:0,WIRE:1,WIRELESS:2,NOT_REACHABLE:3};hcap.network.WirelessMode={UNKNOWN:0,INFRA:1,ADHOC:2};hcap.network.WifiSecurityType={UNKNOWN:0,OPEN:1,WEP:2,WPA_PSK_TKIP:3,WPA_PSK_AES:4,WPA2_PSK_TKIP:5,WPA2_PSK_AES:6,WPA12_PSK_AES_TKIPAES:7};hcap.network.DhcpState={UNKNOWN:0,INIT:1,SELECTING:2,REQUESTING:3,BOUND:4,RENEWING:5,REBINDING:6,INIT_REBOOT:7,REBOOTING:8};hcap.network.getNetworkInformation=function(r){l("get_network_information",r)};hcap.network.getSoftAP=function(r){l("get_soft_ap",r)};hcap.network.setSoftAP=function(r){l("set_soft_ap",r)};hcap.mode={};hcap.mode.HCAP_MODE_0=257;hcap.mode.HCAP_MODE_1=258;hcap.mode.HCAP_MODE_2=259;hcap.mode.HCAP_MODE_3=260;hcap.mode.HCAP_MODE_4=261;hcap.mode.getHcapMode=function(r){l("get_mw_mode",r)};hcap.mode.setHcapMode=function(r){l("set_mw_mode",r)};hcap.key={};hcap.key.Code={NUM_0:48,NUM_1:49,NUM_2:50,NUM_3:51,NUM_4:52,NUM_5:53,NUM_6:54,NUM_7:55,NUM_8:56,NUM_9:57,CH_UP:427,CH_DOWN:428,GUIDE:458,INFO:457,LEFT:37,UP:38,RIGHT:39,DOWN:40,ENTER:13,BACK:461,EXIT:1001,RED:403,GREEN:404,YELLOW:405,BLUE:406,STOP:413,PLAY:415,PAUSE:19,REWIND:412,FAST_FORWARD:417,LAST_CH:711,PORTAL:602,ORDER:623,MINUS:704,POWER:409,VOL_UP:447,VOL_DOWN:448,MUTE:449,RECORD:416,PAGE_UP:33,PAGE_DOWN:34,RF_BYPASS:29,NEXT_DAY:425,PREV_DAY:424,APPS:93,LINK:606,FORWARD:167,ZOOM:251,SETTINGS:611,NEXT_FAV_CH:176,RES_1:112,RES_2:113,RES_3:114,RES_4:115,RES_5:116,RES_6:117,LOCK:619,SKIP:620,LIST:1006,LIVE:622,ON_DEMAND:623,PINP_MOVE:624,PINP_UP:625,PINP_DOWN:626,MENU:18,AD:700,ALARM:701,AV_MODE:31,SUBTITLE:460,CC:1008,DISC_POWER_OFF:705,DISC_POWER_ON:706,DVD:707,EJECT:414,ENERGY_SAVING:709,FAV:710,FLASHBK:711,INPUT:712,MARK:713,NETCAST:1000,PIP:715,PIP_CH_DOWN:716,PIP_CH_UP:717,PIP_INPUT:718,PIP_SWAP:719,Q_MENU:1002,Q_VIEW:1007,RATIO:1005,SAP:723,SIMPLINK:724,STB:725,T_OPT:1004,TEXT:459,SLEEP_TIMER:729,TV:730,TV_RAD:731,VCR:732,POWER_LOWBATTERY:733,SMART_HOME:734,SCREEN_REMOTE:735,POINTER:736,LG_3D:737,DATA:738};g[hcap.key.Code.NUM_0]=hcap.key.Code.NUM_0;g[hcap.key.Code.NUM_1]=hcap.key.Code.NUM_1;g[hcap.key.Code.NUM_2]=hcap.key.Code.NUM_2;g[hcap.key.Code.NUM_3]=hcap.key.Code.NUM_3;g[hcap.key.Code.NUM_4]=hcap.key.Code.NUM_4;g[hcap.key.Code.NUM_5]=hcap.key.Code.NUM_5;g[hcap.key.Code.NUM_6]=hcap.key.Code.NUM_6;g[hcap.key.Code.NUM_7]=hcap.key.Code.NUM_7;g[hcap.key.Code.NUM_8]=hcap.key.Code.NUM_8;g[hcap.key.Code.NUM_9]=hcap.key.Code.NUM_9;g[hcap.key.Code.CH_UP]=hcap.key.Code.CH_UP;g[hcap.key.Code.CH_DOWN]=hcap.key.Code.CH_DOWN;g[hcap.key.Code.GUIDE]=hcap.key.Code.GUIDE;g[hcap.key.Code.INFO]=hcap.key.Code.INFO;g[hcap.key.Code.LEFT]=hcap.key.Code.LEFT;g[hcap.key.Code.UP]=hcap.key.Code.UP;g[hcap.key.Code.RIGHT]=hcap.key.Code.RIGHT;g[hcap.key.Code.DOWN]=hcap.key.Code.DOWN;g[hcap.key.Code.ENTER]=10;g[hcap.key.Code.BACK]=608;g[hcap.key.Code.EXIT]=601;g[hcap.key.Code.RED]=hcap.key.Code.RED;g[hcap.key.Code.GREEN]=hcap.key.Code.GREEN;g[hcap.key.Code.YELLOW]=hcap.key.Code.YELLOW;g[hcap.key.Code.BLUE]=hcap.key.Code.BLUE;g[hcap.key.Code.STOP]=hcap.key.Code.STOP;g[hcap.key.Code.PLAY]=hcap.key.Code.PLAY;g[hcap.key.Code.PAUSE]=hcap.key.Code.PAUSE;g[hcap.key.Code.REWIND]=hcap.key.Code.REWIND;g[hcap.key.Code.FAST_FORWARD]=hcap.key.Code.FAST_FORWARD;g[hcap.key.Code.LAST_CH]=607;g[hcap.key.Code.PORTAL]=hcap.key.Code.PORTAL;g[hcap.key.Code.ORDER]=hcap.key.Code.ORDER;g[hcap.key.Code.MINUS]=45;g[hcap.key.Code.POWER]=hcap.key.Code.POWER;g[hcap.key.Code.VOL_UP]=hcap.key.Code.VOL_UP;g[hcap.key.Code.VOL_DOWN]=hcap.key.Code.VOL_DOWN;g[hcap.key.Code.MUTE]=hcap.key.Code.MUTE;g[hcap.key.Code.RECORD]=hcap.key.Code.RECORD;g[hcap.key.Code.PAGE_UP]=hcap.key.Code.PAGE_UP;g[hcap.key.Code.PAGE_DOWN]=hcap.key.Code.PAGE_DOWN;g[hcap.key.Code.RF_BYPASS]=600;g[hcap.key.Code.NEXT_DAY]=603;g[hcap.key.Code.PREV_DAY]=604;g[hcap.key.Code.APPS]=605;g[hcap.key.Code.LINK]=hcap.key.Code.LINK;g[hcap.key.Code.FORWARD]=609;g[hcap.key.Code.ZOOM]=610;g[hcap.key.Code.SETTINGS]=hcap.key.Code.SETTINGS;g[hcap.key.Code.NEXT_FAV_CH]=612;g[hcap.key.Code.RES_1]=613;g[hcap.key.Code.RES_2]=614;g[hcap.key.Code.RES_3]=615;g[hcap.key.Code.RES_4]=616;g[hcap.key.Code.RES_5]=617;g[hcap.key.Code.RES_6]=618;g[hcap.key.Code.LOCK]=hcap.key.Code.LOCK;g[hcap.key.Code.SKIP]=hcap.key.Code.SKIP;g[hcap.key.Code.LIST]=621;g[hcap.key.Code.LIVE]=hcap.key.Code.LIVE;g[hcap.key.Code.ON_DEMAND]=hcap.key.Code.ON_DEMAND;g[hcap.key.Code.PINP_MOVE]=hcap.key.Code.PINP_MOVE;g[hcap.key.Code.PINP_UP]=hcap.key.Code.PINP_UP;g[hcap.key.Code.PINP_DOWN]=hcap.key.Code.PINP_DOWN;g[hcap.key.Code.MENU]=627;g[hcap.key.Code.AD]=hcap.key.Code.AD;g[hcap.key.Code.ALARM]=hcap.key.Code.ALARM;g[hcap.key.Code.AV_MODE]=702;g[hcap.key.Code.SUBTITLE]=726;g[hcap.key.Code.CC]=703;g[hcap.key.Code.DISC_POWER_OFF]=hcap.key.Code.DISC_POWER_OFF;g[hcap.key.Code.DISC_POWER_ON]=hcap.key.Code.DISC_POWER_ON;g[hcap.key.Code.DVD]=hcap.key.Code.DVD;g[hcap.key.Code.EJECT]=708;g[hcap.key.Code.ENERGY_SAVING]=hcap.key.Code.ENERGY_SAVING;g[hcap.key.Code.FAV]=hcap.key.Code.FAV;g[hcap.key.Code.FLASHBK]=hcap.key.Code.FLASHBK;g[hcap.key.Code.INPUT]=hcap.key.Code.INPUT;g[hcap.key.Code.MARK]=hcap.key.Code.MARK;g[hcap.key.Code.NETCAST]=714;g[hcap.key.Code.PIP]=hcap.key.Code.PIP;g[hcap.key.Code.PIP_CH_DOWN]=hcap.key.Code.PIP_CH_DOWN;g[hcap.key.Code.PIP_CH_UP]=hcap.key.Code.PIP_CH_UP;g[hcap.key.Code.PIP_INPUT]=hcap.key.Code.PIP_INPUT;g[hcap.key.Code.PIP_SWAP]=hcap.key.Code.PIP_SWAP;g[hcap.key.Code.Q_MENU]=720;g[hcap.key.Code.Q_VIEW]=721;g[hcap.key.Code.RATIO]=722;g[hcap.key.Code.SAP]=hcap.key.Code.SAP;g[hcap.key.Code.SIMPLINK]=hcap.key.Code.SIMPLINK;g[hcap.key.Code.STB]=hcap.key.Code.STB;g[hcap.key.Code.T_OPT]=727;g[hcap.key.Code.TEXT]=728;g[hcap.key.Code.SLEEP_TIMER]=hcap.key.Code.SLEEP_TIMER;g[hcap.key.Code.TV]=hcap.key.Code.TV;g[hcap.key.Code.TV_RAD]=hcap.key.Code.TV_RAD;g[hcap.key.Code.VCR]=hcap.key.Code.VCR;g[hcap.key.Code.POWER_LOWBATTERY]=hcap.key.Code.POWER_LOWBATTERY;g[hcap.key.Code.SMART_HOME]=hcap.key.Code.SMART_HOME;g[hcap.key.Code.SCREEN_REMOTE]=hcap.key.Code.SCREEN_REMOTE;g[hcap.key.Code.POINTER]=hcap.key.Code.POINTER;g[hcap.key.Code.LG_3D]=hcap.key.Code.LG_3D;g[hcap.key.Code.DATA]=hcap.key.Code.DATA;hcap.key.addKeyItem=function(r){r.virtualKeycode=g[r.virtualKeycode];l("add_key_item",r)};hcap.key.removeKeyItem=function(r){l("remove_key_item",r)};hcap.key.clearKeyTable=function(r){l("clear_key_table",r)};hcap.key.sendKey=function(r){r.virtualKeycode=g[r.virtualKeycode];l("send_key",r)};hcap.mouse={};hcap.mouse.isMouseVisible=function(r){l("get_mouse_visible",r)};hcap.mouse.setMouseVisible=function(r){l("set_mouse_visible",r)};hcap.mouse.isPointerOn=function(r){l("is_pointer_on",r)};hcap.mouse.setPointerOn=function(r){l("set_pointer_on",r)};hcap.mouse.setPointerSize=function(r){l("set_pointer_size",r)};hcap.property={};hcap.property.PicturePropertyKey={BACKLIGHT:1,CONTRAST:2,BRIGHTNESS:3,SHARPNESS:4,COLOR:5,TINT:6,COLOR_TEMPERATURE:7,ASPECT_RATIO:8};hcap.property.getPictureProperty=function(r){l("get_picture_property",r)};hcap.property.setPictureProperty=function(r){l("set_picture_property",r)};hcap.property.getProperty=function(r){l("get_property",r)};hcap.property.setProperty=function(r){l("set_property",r)};hcap.Media=function(){};hcap.Media.startUp=function(r){l("media_startup",r)};hcap.Media.shutDown=function(r){l("media_shutdown",r)};hcap.Media.createMedia=function(r){if(r===null){return a}if(a===null&&r.url!==null&&r.mimeType!==null){a=new hcap.Media();l("media_create_media",r);return a}return null};hcap.Media.prototype.play=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_play",r)};hcap.Media.prototype.pause=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_pause",r)};hcap.Media.prototype.resume=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_resume",r)};hcap.Media.prototype.stop=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_stop",r)};hcap.Media.prototype.destroy=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_destroy",r);a=null};hcap.Media.prototype.getInformation=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_get_information",r)};hcap.Media.prototype.getPlayPosition=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_get_play_position",r)};hcap.Media.prototype.setPlayPosition=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_set_play_position",r)};hcap.Media.prototype.getPlaySpeed=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_get_play_speed",r)};hcap.Media.prototype.setPlaySpeed=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_set_play_speed",r)};hcap.Media.prototype.setSubtitleOn=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_set_subtitle_on",r)};hcap.Media.prototype.getSubtitleOn=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_get_subtitle_on",r)};hcap.Media.prototype.setSubtitleUrl=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_set_subtitle_url",r)};hcap.Media.prototype.getState=function(r){if(a===null){r.onFailure({errorMessage:"already destroyed."});return}l("media_get_state",r)};hcap.Media.prototype.getAudioLanguage=function(r){l("media_get_audio_language",r)};hcap.Media.prototype.setAudioLanguage=function(r){l("media_set_audio_language",r)};hcap.rms={};hcap.rms.requestRms=function(r){l("request_rms",r)};hcap.socket={};hcap.socket.openUdpDaemon=function(r){l("open_udp_daemon",r)};hcap.socket.closeUdpDaemon=function(r){l("close_udp_daemon",r)};hcap.socket.openTcpDaemon=function(r){l("open_tcp_daemon",r)};hcap.socket.closeTcpDaemon=function(r){l("close_tcp_daemon",r)};hcap.socket.sendUdpData=function(r){l("send_udp_data",r)};hcap.drm={};hcap.drm.securemedia={};hcap.drm.securemedia.initialize=function(r){l("secure_media_drm_initialize",r)};hcap.drm.securemedia.unregister=function(r){l("secure_media_drm_unregister",r)};hcap.drm.securemedia.isRegistration=function(r){l("secure_media_drm_is_registration",r)};hcap.drm.securemedia.register=function(r){l("secure_media_drm_register",r)};hcap.drm.securemedia.finalize=function(r){l("secure_media_drm_finalize",r)};hcap.file={};hcap.file.getUsbStorageList=function(r){l("get_usb_storage_list",r)};hcap.file.getUsbStorageFileList=function(r){l("get_usb_storage_file_list",r)};hcap.file.downloadFileToUsb=function(r){l("download_file_to_usb",r)};hcap.file.deleteUsbFile=function(r){l("delete_usb_file",r)};hcap.rs232c={};hcap.rs232c.BaudRate={BR_UNKNOWN:0,BR_110:110,BR_300:300,BR_600:600,BR_1200:1200,BR_2400:2400,BR_4800:4800,BR_9600:9600,BR_14400:14400,BR_19200:19200,BR_38400:38400,BR_57600:57600,BR_115200:115200,BR_128000:128000,BR_230400:230400,BR_256000:256000,BR_512000:512000,BR_768000:768000,BR_921600:921600,BR_1024000:1024000};hcap.rs232c.DataBit={BIT_UNKNOWN:0,BIT_7:7,BIT_8:8};hcap.rs232c.Parity={UNKNOWN:0,NONE:1,EVEN:2,ODD:3};hcap.rs232c.StopBit={UNKNOWN:0,BIT_1:1,BIT_2:2};hcap.rs232c.FlowControl={UNKNOWN:0,NONE:1,XON_XOFF:2,HARDWARE:3};hcap.rs232c.getConfiguration=function(r){l("rs232c_get_configuration",r)};hcap.rs232c.setConfiguration=function(r){l("rs232c_set_configuration",r)};hcap.rs232c.sendData=function(r){l("rs232c_send_data",r)};hcap.rs232c.setStartupData=function(r){l("rs232c_set_teaching_data",r)};hcap.rs232c.clearStartupData=function(r){l("rs232c_clear_teaching_data",r)};hcap.system={};hcap.system.launchHcapHtmlApplication=function(r){l("launch_hcap_html_application",r)};hcap.system.getMemoryUsage=function(r){l("get_memory_usage",r)};hcap.system.getCpuUsage=function(r){l("get_cpu_usage",r)};hcap.system.requestFocus=function(r){l("request_focus",r)};hcap.system.getFocused=function(r){l("get_focused",r)};hcap.system.getLocaleList=function(r){l("get_locale_list",r)};hcap.system.getLocale=function(r){l("get_locale",r)};hcap.system.requestLocaleChange=function(r){l("request_locale_change",r)};hcap.system.getProcentricServer=function(r){l("get_procentric_server",r)};hcap.system.setProcentricServer=function(r){l("set_procentric_server",r)};hcap.checkout={};hcap.checkout.requestCheckout=function(r){l("request_checkout",r)};hcap.checkout.takeCheckoutSnapshot=function(r){l("take_checkout_snapshot",r)};hcap.bluetooth={};hcap.bluetooth.setScanState=function(r){l("bt_gap_set_scan_state",r)};hcap.bluetooth.removeTrustedDevice=function(r){l("bt_gap_remove_trusted_device",r)}}())};


var lge_hls_media;
var lge_errorTimeout;
var lge_hls_first_play = 1;

var lge_hls_start = function(url, docreate)
{
	if (!docreate) { // just play
		cl('lge_hls_start: PLAY ONLY url [' + url + ']');
		lge_hls_media.play({
			'onSuccess': function(){
				cl('lge_hls_start: play-only->play ok');
			},
			'onFailure': function(e){
				cl('lge_hls_start: play-only->play err[' + e.errorMessage + ']');
			}
		});

		return;
	}

	cl('lge_hls_start: startUp: url[' + url + ']');

	hcap.Media.startUp({
		'onSuccess': function()
		{
			cl('lge_hls_start: startUp OK, now create..');

			lge_hls_media = hcap.Media.createMedia({
				'url': url,
				// 'mimeType': 'video/mpeg', // only ever worked on LY750/755
				'mimeType': 'application/x-mpegurl', // LX750+
				'drmType': 'NONE',
				'onSuccess' : function()
				{
					cl('lge_hls_start: startup->create OK, now play..');
					lge_hls_media.play({
						'onSuccess': function(){
							cl('lge_hls_start: startup->create->play ok');
						},
						'onFailure': function(e){
							cl('lge_hls_start: startup->create->play err[' + e.errorMessage + ']');
						}
					});
				},
				'onFailure' : function(e)
				{
					cl('lge_hls_start: startup->create failed[' + e.errorMessage + ']');
					lge_hls_media = null;
					clearTimeout(lge_errorTimeout);
					lge_errorTimeout = setTimeout(function() {
						lge_hls_start(url, true);
					}, 5000);
				}
			});
		},
		'onFailure': function(e){
			cl('lge_hls_start: startup failed[' + e.errorMessage + ']');
		}
	}); // startup
};

var lge_hls_change = function(url)
{
	url = url || '';
	cl('lge_hls_change: init, url [' + url + ']');

	if (!lge_hls_media)
	{
		if (url)
		{
			if (lge_hls_first_play == 1)
			{
				cl('lge_hls_change: FIRST no lge_hls_media (' + lge_hls_media + ') and lge_hls_first_play=1, starting channel [' + url + ']');
				lge_hls_first_play = 0;
				lge_hls_start(url, true);
			}
			else // this is an error condition, no media and not init..
			{
				cl('lge_hls_change: ERROR: no lge_hls_media (' + lge_hls_media + '), and lge_hls_first_play<>1 starting channel in 5s [' + url + ']');
				lge_hls_change('');

				clearTimeout(lge_errorTimeout);
				lge_errorTimeout = setTimeout(function() {
					lge_hls_start(url, true);
				}, 5000);
			}
		}
		else
		{
			cl('lge_hls_change: stop url but no media, do nothing..');
		}

		return;
	}

	cl('lge_hls_change: called with url[' + url + ']');

	lge_hls_media.getState({
		'onSuccess': function(s)
		{
			if (s.state === 'play' || s.state === 'pause') {
				cl('lge_hls_change: getState_ok->[' + s.state + '], doing stop->destroy');

				lge_hls_media.stop({
					'onSuccess': function()
					{
						cl('lge_hls_change: getState_ok->[' + s.state + ']->stop_ok, now destroy..');
						lge_hls_media.destroy({
							'onSuccess' : function()
							{
								lge_hls_media = null;

								if (url) {
									lge_hls_start(url, true);
								}

								cl('lge_hls_change: getState_ok->[' + s.state + ']->stop_ok->destroy ok');
							},
							'onFailure' : function(e)
							{
								cl('lge_hls_change: getState_ok->[' + s.state + ']->stop_ok->destroy fail [' + e.errorMessage + ']');
								lge_hls_media = null;
								clearTimeout(lge_errorTimeout);
								lge_errorTimeout = setTimeout(function(){
									lge_hls_start(url, true);
								}, 3500);
							}
						});
					},
					'onFailure' : function(e){
						cl('lge_hls_change: getState_ok->[' + s.state + ']->stop fail [' + e.errorMessage + ']');
					}
				});
			} else if (s.state === 'stop') {
				/*
				cl('lge_hls_change: state is : ' + s.state + ', just restart');
				lge_hls_media = null;
				clearTimeout(lge_errorTimeout);
				lge_errorTimeout = setTimeout(function() {
					lge_hls_start(url, true);
				}, 3500);
				*/

				cl('lge_hls_change: getState_ok->[' + s.state + '], doing destroy only');

				lge_hls_media.destroy({
					'onSuccess' : function()
					{
						cl('lge_hls_change: getState_ok->[' + s.state + ']->destroy ok');
						lge_hls_media = null;

						if (url) {
							lge_hls_start(url, true);
						}
					},
					'onFailure' : function(e)
					{
						cl('lge_hls_change: getState_ok->[' + s.state + ']->destroy fail [' + e.errorMessage + ']');
						lge_hls_media = null;

						clearTimeout(lge_errorTimeout);
						lge_errorTimeout = setTimeout(function() {
							lge_hls_start(url, true);
						}, 3500);
					}
				});
			} else {
				cl('lge_hls_change: ERROR: getState_ok->unknown state [' + s.state + '] !!');
			}
		},
		'onFailure': function(e)
		{
			cl('lge_hls_change: getState fail[' + e.errorMessage + ']');

			if (url) {
				lge_hls_change(''); // stop if needed..
				clearTimeout(lge_errorTimeout);
				lge_errorTimeout = setTimeout(function(){
					lge_hls_start(url, true);
				}, 3500);
			}
		}
	});
};

function lge_hls_destroy (complete)
{
	complete = complete || function(){};

	// NOTE: make sure to keep this in sync with the current
	// browser_interface.js Stop() best-practice..
	lge_hls_media.stop({
		'onSuccess':function()
		{
			cl('lge_hls_destroy: stop ok, doing destroy');

			lge_hls_media.destroy({
				'onSuccess':function()
				{
					cl('lge_hls_destroy: stop_ok->destroy ok, doing shutdown');

					hcap.Media.shutDown({
						'onSuccess': function()
						{
							cl('lge_hls_destroy: stop_ok->destroy_ok->shutDown ok');
							lge_hls_media = null;
							complete();
						},
						'onFailure': function(e)
						{
							cl('b.js: LGE: stop_ok->destroy_ok->shutDown fail [' + e.errorMessage + ']');
							lge_hls_media = null;
							complete();
						}
					});
				},
				'onFailure':function(e)
				{
					cl('lge_hls_destroy: stop_ok->destroy fail [' + e.errorMessage + ']');
					lge_hls_media = null;
					complete();
				}
			});
		},
		'onFailure': function(e)
		{
			cl('lge_hls_destroy: stop fail [' + e.errorMessage + ']');
			lge_hls_media = null;
			complete();
		}
	});
}

function lge_hls_event (p)
{
	cl('lge_hls_event: p.eventType[' + p.eventType + ']');

	if (p.eventType == 'error_in_playing')
	{
		cl('lge_hls_event: error_in_playing, trying stop->destroy ..');

		try {
			lge_hls_media.stop({
				'onSuccess': lge_hls_destroy,
				'onFailure': lge_hls_destroy
			});
		} catch(e) {
			cl('lge_hls_event: stop->destroy error [' + e.message + ']');
		}

		clearTimeout(lge_errorTimeout);
		lge_errorTimeout = setTimeout(function()
		{
			cl('lge_hls_event: error retry url[' + browser.curIptvUrl + ']');
			lge_hls_change(browser.curIptvUrl);
		}, 5000);
	}
}

//
// Important notes:
// - if the UI load does not include a switch to IPTV (antenna)
//   then the TV will be hdmi by default.  This means playing and stopping a
//   video will trigger the switch from [some internal player] back to hdmi
//   even if you try to detect when a video is playing..
// - if you do switch to IPTV (antenna) then the switch from antenna to HDMI works
//   ok, and by some magic, playing and stopping a video no longer triggers this..
//
function lge_input_event ()
{
	if (!window.vodMenuApp)
	{
		window.vodMenuApp = {
			clearUiForVideo: function(){},
			flags: {
				ignoreFurtherEvents: false,
				externalInputSelected: false,
				ignoreStopIptv: false
			}
		};
	}

	if (vodMenuApp.flags.ignoreFurtherEvents)
	{
		cl('LGE: lge_input_event: vodMenuApp.flags.ignoreFurtherEvents set, ignore this event');
		return;
	}

	cl('LGE: lge_input_event: init');

	// this runs if the input changed is not pro:centric menu/input
	var input_init = function()
	{
		// only need to do this if not already on IPTV/SS pages..
		// go full screen..
		hcap.video.setVideoSize({
			'x': 0,
			'y': 0,
			'width': $(window).width(),
			'height': $(window).height(),
			'onSuccess': null,
			'onFailure': null
		});

		vodMenuApp.flags.ignoreFurtherEvents = true;
		vodMenuApp.flags.ignoreStopIptv = true;

		setTimeout(function(){
			vodMenuApp.flags.ignoreFurtherEvents = false;
			vodMenuApp.flags.ignoreStopIptv = false;
		}, 2000);

		vodMenuApp.clearUiForVideo(); // also runs 'stopSignageJsFunctions()' which does StopIPTV
		ssGlobalTodo.enabled = false;
		menuPageController.stopFrontPage();

		$('body').css({
			'width': '100%',
			'height': '100%',
			'background': 'transparent url(tv:)'
		});
		// end remove / hide section

		var lgeInputEventProcessKeys,
			lgeInputEventAction;

		function enableLgeIputKeyHandler()
		{
			currentKeyAction = lgeInputEventAction;
		}

		function initLgeInputProcessKeys()
		{
			// inherit base_Keys
			lgeInputEventProcessKeys = function lgeInputEventProcessKeys() {
				base_Keys.call(this);
			};
			lgeInputEventProcessKeys.prototype = Object.create(base_Keys.prototype);
			lgeInputEventProcessKeys.prototype.constructor = lgeInputEventProcessKeys;

			lgeInputEventAction = new lgeInputEventProcessKeys();

			// None of the colour keys are maped here.
			// Actually, this KeyBlue is mapped to portal key
			lgeInputEventProcessKeys.prototype.keyBlue = function()
			{
				cl('LGE: lge_input_event: keyBlue pressed, StopIPTV and reset..');

				browser.StopIPTV({
					'complete': function(){
						menuPageController.resetToStart();
					},
					'force': true
				}, 'lge_input_event->keyBlue');
			};

			lgeInputEventProcessKeys.prototype.keyEpg = function()
			{
				cl('LGE: lge_input_event: keyEpg pressed, StopIPTV and reset..');

				browser.StopIPTV({
					'complete': function(){
						menuPageController.resetToStart();
					},
					'force': true
				}, 'lge_input_event->keyEpg');
			};

			lgeInputEventProcessKeys.prototype.keyInfo = function()
			{
				cl('LGE: lge_input_event: keyInfo pressed, StopIPTV and reset..');

				browser.StopIPTV({
					'complete': function(){
						menuPageController.resetToStart();
					},
					'force': true
				}, 'lge_input_event->keyInfo');
			};
		}

		initLgeInputProcessKeys();
		enableLgeIputKeyHandler();

		cl('LGE: lge_input_event: source input select, set HCAP_0 !');

		// turn off a bunch of keys and turn off the portal
		hcap.mode.setHcapMode({
			'mode': hcap.mode.HCAP_MODE_0,
			'onSuccess': function() {
				cl('LGE: lge_input_event: setHcapMode 0 success');
			},
			'onFailure': function(e) {
				cl('LGE: lge_input_event: setHcapMode 0 err[' + e.errorMessage + ']');
			}
		});

		vodMenuApp.flags.externalInputSelected = true;
	};

	hcap.externalinput.getCurrentExternalInput({
		'onSuccess': function(s)
		{
			cl('LGE: lge_input_event: getCurrentExternalInput: OK: type[' + s.type + '] idx[' + s.index + ']');

			/*
			 * ----------------------------
			 * | LGE input list           |
			 * ----------------------------
			 * 1: TV
			 * 2: COMPOSITE
			 * 3: SVIDEO
			 * 4: COMPONENT
			 * 5: RGB
			 * 6: HDMI
			 * 7: SCART
			 * 8: USB
			 * 9: OTHERS
			 */

			// 1=TV (likely the portal), 8=USB, do not set HCAP0
			// NOTE: added 8 due to weird behaviour with TV setting to 8
			// when playing video even if we set 1 at boot!
			if (s.type === 1 || s.type === 8)
			{
				if (vodMenuApp.flags.externalInputSelected)
				{
					cl('LGE: lge_input_event: getCurrentExternalInput: in portal (pro:centric mode), and on ext src, StopIPTV and reset');

					browser.StopIPTV({
						'complete': function(){
							menuPageController.resetToStart();
						},
						'force': true
					}, 'lge_input_event->getCurrentExternalInput->portal+ext src reset');
				}
				else
				{
					cl('LGE: lge_input_event: getCurrentExternalInput: pro:centric mode selected and NOT on ext src, do nothing');
				}

				return;
			}

			cl('LGE: lge_input_event: getCurrentExternalInput: NOT in portal (pro:centric mode), exec input_init()');
			input_init();
		},
		'onFailure': function(e)
		{
			cl('LGE: lge_input_event: getCurrentExternalInput err[' + e.errorMessage + ']');
		}
	});
}

function lge_cl(msg){
	$.post(window.menuUrlPrefix + '/api/log/LGE/DEBUG', {
		msg: msg
	});
}

function lge_print_current_mac (ip, complete)
{
	complete = complete || function(){};

	hcap.network.getNumberOfNetworkDevices({
		'onSuccess': function(s)
		{
			for (var i = 0; i < s.count; i++) {
				(function(k){
					hcap.network.getNetworkDevice({
						'index': k,
						'onSuccess': function(r)
						{
							// only return the wired mac
							// regardless of using wired/wireless
							// this is mostly because of the bug below..

							if (r.name.match(/^eth/) || r.networkMode === 1) {
								lge_cl('LGE: lge_print_current_mac LAN MAC MATCH: ' + JSON.stringify(r));
								complete(r.mac, null);
								i = s.count;
							}

							// if you want to match on wifi, uncomment this and comment out above..
							/*if (r.name.match(/^wlan/) || r.networkMode === 2) {
								lge_cl('LGE: lge_print_current_mac WLAN MAC MATCH: ' + JSON.stringify(r));
								complete(r.mac, null);
								i = s.count;
							}*/

							// there is a bug in LY750 where both wired and wireless
							// report the same IP which will mean this matches twice,
							// so cannot use it reliably across all LG platforms.
							// if (ip === r.ip) {
							// 	complete(r.mac, null);
							// }
						},
						'onFailure': function(r)
						{
							complete(null, 'hcap getNetworkDevice failed[' + r.errorMessage + ']');
						}
					});
				})(i);
			}
		},
		'onFailure': function(f)
		{
			complete(null, 'hcap getNumberOfNetworkDevices failed[' + f.errorMessage + ']');
		}
	});
}

function lge_get_mac (complete)
{
	complete = complete || function(){};

	hcap.network.getNetworkInformation({
		'onSuccess': function(s)
		{
			lge_print_current_mac(s.ip_address, complete);
		},
		'onFailure': function(f)
		{
			complete(null, 'hcap getNetworkInformation failed[' + f.errorMessage + ']');
		}
	});
}
