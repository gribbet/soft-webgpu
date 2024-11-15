import {
  adjacencyData,
  boundaryData,
  positionData,
  triangleData,
} from "./data";
import { createBuffer } from "./device";
import { createForcesPipeline } from "./forces";
import { createIntegratePipeline } from "./integrate";
import { createPicker } from "./picker";
import { createRenderer } from "./renderer";

/*
 Deployment
 Fix collision
 Split boundary
 */

const steps = 64;

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

  const timeBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([0]),
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
  const aspectBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([1.0]),
  );
  const adjacencyBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    adjacencyData,
  );
  const positionBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData,
  );
  const previousBuffer = createBuffer(
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
  const forceBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData.map(() => 0),
  );

  const forcesPipeline = await createForcesPipeline({
    device,
    timeBuffer,
    adjacencyBuffer,
    positionBuffer,
    previousBuffer,
    forceBuffer,
  });
  const integratePipeline = await createIntegratePipeline({
    device,
    timeBuffer,
    selectedBuffer,
    anchorBuffer,
    positionBuffer,
    previousBuffer,
    boundaryBuffer,
    forceBuffer,
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
    const aspect = width / height;
    renderer.resize([width, height]);
    picker.resize([width, height]);
    device.queue.writeBuffer(aspectBuffer, 0, new Float32Array([aspect]));
  }).observe(canvas);

  const project = ([x, y]: [number, number]) => {
    const { width, height } = canvas;
    const aspect = width / height;
    return [
      2 * (x / (width / devicePixelRatio)) - 1,
      (1 - 2 * (y / (height / devicePixelRatio))) / aspect,
    ];
  };

  canvas.addEventListener("mousedown", async ({ x, y }) => {
    const selected = await picker.pick([x, y]);
    queue.writeBuffer(selectedBuffer, 0, new Uint32Array([selected]));
    queue.writeBuffer(anchorBuffer, 0, new Float32Array(project([x, y])));
  });

  canvas.addEventListener("mousemove", ({ x, y, buttons }) => {
    if (buttons === 0) return;
    queue.writeBuffer(anchorBuffer, 0, new Float32Array(project([x, y])));
  });

  canvas.addEventListener("mouseup", () =>
    queue.writeBuffer(selectedBuffer, 0, new Uint32Array([-1])),
  );

  let last: number | undefined;
  const frame = (time: number) => {
    requestAnimationFrame(frame);

    const interval = (time - (last ?? time)) / 1000;
    last = time;

    if (interval === 0) return;

    queue.writeBuffer(timeBuffer, 0, new Float32Array([interval / steps]));
    queue.writeBuffer(boundaryBuffer, 0, boundaryData(time));

    const encoder = device.createCommandEncoder();

    for (let i = 0; i < steps; i++) {
      forcesPipeline.encode(encoder);
      integratePipeline.encode(encoder);
    }

    queue.submit([encoder.finish()]);

    renderer.render();
  };

  requestAnimationFrame(frame);
};

void init();
