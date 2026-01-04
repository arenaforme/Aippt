import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { History, Layout, FolderOpen, Settings, Plus, ImagePlus, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MaterialGeneratorModal } from "@/components/shared";

const navItems = [
  { path: "/history", label: "历史记录", icon: History },
  { path: "/templates", label: "模板库", icon: Layout },
  { path: "/materials", label: "素材管理", icon: FolderOpen },
  { path: "/tools/pdf-to-pptx", label: "工具", icon: Wrench },
];

const bottomItems = [
  { path: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  // 快速创建：跳转到首页（创建页面）
  const handleQuickCreate = () => {
    navigate('/app');
  };

  return (
    <aside className={cn(
      "sticky top-14 h-[calc(100vh-3.5rem)] w-60 shrink-0",
      "border-r border-border/50",
      "bg-background/50 backdrop-blur-sm"
    )}>
      <div className="flex flex-col h-full">
        {/* 快速创建按钮 */}
        <div className="p-3 space-y-2">
          <Button
            onClick={handleQuickCreate}
            className={cn(
              "w-full gap-2 h-10",
              "bg-primary hover:bg-primary/90",
              "shadow-sm hover:shadow-md",
              "transition-all duration-200"
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">快速创建</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsMaterialModalOpen(true)}
            className={cn(
              "w-full gap-2 h-10",
              "border-border/50 hover:border-primary/50",
              "hover:bg-primary/5",
              "transition-all duration-200"
            )}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="font-medium">素材生成</span>
          </Button>
        </div>

        {/* 主导航 */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg",
                    "text-sm font-medium",
                    "transition-colors duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {/* 选中指示条 */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-primary" : ""
                  )} />
                  <span>{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* 分割线 */}
        <div className="px-4">
          <div className="h-px bg-border/50" />
        </div>

        {/* 底部导航 */}
        <div className="p-2">
          {bottomItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg",
                    "text-sm font-medium",
                    "transition-colors duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full" />
                  )}
                  <Icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-primary" : ""
                  )} />
                  <span>{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 素材生成模态框 */}
      <MaterialGeneratorModal
        projectId={null}
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
      />
    </aside>
  );
}
