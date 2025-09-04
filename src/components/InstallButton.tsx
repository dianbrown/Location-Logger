import { useInstallPrompt } from '../hooks/useInstallPrompt';

interface InstallButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function InstallButton({ 
  variant = 'secondary', 
  size = 'md',
  className = '' 
}: InstallButtonProps) {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();

  // Don't show if already installed
  if (isInstalled) {
    return (
      <div className={`text-center ${className}`}>
        <div className="inline-flex items-center gap-2 text-green-600 text-sm">
          <span>✅</span>
          <span>App installed!</span>
        </div>
      </div>
    );
  }

  // Show manual instructions for iOS Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     !(window as any).MSStream && 
                     !(navigator.userAgent.includes('CriOS') || navigator.userAgent.includes('FxiOS'));

  const handleInstallClick = async () => {
    if (isInstallable) {
      await promptInstall();
    } else if (isIOSSafari) {
      alert('To install this app:\n1. Tap the Share button (□↗)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
    } else {
      alert('To install this app:\n• Look for the install icon in your browser address bar\n• Or check your browser menu for "Install app" option');
    }
  };

  const baseClasses = "inline-flex items-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      onClick={handleInstallClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <span>📱</span>
      <span>Install App</span>
    </button>
  );
}
