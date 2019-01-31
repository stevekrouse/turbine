"use strict";
var hareactive_1 = require("@funkia/hareactive");
var src_1 = require("../../src");
var span = src_1.elements.span, input = src_1.elements.input, div = src_1.elements.div, svg = src_1.elements.svg, circle = src_1.elements.circle, line = src_1.elements.line, svgText = src_1.elements.svgText, g = src_1.elements.g, foreignObject = src_1.elements.foreignObject;
function liftNow(now) {
    return src_1.modelView(function () { return now; }, function () { return src_1.emptyComponent; })();
}
var keydowns = hareactive_1.sinkStream();
window.onkeydown = function (e) { return keydowns.push(e); };
var offset = hareactive_1.scan(function (keyEvent, _a) {
    var x = _a.x, y = _a.y, zoom = _a.zoom;
    var d = 10 * zoom;
    if (keyEvent.ctrlKey) {
        if (keyEvent.key === "ArrowUp") {
            return { x: x, y: y, zoom: zoom * 0.9 };
        }
        else if (keyEvent.key === "ArrowDown") {
            return { x: x, y: y, zoom: zoom * 1.1 };
        }
        else {
            return { x: x, y: y, zoom: zoom };
        }
    }
    else if (keyEvent.key === "ArrowUp") {
        return { x: x, y: y - d, zoom: zoom };
    }
    else if (keyEvent.key === "ArrowDown") {
        return { x: x, y: y + d, zoom: zoom };
    }
    else if (keyEvent.key === "ArrowLeft") {
        return { x: x - d, y: y, zoom: zoom };
    }
    else if (keyEvent.key === "ArrowRight") {
        return { x: x + d, y: y, zoom: zoom };
    }
    else {
        return { x: x, y: y, zoom: zoom };
    }
}, { x: 0, y: 0, zoom: 1 }, keydowns);
var streamToList = function (stream) { return liftNow(hareactive_1.sample(hareactive_1.scan(
// TODO it's not the index that's important but the *TIME*
function (a, b) { return b.concat([{ value: a, index: b.length }]); }, [], stream))); };
var visualize = src_1.fgo(function (stream, width, height) {
    var offsetB = yield liftNow(hareactive_1.sample(offset));
    yield svg({
        width: width,
        height: height,
        viewBox: offsetB.map(function (_a) {
            var x = _a.x, y = _a.y, zoom = _a.zoom;
            return ((x + (width * (1 - zoom) / 2)) + " " + (y + (height * (1 - zoom) / 2)) + " " + width * zoom + " " + height * zoom);
        })
    }, [
        visualizeStream(stream, width, height / 2)
    ]);
});
var timeline = src_1.fgo(function (width, height, fontSize) {
    return line({
        x1: 0,
        y1: height / 2,
        x2: (yield liftNow(hareactive_1.sample(hareactive_1.timeFrom))).map(function (t) { return ((t / 1000) * fontSize * 2); }),
        y2: height / 2,
        stroke: "black",
        "stroke-width": 0.3
    });
});
var fontSize = 40;
var marble = function (x, y, value) {
    var s = JSON.stringify(value, null, '\n');
    var lines = s.split("\n").length;
    return g({
        transform: "translate(" + x + ", " + y + ")"
    }, [
        circle({
            r: fontSize / 1.8,
            fill: "lightblue"
        }),
        foreignObject({
            x: -15,
            y: -15
        }, div({ style: {
                "font-size": 20 / lines + "px"
            } }, s))
    ]);
};
var visualizeStream = src_1.fgo(function (stream, width, y) {
    var height = 100;
    var allEvents = yield streamToList(stream);
    yield g({
        transform: "translate(0, " + y + ")"
    }, [
        yield timeline(width, height, fontSize),
        src_1.list(function (e) { return marble((1 + e.index) * fontSize * 2, height / 2, e.value); }, allEvents, function (x) { return x.index; })
    ]);
});
var visualizePushBehavior = src_1.fgo(function (stream, width, y) {
});
var s = hareactive_1.sinkStream();
var i = 0;
var values = [0, { a: 1 }, { a: 1, b: "a really long string that keeps going" }, { a: 1, b: 2, c: 3, y: 4, d: 5, e: 6, f: 7 }];
setInterval(function () { return s.push(values[i++] || i); }, 1000);
var b = hareactive_1.sinkBehavior("starting");
setInterval(function () { return b.push(i); }, 1000);
var app = visualize(s, window.innerWidth - 20, window.innerHeight - 30);
src_1.runComponent("#mount", app);
