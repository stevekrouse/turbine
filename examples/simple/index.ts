import { map, Now, Behavior, sinkStream, Now, scan, sample, stepper, timeFrom } from "@funkia/hareactive";
import { elements, modelView, runComponent, emptyComponent, go, fgo, list, loop } from "../../src";
const { span, input, div, svg, circle, line, svgText, g } = elements;

function liftNow(now) {
  return modelView(() => now, () => emptyComponent)();
}


const visualize = (stream, attrs) => loop(
  ({mousedown, mousemove, keydown}) =>
    go(function*(){
      const {width, height} = attrs
      const allEvents = yield liftNow(
        sample(
          scan(
            (a,b) => b.concat([{value: a, index: b.length}]), 
            [], 
            stream
          )
        )
      );
      

      const fontSize = 40
      
      
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
      
      
      const keydowns = sinkStream();
      window.onkeydown = e => keydowns.push(e)
      
      const offset = yield liftNow(sample(scan(
        (keyEvent, {x, y, zoom}) => { 
          if (keyEvent.ctrlKey) {
            if (keyEvent.key === "ArrowUp") {
              return {x, y, zoom: Math.max(0.5, zoom-0.1)} 
            } else if (keyEvent.key === "ArrowDown") {
              return {x, y, zoom: zoom+0.1 } 
            } else {
              return {x, y, zoom} 
            }
          } else if (keyEvent.key === "ArrowUp") {
            return {x, y: y - 10, zoom} 
          } else if (keyEvent.key === "ArrowDown") {
            return {x, y: y + 10, zoom} 
          } else if (keyEvent.key === "ArrowLeft") {
            return {x: x - 10, y, zoom}
          } else if (keyEvent.key === "ArrowRight") {
            return {x: x + 10, y, zoom}
          } else {
            return {x, y, zoom}
          }
        },
        {x:0, y: 0, zoom: 1},
        keydowns
      )))

    
      const {
        mousedown: mousedown_, 
        mousemove: mousemove_
        keydown: keydown_
      } = yield svg({ 
        width,
        height, 
        viewBox: offset.map(({x, y, zoom}) => `${x*zoom} ${(y*zoom)+height/3} ${(width/2)*zoom} ${(height/4)*zoom}`)
      }, [
        line({
          x1: 20, 
          y1: height/2, 
          x2: (yield liftNow(sample(timeFrom))).map(t => ((t/1000) * fontSize * 2)), 
          y2: height/2, 
          stroke: "black",
          "stroke-width": 0.3
        }),
        list(
          event => g({transform: `translate(${fontSize + (event.index * fontSize * 2)}, ${height/2})`}, [
              circle({
                r: fontSize/1.8,
                fill: "lightblue"
              }),
              svgText({
                y: fontSize/3,
                "font-size": fontSize,
                "text-anchor": "middle"
              }, event.value)
          ]),
          allEvents,
          x => x.index
        )
      ]);
      
      return {mousedown: mousedown_, mousemove: mousemove_, keydown: keydown_}
    })
)

const s = sinkStream();
let n = 0;
setInterval(() => s.push(n++), 1000)

const app = visualize(s, {width: window.innerWidth-20, height: window.innerHeight-30});
runComponent("#mount", app);
