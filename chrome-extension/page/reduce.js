
function reduce(options) {

    if (!options || !options.data || !options.sourceUrl) {
        console.log('missing data for reduce');
        return {};
    }

    // TODO:
    // Need an ONPAGE or STYLETAG option
    // because some inline features are shared
    // with style tag

    var data = options.data;
    var sourceUrl = options.sourceUrl;
    var imageUrls = options.imageUrls;

    if (options.inline) {
        // add placeholder so it can be found
        data = 'body { ' + data + ' }';
    }

    var found = [],
        notFound = [];

    var stylesheetObject;

    try {
        stylesheetObject = CSSOM.parse(data);
    }catch(err) {
        console.log('Not able to parse ' + sourceUrl);
        return {};  //TODO: put in message that the file could not be parsed
    }

    stylesheetObject.cssRules.forEach(function(rule) {
        if (rule.selectorText) {

            var selectors = rule.selectorText.split(',');

            var alreadyFound = false;
            selectors.forEach(function(selector){
                if (alreadyFound) return;
                selector = selector.trim();
                var simpleSelector = selector
                            .replace('* html ', '') //ie hack
                            .replace('^.ie[6789]', '') //ie hack
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
                                        rule.style[attr] = background.replace(/url\('?"?([^"']*)"?'?\)/, 'url(' + (options.inline ? '{clientUrl}/' : '') + 'images/' + filename + ')');
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
                        console.log(simpleSelector, e);
                        try {
                            if ($(simpleSelector).length) {
                                found.push(cssText);
                                alreadyFound = true;
                            } else {
                                notFound.push(selector);
                            }
                        }
                        catch (e) {
                            console.log('selector not searchable with jquery ', selector);
                            //found.push('/' + '* selector not searchable with jquery ', selector, '*' + '/');
                            notFound.push(selector);
                        }
                    }
                }
            });
        }
    });
    return  options.inline ?
            {
                imageUrls:  imageUrls,
                css:        found.join('').trim().replace(/^[^{]*\{(.*)\}/, '$1') //remove the body { .. }
            }
            :
            {
                url:        sourceUrl,
                found:      found.length,
                notFound:   notFound.length,
                imageUrls:  imageUrls,
                css:        found.length ? '/' + '** ' + '\n' +
                            ' * ' + '\n' +
                            ' * imported from: ' + '\n' +
                            ' * ' + (sourceUrl || 'Inline CSS on ' + document.location) + '' + '\n' +
                            ' * ' + '\n' +
                            ' **' + '/' + '\n' +
                            found.join('\n\n')
                            : ''
            };
}