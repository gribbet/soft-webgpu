import { createComputer } from "./computer";
import { loadData } from "./data";
import { createBuffer } from "./device";
import { createPicker } from "./picker";
import { createRenderer } from "./renderer";

export const createApp = async () => {
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

  const {
    vertexCount,
    triangleCount,
    positionData,
    triangleData,
    adjacencyData,
  } = await loadData();

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
  const triangleBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    triangleData,
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
  const originalBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData,
  );
  const forceBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData.map(() => 0),
  );
  const boundaries = [
    {
      normal: [0, 1],
      offset: -0.5,
    },
  ] as const;
  const boundaryBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    new Float32Array(
      boundaries.flatMap(({ normal: [nx = 0, ny = 0], offset }) => [
        nx,
        ny,
        offset,
        0,
      ]),
    ),
  );

  const setAspect = (_: number) =>
    queue.writeBuffer(aspectBuffer, 0, new Float32Array([_]));
  const setSelected = (_: number) =>
    queue.writeBuffer(selectedBuffer, 0, new Uint32Array([_]));
  const setAnchor = (_: [number, number]) =>
    queue.writeBuffer(anchorBuffer, 0, new Float32Array(_));

  const computer = await createComputer({
    device,
    vertexCount,
    selectedBuffer,
    anchorBuffer,
    adjacencyBuffer,
    positionBuffer,
    previousBuffer,
    originalBuffer,
    forceBuffer,
    boundaryBuffer,
  });
  const renderer = await createRenderer({
    device,
    triangleCount,
    context,
    format,
    aspectBuffer,
    triangleBuffer,
    positionBuffer,
    boundaryBuffer,
  });
  const picker = await createPicker({
    device,
    vertexCount,
    aspectBuffer,
    positionBuffer,
  });

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

    computer.compute(delta);
    renderer.render();
  };

  requestAnimationFrame(frame);
};
