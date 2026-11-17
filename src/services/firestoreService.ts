import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AttendeeRegistration,
  EmployeeRoster,
  LuckyDrawRecord,
  PartyConfig,
  Prize,
} from '../types/party';
import { INITIAL_PRIZES, INITIAL_ROSTER } from '../data/mockEmployees';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

const COLLECTIONS = {
  CONFIG: 'config',
  ROSTER: 'roster',
  PRIZES: 'prizes',
  REGISTRATIONS: 'registrations',
  LUCKY_WINNERS: 'luckyWinners',
} as const;

const CONFIG_DOC_ID = 'main';
const ACTIVE_REG_LOCAL_KEY = 'party_my_registration_id_v1';

export const DEFAULT_PARTY_CONFIG: PartyConfig = {
  eventName: 'งานเลี้ยงสังสรรค์ (Party Celebration)',
  eventSubtitle: 'ฉลองค่ำคืนแห่งความสุขและความสำเร็จร่วมกัน',
  eventDate: 'วันงานเลี้ยงสังสรรค์ | 18:00 น. เป็นต้นไป',
  eventVenue: 'ห้องจัดเลี้ยง (Grand Ballroom)',
  eventContact: 'จุดต้อนรับหน้างาน',
  ticketTitle: 'OFFICIAL PARTY PASS & TABLE PASS',
  registrationSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อยืนยันตัวตน',
  themeColor: 'obsidian-gold',
  isRegistrationOpen: true,
  blockedGroups: ['ผู้บริหาร/กรรมการ'],
  autoBlockPreviousWinners: true,
  isVipTriggerActive: false,
  vipActivePrizeId: 'PRIZE-01',
};

function clip(val: string | undefined | null, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

export function toSafeDocId(prefix: string, raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9_\-]/g, '_');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  const base = `${prefix}${cleaned || 'ITEM'}`;
  // Append short hash if characters were replaced so distinct non-ASCII IDs never collide
  const needsHash = !/^[A-Za-z0-9_\-]+$/.test(raw.trim());
  const full = needsHash ? `${base}_${hash.toString(36)}` : base;
  return full.slice(0, 120).replace(/[^A-Za-z0-9_\-]/g, '_');
}

