"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var textPatch_1 = require("../src/operations/text/textPatch");
var insert_1 = require("../src/operations/text/types/insert");
var remove_1 = require("../src/operations/text/types/remove");
var noop_1 = require("../src/operations/text/types/noop");
var TestHelper;
(function (TestHelper) {
    function randomInt(max) {
        return Math.floor(Math.random() * max);
    }
    TestHelper.randomInt = randomInt;
    function randomIntBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    TestHelper.randomIntBetween = randomIntBetween;
    function randomText(length) {
        var text = '';
        for (var i = 0; i < length; i++) {
            if (Math.random() < 0.15) {
                text += '\n';
            }
            else {
                var char = randomInt(26) + 97;
                text += String.fromCharCode(char);
            }
        }
        return text;
    }
    TestHelper.randomText = randomText;
    function randomTextPatch(doc) {
        var operation = new textPatch_1.TextPatch();
        var left;
        while (true) {
            left = doc.length - operation.baseLength;
            if (left === 0) {
                break;
            }
            var r = Math.random();
            var l = randomInt(Math.min(left - 1, 20)) + 1;
            if (r < 0.2) {
                operation.insert(randomText(l));
            }
            else if (r < 0.4) {
                operation.remove(l);
            }
            else {
                operation.retain(l);
            }
        }
        if (Math.random() < 0.3) {
            operation.insert(randomText(10) + 1);
        }
        return operation;
    }
    TestHelper.randomTextPatch = randomTextPatch;
    function randomInsertOperation(doc) {
        return new insert_1.Insert(randomText(randomInt(10) + 1), randomInt(doc.length + 1));
    }
    TestHelper.randomInsertOperation = randomInsertOperation;
    function randomInsert(operationLength, position) {
        return new insert_1.Insert(randomText(operationLength), position);
    }
    TestHelper.randomInsert = randomInsert;
    function randomRemoveOperation(doc) {
        var position = randomInt(doc.length);
        var count = randomInt(Math.min(10, doc.length - position)) + 1;
        return new remove_1.Remove(count, position);
    }
    TestHelper.randomRemoveOperation = randomRemoveOperation;
    function randomOperation(doc) {
        if (Math.random() < 0.5) {
            return randomInsertOperation(doc);
        }
        if (doc.length === 0 || Math.random() < 0.2) {
            return noop_1.Noop.getInstance();
        }
        return randomRemoveOperation(doc);
    }
    TestHelper.randomOperation = randomOperation;
})(TestHelper = exports.TestHelper || (exports.TestHelper = {}));
