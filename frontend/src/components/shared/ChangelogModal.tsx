import React from 'react';
import { Modal } from './Modal';
import { changelog, changeTypeLabels, type ChangelogEntry } from '@/data/changelog';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 变更类型对应的样式
const changeTypeStyles: Record<ChangelogEntry['changes'][0]['type'], string> = {
  feat: 'bg-green-100 text-green-700',
  fix: 'bg-blue-100 text-blue-700',
  perf: 'bg-purple-100 text-purple-700',
  docs: 'bg-gray-100 text-gray-700',
  refactor: 'bg-orange-100 text-orange-700',
};

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="版本更新日志" size="lg">
      <div className="max-h-[60vh] overflow-y-auto space-y-6">
        {changelog.map((entry) => (
          <div key={entry.version} className="border-b border-gray-100 pb-4 last:border-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-semibold text-gray-900">{entry.version}</span>
              <span className="text-sm text-gray-500">{entry.date}</span>
            </div>
            <ul className="space-y-2">
              {entry.changes.map((change, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${changeTypeStyles[change.type]}`}>
                    {changeTypeLabels[change.type]}
                  </span>
                  <span className="text-gray-700">{change.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
};
