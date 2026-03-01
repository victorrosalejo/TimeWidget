
// Clase principal del renderer usando la API WebGPU.
// mandamos datos en bruto a la tarjeta gráfica y ejecutamos

export default class WebGPURenderer {
  constructor() {
    this.device = null;
    this.context = null;
    this.pipeline = null;
    this.vertexBuffer = null;
    this.styleBuffer = null;
    this.uniformBuffer = null;
    this.bindGroup = null;
    this.bindGroupNeedsUpdate = true;
    this.points = null;
    this.lineIndices = null;
    this.presentationFormat = navigator.gpu ? navigator.gpu.getPreferredCanvasFormat() : 'bgra8unorm';
    
    this.thickLinePipeline = null;
    this.medianVertexBuffer = null;
    this.medianStyleBuffer = null;
    this.medianBindGroup = null;
    this.medianVertexCount = 0;
    this.medianCount = 0;
    
    this.haloBindGroup = null;
    this.haloStyleBuffer = null;
    this.jointPipeline = null;
    this.medianJointBuffer = null;

    this.haloJointPipeline = null;
    this.haloThickPipeline = null;
    this.stencilTexture = null;
    this.stencilTextureView = null;

    this.msaaTexture = null;
    this.msaaTextureView = null;
    this.sampleCount = 4;
  }

  // Inicialización asíncrona: primero pedimos el "adapter" (la GPU física)
  // y luego el "device" (la conexión lógica con ella). Si falla devolvemos false
  // para que el código que llame a esto pueda hacer fallback al canvas 2D.
  init(canvas) {
    if (!navigator.gpu) {
      console.error("WebGPU not supported on this browser.");
      return Promise.resolve(false);
    }

    return navigator.gpu.requestAdapter().then(adapter => {
        if (!adapter) {
            console.error("No WebGPU adapter found.");
            return Promise.resolve(false);
        }
        return adapter.requestDevice().then(device => {
            this.device = device;
            this.context = canvas.getContext("webgpu");

            this.context.configure({
                device: this.device,
                format: this.presentationFormat,
                alphaMode: "opaque",
            });

            // Crear la textura MSAA al inicio con el tamaño actual del canvas
            this._createMSAATexture(canvas.width, canvas.height);

            return this.initPipeline().then(() => true);
        });
    });
  }

  // Aquí se compilan los shaders WGSL y se configuran los pipelines de renderizado.

  initPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: "Line Shader with Dash Support",
      code: `
        struct Uniforms {
          domainX: vec2<f32>,
          domainY: vec2<f32>,
          screenSize: vec2<f32>,
          renderPass: f32, // 0: all, 1: non-selected, 2: selected
          unused_padding: f32,
        }

        struct LineStyle {
            color: vec4<f32>,      // 16 bytes (offset 0)
            params: vec4<f32>,     // 16 bytes (offset 16)
            // params.x = dashOn (pixels)
            // params.y = dashOff (pixels)  
            // params.z = lineWidth
            // params.w = unused
        }

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;
        @group(0) @binding(1) var<storage, read> lineStyles: array<LineStyle>;

        struct VertexInput {
            @location(0) position: vec2<f32>,
            @location(1) lineIndex: f32,
        }

        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) color: vec4<f32>,
            @location(1) worldPos: vec2<f32>,
            @location(2) lineLength: f32,
            @location(3) dashPattern: vec2<f32>, // (dashOn, dashOff)
            @location(4) selectionFlag: f32,
        }

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            
            // Normalize X to [0, 1] based on domain
            let xNorm = (input.position.x - uniforms.domainX.x) / (uniforms.domainX.y - uniforms.domainX.x);
            // Normalize Y to [0, 1] based on domain
            let yNorm = (input.position.y - uniforms.domainY.x) / (uniforms.domainY.y - uniforms.domainY.x);

            // Convert to Clip Space [-1, 1]
            let xClip = -1.0 + 2.0 * xNorm;
            let yClip = -1.0 + 2.0 * yNorm; 
            
            output.position = vec4<f32>(xClip, yClip, 0.0, 1.0);
            output.worldPos = input.position;

            let style = lineStyles[u32(input.lineIndex)];
            output.color = style.color;
            output.dashPattern = vec2<f32>(style.params.x, style.params.y);
            output.selectionFlag = style.params.w;
            
            // Calculate line length in world space for dash pattern
            // This is approximate - actual length calculated per-fragment
            output.lineLength = 0.0;
            
            return output;
        }

        @fragment
        fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
            // Filter by pass
            if (uniforms.renderPass > 0.5 && uniforms.renderPass < 1.5 && input.selectionFlag > 0.0) {
                discard; // Pass 1: only non-selected
            }
            if (uniforms.renderPass > 1.5 && abs(input.selectionFlag - (uniforms.renderPass - 1.0)) > 0.1) {
                discard; // Pass 2+: only specific group
            }

            // If dash pattern is defined (dashOn > 0)
            if (input.dashPattern.x > 0.0) {
                let dashOn = input.dashPattern.x;
                let dashOff = input.dashPattern.y;
                let dashPeriod = dashOn + dashOff;
                
                // Use total screen pixels (x + y) as a simple gradient for dashing
                // This ensures the pattern changes even if length(pos) changes slowly
                let dist = input.position.x + input.position.y;
                
                // Calculate position in dash cycle
                let dashCycle = fract(dist / dashPeriod);
                let dashRatio = dashOn / dashPeriod;
                
                // Discard fragments in "off" section
                if (dashCycle > dashRatio) {
                    discard;
                }
            }
            
            return input.color;
        }

        struct ThickVertexInput {
            @location(0) position: vec2<f32>,
            @location(1) otherPosition: vec2<f32>,
            @location(2) side: f32,
            @location(3) lineIndex: f32,
            @location(4) t: f32,
        }

        struct ThickVertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) color: vec4<f32>,
            @location(1) dashPattern: vec2<f32>,
            @location(2) uv: vec2<f32>,
        }

        @vertex
        fn vs_thick(input: ThickVertexInput) -> ThickVertexOutput {
            var output: ThickVertexOutput;
            
            let p1Norm = vec2<f32>(
                (input.position.x - uniforms.domainX.x) / (uniforms.domainX.y - uniforms.domainX.x),
                (input.position.y - uniforms.domainY.x) / (uniforms.domainY.y - uniforms.domainY.x)
            );
            let p2Norm = vec2<f32>(
                (input.otherPosition.x - uniforms.domainX.x) / (uniforms.domainX.y - uniforms.domainX.x),
                (input.otherPosition.y - uniforms.domainY.x) / (uniforms.domainY.y - uniforms.domainY.x)
            );

            let p1Screen = p1Norm * uniforms.screenSize;
            let p2Screen = p2Norm * uniforms.screenSize;
            
            let style = lineStyles[u32(input.lineIndex)];
            let width = style.params.z;
            
            var dir = p2Screen - p1Screen;
            if (length(dir) < 0.0001) {
                dir = vec2<f32>(1.0, 0.0);
            }
            let segLen = length(dir);
            let unitDir = normalize(dir);
            let unitNormal = vec2<f32>(-unitDir.y, unitDir.x);
            
            let offsetPos = p1Screen + unitNormal * input.side * (width / 2.0);
            let pClip = (offsetPos / uniforms.screenSize) * 2.0 - 1.0;
            
            output.position = vec4<f32>(pClip.x, pClip.y, 0.0, 1.0);
            output.color = style.color;
            output.dashPattern = vec2<f32>(style.params.x, style.params.y);
            output.uv = vec2<f32>(input.side, input.t * segLen);
            
            return output;
        }

        @fragment
        fn fs_thick(input: ThickVertexOutput) -> @location(0) vec4<f32> {
            if (input.dashPattern.x > 0.0) {
                let dashPeriod = input.dashPattern.x + input.dashPattern.y;
                let segDist = input.uv.y;
                if (fract(segDist / dashPeriod) > (input.dashPattern.x / dashPeriod)) {
                    discard;
                }
            }
            // Suavizado de borde sutil en los extremos laterales del quad
            let edgeFade = 1.0 - smoothstep(0.88, 1.0, abs(input.uv.x));
            var col = input.color;
            col.a = col.a * edgeFade;
            return col;
        }

        struct JointVertexInput {
            @location(0) position: vec2<f32>,
            @location(1) offset: vec2<f32>,
            @location(2) lineIndex: f32,
        }

        struct JointVertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) color: vec4<f32>,
            @location(1) uv: vec2<f32>,
        }

        @vertex
        fn vs_joint(input: JointVertexInput) -> JointVertexOutput {
            var output: JointVertexOutput;
            
            let pNorm = vec2<f32>(
                (input.position.x - uniforms.domainX.x) / (uniforms.domainX.y - uniforms.domainX.x),
                (input.position.y - uniforms.domainY.x) / (uniforms.domainY.y - uniforms.domainY.x)
            );
            
            let style = lineStyles[u32(input.lineIndex)];
            let width = style.params.z; 
            
            let pScreen = pNorm * uniforms.screenSize;
            let offsetPos = pScreen + input.offset * (width / 2.0);
            
            let pClip = (offsetPos / uniforms.screenSize) * 2.0 - 1.0;
            
            output.position = vec4<f32>(pClip.x, pClip.y, 0.0, 1.0);
            output.color = style.color;
            output.uv = input.offset;
            
            return output;
        }

        @fragment
        fn fs_joint(input: JointVertexOutput) -> @location(0) vec4<f32> {
            // Draw as a circle
            if (length(input.uv) > 1.0) {
                discard;
            }
            return input.color;
        }
      `,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    // Requerido porque el render pass ahora declara un adjunto de profundidad/stencil.
    const neutralDepthStencil = {
      format: 'depth24plus-stencil8',
      depthWriteEnabled: false,
      depthCompare: 'always',
      stencilFront: { compare: 'always', failOp: 'keep', depthFailOp: 'keep', passOp: 'keep' },
      stencilBack:  { compare: 'always', failOp: 'keep', depthFailOp: 'keep', passOp: 'keep' },
    };

