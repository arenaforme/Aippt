import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { forwardRef, ReactNode } from "react";
import { fadeInUp, staggerContainer, staggerItem, smoothTransition } from "@/lib/animations";

// FadeIn
interface FadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ ...smoothTransition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeIn.displayName = "FadeIn";

// StaggerList
export const StaggerList = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerList.displayName = "StaggerList";

// StaggerItem
export const StaggerItem = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ children, ...props }, ref) => (
    <motion.div ref={ref} variants={staggerItem} {...props}>
      {children}
    </motion.div>
  )
);
StaggerItem.displayName = "StaggerItem";

export { AnimatePresence, motion };
