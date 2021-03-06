// LICENSE : MIT
"use strict";

var _textlintRuleHelper = require("textlint-rule-helper");

var _kuromojin = require("kuromojin");

var _sentenceSplitter = require("sentence-splitter");

var _structuredSource = require("structured-source");

var _structuredSource2 = _interopRequireDefault(_structuredSource);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var defaultOptions = {
    max: 3, // 1文に利用できる最大の、の数
    strict: false, // 例外ルールを適応するかどうか
    charRegExp: '[。\?\!？！]',
    newLineCharacters: "\n\n"
};

function isSandwichedMeishi(_ref) {
    var before = _ref.before,
        token = _ref.token,
        after = _ref.after;

    if (before === undefined || after === undefined || token === undefined) {
        return false;
    }
    return before.pos === "名詞" && after.pos === "名詞";
}
/**
 * add two positions.
 * note: line starts with 1, column starts with 0.
 * @param {Position} base
 * @param {Position} relative
 * @return {Position}
 */
function addPositions(base, relative) {
    return {
        line: base.line + relative.line - 1, // line 1 + line 1 should be line 1
        column: relative.line == 1 ? base.column + relative.column // when the same line
        : relative.column // when another line
    };
}
/**
 * @param {RuleContext} context
 * @param {object} [options]
 */
module.exports = function (context) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var maxLen = options.max || defaultOptions.max;
    var isStrict = options.strict || defaultOptions.strict;
    var charRegExp = new RegExp(options.charRegExp || defaultOptions.max);
    var newLineCharacters = options.newLineCharacters || defaultOptions.strict;
    var helper = new _textlintRuleHelper.RuleHelper(context);
    var Syntax = context.Syntax,
        RuleError = context.RuleError,
        report = context.report,
        getSource = context.getSource;

    return _defineProperty({}, Syntax.Paragraph, function (node) {
        if (helper.isChildNode(node, [Syntax.BlockQuote])) {
            return;
        }
        var sentences = (0, _sentenceSplitter.split)(getSource(node), {
            charRegExp: charRegExp,
            newLineCharacters: newLineCharacters
        });
        /*
         <p>
         <str><code><img><str>
         <str>
         </p>
         */
        /*
         # workflow
         1. split text to sentences
         2. sentence to tokens
         3. check tokens
         */
        return (0, _kuromojin.getTokenizer)().then(function (tokenizer) {
            sentences.forEach(function (sentence) {
                var text = sentence.value;
                var source = new _structuredSource2.default(text);
                var currentTenCount = 0;
                var tokens = tokenizer.tokenizeForSentence(text);
                var lastToken = null;
                tokens.forEach(function (token, index) {
                    var surface = token.surface_form;
                    if (surface === "、") {
                        // 名詞に過去まわれている場合は例外とする
                        var isSandwiched = isSandwichedMeishi({
                            before: tokens[index - 1],
                            token: token,
                            after: tokens[index + 1]
                        });
                        // strictなら例外を例外としない
                        if (!isStrict && isSandwiched) {
                            return;
                        }
                        currentTenCount++;
                        lastToken = token;
                    }
                    if (surface === "。") {
                        // reset
                        currentTenCount = 0;
                    }
                    // report
                    if (currentTenCount >= maxLen) {
                        var positionInSentence = source.indexToPosition(lastToken.word_position - 1);
                        var positionInNode = addPositions(sentence.loc.start, positionInSentence);
                        var ruleError = new context.RuleError("\u4E00\u3064\u306E\u6587\u3067\"\u3001\"\u3092" + maxLen + "\u3064\u4EE5\u4E0A\u4F7F\u7528\u3057\u3066\u3044\u307E\u3059", {
                            line: positionInNode.line - 1,
                            column: positionInNode.column
                        });
                        report(node, ruleError);
                        currentTenCount = 0;
                    }
                });
            });
        });
    });
};
//# sourceMappingURL=max-ten.js.map