import React, { useState, useRef } from 'react';
import { Gift, X, Upload, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { Prize } from '../types/party';
import { soundFX } from '../utils/audio';
import { compressImageDataUrl } from '../utils/imageCompress';

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
  const [name, setName] = useState(prizeToEdit?.name || '');
  const [tier, setTier] = useState(prizeToEdit?.tier || 'รางวัลพิเศษ');
  const [quantity, setQuantity] = useState(prizeToEdit?.quantity || 1);
  const [sponsor, setSponsor] = useState(prizeToEdit?.sponsor || '');
  const [description, setDescription] = useState(prizeToEdit?.description || '');
  const [imageUrl, setImageUrl] = useState(prizeToEdit?.imageUrl || '');
  const [imagePreview, setImagePreview] = useState(prizeToEdit?.imageUrl || '');
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
      setTier('รางวัลพิเศษ');
      setQuantity(1);
      setSponsor('');
      setDescription('');
      setImageUrl('');
      setImagePreview('');
    }
  }, [prizeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const compressed = await compressImageDataUrl(event.target.result as string, 640, 640, 0.75);
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
      alert('กรุณาระบุชื่อของรางวัล');
      return;
    }

    const numQty = Math.max(1, Number(quantity) || 1);
    const remainingCount = prizeToEdit
      ? Math.max(0, numQty - (prizeToEdit.quantity - prizeToEdit.remaining))
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] absolute top-3 right-3 text-zinc-400 hover:text-zinc-100 flex items-center justify-center rounded-xl hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto mb-2 text-amber-400">
            <Gift className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">
            {prizeToEdit ? 'แก้ไขข้อมูลของรางวัล' : 'เพิ่มของรางวัลใหม่'}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            กำหนดชื่อ จำนวน และแนบรูปตัวอย่างของรางวัลสำหรับจับ Lucky Draw
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ชื่อของรางวัล <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น iPhone 16 Pro Max, ทองคำ 1 บาท, iPad Air"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none text-zinc-100 placeholder-zinc-500 text-xs font-medium transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                ระดับรางวัล (Tier)
              </label>
              <input
                type="text"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                placeholder="เช่น Grand Prize, รางวัลที่ 1"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none text-zinc-100 placeholder-zinc-500 text-xs font-medium transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                จำนวนรางวัล (ชิ้น) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none text-zinc-100 text-xs font-bold font-mono tabular-nums transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ผู้สนับสนุน / มอบโดย
            </label>
            <input
              type="text"
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              placeholder="เช่น CEO, คณะกรรมการจัดงาน, สหกรณ์"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none text-zinc-100 placeholder-zinc-500 text-xs font-medium transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              รายละเอียดเพิ่มเติม / สี / รุ่น
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น 256GB สีไทเทเนียม, บัตรหมดอายุสิ้นปี"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none text-zinc-100 placeholder-zinc-500 text-xs font-medium transition"
            />
          </div>

          {/* IMAGE UPLOAD & ATTACHMENT SECTION */}
          <div className="pt-2 border-t border-zinc-800">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>แนบรูปตัวอย่างของรางวัล (Sample Image)</span>
              </span>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview('');
                    setImageUrl('');
                  }}
                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  ลบรูป
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
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950 group flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt={name || 'ตัวอย่างของรางวัล'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-100 border border-zinc-700 text-xs font-bold shadow-md hover:bg-zinc-800 cursor-pointer"
                  >
                    เปลี่ยนรูปภาพ
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-amber-400/70 rounded-2xl p-4 text-center cursor-pointer bg-zinc-950/60 hover:bg-zinc-950 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-1.5 text-amber-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-zinc-200">
                  คลิกเพื่ออัปโหลดรูปตัวอย่างของรางวัล
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  รองรับไฟล์รูปภาพ PNG, JPG, WebP
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
                placeholder="หรือวางลิงก์รูปภาพ (Image URL)..."
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-amber-400 focus:outline-none text-[11px] text-zinc-200 placeholder-zinc-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-2">
            {prizeToEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณต้องการลบรางวัล "${prizeToEdit.name}" หรือไม่?`)) {
                    onDelete(prizeToEdit.id);
                    onClose();
                  }
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="ลบรางวัลนี้"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบ</span>
              </button>
            )}

            <button
              type="submit"
              className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs shadow-md active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกข้อมูลของรางวัล</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
