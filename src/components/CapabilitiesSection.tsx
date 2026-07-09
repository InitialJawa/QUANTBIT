import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Sparkles } from "lucide-react";
import { CapabilityCard } from "./CapabilityCard";
import {
  sectionVariants,
  iconVariants,
  titleVariants,
  underlineVariants,
  bottomTitleVariants,
} from "./motionVariants";

const cards = [
  { label: "01", delay: 0 },
  { label: "02", delay: 0.12 },
  { label: "03", delay: 0.24 },
  { label: "04", delay: 0.36 },
];

export function CapabilitiesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [4, -4]);

  return (
    <motion.section
      ref={sectionRef}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-white py-[120px]"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        <motion.div
          variants={iconVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex items-center justify-center gap-[18px]"
        >
          <div
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}
            className="w-[42px] h-[42px] rounded-xl bg-white flex items-center justify-center flex-shrink-0"
          >
            <Sparkles className="w-5 h-5 text-[#2563EB]" />
          </div>
          <motion.h2
            variants={titleVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="font-ios text-[48px] font-bold leading-[1.15] text-[#111111]"
          >
            The{" "}
            <span className="relative inline-block">
              4 capabilities
              <motion.span
                variants={underlineVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="absolute -bottom-[2px] left-0 w-full h-[2px] bg-[#2563EB] origin-left"
              />
            </span>{" "}
            of Gemini Spark
          </motion.h2>
        </motion.div>

        <div className="mt-[70px] flex flex-row flex-wrap justify-center gap-7">
          {cards.map((card) => (
            <motion.div
              key={card.label}
              style={{ y: parallaxY }}
              className="w-full sm:w-[calc(50%-14px)] lg:w-[290px]"
            >
              <CapabilityCard label={card.label} delay={card.delay} />
            </motion.div>
          ))}
        </div>

        <motion.div
          variants={bottomTitleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-[85px] text-center"
        >
          <h3 className="font-ios text-[42px] font-bold leading-[1.15] text-[#111111]">
            Know exactly{" "}
            <span className="relative inline-block">
              how &amp; when
              <motion.span
                variants={underlineVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="absolute -bottom-[2px] left-0 w-full h-[2px] bg-black origin-left"
              />
            </span>{" "}
            to use it
          </h3>
        </motion.div>
      </div>
    </motion.section>
  );
}
