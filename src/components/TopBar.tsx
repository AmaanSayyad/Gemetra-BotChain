import React, { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { PointsDisplay } from './PointsDisplay';
import { useNotifications } from '../hooks/useNotifications';
import { useAccount } from 'wagmi';

interface TopBarProps {
  activeTab: string;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab }) => {
  const { notifications} = useNotifications();
  const { address, isConnected } = useAccount();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Welcome back! Here\'s what\'s happening with your payroll.'
        };
      case 'vat-refund':
        return {
          title: 'VAT Refund',
          subtitle: 'Process VAT Refunds'
        };
      case 'vat-admin':
        return {
          title: 'VAT Admin',
          subtitle: 'Refund records and export'
        };
      case 'scheduled-payments':
        return {
          title: 'Scheduled Payments',
          subtitle: 'Automate recurring payroll'
        };
      case 'employees':
        return {
          title: 'Employee Management',
          subtitle: 'Manage your team and configure payroll preferences.'
        };
      case 'bulk-transfer':
        return {
          title: 'Bulk Transfer',
          subtitle: 'Process multiple payroll payments in a single transaction.'
        };
      case 'ai-assistant-chat':
        return {
          title: 'AI Assistant',
          subtitle: 'Get smart AI insights for your company and payroll data.'
        };
      case 'ai-assistant-history':
        return {
          title: 'Chat History',
          subtitle: 'View and manage your AI conversation history.'
        };
      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Manage your account and company information.'
        };
      default:
        return {
          title: 'Dashboard',
          subtitle: 'Welcome back!'
        };
    }
  };

  const { title, subtitle } = getPageTitle();

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-3 py-3 sm:px-6 sm:py-4 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Page Title */}
        <div className="min-w-0 flex-1 pr-1">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">{subtitle}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center shrink-0 space-x-2 sm:space-x-4">
          {/* Points Display */}
          {isConnected && address && (
            <PointsDisplay walletAddress={address} isWalletConnected={isConnected} />
          )}

          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-gray-100 border border-gray-300 text-gray-900 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 w-64 text-sm"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationDropdown
                isOpen={showNotifications}
                onToggle={toggleNotifications}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};