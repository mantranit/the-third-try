;(function($, _)
{
	var translateClass = 'translate-me';
	var translationsObj = null;
	var siteInfoKeyPrefix = sharedModules.constant.TRANSLATION_SITE_INFO_KEY_PREFIX;

	$.fn.vodtranslate = function (opts)
	{
		if (config.translate_enabled != 1)
		{
			return this;
		}

		/*
		IMPORTANT: These objects are required:
		 - config
		 - vodMenuApp
		 - browser

		Please ensure they are set before using this plugin..
		*/
		var $that  = this;
		var settings = _.extend({
			// These are the defaults.
			uilang: vodMenuApp.currentLang ? vodMenuApp.currentLang : 'en',
			force: false // false = ignore already translated classes
		}, opts);

		// don't translate english!
		if (settings.uilang === 'en')
		{
			return this;
		}

		doTranslationStep1($that, settings);

		return this;
	};


	function doTranslationStep1($that, settings)
	{
		if (translationsObj === null)
		{
			getTranslations(settings, function()
			{
				doTranslationStep2($that, settings);
			});

			return;
		}

		doTranslationStep2($that, settings);
	}

	function getTranslations(settings, cb)
	{
		var geturl = window.menuUrlPrefix +
			'/api/translations/' + settings.uilang;

		// prefix done
		$.ajax({
			type: 'GET',
			url: geturl,
			dataType: 'json',
			success: function(res)
			{
				translationsObj = res.data;
				if(_.isFunction(cb)) {
					cb();
				}
			}
		});
	}

	function doTranslationStep2 ($that, settings)
	{
		var $objs;
		if ($that.hasClass(translateClass)) // if we are directly translating one element
		{
			$objs = $that;
		}
		else
		{
			$objs = $that.find('.' + translateClass); // if we are translating one or more child elements..
		}

		_.each($objs, function(obj)
		{

			var $obj = $(obj);

			if ($obj.hasClass('translated') && !settings.force) // force is off by default
			{
				return;
			}

			var tKey = '';
			var contentToTranslate = '';
			var isLongContent = parseInt($obj.attr('data-is-long-content')) || 0;
			var siteInfoId = $obj.attr('data-site-info-id');

			if(parseInt(isLongContent) === 1)
			{
				tKey = siteInfoKeyPrefix + siteInfoId;
			}
			else
			{
				tKey = contentToTranslate = obj.innerHTML.toString().toLowerCase().trim();
			}

			if (_.isString(translationsObj[tKey]))
			{
				$obj.addClass('translated').html(translationsObj[tKey]);
			}
			else
			{
				// only here if not already translated in DB and we need to ask google
				// this cl() is to check why we're not matching..
				externalTranslate(tKey, settings.uilang, $obj, isLongContent, contentToTranslate, siteInfoId);
			}
		});
	}

	function externalTranslate (stringKey, uilang, $obj, isLongContent, contentToTranslate, siteInfoId)
	{
		var postvars = {
			'string_key': stringKey,
			'site_info_id': siteInfoId,
			'is_long_content': isLongContent,
			'content_to_translate': contentToTranslate
		};

		var posturl = window.menuUrlPrefix +
			'/api/translations/' + uilang;

		// prefix done
		$.post(posturl, postvars, function(res)
		{
			if (res.result === 'success')
			{
				translationsObj[stringKey] = res.string_translated;
				$obj.addClass('translated').html(res.string_translated);
			}
			else
			{
				cl('POST /api/translations failed, reason[' + res.description + ']');
			}
		}, 'json')
		.fail(function(jqXHR, textStatus) {
			cl('translate.js: POST /api/translations failed [' + textStatus + ']');
		});
	}
}(jQuery, _));
