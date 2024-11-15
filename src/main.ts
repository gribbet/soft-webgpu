import { createComputer } from "./computer";
import { boundaryData, positionData, triangleData } from "./data";
import { createBuffer } from "./device";
import { createPicker } from "./picker";
import { createRenderer } from "./renderer";

/*
 Deployment
 Fix collision
 Split boundary
 */

const init = async () => {
  const { gpu } = navigator;
  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error();
  const device = await adapter.requestDevice();

  const { queue } = device;

  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error();

  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  const aspectBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([1.0]),
  );
  const selectedBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Uint32Array([-1]),
  );
  const anchorBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([0, 0]),
  );
  const positionBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData,
  );
  const triangleBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    triangleData,
  );
  const boundaryBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    boundaryData(0),
  );

  const setAspect = (_: number) =>
    queue.writeBuffer(aspectBuffer, 0, new Float32Array([_]));
  const setSelected = (_: number) =>
    queue.writeBuffer(selectedBuffer, 0, new Uint32Array([_]));
  const setAnchor = (_: [number, number]) =>
    queue.writeBuffer(anchorBuffer, 0, new Float32Array(_));

  const computer = await createComputer({
    device,
    selectedBuffer,
    anchorBuffer,
    positionBuffer,
    boundaryBuffer,
  });
  const renderer = await createRenderer({
    device,
    context,
    format,
    aspectBuffer,
    boundaryBuffer,
    positionBuffer,
    triangleBuffer,
  });
  const picker = await createPicker({ device, aspectBuffer, positionBuffer });

  new ResizeObserver(([entry]) => {
    const { width = 0, height = 0 } = entry?.contentRect ?? {};
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    renderer.resize([width, height]);
    picker.resize([width, height]);
    setAspect(width / height);
  }).observe(canvas);

  const project = ([x, y]: [number, number]) => {
    const { width, height } = canvas;
    const aspect = width / height;
    return [
      2 * (x / (width / devicePixelRatio)) - 1,
      (1 - 2 * (y / (height / devicePixelRatio))) / aspect,
    ] satisfies [number, number];
  };

  canvas.addEventListener("mousedown", async ({ x, y }) => {
    const selected = await picker.pick([x, y]);
    setSelected(selected);
    setAnchor(project([x, y]));
  });
  canvas.addEventListener("mousemove", ({ x, y, buttons }) => {
    if (buttons === 0) return;
    setAnchor(project([x, y]));
  });
  canvas.addEventListener("mouseup", () => setSelected(-1));

  let last: number | undefined;
  const frame = (time: number) => {
    requestAnimationFrame(frame);

    const delta = (time - (last ?? time)) / 1000;
    last = time;

    if (delta === 0) return;

    queue.writeBuffer(boundaryBuffer, 0, boundaryData(time));

    computer.compute(delta);
    renderer.render();
  };

  requestAnimationFrame(frame);
};

void init();
