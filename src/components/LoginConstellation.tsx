"use client"

import { useEffect, useRef, memo } from "react"
import { useThemeStore } from "@/store/useThemeStore"

export const LoginConstellation = memo(function LoginConstellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; baseAlpha: number }[]>([]);
  const shootingStarsRef = useRef<{ x: number; y: number; len: number; speed: number; opacity: number; angle: number; width: number; dead: boolean }[]>([]);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const PARTICLE_COUNT = 80;
    const CONNECTION_DISTANCE = 140;
    const MOUSE_DISTANCE = 250;

    const spawnShootingStar = () => {
      const isDarkMode = useThemeStore.getState().isDark;
      if (!isDarkMode) return; // Only shooting stars in dark mode
      
      shootingStarsRef.current.push({
        x: Math.random() * canvas.width * 0.5,
        y: Math.random() * canvas.height * 0.5,
        len: Math.random() * 80 + 40,
        speed: Math.random() * 8 + 4,
        opacity: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
        width: Math.random() * 1.5 + 0.5,
        dead: false,
      });
    };

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 1.8 + 0.8,
        baseAlpha: Math.random() * 0.5 + 0.3
      }));
    };

    const starSpawner = setInterval(() => {
      if (Math.random() > 0.5 && shootingStarsRef.current.length < 2) {
        spawnShootingStar();
      }
    }, 4000);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDarkMode = useThemeStore.getState().isDark;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      
      // Draw grid in dark mode only
      if (isDarkMode) {
        const gridSpacing = 50;
        ctx.beginPath();
        ctx.lineWidth = 1;
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 500);
        grad.addColorStop(0, `rgba(59, 130, 246, 0.04)`);
        grad.addColorStop(1, `rgba(59, 130, 246, 0)`);
        ctx.strokeStyle = grad;
        
        for (let x = 0; x < canvas.width; x += gridSpacing) {
          ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y < canvas.height; y += gridSpacing) {
          ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      }

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const dxMouse = p.x - mouse.x;
        const dyMouse = p.y - mouse.y;
        const distMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;
        const maxDistSq = MOUSE_DISTANCE * MOUSE_DISTANCE;
        
        // Push particles away slightly
        if (distMouseSq < 10000) {
          const dist = Math.sqrt(distMouseSq);
          const force = (100 - dist) / 1000;
          p.x += (dxMouse / dist) * force;
          p.y += (dyMouse / dist) * force;
        }

        const distanceRatio = distMouseSq < maxDistSq ? 1 - Math.sqrt(distMouseSq) / MOUSE_DISTANCE : 0;
        const alpha = isDarkMode ? p.baseAlpha + distanceRatio * 0.5 : p.baseAlpha * 0.6;
        
        ctx.fillStyle = isDarkMode 
          ? `rgba(59, 130, 246, ${alpha})` 
          : `rgba(148, 163, 184, ${alpha})`;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (distanceRatio * 1.5), 0, Math.PI * 2);
        ctx.fill();

        if (distMouseSq < maxDistSq) {
          ctx.strokeStyle = isDarkMode
            ? `rgba(59, 130, 246, ${0.6 * distanceRatio})`
            : `rgba(37, 99, 235, ${0.3 * distanceRatio})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        // Connect particles
        for (let j = i + 1; j < Math.min(i + 8, particles.length); j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;
          const maxConnDistSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

          if (distSq < maxConnDistSq) {
            const d = Math.sqrt(distSq);
            // Lines near mouse are brighter
            const midX = (p.x + p2.x) / 2;
            const midY = (p.y + p2.y) / 2;
            const mdx = midX - mouse.x;
            const mdy = midY - mouse.y;
            const lineMouseDist = Math.sqrt(mdx*mdx + mdy*mdy);
            
            const mouseBoost = lineMouseDist < MOUSE_DISTANCE ? 1 - lineMouseDist/MOUSE_DISTANCE : 0;
            const baseOpacity = isDarkMode ? 0.25 : 0.15;
            const finalOpacity = (baseOpacity + mouseBoost * 0.3) * (1 - d / CONNECTION_DISTANCE);

            ctx.strokeStyle = isDarkMode 
              ? `rgba(59, 130, 246, ${finalOpacity})` 
              : `rgba(148, 163, 184, ${finalOpacity})`;
            ctx.lineWidth = isDarkMode ? 0.8 + mouseBoost : 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      
      // Animate Shooting Stars
      if (isDarkMode) {
        shootingStarsRef.current = shootingStarsRef.current.filter(s => !s.dead);
        shootingStarsRef.current.forEach(s => {
          s.x += Math.cos(s.angle) * s.speed;
          s.y += Math.sin(s.angle) * s.speed;
          s.opacity -= 0.015;
          
          if (s.opacity <= 0 || s.x > canvas.width || s.y > canvas.height) {
            s.dead = true;
            return;
          }
          
          const grad = ctx.createLinearGradient(
            s.x, s.y,
            s.x - Math.cos(s.angle) * s.len,
            s.y - Math.sin(s.angle) * s.len
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
          grad.addColorStop(0.2, `rgba(59, 130, 246, ${s.opacity * 0.8})`);
          grad.addColorStop(1, `rgba(59, 130, 246, 0)`);
          
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len);
          ctx.strokeStyle = grad;
          ctx.lineWidth = s.width;
          ctx.stroke();
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    init();
    animate();

    window.addEventListener("resize", init);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      clearInterval(starSpawner);
      window.removeEventListener("resize", init);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />;
});
