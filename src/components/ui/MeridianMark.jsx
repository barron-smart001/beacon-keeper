const MeridianMark = ({ className = "" }) => (
  <span aria-hidden="true" className={`relative grid size-7 place-items-center ${className}`}>
    <span className="absolute inset-0 rotate-45 rounded-[7px] border border-[var(--accent)]/80" />
    <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[var(--accent)]" />
  </span>
);

export default MeridianMark;
