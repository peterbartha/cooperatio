"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TextPatch = /** @class */ (function () {
    function TextPatch() {
        this.operations = [];
        this.baseLength = 0;
        this.targetLength = 0;
    }
    TextPatch.fromJSON = function (operations) {
        var patch = new TextPatch();
        var l = operations.length;
        for (var i = 0; i < l; i++) {
            var op = operations[i];
            if (TextPatch.isRetain(op)) {
                patch.retain(op);
            }
            else if (TextPatch.isInsert(op)) {
                patch.insert(op);
            }
            else if (TextPatch.isDelete(op)) {
                patch.remove(op);
            }
            else {
                throw new Error("Unknown operation: " + JSON.stringify(op));
            }
        }
        return patch;
    };
    TextPatch.transform = function (patchA, patchB) {
        if (patchA.baseLength !== patchB.baseLength) {
            throw new Error('Both operations have to have the same base length.');
        }
        var operation1prime = new TextPatch();
        var operation2prime = new TextPatch();
        var ops1 = patchA.operations;
        var ops2 = patchB.operations;
        var i1 = 0;
        var i2 = 0;
        var op1 = ops1[i1++];
        var op2 = ops2[i2++];
        while (true) {
            if (typeof op1 === 'undefined' && typeof op2 === 'undefined') {
                break;
            }
            if (TextPatch.isInsert(op1)) {
                operation1prime.insert(op1);
                operation2prime.retain(op1.length);
                op1 = ops1[i1++];
                continue;
            }
            if (TextPatch.isInsert(op2)) {
                operation1prime.retain(op2.length);
                operation2prime.insert(op2);
                op2 = ops2[i2++];
                continue;
            }
            if (typeof op1 === 'undefined') {
                throw new Error('Cannot compose operations: first patch is too short.');
            }
            if (typeof op2 === 'undefined') {
                throw new Error('Cannot compose operations: first patch is too long.');
            }
            var minl = void 0;
            if (TextPatch.isRetain(op1) && TextPatch.isRetain(op2)) {
                if (op1 > op2) {
                    minl = op2;
                    op1 = op1 - op2;
                    op2 = ops2[i2++];
                }
                else if (op1 === op2) {
                    minl = op2;
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }
                else {
                    minl = op1;
                    op2 = op2 - op1;
                    op1 = ops1[i1++];
                }
                operation1prime.retain(minl);
                operation2prime.retain(minl);
            }
            else if (TextPatch.isDelete(op1) && TextPatch.isDelete(op2)) {
                if (-op1 > -op2) {
                    op1 = op1 - op2;
                    op2 = ops2[i2++];
                }
                else if (op1 === op2) {
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }
                else {
                    op2 = op2 - op1;
                    op1 = ops1[i1++];
                }
            }
            else if (TextPatch.isDelete(op1) && TextPatch.isRetain(op2)) {
                if (-op1 > op2) {
                    minl = op2;
                    op1 = op1 + op2;
                    op2 = ops2[i2++];
                }
                else if (-op1 === op2) {
                    minl = op2;
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }
                else {
                    minl = -op1;
                    op2 = op2 + op1;
                    op1 = ops1[i1++];
                }
                operation1prime.remove(minl);
            }
            else if (TextPatch.isRetain(op1) && TextPatch.isDelete(op2)) {
                if (op1 > -op2) {
                    minl = -op2;
                    op1 = op1 + op2;
                    op2 = ops2[i2++];
                }
                else if (op1 === -op2) {
                    minl = op1;
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }
                else {
                    minl = op1;
                    op2 = op2 + op1;
                    op1 = ops1[i1++];
                }
                operation2prime.remove(minl);
            }
            else {
                throw new Error('The two operations aren\'t compatible.');
            }
        }
        return [operation1prime, operation2prime];
    };
    TextPatch.isRetain = function (operation) {
        return typeof operation === 'number' && operation > 0;
    };
    TextPatch.isInsert = function (operation) {
        return typeof operation === 'string';
    };
    TextPatch.isDelete = function (operation) {
        return typeof operation === 'number' && operation < 0;
    };
    TextPatch.getSimpleOperation = function (patch) {
        var ops = patch.operations;
        switch (ops.length) {
            case 1:
                return ops[0];
            case 2:
                return TextPatch.isRetain(ops[0]) ? ops[1] : (TextPatch.isRetain(ops[1]) ? ops[0] : null);
            case 3:
                if (TextPatch.isRetain(ops[0]) && TextPatch.isRetain(ops[2])) {
                    return ops[1];
                }
        }
        return null;
    };
    TextPatch.getStartIndex = function (patch) {
        if (TextPatch.isRetain(patch.operations[0])) {
            return patch.operations[0];
        }
        return 0;
    };
    TextPatch.prototype.shouldBeComposedWithInverted = function (other) {
        if (this.isNoop() || other.isNoop()) {
            return true;
        }
        var startA = TextPatch.getStartIndex(this);
        var startB = TextPatch.getStartIndex(other);
        var simpleA = TextPatch.getSimpleOperation(this);
        var simpleB = TextPatch.getSimpleOperation(other);
        if (!simpleA || !simpleB) {
            return false;
        }
        if (TextPatch.isInsert(simpleA) && TextPatch.isInsert(simpleB)) {
            return startA + simpleA.length === startB || startA === startB;
        }
        if (TextPatch.isDelete(simpleA) && TextPatch.isDelete(simpleB)) {
            return startB - simpleB === startA;
        }
        return false;
    };
    TextPatch.prototype.retain = function (n) {
        if (typeof n !== 'number') {
            throw new Error('`retain` expects an integer.');
        }
        if (n === 0) {
            return this;
        }
        this.baseLength += n;
        this.targetLength += n;
        var primitive = this.operations[this.operations.length - 1];
        if (TextPatch.isRetain(primitive)) {
            this.operations[this.operations.length - 1] = primitive + n;
        }
        else {
            this.operations.push(n);
        }
        return this;
    };
    TextPatch.prototype.insert = function (str) {
        if (typeof str !== 'string') {
            throw new Error('`insert` expects a string.');
        }
        if (!str) {
            return this;
        }
        this.targetLength += str.length;
        var ops = this.operations;
        if (TextPatch.isInsert(ops[ops.length - 1])) {
            ops[ops.length - 1] += str;
        }
        else if (TextPatch.isDelete(ops[ops.length - 1])) {
            if (TextPatch.isInsert(ops[ops.length - 2])) {
                ops[ops.length - 2] += str;
            }
            else {
                ops[ops.length] = ops[ops.length - 1];
                ops[ops.length - 2] = str;
            }
        }
        else {
            ops.push(str);
        }
        return this;
    };
    TextPatch.prototype.remove = function (operation) {
        var n = typeof operation === 'string' ? operation.length : operation;
        if (typeof n !== 'number') {
            throw new Error('`remove` expects an integer or a string.');
        }
        if (n === 0) {
            return this;
        }
        if (n > 0) {
            n = -n;
        }
        this.baseLength -= n;
        var primitive = this.operations[this.operations.length - 1];
        if (TextPatch.isDelete(primitive)) {
            this.operations[this.operations.length - 1] = primitive + n;
        }
        else {
            this.operations.push(n);
        }
        return this;
    };
    TextPatch.prototype.isNoop = function () {
        return this.operations.length === 0 || (this.operations.length === 1 && TextPatch.isRetain(this.operations[0]));
    };
    TextPatch.prototype.toJSON = function () {
        return this.operations;
    };
    TextPatch.prototype.invert = function (str) {
        var strIndex = 0;
        var inverse = new TextPatch();
        var ops = this.operations;
        var l = ops.length;
        for (var i = 0; i < l; i++) {
            var operation = ops[i];
            if (TextPatch.isRetain(operation)) {
                inverse.retain(operation);
                strIndex += operation;
            }
            else if (TextPatch.isInsert(operation)) {
                inverse.remove(operation.length);
            }
            else {
                inverse.insert(str.slice(strIndex, strIndex - operation));
                strIndex -= operation;
            }
        }
        return inverse;
    };
    TextPatch.prototype.compose = function (operationB) {
        if (this.targetLength !== operationB.baseLength) {
            throw new Error('The base length of the second patch has to be the target length of the first patch.');
        }
        var patch = new TextPatch();
        var ops1 = this.operations;
        var ops2 = operationB.operations;
        var i1 = 0;
        var i2 = 0;
        var op1 = ops1[i1++];
        var op2 = ops2[i2++];
        while (true) {
            if (typeof op1 === 'undefined' && typeof op2 === 'undefined') {
                break;
            }
            if (TextPatch.isDelete(op1)) {
                patch.remove(op1);
                op1 = ops1[i1++];
                continue;
            }
            if (TextPatch.isInsert(op2)) {
                patch.insert(op2);
                op2 = ops2[i2++];
                continue;
            }
            if (typeof op1 === 'undefined') {
                throw new Error('Cannot compose operations: first patch is too short.');
            }
            if (typeof op2 === 'undefined') {
                throw new Error('Cannot compose operations: first patch is too long.');
            }
            if (TextPatch.isRetain(op1) && TextPatch.isRetain(op2)) {
                if (op1 > op2) {
                    patch.retain(op2);
                    op1 = op1 - op2;
                    op2 = ops2[i2++];
                }
                else if (op1 === op2) {
                    patch.retain(op1);
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }
                else {
                    patch.retain(op1);
                    op2 = op2 - op1;
                    op1 = ops1[i1++];
                }
            }
            else if (TextPatch.isInsert(op1) && TextPatch.isDelete(op2)) {
                if (op1.length > -op2) {
                    op1 = op1.slice(-op2);
                    op2 = ops2[i2++];
                }
                else if (op1.length === -op2) {
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }
                else {
                    op2 = op2 + op1.length;
                    op1 = ops1[i1++];
                }
            }
            else if (TextPatch.isInsert(op1) && TextPatch.isRetain(op2)) {
                if (op1.length > op2) {
                    patch.insert(op1.slice(0, op2));
                    op1 = op1.slice(op2);
                    op2 = ops2[i2++];
                }
                else if (op1.length === op2) {
                    patch.insert(op1);
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }
                else {
                    patch.insert(op1);
                    op2 = op2 - op1.length;
                    op1 = ops1[i1++];
                }
            }
            else if (TextPatch.isRetain(op1) && TextPatch.isDelete(op2)) {
                if (op1 > -op2) {
                    patch.remove(op2);
                    op1 = op1 + op2;
                    op2 = ops2[i2++];
                }
                else if (op1 === -op2) {
                    patch.remove(op2);
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }
                else {
                    patch.remove(op1);
                    op2 = op2 + op1;
                    op1 = ops1[i1++];
                }
            }
            else {
                throw new Error("This shouldn't happen: op1: " + JSON.stringify(op1) + ", op2: " + JSON.stringify(op2) + ".");
            }
        }
        return patch;
    };
    TextPatch.prototype.apply = function (document) {
        if (document.length !== this.baseLength) {
            throw new Error('The patch\'s base length must be equal to the string\'s length.');
        }
        var strIndex = 0;
        var j = 0;
        var newStr = [];
        var operations = this.operations;
        var l = operations.length;
        for (var i = 0; i < l; i++) {
            var op = operations[i];
            if (TextPatch.isRetain(op)) {
                if (strIndex + op > document.length) {
                    throw new Error('Operation can\'t retain more characters than are left in the string.');
                }
                newStr[j++] = document.slice(strIndex, strIndex + op);
                strIndex += op;
            }
            else if (TextPatch.isInsert(op)) {
                newStr[j++] = op;
            }
            else {
                strIndex -= op;
            }
        }
        if (strIndex !== document.length) {
            throw new Error('The patch didn\'t operate on the whole string.');
        }
        return newStr.join('');
    };
    TextPatch.prototype.equals = function (otherOperation) {
        if (this.baseLength !== otherOperation.baseLength) {
            return false;
        }
        if (this.targetLength !== otherOperation.targetLength) {
            return false;
        }
        if (this.operations.length !== otherOperation.operations.length) {
            return false;
        }
        for (var i = 0; i < this.operations.length; i++) {
            if (this.operations[i] !== otherOperation.operations[i]) {
                return false;
            }
        }
        return true;
    };
    TextPatch.prototype.toString = function () {
        var newOperations = this.operations.map(function (operation) {
            if (TextPatch.isRetain(operation)) {
                return "retain " + operation;
            }
            else if (TextPatch.isInsert(operation)) {
                return "insert '" + operation + "'";
            }
            else {
                return "remove " + -operation;
            }
        });
        return newOperations.join(', ');
    };
    TextPatch.prototype.shouldBeComposedWith = function (other) {
        if (this.isNoop() || other.isNoop()) {
            return true;
        }
        var startA = TextPatch.getStartIndex(this);
        var startB = TextPatch.getStartIndex(other);
        var simpleA = TextPatch.getSimpleOperation(this);
        var simpleB = TextPatch.getSimpleOperation(other);
        if (!simpleA || !simpleB) {
            return false;
        }
        if (TextPatch.isInsert(simpleA) && TextPatch.isInsert(simpleB)) {
            return startA + simpleA.length === startB;
        }
        if (TextPatch.isDelete(simpleA) && TextPatch.isDelete(simpleB)) {
            return (startB - simpleB === startA) || startA === startB;
        }
        return false;
    };
    return TextPatch;
}());
exports.TextPatch = TextPatch;
