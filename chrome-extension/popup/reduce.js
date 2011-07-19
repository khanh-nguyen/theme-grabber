
function reduce(data, url) {

    var found = [],
        notFound = [],
        selectors, cssText;

        var absolutePath = url.replace(/\/([^/]+)$/, '');
        var hostname = 'http://' + url.match(/\/\/([^/]+)(.*)$/)[1];

        //remove tabs, make image urls absolute
        //TODO: fails when the url includes http://
        data = data
                    .replace(/\t/g, '    ')
                    .replace(/(url\(['"]?)([a-zA-Z0-9.][^)]*)/g, '$1' + absolutePath + '/$2')
                    .replace(/(url\(['"]?)(\/[^)]*)/g, '$1' + hostname + '$2');

        var stylesheetObject = CSSOM.parse(data);

        stylesheetObject.cssRules.forEach(function(rule) {
            if (rule.selectorText) {
                selectors = rule.selectorText.split(',');
                cssText = rule.cssText;

                selectors.forEach(function(selector){
                    selector = selector.trim();
                    var simpleSelector = selector
                                .replace('* html ', '') //ie hack
                                .replace('^.ie[6789]', '') //ie hack
                                .replace(/:[^\s]*/g, '')
                                .trim(); //:hover, :focus, etc

                    if (simpleSelector) {
                        try {
                            if (document.querySelector(simpleSelector)) {
                                found.push(selector + ' ' + cssText);
                            } else {
                                notFound.push(selector);
                            }

                        }
                        catch(e){

                            try {
                                if ($(simpleSelector).length) {
                                    found.push(selector + ' ' + cssText);
                                } else {
                                    notFound.push(selector);
                                }
                            }
                            catch (e) {
                                found.push('/' + '* bad selector', selector, '*' + '/');
                            }


                        }
                    }
                });
            }
        });

        return  {
                   found: found.length,
                   notFound: notFound.length,
                   css: found.length ? '/' + '** ' + '\n' +
                        ' * ' + '\n' +
                        ' * imported from: ' + '\n' +
                        ' * ' + (url || 'Inline CSS on ' + document.location) + '' + '\n' +
                        ' * ' + '\n' +
                        ' **' + '/' + '\n' +
                        found.join('\n\n')
                        : ''
        };
}