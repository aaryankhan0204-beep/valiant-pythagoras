import React, { useState } from 'react';
import { 
  ThumbsUp, 
  ThumbsDown, 
  FileText, 
  Paperclip, 
  Eye, 
  UserX, 
  CornerDownRight,
  Trash2,
  Lock,
  Unlock,
  Maximize2,
  Edit2
} from 'lucide-react';
import type { ArgumentCard as ArgumentCardType, ClassificationType, EvidenceItem } from '../../types/decision';

interface ArgumentCardProps {
  card: ArgumentCardType;
  onVoteCard: (cardId: string, type: 'up' | 'down') => void;
  onOpenEvidence: (evidence: EvidenceItem) => void;
  onAddCounter: (parentCardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  onResizeCard?: (cardId: string, width: number, height: number) => void;
  onUpdateTextProps?: (cardId: string, props: Partial<ArgumentCardType>) => void;
  onEditCard?: (card: ArgumentCardType) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const ArgumentCard: React.FC<ArgumentCardProps> = ({
  card,
  onVoteCard,
  onOpenEvidence,
  onAddCounter,
  onDeleteCard,
  onResizeCard,
  onUpdateTextProps,
  onEditCard,
  isSelected,
  onSelect
}) => {
  const [isLocked, setIsLocked] = useState(card.isLocked || false);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: card.width || 280,
    height: card.height || 180
  });

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = cardSize.width;
    const startH = cardSize.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newW = Math.max(140, startW + (moveEvent.clientX - startX));
      const newH = Math.max(90, startH + (moveEvent.clientY - startY));
      setCardSize({ width: newW, height: newH });
      if (onResizeCard) onResizeCard(card.id, newW, newH);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getClassificationBadge = (cls: ClassificationType) => {
    switch (cls) {
      case 'Fact':
        return 'badge-fact shadow-sm';
      case 'Opinion':
        return 'badge-opinion shadow-sm';
      case 'Assumption':
        return 'badge-assumption shadow-sm';
      case 'Suggestion':
        return 'badge-suggestion shadow-sm';
      case 'Question':
        return 'badge-question shadow-sm';
    }
  };

