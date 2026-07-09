import { motion } from "motion/react";
import { Check } from "lucide-react";
import {
  cardVariants,
  badgeVariants,
  cardContentTitleVariants,
  cardContentDescVariants,
  cardContentChecklistVariants,
} from "./motionVariants";

interface CapabilityCardProps {
  label: string;
  delay: number;
}

export function CapabilityCard({ label, delay }: CapabilityCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      custom={delay}
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,.06)" }}
      className="group relative w-full h-[215px] bg-white rounded-[20px] border border-[#F3F4F6] p-[26px] flex flex-col cursor-default transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
    >
      <motion.div
        variants={badgeVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{ boxShadow: "0 10px 20px rgba(37,99,235,.30)" }}
        className="w-[50px] h-[50px] rounded-[14px] bg-[#2563EB] flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ease-out"
      >
        <span className="text-white font-bold text-base">{label}</span>
      </motion.div>

      <div className="mt-[30px] flex flex-col gap-2">
        <motion.div
          variants={cardContentTitleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="w-[170px] h-[10px] rounded-full bg-gray-200"
        />
        <motion.div
          variants={cardContentDescVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="w-[120px] h-[8px] rounded-full bg-gray-100"
        />
      </div>

      <motion.div
        variants={cardContentChecklistVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mt-auto flex items-center gap-[6px]"
      >
        <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
        <span className="text-[14px] text-[#6B7280] font-ios">Real-world use case</span>
      </motion.div>
    </motion.div>
  );
}
