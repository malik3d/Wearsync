import React, { useRef, useEffect, useState } from 'react';
import styles from './VitalityCore.module.css';

export default function VitalityCore({ score, fitnessAge, level }) {
  const canvasRef = useRef(null);
  const [userAge, setUserAge] = useState(null);
  
  useEffect(() => {
    // Lade Profil für echtes Alter
    const profileId = localStorage.getItem('profile_id');
    if (profileId) {
      fetch(`/api/profiles/${profileId}`)
        .then(r => r.json())
        .then(profile => {
          const birth = new Date(profile.birth_date);
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
          setUserAge(age);
        })
        .catch(() => setUserAge(30));
    }
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = 300;
    const height = 300;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100;
    
    const getColor = (opacity = 1) => {
      if (score >= 75) return `rgba(74, 222, 128, ${opacity})`;
      if (score >= 50) return `rgba(251, 191, 36, ${opacity})`;
      return `rgba(239, 68, 68, ${opacity})`;
    };
    
    const particles = [];
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * 0.7 + Math.random() * radius * 0.4;
      particles.push({ angle, radius: r, size: Math.random() * 2 + 1, speed: (Math.random() - 0.5) * 0.003, opacity: Math.random() * 0.4 + 0.2, pulse: Math.random() * Math.PI * 2 });
    }
    
    let animationId;
    let time = 0;
    
    function animate() {
      ctx.clearRect(0, 0, width, height);
      time += 0.016;
      
      const outerGlow = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.3);
      outerGlow.addColorStop(0, getColor(0.08));
      outerGlow.addColorStop(0.7, getColor(0.03));
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = getColor(0.15);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      const progress = score / 100;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * progress);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = getColor(0.8);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = getColor(1);
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      particles.forEach(p => {
        p.angle += p.speed;
        p.pulse += 0.02;
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * p.radius;
        const opacity = p.opacity * (0.5 + Math.sin(p.pulse) * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = getColor(opacity);
        ctx.fill();
      });
      
      const pulseIntensity = 0.08 + Math.sin(time * 1.5) * 0.03;
      const innerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.8);
      innerGlow.addColorStop(0, getColor(pulseIntensity));
      innerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      animationId = requestAnimationFrame(animate);
    }
    
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [score]);
  
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444';
  const diff = userAge ? userAge - fitnessAge : 0;
  
  let diffText = '';
  if (diff > 0) diffText = diff === 1 ? '1 Jahr jünger' : `${diff} Jahre jünger`;
  else if (diff < 0) { const a = Math.abs(diff); diffText = a === 1 ? '1 Jahr älter' : `${a} Jahre älter`; }
  
  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.content}>
        <div className={styles.age} style={{ color }}>{fitnessAge}</div>
        <div className={styles.label}>VITALITY AGE</div>
        {diffText && <div className={styles.diff} style={{ color }}>{diffText}</div>}
      </div>
    </div>
  );
}
