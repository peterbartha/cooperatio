"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Noop = /** @class */ (function () {
    function Noop() {
    }
    Noop.getInstance = function () {
        if (!Noop.instance) {
            Noop.instance = new Noop();
        }
        return Noop.instance;
    };
    Noop.prototype.apply = function (document) {
        return document;
    };
    Noop.prototype.equals = function (other) {
        return other instanceof Noop;
    };
    Noop.prototype.toString = function () {
        return 'Noop()';
    };
    return Noop;
}());
exports.Noop = Noop;
