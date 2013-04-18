(function($) {

    var SELECTOR_KEY = 'plugin_selector';

    var Port = chrome.extension.connect();

    Port.onMessage.addListener(onMessage);

    var hostname = document.location.origin;  // Example: http://site.com

    function html(){
        //Todo: include tips/hints for templating?

        // Remove iframes
        $('iframe').remove();

        // Remove javascript
        $('script').remove();

        // Remove hidden elements
        // TODO: make this an option?
        //$('body :hidden').remove();

        var bodyClassNames = $('body').attr('class');

        var html = $('body')
                    .html()
                    //.replace(/href[\s]?=[\s]?"\//g, 'href="' + hostname + '/')
                    //.replace(/action[\s]?=[\s]?"\//g, 'action="' + hostname + '/')
                    .replace(/onclick/g, 'data-disabled-onclick')
                    .replace(/\t/g, '    ')
                    .replace(/\xA9/g, '&copy;') //TODO: trademark and other unicode characters
                    .replace(/\xAE/, '&reg;')
                    .replace(/\n[\s]*\n/g, '\n')
                    .replace(/[^A-Za-z0-9<>:.;+\-"(){_}=\[\]\t\s\r\n\/\*!\'\&\#\%,\?\$\`~|]/g, '') // kill all non ascii
                    //.replace(/<script/g, '<!-- <script') //disable all scripts
                    //.replace(/<\/script>/g, '</' + 'script> -->')
                    .trim();

        return bodyClassNames ? '<div class="' + bodyClassNames + '">\n' + html + '\n</div>'
                : html;
    }

    function loadStylesheets(cb) {
        var urls =  $('link[rel=stylesheet]:not([media=print])').map(function(i, stylesheet){
            return stylesheet.href.indexOf('http') === 0 ? stylesheet.href
                        : hostname + stylesheet.href;
        }).toArray();

        var reduced = [];
        var originals = [];
        var imports = [];
        var imageUrls = {};

        function loadCSS() {
            var url = urls.shift();
            if (url) {
                chrome.extension.sendRequest( {type: 'load', url: url }, function (response) {
                    if (response.data) {
                        var reducedResults = stylesheets({ data: response.data, sourceUrl: url, imageUrls: imageUrls });
                        if (reducedResults.css) {
                            reduced.push(reducedResults.css);
                            imageUrls = reducedResults.imageUrls;
                            imports = imports.concat(reducedResults.imports);
                        }
                        originals.push({ url: url, data: response.data });
                    }
                    loadCSS();
                });
            } else {
               cb(null, {reduced: imports.concat(reduced), originals: originals, imageUrls: imageUrls});
            }
        }
        loadCSS();
    }

    function loadImages(imageUrls, cb) {

        // Images
        $('img').each(function(){
            var url = this.src;
            url = Files.fixRelative(url, document.location.origin + document.location.pathname);
            var filename = Files.urlToFilename(url);
            if (filename) {
                imageUrls = Files.add(url, imageUrls);
                this.src = '{{themeUrl}}/assets/' + filename;
            }
        });

        // Inline styles
        $('[style*=background]').each(function(){
            var $el = $(this);
            var css = $el.attr('style');

            var reducedResults = stylesheets({ data: css, sourceUrl: document.location.origin + document.location.pathname, imageUrls: imageUrls, inline: true });
            if (reducedResults.css) {
                imageUrls = reducedResults.imageUrls;
                $el.attr('style', reducedResults.css);
            }
        });

        // Style tags
        $('style').each(function(){
            var $el = $(this);
            var css = $el.text();
            
            // Ignore adblocker css
            if (css.match(/A9AdsMiddleBoxTop/)) {
                css = '';
            }
            var reducedResults = stylesheets({ data: css, sourceUrl: document.location.origin + document.location.pathname, imageUrls: imageUrls, styleTag: true });
            if (reducedResults.css) {
                imageUrls = reducedResults.imageUrls;
                $el.text(reducedResults.css);
                $el.prependTo('body'); //so that it shows up when we request the html
            } else {
                $el.remove();
            }
        });

        var images = [];
        var filenames = Object.keys(imageUrls);

        function loadImage() {
            var filename = filenames.shift();
            if (filename) {
                chrome.extension.sendRequest( {type: 'load', url: imageUrls[filename], binary: true }, function (response) {
                    if (response.data) {
                        images.push({ url: imageUrls[filename], filename: filename, data: response.data });
                    }
                    loadImage();
                });
            } else {
               cb(null, {images: images });
            }
        }
        loadImage();
    }

    function createUI() {

        var $info = $('<div class="plugin_info">' +
            '<div>' +
            '<label>Snooper</label>' +
            '<input type="text" placeholder="CSS Selector" data-purpose="selector"/>' +
            '<input type="button" value="Download Theme" data-action="download"/>' +
            '</div>' +
            '<div class="plugin_help">' +
            'Comma-separated nodes to exclude. Use <span class="plugin_fixed">#id</span>, <span class="plugin_fixed">.class</span>, <a href="http://api.jquery.com/category/selectors/" target="_blank">etc</a>' +
            '</div>' +
            '</div>');

        var $selector = $info.find('[data-purpose=selector]');

        function run (){
            var reduced;
            var originals;
            var pageHTML;

            function loadOriginalHTML (cb) {
                $.ajax({
                        url: document.location.href
                })
                .complete( function(response){
                        pageHTML = response.responseText;
                        cb();
                });
            }

            function parsePageContent () {
                $info.remove();
                $($selector.val() || '#NOTHING').html('\n\n\n<!-- *Original Content Removed* -->\n{{{content}}}\n\n\n');
                $('.plugin_remove').removeClass('plugin_remove');

                loadStylesheets(function(err, data){
                    reduced = data.reduced;
                    originals = data.originals;
                    loadImages(data.imageUrls, function(err, data) {
                        chrome.extension.sendRequest({
                                type:       'zip',
                                html:       html(),
                                reduced:    reduced,
                                originals:  originals,
                                pageHTML:   pageHTML,
                                images:     data.images,
                                themeName:  document.location.host.replace(/\.[^.]*$/, '').replace(/[^.]*\./, '') || 'theme'
                            },
                            function(response) {
                                console.log('Ready to download');
                                chrome.extension.sendRequest({ type: 'download'});
                            });
                    });
                });
            }
            loadOriginalHTML(parsePageContent);
        }


        $selector.bind('keyup change', function(){
                var value = $selector.val().trim();
                $selector.css({minWidth: value.length * 7});

                $('.plugin_remove').removeClass('plugin_remove');

                try {
                    var $elements = $(value).not('.plugin_info, .plugin_info *');
                    if (!$elements.length) {
                        $selector.addClass('notfound');
                    } else {
                        $selector.removeClass('notfound');
                    }
                    $elements.addClass('plugin_remove');
                    window.localStorage.setItem(SELECTOR_KEY, value);
                } catch(err) {
                    console.log('Invalid CSS Selector', value);
                }

            })
            .val(window.localStorage.getItem(SELECTOR_KEY))
            .change();

        $info.find('[data-action=download]').click(run);

        $info.find('label').bind('click', function() {
            $selector.focus();
        });

        $info.appendTo(document.body).css({top: 20});
    }


    function onMessage (message) {
        switch (message.type) {
            case 'log':
                console.log(message.data);
                break;
            default:
                console.log('Unknown message', message);
        }
    }

    if ($('.plugin_info').length) {
        $('.plugin_info').remove();
        $('.plugin_remove').removeClass('plugin_remove');
    } else {
        createUI();
    }

})($.noConflict());