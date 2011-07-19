
function parse(token) {

    var i = 0;

    /**
      "before-selector" or
      "selector" or
      "atRule" or
      "atBlock" or
      "before-name" or
      "name" or
      "before-value" or
      "value"
    */
    var state = "before-selector";

    var index;
    var j = i;
    var buffer = "";

    var SIGNIFICANT_WHITESPACE = {
        "selector": true,
        "value": true,
        "atRule": true,
        "importRule-begin": true,
        "importRule": true,
        "atBlock": true
    };

    var styleSheet = { rules: [], cssRules: [] };

    var currentScope = styleSheet;

    var selector, name, value, priority="", styleRule, mediaRule, importRule;

    for (var character; character = token.charAt(i); i++) {

        switch (character) {

        case " ":
        case "\t":
        case "\r":
        case "\n":
        case "\f":
            if (SIGNIFICANT_WHITESPACE[state]) {
                buffer += character;
            }
            break;

        // String
        case '"':
            j = i + 1;
            index = token.indexOf('"', j) + 1;
            if (!index) {
                throw '" is missing';
            }
            buffer += token.slice(i, index);
            i = index - 1;
            switch (state) {
                case 'before-value':
                    state = 'value';
                    break;
                case 'importRule-begin':
                    state = 'importRule';
                    break;
            }
            break;

        case "'":
            j = i + 1;
            index = token.indexOf("'", j) + 1;
            if (!index) {
                throw "' is missing";
            }
            buffer += token.slice(i, index);
            i = index - 1;
            switch (state) {
                case 'before-value':
                    state = 'value';
                    break;
                case 'importRule-begin':
                    state = 'importRule';
                    break;
            }
            break;

        // Comment
        case "/":
            if (token.charAt(i + 1) == "*") {
                i += 2;
                index = token.indexOf("*/", i);
                if (index == -1) {
                    throw new SyntaxError("Missing */");
                } else {
                    i = index + 1;
                }
            } else {
                buffer += character;
            }
            if (state == "importRule-begin") {
                buffer += " ";
                state = "importRule";
            }
            break;

        // At-rule
        case "@":
            if (token.indexOf("@media", i) == i) {
                state = "atBlock";
                mediaRule = { rules: [], cssRules: [] };
                //mediaRule.__starts = i;
                i += "media".length;
                buffer = "";
                break;
            } else if (token.indexOf("@import", i) == i) {
                state = "importRule-begin";
                i += "import".length;
                buffer += "@import";
                break;
            } else if (state == "selector") {
                state = "atRule";
            }
            buffer += character;
            break;

        case "{":
            if (state == "selector" || state == "atRule") {
                styleRule.selectorText = buffer.trimRight();
                styleRule.style.__starts = i;
                buffer = "";
                state = "before-name";
            } else if (state == "atBlock") {
                mediaRule = { rules: [], cssRules: [], content: buffer.trim() };
                currentScope = mediaRule;
                buffer = "";
                state = "before-selector";
            }
            break;

        case ":":
            if (state == "name") {
                name = buffer.trim();
                buffer = "";
                state = "before-value";
            } else {
                buffer += character;
            }
            break;

        case '(':
            if (state == 'value') {
                index = token.indexOf(')', i + 1);
                if (index == -1) {
                    throw i + ': unclosed "("';
                }
                buffer += token.slice(i, index + 1);
                i = index;
            } else {
                buffer += character;
            }
            break;

        case "!":
            if (state == "value" && token.indexOf("!important", i) === i) {
                priority = "important";
                i += "important".length;
            } else {
                buffer += character;
            }
            break;

        case ";":
            switch (state) {
                case "value":
                    styleRule.style.push({name: name, property: buffer.trim(), priority: priority });
                    priority = "";
                    buffer = "";
                    state = "before-name";
                    break;
                case "atRule":
                    buffer = "";
                    state = "before-selector";
                    break;
                case "importRule":
                    importRule = { cssText: '', cssRules: []};
                    importRule.cssText = buffer + character;
                    currentScope.cssRules.push(importRule);
                    buffer = "";
                    state = "before-selector";
                    break;
                default:
                    buffer += character;
                    break;
            }
            break;

        case "}":
            switch (state) {
                case "value":
                    styleRule.style.push({name: name, property: buffer.trim(), priority: priority});
                    priority = "";
                case "before-name":
                case "name":
                    styleRule.__ends = i + 1;
                    styleRule.original = token.substr(styleRule.__starts, styleRule.__ends - styleRule.__starts);
                    styleRule.cssText = styleRule.original.substr(styleRule.original.indexOf('{'));
                    currentScope.cssRules.push(styleRule);
                    buffer = "";
                    break;
                case "before-selector":
                case "selector":
                    // End of media rule.
                    // Nesting rules aren't supported yet
                    if (!mediaRule) {
                        buffer = "";
                        break;
                        //throw "unexpected }";
                    }
                    mediaRule.__ends = i + 1;
                    styleSheet.rules.push(mediaRule);
                    currentScope = styleSheet;
                    buffer = "";
                    break;
            }
            state = "before-selector";
            break;

        default:
            switch (state) {
                case "before-selector":
                    state = "selector";
                    styleRule = { selectorText: '',  style: [], original: '', cssText: ''};
                    styleRule.__starts = i;
                    break;
                case "before-name":
                    state = "name";
                    break;
                case "before-value":
                    state = "value";
                    break;
                case "importRule-begin":
                    state = "importRule";
                    break;
            }
            buffer += character;
            break;
        }
    }

    return styleSheet;
}



module.exports.parse = parse;