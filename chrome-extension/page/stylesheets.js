
function stylesheets(options) {

    if (!options || !options.data || !options.sourceUrl) {
        console.log('missing data to run stylesheets.js', options);
        return {};
    }

    var data = options.data;
    var sourceUrl = options.sourceUrl;
    var imageUrls = options.imageUrls;

    // Remove javascript from PGE's css. WTF pge?
    data = data.replace(/'" \+ \(location\.pathname\.split\('\/'\)\.slice\(0\,-3\)\.join\('\/'\) \+ '/g, "'");
    data = data.replace(/'\) \+ "/g, '');
    data = data.replace(/filter:[^;]*;/g, '');
    data = data.replace(/behavior:[^;]*;/g, '');
    data = data.replace(/content:[^;]*;/g, '');
    data = data.replace(/expression\([^;]*;/g, '');

    if (options.inline) {
        // add placeholder so it can be found
        data = 'body { ' + data + ' }';
    }

    var newline = '\r\n';

    var found = [],
        notFound = [],
        imports = [];

    var stylesheetObject;

    try {
        stylesheetObject = CSSOM.parse(data);
    }catch(err) {
        console.log('ERROR ' + err.message || err);

        console.log('Not able to parse ' + sourceUrl);
        return {};  //TODO: put in message that the file could not be parsed
    }

    stylesheetObject.cssRules.forEach(function(rule) {
        if (rule.href) {
            //additional css file
            var cssFile = Files.fixRelative(rule.href, sourceUrl);
            console.log('IMPORT RULE:', 'original url:', rule.href, 'new url:', cssFile, 'source:', sourceUrl);

            //TODO - import this file too
            imports.push('@import "' + cssFile + '"; /* Todo: make this local */');
        }

        if (rule.selectorText) {

            var selectors = rule.selectorText.split(',');

            var alreadyFound = false;
            selectors.forEach(function(selector){
                if (alreadyFound) return;
                selector = selector.trim();
                var simpleSelector = selector
                            .trim()
                            .replace(/\* html /, '') //ie hack
                            .replace(/^\.ie[6789]/, '') //ie hack
                            .replace(/:[^\s]*/g, '')
                            .trim(); //:hover, :focus, etc

                if (simpleSelector) {
                    try {
                        if (document.querySelector(simpleSelector)) {
                            ['background-image', 'background'].forEach(function(attr){
                                if (rule.style[attr]) {
                                    var background = rule.style[attr];
                                    var url = background.replace(/.*url\('?"?([^"']*)"?'?\).*/, '$1');
                                    url = Files.fixRelative(url, sourceUrl);

                                    var filename = Files.urlToFilename(url);

                                    if (filename) {
                                        imageUrls = Files.add(url, imageUrls);
                                        rule.style[attr] = background.replace(/url\('?"?([^"']*)"?'?\)/, 'url(' + (options.inline || options.styleTag ? '{{themeUrl}}/assets/' : '') + filename + ')');
                                    }
                                }
                            });
                            found.push(rule.cssText);
                            alreadyFound = true;
                        } else {
                            notFound.push(selector);
                        }
                    }
                    catch(e){
                        try {
                            if ($(simpleSelector).length) {
                                found.push(cssText);
                                alreadyFound = true;
                            } else {
                                notFound.push(selector);
                            }
                        }
                        catch (e) {
                            console.log('selector not searchable with jquery:', selector, 'source:', options.sourceUrl);
                            //found.push('/' + '* selector not searchable with jquery ', selector, '*' + '/');
                            notFound.push(selector);
                        }
                    }
                }
            });
        }
    });

    var css =   !found.length ? ''
                : options.styleTag ? newline + found.join(newline + newline).trim() + newline
                : options.inline ? found.join('').trim().replace(/^[^{]*\{(.*)\}/, '$1') //remove the body { .. }
                :   '/** ' + newline +
                    ' * ' + newline +
                    ' * imported from: ' + newline +
                    ' * ' + (sourceUrl || 'Inline CSS on ' + document.location) + '' + newline +
                    ' * ' + newline +
                    ' **' + '/' +newline +
                    found.join(newline + newline);
    return  {
                url:        sourceUrl,
                found:      found.length,
                notFound:   notFound.length,
                imageUrls:  imageUrls,
                css:        css,
                imports:    imports
            };
}