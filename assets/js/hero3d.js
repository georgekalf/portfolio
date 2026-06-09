if (!document.documentElement.classList.contains('reduce')) {
  try {
    const THREE = await import('three');
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 6;

      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.7, 1),
        new THREE.MeshStandardMaterial({ color: 0x2A3A22, metalness: 0.55, roughness: 0.25, flatShading: true })
      );
      scene.add(mesh);

      const wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.73, 1),
        new THREE.MeshBasicMaterial({ color: 0xAFC22E, wireframe: true, transparent: true, opacity: 0.12 })
      );
      scene.add(wire);

      scene.add(new THREE.AmbientLight(0xffffff, 0.25));
      const limeLight = new THREE.PointLight(0xAFC22E, 60, 30);
      const tealLight = new THREE.PointLight(0x4E9AAC, 60, 30);
      scene.add(limeLight, tealLight);

      const pCount = 600;
      const pGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount * 3; i++) pos[i] = (Math.random() - 0.5) * 22;
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xAFC22E, size: 0.035, transparent: true, opacity: 0.5 }));
      scene.add(particles);

      let tx = 0, ty = 0;
      window.addEventListener('mousemove', (e) => {
        tx = (e.clientX / window.innerWidth - 0.5) * 0.6;
        ty = (e.clientY / window.innerHeight - 0.5) * 0.6;
      });

      function resize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);

      let running = true, raf = null;
      const clock = new THREE.Clock();
      function loop() {
        if (!running) { if (raf) cancelAnimationFrame(raf); raf = null; return; }
        raf = requestAnimationFrame(loop);
        const t = clock.getElapsedTime();
        mesh.rotation.x = t * 0.12; mesh.rotation.y = t * 0.18;
        wire.rotation.copy(mesh.rotation);
        particles.rotation.y = t * 0.02;
        limeLight.position.set(Math.sin(t * 0.6) * 5, Math.cos(t * 0.4) * 4, 3);
        tealLight.position.set(Math.cos(t * 0.5) * 5, Math.sin(t * 0.5) * 4, 2);
        camera.position.x += (tx * 2 - camera.position.x) * 0.05;
        camera.position.y += (-ty * 2 - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      }

      const hero = document.querySelector('.hero');
      if (hero && 'IntersectionObserver' in window) {
        new IntersectionObserver((en) => { running = en[0].isIntersecting; if (running && !raf) loop(); }).observe(hero);
      }
      document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !raf) loop(); });

      document.body.classList.add('webgl-on');
      loop();
    }
  } catch (err) {
    /* WebGL unavailable — the CSS orb remains as the hero visual */
  }
}