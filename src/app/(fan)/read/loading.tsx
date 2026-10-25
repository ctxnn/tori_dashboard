// Shown while a screen renders on the server.
export default function Loading() {
  const S = ({ className = "" }: { className?: string }) => <div className={`skeleton rounded-xl ${className}`} />;
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="bleed -mt-5 border-b border-line bg-[rgb(var(--paper))] pb-6 pt-6">
        <div className="flex gap-5"><S className="aspect-[2/3] w-[38%] max-w-[170px]" /><div className="flex-1 space-y-3 pt-6"><S className="h-9 w-4/5" /><S className="h-4 w-1/2" /><S className="h-16 w-full" /><S className="h-11 w-40" /></div></div>
      </div>
      <S className="h-5 w-48" />
      <div className="grid grid-cols-3 gap-3">{Array.from({ length: 6 }, (_, i) => <S key={i} className="aspect-[2/3] w-full" />)}</div>
    </div>
  );
}
