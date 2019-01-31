import { map, Now, Behavior, sinkStream, scan, sample, stepper, timeFrom, changes, sinkBehavior } from "@funkia/hareactive";
import { elements, modelView, runComponent, emptyComponent, go, fgo, list, loop } from "../../src";
const { span, input, div, svg, circle, line, svgText, g, foreignObject } = elements;

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

const fontSize = 40
const marble = (x, y, value) => {
  const s = JSON.stringify(value, null, '\n')
  const lines = s.split("\n").length
  return g({
      transform: `translate(${x}, ${y})`,
    }, [
      circle({
        r: fontSize/1.8,
        fill: "lightblue"
      }),
      foreignObject({
          x: -15
          y: -15
        },
        div({style: {
          "font-size": `${20/lines}px`,
        }}, s)
      )
      // svgText({
      //   y: fontSize/3,
      //   "font-size": fontSize,
      //   "text-anchor": "middle"
      // }, value)
    ]
  )
}

const visualizeStream = fgo(function*(stream, width, y) {
  const height = 100
  const allEvents = yield streamToList(stream)
  yield g({ 
      transform: `translate(0, ${y})`
    }, [
      yield timeline(width, height, fontSize),
      list(
        e => marble((1 + e.index) * fontSize * 2, height/2, e.value),
        allEvents,
        x => x.index
      )
    ]);
})

const visualizePushBehavior = fgo(function*(stream, width, y) {

  
}


const s = sinkStream();
let i = 0
let values = [0, {a: 1}, {a: 1, b: "a really long string that keeps going"}, {a: 1, b:2, c:3, y: 4, d: 5, e: 6, f: 7}]
setInterval(() => s.push(values[i++] || i), 1000)

const b = sinkBehavior("starting");
setInterval(() => b.push(i), 1000)


const app = visualize(s, window.innerWidth - 20, window.innerHeight - 30);
runComponent("#mount", app);
