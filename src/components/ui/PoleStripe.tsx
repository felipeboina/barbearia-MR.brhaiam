export function PoleStripe({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-[6px] w-full pole-anim ${className}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(-45deg, var(--barber-red) 0px, var(--barber-red) 10px, var(--cream) 10px, var(--cream) 20px, var(--brass) 20px, var(--brass) 30px)",
        backgroundSize: "80px 80px",
      }}
    />
  );
}
