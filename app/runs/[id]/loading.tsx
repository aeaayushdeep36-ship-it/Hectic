export default function RunLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07080A] text-[#F5F6F8]" role="status" aria-live="polite">
      <div className="h-[1px] w-full bg-[#D4AF6A]/60 animate-pulse" />
      <div className="h-14 border-b border-[#1E222A] px-6 flex items-center justify-between">
        <div className="h-3 w-48 bg-[#15181F] animate-pulse" />
        <div className="h-3 w-64 bg-[#15181F] animate-pulse hidden md:block" />
        <div className="h-7 w-24 bg-[#15181F] animate-pulse" />
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 p-10 flex justify-center">
          <div className="w-full max-w-[680px] h-[520px] bg-[#0E1014] border border-[#1E222A] animate-pulse" />
        </div>
        <div className="lg:col-span-5 bg-[#0E1014] border-l border-[#1E222A] p-6 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-[#07080A] border border-[#1E222A] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
