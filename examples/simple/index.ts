import { map, Now, Behavior, sinkStream, scan, sample, stepper, timeFrom, changes, sinkBehavior, Stream, snapshotWith, time, format, DomEventStream } from "@funkia/hareactive";
import { elements, modelView, runComponent, emptyComponent, list, loop } from "../../src";
import { lift, go, fgo } from "../../../jabz/src";
const { span, input, div, svg, circle, line, svgText, g, foreignObject, rect, polygon, button, text } = elements;


function liftNow(now) {
  return modelView(() => now, () => emptyComponent)();
}

const fontSize = 40

const streamToList = fgo(function*(stream) { 
  const tF = yield liftNow(sample(timeFrom))
  const ret = yield liftNow(
    sample(
      scan(
        ({value, time},b) => b.concat([{value, time, index: b.length}]), 
        [], 
        snapshotWith((value, time) => ({ value, time }), tF, stream) 
      )
    )
  )
  return ret;
})

const svgPanAndZoom = fgo(function*(width, height, children) {
  const keydowns = sinkStream();
  window.onkeydown = e => keydowns.push(e)
  const offset =  yield liftNow(sample(scan(
    (keyEvent, {x, y, zoom}) => {
      const d = 10*zoom;
      if (keyEvent.ctrlKey) {
        if (keyEvent.key === "ArrowUp") {
          return {x, y, zoom: zoom*0.9} 
        } else if (keyEvent.key === "ArrowDown") {
          return {x, y, zoom: zoom*1.1 } 
        } else {
          return {x, y, zoom} 
        }
      } else if (keyEvent.key === "ArrowUp") {
        return {x, y: y - d, zoom} 
      } else if (keyEvent.key === "ArrowDown") {
        return {x, y: y + d, zoom} 
      } else if (keyEvent.key === "ArrowLeft") {
        return {x: x - d, y, zoom}
      } else if (keyEvent.key === "ArrowRight") {
        return {x: x + d, y, zoom}
      } else {
        return {x, y, zoom}
      }
    },
    {x:0, y: 0, zoom: 1},
    keydowns
  )))
  yield svg({
    style: {border: "1px solid black", margin: "10px"},
    width,
    height, 
    viewBox: offset.map(({x, y, zoom}) => `${x + (width*(1-zoom)/2)} ${y + (height*(1-zoom)/2)} ${width*zoom} ${height*zoom}`)
  }, children)
})

// maybe want to make a shaper distinction between streams and behaviors
// and now use changes()
const typeOfFlow = flow =>
  flow instanceof Stream || flow.constructor.name === "DomEventStream"
    ? "Stream"
    : flow instanceof Behavior 
      ? "Behavior"
      : "Unknown"

const visualizeFlow = fgo(function*(flow, width, y) {
  const height = 100
  const behavior = typeOfFlow(flow) === "Behavior"
  const allEvents = yield streamToList(behavior ? changes(flow) : flow)
  yield g({ 
      transform: `translate(0, ${y})`
    }, [
      yield timeline(width, height, fontSize),
      list(
        e => marble(
          e.time / 50, 
          height/2, 
          e.value,
          allEvents,
          e.index,
          behavior
        ),
        allEvents,
        x => x.time
      )
    ]);
})

