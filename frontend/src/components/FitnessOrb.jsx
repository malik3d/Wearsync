import React, { useRef, useEffect } from 'react';
import styles from './FitnessOrb.module.css';

export default function FitnessOrb({ score, fitnessAge, level }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = 280;
    const height = canvas.height = 280;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 110;
    
    // Partikel
    const particles = [];
    const particleCount = 150;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * 0.3 + Math.random() * radius * 0.7;
      particles.push({
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        baseX: centerX + Math.cos(angle) * r,
        baseY: centerY + Math.sin(angle) * r,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }
    
    // Farbe basierend auf Score
    const getColor = (opacity) => {
      if (score >= 75) return `rgba(74, 222, 128, ${opacity})`; // Grün
      if (score >= 50) return `rgba(251, 191, 36, ${opacity})`; // Gelb
      return `rgba(239, 68, 68, ${opacity})`; // Rot
    };
    
    let animationId;
    let time = 0;
    
    function animate() {
      ctx.clearRect(0, 0, width, height);
      time += 0.016;
      
      // Äußerer Glow
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.2);
      gradient.addColorStop(0, getColor(0.15));
      gradient.addColorStop(0.5, getColor(0.08));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Organischer Ring (wobble effect)
      ctx.beginPath();
      for (let i = 0; i <= 360; i++) {
        const angle = (i * Math.PI) / 180;
        const wobble = Math.sin(angle * 6 + time * 2) * 5 + Math.sin(angle * 3 + time * 1.5) * 3;
        const r = radius + wobble;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = getColor(0.6);
      ctx.lineWidth = 3;
      ctx.shadowColor = getColor(1);
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Innerer Glow
      const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.9);
      innerGradient.addColorStop(0, getColor(0.1));
      innerGradient.addColorStop(0.7, getColor(0.05));
      innerGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      
      // Partikel zeichnen
      particles.forEach(p => {
        // Bewegung
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += p.pulseSpeed;
        
        // Zurück zum Zentrum ziehen
        const dx = p.baseX - p.x;
        const dy = p.baseY - p.y;
        p.x += dx * 0.01;
        p.y += dy * 0.01;
        
        // Prüfen ob im Kreis
        const distFromCenter = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
        if (distFromCenter > radius * 0.95) {
          p.x = p.baseX;
          p.y = p.baseY;
        }
        
        // Zeichnen
        const pulseSize = p.size * (1 + Math.sin(p.pulse) * 0.3);
        const pulseOpacity = p.opacity * (0.7 + Math.sin(p.pulse) * 0.3);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = getColor(pulseOpacity);
        ctx.shadowColor = getColor(1);
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      
      // Floating große Partikel
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time * 0.3;
        const r = radius * 0.6 + Math.sin(time * 2 + i) * 20;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        const size = 4 + Math.sin(time * 3 + i * 2) * 2;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = getColor(0.8);
        ctx.shadowColor = getColor(1);
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      animationId = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () => cancelAnimationFrame(animationId);
  }, [score]);
  
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444';
  
  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.content}>
        <div className={styles.age} style={{ color }}>{fitnessAge}</div>
        <div className={styles.label}>FITNESS AGE</div>
        <div className={styles.level} style={{ color }}>{level}</div>
      </div>
    </div>
  );
}
