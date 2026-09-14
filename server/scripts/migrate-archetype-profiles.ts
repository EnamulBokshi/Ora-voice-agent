/**
 * Migrates archetype from an attribute to an entity.
 *
 * Before: a business had one AgentConfig carrying a `businessArchetype`
 * string, one VoiceSettings, one SalesPlaybook, and one undifferentiated set
 * of knowledge documents.
 *
 * After: those documents are keyed on (businessId, archetype) and
 * `Business.activeArchetype` names the profile that is live. Switching
 * archetype then swaps profiles instead of overwriting one.
 *
 * This script only stamps existing rows with the archetype their business was
 * already running, and points the business at it. Nothing is deleted, nothing
 * is re-embedded, and every merchant lands inside their current setup exactly
 * as they left it. It is idempotent: rows that already carry an archetype are
 * left alone, so it is safe to run more than once.
 *
 * Product rows and product vectors are deliberately untouched — a catalogue
 * belongs to the business, not to one profile.
 *
 * Run: pnpm --filter server exec ts-node scripts/migrate-archetype-profiles.ts
 */
import mongoose from 'mongoose';

const KNOWN_ARCHETYPES = new Set([
  'ecommerce',
  'saas',
  'agency_services',
  'consulting',
  'clinic_appointments',
  'portfolio',
  'general',
]);

const LEGACY_ALIASES: Record<string, string> = {
  agency: 'agency_services',
  clinic: 'clinic_appointments',
};

const DEFAULT_ARCHETYPE = 'general';

function resolveArchetype(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (KNOWN_ARCHETYPES.has(trimmed)) return trimmed;
    if (LEGACY_ALIASES[trimmed]) return LEGACY_ALIASES[trimmed];
  }
  return DEFAULT_ARCHETYPE;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ora';
  await mongoose.connect(uri);

  const db = mongoose.connection;
  const businesses = db.collection('businesses');
  const agentConfigs = db.collection('agentconfigs');
  const voiceSettings = db.collection('voicesettings');
  const salesPlaybooks = db.collection('salesplaybooks');
  const knowledgeBases = db.collection('knowledgebases');
  const knowledgeChunks = db.collection('knowledgechunks');
  const vectorIndex = db.collection('vectorindices');

  const allBusinesses = await businesses.find({}).project({ _id: 1, activeArchetype: 1 }).toArray();
  console.log(`Found ${allBusinesses.length} business record(s).`);

  const totals = {
    businesses: 0,
    configs: 0,
    voice: 0,
    playbooks: 0,
    docs: 0,
    chunks: 0,
    vectors: 0,
  };

  for (const business of allBusinesses) {
    const businessId = business._id;

    // The archetype the business was already running is whatever its single
    // AgentConfig said. That value is the one thing that must not be guessed:
    // getting it wrong would present the merchant an empty profile.
    const existingConfig = await agentConfigs.findOne(
      { businessId },
      { projection: { businessArchetype: 1, archetype: 1 } },
    );

    const archetype = resolveArchetype(
      business.activeArchetype ??
        existingConfig?.archetype ??
        existingConfig?.businessArchetype,
    );

    if (business.activeArchetype !== archetype) {
      await businesses.updateOne(
        { _id: businessId },
        { $set: { activeArchetype: archetype } },
      );
      totals.businesses += 1;
    }

    const stamp = async (
      collection: typeof agentConfigs,
      key: keyof typeof totals,
    ) => {
      const res = await collection.updateMany(
        {
          businessId,
          $or: [{ archetype: { $exists: false } }, { archetype: null }],
        },
        { $set: { archetype } },
      );
      totals[key] += res.modifiedCount;
    };

    await stamp(agentConfigs, 'configs');
    await stamp(voiceSettings, 'voice');
    await stamp(salesPlaybooks, 'playbooks');
    await stamp(knowledgeBases, 'docs');
    await stamp(knowledgeChunks, 'chunks');

    // Only knowledge vectors are profile-scoped. Product vectors stay
    // archetype-less so they remain visible from every profile.
    const vectorRes = await vectorIndex.updateMany(
      {
        businessId,
        entityType: 'knowledge_chunk',
        $or: [{ archetype: { $exists: false } }, { archetype: null }],
      },
      { $set: { archetype } },
    );
    totals.vectors += vectorRes.modifiedCount;
  }

  // `businessArchetype` has been replaced by the profile's own identity. It is
  // dropped last, so a failure midway leaves the source value readable for a
  // re-run.
  const dropped = await agentConfigs.updateMany(
    { businessArchetype: { $exists: true }, archetype: { $exists: true } },
    { $unset: { businessArchetype: '' } },
  );

  console.log('\nMigration complete.');
  console.log(`  businesses pointed at a profile: ${totals.businesses}`);
  console.log(`  agent configs stamped:           ${totals.configs}`);
  console.log(`  voice settings stamped:          ${totals.voice}`);
  console.log(`  sales playbooks stamped:         ${totals.playbooks}`);
  console.log(`  knowledge documents stamped:     ${totals.docs}`);
  console.log(`  knowledge chunks stamped:        ${totals.chunks}`);
  console.log(`  knowledge vectors stamped:       ${totals.vectors}`);
  console.log(`  legacy businessArchetype fields removed: ${dropped.modifiedCount}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
