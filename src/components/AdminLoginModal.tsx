import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { NumpadPinModal } from './NumpadPinModal';

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
  return (
    <NumpadPinModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      expectedPin="236248"
      title="เข้าสู่ระบบแอดมิน (Admin)"
      subtitle="กดรหัส PIN 6 หลัก ระบบจะเข้าสู่ระบบอัตโนมัติทันที"
      icon={<ShieldCheck className="w-6 h-6" />}
    />
  );
};
