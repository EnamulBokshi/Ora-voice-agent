'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export type LivingOrbState =
  | 'idle'
  | 'connecting'
  | 'active'
  | 'listening'
  | 'speaking'
  | 'ora-speaking'
  | 'thinking'
  | 'standby'
  | 'error';

export interface LivingOrbProps {
  voiceState?: LivingOrbState;
  energyLevel?: number; // 0 to 100
  size?: number; // width & height in px, default: 64
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
  showAura?: boolean;
  showConnectingRings?: boolean;
  showFloorReflection?: boolean;
  ariaLabel?: string;
  title?: string;
}

/**
 * ─── Procedural Fluid Wave Mesh Engine (Canvas) ──────────────────────────────
 * Renders an organic 3-layer glowing fluid wave mesh with reactive audio dynamics.
 */
export function LivingOrbCanvas({
  voiceState = 'idle',
  energyLevel = 0,
  width = 140,
  height = 140,
  className,
}: {
  voiceState?: LivingOrbState;
  energyLevel?: number;
  width?: number;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    const cx = width / 2;
    const cy = height / 2;

    const render = () => {
      timeRef.current += 0.035;
      const t = timeRef.current;

      ctx.clearRect(0, 0, width, height);

      // Base radius calculation (proportional to canvas size)
      const baseRadius = (width / 2) * 0.57;
      const isIdle = voiceState === 'idle' || voiceState === 'standby';
      const isConnecting = voiceState === 'connecting';
      const isThinking = voiceState === 'thinking';
      const isSpeaking = voiceState === 'speaking' || voiceState === 'ora-speaking';
      const isError = voiceState === 'error';
      const isActive = voiceState === 'active' || voiceState === 'listening' || isSpeaking || isThinking;

      // Audio reactive amplitude
      const amp = isSpeaking
        ? 6 + (energyLevel / 100) * 14
        : isThinking
        ? 5
        : isActive
        ? 3 + (energyLevel / 100) * 8
        : isConnecting
        ? 4
        : isError
        ? 2
        : 1.5;

      const speedMult = isSpeaking ? 1.8 : isThinking ? 1.6 : isConnecting ? 1.5 : 1.0;

      // ── Draw Outer Fluid Glow ──
      const outerGlow = ctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, baseRadius * 1.5);
      if (isError) {
        outerGlow.addColorStop(0, 'rgba(239, 68, 68, 0.45)'); // Red Error
        outerGlow.addColorStop(0.6, 'rgba(185, 28, 28, 0.20)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isSpeaking) {
        outerGlow.addColorStop(0, 'rgba(200, 240, 49, 0.45)'); // Electric Lime Center
        outerGlow.addColorStop(0.5, 'rgba(0, 229, 255, 0.25)'); // Cyan Edge
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isThinking) {
        outerGlow.addColorStop(0, 'rgba(180, 120, 255, 0.45)'); // Purple / Violet Thinking
        outerGlow.addColorStop(0.6, 'rgba(0, 210, 255, 0.30)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isActive) {
        outerGlow.addColorStop(0, 'rgba(0, 210, 255, 0.40)'); // Cyan Active
        outerGlow.addColorStop(0.6, 'rgba(100, 150, 255, 0.15)'); // Blue
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isConnecting) {
        outerGlow.addColorStop(0, 'rgba(150, 100, 255, 0.35)'); // Purple Connecting
        outerGlow.addColorStop(0.7, 'rgba(0, 220, 255, 0.15)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        outerGlow.addColorStop(0, 'rgba(0, 200, 255, 0.20)'); // Subtle Cyan Idle
        outerGlow.addColorStop(0.7, 'rgba(50, 100, 200, 0.08)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw Organic Multilayer Wave Mesh (Layer 1: Deep Plasma) ──
      ctx.save();
      ctx.beginPath();
      const points = 36;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const n1 = Math.sin(theta * 3 + t * speedMult * 1.2);
        const n2 = Math.cos(theta * 2 - t * speedMult * 0.9);
        const r = baseRadius + (n1 + n2) * (amp * 0.7);
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const innerGrad1 = ctx.createLinearGradient(0, 0, width, height);
      if (isError) {
        innerGrad1.addColorStop(0, '#EF4444');
        innerGrad1.addColorStop(0.6, '#B91C1C');
        innerGrad1.addColorStop(1, '#450A0A');
      } else if (isSpeaking) {
        innerGrad1.addColorStop(0, '#C8F031'); // Lime
        innerGrad1.addColorStop(0.5, '#00E5FF'); // Cyan
        innerGrad1.addColorStop(1, '#0055FF'); // Deep Blue
      } else if (isActive) {
        innerGrad1.addColorStop(0, '#00F5D4'); // Mint/Cyan
        innerGrad1.addColorStop(0.6, '#00BBF9'); // Electric Blue
        innerGrad1.addColorStop(1, '#3A0CA3'); // Deep Violet
      } else {
        innerGrad1.addColorStop(0, '#00B4D8');
        innerGrad1.addColorStop(0.7, '#0077B6');
        innerGrad1.addColorStop(1, '#03045E');
      }
      ctx.fillStyle = innerGrad1;
      ctx.fill();
      ctx.restore();

      // ── Layer 2: Fast Shifting Surface Ripple ──
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const n3 = Math.sin(theta * 4 - t * speedMult * 1.5);
        const n4 = Math.cos(theta * 3 + t * speedMult * 1.1);
        const r = baseRadius * 0.82 + (n3 + n4) * (amp * 0.5);
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const innerGrad2 = ctx.createRadialGradient(cx, cy, 5, cx, cy, baseRadius * 0.9);
      if (isError) {
        innerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        innerGrad2.addColorStop(0.4, 'rgba(239, 68, 68, 0.85)');
        innerGrad2.addColorStop(1, 'rgba(185, 28, 28, 0.1)');
      } else if (isSpeaking) {
        innerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); // Pure Bright Center
        innerGrad2.addColorStop(0.4, 'rgba(200, 240, 49, 0.85)');
        innerGrad2.addColorStop(1, 'rgba(0, 229, 255, 0.1)');
      } else {
        innerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        innerGrad2.addColorStop(0.4, 'rgba(0, 245, 212, 0.7)');
        innerGrad2.addColorStop(1, 'rgba(0, 119, 182, 0.1)');
      }
      ctx.fillStyle = innerGrad2;
      ctx.fill();
      ctx.restore();

      // ── Layer 3: Central Glowing Energy Nucleus ──
      ctx.save();
      const nucleusRadius = 8 + (energyLevel / 100) * 10;
      const nucleusGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusRadius);
      nucleusGrad.addColorStop(0, '#FFFFFF');
      nucleusGrad.addColorStop(
        0.5,
        isError
          ? 'rgba(239, 68, 68, 0.8)'
          : isSpeaking
          ? 'rgba(200, 240, 49, 0.8)'
          : 'rgba(0, 255, 255, 0.8)',
      );
      nucleusGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = nucleusGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [voiceState, energyLevel, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn('lp-orb-canvas', className)}
      aria-hidden="true"
    />
  );
}

/**
 * ─── LivingOrb Component ─────────────────────────────────────────────────────
 * The full Living Crystal Glass Orb containing procedural fluid canvas, specular
 * highlights, inner refraction ring, quantum connecting rings, and floor glow.
 */
export function LivingOrb({
  voiceState = 'idle',
  energyLevel = 0,
  size = 64,
  onClick,
  className,
  interactive = true,
  showAura = true,
  showConnectingRings = true,
  showFloorReflection = true,
  ariaLabel,
  title,
}: LivingOrbProps) {
  const isConnecting = voiceState === 'connecting';
  const isSpeaking = voiceState === 'speaking' || voiceState === 'ora-speaking';
  const isThinking = voiceState === 'thinking';
  const isActive = voiceState === 'active' || voiceState === 'listening' || isSpeaking || isThinking;
  const isError = voiceState === 'error';

  const defaultAriaLabel = isActive
    ? 'Click to end voice conversation'
    : 'Click to start voice conversation with ORA';

  const auraScale = 1 + (energyLevel / 100) * 0.35;
  const auraOpacity = 0.45 + (energyLevel / 100) * 0.55;

  const content = (
    <>
      {/* Siri/Gemini Fluid Outer Glow & Reactive Ring */}
      {showAura && isActive && (
        <div
          className={cn(
            'lp-orb-reactive-aura',
            isSpeaking ? 'speaking' : 'listening',
          )}
          style={{
            transform: `scale(${auraScale})`,
            opacity: auraOpacity,
          }}
        />
      )}

      {/* Ambient floor reflection */}
      {showFloorReflection && <div className="lp-orb-floor-reflection" />}

      {/* Outer crystal glass sphere */}
      <div
        className={cn(
          'lp-orb-glass-sphere lp-orb-btn',
          isActive && 'active',
          isSpeaking && 'speaking-active',
          isConnecting && 'connecting-active',
          !interactive && 'cursor-default',
        )}
      >
        {/* Dynamic Living Fluid Wave Canvas */}
        <LivingOrbCanvas voiceState={voiceState} energyLevel={energyLevel} width={140} height={140} />

        {/* Inner rim lighting reflection */}
        <div className="lp-orb-inner-rim-light" />

        {/* Top glass glossy highlight */}
        <div className="lp-orb-top-highlight" />

        {/* Futuristic quantum charging rings on connecting state */}
        {showConnectingRings && isConnecting && (
          <div className="lp-orb-connecting-rings" aria-hidden="true">
            <div className="lp-orb-quantum-ring ring-1" />
            <div className="lp-orb-quantum-ring ring-2" />
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        'lp-orb-container',
        isActive && 'active',
        isSpeaking && 'speaking',
        isConnecting && 'connecting',
        className,
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full h-full p-0 border-0 bg-transparent cursor-pointer rounded-full relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 flex items-center justify-center"
          aria-label={ariaLabel || defaultAriaLabel}
          title={title}
        >
          {content}
        </button>
      ) : (
        content
      )}
    </div>
  );
}
