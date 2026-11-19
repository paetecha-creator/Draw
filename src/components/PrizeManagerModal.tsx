import React, { useState, useRef } from 'react';
import { Gift, X, Upload, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { Prize } from '../types/party';
import { soundFX } from '../utils/audio';
import { compressImageDataUrl } from '../utils/imageCompress';
import { usePreferences } from '../contexts/PreferencesContext';
import { PartyDialogModal, PartyDialogState } from './PartyDialogModal';

interface PrizeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeToEdit: Prize | null;
  onSave: (prize: Prize) => void;
  onDelete?: (prizeId: string) => void;
}

export const PrizeManagerModal: React.FC<PrizeManagerModalProps> = ({
  isOpen,
  onClose,
  prizeToEdit,
  onSave,
  onDelete,
}) => {
  const { t } = usePreferences();
  const [name, setName] = useState(prizeToEdit?.name || '');
  const [tier, setTier] = useState(prizeToEdit?.tier || 'รางวัลพิเศษ');
  const [quantity, setQuantity] = useState(prizeToEdit?.quantity || 1);
  const [sponsor, setSponsor] = useState(prizeToEdit?.sponsor || '');
  const [description, setDescription] = useState(prizeToEdit?.description || '');
  const [imageUrl, setImageUrl] = useState(prizeToEdit?.imageUrl || '');
  const [imagePreview, setImagePreview] = useState(prizeToEdit?.imageUrl || '');
  const [dialog, setDialog] = useState<PartyDialogState>({
    isOpen: false,
    mode: 'alert',
    variant: 'warning',
    title: '',
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (prizeToEdit) {
      setName(prizeToEdit.name);
      setTier(prizeToEdit.tier);
      setQuantity(prizeToEdit.quantity);
      setSponsor(prizeToEdit.sponsor || '');
      setDescription(prizeToEdit.description || '');
      setImageUrl(prizeToEdit.imageUrl || '');
      setImagePreview(prizeToEdit.imageUrl || '');
    } else {
      setName('');
      setTier(t('รางวัลพิเศษ', 'Special Prize'));
      setQuantity(1);
      setSponsor('');
      setDescription('');
      setImageUrl('');
      setImagePreview('');
    }
  }, [prizeToEdit, isOpen, t]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const compressed = await compressImageDataUrl(event.target.result as string, 480, 480, 0.72, 120000);
          setImageUrl(compressed);
          setImagePreview(compressed);
          soundFX.playClick();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setDialog({
        isOpen: true,
        mode: 'alert',
        variant: 'warning',
        title: t('ข้อมูลไม่ครบถ้วน', 'Missing Information'),
        message: t('กรุณาระบุชื่อของรางวัลก่อนบันทึก', 'Please enter a prize name before saving.'),
      });
      return;
    }

    const drawnCount = prizeToEdit
      ? Math.max(0, prizeToEdit.quantity - prizeToEdit.remaining)
      : 0;
    const numQty = Math.max(1, Math.floor(Number(quantity) || 1));

    if (prizeToEdit && numQty < drawnCount) {
      setDialog({
        isOpen: true,
        mode: 'alert',
        variant: 'warning',
        title: t('ไม่สามารถลดจำนวนของรางวัลได้', 'Invalid Prize Quantity'),
        message: t(
          `รางวัลนี้ถูกจับแจกไปแล้ว ${drawnCount} ชิ้น ไม่สามารถตั้งจำนวนรวมน้อยกว่า ${drawnCount} ได้`,
          `This prize already has ${drawnCount} drawn winner(s). Quantity cannot be less than ${drawnCount}.`
        ),
      });
      return;
    }

    const remainingCount = prizeToEdit
      ? Math.max(0, Math.min(numQty, numQty - drawnCount))
      : numQty;

    const darkGradients = [
      'from-amber-500/20 via-zinc-900 to-zinc-900',
      'from-emerald-500/20 via-zinc-900 to-zinc-900',
      'from-indigo-500/20 via-zinc-900 to-zinc-900',
    ];
    const randomColor = darkGradients[Math.floor(Math.random() * darkGradients.length)];

    const updatedPrize: Prize = {
      id: prizeToEdit ? prizeToEdit.id : `PRIZE-${Date.now()}`,
      name: name.trim(),
      tier: tier.trim(),
      quantity: numQty,
      remaining: remainingCount,
      sponsor: sponsor.trim(),
      description: description.trim(),
      imageUrl: imagePreview.trim() || undefined,
      color: prizeToEdit?.color || randomColor,
    };

    soundFX.playClick();
    onSave(updatedPrize);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-[#050212]/85 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#140a2b] border-2 border-fuchsia-300/70 dark:border-fuchsia-500/40 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400" />
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] absolute top-3 right-3 text-slate-500 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center rounded-xl hover:bg-fuchsia-50 dark:hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 flex items-center justify-center mx-auto mb-2 text-white shadow-lg shadow-fuchsia-500/30">
            <Gift className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {prizeToEdit ? t('แก้ไขข้อมูลของรางวัล', 'Edit Prize') : t('เพิ่มของรางวัลใหม่', 'Add New Prize')}
          </h3>
          <p className="text-xs text-slate-600 dark:text-purple-200/80 mt-0.5">
            {t(
              'กำหนดชื่อ จำนวน และแนบรูปตัวอย่างของรางวัลสำหรับจับ Lucky Draw',
              'Set prize name, quantity, and optional sample image for the Lucky Draw.'
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-purple-100 mb-1">
              {t('ชื่อของรางวัล', 'Prize Name')} <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('เช่น iPhone 16 Pro Max, ทองคำ 1 บาท', 'e.g. iPhone 16 Pro Max, Gold Bar')}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-fuchsia-50/50 dark:bg-[#0b051c] border-2 border-fuchsia-200 dark:border-fuchsia-500/30 focus:border-fuchsia-500 dark:focus:border-cyan-400 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-400/50 text-base sm:text-xs font-medium transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-purple-100 mb-1">
                {t('ระดับรางวัล (Tier)', 'Prize Tier')}
              </label>
              <input
                type="text"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                placeholder={t('เช่น Grand Prize, รางวัลที่ 1', 'e.g. Grand Prize')}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-cyan-50/50 dark:bg-[#0b051c] border-2 border-cyan-200 dark:border-cyan-500/30 focus:border-cyan-500 dark:focus:border-cyan-400 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-400/50 text-base sm:text-xs font-medium transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-purple-100 mb-1">
                {t('จำนวนรางวัล (ชิ้น)', 'Quantity')} <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={prizeToEdit ? Math.max(1, prizeToEdit.quantity - prizeToEdit.remaining) : 1}
                required
                value={quantity}
                onChange={(e) => {
                  const minAllowed = prizeToEdit
                    ? Math.max(1, prizeToEdit.quantity - prizeToEdit.remaining)
                    : 1;
                  setQuantity(Math.max(minAllowed, parseInt(e.target.value, 10) || minAllowed));
                }}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-50/50 dark:bg-[#0b051c] border-2 border-amber-200 dark:border-amber-500/30 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none text-slate-900 dark:text-white text-base sm:text-xs font-bold font-mono tabular-nums transition"
              />
              {prizeToEdit && prizeToEdit.quantity - prizeToEdit.remaining > 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-300 font-semibold mt-1">
                  {t(
                    `แจกแล้ว ${prizeToEdit.quantity - prizeToEdit.remaining} ชิ้น (คงเหลือ ${Math.max(0, quantity - (prizeToEdit.quantity - prizeToEdit.remaining))} ชิ้น)`,
                    `Drawn: ${prizeToEdit.quantity - prizeToEdit.remaining} (Left: ${Math.max(0, quantity - (prizeToEdit.quantity - prizeToEdit.remaining))})`
                  )}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-purple-100 mb-1">
              {t('ผู้สนับสนุน / มอบโดย', 'Sponsor')}
            </label>
            <input
              type="text"
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              placeholder={t('เช่น CEO, คณะกรรมการจัดงาน', 'e.g. CEO, Organizing Committee')}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-violet-50/50 dark:bg-[#0b051c] border-2 border-violet-200 dark:border-violet-500/30 focus:border-violet-500 dark:focus:border-fuchsia-400 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-400/50 text-base sm:text-xs font-medium transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-purple-100 mb-1">
              {t('รายละเอียดเพิ่มเติม / สี / รุ่น', 'Description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('เช่น 256GB สีไทเทเนียม', 'e.g. 256GB Titanium')}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0b051c] border-2 border-slate-200 dark:border-purple-500/30 focus:border-fuchsia-500 dark:focus:border-cyan-400 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-400/50 text-base sm:text-xs font-medium transition"
            />
          </div>

          <div className="pt-2 border-t border-fuchsia-200/70 dark:border-purple-500/20">
            <label className="block text-xs font-bold text-slate-800 dark:text-purple-100 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-fuchsia-600 dark:text-cyan-400" />
                <span>{t('แนบรูปตัวอย่างของรางวัล', 'Sample Image')}</span>
              </span>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview('');
                    setImageUrl('');
                  }}
                  className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  {t('ลบรูป', 'Remove')}
                </button>
              )}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {imagePreview ? (
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border-2 border-fuchsia-300 dark:border-cyan-400/40 bg-slate-100 dark:bg-[#0b051c] group flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt={name || t('ตัวอย่างของรางวัล', 'Prize preview')}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#140a2b] text-slate-900 dark:text-white border border-fuchsia-300 dark:border-cyan-400/50 text-xs font-bold shadow-md hover:bg-fuchsia-50 dark:hover:bg-white/10 cursor-pointer"
                  >
                    {t('เปลี่ยนรูปภาพ', 'Change Photo')}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-fuchsia-300 dark:border-fuchsia-500/40 hover:border-cyan-500 dark:hover:border-cyan-400 rounded-2xl p-4 text-center cursor-pointer bg-gradient-to-br from-fuchsia-50/70 via-white to-cyan-50/70 dark:from-fuchsia-500/10 dark:via-[#0b051c] dark:to-cyan-500/10 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center mx-auto mb-1.5 text-white shadow-md">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  {t('คลิกเพื่ออัปโหลดรูปตัวอย่างของรางวัล', 'Click to upload sample image')}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                  {t('รองรับไฟล์รูปภาพ PNG, JPG, WebP', 'Supports PNG, JPG, WebP')}
                </p>
              </div>
            )}

            <div className="mt-2">
              <input
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImagePreview(e.target.value);
                }}
                placeholder={t('หรือวางลิงก์รูปภาพ (Image URL)...', 'Or paste image URL...')}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0b051c] border border-slate-300 dark:border-purple-500/30 focus:border-fuchsia-500 dark:focus:border-cyan-400 focus:outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-purple-400/50"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center gap-2">
            {prizeToEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setDialog({
                    isOpen: true,
                    mode: 'confirm',
                    variant: 'danger',
                    title: t('ยืนยันการลบของรางวัล', 'Confirm Delete Prize'),
                    message: t(
                      `คุณต้องการลบรางวัล "${prizeToEdit.name}" ออกจากรายการหรือไม่?`,
                      `Are you sure you want to delete prize "${prizeToEdit.name}"?`
                    ),
                    confirmText: t('ลบรางวัล', 'Delete'),
                    onConfirmAction: () => {
                      onDelete(prizeToEdit.id);
                      onClose();
                    },
                  });
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title={t('ลบรางวัลนี้', 'Delete Prize')}
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('ลบ', 'Delete')}</span>
              </button>
            )}

            <button
              type="submit"
              className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:from-fuchsia-500 hover:via-rose-400 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg shadow-fuchsia-500/25 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t('บันทึกข้อมูลของรางวัล', 'Save Prize')}</span>
            </button>
          </div>
        </form>
      </div>

      <PartyDialogModal
        dialog={dialog}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
