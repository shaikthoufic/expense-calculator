const canvas = document.querySelector("#moneyScene");

async function startThreeScene() {
  const THREE = await import("https://unpkg.com/three@0.165.0/build/three.module.js");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const group = new THREE.Group();
  const pieces = [];

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.set(0, 0, 8);
  scene.add(group);

  const light = new THREE.DirectionalLight(0xffffff, 2.4);
  light.position.set(2, 4, 6);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));

  function roundedRectangleShape(width, height, radius) {
    const x = -width / 2;
    const y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
  }

  function makeNote(index) {
    const w = 1.55;
    const h = 0.72;
    const shape = roundedRectangleShape(w, h, 0.08);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012 });
    const material = new THREE.MeshStandardMaterial({
      color: index % 2 ? 0x5bc777 : 0x72d995,
      metalness: 0.1,
      roughness: 0.42,
      emissive: 0x104a2f,
      emissiveIntensity: 0.05,
    });
    const note = new THREE.Mesh(geometry, material);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.012, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 0.45, roughness: 0.28 })
    );
    ring.rotation.x = Math.PI / 2;
    note.add(ring);
    return note;
  }

  function makeCoin(index) {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.08, 44),
      new THREE.MeshStandardMaterial({
        color: index % 2 ? 0xf2c94c : 0xd99516,
        metalness: 0.78,
        roughness: 0.22,
      })
    );
    coin.rotation.x = Math.PI / 2;
    return coin;
  }

  for (let index = 0; index < 24; index += 1) {
    const mesh = index % 3 === 0 ? makeCoin(index) : makeNote(index);
    const piece = {
      mesh,
      speed: 0.35 + Math.random() * 0.55,
      swing: 0.35 + Math.random() * 0.8,
      baseX: -6 + Math.random() * 12,
      offset: Math.random() * Math.PI * 2,
    };
    mesh.position.set(piece.baseX, -4 + Math.random() * 9, -3 - Math.random() * 8);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.scale.setScalar(0.75 + Math.random() * 0.75);
    group.add(mesh);
    pieces.push(piece);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate(time = 0) {
    const t = time * 0.001;
    pieces.forEach((piece, index) => {
      piece.mesh.position.y += piece.speed * 0.012;
      piece.mesh.position.x = piece.baseX + Math.sin(t + piece.offset) * piece.swing;
      piece.mesh.rotation.x += 0.006 + index * 0.00008;
      piece.mesh.rotation.y += 0.009;
      piece.mesh.rotation.z += 0.004;

      if (piece.mesh.position.y > 5.2) {
        piece.mesh.position.y = -5.2;
        piece.baseX = -6 + Math.random() * 12;
      }
    });

    group.rotation.z = Math.sin(t * 0.25) * 0.03;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  animate();
}

function startFallbackScene() {
  const context = canvas.getContext("2d");
  const pieces = Array.from({ length: 36 }, (_, index) => ({
    kind: index % 3 === 0 ? "coin" : "note",
    x: Math.random(),
    y: Math.random(),
    z: 0.4 + Math.random() * 1.4,
    spin: Math.random() * Math.PI,
    speed: 0.002 + Math.random() * 0.004,
  }));

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  function draw() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces.forEach((piece) => {
      piece.y -= piece.speed;
      piece.spin += 0.025;
      if (piece.y < -0.1) {
        piece.y = 1.1;
        piece.x = Math.random();
      }

      const x = piece.x * window.innerWidth;
      const y = piece.y * window.innerHeight;
      context.save();
      context.translate(x, y);
      context.rotate(piece.spin);
      context.scale(piece.z, piece.z);

      if (piece.kind === "coin") {
        context.fillStyle = "#e6ad20";
        context.beginPath();
        context.ellipse(0, 0, 17, 17 * Math.abs(Math.cos(piece.spin)) + 5, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "#fff0a8";
        context.stroke();
      } else {
        context.fillStyle = "#75d88d";
        context.strokeStyle = "#0d6b42";
        context.lineWidth = 2;
        context.roundRect(-38, -18, 76, 36, 6);
        context.fill();
        context.stroke();
        context.fillStyle = "#0d6b42";
        context.font = "700 17px system-ui";
        context.textAlign = "center";
        context.fillText("₹", 0, 6);
      }
      context.restore();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
}

startThreeScene().catch(startFallbackScene);
