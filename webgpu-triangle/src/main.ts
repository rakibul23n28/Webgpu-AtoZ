// main.ts
async function main() {
  const canvas = document.getElementById(
    "gpu-canvas"
  ) as HTMLCanvasElement | null;
  if (!canvas) throw new Error("Canvas element not found");

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();

  if (!device) {
    alert("WebGPU not supported");
    return;
  }

  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  render(device, context, presentationFormat);
}

const shaderCode: string = `
    struct VertexOut {
        @builtin(position) pos: vec4f,
        @location(0) color: vec4f
    };

    @vertex 
    fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexOut {
        let pos = array(
            vec2f( 0.0,  0.5), 
            vec2f(-0.5, -0.5), 
            vec2f( 0.5, -0.5)
        );
        let color = array(
            vec4f(1.0, 0.0, 0.0, 1.0),
            vec4f(0.0, 1.0, 0.0, 1.0),
            vec4f(0.0, 0.0, 1.0, 1.0)
        );

        var out: VertexOut;
        out.pos = vec4f(pos[vertexIndex], 0.0, 1.0);
        out.color = color[vertexIndex];
        return out;
    }

    @fragment 
    fn fs(in: VertexOut) -> @location(0) vec4f {
        return in.color;
    }
`;

function render(
  device: GPUDevice,
  context: GPUCanvasContext,
  format: GPUTextureFormat
) {
  const shaderModule = device.createShaderModule({ code: shaderCode });

  const pipeline = device.createRenderPipeline({
    label: "triangle-pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [{ format }],
    },
  });

  const frame = () => {
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

main();
