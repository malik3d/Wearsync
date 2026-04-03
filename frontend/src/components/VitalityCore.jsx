import React, { useRef, useEffect, useState } from 'react';
import styles from './VitalityCore.module.css';
import { useTranslation } from '../i18n/useTranslation';

export default function VitalityCore({ score = 70, fitnessAge = 35 }) {
  const canvasRef = useRef(null);
  const [userAge, setUserAge] = useState(38);
  const { t } = useTranslation();
  
  useEffect(() => {
    const profileId = localStorage.getItem('profile_id');
    if (profileId) {
      fetch(`/api/profiles/${profileId}`)
        .then(r => r.json())
        .then(profile => {
          if (profile.birth_date) {
            const birth = new Date(profile.birth_date);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            setUserAge(age);
          }
        }).catch(() => {});
    }
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 300;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    
    const cx = size / 2;
    const cy = size / 2;
    const radius = 110;
    
    const diff = userAge - fitnessAge;
    const getColor = (a = 1) => {
      if (diff > 0) return `rgba(74, 222, 128, ${a})`;
      if (diff < 0) return `rgba(239, 68, 68, ${a})`;
      return `rgba(251, 191, 36, ${a})`;
    };
    
    // Partikel-System
    const particles = [];
    const particleCount = 60;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const dist = radius + 15 + Math.random() * 30;
      particles.push({
        angle,
        dist,
        baseX: cx + Math.cos(angle) * dist,
        baseY: cy + Math.sin(angle) * dist,
        size: 1 + Math.random() * 3,
        speed: 0.002 + Math.random() * 0.004,
        offset: Math.random() * Math.PI * 2,
        pulse: 0.5 + Math.random() * 0.5,
      });
    }
    
    // Orbiting dots
    const orbitDots = [];
    for (let i = 0; i < 12; i++) {
      orbitDots.push({
        angle: (Math.PI * 2 * i) / 12,
        speed: 0.003 + Math.random() * 0.002,
        radius: radius + 25,
        size: 3 + Math.random() * 2,
      });
    }
    
    let frame = 0;
    let animationId;
    
    function draw() {
      frame++;
      ctx.clearRect(0, 0, size, size);
      
      // Glow hinter dem Ring
      const gradient = ctx.createRadialGradient(cx, cy, radius - 20, cx, cy, radius + 40);
      gradient.addColorStop(0, getColor(0));
      gradient.addColorStop(0.5, getColor(0.1));
      gradient.addColorStop(1, getColor(0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Hintergrund-Ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 10;
      ctx.stroke();
      
      // Haupt-Ring mit Gradient
      const ringGrad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
      ringGrad.addColorStop(0, getColor(0.8));
      ringGrad.addColorStop(0.5, getColor(1));
      ringGrad.addColorStop(1, getColor(0.8));
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(score, 100) / 100));
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.shadowColor = getColor(0.8);
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Partikel zeichnen
      particles.forEach((p, i) => {
        const time = frame * p.speed + p.offset;
        const wobble = Math.sin(time * 2) * 8;
        const pulse = 0.3 + Math.abs(Math.sin(time * p.pulse)) * 0.7;
        
        const x = cx + Math.cos(p.angle + time * 0.5) * (p.dist + wobble);
        const y = cy + Math.sin(p.angle + time * 0.5) * (p.dist + wobble);
        
        ctx.beginPath();
        ctx.arc(x, y, p.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = getColor(pulse * 0.6);
        ctx.fill();
      });
      
      // Orbit-Punkte
      orbitDots.forEach(dot => {
        dot.angle += dot.speed;
        const x = cx + Math.cos(dot.angle) * dot.radius;
        const y = cy + Math.sin(dot.angle) * dot.radius;
        
        ctx.beginPath();
        ctx.arc(x, y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = getColor(0.7);
        ctx.shadowColor = getColor(0.5);
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      
      // Innerer Glow-Ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 25, 0, Math.PI * 2);
      ctx.strokeStyle = getColor(0.1);
      ctx.lineWidth = 1;
      ctx.stroke();
      
      animationId = requestAnimationFrame(draw);
    }
    
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [score, fitnessAge, userAge]);
  
  const diff = userAge - fitnessAge;
  const color = diff > 0 ? '#4ade80' : diff < 0 ? '#ef4444' : '#fbbf24';
  
  let diffText;
  if (diff > 0) {
    diffText = `${diff} ${diff === 1 ? t('yearsYounger') : t('yearsYoungerPlural')}`;
  } else if (diff < 0) {
    diffText = `${Math.abs(diff)} ${Math.abs(diff) === 1 ? t('yearsOlder') : t('yearsOlderPlural')}`;
  } else {
    diffText = t('justRight');
  }
  
  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.content}>
        <span className={styles.age} style={{ color }}>{fitnessAge}</span>
        <span className={styles.label}>{t('vitalityAge')}</span>
        <span className={styles.diff} style={{ color }}>{diffText}</span>
      </div>
    </div>
  );
}
