// AutoSuggest.js
// Version: 0.0.1

// The MIT License (MIT)
// 
// Copyright (c) 2014 Rob Moran
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

(function(global, factory) {

    if (typeof exports === 'object') {
        // CommonJS (Node)
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser global (with support for web workers)
        global.AutoSuggest = factory();
    }

}(this, function() {
    'use strict';

    // Dom element builder
    function buildElement(type, className, style) {
        var element = document.createElement(type);
        if (className) element.className = className;

        for (var item in style) {
            element.style[item] = style[item];
        }

        return element;
    }

    // String format function
    function format() {
        var regex = /\{([^\}]+)\}/g;
        var separator = ":";
        var args = [].slice.call(arguments);
        var text = args.shift();

        return text.replace(regex, function(m, k) {

            var formatter = k.split(separator);
            var key = formatter.shift();

            if (typeof(args[key]) == "undefined") {
                return m;
            }

            var value = args[key];

            if (formatter[0]) {
                formatter = formatter.join(separator);
                if (formatter == "n" || formatter == "f" ) {
                    value = value.toFixed((formatter == "f") ? 2 : 0);
                }
            }

            return value;
        });
    }

    // Main object
    var AutoSuggest = function(element, template, callback, opts) {
        // Default options
        var options = this.options = {
            delimiter: " ",
            watermark: "enter something...",
            multipleMarker: "*",
            valueFormat: "{0}{1}",
            descriptionFormat: "{0} ({1})"
        };

        // Merge options
        if (opts) {
            for (var item in opts) {
                if (options[item]) {
                    options[item] = opts[item];
                }
            }
        }

        this.template = this.currentItem = template;
        this.callback = callback;
        this.dropdownIndex = 0;
        this.remainingText = "";
        this.suggestItems = {};
        this.freeTextItem = null;

        var input = this.input = buildElement("input", "input", { position: "absolute", backgroundColor: "transparent" });
        input.addEventListener("focus", this.onFocus.bind(this));
        input.addEventListener("blur", this.onBlur.bind(this));
        input.addEventListener("keydown", this.onKeydown.bind(this));
        input.addEventListener("input", this.onInput.bind(this));

        var hint = this.hint = buildElement("input", "input hint");
        hint.value = options.watermark;

        var container = this.container = buildElement("div", "suggest");
        var dropdown = this.dropdown = buildElement("div", "dropdown", { position: "absolute", display: "none" });
        var ruler = this.ruler = buildElement("span", "input ruler", { position: "fixed", display: "inline", visibility: "hidden", top: 0, right: 0, width: "auto" });

        container.appendChild(ruler);
        container.appendChild(input);
        container.appendChild(hint);
        container.appendChild(dropdown);
        element.appendChild(container);
    };

    AutoSuggest.prototype.textWidth = function(text) {
        this.ruler.innerText = text;
        return this.ruler.offsetWidth;
    };

    AutoSuggest.prototype.buildDropdown = function(items) {
        this.dropdown.style.display = "none";
        this.dropdownIndex = 0;

        while (this.dropdown.firstChild) {
            this.dropdown.removeChild(this.dropdown.firstChild);
        }

        function onDown(value) {
            return function() {
                this.setValue(this.input.value + value.substring(this.remainingText.length));
                setTimeout(function() { this.input.focus(); }.bind(this), 0);
            }
        }

        if (typeof(items) === "object") {
            for (var name in items) {
                var value = items[name];
                // Ignore items not beginning with current text
                if (this.remainingText && value.indexOf(this.remainingText) !== 0) continue;
                var item = this.currentItem.items[name];
                if (!item) continue;
                var option = buildElement("div", "dropdownOption");
                if (item.items && item.items["*"] && item.items["*"].placeHolder) {
                    value += item.items["*"].placeHolder;
                }
                option.innerText = item.description ? format(this.options.descriptionFormat, value, item.description) : value;
                option.addEventListener("mousedown", onDown(value).bind(this));
                this.dropdown.appendChild(option);
            }

            if (this.dropdown.children) {
                var validText = this.input.value.substring(0, this.input.value.length - this.remainingText.length);
                this.dropdown.style.marginLeft = format("{0}px", this.textWidth(validText));
                this.dropdown.style.display = "block";
            }
        }
    };

    AutoSuggest.prototype.renderDropdown = function(offset) {
        if (this.dropdown.children) {
            offset = offset || 0;
            this.dropdownIndex += offset

            if (this.dropdownIndex >= this.dropdown.children.length) this.dropdownIndex = 0;
            if (this.dropdownIndex < 0) this.dropdownIndex = this.dropdown.children.length - 1;

            for (var i = 0; i < this.dropdown.children.length; i++) {
                this.dropdown.children[i].className = (i == this.dropdownIndex) ? "dropdownOption select" : "dropdownOption";
            }
        }
    };

    AutoSuggest.prototype.renderHint = function() {
        if (this.freeTextItem && this.freeTextItem.placeHolder) {
            this.hint.value = this.input.value + this.freeTextItem.placeHolder;
            return;
        }

        var index = 0;
        for (var name in this.suggestItems) {
            var value = this.suggestItems[name];
            if (value.indexOf(this.remainingText) === 0 ) {
                if (index == this.dropdownIndex) {
                    this.hint.value = this.input.value + value.substring(this.remainingText.length);
                    break;                    
                } else {
                    index ++;
                }
            }
        }
    };

    // Recurse through template to find final match
    AutoSuggest.prototype.parseTemplate = function(remainingText, currentItem, multipleParent, ignoreList) {
        ignoreList = ignoreList || [];
        currentItem = currentItem || this.template;

        var freeTextItem = (currentItem.items && currentItem.items[this.options.multipleMarker]);
        var isMultiple = (multipleParent && (freeTextItem || !currentItem.items));
        var items = [];

        if (!currentItem.items && multipleParent) {
            currentItem = multipleParent;
        }

        if (freeTextItem && multipleParent) {
            items = multipleParent.items;
        } else if (!freeTextItem) {
            items = currentItem.items;
        }

        // Build dictionary of values
        var suggestItems = {}
        for (var name in items) {
            var item = items[name];

            // If we have a current multipleParent, ignore others that don't play well
            if (isMultiple && (ignoreList.indexOf(name) > -1 || !item.allowOthers)) continue;

            // Determine prefix
            var delimiter = (isMultiple && item.multiDelimiter) ? item.multiDelimiter : item.delimiter || this.options.delimiter;

            // Determine suffix for freeText items
            var suffix = (item.items && item.items[this.options.multipleMarker]) ? item.items[this.options.multipleMarker].delimiter || this.options.delimiter : "";

            // Format value
            suggestItems[name] = format(this.options.valueFormat, delimiter, name + suffix, item.description);
        }

        // Match next
        if (suggestItems !== {} && remainingText !== "") {
            var matchName = null;
            var length = -1;

            if (freeTextItem) {
                // It could be anything, let's find the next match in there
                matchName = this.options.multipleMarker;
                length = remainingText.length;

                // Find the longest exact match starting from the end
                for (var name in suggestItems) {
                    var value = suggestItems[name];
                    var index = remainingText.indexOf(value);
                    if (index > -1 && index < length) {
                        length = index;
                    }
                }

                // If length is unchanged, find longest partial match from the end
                if (length === remainingText.length) {
                    for (var name in suggestItems) {
                        var value = suggestItems[name];
                        for (var i = 1; i <= value.length; i++) {
                            var partial = value.substring(0, i);
                            var index = remainingText.length - i;
                            if (remainingText.substring(index) === partial && index < length){
                                length = index;
                            }
                        }
                    }
                }
            } else {
                // Find the longest exact match
                for (var name in suggestItems) {
                    var value = suggestItems[name];
                    if (remainingText.indexOf(value) === 0 && value.length > length) {
                        // We have found a matching item longer than before
                        matchName = name;
                        length = value.length;
                    }
                }
            }

            if (matchName) {
                // Set up for multiple items
                if (currentItem.items[matchName].allowOthers) {
                    ignoreList.push(matchName);
                    multipleParent = multipleParent || currentItem;
                }

                return this.parseTemplate(remainingText.substring(length), currentItem.items[matchName], multipleParent, ignoreList);
            }
        }

        this.currentItem = currentItem;
        this.remainingText = remainingText;
        this.suggestItems = suggestItems;
        this.freeTextItem = freeTextItem;
    };

    AutoSuggest.prototype.render = function() {
        this.hint.value = "";
        this.parseTemplate(this.input.value);

        if (this.input === document.activeElement) {
            this.buildDropdown(this.suggestItems);
            this.renderDropdown();
            this.renderHint();
        }
    };

    AutoSuggest.prototype.onFocus = function() {
        this.render();
    };

    AutoSuggest.prototype.onBlur = function() {
        this.buildDropdown(null);
        this.hint.value = (this.input.value === "") ? this.options.watermark : this.input.value;
    };

    AutoSuggest.prototype.onKeydown = function(e) {
        e = e || window.event;
        var keyCode = e.keyCode;

        switch(keyCode) {
            case 9:         // Tab
            case 13:        // Return
            case 39: {      // Right
                // Autocomplete the selected suggestion
                if (this.input.selectionStart == this.input.value.length && this.input.selectionStart < this.hint.value.length) {
                    this.setValue(this.hint.value);
                }

                if (keyCode === 9) {
                    // Stop tab from moving on
                    e.preventDefault();
                    e.stopPropagation();
                }

                break;
            }
            case 27: {      // Escape
                this.buildDropdown(null);
                break;
            }
            case 38:        // Up
            case 40: {      // Down
                this.renderDropdown(keyCode == 38 ? -1 : 1);
                this.renderHint();
                e.preventDefault();
                e.stopPropagation();
                break;
            }
        }
    };

    AutoSuggest.prototype.onInput = function() {
        this.render();
        this.callback(this.input.value, this.currentItem);
    };

    AutoSuggest.prototype.setValue = function(value) {
        this.input.value = value;
        this.onInput();
    };

    return AutoSuggest;
}));