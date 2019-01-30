"use strict";
var hareactive_1 = require("@funkia/hareactive");
var src_1 = require("../../src");
var span = src_1.elements.span, input = src_1.elements.input, div = src_1.elements.div, svg = src_1.elements.svg, circle = src_1.elements.circle, line = src_1.elements.line, svgText = src_1.elements.svgText, g = src_1.elements.g;
function liftNow(now) {
    return src_1.modelView(function () { return now; }, function () { return src_1.emptyComponent; })();
}
var visualize = function (stream, attrs) { return src_1.loop(function (_a) {
    var mousedown = _a.mousedown, mousemove = _a.mousemove, keydown = _a.keydown;
    return src_1.go(function () {
        var width = attrs.width, height = attrs.height;
        var allEvents = yield liftNow(hareactive_1.sample(hareactive_1.scan(function (a, b) { return b.concat([{ value: a, index: b.length }]); }, [], stream)));
        var fontSize = 40;
        // click and drag based offset
        // const mousePos = yield liftNow(sample(stepper(
        //   {clientX: 0, clientY: 0},
        //   mousemove.map(({clientX, clientY}) => ({clientX, clientY}))
        // );
        // const offset = yield liftNow(sample(scan(
        //   (e, p) => {console.log(e); return p},
        //   {x: 0, y: 0},
        //   mousedown
        // )))
        var keydowns = hareactive_1.sinkStream();
        window.onkeydown = function (e) { return keydowns.push(e); };
        var offset = yield liftNow(hareactive_1.sample(hareactive_1.scan(function (keyEvent, _a) {
            var x = _a.x, y = _a.y, zoom = _a.zoom;
            if (keyEvent.ctrlKey) {
                if (keyEvent.key === "ArrowUp") {
                    return { x: x, y: y, zoom: Math.max(0.5, zoom - 0.1) };
                }
                else if (keyEvent.key === "ArrowDown") {
                    return { x: x, y: y, zoom: zoom + 0.1 };
                }
                else {
                    return { x: x, y: y, zoom: zoom };
                }
            }
            else if (keyEvent.key === "ArrowUp") {
                return { x: x, y: y - 10, zoom: zoom };
            }
            else if (keyEvent.key === "ArrowDown") {
                return { x: x, y: y + 10, zoom: zoom };
            }
            else if (keyEvent.key === "ArrowLeft") {
                return { x: x - 10, y: y, zoom: zoom };
            }
            else if (keyEvent.key === "ArrowRight") {
                return { x: x + 10, y: y, zoom: zoom };
            }
            else {
                return { x: x, y: y, zoom: zoom };
            }
        }, { x: 0, y: 0, zoom: 1 }, keydowns)));
        var _a = yield svg({
            width: width,
            height: height,
            viewBox: offset.map(function (_a) {
                var x = _a.x, y = _a.y, zoom = _a.zoom;
                return (x * zoom + " " + ((y * zoom) + height / 3) + " " + (width / 2) * zoom + " " + (height / 4) * zoom);
            })
        }, [
            line({
                x1: 20,
                y1: height / 2,
                x2: (yield liftNow(hareactive_1.sample(hareactive_1.timeFrom))).map(function (t) { return ((t / 1000) * fontSize * 2); }),
                y2: height / 2,
                stroke: "black",
                "stroke-width": 0.3
            }),
            src_1.list(function (event) { return g({ transform: "translate(" + (fontSize + (event.index * fontSize * 2)) + ", " + height / 2 + ")" }, [
                circle({
                    r: fontSize / 1.8,
                    fill: "lightblue"
                }),
                svgText({
                    y: fontSize / 3,
                    "font-size": fontSize,
                    "text-anchor": "middle"
                }, event.value)
            ]); }, allEvents, function (x) { return x.index; })
        ]), mousedown_ = _a.mousedown, mousemove_ = _a.mousemove, keydown_ = _a.keydown;
        return { mousedown: mousedown_, mousemove: mousemove_, keydown: keydown_ };
    });
}); };
var s = hareactive_1.sinkStream();
var n = 0;
setInterval(function () { return s.push(n++); }, 1000);
var app = visualize(s, { width: window.innerWidth - 20, height: window.innerHeight - 30 });
src_1.runComponent("#mount", app);
