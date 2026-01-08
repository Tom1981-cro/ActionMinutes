import { WarningCircle } from "@phosphor-icons/react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#121212]">
      <div className="glass-panel rounded-2xl w-full max-w-md mx-4 p-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
            <WarningCircle className="h-8 w-8 text-red-400" weight="duotone" />
          </div>
          <h1 className="text-2xl font-bold text-white">404 Page Not Found</h1>
          <p className="text-sm text-white/60">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
      </div>
    </div>
  );
}
