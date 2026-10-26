/**
 * Firestore Security Rules Adversarial Test Suite ("Dirty Dozen")
 * Run against Firebase Local Emulator Suite (`firebase emulators:exec --only firestore "npx vitest run"`)
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

export async function runDirtyDozenSecuritySuite() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'daylight-security-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    const unverifiedAliceDb = testEnv
      .authenticatedContext('user_1', { email: 'alice@example.com', email_verified: false })
      .firestore();
    const aliceDb = testEnv
      .authenticatedContext('user_1', { email: 'alice@example.com', email_verified: true })
      .firestore();
    const attackerDb = testEnv
      .authenticatedContext('attacker_99', { email: 'evil@example.com', email_verified: true })
      .firestore();
    const orphanDb = testEnv
      .authenticatedContext('orphan_user', { email: 'orphan@example.com', email_verified: true })
      .firestore();

    // Payload 1: Unauthenticated profile creation -> PERMISSION_DENIED
    await assertFails(
      setDoc(doc(anonDb, 'users', 'user_1'), {
        uid: 'user_1',
        displayName: 'Anon',
        theme: 'light',
        streakRule: 'any_completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 2: Unverified email spoof write -> PERMISSION_DENIED
    await assertFails(
      setDoc(doc(unverifiedAliceDb, 'users', 'user_1'), {
        uid: 'user_1',
        displayName: 'Spoof',
        theme: 'light',
        streakRule: 'any_completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Valid baseline setup for Alice
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'user_1'), {
        uid: 'user_1',
        displayName: 'Alice',
        theme: 'light',
        streakRule: 'any_completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 3: Cross-tenant profile read & write -> PERMISSION_DENIED
    await assertFails(getDoc(doc(attackerDb, 'users', 'user_1')));
    await assertFails(
      setDoc(doc(attackerDb, 'users', 'user_1'), {
        uid: 'user_1',
        displayName: 'Hacked',
        theme: 'dark',
        streakRule: 'any_completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 4: Shadow field injection on profile -> PERMISSION_DENIED
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'user_1'), {
        uid: 'user_1',
        displayName: 'Alice',
        theme: 'light',
        streakRule: 'any_completed',
        isAdmin: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 5: Invalid enum poisoning on profile -> PERMISSION_DENIED
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'user_1'), {
        theme: 'neon-cyberpunk',
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 6: Orphaned DailyRecord without parent UserProfile -> PERMISSION_DENIED
    await assertFails(
      setDoc(doc(orphanDb, 'users', 'orphan_user', 'dailyRecords', '2026-10-25'), {
        uid: 'orphan_user',
        date: '2026-10-25',
        goals: [],
        totalGoals: 0,
        completedGoals: 0,
        reflection: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 7: Invalid date path / payload mismatch -> PERMISSION_DENIED
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'user_1', 'dailyRecords', '2026-10-25'), {
        uid: 'user_1',
        date: '2026-10-26',
        goals: [],
        totalGoals: 0,
        completedGoals: 0,
        reflection: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 8: Forged client timestamp -> PERMISSION_DENIED
    const forgedTime = Timestamp.fromDate(new Date('2020-01-01T00:00:00Z'));
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'user_1', 'dailyRecords', '2026-10-25'), {
        uid: 'user_1',
        date: '2026-10-25',
        goals: [],
        totalGoals: 0,
        completedGoals: 0,
        reflection: '',
        createdAt: forgedTime,
        updatedAt: forgedTime,
      })
    );

    // Valid DailyRecord baseline for Alice
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'user_1', 'dailyRecords', '2026-10-25'), {
        uid: 'user_1',
        date: '2026-10-25',
        goals: [
          {
            id: 'goal_1',
            text: 'Read 20 pages',
            completed: false,
            important: true,
            order: 0,
            createdAtMs: 1761400000000,
          },
        ],
        totalGoals: 1,
        completedGoals: 0,
        reflection: 'Calm start.',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 9: Immutable ownership / createdAt mutation on update -> PERMISSION_DENIED
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'user_1', 'dailyRecords', '2026-10-25'), {
        uid: 'attacker_99',
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 10: Denial-of-Wallet oversized reflection string (>5000 chars) -> PERMISSION_DENIED
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'user_1', 'dailyRecords', '2026-10-25'), {
        reflection: 'x'.repeat(5001),
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 11: Metric desync / impossible completion count -> PERMISSION_DENIED
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'user_1', 'dailyRecords', '2026-10-25'), {
        goals: [],
        totalGoals: 0,
        completedGoals: 5,
        updatedAt: serverTimestamp(),
      })
    );

    // Payload 12: Malformed GoalItem schema inside goals array -> PERMISSION_DENIED
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'user_1', 'dailyRecords', '2026-10-25'), {
        goals: [{ id: 'g1', text: '', completed: 'yes' }],
        totalGoals: 1,
        completedGoals: 0,
        updatedAt: serverTimestamp(),
      })
    );

    // Verify valid scoped list query succeeds for owner and fails for attacker
    await assertSucceeds(
      getDocs(query(collection(aliceDb, 'users', 'user_1', 'dailyRecords'), where('uid', '==', 'user_1')))
    );
    await assertFails(
      getDocs(query(collection(attackerDb, 'users', 'user_1', 'dailyRecords'), where('uid', '==', 'user_1')))
    );
  } finally {
    await testEnv.cleanup();
  }
}