  // Render 1: Variety of Shapes (Rectangle, Circle, Diamond, Container Box)
  if (card.cardType === 'shape') {
    const shapeKind = card.shapeType || 'rect';
    const shapeBg = card.color || 'rgba(2, 132, 199, 0.15)';

    const shapeClassMap = {
      rect: 'rounded-2xl',
      circle: 'rounded-full',
      diamond: 'rotate-45 rounded-lg',
      container: 'rounded-3xl border-dashed'
    };

    return (
      <div
        onClick={onSelect}
        onDoubleClick={() => onEditCard && onEditCard(card)}
        className={`border-2 flex items-center justify-center relative transition-all group ${
          shapeClassMap[shapeKind]
        } ${isSelected ? 'border-sky-500 ring-2 ring-sky-500/40 shadow-lg' : 'border-slate-400 dark:border-slate-600'}`}
        style={{
          width: `${cardSize.width}px`,
          height: `${cardSize.height}px`,
          backgroundColor: shapeBg
        }}
      >
        {card.title && (
          <p className="text-xs font-extrabold text-slate-900 dark:text-white px-2 text-center">
            {card.title}
          </p>
        )}

        {/* Floating Shape Color Toolbar when Selected */}
        {isSelected && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-md p-1 flex items-center space-x-1 z-40">
            {[
              { id: 'rgba(2, 132, 199, 0.15)', border: '#0284c7' },
              { id: 'rgba(5, 150, 105, 0.15)', border: '#059669' },
              { id: 'rgba(217, 119, 6, 0.15)', border: '#d97706' },
              { id: 'rgba(147, 51, 234, 0.15)', border: '#9333ea' },
              { id: 'rgba(15, 23, 42, 0.1)', border: '#334155' }
            ].map((col, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUpdateTextProps) onUpdateTextProps(card.id, { color: col.id });
                }}
                className="w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform"
                style={{ backgroundColor: col.border }}
              />
            ))}
          </div>
        )}

        {/* Pullable Corner Resize Handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="resize-handle flex items-center justify-center text-slate-600 hover:text-slate-900"
          title="Drag to resize shape"
        >
          <Maximize2 className="w-3 h-3 rotate-90" />
        </div>
      </div>
    );
  }

  // Render 2: Standalone Mini Text Box with Font Size Dropdown & Alignment Toolbar
  if (card.cardType === 'text') {
    const fontSizeMap = {
      sm: 'text-xs',
      md: 'text-base font-semibold',
      lg: 'text-2xl font-bold',
      xl: 'text-4xl font-extrabold'
    };
    const currentFontSize = card.fontSize || 'md';
    const currentAlign = card.textAlign || 'left';

    return (
      <div
        onClick={onSelect}
        onDoubleClick={() => onEditCard && onEditCard(card)}
        className={`p-2.5 rounded-xl text-left transition-all relative group bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-sm ${
          isSelected ? 'ring-2 ring-sky-500 bg-white dark:bg-slate-800 shadow-md' : ''
        }`}
        style={{ textAlign: currentAlign, minWidth: '130px' }}
      >
        {/* Floating Text Toolbar Controls with Font Size Dropdown when Selected */}
        {isSelected && (
          <div className="absolute -top-10 left-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-md p-1 flex items-center space-x-1.5 z-40 text-xs">
            {/* Font Size Dropdown Selector */}
            <select
              value={currentFontSize}
              onChange={(e) => {
                e.stopPropagation();
                if (onUpdateTextProps) onUpdateTextProps(card.id, { fontSize: e.target.value as any });
              }}
              className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-2 py-0.5 font-bold text-[11px] border border-slate-300 dark:border-slate-600"
            >
              <option value="sm">Small (12px)</option>
              <option value="md">Regular (16px)</option>
              <option value="lg">Large (24px)</option>
              <option value="xl">Title XL (32px)</option>
            </select>

            <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700" />

            {(['left', 'center', 'right'] as const).map((al) => (
              <button
                key={al}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUpdateTextProps) onUpdateTextProps(card.id, { textAlign: al });
                }}
                className={`px-2 py-0.5 rounded capitalize text-[10px] ${
                  currentAlign === al ? 'bg-sky-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {al}
              </button>
            ))}
          </div>
        )}

        <p className={`${fontSizeMap[currentFontSize]} text-slate-900 dark:text-white leading-snug`}>
          {card.title || 'Double-click to type text...'}
        </p>
      </div>
    );
  }

  // Render 3: Image Card (Uploaded Local Image)
  if (card.cardType === 'image' && card.imageUrl) {
    return (
      <div
        onClick={onSelect}
        className={`rounded-2xl p-2 bg-white dark:bg-slate-800 border shadow-md w-72 text-left transition-all ${
          isSelected ? 'ring-2 ring-sky-500 border-sky-500 shadow-lg' : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 mb-2">
          <img src={card.imageUrl} alt={card.title} className="w-full h-44 object-cover" />
        </div>
        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{card.title}</h4>
        <div className="flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
          <span>Uploaded by {card.author}</span>
          {onDeleteCard && (
            <button onClick={(e) => { e.stopPropagation(); onDeleteCard(card.id); }} className="text-rose-600 hover:text-rose-800">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render 4: Miro-Style Sticky Note (Pastel Card with Always Dark Visible Text)
  const stickyClass = card.color || 'sticky-yellow';

  return (
    <div
      onClick={onSelect}
      onDoubleClick={() => onEditCard && onEditCard(card)}
      className={`rounded-2xl p-4 text-left border relative transition-all shadow-md ${stickyClass} ${
        isSelected ? 'ring-2 ring-sky-600 shadow-xl scale-[1.01]' : ''
      }`}
      style={{
        width: `${cardSize.width}px`,
        height: `${cardSize.height}px`
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getClassificationBadge(
            card.classification
          )}`}
        >
          {card.classification}
        </span>

        <div className="flex items-center space-x-1">
          {card.stance === 'Support' && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-600 text-white border border-emerald-500 shadow-sm flex items-center gap-1">
              <ThumbsUp className="w-2.5 h-2.5" /> Support
            </span>
          )}
          {card.stance === 'Oppose' && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-600 text-white border border-rose-500 shadow-sm flex items-center gap-1">
              <ThumbsDown className="w-2.5 h-2.5" /> Oppose
            </span>
          )}

          {/* Edit Button */}
          {onEditCard && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCard(card);
              }}
              className="p-1 opacity-70 hover:opacity-100 transition-opacity text-slate-900"
              title="Edit Note (Double Click)"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}

          {/* Lock Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLocked(!isLocked);
              card.isLocked = !isLocked;
            }}
            className="p-1 opacity-70 hover:opacity-100 transition-opacity text-slate-900"
            title={isLocked ? 'Locked in place' : 'Click to lock note in place'}
          >
            {isLocked ? <Lock className="w-3 h-3 text-sky-700" /> : <Unlock className="w-3 h-3" />}
          </button>

          {onDeleteCard && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCard(card.id);
              }}
              className="p-1 opacity-70 hover:text-rose-700 transition-colors text-slate-900"
              title="Delete Note"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Note Title & Content */}
      <h4 className="font-bold text-sm mb-1 leading-snug text-slate-900">{card.title}</h4>
      <p className="text-xs leading-relaxed mb-3 font-medium text-slate-800">{card.content}</p>

      {/* Evidence Attachments */}
      {card.evidence && card.evidence.length > 0 && (
        <div className="mb-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
            <Paperclip className="w-3 h-3 text-sky-700" /> Attached Evidence ({card.evidence.length})
          </span>
          {card.evidence.map((ev) => (
            <button
              key={ev.id}
              onClick={(e) => {
                e.stopPropagation();
                onOpenEvidence(ev);
              }}
              className="w-full text-left p-1.5 rounded-lg bg-black/5 hover:bg-black/10 border border-black/10 flex items-center justify-between transition-all group text-slate-900"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <FileText className="w-3 h-3 text-sky-700 shrink-0" />
                <span className="text-xs font-bold truncate">{ev.name}</span>
              </div>
              <Eye className="w-3 h-3 opacity-70 group-hover:opacity-100 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Footer Actions & Upvote/Downvote */}
      <div className="flex items-center justify-between pt-2 border-t border-black/10 text-xs mt-auto">
        <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-800">
          {card.isAnonymous ? (
            <div className="flex items-center space-x-1">
              <UserX className="w-3 h-3" />
              <span>Anonymous</span>
            </div>
          ) : (
            <span>{card.author}</span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddCounter(card.id);
            }}
            title="Add Counter Note"
            className="p-1 rounded bg-black/5 hover:bg-black/10 transition-colors text-slate-900"
          >
            <CornerDownRight className="w-3 h-3" />
          </button>

          <div className="flex items-center space-x-1 bg-black/5 rounded-lg px-1.5 py-0.5 border border-black/10 font-bold text-slate-900">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVoteCard(card.id, 'up');
              }}
              className={`p-0.5 rounded transition-colors ${
                card.userVoted === 'up' ? 'text-emerald-700 font-extrabold' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono font-bold">
              {card.upvotes - card.downvotes}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVoteCard(card.id, 'down');
              }}
              className={`p-0.5 rounded transition-colors ${
                card.userVoted === 'down' ? 'text-rose-700 font-extrabold' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* PULLABLE CORNER RESIZE HANDLE (↘️) */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="resize-handle flex items-center justify-center text-slate-800 hover:text-black"
        title="Drag to resize note"
      >
        <Maximize2 className="w-3 h-3 rotate-90" />
      </div>

    </div>
  );
};
