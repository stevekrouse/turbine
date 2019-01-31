import { map, Now, Behavior, sinkStream, scan, sample, stepper, timeFrom, changes, sinkBehavior,  } from "@funkia/hareactive";
import { elements, modelView, runComponent, emptyComponent, go, fgo, list, loop } from "../../src";
import { lift } from "@funkia/jabz";
const { span, input, div, svg, circle, line, svgText, g, foreignObject, rect } = elements;

function liftNow(now) {
  return modelView(() => now, () => emptyComponent)();
}

const keydowns = sinkStream();
window.onkeydown = e => keydowns.push(e)
const offset =  scan(
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
)


const streamToList = stream => liftNow(
  sample(
    scan(
      // TODO it's not the index that's important but the *TIME*
      (a,b) => b.concat([{value: a, index: b.length}]), 
      [], 
      stream
    )
  )
)

const visualize = fgo(function*(stream, width, height){
  const offsetB = yield liftNow(sample(offset))
  yield svg({ 
    width,
    height, 
    viewBox: offsetB.map(({x, y, zoom}) => `${x + (width*(1-zoom)/2)} ${y + (height*(1-zoom)/2)} ${width*zoom} ${height*zoom}`)
  }, [
    visualizeStream(stream, width, height/2)
  ])
})

const timeline = fgo(function*(width, height, fontSize) { 
  return line({
    x1: 0, 
    y1: height/2, 
    x2: (yield liftNow(sample(timeFrom))).map(t => ((t/1000) * fontSize * 2)),
    y2: height/2, 
    stroke: "black",
    "stroke-width": 0.3
  })
})

// const transverse = streams => lift((...args) => [...args], ...streams)
const combine = (streamA, streamB) => lift((a, b)=>[a,b], streamA, streamB)

const fontSize = 40
const marble = fgo(function*(x, y, value, events, index) {
  const jsonV = value === undefined ? "undefined" : JSON.stringify(value) 
  const s = jsonV.substring(0, 3) + (jsonV.length > 3 ? ".." : "");
  
  const xOffset = combine((yield liftNow(sample(timeFrom))), events).map(([t,es]) => index + 1 === es.length ? t/30 : 33)
  
  yield g({
      transform: `translate(${x}, ${y-5})`,
    }, [
      rect({
        width: 1,
        height: 10
      }),
      foreignObject({
          // x: xOffset.map(xOffset => 1-(2*s.length) + xOffset),
          x: xOffset.map(xOffset => 1-(2*s.length) + xOffset),
          y: -13
        },
        div({
          style: {
            "font-size": `10px`,
            "font-family": "monospace"
          }
        }, s)
      )
    ]
  )
})

const visualizeStream = fgo(function*(stream, width, y) {
  const height = 100
  const allEvents = yield streamToList(stream)
  
  yield g({ 
      transform: `translate(0, ${y})`
    }, [
      yield timeline(width, height, fontSize),
      list(
        e => marble(
          (1 + e.index) * fontSize * 2, 
          height/2, 
          e.value,
          allEvents,
          e.index
        ),
        allEvents,
        x => x.index
      )
    ]);
})

const visualizePushBehavior = fgo(function*(behavior, width, y) {
  const height = 100
  const allEvents = yield streamToList(changes(stream))
  const offsetXF = (yield liftNow(sample(transverse(timeFrom, allEvents))))
    .map(([t, events]) => 
      (i => i === event.length ? (t/30) : 0)
  )
  yield g({ 
      transform: `translate(0, ${y})`
    }, [
      yield timeline(width, height, fontSize),
      list(
        e => marble(
          (1 + e.index) * fontSize * 2, 
          height/2, 
          e.value,
          allEvents,
          e.index
        ),
        allEvents,
        x => x.index
      )
    ]);
})


const s = sinkStream();
let i = 0
let values = [0, {a: 1}, ["sd", 3], null, undefined, "string" {a: 1, b: "a really long string that keeps going"}, {a: 1, b:2, c:4, y: 4, d: 5, e: 6, f: 7}]
setInterval(() => s.push(i > values.length - 1 ? i++ : values[i++]), 1000)

const b = sinkBehavior("starting");
setInterval(() => b.push(i), 1000)


const app = visualize(s, window.innerWidth - 20, window.innerHeight - 30);
runComponent("#mount", app);
