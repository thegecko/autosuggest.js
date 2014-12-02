/* @license
 *
 * AutoSuggest.js
 * Version: 0.0.3
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Rob Moran
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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
    var AutoSuggest = function(element, template, callback) {
        // Default options
        var options = this.options = {
            watermark: "enter text...",
            delimiter: " ",
            firstDelimiter: false,
            valueFormat: "{0}{1}",
            descriptionFormat: "{0} ({1})",
            freeTextMarker: "*",
            referenceMarker: "$ref"
        };

        // Merge options
        for (var item in template) {
            if (options[item] !== undefined) {
                options[item] = template[item];
            }
        }

        this.template = template;
        this.references = template.references;
        this.callback = callback;
        this.dropdownIndex = 0;
        this.freeTextItem = null;
        this.state = {};

        var input = this.input = buildElement("input", "input", { position: "absolute", backgroundColor: "transparent" });
        input.addEventListener("focus", this.onFocus.bind(this));
        input.addEventListener("blur", this.onBlur.bind(this));
        input.addEventListener("keydown", this.onKeydown.bind(this));
        input.addEventListener("input", this.onInput.bind(this));

        var hint = this.hint = buildElement("input", "input hint");
        hint.value = options.watermark;

        var container = this.container = buildElement("span", "suggest", { position: "relative" });
        var dropdown = this.dropdown = buildElement("div", "dropdown", { position: "absolute", display: "none" });
        var ruler = this.ruler = buildElement("span", "input ruler", { position: "fixed", display: "inline", visibility: "hidden", top: 0, right: 0, width: "auto" });
        var loader = this.loader = buildElement("div", "loader", { position: "absolute", right: "0", visibility: "hidden" });

        container.appendChild(ruler);
        container.appendChild(loader);
        container.appendChild(input);
        container.appendChild(hint);
        container.appendChild(dropdown);
        element.appendChild(container);
    };

    // Mixin item with any referenced counterpart
    AutoSuggest.prototype.resolveReference = function(item) {
        if (item[this.options.referenceMarker]) {
            var referenceName = item[this.options.referenceMarker];
            var reference = this.references[referenceName];
            for (var name in reference) {
                if (item[name] === undefined) {
                    item[name] = reference[name];
                }
            }
        }
    };

    // Recurse through template to find final match
    AutoSuggest.prototype.parseTemplate = function(remainingText, currentItem, nodeList, multipleParent, ignoreList) {
        currentItem = currentItem || this.template;
        nodeList = nodeList || [];
        ignoreList = ignoreList || [];

        // Resolve any reference
        this.resolveReference(currentItem);

        // Show loader
        this.loader.style.visibility = "visible";

        // Execute user-defined function for building items
        var itemFn = currentItem.itemFn || function(state, callback) { callback(); };
        itemFn({
            "text": this.input.value.substring(remainingText.length),
            "item": currentItem,
            "list": nodeList
        }, function() {

            // hide loader
            this.loader.style.visibility = "hidden";

            // Determine if we have free text or multiple
            var freeTextItem = (currentItem.items && currentItem.items[this.options.freeTextMarker]);
            var isMultiple = (multipleParent && (freeTextItem || !currentItem.items));

            // Determine items to deal with
            var items = {};
            if (freeTextItem && multipleParent) {
                items = multipleParent.items;
            } else if (!freeTextItem) {
                items = currentItem.items || (multipleParent && multipleParent.items) || {};
            }

            // Build dictionary of values
            var suggestItems = {}
            for (var name in items) {
                var item = items[name];

                // Resolve any reference
                this.resolveReference(item);

                // If we have a current multipleParent, ignore others that don't play well
                if (isMultiple && (ignoreList.indexOf(name) > -1 || !item.allowOthers)) continue;

                // Determine prefix
                var delimiter = this.options.delimiter;
                if (nodeList.length === 0 && !this.options.firstDelimiter) {
                    delimiter = "";
                } else if (isMultiple && item.multiDelimiter !== undefined) {
                    delimiter = item.multiDelimiter;
                } else if (item.delimiter !== undefined) {
                    delimiter = item.delimiter;
                }

                // Determine suffix for freeText items
                var suffix = "";
                if (item.items && item.items[this.options.freeTextMarker]) {
                    var suffixItem = item.items[this.options.freeTextMarker];
                    suffix = suffixItem.delimiter || this.options.delimiter;
                }

                // Format value
                suggestItems[name] = format(this.options.valueFormat, delimiter, name + suffix, item.description);
            }

            // Match next
            if (suggestItems !== {} && remainingText !== "") {
                var matchName = null;
                var length = -1;

                if (freeTextItem) {
                    // It could be anything, let's find the next match in there
                    matchName = this.options.freeTextMarker;
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
                    if (!currentItem.items && multipleParent) {
                        currentItem = multipleParent;
                    }
                    if (currentItem.items[matchName].allowOthers) {
                        ignoreList.push(matchName);
                        multipleParent = multipleParent || currentItem;
                    }

                    var node = (matchName === this.options.freeTextMarker) ? remainingText.substring(0, length) : matchName;
                    nodeList.push(node);

                    return this.parseTemplate(remainingText.substring(length), currentItem.items[matchName], nodeList, multipleParent, ignoreList);
                }
            }

            // Build current state
            var descriptions = {};
            for (var name in suggestItems) {
                var value = suggestItems[name];
                var item = items[name];
                var description = item.description ? format(this.options.descriptionFormat, value, item.description) : value;
                descriptions[name] = description;
            }       

            this.freeTextItem = freeTextItem;
            this.state = {
                "remainingText": remainingText,
                "template": currentItem,
                "list": nodeList,
                "items": suggestItems,
                "descriptions": descriptions
            };

            // Finished, trigger other stuff
            this.onParse();
        }.bind(this));
    };

    AutoSuggest.prototype.textWidth = function(text) {
        this.ruler.innerText = text;
        return this.ruler.offsetWidth;
    };

    AutoSuggest.prototype.buildDropdown = function(state) {
        this.dropdown.style.display = "none";
        this.dropdownIndex = 0;

        while (this.dropdown.firstChild) {
            this.dropdown.removeChild(this.dropdown.firstChild);
        }

        function onDown(value) {
            return function() {
                this.setValue(this.input.value + value.substring(state.remainingText.length));
                setTimeout(function() { this.input.focus(); }.bind(this), 0);
            }
        }

        if (state) {
            for (var name in state.items) {
                var value = state.items[name];
                // Ignore items not beginning with current text
                if (state.remainingText && value.indexOf(state.remainingText) !== 0) continue;               
                var option = buildElement("div", "dropdownOption");
                option.innerText = state.descriptions[name];
                option.addEventListener("mousedown", onDown(value).bind(this));
                this.dropdown.appendChild(option);
            }

            if (this.dropdown.children) {
                this.dropdown.style.display = "block";
                var validText = this.input.value.substring(0, this.input.value.length - state.remainingText.length);
                var offset = Math.min(this.textWidth(validText), this.input.clientWidth - this.dropdown.clientWidth);
                this.dropdown.style.marginLeft = format("{0}px", offset);
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

    AutoSuggest.prototype.renderHint = function(state) {
        // Hide hint when we scroll text off the end
        if (this.input.scrollWidth > this.input.clientWidth) {
            this.hint.value = "";
            return;
        }

        // Freetext items can have a placeholder when nothing entered
        if (this.freeTextItem && this.freeTextItem.placeHolder) {
            this.hint.value = this.input.value + this.freeTextItem.placeHolder;
            return;
        }

        var index = 0;
        for (var name in state.items) {
            var value = state.items[name];
            if (value.indexOf(state.remainingText) === 0 ) {
                if (index == this.dropdownIndex) {
                    this.hint.value = this.input.value + value.substring(state.remainingText.length);
                    break;                    
                } else {
                    index ++;
                }
            }
        }
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
                this.buildDropdown();
                break;
            }
            case 38:        // Up
            case 40: {      // Down
                this.renderDropdown(keyCode == 38 ? -1 : 1);
                this.renderHint(this.state);
                e.preventDefault();
                e.stopPropagation();
                break;
            }
        }
    };

    AutoSuggest.prototype.render = function() {
        this.hint.value = "";
        this.dropdownIndex = 0;
        this.parseTemplate(this.input.value);
    };

    AutoSuggest.prototype.onFocus = function() {
        this.render();
    };

    AutoSuggest.prototype.onBlur = function() {
        this.buildDropdown();
        this.hint.value = (this.input.value === "") ? this.options.watermark : "";
    };

    AutoSuggest.prototype.setValue = function(value) {
        this.input.value = value;
        this.onInput();
    };

    AutoSuggest.prototype.onInput = function() {
        this.render();
    };

    AutoSuggest.prototype.onParse = function() {
        if (this.input === document.activeElement) {
            this.buildDropdown(this.state);
            this.renderDropdown();
            this.renderHint(this.state);
        }

        this.callback(this.input.value, this.state);
    };

    return AutoSuggest;
}));