// should probably have the arrow stay put and have the event move
const timeline = fgo(function*(width, height, fontSize) {
  const tF = yield liftNow(sample(timeFrom))
  const maxX = tF.map(t => t/50)
  return g([
    line({
      x1: 0, 
      y1: height/2, 
      x2: maxX,
      y2: height/2, 
      stroke: "black",
      "stroke-width": 0.3
    }),
    polygon({
      points: maxX.map(x => `${x},${5+(height/2)} ${x},${-5+(height/2)} ${x+10},${height/2}`), 
      fill: "grey"
    })
  ]
})

// const transverse = streams => lift((...args) => [...args], ...streams)
const combine = (streamA, streamB) => lift((a, b)=>[a,b], streamA, streamB)


// could have variable heights for when close together in time
const marble = fgo(function*(x, y, value, events, index, behavior) {
  const jsonV = value === undefined ? "undefined" : value.toString()
  const s = jsonV.substring(0, 3) + (jsonV.length > 3 ? ".." : "");
  
  const xOffset = combine((yield liftNow(sample(timeFrom))), events).map(([t,es]) => index + 1 === es.length ? t/50 : 33)
  
  yield g({
      transform: `translate(${x}, ${y-5})`,
    }, [
      rect({
        width: 1,
        height: 10
      }),
      foreignObject({
          x: behavior ? xOffset.map(xOffset => 1-(2*s.length) + xOffset) : -3,
          y: -13
        },
        div({
          title: jsonV,
          style: {
            "font-size": `10px`,
            "font-family": "monospace"
          }
        }, s)
      )
    ]
  )
})


// this works only pointing straight down
// I'll need to do some trig to get slanted arrows
const arrow = (x1, y1, x2, y2, text) => {
  const x = x2 - x1
  const y = y2 - y1
  const a = Math.atan(y/x)
  return g([
    line({x1, y1, x2, y2, stroke: "black", "stroke-width": 1}),
    polygon({points: `${x2 + 5},${y2}, ${x2 - 5},${y2}, ${x2},${y2+5}`}),
    svgText({y: y1 + y/2, x: x2 + 10}, text)
  ])
}

const counter = go(function* () {
  const { click } = yield button("Click me");
  const count = yield liftNow(sample(scan((_, m) => m + 1, 0, click)));
  const countSpan = span({"font-size": count}, format`Button pressed ${count} times`);
  const { cancel } = yield countSpan
  
  // manually parsing the structure of the counter app above
  const spanDomEl = cancel.target 
  const flatMapComponent = countSpan.child 
  const dynamicComponent = flatMapComponent.component
  
  const formatBehavior = dynamicComponent.behavior 
  const formatBehaviorStrings = formatBehavior.strings
  const formatBehaviorBehaviors = formatBehavior.behaviors

  const activeScanBehavior = formatBehaviorBehaviors[0]
  const activeScanBehaviorF = activeScanBehavior.f // **
  
  const domEventStream = activeScanBehavior.parent 
  const domEventStreamEvent = domEventStream.eventName
  const domEventStreamDomEl = domEventStream.target
  
  const width = window.innerWidth - 40
  
  // manually laying out the stream structure from the parsed above
  yield svgPanAndZoom(width, window.innerHeight - 60, [
    svgText({y:20, x: 50 - 30}, domEventStreamDomEl.tagName),
    
    arrow(50, 30, 50, 80, domEventStreamEvent),
    
    visualizeFlow(domEventStream, width, 70),
    
    arrow(50, 120, 50, 170, "scan " + activeScanBehaviorF),
    
    visualizeFlow(activeScanBehavior, width, 160),
    
    arrow(50, 210, 50, 260, `format "${formatBehaviorStrings.join("${var1}")}"`),
    
    visualizeFlow(formatBehavior, width, 250),
    
    arrow(50, 300, 50, 350, "value"),
    
    svgText({y:380, x: 50 - 20}, spanDomEl.tagName)
  ])
});


// *********************************************************
// ************ Test Simple Flows **************************
// *********************************************************
// const s = sinkStream();
// let i = 0
// let values = [0, {a: 1}, ["sd", 3], null, undefined, "string" {a: 1, b: "a really long string that keeps going"}, {a: 1, b:2, c:4, y: 4, d: 5, e: 6, f: 7}]
// setInterval(() => s.push(i > values.length - 1 ? i++ : values[i++]), 1000)

// const b = sinkBehavior("starting");
// setInterval(() => b.push(i), 1000)


runComponent("#mount", counter);