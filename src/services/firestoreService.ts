import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  Unsubscribe,
  WriteBatch,
  writeBatch,
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
import {
  handleFirestoreError,
  isOfflineOrNetworkError,
  isPermissionError,
  OperationType,
} from '../utils/firestoreErrors';

const COLLECTIONS = {
  CONFIG: 'config',
  ROSTER: 'roster',
  PRIZES: 'prizes',
  REGISTRATIONS: 'registrations',
  LUCKY_WINNERS: 'luckyWinners',
} as const;

const CONFIG_DOC_ID = 'main';
const ACTIVE_REG_LOCAL_KEY = 'party_my_registration_id_v1';

const CACHE_KEYS = {
  CONFIG: 'party_fs_cache_config_v1',
  ROSTER: 'party_fs_cache_roster_v2',
  PRIZES: 'party_fs_cache_prizes_v1',
  REGISTRATIONS: 'party_fs_cache_regs_v1',
  LUCKY_WINNERS: 'party_fs_cache_winners_v1',
} as const;

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

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage quota or private mode errors
  }
}

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

async function commitChunked(
  ops: Array<(batch: WriteBatch) => void>,
  chunkSize = 350
): Promise<void> {
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = writeBatch(db);
    ops.slice(i, i + chunkSize).forEach((apply) => apply(batch));
    await batch.commit();
  }
}

async function commitBatchedDeletes(collectionName: string): Promise<void> {
  const snap = await getDocs(collection(db, collectionName));
  if (snap.empty) return;
  const ops = snap.docs.map((d) => (batch: WriteBatch) => batch.delete(d.ref));
  await commitChunked(ops, 350);
}

let seedPromise: Promise<void> | null = null;

