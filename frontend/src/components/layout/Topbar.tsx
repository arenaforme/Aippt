import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/shared";

interface TopbarProps {
  /** 左侧自定义内容（Logo 右侧） */
  leftContent?: ReactNode;
  /** 中间自定义内容 */
  centerContent?: ReactNode;
  /** 右侧自定义内容（UserMenu 左侧） */
  rightContent?: ReactNode;
  /** 是否显示 Logo */
  showLogo?: boolean;
  /** 是否显示 UserMenu */
  showUserMenu?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function Topbar({
  leftContent,
  centerContent,
  rightContent,
  showLogo = true,
  showUserMenu = true,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm",
        className
      )}
    >
      <div className="flex h-full items-center justify-between px-4">
        {/* 左侧区域 */}
        <div className="flex items-center gap-3">
          {showLogo && (
            <Link to="/" className="flex items-center gap-2">
              <motion.span
                className="text-2xl"
                whileHover={{ rotate: 10 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                🍌
              </motion.span>
              <span className="text-lg font-semibold">AI演示眼</span>
            </Link>
          )}
          {leftContent}
        </div>

        {/* 中间区域 */}
        {centerContent && (
          <div className="flex-1 px-4">{centerContent}</div>
        )}

        {/* 右侧区域 */}
        <div className="flex items-center gap-2">
          {rightContent}
          {showUserMenu && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
