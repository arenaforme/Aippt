import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  children: ReactNode;
  className?: string;
  /** 是否显示侧边栏 */
  showSidebar?: boolean;
  /** 是否显示顶栏 */
  showTopbar?: boolean;
  /** Topbar 左侧自定义内容 */
  topbarLeftContent?: ReactNode;
  /** Topbar 中间自定义内容 */
  topbarCenterContent?: ReactNode;
  /** Topbar 右侧自定义内容 */
  topbarRightContent?: ReactNode;
  /** 是否显示背景装饰 */
  showBackgroundDecoration?: boolean;
}

export function AppShell({
  children,
  className,
  showSidebar = false,
  showTopbar = true,
  topbarLeftContent,
  topbarCenterContent,
  topbarRightContent,
  showBackgroundDecoration = true,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* 背景装饰 */}
      {showBackgroundDecoration && (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        </div>
      )}

      {/* 顶部导航 */}
      {showTopbar && (
        <Topbar
          leftContent={topbarLeftContent}
          centerContent={topbarCenterContent}
          rightContent={topbarRightContent}
        />
      )}

      <div className="flex">
        {/* 侧边栏 */}
        {showSidebar && <Sidebar />}

        {/* 主内容区 */}
        <main
          className={cn(
            "flex-1 min-h-[calc(100vh-3.5rem)]",
            showSidebar ? "ml-0" : "",
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