export const FirestoreService = {
  getCachedConfig(): PartyConfig {
    const cached = readCache<PartyConfig>(CACHE_KEYS.CONFIG);
    if (!cached) return DEFAULT_PARTY_CONFIG;
    return {
      ...DEFAULT_PARTY_CONFIG,
      ...cached,
      blockedGroups: Array.isArray(cached.blockedGroups) ? cached.blockedGroups : [],
    };
  },

  getCachedRoster(): EmployeeRoster[] {
    const cached = readCache<EmployeeRoster[]>(CACHE_KEYS.ROSTER);
    if (Array.isArray(cached) && cached.length > 0) {
      // Auto-upgrade if cached roster still holds old EMP-1001 placeholder
      const hasLegacyPlaceholder = cached.some((r) => r.id === 'EMP-1001') && !cached.some((r) => r.id === '7473');
      if (!hasLegacyPlaceholder) {
        return cached;
      }
    }
    writeCache(CACHE_KEYS.ROSTER, INITIAL_ROSTER);
    return INITIAL_ROSTER;
  },

  getCachedPrizes(): Prize[] {
    const cached = readCache<Prize[]>(CACHE_KEYS.PRIZES);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return INITIAL_PRIZES;
  },

  getCachedRegistrations(): AttendeeRegistration[] {
    const cached = readCache<AttendeeRegistration[]>(CACHE_KEYS.REGISTRATIONS);
    return Array.isArray(cached) ? cached : [];
  },

  getCachedLuckyWinners(): LuckyDrawRecord[] {
    const cached = readCache<LuckyDrawRecord[]>(CACHE_KEYS.LUCKY_WINNERS);
    return Array.isArray(cached) ? cached : [];
  },

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
    if (seedPromise) return seedPromise;

    seedPromise = (async () => {
      const configRef = doc(db, COLLECTIONS.CONFIG, CONFIG_DOC_ID);
      try {
        const snap = await getDoc(configRef);

        if (!snap.exists()) {
          const ops: Array<(batch: WriteBatch) => void> = [];
          ops.push((batch) => batch.set(configRef, sanitizeConfigPayload(DEFAULT_PARTY_CONFIG, true)));

          INITIAL_PRIZES.forEach((prize, idx) => {
            const docId = toSafeDocId('', prize.id);
            ops.push((batch) =>
              batch.set(doc(db, COLLECTIONS.PRIZES, docId), sanitizePrizePayload(prize, idx))
            );
          });

          INITIAL_ROSTER.forEach((emp) => {
            const docId = toSafeDocId('', emp.id);
            ops.push((batch) =>
              batch.set(doc(db, COLLECTIONS.ROSTER, docId), sanitizeRosterPayload(emp))
            );
          });

          await commitChunked(ops, 350);
          return;
        }

        // Config already exists — verify roster isn't stuck on old 15-row demo data (EMP-1001..1015) or empty
        const [firstSheetSnap, legacyDemoSnap, anyRosterSnap, anyPrizeSnap] = await Promise.all([
          getDoc(doc(db, COLLECTIONS.ROSTER, '7473')),
          getDoc(doc(db, COLLECTIONS.ROSTER, 'EMP-1001')),
          getDocs(query(collection(db, COLLECTIONS.ROSTER), limit(1))),
          getDocs(query(collection(db, COLLECTIONS.PRIZES), limit(1))),
        ]);

        const ops: Array<(batch: WriteBatch) => void> = [];

        if (anyPrizeSnap.empty) {
          INITIAL_PRIZES.forEach((prize, idx) => {
            const docId = toSafeDocId('', prize.id);
            ops.push((batch) =>
              batch.set(doc(db, COLLECTIONS.PRIZES, docId), sanitizePrizePayload(prize, idx))
            );
          });
        }

        const shouldUpgradeFromLegacy = !firstSheetSnap.exists() && legacyDemoSnap.exists();
        const isRosterEmpty = anyRosterSnap.empty;

        if (shouldUpgradeFromLegacy || isRosterEmpty) {
          if (shouldUpgradeFromLegacy) {
            for (let n = 1001; n <= 1015; n++) {
              ops.push((batch) => batch.delete(doc(db, COLLECTIONS.ROSTER, `EMP-${n}`)));
            }
          }
          INITIAL_ROSTER.forEach((emp) => {
            const docId = toSafeDocId('', emp.id);
            ops.push((batch) =>
              batch.set(doc(db, COLLECTIONS.ROSTER, docId), sanitizeRosterPayload(emp))
            );
          });
        }

        if (ops.length > 0) {
          await commitChunked(ops, 350);
        }
      } catch (error) {
        // Never crash the page when offline or network is temporarily unavailable
        if (isOfflineOrNetworkError(error)) {
          console.warn('Firestore unavailable during initial seed; running with Sheets fallback data.');
          return;
        }
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CONFIG}/${CONFIG_DOC_ID}`);
        }
        console.warn('Initial seed warning:', error);
      }
    })();

    try {
      await seedPromise;
    } finally {
      seedPromise = null;
    }
  },

  subscribeConfig(onData: (config: PartyConfig) => void): Unsubscribe {
    const ref = doc(db, COLLECTIONS.CONFIG, CONFIG_DOC_ID);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as PartyConfig;
          const merged: PartyConfig = {
            ...DEFAULT_PARTY_CONFIG,
            ...raw,
            blockedGroups: Array.isArray(raw.blockedGroups) ? raw.blockedGroups : [],
          };
          writeCache(CACHE_KEYS.CONFIG, merged);
          onData(merged);
        } else if (!snap.metadata.fromCache) {
          onData(DEFAULT_PARTY_CONFIG);
        }
      },
      (error) => {
        if (isOfflineOrNetworkError(error)) {
          console.warn('Config listener offline; keeping local config.');
          return;
        }
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.CONFIG}/${CONFIG_DOC_ID}`);
        }
        console.warn('Config listener warning:', error);
      }
    );
  },

  subscribeRoster(onData: (roster: EmployeeRoster[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.ROSTER),
      (snap) => {
        if (snap.empty && snap.metadata.fromCache) {
          return;
        }
        const list = snap.docs
          .map((d) => d.data() as EmployeeRoster)
          .sort((a, b) => a.id.localeCompare(b.id));
        if (list.length > 0) {
          writeCache(CACHE_KEYS.ROSTER, list);
          onData(list);
        } else if (!snap.metadata.fromCache) {
          writeCache(CACHE_KEYS.ROSTER, []);
          onData([]);
        }
      },
      (error) => {
        if (isOfflineOrNetworkError(error)) {
          console.warn('Roster listener offline; keeping Sheets reference roster.');
          return;
        }
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.ROSTER);
        }
        console.warn('Roster listener warning:', error);
      }
    );
  },

  subscribePrizes(onData: (prizes: Prize[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.PRIZES),
      (snap) => {
        if (snap.empty && snap.metadata.fromCache) {
          return;
        }
        const list = snap.docs
          .map((d) => d.data() as Prize & { sortOrder?: number })
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id));
        if (list.length > 0) {
          writeCache(CACHE_KEYS.PRIZES, list);
          onData(list);
        } else if (!snap.metadata.fromCache) {
          writeCache(CACHE_KEYS.PRIZES, []);
          onData([]);
        }
      },
      (error) => {
        if (isOfflineOrNetworkError(error)) {
          console.warn('Prizes listener offline; keeping cached prizes.');
          return;
        }
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.PRIZES);
        }
        console.warn('Prizes listener warning:', error);
      }
    );
  },

  subscribeRegistrations(onData: (registrations: AttendeeRegistration[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.REGISTRATIONS),
      (snap) => {
        if (snap.empty && snap.metadata.fromCache) {
          return;
        }
        const list = snap.docs
          .map((d) => d.data() as AttendeeRegistration)
          .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
        writeCache(CACHE_KEYS.REGISTRATIONS, list);
        onData(list);
      },
      (error) => {
        if (isOfflineOrNetworkError(error)) {
          console.warn('Registrations listener offline; keeping local registrations cache.');
          return;
        }
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.REGISTRATIONS);
        }
        console.warn('Registrations listener warning:', error);
      }
    );
  },

  subscribeLuckyWinners(onData: (winners: LuckyDrawRecord[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.LUCKY_WINNERS),
      (snap) => {
        if (snap.empty && snap.metadata.fromCache) {
          return;
        }
        const list = snap.docs
          .map((d) => d.data() as LuckyDrawRecord)
          .sort((a, b) => b.round - a.round || b.wonAt.localeCompare(a.wonAt));
        writeCache(CACHE_KEYS.LUCKY_WINNERS, list);
        onData(list);
      },
      (error) => {
        if (isOfflineOrNetworkError(error)) {
          console.warn('Winners listener offline; keeping local winners cache.');
          return;
        }
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.LUCKY_WINNERS);
        }
        console.warn('Winners listener warning:', error);
      }
    );
  },

  async setConfig(config: PartyConfig): Promise<void> {
    writeCache(CACHE_KEYS.CONFIG, config);
    const path = `${COLLECTIONS.CONFIG}/${CONFIG_DOC_ID}`;
    try {
      await setDoc(doc(db, COLLECTIONS.CONFIG, CONFIG_DOC_ID), sanitizeConfigPayload(config, true));
    } catch (error) {
      if (isOfflineOrNetworkError(error)) {
        console.warn('Saved config locally (Firestore offline).');
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async setRoster(roster: EmployeeRoster[]): Promise<void> {
    writeCache(CACHE_KEYS.ROSTER, roster);
    try {
      const existingSnap = await getDocs(collection(db, COLLECTIONS.ROSTER));
      const newMap = new Map<string, EmployeeRoster>();
      roster.forEach((emp) => {
        const docId = toSafeDocId('', emp.id);
        newMap.set(docId, emp);
      });

      const ops: Array<(batch: WriteBatch) => void> = [];
      existingSnap.docs.forEach((d) => {
        if (!newMap.has(d.id)) {
          ops.push((batch) => batch.delete(d.ref));
        }
      });
      newMap.forEach((emp, docId) => {
        const ref = doc(db, COLLECTIONS.ROSTER, docId);
        ops.push((batch) => batch.set(ref, sanitizeRosterPayload(emp)));
      });

      await commitChunked(ops, 350);
    } catch (error) {
      if (isOfflineOrNetworkError(error)) {
        console.warn('Saved roster locally (Firestore offline).');
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.ROSTER);
    }
  },

  async addRegistration(registration: AttendeeRegistration): Promise<AttendeeRegistration> {
    const docId = toSafeDocId('REG_', registration.employeeId.toUpperCase());
    const payload = sanitizeRegistrationPayload(registration, docId);
    const saved = payload as unknown as AttendeeRegistration;
    const path = `${COLLECTIONS.REGISTRATIONS}/${docId}`;

    this.setMyRegistrationId(docId);
    const cached = this.getCachedRegistrations().filter((r) => r.id !== docId);
    writeCache(CACHE_KEYS.REGISTRATIONS, [saved, ...cached]);

    try {
      await setDoc(doc(db, COLLECTIONS.REGISTRATIONS, docId), payload);
      return saved;
    } catch (error) {
      if (isOfflineOrNetworkError(error)) {
        console.warn('Registration cached locally (Firestore offline).');
        return saved;
      }
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async setPrizes(prizes: Prize[]): Promise<void> {
    writeCache(CACHE_KEYS.PRIZES, prizes);
    try {
      const existingSnap = await getDocs(collection(db, COLLECTIONS.PRIZES));
      const newMap = new Map<string, { prize: Prize; index: number }>();
      prizes.forEach((p, idx) => {
        const docId = toSafeDocId('', p.id);
        newMap.set(docId, { prize: { ...p, id: docId }, index: idx });
      });

      const ops: Array<(batch: WriteBatch) => void> = [];
      existingSnap.docs.forEach((d) => {
        if (!newMap.has(d.id)) {
          ops.push((batch) => batch.delete(d.ref));
        }
      });
      newMap.forEach(({ prize, index }, docId) => {
        const ref = doc(db, COLLECTIONS.PRIZES, docId);
        ops.push((batch) => batch.set(ref, sanitizePrizePayload(prize, index)));
      });

      await commitChunked(ops, 350);
    } catch (error) {
      if (isOfflineOrNetworkError(error)) {
        console.warn('Saved prizes locally (Firestore offline).');
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.PRIZES);
    }
  },

  async addLuckyWinner(record: LuckyDrawRecord, currentConfig: PartyConfig): Promise<void> {
    const winnerId = toSafeDocId('', record.id);
    const prizeId = toSafeDocId('', record.prizeId);
    const winnerRef = doc(db, COLLECTIONS.LUCKY_WINNERS, winnerId);
    const prizeRef = doc(db, COLLECTIONS.PRIZES, prizeId);
    const configRef = doc(db, COLLECTIONS.CONFIG, CONFIG_DOC_ID);

    // Update local cache optimistically
    const normalizedWinner: LuckyDrawRecord = { ...record, id: winnerId, prizeId };
    const cachedWinners = this.getCachedLuckyWinners().filter((w) => w.id !== winnerId);
    writeCache(CACHE_KEYS.LUCKY_WINNERS, [normalizedWinner, ...cachedWinners]);
    writeCache(CACHE_KEYS.CONFIG, { ...currentConfig, isVipTriggerActive: false });

    try {
      await runTransaction(db, async (tx) => {
        const prizeSnap = await tx.get(prizeRef);
        if (!prizeSnap.exists()) {
          throw new Error('Prize does not exist');
        }
        const prizeData = prizeSnap.data() as Prize & { sortOrder?: number };
        const nextRemaining = Math.max(0, Math.floor(Number(prizeData.remaining) || 0) - 1);

        tx.set(winnerRef, sanitizeWinnerPayload(normalizedWinner));
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
      if (isOfflineOrNetworkError(error)) {
        console.warn('Lucky winner updated locally (Firestore offline).');
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.LUCKY_WINNERS}/${winnerId}`);
    }
  },

  async deleteLuckyWinner(record: LuckyDrawRecord): Promise<void> {
    const winnerId = toSafeDocId('', record.id);
    const prizeId = toSafeDocId('', record.prizeId);
    const winnerRef = doc(db, COLLECTIONS.LUCKY_WINNERS, winnerId);
    const prizeRef = doc(db, COLLECTIONS.PRIZES, prizeId);

    const cachedWinners = this.getCachedLuckyWinners().filter((w) => w.id !== winnerId);
    writeCache(CACHE_KEYS.LUCKY_WINNERS, cachedWinners);

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
      if (isOfflineOrNetworkError(error)) {
        console.warn('Winner removal cached locally (Firestore offline).');
        return;
      }
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.LUCKY_WINNERS}/${winnerId}`);
    }
  },

  async resetAllLuckyDraws(prizes: Prize[]): Promise<void> {
    writeCache(CACHE_KEYS.LUCKY_WINNERS, []);
    writeCache(
      CACHE_KEYS.PRIZES,
      prizes.map((p) => ({ ...p, remaining: p.quantity }))
    );

    try {
      await commitBatchedDeletes(COLLECTIONS.LUCKY_WINNERS);
      const ops = prizes.map((p, idx) => {
        const docId = toSafeDocId('', p.id);
        return (batch: WriteBatch) =>
          batch.set(
            doc(db, COLLECTIONS.PRIZES, docId),
            sanitizePrizePayload({ ...p, id: docId, remaining: p.quantity }, idx)
          );
      });
      await commitChunked(ops, 350);
    } catch (error) {
      if (isOfflineOrNetworkError(error)) {
        console.warn('Reset lucky draws cached locally (Firestore offline).');
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.LUCKY_WINNERS);
    }
  },

  async clearRegistrations(prizes: Prize[]): Promise<void> {
    writeCache(CACHE_KEYS.REGISTRATIONS, []);
    writeCache(CACHE_KEYS.LUCKY_WINNERS, []);
    this.clearMyRegistrationId();

    try {
      await commitBatchedDeletes(COLLECTIONS.REGISTRATIONS);
      await commitBatchedDeletes(COLLECTIONS.LUCKY_WINNERS);

      const ops = prizes.map((p, idx) => {
        const docId = toSafeDocId('', p.id);
        return (batch: WriteBatch) =>
          batch.set(
            doc(db, COLLECTIONS.PRIZES, docId),
            sanitizePrizePayload({ ...p, id: docId, remaining: p.quantity }, idx)
          );
      });
      await commitChunked(ops, 350);
    } catch (error) {
      if (isOfflineOrNetworkError(error)) {
        console.warn('Clear registrations cached locally (Firestore offline).');
        return;
      }
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.REGISTRATIONS);
    }
  },

  async startNewParty(
    currentConfig: PartyConfig,
    prizes: Prize[],
    newConfig?: Partial<PartyConfig>,
    options: { clearRoster?: boolean; clearPrizes?: boolean } = {}
  ): Promise<void> {
    writeCache(CACHE_KEYS.REGISTRATIONS, []);
    writeCache(CACHE_KEYS.LUCKY_WINNERS, []);
    this.clearMyRegistrationId();

    const updatedConfig: PartyConfig = {
      ...currentConfig,
      ...newConfig,
      isRegistrationOpen: true,
      isVipTriggerActive: false,
    };
    writeCache(CACHE_KEYS.CONFIG, updatedConfig);

    try {
      await commitBatchedDeletes(COLLECTIONS.REGISTRATIONS);
      await commitBatchedDeletes(COLLECTIONS.LUCKY_WINNERS);

      if (options.clearRoster) {
        writeCache(CACHE_KEYS.ROSTER, []);
        await commitBatchedDeletes(COLLECTIONS.ROSTER);
      }

      if (options.clearPrizes) {
        writeCache(CACHE_KEYS.PRIZES, []);
        await commitBatchedDeletes(COLLECTIONS.PRIZES);
      } else {
        const ops = prizes.map((p, idx) => {
          const docId = toSafeDocId('', p.id);
          return (batch: WriteBatch) =>
            batch.set(
              doc(db, COLLECTIONS.PRIZES, docId),
              sanitizePrizePayload({ ...p, id: docId, remaining: p.quantity }, idx)
            );
        });
        await commitChunked(ops, 350);
      }

      await this.setConfig(updatedConfig);
    } catch (error) {
      if (isOfflineOrNetworkError(error)) {
        console.warn('Start new party cached locally (Firestore offline).');
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.CONFIG);
    }
  },
};
