import { cn } from '@/lib/utils';

type Spine = {
  tone: string;
  height: number;
  width: number;
};

const spines: Spine[] = [
  { tone: '#173F35', height: 78, width: 22 },
  { tone: '#315C4C', height: 66, width: 26 },
  { tone: '#C6A66B', height: 72, width: 20 },
  { tone: '#4A3B52', height: 60, width: 24 },
  { tone: '#7A4A3A', height: 76, width: 22 },
  { tone: '#2F5C54', height: 68, width: 28 },
  { tone: '#6B4F2A', height: 74, width: 20 },
  { tone: '#3A4A5C', height: 62, width: 24 },
];

export function BookShelf({ className }: { className?: string }) {
  return (
    <div className={cn('select-none', className)} aria-hidden="true">
      <div
        className="relative flex items-end justify-center gap-3 pb-6 sm:gap-5"
        style={{ perspective: '900px' }}
      >
        {spines.map((spine, index) => (
          <div
            key={index}
            className="relative origin-bottom animate-fade-up"
            style={{
              height: `${spine.height * 2}px`,
              width: `${spine.width * 2}px`,
              backgroundColor: spine.tone,
              transform: `rotateY(${index % 2 === 0 ? -18 : 18}deg) rotateX(4deg)`,
              transformStyle: 'preserve-3d',
              boxShadow:
                'inset 6px 0 0 rgba(255,255,255,0.12), inset -6px 0 0 rgba(0,0,0,0.18), 0 24px 30px -16px rgba(0,0,0,0.45)',
              borderRadius: '3px 8px 8px 3px',
              animationDelay: `${index * 60}ms`,
            }}
          >
            <span className="absolute left-[18%] top-2 bottom-2 w-px bg-white/20" />
            <span className="absolute left-[34%] top-3 bottom-3 w-px bg-white/10" />
            <span className="absolute right-[16%] top-3 bottom-6 w-px bg-black/20" />
          </div>
        ))}
      </div>
      <div className="book-shelf-shadow h-3 rounded-full bg-primary/90" />
    </div>
  );
}
