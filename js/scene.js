/* Zephyr Atelier — a real, dependency-free WebGL sculpture. */
(() => {
  'use strict';

  const canvas = document.getElementById('orbit-canvas');
  if (!canvas) return;
  const container = canvas.closest('.scene-container') || canvas.parentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'chrome';
  let paused = reducedMotion;
  let speed = 1;
  let gl;
  let failed = false;
  let frame = 0;
  let clock = 0;
  let lastTime = 0;
  let statsTime = 0;
  let framesSinceStats = 0;
  let width = 1;
  let height = 1;
  let dragging = false;
  let pointerDown = false;
  let pointerType = '';
  let pointerStartX = 0;
  let pointerStartY = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let userX = 0;
  let userY = 0;
  let hoverX = 0;
  let hoverY = 0;
  let smoothHoverX = 0;
  let smoothHoverY = 0;
  let renderOnce = () => {};

  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const api = {
    setMode(value) {
      if (!['chrome', 'plasma', 'nebula'].includes(value)) return;
      mode = value;
      canvas.dataset.mode = value;
      renderOnce();
    },
    setPaused(value) {
      paused = Boolean(value);
      canvas.dataset.paused = String(paused);
      lastTime = 0;
      renderOnce();
    },
    setSpeed(value) {
      const number = Number(value);
      if (Number.isFinite(number)) {
        speed = Math.max(0, Math.min(3, number));
        lastTime = 0;
        if (speed === 0 && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      }
      renderOnce();
    },
    reset() {
      userX = 0;
      userY = 0;
      hoverX = 0;
      hoverY = 0;
      smoothHoverX = 0;
      smoothHoverY = 0;
      clock = 0;
      renderOnce();
    },
    get mode() { return mode; },
    get paused() { return paused; },
    get webgl() { return Boolean(gl) && !failed; }
  };
  window.OrbitScene = api;
  canvas.dataset.mode = mode;
  canvas.dataset.paused = String(paused);
  canvas.style.touchAction = 'pan-y';

  function unavailable() {
    failed = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    canvas.style.visibility = 'hidden';
    container.classList.add('webgl-unavailable');
    requestAnimationFrame(() => emit('orbit-ready', { webgl: false }));
  }

  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
  } catch (_) {
    unavailable();
    return;
  }
  if (!gl) {
    unavailable();
    return;
  }

  const TAU = Math.PI * 2;
  const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function multiply(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        result[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] +
          a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
      }
    }
    return result;
  }
  function rotation(x, y, z) {
    const sx = Math.sin(x), cx = Math.cos(x);
    const sy = Math.sin(y), cy = Math.cos(y);
    const sz = Math.sin(z), cz = Math.cos(z);
    const rx = new Float32Array([1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1]);
    const ry = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
    const rz = new Float32Array([cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return multiply(multiply(rz, ry), rx);
  }
  function perspective(aspect) {
    const f = 1 / Math.tan(39 * Math.PI / 360);
    const near = 0.1, far = 80;
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0,
      (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
  }
  const normalize = v => {
    const inverse = 1 / (Math.hypot(v[0], v[1], v[2]) || 1);
    return [v[0] * inverse, v[1] * inverse, v[2] * inverse];
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  function center(t) {
    const r = 1.43 + 0.50 * Math.cos(3 * t);
    return [r * Math.cos(2 * t), r * Math.sin(2 * t), 0.64 * Math.sin(3 * t)];
  }

  function shader(type, source) {
    const compiled = gl.createShader(type);
    gl.shaderSource(compiled, source);
    gl.compileShader(compiled);
    if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(compiled);
      gl.deleteShader(compiled);
      throw new Error(message);
    }
    return compiled;
  }
  function program(vertex, fragment) {
    const result = gl.createProgram();
    const vs = shader(gl.VERTEX_SHADER, vertex);
    const fs = shader(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(result, vs);
    gl.attachShader(result, fs);
    gl.linkProgram(result);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
    return result;
  }
  function buffer(data, target = gl.ARRAY_BUFFER) {
    const result = gl.createBuffer();
    gl.bindBuffer(target, result);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return result;
  }
  function attribute(p, name, data, size) {
    const location = gl.getAttribLocation(p, name);
    if (location < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, data);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }
  function disableAttributes() {
    for (let index = 0; index < 3; index++) gl.disableVertexAttribArray(index);
  }

  let sculpture, mesh, orbit, orbitBuffer, stars, starPositions, starSizes, starCount;
  let sculptureUniforms, orbitUniforms, starUniforms;
  try {
    sculpture = program(`
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uModelView;
      uniform mat4 uProjection;
      uniform float uTime;
      uniform float uMode;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vLocal;
      void main() {
        vec3 p = aPosition;
        float motion = sin(p.x * 3.0 + p.y * 4.0 + uTime * 1.4) * 0.014;
        p += aNormal * motion * step(0.5, uMode);
        vec4 view = uModelView * vec4(p, 1.0);
        vPosition = view.xyz;
        vNormal = mat3(uModelView) * aNormal;
        vLocal = aPosition;
        gl_Position = uProjection * view;
      }
    `, `
      precision highp float;
      uniform float uTime;
      uniform float uMode;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vLocal;

      // A dark studio with narrow softboxes, reflected by the real surface normals.
      vec3 environment(vec3 r) {
        vec3 env = mix(vec3(0.006, 0.007, 0.009), vec3(0.037, 0.039, 0.045), smoothstep(-0.55, 0.85, r.y));
        float key = pow(max(dot(r, normalize(vec3(-0.65, 1.05, 0.85))), 0.0), 35.0);
        float soft = pow(max(dot(r, normalize(vec3(0.7, 0.5, -0.55))), 0.0), 12.0);
        float strip = pow(max(dot(r, normalize(vec3(-0.8, -0.25, 0.7))), 0.0), 82.0);
        float blue = pow(max(dot(r, normalize(vec3(-1.0, 0.04, -0.1))), 0.0), 20.0);
        float red = pow(max(dot(r, normalize(vec3(0.96, -0.08, 0.1))), 0.0), 34.0);
        env += vec3(1.66, 1.62, 1.50) * key;
        env += vec3(0.17, 0.18, 0.21) * soft;
        env += vec3(1.18, 1.22, 1.27) * strip;
        env += vec3(0.045, 0.090, 0.52) * blue;
        env += vec3(0.35, 0.028, 0.012) * red;
        // Clean panel edges separate polished metal from a diffuse plastic finish.
        float panel = smoothstep(0.43, 0.46, r.y) * (1.0 - smoothstep(0.58, 0.62, r.y));
        panel *= smoothstep(-0.73, -0.64, r.x) * (1.0 - smoothstep(0.38, 0.47, r.x));
        env += vec3(1.04, 1.02, 0.96) * panel;
        float edge = smoothstep(-0.17, -0.14, r.x) * (1.0 - smoothstep(-0.08, -0.055, r.x));
        edge *= smoothstep(-0.45, -0.25, r.y) * (1.0 - smoothstep(0.68, 0.82, r.y));
        env += vec3(0.57, 0.62, 0.73) * edge;
        return env;
      }
      void main() {
        vec3 n = normalize(vNormal);
        vec3 eye = normalize(-vPosition);
        vec3 r = reflect(-eye, n);
        float facing = max(dot(n, eye), 0.0);
        float fresnel = pow(1.0 - facing, 3.0);
        float diffuse = max(dot(n, normalize(vec3(-0.55, 0.9, 0.7))), 0.0);
        vec3 reflection = environment(r);
        vec3 color;
        if (uMode < 0.5) {
          color = reflection * vec3(0.81, 0.83, 0.87);
          color += vec3(0.006, 0.007, 0.009) * (0.3 + diffuse);
          color += vec3(0.014, 0.021, 0.050) * fresnel;
        } else if (uMode < 1.5) {
          float flow = sin(vLocal.x * 3.4 + vLocal.y * 2.7 + vLocal.z * 3.0 - uTime * 0.55);
          vec3 hot = mix(vec3(0.18, 0.004, 0.003), vec3(0.55, 0.043, 0.011), smoothstep(-0.65, 0.9, flow));
          color = reflection * mix(vec3(0.42, 0.085, 0.045), vec3(1.0, 0.54, 0.28), diffuse) + hot * (0.13 + diffuse * 0.22);
          color += vec3(0.22, 0.008, 0.004) * fresnel * 0.28;
        } else {
          float wave = sin(vLocal.x * 2.4 - vLocal.y * 2.8 + uTime * 0.3);
          vec3 iridescence = mix(vec3(0.018, 0.035, 0.30), vec3(0.11, 0.026, 0.24), 0.5 + 0.5 * wave);
          color = reflection * mix(vec3(0.28, 0.43, 0.94), vec3(0.54, 0.60, 1.0), fresnel);
          color += iridescence * (0.12 + 0.18 * fresnel);
          color += vec3(0.015, 0.12, 0.22) * pow(fresnel, 2.0) * 0.35;
        }
        // Filmic compression retains luminous reflections without flat clipping.
        color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
        color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));
        gl_FragColor = vec4(color, 1.0);
      }
    `);
    sculptureUniforms = Object.fromEntries(['uModelView', 'uProjection', 'uTime', 'uMode'].map(name => [name, gl.getUniformLocation(sculpture, name)]));

    const positions = [], normals = [], indices = [];
    const segments = 360, sides = 32;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments * TAU;
      const p = center(t), before = center(t - 0.001), after = center(t + 0.001);
      const tangent = normalize(after.map((v, j) => v - before[j]));
      const dot = p[0] * tangent[0] + p[1] * tangent[1] + p[2] * tangent[2];
      const normal = normalize(p.map((v, j) => v - tangent[j] * dot));
      const binormal = normalize(cross(tangent, normal));
      const radius = 0.405 + Math.sin(3 * t) * 0.022;
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * TAU;
        const n = normal.map((v, k) => v * Math.cos(a) + binormal[k] * Math.sin(a));
        positions.push(...p.map((v, k) => v + n[k] * radius));
        normals.push(...n);
        if (i < segments && j < sides) {
          const here = i * (sides + 1) + j;
          const next = here + sides + 1;
          indices.push(here, here + 1, next, next, here + 1, next + 1);
        }
      }
    }
    mesh = { positions: buffer(new Float32Array(positions)), normals: buffer(new Float32Array(normals)),
      indices: buffer(new Uint16Array(indices), gl.ELEMENT_ARRAY_BUFFER), count: indices.length };

    orbit = program(`
      attribute vec3 aPosition;
      uniform mat4 uModelView;
      uniform mat4 uProjection;
      varying float vDepth;
      void main() {
        vec4 view = uModelView * vec4(aPosition, 1.0);
        vDepth = aPosition.z;
        gl_Position = uProjection * view;
      }
    `, `
      precision mediump float;
      uniform vec4 uColor;
      void main() { gl_FragColor = uColor; }
    `);
    orbitUniforms = Object.fromEntries(['uModelView', 'uProjection', 'uColor'].map(name => [name, gl.getUniformLocation(orbit, name)]));
    const circle = [];
    for (let i = 0; i < 256; i++) {
      const angle = i / 256 * TAU;
      circle.push(Math.cos(angle) * 2.83, Math.sin(angle) * 2.83, 0);
    }
    orbitBuffer = buffer(new Float32Array(circle));

    stars = program(`
      attribute vec3 aPosition;
      attribute float aSize;
      uniform mat4 uProjection;
      uniform mat4 uModelView;
      uniform float uPixelRatio;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
        gl_PointSize = aSize * uPixelRatio;
        vAlpha = 0.06 + 0.025 * sin(aPosition.x * 12.0 + uTime * 0.35);
      }
    `, `
      precision mediump float;
      varying float vAlpha;
      uniform vec3 uColor;
      void main() {
        float distance = length(gl_PointCoord - 0.5);
        float alpha = (1.0 - smoothstep(0.08, 0.5, distance)) * vAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `);
    starUniforms = Object.fromEntries(['uProjection', 'uModelView', 'uPixelRatio', 'uTime', 'uColor'].map(name => [name, gl.getUniformLocation(stars, name)]));
    const specks = [], sizes = [];
    let seed = 127;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    starCount = 24;
    for (let i = 0; i < starCount; i++) {
      const angle = random() * TAU;
      const radius = 2.4 + random() * 2.7;
      specks.push(Math.cos(angle) * radius, Math.sin(angle) * radius, -1.8 - random() * 3.5);
      sizes.push(0.8 + Math.pow(random(), 3) * 1.2);
    }
    starPositions = buffer(new Float32Array(specks));
    starSizes = buffer(new Float32Array(sizes));
  } catch (error) {
    console.warn('The 3D scene could not be initialized.', error);
    unavailable();
    return;
  }

  let pixelRatio = 1;
  let projection = identity();
  let view = identity();
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, width < 600 ? 1.65 : 1.8);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    projection = perspective(width / height);
    view = identity();
    view[14] = -(width < 600 ? 8.4 : 7.7) / Math.min(1, width / height * 1.06);
    renderOnce();
  }

  function render() {
    if (failed || gl.isContextLost()) return;
    smoothHoverX += (hoverX - smoothHoverX) * 0.055;
    smoothHoverY += (hoverY - smoothHoverY) * 0.055;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    gl.useProgram(stars);
    disableAttributes();
    attribute(stars, 'aPosition', starPositions, 3);
    attribute(stars, 'aSize', starSizes, 1);
    gl.uniformMatrix4fv(starUniforms.uProjection, false, projection);
    gl.uniformMatrix4fv(starUniforms.uModelView, false, multiply(view, rotation(0, 0, clock * 0.011)));
    gl.uniform1f(starUniforms.uPixelRatio, pixelRatio);
    gl.uniform1f(starUniforms.uTime, clock);
    gl.uniform3f(starUniforms.uColor, mode === 'plasma' ? 1 : 0.55, mode === 'plasma' ? 0.45 : 0.66, mode === 'plasma' ? 0.52 : 1);
    gl.drawArrays(gl.POINTS, 0, starCount);

    const rotationX = -0.16 + userX + smoothHoverY * 0.13;
    const rotationY = 0.72 + userY + clock * 0.12 + smoothHoverX * 0.18;
    const rotationZ = -0.22 + Math.sin(clock * 0.13) * 0.08;
    const modelView = multiply(view, rotation(rotationX, rotationY, rotationZ));

    // Draw the opaque sculpture before the orbital lines so the back arcs are hidden.
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.useProgram(sculpture);
    disableAttributes();
    attribute(sculpture, 'aPosition', mesh.positions, 3);
    attribute(sculpture, 'aNormal', mesh.normals, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
    gl.uniformMatrix4fv(sculptureUniforms.uProjection, false, projection);
    gl.uniformMatrix4fv(sculptureUniforms.uModelView, false, modelView);
    gl.uniform1f(sculptureUniforms.uTime, clock);
    gl.uniform1f(sculptureUniforms.uMode, mode === 'chrome' ? 0 : mode === 'plasma' ? 1 : 2);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.useProgram(orbit);
    disableAttributes();
    attribute(orbit, 'aPosition', orbitBuffer, 3);
    gl.uniformMatrix4fv(orbitUniforms.uProjection, false, projection);
    gl.uniformMatrix4fv(orbitUniforms.uModelView, false, multiply(view, rotation(1.05, -0.22, -0.45 + clock * 0.035)));
    gl.uniform4f(orbitUniforms.uColor, 0.47, 0.49, 0.58, 0.055);
    gl.drawArrays(gl.LINE_LOOP, 0, 256);
    gl.uniformMatrix4fv(orbitUniforms.uModelView, false, multiply(view, rotation(-0.55, 0.88, 0.6 - clock * 0.025)));
    gl.uniform4f(orbitUniforms.uColor, 0.54, 0.47, 0.43, 0.035);
    gl.drawArrays(gl.LINE_LOOP, 0, 256);
    gl.depthMask(true);
  }

  renderOnce = () => {
    if (paused || speed === 0 || document.hidden) render();
    else schedule();
  };
  function tick(now) {
    frame = 0;
    if (failed || document.hidden) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    if (!paused && speed > 0) clock += delta * speed;
    render();
    framesSinceStats++;
    if (now - statsTime > 1400) {
      if (statsTime) emit('orbit-stats', { fps: Math.round(framesSinceStats * 1000 / (now - statsTime)) });
      framesSinceStats = 0;
      statsTime = now;
    }
    if (!paused && speed > 0) schedule();
  }
  function schedule() {
    if (!frame && !failed && !document.hidden && !paused && speed > 0) frame = requestAnimationFrame(tick);
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    pointerDown = true;
    pointerType = event.pointerType;
    pointerStartX = lastPointerX = event.clientX;
    pointerStartY = lastPointerY = event.clientY;
    dragging = event.pointerType !== 'touch';
    if (dragging) {
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    }
  });
  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    hoverX = (event.clientX - rect.left) / rect.width * 2 - 1;
    hoverY = (event.clientY - rect.top) / rect.height * 2 - 1;
    if (pointerDown && pointerType === 'touch' && !dragging) {
      const dx = event.clientX - pointerStartX;
      const dy = event.clientY - pointerStartY;
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) pointerDown = false;
      else if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        dragging = true;
        canvas.setPointerCapture(event.pointerId);
      }
    }
    if (pointerDown && dragging) {
      userY += (event.clientX - lastPointerX) * 0.008;
      userX += (event.clientY - lastPointerY) * 0.008;
      userX = Math.max(-1.5, Math.min(1.5, userX));
      if (event.cancelable && event.pointerType !== 'touch') event.preventDefault();
    }
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    renderOnce();
  });
  function release(event) {
    pointerDown = false;
    dragging = false;
    canvas.style.cursor = 'grab';
    if (event && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', () => { pointerDown = false; dragging = false; });
  canvas.addEventListener('pointerleave', () => {
    if (!dragging) { hoverX = 0; hoverY = 0; }
  });
  canvas.addEventListener('dblclick', () => api.reset());
  canvas.style.cursor = 'grab';
  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else renderOnce();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    unavailable();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    // The page can be refreshed after a GPU reset to rebuild immutable buffers.
    container.classList.add('webgl-unavailable');
  });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize, { passive: true });
  resize();
  render();
  container.classList.add('webgl-ready');
  if (!paused) schedule();
  requestAnimationFrame(() => emit('orbit-ready', { webgl: true }));
})();
