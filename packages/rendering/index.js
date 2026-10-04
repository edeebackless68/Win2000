/** @package @win2k/rendering — WebGPU → WebGL2 → Canvas 2D rendering. */
const GPU_VS = `struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f }; @vertex fn vs(@builtin(vertex_index) i:u32)->VOut { let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); var o:VOut; o.position=vec4f(p[i],0,1); o.uv=vec2f((p[i].x+1)*0.5,1-(p[i].y+1)*0.5); return o; }`;
const GPU_TEXTURE =
  GPU_VS +
  ` @group(0) @binding(0) var tex:texture_2d<f32>; @group(0) @binding(1) var smp:sampler; @fragment fn fs(i:VOut)->@location(0) vec4f { return textureSample(tex,smp,i.uv); }`;
const GPU_DESKTOP =
  GPU_VS +
  ` struct Params { color:vec4f, extra:vec4f }; @group(0) @binding(0) var<uniform> u:Params; @fragment fn fs(i:VOut)->@location(0) vec4f { var color=u.color.rgb; let p=i.uv*u.extra.zw; if(u.extra.x>0.5&&u.extra.x<1.5) { let a=step(1.0, p.x%4.0)*step(1.0,p.y%4.0);color*=0.8+0.2*a; } if(u.extra.x>1.5&&u.extra.x<2.5) { let a=sin(p.x*0.013+p.y*0.015)*0.045; color+=vec3f(a); } if(u.extra.x>2.5){let v=0.5+0.5*sin(i.uv.x*13+u.extra.y)*cos(i.uv.y*9+u.extra.y*0.7);color=mix(vec3f(0.015,0.04,0.13),vec3f(0.18,0.45,0.75),v);} return vec4f(color,1); }`;
