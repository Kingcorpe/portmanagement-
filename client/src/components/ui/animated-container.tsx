import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Container animation variants for staggered children
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

// Item animation variants
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};

// Fade in variant for simpler animations
const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3
    }
  }
};

// Scale up variant for interactive elements
const scaleUpVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: "stagger" | "fade" | "scale";
  delay?: number;
}

/**
 * Container component that animates its children with stagger effect
 */
export function AnimatedContainer({ 
  children, 
  className, 
  variant = "stagger",
  delay = 0 
}: AnimatedContainerProps) {
  const variants = variant === "fade" ? fadeInVariants : 
                   variant === "scale" ? scaleUpVariants : 
                   containerVariants;
  
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className={className}
      style={{ willChange: "opacity, transform" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Individual item component to be used inside AnimatedContainer
 */
export function AnimatedItem({ children, className, onClick }: AnimatedItemProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={className}
      onClick={onClick}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  whileHover?: boolean;
  whileTap?: boolean;
}

/**
 * Card component with hover and tap animations
 */
export function AnimatedCard({ 
  children, 
  className, 
  onClick,
  whileHover = true,
  whileTap = true
}: AnimatedCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn("cursor-pointer", className)}
      onClick={onClick}
      whileHover={whileHover ? { 
        scale: 1.01,
        transition: { duration: 0.15 }
      } : undefined}
      whileTap={whileTap ? { scale: 0.99 } : undefined}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * List container with staggered animation
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-4", className)}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

/**
 * Grid container with staggered animation
 */
export function AnimatedGrid({ children, className, columns = 3 }: AnimatedGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("grid gap-4", gridCols[columns], className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Button press animation component
 */
export function AnimatedButton({ 
  children, 
  className,
  onClick,
  disabled
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      className={className}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}

// Export variants for custom use
export { containerVariants, itemVariants, fadeInVariants, scaleUpVariants };