    this.jointPipeline = this.device.createRenderPipeline({
      label: "Joint Render Pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_joint",
        buffers: [
          {
            arrayStride: 20,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },
              { shaderLocation: 1, offset: 8, format: "float32x2" },
              { shaderLocation: 2, offset: 16, format: "float32" },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_joint",
        targets: [
          {
            format: this.presentationFormat,
            blend: {
              color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            },
          },
        ],
      },
      depthStencil: neutralDepthStencil,
      primitive: { topology: "triangle-list" },
      multisample: { count: this.sampleCount },
    });

    const haloStencilState = {
      format: 'depth24plus-stencil8',
      depthWriteEnabled: false,
      depthCompare: 'always',
      stencilFront: { compare: 'not-equal', failOp: 'keep', depthFailOp: 'keep', passOp: 'replace' },
      stencilBack:  { compare: 'not-equal', failOp: 'keep', depthFailOp: 'keep', passOp: 'replace' },
    };

    // Pipeline de unión de halo
    this.haloJointPipeline = this.device.createRenderPipeline({
      label: "Halo Joint Pipeline (stencil)",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_joint",
        buffers: [{
          arrayStride: 20,
          attributes: [
            { shaderLocation: 0, offset: 0,  format: "float32x2" },
            { shaderLocation: 1, offset: 8,  format: "float32x2" },
            { shaderLocation: 2, offset: 16, format: "float32" },
          ],
        }],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_joint",
        targets: [{
          format: this.presentationFormat,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one",       dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      depthStencil: haloStencilState,
      primitive: { topology: "triangle-list" },
      multisample: { count: this.sampleCount },
    });

    // Pipeline de línea gruesa para halo 
    this.haloThickPipeline = this.device.createRenderPipeline({
      label: "Halo Thick Line Pipeline (stencil)",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_thick",
        buffers: [{
          arrayStride: 28,
          attributes: [
            { shaderLocation: 0, offset: 0,  format: "float32x2" },
            { shaderLocation: 1, offset: 8,  format: "float32x2" },
            { shaderLocation: 2, offset: 16, format: "float32" },
            { shaderLocation: 3, offset: 20, format: "float32" },
            { shaderLocation: 4, offset: 24, format: "float32" },
          ],
        }],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_thick",
        targets: [{
          format: this.presentationFormat,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one",       dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        }],
      },
      depthStencil: haloStencilState,
      primitive: { topology: "triangle-list" },
      multisample: { count: this.sampleCount },
    });

    this.thickLinePipeline = this.device.createRenderPipeline({
      label: "Thick Line Render Pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_thick",
        buffers: [
          {
            arrayStride: 28,
            attributes: [
              { shaderLocation: 0, offset: 0,  format: "float32x2" },
              { shaderLocation: 1, offset: 8,  format: "float32x2" },
              { shaderLocation: 2, offset: 16, format: "float32"   },
              { shaderLocation: 3, offset: 20, format: "float32"   },
              { shaderLocation: 4, offset: 24, format: "float32"   }, // t (0=start, 1=end)
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_thick",
        targets: [
          {
            format: this.presentationFormat,
            blend: {
              color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            },
          },
        ],
      },
      depthStencil: neutralDepthStencil,
      primitive: { topology: "triangle-list" },
      multisample: { count: this.sampleCount },
    });

    this.pipeline = this.device.createRenderPipeline({
      label: "Line Render Pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 12,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },
              { shaderLocation: 1, offset: 8, format: "float32" },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: this.presentationFormat,
            blend: {
              color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            },
          },
        ],
      },
      depthStencil: neutralDepthStencil,
      primitive: { topology: "line-list" },
      multisample: { count: this.sampleCount },
    });

    this.uniformBuffers = [];
    for (let i = 0; i < 11; i++) {
        this.uniformBuffers[i] = this.device.createBuffer({
            size: 32, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }
    this.uniformBuffer = this.uniformBuffers[0]; 
    this.bindGroups = [];
    
    return Promise.resolve();
  }

  uploadData(data) {
    if (!this.device) return;

    let pointsAccumulator = [];
    
    this.idToIndex = new Map();

    let totalPoints = 0;
    
    data.forEach((entry, index) => {
        this.idToIndex.set(entry.id, index);
        const pts = entry.points;
        for (let i = 0; i < pts.length - 1; i++) {
            pointsAccumulator.push(pts[i][0], pts[i][1], index);
            pointsAccumulator.push(pts[i+1][0], pts[i+1][1], index);
        }
    });

    if (pointsAccumulator.length === 0) return;

    const vertexData = new Float32Array(pointsAccumulator);
    
    this.vertexBuffer = this.device.createBuffer({
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(vertexData);
    this.vertexBuffer.unmap();
    
    this.vertexCount = vertexData.length / 3;
    this.lineCount = data.length;

    // Style buffer: almacena color + parámetros de cada línea como storage buffer.
  
    const styleBufferSize = this.lineCount * 32; 
    this.styleBuffer = this.device.createBuffer({
        size: styleBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    this.bindGroupNeedsUpdate = true;
  }

  uploadMedians(medians, medianStyles, haloEnabled = true, haloConfig = {}) {
    if (!this.device || !medians || medians.length === 0) {
      this.medianVertexCount = 0;
      this.medianCount = 0;
      this.medianJointCount = 0;
      this.haloBindGroup = null;
      return;
    }

    let pointsAccumulator = [];
    let jointsAccumulator = [];
    
    medians.forEach((median, index) => {
      const points = median[1];
      for (let i = 0; i < points.length; i++) {
        const P = points[i];
        
        // Quad for joint (circle): 2 triangles
        jointsAccumulator.push(P[0], P[1], -1.0, -1.0, index);
        jointsAccumulator.push(P[0], P[1],  1.0, -1.0, index);
        jointsAccumulator.push(P[0], P[1], -1.0,  1.0, index);
        
        jointsAccumulator.push(P[0], P[1],  1.0, -1.0, index);
        jointsAccumulator.push(P[0], P[1], -1.0,  1.0, index);
        jointsAccumulator.push(P[0], P[1],  1.0,  1.0, index);

        if (i < points.length - 1) {
          const A = points[i];
          const B = points[i+1];
          pointsAccumulator.push(A[0], A[1], B[0], B[1], -1.0, index, 0.0); 
          pointsAccumulator.push(A[0], A[1], B[0], B[1],  1.0, index, 0.0); 
          pointsAccumulator.push(B[0], B[1], A[0], A[1], -1.0, index, 1.0); 
          
          pointsAccumulator.push(A[0], A[1], B[0], B[1],  1.0, index, 0.0); // A, side=+1, t=0
          pointsAccumulator.push(B[0], B[1], A[0], A[1], -1.0, index, 1.0); // B, side=-1, t=1
          pointsAccumulator.push(B[0], B[1], A[0], A[1],  1.0, index, 1.0); // B, side=+1, t=1
        }
      }
    });

    if (pointsAccumulator.length === 0) {
      this.medianVertexCount = 0;
      this.medianCount = 0;
      this.medianJointCount = 0;
      return;
    }

    // Segment Buffer
    const vertexData = new Float32Array(pointsAccumulator);
    this.medianVertexBuffer = this.device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.medianVertexBuffer.getMappedRange()).set(vertexData);
    this.medianVertexBuffer.unmap();
    this.medianVertexCount = vertexData.length / 7; // 7 floats por vértice ahora (antes 6)

    // Joint Buffer
    const jointData = new Float32Array(jointsAccumulator);
    this.medianJointBuffer = this.device.createBuffer({
      size: jointData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.medianJointBuffer.getMappedRange()).set(jointData);
    this.medianJointBuffer.unmap();
    this.medianJointCount = jointData.length / 5;  

    this.medianCount = medians.length;

    
    const styleBufferSize = this.medianCount * 32;
    this.medianStyleBuffer = this.device.createBuffer({
      size: styleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.haloStyleBuffer = this.device.createBuffer({
      size: styleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Upload Styles
    const mainStyleData = new Float32Array(this.medianCount * 8);
    const haloStyleData = new Float32Array(this.medianCount * 8);

    medians.forEach((median, index) => {
      const groupId = median[0];
      const style = medianStyles.get(groupId) || {
        color: [0, 0, 0, 1],
        dashOn: 7,
        dashOff: 7,
        lineWidth: 2
      };
      
      const width = style.lineWidth || 2;
      
      // Main Line Style
      mainStyleData[index*8 + 0] = style.color[0];
      mainStyleData[index*8 + 1] = style.color[1];
      mainStyleData[index*8 + 2] = style.color[2];
      mainStyleData[index*8 + 3] = style.color[3];
      mainStyleData[index*8 + 4] = style.dashOn || 0;
      mainStyleData[index*8 + 5] = style.dashOff || 0;
      mainStyleData[index*8 + 6] = width;
      mainStyleData[index*8 + 7] = 0;

      const haloColorStr = (haloConfig && haloConfig.color) ? haloConfig.color : null;
      let haloR = 1.0, haloG = 1.0, haloB = 1.0; // default: white
      if (haloColorStr) {
        const tmp = document.createElement('canvas').getContext('2d');
        tmp.fillStyle = haloColorStr;
        const filled = tmp.fillStyle; // normalised hex
        const r = parseInt(filled.slice(1, 3), 16) / 255;
        const g = parseInt(filled.slice(3, 5), 16) / 255;
        const b = parseInt(filled.slice(5, 7), 16) / 255;
        if (!isNaN(r)) { haloR = r; haloG = g; haloB = b; }
      }
      const haloAlpha = (haloConfig && haloConfig.alpha != null) ? haloConfig.alpha : 0.8;
      const haloExtra = (haloConfig && haloConfig.size  != null) ? haloConfig.size  : 6.0;

      haloStyleData[index*8 + 0] = haloR;
      haloStyleData[index*8 + 1] = haloG;
      haloStyleData[index*8 + 2] = haloB;
      haloStyleData[index*8 + 3] = haloAlpha;
      haloStyleData[index*8 + 4] = 0;   // no dash
      haloStyleData[index*8 + 5] = 0;
      haloStyleData[index*8 + 6] = width + haloExtra;
      haloStyleData[index*8 + 7] = 0;
    });

    this.device.queue.writeBuffer(this.medianStyleBuffer, 0, mainStyleData);
    this.device.queue.writeBuffer(this.haloStyleBuffer, 0, haloStyleData);
    
    this.medianBindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.medianStyleBuffer } },
      ]
    });

    if (haloEnabled) {
      this.haloBindGroup = this.device.createBindGroup({
        layout: this.bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: { buffer: this.haloStyleBuffer } },
        ]
      });
    } else {
      this.haloBindGroup = null;
    }


  }

  updateStyles(stylesMap, defaultColor = [0.5, 0.5, 0.5, 0.1]) {
      if (!this.device || !this.styleBuffer) return;

      if (stylesMap instanceof Float32Array) {
          // Fast path: raw data provided
          this.device.queue.writeBuffer(this.styleBuffer, 0, stylesMap);
          return;
      }
      
      if (!this.idToIndex) return;

      const styleData = new Float32Array(this.lineCount * 8); 

      for (let i=0; i < this.lineCount; i++) {
          styleData[i*8 + 0] = defaultColor[0];
          styleData[i*8 + 1] = defaultColor[1];
          styleData[i*8 + 2] = defaultColor[2];
          styleData[i*8 + 3] = defaultColor[3];
          styleData[i*8 + 4] = 0;
      }

      stylesMap.forEach((style, id) => {
          if (this.idToIndex.has(id)) {
              const idx = this.idToIndex.get(id);
              if (style.color) {
                  styleData[idx*8 + 0] = style.color[0];
                  styleData[idx*8 + 1] = style.color[1];
                  styleData[idx*8 + 2] = style.color[2];
                  styleData[idx*8 + 3] = style.color[3];
              }
          }
      });

      this.device.queue.writeBuffer(this.styleBuffer, 0, styleData);
  }
  
  updateUniforms(domains, width, height, margins = {top:0, left:0, right:0, bottom:0}, renderPass = 0) {
      if (!this.device || !this.uniformBuffers) return;
      
      this.currentWidth = width;
      this.currentHeight = height;
      this.margins = margins;

      // Update all buffers in the pool with the same basic info but different passes
      for (let i = 0; i < this.uniformBuffers.length; i++) {
          const passValue = Float32Array.from([
              domains.x[0], domains.x[1],
              domains.y[0], domains.y[1],
              width, height,
              i, 0 // i is the pass index (0=all, 1=non-sel, 2=group1, etc.)
          ]);
          this.device.queue.writeBuffer(this.uniformBuffers[i], 0, passValue);
      }
  }

  // Crea la textura de anti-aliasing MSAA y la textura de stencil para el halo
  _createMSAATexture(width, height) {
    if (!this.device) return;
    if (this.msaaTexture) this.msaaTexture.destroy();
    this.msaaTexture = this.device.createTexture({
      size: [width, height],
      sampleCount: this.sampleCount,
      format: this.presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.msaaTextureView = this.msaaTexture.createView();

    if (this.stencilTexture) this.stencilTexture.destroy();
    this.stencilTexture = this.device.createTexture({
      size: [width, height],
      sampleCount: this.sampleCount,
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.stencilTextureView = this.stencilTexture.createView();

    this._msaaWidth = width;
    this._msaaHeight = height;
  }

  _ensureMSAATexture(width, height) {
    if (!this.msaaTexture || this._msaaWidth !== width || this._msaaHeight !== height) {
      this._createMSAATexture(width, height);
    }
  }

  draw(hasSelection = false, groupCount = 0) {
      if (!this.device || !this.pipeline || !this.vertexBuffer || !this.styleBuffer) return;
      
      // Update bind groups for all active passes
      const maxPasses = hasSelection ? (groupCount + 2) : 1;
      for (let i = 0; i < Math.min(maxPasses, 11); i++) {
        this.bindGroups[i] = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffers[i] } },
                { binding: 1, resource: { buffer: this.styleBuffer } },
            ]
        });
      }

      if (this.bindGroupNeedsUpdate) {
          this.bindGroup = this.device.createBindGroup({
              layout: this.pipeline.getBindGroupLayout(0),
              entries: [
                  { binding: 0, resource: { buffer: this.uniformBuffer } },
                  { binding: 1, resource: { buffer: this.styleBuffer } },
              ]
          });
          this.bindGroupNeedsUpdate = false;
      }

      const commandEncoder = this.device.createCommandEncoder();
      const canvasTexture = this.context.getCurrentTexture();
      const canvasTextureView = canvasTexture.createView();

      this._ensureMSAATexture(canvasTexture.width, canvasTexture.height);

      const renderPassDescriptor = {
          colorAttachments: [
              {
                  view: this.msaaTextureView,
                  resolveTarget: canvasTextureView,
                  clearValue: { r: 1, g: 1, b: 1, a: 0 },
                  loadOp: "clear",
                  storeOp: "discard",
              },
          ],
          depthStencilAttachment: this.stencilTextureView ? {
              view: this.stencilTextureView,
              depthLoadOp: 'clear',  depthStoreOp: 'discard', depthClearValue: 1.0,
              stencilLoadOp: 'clear', stencilStoreOp: 'discard', stencilClearValue: 0,
          } : undefined,
      };

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      
      if (this.margins && this.currentWidth && this.currentHeight) {
          const canvasWidth = this.context.getCurrentTexture().width;
          const canvasHeight = this.context.getCurrentTexture().height;
          
          const dpr = window.devicePixelRatio || 1;
          const x = Math.floor(this.margins.left * dpr);
          const y = Math.floor(this.margins.top * dpr);
          const w = Math.floor(Math.min(canvasWidth - x, (this.currentWidth - this.margins.left - this.margins.right) * dpr));
          const h = Math.floor(Math.min(canvasHeight - y, (this.currentHeight - this.margins.top - this.margins.bottom) * dpr));
          
          passEncoder.setScissorRect(x, y, w, h);
      }

      passEncoder.setPipeline(this.pipeline);
      passEncoder.setBindGroup(0, this.bindGroup);
      passEncoder.setVertexBuffer(0, this.vertexBuffer);
      
      // WebGPU tiene un límite en el número de vértices por draw call.
      //  lotes de 100k vértices para no superarlo.
      const MAX_VERTICES_PER_BATCH = 100000;
      const batchCount = Math.ceil(this.vertexCount / MAX_VERTICES_PER_BATCH);
      
      if (hasSelection) {
          passEncoder.setBindGroup(0, this.bindGroups[1]);
          for (let i = 0; i < batchCount; i++) {
              const firstVertex = i * MAX_VERTICES_PER_BATCH;
              const vertexCount = Math.min(MAX_VERTICES_PER_BATCH, this.vertexCount - firstVertex);
              passEncoder.draw(vertexCount, 1, firstVertex, 0);
          }
          
          for (let g = 0; g < Math.min(groupCount, 9); g++) {
              passEncoder.setBindGroup(0, this.bindGroups[g+2]); 
              for (let i = 0; i < batchCount; i++) {
                  const firstVertex = i * MAX_VERTICES_PER_BATCH;
                  const vertexCount = Math.min(MAX_VERTICES_PER_BATCH, this.vertexCount - firstVertex);
                  passEncoder.draw(vertexCount, 1, firstVertex, 0);
              }
          }
      } else {
          passEncoder.setBindGroup(0, this.bindGroups[0]);
          for (let i = 0; i < batchCount; i++) {
              const firstVertex = i * MAX_VERTICES_PER_BATCH;
              const vertexCount = Math.min(MAX_VERTICES_PER_BATCH, this.vertexCount - firstVertex);
              passEncoder.draw(vertexCount, 1, firstVertex, 0);
          }
      }
      
      if (this.medianVertexBuffer && this.medianBindGroup && this.medianVertexCount > 0 && this.thickLinePipeline && this.jointPipeline) {
        
        if (this.haloBindGroup && this.haloJointPipeline && this.haloThickPipeline) {
          passEncoder.setBindGroup(0, this.haloBindGroup);
          passEncoder.setStencilReference(1);

          // 1) Uniones primero → tapas redondeadas en cada vértice, marca los píxeles cubiertos (stencil→1)
          passEncoder.setPipeline(this.haloJointPipeline);
          passEncoder.setVertexBuffer(0, this.medianJointBuffer);
          passEncoder.draw(this.medianJointCount, 1, 0, 0);

          // 2) Segmentos → rellena entre uniones, omite los píxeles ya pintados por las uniones
          passEncoder.setPipeline(this.haloThickPipeline);
          passEncoder.setVertexBuffer(0, this.medianVertexBuffer);
          passEncoder.draw(this.medianVertexCount, 1, 0, 0);
        }
        
        passEncoder.setBindGroup(0, this.medianBindGroup);
        
        passEncoder.setPipeline(this.jointPipeline);
          passEncoder.setVertexBuffer(0, this.medianJointBuffer);
          passEncoder.draw(this.medianJointCount, 1, 0, 0);
        
        passEncoder.setPipeline(this.thickLinePipeline);
        passEncoder.setVertexBuffer(0, this.medianVertexBuffer);
        passEncoder.draw(this.medianVertexCount, 1, 0, 0);
      }

      
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);
  }
}
