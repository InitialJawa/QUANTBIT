import type { Variants } from "motion/react";

export const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.7 },
  },
};

export const iconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7 },
  },
};

export const titleVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.9,
      delay: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const underlineVariants: Variants = {
  hidden: { scaleX: 0, transformOrigin: "left" },
  visible: {
    scaleX: 1,
    transition: {
      duration: 0.6,
      delay: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96, filter: "blur(12px)" },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      delay,
    },
  }),
};

export const badgeVariants: Variants = {
  hidden: { scale: 0.75 },
  visible: {
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
      mass: 0.8,
    },
  },
};

export const cardContentTitleVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.08, duration: 0.4 },
  },
};

export const cardContentDescVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.16, duration: 0.4 },
  },
};

export const cardContentChecklistVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.24, duration: 0.4 },
  },
};

export const bottomTitleVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.9,
      delay: 1.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};
