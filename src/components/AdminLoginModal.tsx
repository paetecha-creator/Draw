import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { NumpadPinModal } from './NumpadPinModal';
import { usePreferences } from '../contexts/PreferencesContext';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = usePreferences();

  return (
    <NumpadPinModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      expectedPin="236248"
      title={t('เข้าสู่ระบบแอดมิน (Admin)', 'Admin Sign-In')}
      subtitle={t(
        'กดรหัส PIN 6 หลัก ระบบจะเข้าสู่ระบบอัตโนมัติทันที',
        'Enter the 6-digit PIN to sign in automatically'
      )}
      icon={<ShieldCheck className="w-6 h-6" />}
    />
  );
};