function compileGL(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s));
  return s;
}
export class GraphicsSurface {
  constructor(canvas, { mode = "texture", preference = "auto" } = {}) {
    this.canvas = canvas;
    this.mode = mode;
    this.preference = preference;
    this.backend = "initializing";
    this.disposed = false;
    this.frames = 0;
    this.totalTime = 0;
    this.color = "#3a6ea5";
    this.pattern = 0;
    this.time = 0;
    this.lastSource = null;
  }
  async init() {
    if (this.preference === "auto" || this.preference === "webgpu")
      try {
        if (!navigator.gpu) throw new Error("WebGPU unavailable");
        const adapter = await navigator.gpu.requestAdapter({
          powerPreference: "low-power",
        });
        if (!adapter) throw new Error("GPU adapter unavailable");
        this.device = await adapter.requestDevice();
        this.gpu = this.canvas.getContext("webgpu");
        if (!this.gpu) throw new Error("WebGPU canvas unavailable");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.gpu.configure({
          device: this.device,
          format: this.format,
          alphaMode: "opaque",
        });
        const shader = this.device.createShaderModule({
          code: this.mode === "texture" ? GPU_TEXTURE : GPU_DESKTOP,
        });
        const info = await shader.getCompilationInfo();
        if (info.messages.some((m) => m.type === "error"))
          throw new Error(info.messages.map((m) => m.message).join("\n"));
        this.pipeline = this.device.createRenderPipeline({
          layout: "auto",
          vertex: { module: shader, entryPoint: "vs" },
          fragment: {
            module: shader,
            entryPoint: "fs",
            targets: [{ format: this.format }],
          },
          primitive: { topology: "triangle-list" },
        });
        if (this.mode === "desktop") {
          this.uniform = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          });
          this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.uniform } }],
          });
        } else
          this.sampler = this.device.createSampler({
            magFilter: "nearest",
            minFilter: "nearest",
          });
        this.backend = "WebGPU";
        this.device.lost.then(() => {
          if (!this.disposed) {
            this.device = null;
            this.#replaceCanvas();
            this.#fallback();
            this.draw(this.lastSource);
            this.onBackendChange?.(this.backend);
          }
        });
        return this;
      } catch (e) {
        this.fallbackReason = e.message;
        if (this.gpu) this.#replaceCanvas();
        this.device?.destroy();
        this.device = null;
      }
    this.#fallback();
    return this;
  }
  #replaceCanvas() {
    const old = this.canvas,
      newCanvas = old.cloneNode(false);
    newCanvas.width = old.width;
    newCanvas.height = old.height;
    old.replaceWith(newCanvas);
    this.canvas = newCanvas;
    this.onCanvasReplace?.(newCanvas);
  }
  #fallback() {
    if (this.preference !== "canvas2d")
      try {
        const gl = this.canvas.getContext("webgl2", {
          alpha: false,
          antialias: false,
          preserveDrawingBuffer: true,
        });
        if (!gl) throw new Error("WebGL2 unavailable");
        this.gl = gl;
        const program = gl.createProgram();
        gl.attachShader(
          program,
          compileGL(
            gl,
            gl.VERTEX_SHADER,
            `#version 300 es\nprecision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=vec2(p.x,1.0-p.y);gl_Position=vec4(p*2.0-1.0,0,1);}`,
          ),
        );
        const fs =
          this.mode === "texture"
            ? `uniform sampler2D tex;void main(){color=texture(tex,uv);}`
            : `uniform vec4 base;uniform vec4 extra;void main(){vec3 c=base.rgb;vec2 p=uv*extra.zw;if(extra.x>0.5&&extra.x<1.5)c*=0.8+0.2*step(1.0,mod(p.x,4.0))*step(1.0,mod(p.y,4.0));if(extra.x>1.5&&extra.x<2.5)c+=vec3(sin(p.x*0.013+p.y*0.015)*0.045);if(extra.x>2.5)c=mix(vec3(0.015,0.04,0.13),vec3(0.18,0.45,0.75),0.5+0.5*sin(uv.x*13.0+extra.y)*cos(uv.y*9.0+extra.y*0.7));color=vec4(c,1.0);}`;
        gl.attachShader(
          program,
          compileGL(
            gl,
            gl.FRAGMENT_SHADER,
            `#version 300 es\nprecision highp float;in vec2 uv;out vec4 color;${fs}`,
          ),
        );
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(program));
        gl.useProgram(program);
        this.glProgram = program;
        this.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.backend = "WebGL 2";
        this.canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          if (!this.disposed) {
            this.gl = null;
            this.preference = "canvas2d";
            this.#replaceCanvas();
            this.#fallback();
            this.draw(this.lastSource);
            this.onBackendChange?.(this.backend);
          }
        });
        return;
      } catch (e) {
        this.fallbackReason = e.message;
        if (this.gl) {
          this.#replaceCanvas();
          this.gl = null;
        }
      }
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.backend = "Canvas 2D";
  }
  resize(width, height) {
    if (this.disposed) return;
    const limit = this.device?.limits.maxTextureDimension2D || 8192;
    this.canvas.width = Math.max(1, Math.min(limit, Math.round(width)));
    this.canvas.height = Math.max(1, Math.min(limit, Math.round(height)));
    this.draw(this.lastSource);
  }
  setDesktop(color, pattern = 0, time = 0) {
    this.color = color;
    this.pattern = pattern;
    this.time = time;
    this.draw();
  }
  draw(source) {
    if (this.disposed || this.backend === "initializing") return;
    const start = performance.now();
    if (source) this.lastSource = source;
    source ??= this.lastSource;
    const color = (this.color.match(/[a-f0-9]{2}/gi) || ["3a", "6e", "a5"]).map(
        (h) => parseInt(h, 16) / 255,
      ),
      width = this.canvas.width,
      height = this.canvas.height;
    if (this.device) {
      const d = this.device;
      if (this.mode === "texture") {
        if (!source) return;
        if (
          !this.texture ||
          this.texture.width !== source.width ||
          this.texture.height !== source.height
        ) {
          this.texture?.destroy();
          this.texture = d.createTexture({
            size: [source.width, source.height],
            format: "rgba8unorm",
            usage:
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_DST |
              GPUTextureUsage.RENDER_ATTACHMENT,
          });
          this.bindGroup = d.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: this.texture.createView() },
              { binding: 1, resource: this.sampler },
            ],
          });
        }
        d.queue.copyExternalImageToTexture(
          { source },
          { texture: this.texture },
          [source.width, source.height],
        );
      } else
        d.queue.writeBuffer(
          this.uniform,
          0,
          new Float32Array([
            ...color,
            1,
            this.pattern,
            this.time,
            width,
            height,
          ]),
        );
      const command = d.createCommandEncoder(),
        pass = command.beginRenderPass({
          colorAttachments: [
            {
              view: this.gpu.getCurrentTexture().createView(),
              loadOp: "clear",
              clearValue: { r: color[0], g: color[1], b: color[2], a: 1 },
              storeOp: "store",
            },
          ],
        });
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.draw(3);
      pass.end();
      d.queue.submit([command.finish()]);
    } else if (this.gl) {
      const gl = this.gl;
      gl.viewport(0, 0, width, height);
      gl.useProgram(this.glProgram);
      if (this.mode === "texture") {
        if (!source) return;
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source,
        );
      } else {
        gl.uniform4f(
          gl.getUniformLocation(this.glProgram, "base"),
          ...color,
          1,
        );
        gl.uniform4f(
          gl.getUniformLocation(this.glProgram, "extra"),
          this.pattern,
          this.time,
          width,
          height,
        );
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (this.ctx) {
      const c = this.ctx;
      c.imageSmoothingEnabled = false;
      if (this.mode === "texture") {
        if (source) c.drawImage(source, 0, 0, width, height);
      } else {
        c.fillStyle = this.color;
        c.fillRect(0, 0, width, height);
        if (this.pattern === 1) {
          c.fillStyle = "rgba(0,0,0,.2)";
          for (let x = 0; x < width; x += 4) c.fillRect(x, 0, 1, height);
          for (let y = 0; y < height; y += 4) c.fillRect(0, y, width, 1);
        }
        if (this.pattern >= 2) {
          const g = c.createLinearGradient(0, 0, width, height);
          g.addColorStop(0, "rgba(255,255,255,.04)");
          g.addColorStop(1, "rgba(0,0,0,.15)");
          c.fillStyle = g;
          c.fillRect(0, 0, width, height);
        }
      }
    }
    this.frames++;
    this.totalTime += performance.now() - start;
  }
  stats() {
    return {
      backend: this.backend,
      frames: this.frames,
      averageSubmitMs: this.frames ? this.totalTime / this.frames : 0,
      width: this.canvas.width,
      height: this.canvas.height,
      fallbackReason: this.fallbackReason || null,
    };
  }
  dispose() {
    this.disposed = true;
    this.texture?.destroy();
    this.uniform?.destroy();
    this.device?.destroy();
    if (this.gl) {
      this.gl.deleteTexture(this.glTexture);
      this.gl.deleteProgram(this.glProgram);
    }
  }
}

export class DesktopRenderer {
  constructor(canvas, settings, bus) {
    this.surface = new GraphicsSurface(canvas, {
      mode: "desktop",
      preference:
        new URLSearchParams(location.search).get("renderer") || "auto",
    });
    this.settings = settings;
    this.bus = bus;
  }
  async init() {
    await this.surface.init();
    this.resize = () => {
      this.surface.resize(
        innerWidth * devicePixelRatio,
        (innerHeight - 30) * devicePixelRatio,
      );
      this.update();
    };
    window.addEventListener("resize", this.resize);
    this.bus.on("settings:change", () => this.update());
    this.surface.onBackendChange = () =>
      this.bus.emit("renderer:change", this.surface.stats());
    this.resize();
    this.bus.emit("renderer:change", this.surface.stats());
    return this;
  }
  update() {
    const names = { none: 0, pattern: 1, waves: 2 };
    document.querySelector("#desktop").style.backgroundColor =
      this.settings.get("desktopColor");
    this.surface.setDesktop(
      this.settings.get("desktopColor"),
      names[this.settings.get("wallpaper")] || 0,
    );
  }
}
