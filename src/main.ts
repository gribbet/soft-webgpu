import { createBackgroundPipeline } from "./background";
import {
  adjacencyData,
  boundaryData,
  positionData,
  triangleData,
} from "./data";
import { createBuffer } from "./device";
import { createForcesPipeline } from "./forces";
import { createIntegratePipeline } from "./integrate";
import { createPickPipeline } from "./pick";
import { createRenderPipeline } from "./render";

/*
 Deployment
 Friction
 Fix collision
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
  const backgroundPipeline = await createBackgroundPipeline({
    device,
    format,
    aspectBuffer,
    boundaryBuffer,
  });
  const renderPipeline = await createRenderPipeline({
    device,
    format,
    aspectBuffer,
    positionBuffer,
    triangleBuffer,
  });
  const pickPipeline = await createPickPipeline({
    device,
    aspectBuffer,
    positionBuffer,
  });

  let texture = device.createTexture({
    size: [1, 1],
    sampleCount: 4,
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  let pickTexture = device.createTexture({
    size: [1, 1],
    format: "r32uint",
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.COPY_SRC,
  });

  new ResizeObserver(([entry]) => {
    const { width = 0, height = 0 } = entry?.contentRect ?? {};
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    const aspect = width / height;
    texture.destroy();
    texture = device.createTexture({
      size: [width * devicePixelRatio, height * devicePixelRatio],
      sampleCount: 4,
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    pickTexture.destroy();
    pickTexture = device.createTexture({
      size: [width, height],
      format: "r32uint",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });
    device.queue.writeBuffer(aspectBuffer, 0, new Float32Array([aspect]));
  }).observe(canvas);

  const pick = async ([x, y]: [number, number]) => {
    const buffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const encoder = device.createCommandEncoder();
    const view = pickTexture.createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view, loadOp: "clear", storeOp: "store" }],
    });
    pickPipeline.encode(pass);
    pass.end();
    encoder.copyTextureToBuffer(
      { texture: pickTexture, origin: { x, y } },
      { buffer },
      { width: 1, height: 1, depthOrArrayLayers: 1 },
    );
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const [index = 0] = new Uint32Array(buffer.getMappedRange());
    buffer.destroy();
    return index - 1;
  };

  const project = ([x, y]: [number, number]) => {
    const { width, height } = canvas;
    const aspect = width / height;
    return [
      2 * (x / (width / devicePixelRatio)) - 1,
      (1 - 2 * (y / (height / devicePixelRatio))) / aspect,
    ];
  };

  canvas.addEventListener("mousedown", async ({ x, y }) => {
    const selected = await pick([x, y]);
    console.log(selected, project([x, y]));
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

    const view = texture.createView();
    const resolveTarget = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view, resolveTarget, loadOp: "clear", storeOp: "discard" },
      ],
    });
    backgroundPipeline.encode(pass);
    renderPipeline.encode(pass);
    pass.end();

    queue.submit([encoder.finish()]);
  };

  requestAnimationFrame(frame);
};

void init();
