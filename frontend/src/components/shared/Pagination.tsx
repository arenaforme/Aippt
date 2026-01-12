/**
 * 通用分页组件
 */
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showTotal?: boolean;
  showPageSize?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showTotal = true,
  showPageSize = true,
  className = '',
}) => {
  // 生成页码按钮
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1 && !showTotal) return null;

  return (
    <div className={`flex items-center justify-between flex-wrap gap-4 ${className}`}>
      {/* 左侧：总数和每页条数 */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        {showTotal && <span>共 {total} 条</span>}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-banana-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>条</span>
          </div>
        )}
      </div>

      {/* 右侧：分页按钮 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* 首页 */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="首页"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* 上一页 */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="上一页"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* 页码 */}
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <button
                key={index}
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2 rounded text-sm ${
                  currentPage === page
                    ? 'bg-banana-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={index} className="px-1 text-gray-400">...</span>
            )
          ))}

          {/* 下一页 */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="下一页"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* 末页 */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="末页"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
