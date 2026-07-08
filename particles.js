/**
 * LEGACY-X Particle System
 * Animated floating particles for the hero section
 */

(function () {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, animId;

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  }

  function randomBetween(a, b) { return Math.random() * (b - a) + a; }

  function createParticle() {
    return {
      x:    randomBetween(0, W),
      y:    randomBetween(0, H),
      vx:   randomBetween(-0.25, 0.25),
      vy:   randomBetween(-0.4, -0.1),
      r:    randomBetween(1, 3),
      alpha: randomBetween(0.15, 0.55),
      hue:  randomBetween(220, 280), // blue–purple range
    };
  }

  function init() {
    resize();
    const count = Math.min(Math.floor((W * H) / 12000), 90);
    particles   = Array.from({ length: count }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha})`;
      ctx.fill();
    });

    // Draw faint connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(167,139,250,${(1 - dist / 110) * 0.12})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
        }
      }
    }
  }

  function update() {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10)  p.y = H + 5;
      if (p.x < -10)  p.x = W + 5;
      if (p.x > W + 10) p.x = -5;
    });
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    init();
    loop();
  });

  init();
  loop();
})();
