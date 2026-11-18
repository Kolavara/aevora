import React from 'react';
import { motion, useMotionValue, useSpring, type HTMLMotionProps } from 'motion/react';

interface MagneticButtonProps extends HTMLMotionProps<'button'> {
  strength?: number;
  children: React.ReactNode;
}

/**
 * Tactile magnetic snap button: attracts subtly toward the pointer inside its
 * bounding box and snaps cleanly back on exit with spring detent physics.
 */
export const MagneticButton: React.FC<MagneticButtonProps> = ({
  strength = 8,
  children,
  onPointerMove,
  onPointerLeave,
  style,
  ...props
}) => {
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  const springX = useSpring(offsetX, { stiffness: 340, damping: 22, mass: 0.45 });
  const springY = useSpring(offsetY, { stiffness: 340, damping: 22, mass: 0.45 });

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && !props.disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      offsetX.set(nx * strength * 2);
      offsetY.set(ny * strength * 2);
    }
    onPointerMove?.(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    offsetX.set(0);
    offsetY.set(0);
    onPointerLeave?.(e);
  };

  return (
    <motion.button
      {...props}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileTap={{ scale: 0.965 }}
      style={{
        x: springX,
        y: springY,
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
};