function sanitizeConfigPayload(config: PartyConfig, seeded = true): Record<string, unknown> {
  const blocked = Array.isArray(config.blockedGroups)
    ? config.blockedGroups.map((g) => clip(g, 100)).filter(Boolean).slice(0, 50)
    : [];

  return {
    eventName: clip(config.eventName, 200) || DEFAULT_PARTY_CONFIG.eventName,
    eventSubtitle: clip(config.eventSubtitle, 250),
    eventDate: clip(config.eventDate, 150),
    eventVenue: clip(config.eventVenue, 250),
    eventContact: clip(config.eventContact, 200),
    ticketTitle: clip(config.ticketTitle, 150) || DEFAULT_PARTY_CONFIG.ticketTitle,
    registrationSubtitle:
      clip(config.registrationSubtitle, 300) || DEFAULT_PARTY_CONFIG.registrationSubtitle,
    themeColor: clip(config.themeColor, 50) || 'obsidian-gold',
    isRegistrationOpen: Boolean(config.isRegistrationOpen),
    blockedGroups: blocked,
    autoBlockPreviousWinners: Boolean(config.autoBlockPreviousWinners),
    isVipTriggerActive: Boolean(config.isVipTriggerActive),
    vipActivePrizeId: clip(config.vipActivePrizeId, 128),
    seeded,
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeRosterPayload(emp: EmployeeRoster): Record<string, unknown> {
  return {
    id: clip(emp.id, 128) || 'EMP',
    fullName: clip(emp.fullName, 200) || 'พนักงาน',
    nickname: clip(emp.nickname, 100),
    department: clip(emp.department, 150) || 'ทั่วไป',
    tableNumber: clip(emp.tableNumber, 150) || 'โต๊ะกลาง',
    groupRole: clip(emp.groupRole, 100) || 'พนักงานทั่วไป',
    phone: clip(emp.phone, 40),
    isBlockedFromDraw: Boolean(emp.isBlockedFromDraw),
  };
}

function sanitizePrizePayload(prize: Prize, sortOrder = 0): Record<string, unknown> {
  const qty = Math.min(10000, Math.max(1, Math.floor(Number(prize.quantity) || 1)));
  const rem = Math.min(qty, Math.max(0, Math.floor(Number(prize.remaining ?? qty))));
  return {
    id: clip(prize.id, 128),
    name: clip(prize.name, 200) || 'รางวัลพิเศษ',
    tier: clip(prize.tier, 150) || 'รางวัลพิเศษ',
    quantity: qty,
    remaining: rem,
    sponsor: clip(prize.sponsor, 200),
    iconName: clip(prize.iconName, 64),
    description: clip(prize.description, 400),
    color: clip(prize.color, 120),
    imageUrl: clip(prize.imageUrl, 450000),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

function sanitizeRegistrationPayload(
  reg: AttendeeRegistration,
  docId: string
): Record<string, unknown> {
  return {
    id: clip(docId, 128),
    employeeId: clip(reg.employeeId.toUpperCase(), 128),
    fullName: clip(reg.fullName, 200) || `พนักงาน ${clip(reg.employeeId, 60)}`,
    nickname: clip(reg.nickname, 100),
    department: clip(reg.department, 150) || 'พนักงานทั่วไป',
    tableNumber: clip(reg.tableNumber, 150) || 'โต๊ะกลาง',
    phone: clip(reg.phone, 40),
    selfieUrl: clip(reg.selfieUrl, 450000),
    registeredAt: clip(reg.registeredAt, 64) || new Date().toISOString(),
    dietaryOrNote: clip(reg.dietaryOrNote, 300),
    groupRole: clip(reg.groupRole, 100) || 'พนักงานทั่วไป',
    isBlockedFromDraw: Boolean(reg.isBlockedFromDraw),
  };
}

function sanitizeWinnerPayload(record: LuckyDrawRecord): Record<string, unknown> {
  return {
    id: clip(record.id, 128),
    prizeId: clip(record.prizeId, 128),
    prizeName: clip(record.prizeName, 200) || 'รางวัลพิเศษ',
    prizeTier: clip(record.prizeTier, 150) || 'รางวัลพิเศษ',
    employeeId: clip(record.employeeId, 128),
    winnerName: clip(record.winnerName, 200) || 'ผู้โชคดี',
    nickname: clip(record.nickname, 100),
    department: clip(record.department, 150) || 'ทั่วไป',
    tableNumber: clip(record.tableNumber, 150) || 'โต๊ะกลาง',
    selfieUrl: clip(record.selfieUrl, 450000),
    prizeImageUrl: clip(record.prizeImageUrl, 450000),
    wonAt: clip(record.wonAt, 64) || new Date().toISOString(),
    round: Math.min(10000, Math.max(1, Math.floor(Number(record.round) || 1))),
  };
}

async function commitBatchedDeletes(collectionName: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, collectionName);
  }
}

export const FirestoreService = {
  getMyRegistrationId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_REG_LOCAL_KEY);
    } catch {
      return null;
    }
  },

  setMyRegistrationId(id: string) {
    try {
      localStorage.setItem(ACTIVE_REG_LOCAL_KEY, id);
    } catch {
      // ignore storage quota errors
    }
  },

  clearMyRegistrationId() {
    try {
      localStorage.removeItem(ACTIVE_REG_LOCAL_KEY);
    } catch {
      // ignore
    }
  },

  async ensureInitialSeed(): Promise<void> {
    const configRef = doc(db, COLLECTIONS.CONFIG, CONFIG_DOC_ID);
    try {
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        return;
      }

      const batch = writeBatch(db);
      batch.set(configRef, sanitizeConfigPayload(DEFAULT_PARTY_CONFIG, true));

      INITIAL_ROSTER.forEach((emp) => {
        const docId = toSafeDocId('', emp.id);
        batch.set(doc(db, COLLECTIONS.ROSTER, docId), sanitizeRosterPayload(emp));
      });

      INITIAL_PRIZES.forEach((prize, idx) => {
        const docId = toSafeDocId('', prize.id);
        batch.set(doc(db, COLLECTIONS.PRIZES, docId), sanitizePrizePayload(prize, idx));
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CONFIG}/${CONFIG_DOC_ID}`);
    }
  },

  subscribeConfig(onData: (config: PartyConfig) => void): Unsubscribe {
    const ref = doc(db, COLLECTIONS.CONFIG, CONFIG_DOC_ID);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as PartyConfig;
          onData({
            ...DEFAULT_PARTY_CONFIG,
            ...raw,
            blockedGroups: Array.isArray(raw.blockedGroups) ? raw.blockedGroups : [],
          });
        } else {
          onData(DEFAULT_PARTY_CONFIG);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.CONFIG}/${CONFIG_DOC_ID}`);
      }
    );
  },

  subscribeRoster(onData: (roster: EmployeeRoster[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.ROSTER),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as EmployeeRoster)
          .sort((a, b) => a.id.localeCompare(b.id));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.ROSTER);
      }
    );
  },

  subscribePrizes(onData: (prizes: Prize[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.PRIZES),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as Prize & { sortOrder?: number })
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.PRIZES);
      }
    );
  },

  subscribeRegistrations(onData: (registrations: AttendeeRegistration[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.REGISTRATIONS),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as AttendeeRegistration)
          .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.REGISTRATIONS);
      }
    );
  },

  subscribeLuckyWinners(onData: (winners: LuckyDrawRecord[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.LUCKY_WINNERS),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as LuckyDrawRecord)
          .sort((a, b) => b.round - a.round || b.wonAt.localeCompare(a.wonAt));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.LUCKY_WINNERS);
      }
    );
  },

  async setConfig(config: PartyConfig): Promise<void> {
    const path = `${COLLECTIONS.CONFIG}/${CONFIG_DOC_ID}`;
    try {
      await setDoc(doc(db, COLLECTIONS.CONFIG, CONFIG_DOC_ID), sanitizeConfigPayload(config, true));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async setRoster(roster: EmployeeRoster[]): Promise<void> {
    try {
      const existingSnap = await getDocs(collection(db, COLLECTIONS.ROSTER));
      const newMap = new Map<string, EmployeeRoster>();
      roster.forEach((emp) => {
        const docId = toSafeDocId('', emp.id);
        newMap.set(docId, emp);
      });

      const ops: Array<{ type: 'delete' | 'set'; docId: string; data?: EmployeeRoster }> = [];
      existingSnap.docs.forEach((d) => {
        if (!newMap.has(d.id)) {
          ops.push({ type: 'delete', docId: d.id });
        }
      });
      newMap.forEach((emp, docId) => {
        ops.push({ type: 'set', docId, data: emp });
      });

      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach((op) => {
          const ref = doc(db, COLLECTIONS.ROSTER, op.docId);
          if (op.type === 'delete') {
            batch.delete(ref);
          } else if (op.data) {
            batch.set(ref, sanitizeRosterPayload(op.data));
          }
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.ROSTER);
    }
  },

  async addRegistration(registration: AttendeeRegistration): Promise<AttendeeRegistration> {
    const docId = toSafeDocId('REG_', registration.employeeId.toUpperCase());
    const payload = sanitizeRegistrationPayload(registration, docId);
    const path = `${COLLECTIONS.REGISTRATIONS}/${docId}`;
    try {
      await setDoc(doc(db, COLLECTIONS.REGISTRATIONS, docId), payload);
      this.setMyRegistrationId(docId);
      return payload as unknown as AttendeeRegistration;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async setPrizes(prizes: Prize[]): Promise<void> {
    try {
      const existingSnap = await getDocs(collection(db, COLLECTIONS.PRIZES));
      const newMap = new Map<string, { prize: Prize; index: number }>();
      prizes.forEach((p, idx) => {
        const docId = toSafeDocId('', p.id);
        newMap.set(docId, { prize: { ...p, id: docId }, index: idx });
      });

      const ops: Array<{ type: 'delete' | 'set'; docId: string; prize?: Prize; index?: number }> = [];
      existingSnap.docs.forEach((d) => {
        if (!newMap.has(d.id)) {
          ops.push({ type: 'delete', docId: d.id });
        }
      });
      newMap.forEach(({ prize, index }, docId) => {
        ops.push({ type: 'set', docId, prize, index });
      });

      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach((op) => {
          const ref = doc(db, COLLECTIONS.PRIZES, op.docId);
          if (op.type === 'delete') {
            batch.delete(ref);
          } else if (op.prize) {
            batch.set(ref, sanitizePrizePayload(op.prize, op.index ?? 0));
          }
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.PRIZES);
    }
  },

  async addLuckyWinner(record: LuckyDrawRecord, currentConfig: PartyConfig): Promise<void> {
    const winnerId = toSafeDocId('', record.id);
    const prizeId = toSafeDocId('', record.prizeId);
    const winnerRef = doc(db, COLLECTIONS.LUCKY_WINNERS, winnerId);
    const prizeRef = doc(db, COLLECTIONS.PRIZES, prizeId);
    const configRef = doc(db, COLLECTIONS.CONFIG, CONFIG_DOC_ID);

    try {
      await runTransaction(db, async (tx) => {
        const prizeSnap = await tx.get(prizeRef);
        if (!prizeSnap.exists()) {
          throw new Error('Prize does not exist');
        }
        const prizeData = prizeSnap.data() as Prize & { sortOrder?: number };
        const nextRemaining = Math.max(0, Math.floor(Number(prizeData.remaining) || 0) - 1);

        tx.set(
          winnerRef,
          sanitizeWinnerPayload({
            ...record,
            id: winnerId,
            prizeId,
          })
        );
        tx.set(
          prizeRef,
          sanitizePrizePayload(
            {
              ...prizeData,
              id: prizeId,
              remaining: nextRemaining,
            },
            prizeData.sortOrder ?? 0
          )
        );
        tx.set(
          configRef,
          sanitizeConfigPayload(
            {
              ...currentConfig,
              isVipTriggerActive: false,
            },
            true
          )
        );
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.LUCKY_WINNERS}/${winnerId}`);
    }
  },

  async deleteLuckyWinner(record: LuckyDrawRecord): Promise<void> {
    const winnerId = toSafeDocId('', record.id);
    const prizeId = toSafeDocId('', record.prizeId);
    const winnerRef = doc(db, COLLECTIONS.LUCKY_WINNERS, winnerId);
    const prizeRef = doc(db, COLLECTIONS.PRIZES, prizeId);

    try {
      await runTransaction(db, async (tx) => {
        const prizeSnap = await tx.get(prizeRef);
        tx.delete(winnerRef);

        if (prizeSnap.exists()) {
          const prizeData = prizeSnap.data() as Prize & { sortOrder?: number };
          const qty = Math.max(1, Math.floor(Number(prizeData.quantity) || 1));
          const restored = Math.min(qty, Math.floor(Number(prizeData.remaining) || 0) + 1);
          tx.set(
            prizeRef,
            sanitizePrizePayload(
              {
                ...prizeData,
                id: prizeId,
                remaining: restored,
              },
              prizeData.sortOrder ?? 0
            )
          );
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.LUCKY_WINNERS}/${winnerId}`);
    }
  },

  async resetAllLuckyDraws(prizes: Prize[]): Promise<void> {
    try {
      await commitBatchedDeletes(COLLECTIONS.LUCKY_WINNERS);
      const batch = writeBatch(db);
      prizes.forEach((p, idx) => {
        const docId = toSafeDocId('', p.id);
        batch.set(
          doc(db, COLLECTIONS.PRIZES, docId),
          sanitizePrizePayload({ ...p, id: docId, remaining: p.quantity }, idx)
        );
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.LUCKY_WINNERS);
    }
  },

  async clearRegistrations(prizes: Prize[]): Promise<void> {
    try {
      await commitBatchedDeletes(COLLECTIONS.REGISTRATIONS);
      await commitBatchedDeletes(COLLECTIONS.LUCKY_WINNERS);
      this.clearMyRegistrationId();

      const batch = writeBatch(db);
      prizes.forEach((p, idx) => {
        const docId = toSafeDocId('', p.id);
        batch.set(
          doc(db, COLLECTIONS.PRIZES, docId),
          sanitizePrizePayload({ ...p, id: docId, remaining: p.quantity }, idx)
        );
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.REGISTRATIONS);
    }
  },

  async startNewParty(
    currentConfig: PartyConfig,
    prizes: Prize[],
    newConfig?: Partial<PartyConfig>,
    options: { clearRoster?: boolean; clearPrizes?: boolean } = {}
  ): Promise<void> {
    try {
      await commitBatchedDeletes(COLLECTIONS.REGISTRATIONS);
      await commitBatchedDeletes(COLLECTIONS.LUCKY_WINNERS);
      this.clearMyRegistrationId();

      if (options.clearRoster) {
        await commitBatchedDeletes(COLLECTIONS.ROSTER);
      }

      if (options.clearPrizes) {
        await commitBatchedDeletes(COLLECTIONS.PRIZES);
      } else {
        const batch = writeBatch(db);
        prizes.forEach((p, idx) => {
          const docId = toSafeDocId('', p.id);
          batch.set(
            doc(db, COLLECTIONS.PRIZES, docId),
            sanitizePrizePayload({ ...p, id: docId, remaining: p.quantity }, idx)
          );
        });
        await batch.commit();
      }

      const updatedConfig: PartyConfig = {
        ...currentConfig,
        ...newConfig,
        isRegistrationOpen: true,
        isVipTriggerActive: false,
      };
      await this.setConfig(updatedConfig);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.CONFIG);
    }
  },
};
